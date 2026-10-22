'use server';

import { db } from '@/db';
import { meetings, attendance, materials, assignments } from '@/db/schema';
import { eq, desc, asc, and, or, count, isNull } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/session';
import type { ActionState, GradeLevel } from '@/lib/auth-types';
import { revalidatePath } from 'next/cache';
import { verifyRequestOrigin, sanitizeText } from '@/lib/security';

export interface CreateMeetingParams {
  title: string;
  meetingNumber?: number;
  gradeLevel?: GradeLevel | null; // null = Semua Kelas
  date?: string; // YYYY-MM-DD
  startTime?: string; // Default '12:30'
  endTime?: string; // Default '14:00'
  description?: string;
  isOpen?: boolean;
}

export interface MeetingItemWithCounts {
  id: string;
  meetingNumber: number;
  gradeLevel: number | null;
  title: string;
  description: string | null;
  date: string;
  startTime: string;
  endTime: string;
  isOpen: boolean;
  isActive: boolean;
  sessionToken?: string | null;
  attendanceCount: number;
  materialCount: number;
  assignmentCount: number;
  createdAt: Date;
}

/**
 * Mengambil semua daftar sesi pertemuan beserta jumlah peserta hadir, materi, dan tugas
 */
export async function getAllMeetingsAction(
  filterGrade?: GradeLevel | null
): Promise<MeetingItemWithCounts[]> {
  const allMeetings = await db.query.meetings.findMany({
    orderBy: [desc(meetings.meeting_number), desc(meetings.date)],
  });

  const allAttendance = await db.query.attendance.findMany();
  const allMaterials = await db.query.materials.findMany();
  const allAssignments = await db.query.assignments.findMany();

  const results: MeetingItemWithCounts[] = allMeetings
    .filter((m) => {
      if (!filterGrade) return true;
      return m.grade_level === filterGrade || m.grade_level === null;
    })
    .map((m) => {
      const attCount = allAttendance.filter((a) => a.meeting_id === m.id).length;
      const matCount = allMaterials.filter((mat) => mat.meeting_id === m.id).length;
      const assCount = allAssignments.filter((ass) => ass.meeting_id === m.id).length;

      return {
        id: m.id,
        meetingNumber: m.meeting_number,
        gradeLevel: m.grade_level,
        title: m.title,
        description: m.description,
        date: m.date,
        startTime: m.start_time,
        endTime: m.end_time,
        isOpen: m.is_open,
        isActive: m.is_active,
        sessionToken: m.session_token || m.attendance_token || null,
        attendanceCount: attCount,
        materialCount: matCount,
        assignmentCount: assCount,
        createdAt: m.created_at,
      };
    });

  return results;
}

/**
 * Server Action: Buat Sesi Pertemuan Baru
 */
export async function createMeetingAction(
  params: CreateMeetingParams
): Promise<ActionState<typeof meetings.$inferSelect>> {
  try {
    // 1. Validasi CSRF / Origin Header
    const originCheck = await verifyRequestOrigin();
    if (!originCheck.valid) {
      return { success: false, error: originCheck.reason || 'Permintaan ditolak: Mismatched Origin.' };
    }

    // 2. Validasi Otoritas Ganda (Ambil langsung dari Session Server)
    const user = await getCurrentUser();
    if (!user || user.role !== 'superadmin') {
      return { success: false, error: 'Hanya Pembina (Superadmin) yang dapat membuat sesi pertemuan.' };
    }

    const {
      title,
      meetingNumber,
      gradeLevel = null,
      date,
      startTime = '12:45',
      endTime = '13:55',
      description = '',
      isOpen = true,
    } = params;

    const cleanTitle = sanitizeText(title.trim(), 120);
    const cleanDesc = sanitizeText(description.trim(), 500);
    if (!cleanTitle) {
      return { success: false, error: 'Judul pertemuan wajib diisi.' };
    }

    // Tentukan nomor pertemuan berurutan (per-jenjang kelas jika dispesifikasikan)
    let finalMeetingNum = meetingNumber;
    if (!finalMeetingNum || finalMeetingNum < 1) {
      const existingMeetings = await db.query.meetings.findMany({
        where: gradeLevel ? or(eq(meetings.grade_level, gradeLevel), isNull(meetings.grade_level)) : undefined,
      });
      finalMeetingNum = existingMeetings.length > 0 
        ? Math.max(...existingMeetings.map((m) => m.meeting_number || 1)) + 1 
        : 1;
    }

    // Default tanggal hari ini (WIB)
    const todayStr = date || new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());

    const sessionToken = Math.floor(1000 + Math.random() * 9000).toString();

    const inserted = await db
      .insert(meetings)
      .values({
        meeting_number: finalMeetingNum,
        grade_level: gradeLevel || null,
        title: cleanTitle,
        description: cleanDesc || `Sesi pertemuan ${finalMeetingNum} ekstrakurikuler komputer.`,
        date: todayStr,
        start_time: startTime.trim() || '12:45',
        end_time: endTime.trim() || '13:55',
        is_open: isOpen,
        is_active: isOpen,
        session_token: sessionToken,
        attendance_token: sessionToken,
      })
      .returning();

    try {
      revalidatePath('/absen');
      revalidatePath('/admin/dashboard');
      revalidatePath('/materi');
      revalidatePath('/tugas');
      revalidatePath('/');
    } catch {
      // ignore outside request context
    }

    return {
      success: true,
      data: inserted[0],
      message: `Sesi "${cleanTitle}" berhasil dibuat!`,
    };
  } catch (error) {
    console.error('Error creating meeting:', error);
    return { success: false, error: 'Gagal membuat sesi pertemuan. Silakan coba lagi.' };
  }
}

