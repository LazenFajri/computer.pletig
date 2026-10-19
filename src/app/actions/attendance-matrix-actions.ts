'use server';

import { db } from '@/db';
import { meetings, attendance, users } from '@/db/schema';
import { eq, and, or, asc, isNull, inArray } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/session';
import { verifyRequestOrigin } from '@/lib/security';
import { revalidatePath } from 'next/cache';
import type { ActionState } from '@/lib/auth-types';

export interface MatrixColumn {
  dateStr: string; // '2026-10-19'
  displayDate: string; // '19/10'
  dayName: string; // 'Senin' | 'Selasa' | 'Kamis'
  meetingNumber: number; // 1, 2, ...
  meetingId?: string | null;
}

export interface StudentMatrixRow {
  studentId: string;
  studentName: string;
  className: string;
  gradeLevel: number;
  avatarUrl?: string | null;
  attendanceMap: Record<string, boolean>; // dateStr -> isPresent
  totalPresent: number;
  attendancePercentage: number;
}

export interface AttendanceMatrixData {
  className: string; // e.g. '6B'
  gradeLevel: number; // 6
  columns: MatrixColumn[];
  students: StudentMatrixRow[];
  columnTotals: Record<string, number>; // dateStr -> count present
  totalStudents: number;
  overallAttendancePercentage: number;
}

/**
 * Helper: Menghasilkan daftar tanggal pertemuan berbasis jadwal nyata
 * Dimulai sejak 19 Oktober 2026:
 * - Kelas 6 (6A & 6B): Tiap Senin  -> 19/10, 26/10, 02/11, 09/11, 16/11, dst.
 * - Kelas 5 (5A & 5B): Tiap Selasa -> 20/10, 27/10, 03/11, 10/11, 17/11, dst.
 * - Kelas 4 (4A & 4B): Tiap Kamis  -> 22/10, 29/10, 05/11, 12/11, 19/11, dst.
 */
function generateScheduleDates(
  gradeLevel: number,
  totalSessions = 10
): Array<{ dateStr: string; displayDate: string; dayName: string; sessionIndex: number }> {
  const startYear = 2026;
  const startMonth = 9; // 0-indexed: 9 = Oktober
  let startDay = 19;
  let dayName = 'Senin';

  if (gradeLevel === 5) {
    startDay = 20;
    dayName = 'Selasa';
  } else if (gradeLevel === 4) {
    startDay = 22;
    dayName = 'Kamis';
  }

  const results: Array<{ dateStr: string; displayDate: string; dayName: string; sessionIndex: number }> = [];
  const curr = new Date(Date.UTC(startYear, startMonth, startDay, 5, 0, 0));

  for (let i = 0; i < totalSessions; i++) {
    const y = curr.getUTCFullYear();
    const m = String(curr.getUTCMonth() + 1).padStart(2, '0');
    const d = String(curr.getUTCDate()).padStart(2, '0');

    results.push({
      dateStr: `${y}-${m}-${d}`,
      displayDate: `${d}/${m}`,
      dayName,
      sessionIndex: i + 1,
    });

    // Tambah 7 hari
    curr.setUTCDate(curr.getUTCDate() + 7);
  }

  return results;
}

/**
 * Server Action: Mengambil data Matriks Presensi untuk Rombel tertentu (6B, 6A, 5B, 5A, 4B, 4A)
 * Dapat diakses oleh Admin (Pembina) dan Guru (Pengawas)
 */
