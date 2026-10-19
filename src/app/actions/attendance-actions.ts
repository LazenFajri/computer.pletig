'use server';

import { db } from '@/db';
import { meetings, attendance, users } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import {
  checkActiveSession,
  getStudentsByGrade,
  getStudentsByGradeAndClass,
  getDistinctClassesForGrade,
  getMeetingAttendances,
  getWIBInfo,
  parseTimeToMinutes,
  type ActiveSessionResult,
} from '@/lib/attendance';
import type { GradeLevel, ActionState } from '@/lib/auth-types';
import { getCurrentUser } from '@/lib/session';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import {
  verifyRequestOrigin,
  getClientIp,
  checkAttendanceRateLimit,
  sanitizeStudentName,
  sanitizeText,
} from '@/lib/security';

/**
 * Server Action: Cek Sesi Aktif untuk Kelas Tertentu
 */
export async function checkActiveSessionAction(gradeLevel: GradeLevel): Promise<ActiveSessionResult> {
  return checkActiveSession(gradeLevel);
}

/**
 * Server Action: Ambil Siswa Terdaftar Berdasarkan Kelas
 */
export async function getStudentsByGradeAction(gradeLevel: GradeLevel) {
  return getStudentsByGrade(gradeLevel);
}

/**
 * Server Action: Ambil Siswa Terdaftar Berdasarkan Kelas dan Rombel (misal '4A', '4B')
 */
export async function getStudentsByGradeAndClassAction(
  gradeLevel: GradeLevel,
  className?: string | null
) {
  return getStudentsByGradeAndClass(gradeLevel, className);
}

/**
 * Server Action: Ambil Daftar Rombel Unik untuk Kelas Tertentu (misal ['4A', '4B'])
 */
export async function getDistinctClassesForGradeAction(gradeLevel: GradeLevel) {
  return getDistinctClassesForGrade(gradeLevel);
}

/**
 * Server Action: Ambil Rekap Presensi Sesi Tersebut
 */
export async function getMeetingAttendancesAction(meetingId: string) {
  return getMeetingAttendances(meetingId);
}

export interface SubmitAttendanceParams {
  gradeLevel: GradeLevel;
  studentName: string;
  studentUserId?: string | null;
  meetingId?: string | null;
  sessionToken?: string | null;
}

/**
 * Server Action: Submit Presensi Siswa (1 Kali per Sesi Aktif)
 * Dilengkapi 3 Lapis Proteksi Anti-Titip Absen:
 * 1. Validasi Kode Token Sesi Harian Dinamis
 * 2. Device / Browser Session Locking (Maksimal 2 siswa per laptop)
 * 3. Validasi Waktu Ketat & Status Sesi Sisi Server
 */
