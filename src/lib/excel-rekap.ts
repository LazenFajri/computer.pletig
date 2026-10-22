import ExcelJS from 'exceljs';
import { ELECTRONIC_SIGN_BASE64 } from './electronic-sign-base64';

export interface AttendanceRecordForExcel {
  no: number;
  studentName: string;
  gradeLevel: number;
  className?: string | null;
  meetingTitle: string;
  meetingNumber: number;
  dateStr: string;
  timeStr: string;
  status: string;
}

export interface RekapExcelOptions {
  title?: string;
  sessionTitle?: string;
  sessionDate?: string; // Tanggal sesi pertemuan dibuat / diselenggarakan (e.g. '2026-10-22')
  gradeFilter?: string;
  totalRecords?: number;
  totalRegistered?: number;
  totalPresent?: number;
  totalAbsent?: number;
}

/**
 * Format tanggal dalam format resmi Indonesia: "22 Oktober 2026"
 */
export function formatIndonesianDate(inputDate?: string | Date | null): string {
  if (!inputDate) {
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());
  }

  if (typeof inputDate === 'string') {
    const trimmed = inputDate.trim();
    // Format YYYY-MM-DD
    const dashMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (dashMatch) {
      const year = parseInt(dashMatch[1], 10);
      const month = parseInt(dashMatch[2], 10);
      const day = parseInt(dashMatch[3], 10);
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
      ];
      if (month >= 1 && month <= 12) {
        return `${day} ${months[month - 1]} ${year}`;
      }
    }

    // Format DD/MM/YYYY
    const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
      const day = parseInt(slashMatch[1], 10);
      const month = parseInt(slashMatch[2], 10);
      const year = parseInt(slashMatch[3], 10);
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
      ];
      if (month >= 1 && month <= 12) {
        return `${day} ${months[month - 1]} ${year}`;
      }
    }
  }

  const d = new Date(inputDate);
  if (!isNaN(d.getTime())) {
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d);
  }

  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
}

/**
 * Membuat Workbook Excel dengan Desain Ceria, Rapi, Berwarna & Profesional
 */
