import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { client } from '@/db';

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
  'odt',
  'ods',
  'odp',
  'png',
  'jpg',
  'jpeg',
  'webp',
  'gif',
  'svg',
  'sb3', // Scratch 3 project file
  'txt',
  'csv',
  'zip',
  'rar',
  '7z',
  'mp4',
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
          error: `Format file .${ext} tidak didukung. Harap gunakan PDF, Word (.docx), Excel, Scratch (.sb3), Gambar, atau Arsip ZIP.`,
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
    const fileUrl = `/api/files/${uniqueFileName}`;
    const publicUrl = `/uploads/${uniqueFileName}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Data = buffer.toString('base64');
    const mimeType = file.type || 'application/octet-stream';

    // 1. Simpan ke local disk (public/uploads) jika direktori bisa ditulis
    try {
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      await fs.mkdir(uploadsDir, { recursive: true });
      const filePath = path.join(uploadsDir, uniqueFileName);
      await fs.writeFile(filePath, buffer);
    } catch (fsErr) {
      // Pada lingkungan serverless read-only seperti Vercel, penyimpanan fs diabaikan
      console.warn('Warning: fs write bypassed (using Turso database storage):', fsErr);
    }

    // 2. Simpan secara permanen ke database Turso / SQLite (tabel uploaded_files)
    try {
      await client.execute({
        sql: `INSERT OR REPLACE INTO uploaded_files (id, original_name, mime_type, file_size, file_data, created_at)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [uniqueFileName, originalName, mimeType, file.size, base64Data, Date.now()],
      });
    } catch (dbErr) {
      console.error('Error saving file record to Turso database:', dbErr);
    }

    return NextResponse.json({
      success: true,
      url: fileUrl,
      fileUrl: fileUrl,
      publicUrl,
      fileName: originalName,
      originalName: originalName,
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
