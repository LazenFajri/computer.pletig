import { generateStyledRekapExcel, type AttendanceRecordForExcel } from '../lib/excel-rekap';
import fs from 'fs';
import path from 'path';

async function testExcel() {
  const sampleRecords: AttendanceRecordForExcel[] = [
    {
      no: 1,
      studentName: 'Abizar Fahrezi Hamid',
      gradeLevel: 4,
      className: '4A',
      meetingTitle: 'Pertemuan 1: Pengenalan Komputer & Etika Lab SDN Pleburan 03',
      meetingNumber: 1,
      dateStr: '17/10/2026',
      timeStr: '12:35',
      status: 'hadir',
    },
    {
      no: 2,
      studentName: 'Adhyastha Giorgino Ibrahim',
      gradeLevel: 4,
      className: '4A',
      meetingTitle: 'Pertemuan 1: Pengenalan Komputer & Etika Lab SDN Pleburan 03',
      meetingNumber: 1,
      dateStr: '17/10/2026',
      timeStr: '12:38',
      status: 'hadir',
    },
    {
      no: 3,
      studentName: 'Fathan Alvaro',
      gradeLevel: 5,
      className: '5A',
      meetingTitle: 'Pertemuan 1: Pengenalan Komputer & Etika Lab SDN Pleburan 03',
      meetingNumber: 1,
      dateStr: '17/10/2026',
      timeStr: '12:40',
      status: 'hadir',
    },
    {
      no: 4,
      studentName: 'Nagita Mayza Puspitasari',
      gradeLevel: 6,
      className: '6B',
      meetingTitle: 'Pertemuan 1: Pengenalan Komputer & Etika Lab SDN Pleburan 03',
      meetingNumber: 1,
      dateStr: '17/10/2026',
      timeStr: '12:44',
      status: 'hadir',
    },
  ];

  const buffer = await generateStyledRekapExcel(sampleRecords, {
    sessionTitle: 'Pertemuan 1: Pengenalan Komputer & Etika Lab SDN Pleburan 03',
    gradeFilter: 'Semua Kelas (4, 5, 6)',
    totalRecords: sampleRecords.length,
  });

  const outPath = path.join(process.cwd(), 'Rekap_Presensi_Sample_Test.xlsx');
  fs.writeFileSync(outPath, buffer);
  console.log('✅ Berhasil membuat file Excel uji coba:', outPath);
  console.log('Ukuran file:', buffer.length, 'bytes');
}

testExcel().catch(console.error);
