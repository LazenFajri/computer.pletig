'use server';

import { db } from '@/db';
import { assignments, submissions, meetings, users } from '@/db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/session';
import type { ActionState, GradeLevel } from '@/lib/auth-types';
import { revalidatePath } from 'next/cache';

export interface CreateAssignmentParams {
  meetingId: string;
  title: string;
  instructions?: string;
  dueDate?: string; // YYYY-MM-DD
  maxScore?: number;
}

export interface SubmitAssignmentParams {
  assignmentId: string;
  studentName: string;
  gradeLevel: GradeLevel;
  submissionUrl?: string;
  submissionText?: string;
}

export interface GradeSubmissionParams {
  submissionId: string;
  score: number;
  feedback?: string;
}

export interface AssignmentWithDetails {
  id: string;
  meetingId: string;
  title: string;
  instructions: string | null;
  dueDate: string | null;
  maxScore: number;
  createdAt: Date;
  submissionCount: number;
  meeting: {
    id: string;
    meetingNumber: number;
    title: string;
    gradeLevel: number | null;
    date: string;
  } | null;
}

export interface SubmissionWithDetails {
  id: string;
  assignmentId: string;
  studentName: string;
  gradeLevel: number | null;
  submissionUrl: string | null;
  submissionText: string | null;
  submittedAt: Date;
  status: 'submitted' | 'graded' | 'late' | 'resubmit';
  score: number | null;
  feedback: string | null;
  gradedAt: Date | null;
  assignmentTitle?: string;
}

/**
 * Server Action: Mengambil Daftar Tugas Praktikum
 */
export async function getAssignmentsAction(
  filterGrade?: GradeLevel | null
): Promise<AssignmentWithDetails[]> {
  const allAssignments = await db.query.assignments.findMany({
    orderBy: [desc(assignments.created_at)],
    with: {
      meeting: true,
    },
  });

  const allSubmissions = await db.query.submissions.findMany();

  return allAssignments
    .filter((ass) => {
      if (!filterGrade) return true;
      if (ass.meeting && ass.meeting.grade_level !== null && ass.meeting.grade_level !== filterGrade) {
        return false;
      }
      return true;
    })
    .map((ass) => {
      const subCount = allSubmissions.filter((s) => s.assignment_id === ass.id).length;
      return {
        id: ass.id,
        meetingId: ass.meeting_id,
        title: ass.title,
        instructions: ass.instructions,
        dueDate: ass.due_date,
        maxScore: ass.max_score,
        createdAt: ass.created_at,
        submissionCount: subCount,
        meeting: ass.meeting
          ? {
              id: ass.meeting.id,
              meetingNumber: ass.meeting.meeting_number,
              title: ass.meeting.title,
              gradeLevel: ass.meeting.grade_level,
              date: ass.meeting.date,
            }
          : null,
      };
    });
}

/**
 * Server Action: Buat Tugas Baru (Admin)
 */
export async function createAssignmentAction(
  params: CreateAssignmentParams
): Promise<ActionState<typeof assignments.$inferSelect>> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'superadmin') {
      return { success: false, error: 'Hanya Pembina (Superadmin) yang dapat membuat tugas.' };
    }

    const { meetingId, title, instructions = '', dueDate, maxScore = 100 } = params;

    const cleanTitle = title.trim();
    if (!cleanTitle) {
      return { success: false, error: 'Judul tugas wajib diisi.' };
    }

    if (!meetingId) {
      return { success: false, error: 'Pilih sesi pertemuan untuk tugas ini.' };
    }

    const inserted = await db
      .insert(assignments)
      .values({
        meeting_id: meetingId,
        title: cleanTitle,
        instructions: instructions.trim() || null,
        due_date: dueDate?.trim() || null,
        max_score: maxScore || 100,
        is_group_work: false,
      })
      .returning();

    try {
      revalidatePath('/tugas');
      revalidatePath('/admin/dashboard');
      revalidatePath('/siswa/dashboard');
      revalidatePath('/');
    } catch {
      // ignore
    }

    return {
      success: true,
      data: inserted[0],
      message: `Tugas "${cleanTitle}" berhasil dibuat!`,
    };
  } catch (error) {
    console.error('Error creating assignment:', error);
    return { success: false, error: 'Gagal membuat tugas.' };
  }
}