export async function getAttendanceMatrixAction(
  className = '6B',
  sessionCount = 10
): Promise<ActionState<AttendanceMatrixData>> {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'superadmin' && user.role !== 'guru')) {
      return { success: false, error: 'Akses ditolak. Silakan login terlebih dahulu.' };
    }

    const cleanClassName = className.trim().toUpperCase();
    const gradeMatch = cleanClassName.match(/([456])/);
    const gradeLevel = gradeMatch ? parseInt(gradeMatch[1], 10) : 4;

    // 1. Ambil semua siswa terdaftar pada rombel ini
    const studentsList = await db.query.users.findMany({
      where: and(
        eq(users.role, 'siswa'),
        eq(users.is_active, true),
        eq(users.class_name, cleanClassName)
      ),
      orderBy: [asc(users.name)],
    });

    // 2. Ambil semua sesi pertemuan dari database untuk tingkat kelas ini
    const dbMeetings = await db.query.meetings.findMany({
      where: or(
        eq(meetings.grade_level, gradeLevel),
        isNull(meetings.grade_level)
      ),
      orderBy: [asc(meetings.date), asc(meetings.meeting_number)],
    });

    // 3. Susun daftar kolom tanggal (Jadwal nyata + sinkronisasi pertemuan DB)
    const baseSchedule = generateScheduleDates(gradeLevel, sessionCount);
    const meetingMapByDate = new Map<string, typeof meetings.$inferSelect>();
    for (const m of dbMeetings) {
      if (m.date) {
        meetingMapByDate.set(m.date, m);
      }
    }

    // Gabungkan tanggal jadwal default dengan pertemuan DB yang sudah ada
    const allDatesMap = new Map<string, { displayDate: string; dayName: string; meetingNumber: number; meetingId?: string | null }>();

    baseSchedule.forEach((item, idx) => {
      const dbM = meetingMapByDate.get(item.dateStr);
      allDatesMap.set(item.dateStr, {
        displayDate: item.displayDate,
        dayName: item.dayName,
        meetingNumber: dbM ? dbM.meeting_number : idx + 1,
        meetingId: dbM ? dbM.id : null,
      });
    });

    // Masukkan pertemuan DB jika ada tanggal di luar baseSchedule
    for (const m of dbMeetings) {
      if (m.date && !allDatesMap.has(m.date)) {
        const parts = m.date.split('-');
        const displayDate = parts.length === 3 ? `${parts[2]}/${parts[1]}` : m.date;
        allDatesMap.set(m.date, {
          displayDate,
          dayName: baseSchedule[0]?.dayName || 'Sesi',
          meetingNumber: m.meeting_number,
          meetingId: m.id,
        });
      }
    }

    // 4. Ambil catatan presensi siswa pada rombel ini
    const studentIds = studentsList.map((s) => s.id);
    const studentNames = studentsList.map((s) => s.name);

    const attendanceRecords = studentIds.length > 0
      ? await db.query.attendance.findMany({
          where: or(
            inArray(attendance.user_id, studentIds),
            inArray(attendance.student_name, studentNames)
          ),
          with: {
            meeting: true,
          },
        })
      : [];

    const normalizeName = (n?: string | null) =>
      n ? n.trim().toLowerCase().replace(/\s+/g, ' ') : '';

    // Pastikan jika ada presensi yang tanggalnya belum ada di allDatesMap, tetap ditambahkan agar tidak hilang
    for (const att of attendanceRecords) {
      if (att.status !== 'hadir') continue;
      const ts = att.checked_in_at || att.check_in_time || att.created_at;
      const dateKey =
        att.meeting?.date?.trim() ||
        (ts
          ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date(ts))
          : null);

      if (dateKey && !allDatesMap.has(dateKey)) {
        const parts = dateKey.split('-');
        const displayDate = parts.length === 3 ? `${parts[2]}/${parts[1]}` : dateKey;
        allDatesMap.set(dateKey, {
          displayDate,
          dayName: baseSchedule[0]?.dayName || 'Sesi',
          meetingNumber: att.meeting?.meeting_number || allDatesMap.size + 1,
          meetingId: att.meeting_id,
        });
      }
    }

    // Urutkan kolom tanggal secara kronologis
    const sortedDateEntries = Array.from(allDatesMap.entries()).sort(([dateA], [dateB]) =>
      dateA.localeCompare(dateB)
    );

    const columns: MatrixColumn[] = sortedDateEntries.map(([dateStr, meta], idx) => ({
      dateStr,
      displayDate: meta.displayDate,
      dayName: meta.dayName,
      meetingNumber: meta.meetingNumber || idx + 1,
      meetingId: meta.meetingId,
    }));

    // Pemetaan Presensi: Key = `${studentId_or_normalizedName}_${dateStr}` & `${id}_mid_${meetingId}` -> boolean
    const presenceSet = new Set<string>();

    for (const att of attendanceRecords) {
      if (att.status !== 'hadir') continue;

      const ts = att.checked_in_at || att.check_in_time || att.created_at;
      let dateKey: string | null = null;
      if (att.meeting && att.meeting.date) {
        dateKey = att.meeting.date.trim();
      } else if (ts) {
        dateKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date(ts));
      }

      const normAttName = normalizeName(att.student_name);

      if (dateKey) {
        if (att.user_id) {
          presenceSet.add(`${att.user_id}_${dateKey}`);
        }
        if (normAttName) {
          presenceSet.add(`${normAttName}_${dateKey}`);
        }
      }

      if (att.meeting_id) {
        if (att.user_id) {
          presenceSet.add(`${att.user_id}_mid_${att.meeting_id}`);
        }
        if (normAttName) {
          presenceSet.add(`${normAttName}_mid_${att.meeting_id}`);
        }
      }
    }

    // 5. Susun Baris Siswa & Hitung Total Kehadiran
    const columnTotals: Record<string, number> = {};
    columns.forEach((col) => {
      columnTotals[col.dateStr] = 0;
    });

    let sumTotalPresentAllStudents = 0;

    const studentRows: StudentMatrixRow[] = studentsList.map((student) => {
      const attendanceMap: Record<string, boolean> = {};
      let totalPresent = 0;
      const normStudentName = normalizeName(student.name);

      columns.forEach((col) => {
        const isPresentById = presenceSet.has(`${student.id}_${col.dateStr}`);
        const isPresentByName = normStudentName ? presenceSet.has(`${normStudentName}_${col.dateStr}`) : false;
        const isPresentByMid = col.meetingId
          ? presenceSet.has(`${student.id}_mid_${col.meetingId}`) ||
            (normStudentName ? presenceSet.has(`${normStudentName}_mid_${col.meetingId}`) : false)
          : false;

        const isPresent = isPresentById || isPresentByName || isPresentByMid;

        attendanceMap[col.dateStr] = isPresent;
        if (isPresent) {
          totalPresent += 1;
          columnTotals[col.dateStr] = (columnTotals[col.dateStr] || 0) + 1;
        }
      });

      sumTotalPresentAllStudents += totalPresent;
      const attendancePercentage = columns.length > 0 ? Math.round((totalPresent / columns.length) * 100) : 0;

      return {
        studentId: student.id,
        studentName: student.name,
        className: cleanClassName,
        gradeLevel,
        avatarUrl: student.avatar_url,
        attendanceMap,
        totalPresent,
        attendancePercentage,
      };
    });

    const maxPossibleAttendance = studentRows.length * columns.length;
    const overallAttendancePercentage = maxPossibleAttendance > 0
      ? Math.round((sumTotalPresentAllStudents / maxPossibleAttendance) * 100)
      : 0;

    return {
      success: true,
      data: {
        className: cleanClassName,
        gradeLevel,
        columns,
        students: studentRows,
        columnTotals,
        totalStudents: studentRows.length,
        overallAttendancePercentage,
      },
    };
  } catch (error: any) {
    console.error('Error fetching attendance matrix:', error);
    return {
      success: false,
      error: error?.message || 'Gagal mengambil data matriks presensi.',
    };
  }
}

