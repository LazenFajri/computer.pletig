'use server';

import { db } from '@/db';
import { meetings, attendance, users } from '@/db/schema';
import { eq, and, sql, or, isNull, desc, asc } from 'drizzle-orm';
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
  laptopCapacity?: number | null;
  className?: string | null;
  shift?: 1 | 2 | null;
}

/**
 * Server Action: Submit Presensi Siswa (1 Kali per Sesi Aktif)
 * Dilengkapi 3 Lapis Proteksi Anti-Titip Absen:
 * 1. Validasi Kode Token Sesi Harian Dinamis
 * 2. Device / Browser Session Locking (Menyesuaikan pilihan 1 laptop 1 siswa / 2 siswa)
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

    const {
      gradeLevel,
      studentName,
      studentUserId,
      meetingId: requestedMeetingId,
      sessionToken,
      laptopCapacity,
      className,
      shift,
    } = params;

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

    const wib = getWIBInfo();
    const startMin = parseTimeToMinutes(meetingRecord.start_time || '12:30');
    const endMin = parseTimeToMinutes(meetingRecord.end_time || '14:00');

    // LAPIS PROTEKSI 3: Validasi Waktu Sesi (12:30 - 14:00 WIB Otomatis Buka dengan Toleransi 15 Menit)
    // Toleransi: Sesi bisa dibuka 15 menit lebih awal (12:15 WIB) dan ditutup 15 menit setelah jam pulang (14:15 WIB)
    const isWithinPracticalHours = wib.currentMinutes >= (startMin - 15) && wib.currentMinutes <= (endMin + 15);
    const isSessionAllowed = meetingRecord.is_open || meetingRecord.is_active || isWithinPracticalHours;

    if (!isSessionAllowed) {
      if (wib.currentMinutes < (startMin - 15)) {
        return {
          success: false,
          error: `Sesi presensi belum dibuka (Sesi 1 otomatis dibuka pukul ${meetingRecord.start_time || '12:30'} WIB).`,
        };
      }
      if (wib.currentMinutes > (endMin + 15)) {
        return {
          success: false,
          error: `Sesi presensi hari ini telah otomatis ditutup pada pukul ${meetingRecord.end_time || '14:00'} WIB.`,
        };
      }
      return {
        success: false,
        error: 'Sesi presensi sedang ditutup oleh Pembina.',
      };
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

    // LAPIS PROTEKSI 2: Proteksi Browser / Device Session Locking (Per Sesi / Per Rombel)
    // Sesi 1 (12:30 - 13:20) dan Sesi 2 (13:20 - 14:00) memiliki kuota independen di laptop yang sama!
    let cookieStore: Awaited<ReturnType<typeof cookies>> | null = null;
    const currentShift = shift || wib.activeShift || (wib.currentMinutes >= 800 ? 2 : 1);
    const currentRombel = (className && className !== 'all' ? className.trim() : null) || 'all';
    const cookieKey = `pletig_dev_att_${meetingId}_${currentRombel}_s${currentShift}`;
    const capCookieKey = `pletig_dev_cap_${meetingId}_${currentRombel}_s${currentShift}`;
    let deviceStudents: string[] = [];
    let effectiveCapacity = laptopCapacity === 1 ? 1 : 2;

    try {
      cookieStore = await cookies();
      const rawCookie = cookieStore.get(cookieKey)?.value;
      if (rawCookie) {
        const parsed = JSON.parse(decodeURIComponent(rawCookie));
        if (Array.isArray(parsed)) {
          deviceStudents = parsed;
        }
      }
      const rawCap = cookieStore.get(capCookieKey)?.value;
      if (rawCap === '1' || rawCap === '2') {
        effectiveCapacity = parseInt(rawCap, 10);
      }
      if (laptopCapacity === 1 || laptopCapacity === 2) {
        effectiveCapacity = laptopCapacity;
      }
    } catch {
      deviceStudents = [];
    }

    const normCleanName = cleanName.toLowerCase();
    const isAlreadyOnThisDevice = deviceStudents.some((n) => n.toLowerCase() === normCleanName);

    if (deviceStudents.length >= effectiveCapacity && !isAlreadyOnThisDevice) {
      return {
        success: false,
        error: `Laptop ini telah diatur untuk maksimal ${effectiveCapacity} siswa (${effectiveCapacity === 1 ? '1 Laptop 1 Siswa' : '1 Laptop 2 Siswa'}) pada Sesi ${currentShift} (${currentRombel !== 'all' ? `Rombel ${currentRombel}` : 'Lab'}). Kuota sesi berikutnya terbuka otomatis sesuai jam lab (Sesi 1: 12:30-13:20 • Sesi 2: 13:20-14:00 WIB).`,
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
        cookieStore.set(capCookieKey, String(effectiveCapacity), {
          httpOnly: false,
          maxAge: 60 * 60 * 12,
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
  const wib = getWIBInfo();

  // Cari sesi yang sudah ada untuk kelas ini secara berurutan (Minggu 1, Minggu 2, dst)
  const allMeetingsForGrade = await db.query.meetings.findMany({
    where: or(eq(meetings.grade_level, gradeLevel), isNull(meetings.grade_level)),
    orderBy: [asc(meetings.meeting_number), asc(meetings.date)],
  });

  // 1. Utamakan sesi yang tanggalnya hari ini
  // 2. Jika tidak ada, ambil sesi mendatang yang belum selesai
  const todayMeeting = allMeetingsForGrade.find((m) => m.date === wib.dateStr);
  const existingMeeting = todayMeeting || allMeetingsForGrade.find((m) => m.date >= wib.dateStr);

  const randomToken = Math.floor(1000 + Math.random() * 9000).toString();

  if (existingMeeting) {
    // Buka sesi yang sudah ada sesuai minggu yang sedang berjalan, JANGAN buat sesi baru!
    const token = existingMeeting.session_token || existingMeeting.attendance_token || randomToken;
    await db
      .update(meetings)
      .set({
        is_open: true,
        is_active: true,
        date: existingMeeting.date || wib.dateStr,
        start_time: '12:45',
        end_time: '13:55',
        session_token: token,
        attendance_token: token,
        title: safeTitle || existingMeeting.title,
        updated_at: new Date(),
      })
      .where(eq(meetings.id, existingMeeting.id));

    revalidatePath('/absen');
    revalidatePath('/admin/dashboard');
    return {
      success: true,
      message: `Sesi "${existingMeeting.title}" (Minggu ke-${existingMeeting.meeting_number || 1}) berhasil dibuka untuk Kelas ${gradeLevel} (Kode Token: ${token})!`,
    };
  }

  // Jika semua sesi minggu lalu sudah lewat, buat sesi baru berurutan untuk minggu berikutnya:
  const maxNum = allMeetingsForGrade.length > 0
    ? Math.max(...allMeetingsForGrade.map((m) => m.meeting_number || 1))
    : 0;
  const nextNum = maxNum + 1;

  await db.insert(meetings).values({
    meeting_number: nextNum,
    grade_level: gradeLevel,
    title: safeTitle || `Praktikum Komputer Kelas ${gradeLevel} (Minggu ke-${nextNum})`,
    description: `Sesi dibuka manual oleh Pembina pada ${wib.dayName}, ${wib.dateStr}.`,
    date: wib.dateStr,
    start_time: '12:30',
    end_time: '14:00',
    is_open: true,
    is_active: true,
    session_token: randomToken,
    attendance_token: randomToken,
  });

  revalidatePath('/absen');
  revalidatePath('/admin/dashboard');
  return {
    success: true,
    message: `Sesi Pertemuan untuk Kelas ${gradeLevel} berhasil dibuka (12:30 - 14:00 WIB)!`,
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

/**
 * Server Action: Reset Kuota Device Laptop (Jika berganti sesi atau siswa baru)
 */