export interface UpdateAssignmentParams {
  assignmentId: string;
  meetingId: string;
  title: string;
  instructions?: string;
  dueDate?: string;
  maxScore?: number;
}

/**
 * Server Action: Edit / Perbarui Tugas Praktikum
 */
export async function updateAssignmentAction(
  params: UpdateAssignmentParams
): Promise<ActionState<typeof assignments.$inferSelect>> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'superadmin') {
      return { success: false, error: 'Hanya Pembina yang berhak mengubah tugas.' };
    }

    const { assignmentId, meetingId, title, instructions = '', dueDate, maxScore = 100 } = params;

    const cleanTitle = title.trim();
    if (!cleanTitle) {
      return { success: false, error: 'Judul tugas wajib diisi.' };
    }

    const updated = await db
      .update(assignments)
      .set({
        meeting_id: meetingId,
        title: cleanTitle,
        instructions: instructions.trim() || null,
        due_date: dueDate?.trim() || null,
        max_score: maxScore || 100,
      })
      .where(eq(assignments.id, assignmentId))
      .returning();

    if (!updated || updated.length === 0) {
      return { success: false, error: 'Tugas tidak ditemukan.' };
    }

    try {
      revalidatePath('/tugas');
      revalidatePath('/admin/dashboard');
      revalidatePath('/siswa/dashboard');
      revalidatePath('/');
    } catch {
      // ignore
    }

    return {
      success: true,
      data: updated[0],
      message: `Tugas "${cleanTitle}" berhasil diperbarui!`,
    };
  } catch (error) {
    console.error('Error updating assignment:', error);
    return { success: false, error: 'Gagal memperbarui tugas.' };
  }
}

/**
 * Server Action: Hapus Tugas (Admin)
 */
export async function deleteAssignmentAction(assignmentId: string): Promise<ActionState> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'superadmin') {
      return { success: false, error: 'Hanya Pembina yang berhak menghapus tugas.' };
    }

    const target = await db.query.assignments.findFirst({
      where: eq(assignments.id, assignmentId),
    });

    if (!target) {
      return { success: false, error: 'Tugas tidak ditemukan.' };
    }

    await db.delete(submissions).where(eq(submissions.assignment_id, assignmentId));
    await db.delete(assignments).where(eq(assignments.id, assignmentId));

    try {
      revalidatePath('/tugas');
      revalidatePath('/admin/dashboard');
      revalidatePath('/siswa/dashboard');
      revalidatePath('/');
    } catch {
      // ignore
    }

    return {
      success: true,
      message: `Tugas "${target.title}" berhasil dihapus.`,
    };
  } catch (error) {
    console.error('Error deleting assignment:', error);
    return { success: false, error: 'Gagal menghapus tugas.' };
  }
}

/**
 * Server Action: Siswa Mengirimkan Tugas (Simpel, Tanpa Login)
 */
