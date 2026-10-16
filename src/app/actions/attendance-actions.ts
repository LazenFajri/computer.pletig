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
}

/**
 * Server Action: Submit Presensi Siswa (1 Kali per Sesi Aktif)
 */
export async function submitAttendanceAction(
  params: SubmitAttendanceParams
): Promise<ActionState<typeof attendance.$inferSelect>> {
  try {
    const { gradeLevel, studentName, studentUserId, meetingId: requestedMeetingId } = params;
    const cleanName = studentName.trim();

    if (!cleanName || cleanName.length < 2) {
      return {
        success: false,
        error: 'Silakan pilih atau ketik nama lengkap kamu terlebih dahulu ya!',
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

    if (wib.dateStr !== meetingRecord.date) {
      return {
        success: false,
        error: `Sesi presensi bukan untuk hari ini (${meetingRecord.date}).`,
      };
    }

    if (wib.currentMinutes < startMin) {
      return {
        success: false,
        error: `Sesi presensi belum dibuka (Jadwal mulai pukul ${meetingRecord.start_time} WIB).`,
      };
    }

    if (wib.currentMinutes > endMin) {
      return {
        success: false,
        error: `Sesi presensi telah berakhir pada pukul ${meetingRecord.end_time} WIB.`,
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

    try {
      revalidatePath('/absen');
      revalidatePath('/siswa/dashboard');
      revalidatePath('/admin/dashboard');
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

  await db
    .update(meetings)
    .set({
      is_open: isOpen,
      is_active: isOpen,
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
  const user = await getCurrentUser();
  if (!user || user.role !== 'superadmin') {
    return { success: false, error: 'Hanya Pembina (Superadmin) yang dapat membuka sesi.' };
  }

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

  await db.insert(meetings).values({
    meeting_number: nextNum,
    grade_level: gradeLevel,
    title: title || `Pertemuan ${nextNum} - Praktikum Komputer Kelas ${gradeLevel}`,
    description: `Sesi dibuka manual oleh Pembina pada ${wib.dayName}, ${wib.dateStr}.`,
    date: wib.dateStr,
    start_time: startTime,
    end_time: endTime,
    is_open: true,
    is_active: true,
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