export async function submitAttendanceAction(
  params: SubmitAttendanceParams
): Promise<ActionState<typeof attendance.$inferSelect>> {
  try {
    // 1. Verifikasi CSRF / Origin Header (Anti Script Kiddie / Cross-Site Injection)
    const originCheck = await verifyRequestOrigin();
    if (!originCheck.valid) {
      return {
        success: false,
        error: originCheck.reason || 'Permintaan ditolak: Mismatched Origin (CSRF Protection).',
      };
    }

    // 2. IP Rate Limiting (Mencegah spam looping script / automated flood dari lab komputer)
    const clientIp = await getClientIp();
    const rateCheck = checkAttendanceRateLimit(clientIp);
    if (!rateCheck.allowed) {
      return {
        success: false,
        error: rateCheck.message,
      };
    }

    const { gradeLevel, studentName, studentUserId, meetingId: requestedMeetingId, sessionToken } = params;

    // 3. Sanitasi Ketat Input Nama Siswa (Hapus XSS, script payload, HTML injection)
    const cleanName = sanitizeStudentName(studentName);

    if (!cleanName || cleanName.length < 2) {
      return {
        success: false,
        error: 'Silakan pilih atau ketik nama lengkap yang valid terlebih dahulu ya!',
      };
    }

    // 1. Tentukan sesi aktif untuk kelas ini
    let targetMeetingId = requestedMeetingId;

    if (!targetMeetingId) {
      const sessionStatus = await checkActiveSession(gradeLevel);
      if (!sessionStatus.isOpen || !sessionStatus.meeting) {
        return {
          success: false,
          error:
            sessionStatus.message ||
            'Sesi presensi untuk kelas ini belum dibuka atau sudah selesai.',
        };
      }
      targetMeetingId = sessionStatus.meeting.id;
    }

    const meetingId = targetMeetingId;

    // Verifikasi apakah meeting tersebut valid dan sedang dalam rentang waktu buka
    const meetingRecord = await db.query.meetings.findFirst({
      where: eq(meetings.id, meetingId),
    });

    if (!meetingRecord) {
      return {
        success: false,
        error: 'Sesi presensi tidak ditemukan di sistem.',
      };
    }

    // LAPIS PROTEKSI 3: Validasi Status Sesi & Rentang Waktu Ketat
    if (!meetingRecord.is_active && !meetingRecord.is_open) {
      return {
        success: false,
        error: 'Sesi presensi sedang ditutup oleh Pembina. Pengisian absen terkunci.',
      };
    }

    const wib = getWIBInfo();
    const startMin = parseTimeToMinutes(meetingRecord.start_time || '12:30');
    const endMin = parseTimeToMinutes(meetingRecord.end_time || '14:00');

    if (wib.dateStr !== meetingRecord.date && !meetingRecord.is_open) {
      return {
        success: false,
        error: `Sesi presensi bukan untuk hari ini (${meetingRecord.date}).`,
      };
    }

    // Jika admin tidak membuka secara override, cek rentang waktu 12:30 - 14:00 WIB
    if (!meetingRecord.is_open) {
      if (wib.currentMinutes < startMin) {
        return {
          success: false,
          error: `Sesi presensi belum dibuka (Jadwal mulai pukul ${meetingRecord.start_time || '12:30'} WIB).`,
        };
      }

      if (wib.currentMinutes > endMin) {
        return {
          success: false,
          error: `Sesi presensi telah berakhir pada pukul ${meetingRecord.end_time || '14:00'} WIB.`,
        };
      }
    }

    // LAPIS PROTEKSI 1: Validasi Kode Token Sesi Dinamis (Anti-Titip Absen)
    const expectedToken = (meetingRecord.session_token || meetingRecord.attendance_token || '').trim().toUpperCase();
    if (expectedToken) {
      const inputToken = (sessionToken || '').trim().toUpperCase();
      if (!inputToken) {
        return {
          success: false,
          error: 'Kode Token Sesi wajib diisi! Masukkan 4 angka token yang tertera di layar proyektor / laptop Pembina.',
        };
      }
      if (inputToken !== expectedToken) {
        return {
          success: false,
          error: 'Kode Token Sesi salah! Silakan periksa kembali 4 angka token di layar proyektor lab.',
        };
      }
    }

    // LAPIS PROTEKSI 2: Proteksi Browser / Device Session Locking (Maksimal 2 siswa per laptop)
    let cookieStore: Awaited<ReturnType<typeof cookies>> | null = null;
    const cookieKey = `pletig_dev_att_${meetingId}`;
    let deviceStudents: string[] = [];

    try {
      cookieStore = await cookies();
      const rawCookie = cookieStore.get(cookieKey)?.value;
      if (rawCookie) {
        const parsed = JSON.parse(decodeURIComponent(rawCookie));
        if (Array.isArray(parsed)) {
          deviceStudents = parsed;
        }
      }
    } catch {
      deviceStudents = [];
    }

    const normCleanName = cleanName.toLowerCase();
    const isAlreadyOnThisDevice = deviceStudents.some((n) => n.toLowerCase() === normCleanName);

    if (deviceStudents.length >= 2 && !isAlreadyOnThisDevice) {
      return {
        success: false,
        error: 'Laptop ini sudah dipakai absen 2 orang. Silakan gunakan laptop lain atau minta bantuan Kak Pembina!',
      };
    }

    // 2. Cegah duplikasi presensi nama/siswa yang sama di sesi pertemuan yang sama
    let resolvedUserId = studentUserId || null;

    if (!resolvedUserId) {
      const matchedUser = await db.query.users.findFirst({
        where: and(
          eq(users.role, 'siswa'),
          eq(users.grade_level, gradeLevel),
          sql`LOWER(${users.name}) = LOWER(${cleanName})`
        ),
      });
      if (matchedUser) {
        resolvedUserId = matchedUser.id;
      }
    }

    const existingAttendance = await db.query.attendance.findFirst({
      where: and(
        eq(attendance.meeting_id, meetingId),
        resolvedUserId
          ? eq(attendance.user_id, resolvedUserId)
          : sql`LOWER(${attendance.student_name}) = LOWER(${cleanName})`
      ),
    });

    if (existingAttendance) {
      return {
        success: false,
        error: `Nama "${cleanName}" sudah tercatat hadir pada sesi pertemuan ini. Kamu tidak perlu absen lagi ya!`,
      };
    }

    // 3. Simpan data presensi dengan waktu check-in otomatis
    const now = new Date();
    const inserted = await db
      .insert(attendance)
      .values({
        meeting_id: meetingId,
        user_id: resolvedUserId,
        student_name: cleanName,
        grade_level: gradeLevel,
        check_in_time: now,
        checked_in_at: now,
        status: 'hadir',
      })
      .returning();

    // Rekam nama siswa ke cookie device laptop
    if (cookieStore) {
      try {
        if (!isAlreadyOnThisDevice) {
          deviceStudents.push(cleanName);
        }
        cookieStore.set(cookieKey, encodeURIComponent(JSON.stringify(deviceStudents)), {
          httpOnly: false,
          maxAge: 60 * 60 * 12, // Berlaku 12 jam (selama sesi lab hari ini)
          sameSite: 'lax',
          path: '/',
        });
      } catch {
        // Non-blocking
      }
    }

    try {
      revalidatePath('/absen');
      revalidatePath('/siswa/dashboard');
      revalidatePath('/admin/dashboard');
      revalidatePath('/');
    } catch {
      // Invariant error saat dijalankan di luar context server action Next.js
    }

    return {
      success: true,
      data: inserted[0],
      message: `Presensi berhasil dicatat. Selamat belajar, ${cleanName}!`,
    };
  } catch (error) {
    console.error('Error submitting attendance:', error);
    return {
      success: false,
      error: 'Terjadi kendala saat menyimpan presensi. Coba tekan tombol sekali lagi ya!',
    };
  }
}