export async function submitAssignmentAction(
  params: SubmitAssignmentParams
): Promise<ActionState<typeof submissions.$inferSelect>> {
  try {
    const { assignmentId, studentName, gradeLevel, submissionUrl = '', submissionText = '' } = params;

    const cleanName = studentName.trim();
    if (!cleanName || cleanName.length < 2) {
      return { success: false, error: 'Silakan ketik atau pilih namamu terlebih dahulu.' };
    }

    const cleanUrl = submissionUrl.trim();
    const cleanText = submissionText.trim();

    if (!cleanUrl && !cleanText) {
      return {
        success: false,
        error: 'Silakan masukkan link tugas (Google Drive / Canva / Scratch) atau catatan hasil tugasmu.',
      };
    }

    // Cari user ID jika ada siswa terdaftar dengan nama tersebut
    let resolvedUserId: string | null = null;
    const matchedUser = await db.query.users.findFirst({
      where: and(
        eq(users.grade_level, gradeLevel),
        sql`lower(${users.name}) = lower(${cleanName})`
      ),
    });
    if (matchedUser) {
      resolvedUserId = matchedUser.id;
    }

    // Cek apakah siswa sudah mengirimkan tugas ini sebelumnya
    const existing = await db.query.submissions.findFirst({
      where: and(
        eq(submissions.assignment_id, assignmentId),
        sql`lower(${submissions.student_name}) = lower(${cleanName})`
      ),
    });

    let result;
    const now = new Date();

    if (existing) {
      // Perbarui pengumpulan yang sudah ada
      const updated = await db
        .update(submissions)
        .set({
          submission_url: cleanUrl || existing.submission_url,
          submission_text: cleanText || existing.submission_text,
          submitted_at: now,
          status: 'submitted',
        })
        .where(eq(submissions.id, existing.id))
        .returning();
      result = updated[0];
    } else {
      // Buat pengumpulan baru
      const inserted = await db
        .insert(submissions)
        .values({
          assignment_id: assignmentId,
          user_id: resolvedUserId,
          student_name: cleanName,
          grade_level: gradeLevel,
          submission_url: cleanUrl || null,
          submission_text: cleanText || null,
          submitted_at: now,
          status: 'submitted',
        })
        .returning();
      result = inserted[0];
    }

    try {
      revalidatePath('/tugas');
      revalidatePath('/admin/dashboard');
    } catch {
      // ignore
    }

    return {
      success: true,
      data: result,
      message: `Tugas berhasil dikirim! Hebat, ${cleanName}! Semangat terus belajarnya!`,
    };
  } catch (error) {
    console.error('Error submitting assignment:', error);
    return { success: false, error: 'Terjadi kendala saat mengirim tugas. Silakan coba lagi.' };
  }
}

/**
 * Server Action: Mengambil Pengumpulan Tugas untuk Ditinjau Admin
 */
export async function getSubmissionsAction(
  assignmentId?: string
): Promise<SubmissionWithDetails[]> {
  const allSubmissions = await db.query.submissions.findMany({
    orderBy: [desc(submissions.submitted_at)],
    with: {
      assignment: true,
    },
  });

  return allSubmissions
    .filter((s) => {
      if (assignmentId && s.assignment_id !== assignmentId) return false;
      return true;
    })
    .map((s) => ({
      id: s.id,
      assignmentId: s.assignment_id,
      studentName: s.student_name,
      gradeLevel: s.grade_level,
      submissionUrl: s.submission_url,
      submissionText: s.submission_text,
      submittedAt: s.submitted_at,
      status: s.status,
      score: s.score,
      feedback: s.feedback,
      gradedAt: s.graded_at,
      assignmentTitle: s.assignment?.title,
    }));
}

/**
 * Server Action: Beri Nilai & Masukan untuk Siswa (Admin/Guru)
 */
export async function gradeSubmissionAction(
  params: GradeSubmissionParams
): Promise<ActionState> {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'superadmin' && user.role !== 'guru')) {
      return { success: false, error: 'Hanya Pembina atau Guru yang dapat menilai tugas.' };
    }

    const { submissionId, score, feedback } = params;

    await db
      .update(submissions)
      .set({
        score: Math.min(100, Math.max(0, score)),
        feedback: feedback?.trim() || null,
        status: 'graded',
        graded_by: user.name,
        graded_at: new Date(),
      })
      .where(eq(submissions.id, submissionId));

    try {
      revalidatePath('/tugas');
      revalidatePath('/admin/dashboard');
    } catch {
      // ignore
    }

    return {
      success: true,
      message: 'Nilai dan pesan semangat berhasil disimpan!',
    };
  } catch (error) {
    console.error('Error grading submission:', error);
    return { success: false, error: 'Gagal menyimpan nilai tugas.' };
  }
}