export async function generateStyledRekapExcel(
  records: AttendanceRecordForExcel[],
  options: RekapExcelOptions
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'computer.pletig - SDN Pleburan 03';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Rekap Presensi', {
    views: [{ showGridLines: true }],
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true },
  });

  // Border helper
  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  };

  // 1. HEADER BANNER UTAMA (Merged A1:F1)
  worksheet.mergeCells('A1:F1');
  const banner = worksheet.getCell('A1');
  banner.value = 'SDN PLEBURAN 03 SEMARANG';
  banner.font = { name: 'Segoe UI', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
  banner.alignment = { vertical: 'middle', horizontal: 'center' };
  banner.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A8A' }, // Deep Blue
  };
  worksheet.getRow(1).height = 30;

  // 2. SUB-BANNER (Merged A2:F2)
  worksheet.mergeCells('A2:F2');
  const subBanner = worksheet.getCell('A2');
  subBanner.value = 'REKAPITULASI PRESENSI EKSTRAKURIKULER KOMPUTER & LITERASI DIGITAL';
  subBanner.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFE0E7FF' } };
  subBanner.alignment = { vertical: 'middle', horizontal: 'center' };
  subBanner.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2563EB' }, // Royal Blue
  };
  worksheet.getRow(2).height = 22;

  // Row 3: Spacer
  worksheet.getRow(3).height = 10;

  // 3. KOTAK INFORMASI / METADATA REKAP (Row 4 - 8)
  const nowStr = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(new Date());

  const totalReg = options.totalRegistered ?? records.length;
  const totalHadir = options.totalPresent ?? records.filter((r) => r.status.toUpperCase() === 'HADIR').length;
  const totalTidakHadir = options.totalAbsent ?? Math.max(0, totalReg - totalHadir);
  const percent = totalReg > 0 ? Math.round((totalHadir / totalReg) * 100) : 0;

  const infoRows = [
    ['Sesi Pertemuan', `: ${options.sessionTitle || 'Semua Sesi Pertemuan'}`],
    ['Target Kelas', `: ${options.gradeFilter || 'Semua Kelas (4, 5, 6)'}`],
    ['Waktu Unduh', `: ${nowStr} WIB`],
    ['Total Terdaftar', `: ${totalReg} Siswa`],
    ['Kehadiran', `: ${totalHadir} Hadir (${percent}%)  •  ${totalTidakHadir} Tidak Hadir`],
  ];

  infoRows.forEach((item, idx) => {
    const rowNum = 4 + idx;
    const labelCell = worksheet.getCell(`A${rowNum}`);
    labelCell.value = item[0];
    labelCell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF475569' } };

    worksheet.mergeCells(`B${rowNum}:F${rowNum}`);
    const valCell = worksheet.getCell(`B${rowNum}`);
    valCell.value = item[1];
    valCell.font = {
      name: 'Segoe UI',
      size: 9,
      bold: idx >= 3,
      color: idx === 4 ? { argb: 'FF0F766E' } : idx === 3 ? { argb: 'FF1E293B' } : { argb: 'FF334155' },
    };
    worksheet.getRow(rowNum).height = 18;
  });

  // Row 9: Spacer
  worksheet.getRow(9).height = 12;

  // 4. HEADER TABEL (Row 10)
  const headers = [
    { key: 'no', label: 'NO', width: 7 },
    { key: 'name', label: 'NAMA LENGKAP SISWA', width: 34 },
    { key: 'class', label: 'KELAS / ROMBEL', width: 17 },
    { key: 'meeting', label: 'SESI PERTEMUAN', width: 36 },
    { key: 'time', label: 'WAKTU HADIR (WIB)', width: 23 },
    { key: 'status', label: 'STATUS KEHADIRAN', width: 20 },
  ];

  headers.forEach((h, colIdx) => {
    const colNumber = colIdx + 1;
    worksheet.getColumn(colNumber).width = h.width;
    const cell = worksheet.getCell(10, colNumber);
    cell.value = h.label;
    cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F766E' }, // Emerald / Teal Modern
    };
    cell.border = thinBorder;
  });
  worksheet.getRow(10).height = 26;

  // 5. ISI DATA PRESENSI (Row 11+)
  let currentRow = 11;

  if (records.length === 0) {
    worksheet.mergeCells(`A${currentRow}:F${currentRow + 1}`);
    const emptyCell = worksheet.getCell(`A${currentRow}`);
    emptyCell.value = 'Belum ada data siswa untuk filter ini.';
    emptyCell.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FF94A3B8' } };
    emptyCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(currentRow).height = 35;
    currentRow += 2;
  } else {
    records.forEach((rec, idx) => {
      const isEven = idx % 2 === 0;
      const bgArgb = isEven ? 'FFFFFFFF' : 'FFF8FAFC'; // Soft zebra striping
      const isPresent = rec.status.toUpperCase() === 'HADIR';

      // Col A: No
      const cNo = worksheet.getCell(`A${currentRow}`);
      cNo.value = rec.no;
      cNo.alignment = { vertical: 'middle', horizontal: 'center' };
      cNo.font = { name: 'Segoe UI', size: 9.5 };

      // Col B: Nama Siswa
      const cName = worksheet.getCell(`B${currentRow}`);
      cName.value = rec.studentName;
      cName.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      cName.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };

      // Col C: Kelas / Rombel
      const cClass = worksheet.getCell(`C${currentRow}`);
      cClass.value = rec.className || `Kelas ${rec.gradeLevel}`;
      cClass.alignment = { vertical: 'middle', horizontal: 'center' };
      cClass.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF4338CA' } };

      // Col D: Sesi Pertemuan
      const cMeet = worksheet.getCell(`D${currentRow}`);
      cMeet.value = rec.meetingTitle || `Pertemuan ${rec.meetingNumber}`;
      cMeet.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      cMeet.font = { name: 'Segoe UI', size: 9 };

      // Col E: Waktu Hadir
      const cTime = worksheet.getCell(`E${currentRow}`);
      if (isPresent) {
        cTime.value = rec.timeStr !== '-' ? `${rec.dateStr} • ${rec.timeStr} WIB` : rec.dateStr;
        cTime.alignment = { vertical: 'middle', horizontal: 'center' };
        cTime.font = { name: 'Segoe UI', size: 9, color: { argb: 'FF1E293B' } };
      } else {
        cTime.value = '-';
        cTime.alignment = { vertical: 'middle', horizontal: 'center' };
        cTime.font = { name: 'Segoe UI', size: 9, color: { argb: 'FF94A3B8' } };
      }

      // Col F: Status (Badge Hijau untuk Hadir, Badge Merah untuk Tidak Hadir)
      const cStatus = worksheet.getCell(`F${currentRow}`);
      if (isPresent) {
        cStatus.value = '✓ HADIR';
        cStatus.alignment = { vertical: 'middle', horizontal: 'center' };
        cStatus.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF15803D' } };
        cStatus.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFDCFCE7' }, // Soft green badge
        };
      } else {
        cStatus.value = '✗ TIDAK HADIR';
        cStatus.alignment = { vertical: 'middle', horizontal: 'center' };
        cStatus.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FFB91C1C' } };
        cStatus.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFEE2E2' }, // Soft red badge
        };
      }

      // Set borders & background fill
      ['A', 'B', 'C', 'D', 'E'].forEach((colLetter) => {
        const cell = worksheet.getCell(`${colLetter}${currentRow}`);
        cell.border = thinBorder;
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: bgArgb },
        };
      });
      cStatus.border = thinBorder;

      worksheet.getRow(currentRow).height = 22;
      currentRow++;
    });
  }

  // Row Spacer
  worksheet.getRow(currentRow).height = 14;
  currentRow++;

  // 6. FOOTER TANDA TANGAN (Bawah Kanan)
  // Format: "Semarang, [tanggal sesi dibuat beserta tahun]"
  const dateToUse =
    options.sessionDate ||
    records.find((r) => r.dateStr && r.dateStr !== '-')?.dateStr;
  const formattedSessionDate = formatIndonesianDate(dateToUse);

  const signRow = currentRow;
  worksheet.mergeCells(`D${signRow}:F${signRow}`);
  const signPlace = worksheet.getCell(`D${signRow}`);
  signPlace.value = `Semarang, ${formattedSessionDate}`;
  signPlace.font = { name: 'Segoe UI', size: 9.5, italic: true, color: { argb: 'FF475569' } };
  signPlace.alignment = { horizontal: 'center' };

  worksheet.mergeCells(`D${signRow + 1}:F${signRow + 1}`);
  const signTitle = worksheet.getCell(`D${signRow + 1}`);
  signTitle.value = 'Pembina Ekstrakurikuler Komputer';
  signTitle.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF1E293B' } };
  signTitle.alignment = { horizontal: 'center' };

  // Set tinggi baris agar gambar tanda tangan pas dan tidak terpotong
  worksheet.getRow(signRow).height = 18;
  worksheet.getRow(signRow + 1).height = 18;
  worksheet.getRow(signRow + 2).height = 24;
  worksheet.getRow(signRow + 3).height = 24;
  worksheet.getRow(signRow + 4).height = 22;

  // Pasang Gambar Tanda Tangan Digital Pembina (Muhammad Fajri Setyawan)
  try {
    const signImageId = workbook.addImage({
      base64: ELECTRONIC_SIGN_BASE64,
      extension: 'jpeg',
    });
    // Kolom E (index ~4.12) berada persis di tengah merge D:F
    worksheet.addImage(signImageId, {
      tl: { col: 4.12, row: signRow + 1.25 },
      ext: { width: 96, height: 52 },
    });
  } catch (err) {
    console.warn('Peringatan: Gagal menambahkan gambar tanda tangan digital ke Excel:', err);
  }

  worksheet.mergeCells(`D${signRow + 4}:F${signRow + 4}`);
  const signName = worksheet.getCell(`D${signRow + 4}`);
  signName.value = 'Muhammad Fajri Setyawan';
  signName.font = { name: 'Segoe UI', size: 9.5, bold: true, underline: true, color: { argb: 'FF0F172A' } };
  signName.alignment = { horizontal: 'center' };

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