export interface UpdateMeetingParams {
  meetingId: string;
  title: string;
  meetingNumber?: number;
  gradeLevel?: GradeLevel | null;
  date?: string;
  startTime?: string;
  endTime?: string;
  description?: string;
  isOpen?: boolean;
}

/**
 * Server Action: Edit / Perbarui Sesi Pertemuan
 */
export async function updateMeetingAction(
  params: UpdateMeetingParams
): Promise<ActionState<typeof meetings.$inferSelect>> {
  try {
    const originCheck = await verifyRequestOrigin();
    if (!originCheck.valid) {
      return { success: false, error: 'Permintaan ditolak: Mismatched Origin.' };
    }

    const user = await getCurrentUser();
    if (!user || user.role !== 'superadmin') {
      return { success: false, error: 'Hanya Pembina (Superadmin) yang dapat mengubah sesi pertemuan.' };
    }

    const {
      meetingId,
      title,
      meetingNumber,
      gradeLevel = null,
      date,
      startTime = '12:45',
      endTime = '13:55',
      description = '',
      isOpen = false,
    } = params;

    const cleanTitle = sanitizeText(title.trim(), 120);
    const cleanDesc = sanitizeText(description.trim(), 500);
    if (!cleanTitle) {
      return { success: false, error: 'Judul pertemuan wajib diisi.' };
    }

    const updated = await db
      .update(meetings)
      .set({
        title: cleanTitle,
        meeting_number: meetingNumber || 1,
        grade_level: gradeLevel,
        date: date || new Date().toISOString().split('T')[0],
        start_time: startTime.trim() || '12:45',
        end_time: endTime.trim() || '13:55',
        description: cleanDesc || null,
        is_open: isOpen,
        is_active: isOpen,
        updated_at: new Date(),
      })
      .where(eq(meetings.id, meetingId))
      .returning();

    if (!updated || updated.length === 0) {
      return { success: false, error: 'Sesi pertemuan tidak ditemukan.' };
    }

    try {
      revalidatePath('/absen');
      revalidatePath('/admin/dashboard');
      revalidatePath('/materi');
      revalidatePath('/tugas');
      revalidatePath('/');
    } catch {
      // ignore
    }

    return {
      success: true,
      data: updated[0],
      message: `Sesi "${cleanTitle}" berhasil diperbarui!`,
    };
  } catch (error) {
    console.error('Error updating meeting:', error);
    return { success: false, error: 'Gagal memperbarui sesi pertemuan.' };
  }
}

/**
 * Server Action: Hapus Sesi Pertemuan
 */
export async function deleteMeetingAction(meetingId: string): Promise<ActionState> {
  try {
    const originCheck = await verifyRequestOrigin();
    if (!originCheck.valid) {
      return { success: false, error: 'Permintaan ditolak: Mismatched Origin.' };
    }

    const user = await getCurrentUser();
    if (!user || user.role !== 'superadmin') {
      return { success: false, error: 'Hanya Pembina (Superadmin) yang dapat menghapus sesi pertemuan.' };
    }

    const target = await db.query.meetings.findFirst({
      where: eq(meetings.id, meetingId),
    });

    if (!target) {
      return { success: false, error: 'Sesi pertemuan tidak ditemukan.' };
    }

    // Hapus presensi, materi, dan tugas terkait
    await db.delete(attendance).where(eq(attendance.meeting_id, meetingId));
    await db.delete(materials).where(eq(materials.meeting_id, meetingId));
    await db.delete(assignments).where(eq(assignments.meeting_id, meetingId));
    await db.delete(meetings).where(eq(meetings.id, meetingId));

    try {
      revalidatePath('/absen');
      revalidatePath('/admin/dashboard');
      revalidatePath('/materi');
      revalidatePath('/tugas');
      revalidatePath('/');
    } catch {
      // ignore
    }

    return {
      success: true,
      message: `Sesi "${target.title}" berhasil dihapus.`,
    };
  } catch (error) {
    console.error('Error deleting meeting:', error);
    return { success: false, error: 'Gagal menghapus sesi pertemuan.' };
  }
}

