import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const MIME_MAP: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  txt: 'text/plain; charset=utf-8',
  csv: 'text/csv; charset=utf-8',
  sb3: 'application/x.scratch.sb3',
  zip: 'application/zip',
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await context.params;
    // Sanitasi filename untuk mencegah path traversal
    const safeFilename = path.basename(filename);
    const filePath = path.join(process.cwd(), 'public', 'uploads', safeFilename);

    const fileBuffer = await fs.readFile(filePath);
    const ext = safeFilename.split('.').pop()?.toLowerCase() || '';
    const contentType = MIME_MAP[ext] || 'application/octet-stream';

    // File seperti PDF dan Gambar bisa dibuka langsung di browser (inline), file dokumen word/scratch diunduh
    const isViewable = ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'txt'].includes(ext);
    const disposition = isViewable ? `inline; filename="${safeFilename}"` : `attachment; filename="${safeFilename}"`;

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': disposition,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    return new NextResponse('File tidak ditemukan.', { status: 404 });
  }
}
