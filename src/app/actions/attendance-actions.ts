'use server';

import { db } from '@/db';
import { meetings, attendance, users } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { checkActiveSession, getStudentsByGrade, getMeetingAttendances, type ActiveSessionResult } from '@/lib/attendance';
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
          error: 'Sesi absen belum dibuka atau sudah selesai. Hubungi Kak Pembina ya.',
        };
      }
      targetMeetingId = sessionStatus.meeting.id;
    }

    const meetingId = targetMeetingId;

    // 2. Cek apakah siswa sudah absen pada pertemuan ini (mencegah absen ganda)
    // Cek berdasarkan user_id jika ada, atau pencocokan nama (case-insensitive)
    const existingCheckin = await db.query.attendance.findFirst({
      where: and(
        eq(attendance.meeting_id, meetingId),
        sql`lower(${attendance.student_name}) = lower(${cleanName})`
      ),
    });

    if (existingCheckin) {
      return {
        success: false,
        error: `Halo ${cleanName}, kamu sudah tercatat absen pada pertemuan ini ya. Semangat belajarnya!`,
      };
    }

    // Jika studentUserId belum dioper, cari di database berdasarkan nama jika ada
    let resolvedUserId = studentUserId || null;
    if (!resolvedUserId) {
      const matchedUser = await db.query.users.findFirst({
        where: and(
          eq(users.grade_level, gradeLevel),
          sql`lower(${users.name}) = lower(${cleanName})`
        ),
      });
      if (matchedUser) {
        resolvedUserId = matchedUser.id;
      }
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
      // Invariant error saat dijalankan di luar context server action Next.js (misal script test)
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

  await db
    .update(meetings)
    .set({
      is_open: isOpen,
      is_active: isOpen,
      updated_at: new Date(),
    })
    .where(eq(meetings.id, meetingId));

  revalidatePath('/absen');
  revalidatePath('/admin/dashboard');
  return { success: true, message: `Sesi berhasil ${isOpen ? 'dibuka' : 'ditutup'}.` };
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
  const todayStr = new Date().toISOString().split('T')[0];

  await db.insert(meetings).values({
    meeting_number: nextNum,
    grade_level: gradeLevel,
    title: title || `Pertemuan ${nextNum} - Praktikum Komputer Kelas ${gradeLevel}`,
    description: `Sesi dibuka manual oleh Pembina pada ${todayStr}.`,
    date: todayStr,
    start_time: '12:30',
    end_time: '14:00',
    is_open: true,
    is_active: true,
  });

  revalidatePath('/absen');
  revalidatePath('/admin/dashboard');
  return { success: true, message: `Sesi Pertemuan untuk Kelas ${gradeLevel} berhasil dibuka!` };
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
