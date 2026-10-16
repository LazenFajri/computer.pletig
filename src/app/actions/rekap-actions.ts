'use server';

import { db } from '@/db';
import { attendance, meetings, users } from '@/db/schema';
import { eq, and, desc, asc, lt, inArray } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/session';
import type { ActionState, GradeLevel } from '@/lib/auth-types';
import { revalidatePath } from 'next/cache';
import { generateStyledRekapExcel, type AttendanceRecordForExcel } from '@/lib/excel-rekap';
import { verifyRequestOrigin } from '@/lib/security';

export interface RekapItemPreview {
  id: string;
  studentName: string;
  gradeLevel: number;
  className: string | null;
  meetingId: string;
  meetingNumber: number;
  meetingTitle: string;
  checkedInAt: Date | null;
  status: 'HADIR' | 'TIDAK HADIR' | string;
}

export interface RekapSummaryData {
  totalRecords: number;
  totalPresent: number;
  totalAbsent: number;
  attendancePercentage: number;
  staleRecordsCount: number; // Catatan > 7 hari
  meetingsList: Array<{ id: string; title: string; meetingNumber: number; gradeLevel: number | null }>;
  records: RekapItemPreview[];
}

/**
 * Server Action: Mengambil data pratinjau rekap presensi (mencakup siswa Hadir & Tidak Hadir)
 */
export async function getRekapDataAction(
  meetingIdFilter?: string,
  gradeFilter?: GradeLevel | 'all'
): Promise<RekapSummaryData> {
  const user = await getCurrentUser();
  if (!user || user.role !== 'superadmin') {
    return {
      totalRecords: 0,
      totalPresent: 0,
      totalAbsent: 0,
      attendancePercentage: 0,
      staleRecordsCount: 0,
      meetingsList: [],
      records: [],
    };
  }

  // 1. Ambil semua pertemuan
  const allMeetings = await db.query.meetings.findMany({
    orderBy: [desc(meetings.meeting_number)],
  });

  const targetMeeting = meetingIdFilter && meetingIdFilter !== 'all'
    ? allMeetings.find((m) => m.id === meetingIdFilter)
    : null;

  // 2. Tentukan target tingkat kelas yang dievaluasi
  let targetGrade: GradeLevel | 'all' = 'all';
  if (gradeFilter && gradeFilter !== 'all') {
    targetGrade = gradeFilter;
  } else if (targetMeeting && targetMeeting.grade_level) {
    targetGrade = targetMeeting.grade_level as GradeLevel;
  }

  // 3. Ambil semua siswa terdaftar yang aktif
  const allStudents = await db.query.users.findMany({
    where: and(
      eq(users.role, 'siswa'),
      eq(users.is_active, true),
      targetGrade !== 'all' ? eq(users.grade_level, targetGrade) : undefined
    ),
    orderBy: [asc(users.grade_level), asc(users.class_name), asc(users.name)],
  });

  // 4. Ambil presensi
  const allAtt = await db.query.attendance.findMany({
    orderBy: [desc(attendance.checked_in_at)],
    with: {
      meeting: true,
      user: true,
    },
  });

  // Hitung jumlah record yang berusia lebih dari 7 hari (1 minggu)
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const staleCount = allAtt.filter((a) => new Date(a.checked_in_at) < oneWeekAgo).length;

  // Filter presensi yang cocok dengan filter sesi dan kelas
  const filteredAtt = allAtt.filter((a) => {
    if (meetingIdFilter && meetingIdFilter !== 'all' && a.meeting_id !== meetingIdFilter) {
      return false;
    }
    if (targetGrade !== 'all' && a.grade_level !== targetGrade) {
      return false;
    }
    return true;
  });

  // Map presensi berdasarkan studentUserId atau nama (case-insensitive)
  const attByUserId = new Map<string, typeof allAtt[0]>();
  const attByName = new Map<string, typeof allAtt[0]>();

  for (const a of filteredAtt) {
    if (a.user_id) attByUserId.set(a.user_id, a);
    attByName.set(a.student_name.toLowerCase().trim(), a);
  }

  const usedAttendanceIds = new Set<string>();
  const previewRecords: RekapItemPreview[] = [];

  // Siswa terdaftar resmi di database
  for (const s of allStudents) {
    const matched = attByUserId.get(s.id) || attByName.get(s.name.toLowerCase().trim());
    if (matched) {
      usedAttendanceIds.add(matched.id);
      previewRecords.push({
        id: matched.id,
        studentName: s.name,
        gradeLevel: s.grade_level || 4,
        className: s.class_name || `Kelas ${s.grade_level}`,
        meetingId: matched.meeting_id,
        meetingNumber: matched.meeting?.meeting_number || targetMeeting?.meeting_number || 1,
        meetingTitle: matched.meeting?.title || targetMeeting?.title || 'Ekstrakurikuler Komputer',
        checkedInAt: matched.checked_in_at,
        status: 'HADIR',
      });
    } else {
      previewRecords.push({
        id: `absent-${s.id}`,
        studentName: s.name,
        gradeLevel: s.grade_level || 4,
        className: s.class_name || `Kelas ${s.grade_level}`,
        meetingId: targetMeeting?.id || 'none',
        meetingNumber: targetMeeting?.meeting_number || 1,
        meetingTitle: targetMeeting?.title || 'Ekstrakurikuler Komputer',
        checkedInAt: null,
        status: 'TIDAK HADIR',
      });
    }
  }

  // Siswa yang absen tetapi mungkin tidak ada di daftar siswa terdaftar
  for (const a of filteredAtt) {
    if (!usedAttendanceIds.has(a.id)) {
      previewRecords.push({
        id: a.id,
        studentName: a.student_name,
        gradeLevel: a.grade_level,
        className: a.user?.class_name || `Kelas ${a.grade_level}`,
        meetingId: a.meeting_id,
        meetingNumber: a.meeting?.meeting_number || 1,
        meetingTitle: a.meeting?.title || `Pertemuan ${a.meeting?.meeting_number || 1}`,
        checkedInAt: a.checked_in_at,
        status: 'HADIR',
      });
    }
  }

  const totalPresent = previewRecords.filter((r) => r.status === 'HADIR').length;
  const totalAbsent = previewRecords.filter((r) => r.status === 'TIDAK HADIR').length;
  const totalRecords = previewRecords.length;
  const attendancePercentage = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0;

  return {
    totalRecords,
    totalPresent,
    totalAbsent,
    attendancePercentage,
    staleRecordsCount: staleCount,
    meetingsList: allMeetings.map((m) => ({
      id: m.id,
      title: m.title,
      meetingNumber: m.meeting_number,
      gradeLevel: m.grade_level,
    })),
    records: previewRecords,
  };
}

