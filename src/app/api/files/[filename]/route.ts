import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { client } from '@/db';

const MIME_MAP: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  odt: 'application/vnd.oasis.opendocument.text',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  odp: 'application/vnd.oasis.opendocument.presentation',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  txt: 'text/plain; charset=utf-8',
  csv: 'text/csv; charset=utf-8',
  sb3: 'application/x.scratch.sb3',
  zip: 'application/zip',
  rar: 'application/x-rar-compressed',
  '7z': 'application/x-7z-compressed',
  mp4: 'video/mp4',
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await context.params;
    // Sanitasi filename untuk mencegah path traversal
    const safeFilename = path.basename(filename);
    const ext = safeFilename.split('.').pop()?.toLowerCase() || '';

    // 1. Coba baca dari folder local disk jika berkas tersedia
    try {
      const filePath = path.join(process.cwd(), 'public', 'uploads', safeFilename);
      const fileBuffer = await fs.readFile(filePath);
      const contentType = MIME_MAP[ext] || 'application/octet-stream';

      const isViewable = ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'txt'].includes(ext);
      const disposition = isViewable ? `inline; filename="${safeFilename}"` : `attachment; filename="${safeFilename}"`;

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': disposition,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    } catch {
      // Local disk file not found atau running di Vercel serverless lambda
    }

    // 2. Ambil dari database Turso / SQLite (penyimpanan persistent cloud)
    const result = await client.execute({
      sql: 'SELECT original_name, mime_type, file_data FROM uploaded_files WHERE id = ? LIMIT 1',
      args: [safeFilename],
    });

    if (result.rows.length > 0) {
      const row = result.rows[0];
      const base64Data = String(row.file_data || '');
      const fileBuffer = Buffer.from(base64Data, 'base64');
      const originalName = String(row.original_name || safeFilename);
      const contentType = (row.mime_type as string) || MIME_MAP[ext] || 'application/octet-stream';

      const isViewable = ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'txt'].includes(ext);
      const disposition = isViewable ? `inline; filename="${originalName}"` : `attachment; filename="${originalName}"`;

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': disposition,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    return new NextResponse('File tidak ditemukan.', { status: 404 });
  } catch (error) {
    console.error('Error serving file:', error);
    return new NextResponse('File tidak ditemukan atau terjadi kesalahan server.', { status: 404 });
  }
}