export interface ToggleAttendanceCellParams {
  studentId: string;
  sessionDate: string; // YYYY-MM-DD
  present: boolean; // true = centang hadir, false = batalkan centang
}

/**
 * Server Action: Centang / Batal Centang Manual oleh Admin
 * Khusus Superadmin (Pembina). Guru hanya memiliki akses read-only.
 */
export async function toggleAttendanceCellAction(
  params: ToggleAttendanceCellParams
): Promise<ActionState<{ isPresent: boolean; studentName: string; sessionDate: string }>> {
  try {
    // 1. Verifikasi Origin
    const originCheck = await verifyRequestOrigin();
    if (!originCheck.valid) {
      return { success: false, error: 'Permintaan ditolak: Mismatched Origin.' };
    }

    // 2. Proteksi Otoritas: Hanya Superadmin (Pembina)
    const user = await getCurrentUser();
    if (!user || user.role !== 'superadmin') {
      return {
        success: false,
        error: 'Akses ditolak. Hanya Pembina (Admin) yang berhak mengubah presensi secara manual.',
      };
    }

    const { studentId, sessionDate, present } = params;
    if (!studentId || !sessionDate) {
      return { success: false, error: 'Data parameter tidak lengkap.' };
    }

    // 3. Ambil data siswa
    const student = await db.query.users.findFirst({
      where: and(eq(users.id, studentId), eq(users.role, 'siswa')),
    });

    if (!student) {
      return { success: false, error: 'Data siswa tidak ditemukan.' };
    }

    const studentGrade = student.grade_level || 4;

    // 4. Cari atau buat sesi pertemuan untuk tanggal ini
    let targetMeeting = await db.query.meetings.findFirst({
      where: and(
        eq(meetings.date, sessionDate),
        or(eq(meetings.grade_level, studentGrade), isNull(meetings.grade_level))
      ),
    });

    if (!targetMeeting) {
      // Buat sesi pertemuan otomatis jika belum ada di database
      const existingMeetings = await db.query.meetings.findMany({
        where: or(eq(meetings.grade_level, studentGrade), isNull(meetings.grade_level)),
        orderBy: [asc(meetings.meeting_number)],
      });

      const nextNum = existingMeetings.length + 1;
      const parts = sessionDate.split('-');
      const displayDate = parts.length === 3 ? `${parts[2]}/${parts[1]}` : sessionDate;

      const [newMeeting] = await db
        .insert(meetings)
        .values({
          meeting_number: nextNum,
          grade_level: studentGrade,
          title: `Pertemuan ${nextNum} (${displayDate})`,
          description: `Sesi praktikum ekstrakurikuler komputer tanggal ${displayDate}`,
          date: sessionDate,
          start_time: '12:30',
          end_time: '14:00',
          is_open: true,
          is_active: true,
        })
        .returning();

      targetMeeting = newMeeting;
    }

    // 5. Cari catatan presensi yang sudah ada untuk siswa & sesi ini
    const existingRecord = await db.query.attendance.findFirst({
      where: and(
        eq(attendance.meeting_id, targetMeeting.id),
        or(
          eq(attendance.user_id, student.id),
          eq(attendance.student_name, student.name)
        )
      ),
    });

    const timestampWIB = new Date(`${sessionDate}T12:30:00+07:00`);

    if (present) {
      // Admin mencentang HADIR
      if (!existingRecord) {
        await db.insert(attendance).values({
          meeting_id: targetMeeting.id,
          user_id: student.id,
          student_name: student.name,
          grade_level: studentGrade,
          status: 'hadir',
          notes: 'Presensi manual via Matriks Pembina',
          check_in_time: timestampWIB,
          checked_in_at: timestampWIB,
        });
      } else {
        await db
          .update(attendance)
          .set({
            status: 'hadir',
            checked_in_at: timestampWIB,
          })
          .where(eq(attendance.id, existingRecord.id));
      }
    } else {
      // Admin MEMBATALKAN centang (menghapus kehadiran)
      if (existingRecord) {
        await db.delete(attendance).where(eq(attendance.id, existingRecord.id));
      }
    }

    try {
      revalidatePath('/admin/dashboard');
      revalidatePath('/');
    } catch {
      // ignore revalidate errors
    }

    return {
      success: true,
      data: {
        isPresent: present,
        studentName: student.name,
        sessionDate,
      },
      message: present
        ? `Presensi "${student.name}" berhasil dicentang hadir.`
        : `Presensi "${student.name}" berhasil dibatalkan.`,
    };
  } catch (error: any) {
    console.error('Error toggling attendance cell:', error);
    return {
      success: false,
      error: error?.message || 'Gagal memperbarui status presensi.',
    };
  }
}