export async function resetLaptopSessionAction(
  meetingId?: string | null,
  rombel?: string | null,
  shift?: number | null
): Promise<ActionState> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== 'superadmin' && currentUser.role !== 'guru')) {
      return {
        success: false,
        error: 'Akses ditolak: Hanya Pembina / Guru yang berwenang mereset kuota laptop.',
      };
    }

    const cookieStore = await cookies();
    if (meetingId) {
      const s = shift || 1;
      const r = rombel || 'all';
      cookieStore.delete(`pletig_dev_att_${meetingId}`);
      cookieStore.delete(`pletig_dev_cap_${meetingId}`);
      cookieStore.delete(`pletig_dev_att_${meetingId}_${r}_s${s}`);
      cookieStore.delete(`pletig_dev_cap_${meetingId}_${r}_s${s}`);
      cookieStore.delete(`pletig_dev_att_${meetingId}_all_s1`);
      cookieStore.delete(`pletig_dev_att_${meetingId}_all_s2`);
      cookieStore.delete(`pletig_dev_att_${meetingId}_${r}_s1`);
      cookieStore.delete(`pletig_dev_att_${meetingId}_${r}_s2`);
    }
    return {
      success: true,
      message: 'Kuota laptop berhasil direset untuk sesi/siswa baru.',
    };
  } catch (error) {
    console.error('Error resetting laptop session:', error);
    return {
      success: false,
      error: 'Gagal mereset kuota laptop.',
    };
  }
}