/**
 * Server Action (Admin): Toggle Manual Buka / Tutup Sesi Pertemuan
 */
export async function toggleMeetingOpenAction(
  meetingId: string,
  isOpen: boolean
): Promise<ActionState> {
  const originCheck = await verifyRequestOrigin();
  if (!originCheck.valid) {
    return { success: false, error: 'Permintaan ditolak: Mismatched Origin.' };
  }

  const user = await getCurrentUser();
  if (!user || user.role !== 'superadmin') {
    return { success: false, error: 'Hanya Pembina (Superadmin) yang dapat mengubah status sesi.' };
  }

  const meetingRecord = await db.query.meetings.findFirst({
    where: eq(meetings.id, meetingId),
  });

  const wib = getWIBInfo();
  let updatedEndTime = meetingRecord?.end_time || '14:00';

  // Jika admin membuka sesi manual sekarang dan end_time sudah lewat, perpanjang end_time 90 menit dari sekarang
  if (isOpen) {
    const currentEndMin = parseTimeToMinutes(updatedEndTime);
    if (wib.currentMinutes >= currentEndMin) {
      const newEndMinutes = wib.currentMinutes + 90;
      const endH = Math.min(23, Math.floor(newEndMinutes / 60));
      const endM = newEndMinutes % 60;
      updatedEndTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
    }
  }

  let tokenToSet = meetingRecord?.session_token || meetingRecord?.attendance_token;
  if (isOpen && !tokenToSet) {
    tokenToSet = Math.floor(1000 + Math.random() * 9000).toString();
  }

  await db
    .update(meetings)
    .set({
      is_open: isOpen,
      is_active: isOpen,
      session_token: tokenToSet,
      attendance_token: tokenToSet,
      end_time: updatedEndTime,
      updated_at: new Date(),
    })
    .where(eq(meetings.id, meetingId));

  revalidatePath('/absen');
  revalidatePath('/admin/dashboard');
  return {
    success: true,
    message: `Sesi berhasil ${isOpen ? `dibuka (Aktif s.d pukul ${updatedEndTime} WIB)` : 'ditutup'}.`,
  };
}

