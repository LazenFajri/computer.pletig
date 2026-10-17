import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Maksimal 15 MB
const MAX_FILE_SIZE = 15 * 1024 * 1024;

// Ekstensi yang diizinkan untuk materi praktikum dan tugas siswa
const ALLOWED_EXTENSIONS = new Set([
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'png',
  'jpg',
  'jpeg',
  'webp',
  'sb3', // Scratch 3 project file
  'txt',
  'csv',
  'zip',
]);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'Tidak ada file yang dipilih.' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'Ukuran file melebihi batas maksimal (15 MB).' },
        { status: 400 }
      );
    }

    const originalName = file.name || 'document';
    const ext = originalName.split('.').pop()?.toLowerCase() || '';

    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        {
          success: false,
          error: `Format file .${ext} tidak didukung. Harap gunakan PDF, Word (.docx), Excel, Gambar, atau Scratch (.sb3).`,
        },
        { status: 400 }
      );
    }

    // Bersihkan nama file dari karakter berbahaya
    const sanitizedBase = originalName
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 50);

    const uniqueFileName = `${Date.now()}_${sanitizedBase}.${ext}`;

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    const filePath = path.join(uploadsDir, uniqueFileName);
    const bytes = await file.arrayBuffer();
    await fs.writeFile(filePath, Buffer.from(bytes));

    const fileUrl = `/api/files/${uniqueFileName}`;
    const publicUrl = `/uploads/${uniqueFileName}`;

    return NextResponse.json({
      success: true,
      url: fileUrl,
      publicUrl,
      fileName: originalName,
      size: file.size,
      message: 'File berhasil diunggah!',
    });
  } catch (error) {
    console.error('Error handling upload:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan pada server saat mengunggah berkas.' },
      { status: 500 }
    );
  }
}