/**
 * Server Action: Bersihkan data presensi lampau yang berusia lebih dari 7 hari (1 Minggu)
 * Untuk menghemat kuota row & storage Turso database di Vercel
 */
export async function cleanupStaleAttendanceAction(): Promise<ActionState<{ deletedCount: number }>> {
  try {
    const originCheck = await verifyRequestOrigin();
    if (!originCheck.valid) {
      return { success: false, error: 'Permintaan ditolak: Mismatched Origin.' };
    }

    const user = await getCurrentUser();
    if (!user || user.role !== 'superadmin') {
      return { success: false, error: 'Hanya Pembina yang berhak melakukan pembersihan database.' };
    }

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Ambil data yang akan dihapus
    const toDelete = await db.query.attendance.findMany({
      where: lt(attendance.checked_in_at, oneWeekAgo),
    });

    if (toDelete.length === 0) {
      return {
        success: true,
        data: { deletedCount: 0 },
        message: 'Tidak ada data presensi yang berusia lebih dari 1 minggu.',
      };
    }

    const ids = toDelete.map((a) => a.id);
    await db.delete(attendance).where(inArray(attendance.id, ids));

    try {
      revalidatePath('/admin/dashboard');
      revalidatePath('/absen');
    } catch {
      // ignore
    }

    return {
      success: true,
      data: { deletedCount: ids.length },
      message: `Berhasil membersihkan ${ids.length} data presensi lampau (> 7 hari). Kuota database Turso kini lebih hemat!`,
    };
  } catch (error) {
    console.error('Error cleaning up stale attendance:', error);
    return { success: false, error: 'Gagal membersihkan data presensi lampau.' };
  }
}