/**
 * Server Action: Toggle Status Aktif / Tutup Pertemuan
 */
export async function toggleMeetingStatusAction(
  meetingId: string,
  isOpen: boolean
): Promise<ActionState<{ token?: string }>> {
  try {
    const originCheck = await verifyRequestOrigin();
    if (!originCheck.valid) {
      return { success: false, error: 'Permintaan ditolak: Mismatched Origin.' };
    }

    const user = await getCurrentUser();
    if (!user || user.role !== 'superadmin') {
      return { success: false, error: 'Hanya Pembina yang berhak mengubah status sesi.' };
    }

    const target = await db.query.meetings.findFirst({
      where: eq(meetings.id, meetingId),
    });

    let tokenToSet = target?.session_token || target?.attendance_token;
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
        updated_at: new Date(),
      })
      .where(eq(meetings.id, meetingId));

    try {
      revalidatePath('/absen');
      revalidatePath('/admin/dashboard');
      revalidatePath('/');
    } catch {
      // ignore
    }

    return {
      success: true,
      data: { token: tokenToSet || undefined },
      message: `Sesi pertemuan berhasil ${isOpen ? 'diaktifkan (dibuka)' : 'ditutup'}.`,
    };
  } catch (error) {
    console.error('Error toggling meeting status:', error);
    return { success: false, error: 'Gagal mengubah status sesi pertemuan.' };
  }
}

/**
 * Server Action (Admin): Acak / Generate Token Sesi Baru (Anti-Titip Absen)
 */
export async function generateOrRotateMeetingTokenAction(
  meetingId: string
): Promise<ActionState<{ token: string }>> {
  try {
    const originCheck = await verifyRequestOrigin();
    if (!originCheck.valid) {
      return { success: false, error: 'Permintaan ditolak: Mismatched Origin.' };
    }

    const user = await getCurrentUser();
    if (!user || user.role !== 'superadmin') {
      return { success: false, error: 'Hanya Pembina yang berhak mengubah token sesi.' };
    }

    const newToken = Math.floor(1000 + Math.random() * 9000).toString();

    await db
      .update(meetings)
      .set({
        session_token: newToken,
        attendance_token: newToken,
        updated_at: new Date(),
      })
      .where(eq(meetings.id, meetingId));

    try {
      revalidatePath('/absen');
      revalidatePath('/admin/dashboard');
      revalidatePath('/');
    } catch {
      // ignore
    }

    return {
      success: true,
      data: { token: newToken },
      message: `Kode token sesi baru berhasil digenerate: ${newToken}`,
    };
  } catch (error) {
    console.error('Error rotating meeting token:', error);
    return { success: false, error: 'Gagal mengacak kode token sesi.' };
  }
}

/**
 * Server Action (Admin): Tutup Semua Sesi Aktif Seketika
 */
export async function closeAllActiveSessionsAction(): Promise<ActionState> {
  try {
    const originCheck = await verifyRequestOrigin();
    if (!originCheck.valid) {
      return { success: false, error: 'Permintaan ditolak: Mismatched Origin.' };
    }

    const user = await getCurrentUser();
    if (!user || user.role !== 'superadmin') {
      return { success: false, error: 'Hanya Pembina yang berhak menutup sesi.' };
    }

    await db
      .update(meetings)
      .set({
        is_open: false,
        is_active: false,
        updated_at: new Date(),
      })
      .where(or(eq(meetings.is_open, true), eq(meetings.is_active, true)));

    try {
      revalidatePath('/absen');
      revalidatePath('/admin/dashboard');
      revalidatePath('/');
    } catch {
      // ignore
    }

    return {
      success: true,
      message: 'Semua sesi presensi berhasil ditutup dan dikunci.',
    };
  } catch (error) {
    console.error('Error closing all sessions:', error);
    return { success: false, error: 'Gagal menutup semua sesi.' };
  }
}