/**
 * Server Action (Admin): Buka Sesi Cepat untuk Kelas Tertentu
 */
export async function openQuickSessionForGradeAction(
  gradeLevel: GradeLevel,
  title?: string
): Promise<ActionState> {
  const originCheck = await verifyRequestOrigin();
  if (!originCheck.valid) {
    return { success: false, error: 'Permintaan ditolak: Mismatched Origin.' };
  }

  const user = await getCurrentUser();
  if (!user || user.role !== 'superadmin') {
    return { success: false, error: 'Hanya Pembina (Superadmin) yang dapat membuka sesi.' };
  }

  const safeTitle = title ? sanitizeText(title, 100) : undefined;

  const allM = await db.query.meetings.findMany();
  const nextNum = allM.length + 1;
  const wib = getWIBInfo();

  // Buat jam mulai dari sekarang, selesai 90 menit ke depan
  const startH = wib.hour;
  const startM = wib.minute;
  const startTime = `${startH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}`;

  const endMinutes = wib.currentMinutes + 90;
  const endH = Math.min(23, Math.floor(endMinutes / 60));
  const endM = endMinutes % 60;
  const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
  const randomToken = Math.floor(1000 + Math.random() * 9000).toString();

  await db.insert(meetings).values({
    meeting_number: nextNum,
    grade_level: gradeLevel,
    title: safeTitle || `Pertemuan ${nextNum} - Praktikum Komputer Kelas ${gradeLevel}`,
    description: `Sesi dibuka manual oleh Pembina pada ${wib.dayName}, ${wib.dateStr}.`,
    date: wib.dateStr,
    start_time: startTime,
    end_time: endTime,
    is_open: true,
    is_active: true,
    session_token: randomToken,
    attendance_token: randomToken,
  });

  revalidatePath('/absen');
  revalidatePath('/admin/dashboard');
  return {
    success: true,
    message: `Sesi Pertemuan untuk Kelas ${gradeLevel} berhasil dibuka (${startTime} - ${endTime} WIB)!`,
  };
}

/**
 * Server Action (Admin): Hapus Catatan Presensi Siswa
 */
export async function deleteAttendanceAction(attendanceId: string): Promise<ActionState> {
  const originCheck = await verifyRequestOrigin();
  if (!originCheck.valid) {
    return { success: false, error: 'Permintaan ditolak: Mismatched Origin.' };
  }

  const user = await getCurrentUser();
  if (!user || user.role !== 'superadmin') {
    return { success: false, error: 'Hanya Pembina (Superadmin) yang dapat menghapus data presensi.' };
  }

  try {
    await db.delete(attendance).where(eq(attendance.id, attendanceId));

    try {
      revalidatePath('/absen');
      revalidatePath('/admin/dashboard');
    } catch {
      // ignore
    }

    return { success: true, message: 'Data presensi berhasil dihapus.' };
  } catch (error) {
    console.error('Error deleting attendance:', error);
    return { success: false, error: 'Gagal menghapus data presensi.' };
  }
}