/**
 * Server Action: Hapus data presensi sesi tertentu (setelah selesai direkap/diunduh)
 */
export async function clearMeetingAttendanceAction(meetingId: string): Promise<ActionState> {
  try {
    const originCheck = await verifyRequestOrigin();
    if (!originCheck.valid) {
      return { success: false, error: 'Permintaan ditolak: Mismatched Origin.' };
    }

    const user = await getCurrentUser();
    if (!user || user.role !== 'superadmin') {
      return { success: false, error: 'Hanya Pembina yang berhak mengosongkan data presensi.' };
    }

    await db.delete(attendance).where(eq(attendance.meeting_id, meetingId));

    try {
      revalidatePath('/admin/dashboard');
      revalidatePath('/absen');
    } catch {
      // ignore
    }

    return {
      success: true,
      message: 'Data presensi pada sesi ini berhasil dikosongkan. Penyimpanan Turso telah dihemat.',
    };
  } catch (error) {
    console.error('Error clearing meeting attendance:', error);
    return { success: false, error: 'Gagal mengosongkan data presensi.' };
  }
}

/**
 * Server Action: Ekspor Rekap Presensi ke file Excel (.xlsx) dengan proteksi superadmin
 * Mengembalikan data file dalam bentuk base64 agar aman dan 100% kompatibel di mobile Android/iOS
 */
