'use server';

import { db } from '@/db';
import { materials, meetings } from '@/db/schema';
import { eq, desc, asc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/session';
import type { ActionState, GradeLevel } from '@/lib/auth-types';
import { revalidatePath } from 'next/cache';

export interface CreateMaterialParams {
  meetingId: string;
  title: string;
  contentMarkdown?: string;
  fileUrl?: string;
  fileType?: 'pdf' | 'doc' | 'link' | 'video';
  orderIndex?: number;
}

export interface MaterialWithMeeting {
  id: string;
  meetingId: string;
  title: string;
  contentMarkdown: string | null;
  fileUrl: string | null;
  fileType: 'pdf' | 'doc' | 'link' | 'video' | null;
  orderIndex: number;
  createdAt: Date;
  meeting: {
    id: string;
    meetingNumber: number;
    title: string;
    gradeLevel: number | null;
    date: string;
  } | null;
}

/**
 * Server Action: Mengambil Daftar Materi Pembelajaran
 */
export async function getMaterialsAction(
  filterGrade?: GradeLevel | null,
  meetingId?: string
): Promise<MaterialWithMeeting[]> {
  const allMaterials = await db.query.materials.findMany({
    orderBy: [asc(materials.order_index), desc(materials.created_at)],
    with: {
      meeting: true,
    },
  });

  return allMaterials
    .filter((mat) => {
      if (meetingId && mat.meeting_id !== meetingId) return false;
      if (filterGrade) {
        if (mat.meeting && mat.meeting.grade_level !== null && mat.meeting.grade_level !== filterGrade) {
          return false;
        }
      }
      return true;
    })
    .map((mat) => ({
      id: mat.id,
      meetingId: mat.meeting_id,
      title: mat.title,
      contentMarkdown: mat.content_markdown,
      fileUrl: mat.file_url,
      fileType: mat.file_type,
      orderIndex: mat.order_index,
      createdAt: mat.created_at,
      meeting: mat.meeting
        ? {
            id: mat.meeting.id,
            meetingNumber: mat.meeting.meeting_number,
            title: mat.meeting.title,
            gradeLevel: mat.meeting.grade_level,
            date: mat.meeting.date,
          }
        : null,
    }));
}

/**
 * Server Action: Tambah Materi Pembelajaran Baru
 */
export async function createMaterialAction(
  params: CreateMaterialParams
): Promise<ActionState<typeof materials.$inferSelect>> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'superadmin') {
      return { success: false, error: 'Hanya Pembina (Superadmin) yang dapat menambahkan materi.' };
    }

    const {
      meetingId,
      title,
      contentMarkdown = '',
      fileUrl = '',
      fileType = 'link',
      orderIndex = 1,
    } = params;

    const cleanTitle = title.trim();
    if (!cleanTitle) {
      return { success: false, error: 'Judul materi wajib diisi.' };
    }

    if (!meetingId) {
      return { success: false, error: 'Pilih sesi pertemuan untuk materi ini.' };
    }

    const inserted = await db
      .insert(materials)
      .values({
        meeting_id: meetingId,
        title: cleanTitle,
        content_markdown: contentMarkdown.trim() || null,
        file_url: fileUrl.trim() || null,
        file_type: fileType,
        order_index: orderIndex,
      })
      .returning();

    try {
      revalidatePath('/materi');
      revalidatePath('/admin/dashboard');
      revalidatePath('/siswa/dashboard');
      revalidatePath('/');
    } catch {
      // ignore
    }

    return {
      success: true,
      data: inserted[0],
      message: `Materi "${cleanTitle}" berhasil ditambahkan!`,
    };
  } catch (error) {
    console.error('Error creating material:', error);
    return { success: false, error: 'Gagal menambahkan materi pembelajaran.' };
  }
}

export interface UpdateMaterialParams {
  materialId: string;
  meetingId: string;
  title: string;
  contentMarkdown?: string;
  fileUrl?: string;
  fileType?: 'pdf' | 'doc' | 'link' | 'video';
  orderIndex?: number;
}

/**
 * Server Action: Edit / Perbarui Materi Pembelajaran
 */
export async function updateMaterialAction(
  params: UpdateMaterialParams
): Promise<ActionState<typeof materials.$inferSelect>> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'superadmin') {
      return { success: false, error: 'Hanya Pembina yang berhak mengubah materi.' };
    }

    const {
      materialId,
      meetingId,
      title,
      contentMarkdown = '',
      fileUrl = '',
      fileType = 'link',
      orderIndex = 1,
    } = params;

    const cleanTitle = title.trim();
    if (!cleanTitle) {
      return { success: false, error: 'Judul materi wajib diisi.' };
    }

    const updated = await db
      .update(materials)
      .set({
        meeting_id: meetingId,
        title: cleanTitle,
        content_markdown: contentMarkdown.trim() || null,
        file_url: fileUrl.trim() || null,
        file_type: fileType,
        order_index: orderIndex,
      })
      .where(eq(materials.id, materialId))
      .returning();

    if (!updated || updated.length === 0) {
      return { success: false, error: 'Materi tidak ditemukan.' };
    }

    try {
      revalidatePath('/materi');
      revalidatePath('/admin/dashboard');
      revalidatePath('/siswa/dashboard');
      revalidatePath('/');
    } catch {
      // ignore
    }

    return {
      success: true,
      data: updated[0],
      message: `Materi "${cleanTitle}" berhasil diperbarui!`,
    };
  } catch (error) {
    console.error('Error updating material:', error);
    return { success: false, error: 'Gagal memperbarui materi.' };
  }
}

/**
 * Server Action: Hapus Materi Pembelajaran
 */
export async function deleteMaterialAction(materialId: string): Promise<ActionState> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'superadmin') {
      return { success: false, error: 'Hanya Pembina yang berhak menghapus materi.' };
    }

    const target = await db.query.materials.findFirst({
      where: eq(materials.id, materialId),
    });

    if (!target) {
      return { success: false, error: 'Materi tidak ditemukan.' };
    }

    await db.delete(materials).where(eq(materials.id, materialId));

    try {
      revalidatePath('/materi');
      revalidatePath('/admin/dashboard');
      revalidatePath('/siswa/dashboard');
      revalidatePath('/');
    } catch {
      // ignore
    }

    return {
      success: true,
      message: `Materi "${target.title}" berhasil dihapus.`,
    };
  } catch (error) {
    console.error('Error deleting material:', error);
    return { success: false, error: 'Gagal menghapus materi.' };
  }
}