export async function exportRekapExcelAction(
  meetingIdFilter?: string,
  gradeFilter?: GradeLevel | 'all',
  cleanup?: boolean
): Promise<ActionState<{ base64: string; filename: string; recordsCount: number }>> {
  try {
    const originCheck = await verifyRequestOrigin();
    if (!originCheck.valid) {
      return {
        success: false,
        error: 'Permintaan ditolak: Mismatched Origin.',
      };
    }

    const user = await getCurrentUser();
    if (!user || user.role !== 'superadmin') {
      return {
        success: false,
        error: 'Unauthorized: Hanya Pembina yang berhak mengunduh rekap presensi.',
      };
    }

    // 1. Dapatkan info nama sesi & target meeting
    let sessionTitle = 'Semua Sesi Pertemuan';
    let targetM: typeof meetings.$inferSelect | null = null;
    if (meetingIdFilter && meetingIdFilter !== 'all') {
      const found = await db.query.meetings.findFirst({
        where: eq(meetings.id, meetingIdFilter),
      });
      if (found) {
        targetM = found;
        sessionTitle = `Pertemuan ${found.meeting_number}: ${found.title}`;
      }
    }

    // Tentukan filter tingkat kelas
    let targetGradeFilter: number | null = null;
    if (gradeFilter && gradeFilter !== 'all') {
      targetGradeFilter = typeof gradeFilter === 'string' ? parseInt(gradeFilter, 10) : gradeFilter;
    } else if (targetM && targetM.grade_level) {
      targetGradeFilter = targetM.grade_level;
    }

    const gradeLabel = targetGradeFilter
      ? `Kelas ${targetGradeFilter} SD`
      : 'Semua Kelas (4, 5, 6)';

    // 2. Ambil semua siswa terdaftar yang aktif
    const allStudents = await db.query.users.findMany({
      where: and(
        eq(users.role, 'siswa'),
        eq(users.is_active, true),
        targetGradeFilter ? eq(users.grade_level, targetGradeFilter) : undefined
      ),
      orderBy: [asc(users.grade_level), asc(users.class_name), asc(users.name)],
    });

    // 3. Ambil data presensi yang sudah tercatat
    const allAtt = await db.query.attendance.findMany({
      orderBy: [desc(attendance.checked_in_at)],
      with: {
        meeting: true,
        user: true,
      },
    });

    const filteredAtt = allAtt.filter((a) => {
      if (meetingIdFilter && meetingIdFilter !== 'all' && a.meeting_id !== meetingIdFilter) {
        return false;
      }
      if (targetGradeFilter && a.grade_level !== targetGradeFilter) {
        return false;
      }
      return true;
    });

    // 4. Map presensi berdasarkan ID user atau nama
    const attByUserId = new Map<string, (typeof allAtt)[0]>();
    const attByName = new Map<string, (typeof allAtt)[0]>();

    for (const a of filteredAtt) {
      if (a.user_id) attByUserId.set(a.user_id, a);
      attByName.set(a.student_name.toLowerCase().trim(), a);
    }

    const usedAttendanceIds = new Set<string>();
    const excelRecords: AttendanceRecordForExcel[] = [];
    let counter = 1;

    // Siswa terdaftar resmi (HADIR / TIDAK HADIR)
    for (const s of allStudents) {
      const matched = attByUserId.get(s.id) || attByName.get(s.name.toLowerCase().trim());
      if (matched) {
        usedAttendanceIds.add(matched.id);
        const checkInDate = new Date(matched.checked_in_at);
        const dateStr = new Intl.DateTimeFormat('id-ID', {
          timeZone: 'Asia/Jakarta',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }).format(checkInDate);

        const timeStr = new Intl.DateTimeFormat('id-ID', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
        }).format(checkInDate);

        excelRecords.push({
          no: counter++,
          studentName: s.name,
          gradeLevel: s.grade_level || 4,
          className: s.class_name || `Kelas ${s.grade_level}`,
          meetingTitle: matched.meeting?.title || targetM?.title || 'Ekstrakurikuler Komputer',
          meetingNumber: matched.meeting?.meeting_number || targetM?.meeting_number || 1,
          dateStr,
          timeStr,
          status: 'HADIR',
        });
      } else {
        excelRecords.push({
          no: counter++,
          studentName: s.name,
          gradeLevel: s.grade_level || 4,
          className: s.class_name || `Kelas ${s.grade_level}`,
          meetingTitle: targetM?.title || 'Ekstrakurikuler Komputer',
          meetingNumber: targetM?.meeting_number || 1,
          dateStr: targetM?.date || '-',
          timeStr: '-',
          status: 'TIDAK HADIR',
        });
      }
    }

    // Siswa yang hadir di presensi tetapi tidak terdaftar di users
    for (const a of filteredAtt) {
      if (!usedAttendanceIds.has(a.id)) {
        const checkInDate = new Date(a.checked_in_at);
        const dateStr = new Intl.DateTimeFormat('id-ID', {
          timeZone: 'Asia/Jakarta',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }).format(checkInDate);

        const timeStr = new Intl.DateTimeFormat('id-ID', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
        }).format(checkInDate);

        excelRecords.push({
          no: counter++,
          studentName: a.student_name,
          gradeLevel: a.grade_level,
          className: a.user?.class_name || `Kelas ${a.grade_level}`,
          meetingTitle: a.meeting?.title || `Pertemuan ${a.meeting?.meeting_number || 1}`,
          meetingNumber: a.meeting?.meeting_number || 1,
          dateStr,
          timeStr,
          status: 'HADIR',
        });
      }
    }

    const totalPresent = excelRecords.filter((r) => r.status === 'HADIR').length;
    const totalAbsent = excelRecords.filter((r) => r.status === 'TIDAK HADIR').length;

    // 5. Generate file Excel berdesain warna & profesional
    const excelBuffer = await generateStyledRekapExcel(excelRecords, {
      sessionTitle,
      gradeFilter: gradeLabel,
      totalRecords: excelRecords.length,
      totalRegistered: excelRecords.length,
      totalPresent,
      totalAbsent,
    });

    // 6. Jika opsi "cleanup" aktif: Hapus data yang sudah diekspor
    if (cleanup && filteredAtt.length > 0) {
      const idsToDelete = filteredAtt.map((a) => a.id);
      await db.delete(attendance).where(inArray(attendance.id, idsToDelete));
      try {
        revalidatePath('/admin/dashboard');
        revalidatePath('/absen');
      } catch {
        // ignore
      }
    }

    // Nama file dinamis & rapi
    const timestamp = new Date().toISOString().slice(0, 10);
    const cleanFileName = `Rekap_Presensi_Komputer_${gradeFilter && gradeFilter !== 'all' ? `Kls${gradeFilter}_` : ''}${timestamp}.xlsx`;

    return {
      success: true,
      data: {
        base64: Buffer.from(excelBuffer).toString('base64'),
        filename: cleanFileName,
        recordsCount: excelRecords.length,
      },
    };
  } catch (error) {
    console.error('Error generating Excel in action:', error);
    return {
      success: false,
      error: 'Gagal membuat file Excel rekap presensi.',
    };
  }
}
