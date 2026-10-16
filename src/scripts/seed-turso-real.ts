import * as dotenv from 'dotenv';
import path from 'path';

// Pastikan membaca .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../db/schema';
import { users, deviceStations, meetings, materials, assignments } from '../db/schema';
import bcrypt from 'bcryptjs';
import ExcelJS from 'exceljs';
import { count } from 'drizzle-orm';

async function seedRealTurso() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    throw new Error('TURSO_DATABASE_URL atau TURSO_AUTH_TOKEN tidak ditemukan di .env.local!');
  }

  console.log('🚀 Menghubungkan langsung ke Turso Cloud Database:');
  console.log('URL:', url);

  const client = createClient({ url, authToken });
  const tursoDb = drizzle(client, { schema });

  const defaultStudentPasswordHash = await bcrypt.hash('123456', 10);
  const defaultTeacherPasswordHash = await bcrypt.hash('guru12345', 10);

  // 1. Masukkan Akun Guru Pembimbing
  console.log('\n👤 1. Memasukkan data Guru Pembimbing...');
  const teachers = [
    {
      name: 'Budi Santoso, S.Pd',
      username: 'guru.budi',
      password_hash: defaultTeacherPasswordHash,
      role: 'guru' as const,
      grade_level: null,
      class_name: 'Guru Wali Kelas 4 & Pembimbing',
      gender: 'L' as const,
      avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=guruBudi',
      is_active: true,
    },
    {
      name: 'Siti Rahmawati, S.Pd',
      username: 'guru.siti',
      password_hash: defaultTeacherPasswordHash,
      role: 'guru' as const,
      grade_level: null,
      class_name: 'Guru Wali Kelas 5 & Pembimbing',
      gender: 'P' as const,
      avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=guruSiti',
      is_active: true,
    },
  ];

  for (const t of teachers) {
    await tursoDb
      .insert(users)
      .values(t)
      .onConflictDoUpdate({
        target: users.username,
        set: t,
      });
  }
  console.log('✅ Data Guru berhasil dimasukkan.');

  // 2. Baca file Excel KLS 4-6 PER OKT 2026.xlsx & Masukkan Siswa
  console.log('\n📊 2. Membaca file Excel KLS 4-6 PER OKT 2026.xlsx...');
  const filePath = path.join(process.cwd(), 'KLS 4-6 PER OKT 2026.xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) {
    throw new Error('Worksheet 1 di file Excel tidak ditemukan!');
  }

  const rombelTracker: Record<string, number> = {};
  const studentsToInsert: Array<typeof users.$inferInsert> = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= 2) return; // Lewati header

    const nameVal = row.getCell(2).value;
    const rombelVal = row.getCell(3).value;

    const name = String(nameVal || '').trim();
    const rombel = String(rombelVal || '').trim().toUpperCase();

    if (!name) return;

    rombelTracker[rombel] = (rombelTracker[rombel] || 0) + 1;
    const seqInRombel = rombelTracker[rombel];

    // Deteksi tingkat kelas (4, 5, atau 6)
    const match = rombel.match(/([456])/);
    const gradeLevel = match ? parseInt(match[1], 10) : 4;

    // Generate username unik (misal: 4a-01, 5b-12)
    const username = `${rombel.toLowerCase()}-${String(seqInRombel).padStart(2, '0')}`;
    const avatarUrl = `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${encodeURIComponent(name)}`;

    studentsToInsert.push({
      name,
      username,
      password_hash: defaultStudentPasswordHash,
      role: 'siswa',
      grade_level: gradeLevel,
      class_name: rombel,
      avatar_url: avatarUrl,
      is_active: true,
    });
  });

  console.log(`🎒 Ditemukan ${studentsToInsert.length} siswa dari file Excel.`);
  console.log('Rombel breakdown:', rombelTracker);

  // Masukkan siswa ke Turso
  let insertedCount = 0;
  for (const student of studentsToInsert) {
    await tursoDb
      .insert(users)
      .values(student)
      .onConflictDoUpdate({
        target: users.username,
        set: {
          name: student.name,
          grade_level: student.grade_level,
          class_name: student.class_name,
          avatar_url: student.avatar_url,
          is_active: true,
        },
      });
    insertedCount++;
    if (insertedCount % 25 === 0 || insertedCount === studentsToInsert.length) {
      process.stdout.write(`  Tersimpan ke Turso: ${insertedCount}/${studentsToInsert.length} siswa\r`);
    }
  }
  console.log(`\n✅ Seluruh ${studentsToInsert.length} siswa resmi tersimpan di Turso!`);

  // 3. Stasiun Laptop
  console.log('\n💻 3. Menyimpan 20 Slot Laptop Lab Komputer...');
  for (let i = 1; i <= 20; i++) {
    const padded = i.toString().padStart(2, '0');
    const stationNumber = `Laptop ${padded}`;
    await tursoDb
      .insert(deviceStations)
      .values({
        station_number: stationNumber,
        device_name: `Laptop Lab (${padded})`,
        status: 'available',
        assigned_notes: `Meja Lab Komputer SDN Pleburan 03`,
      })
      .onConflictDoNothing();
  }
  console.log('✅ 20 Slot Laptop berhasil disiapkan di Turso.');

  // 4. Sesi Pertemuan Awal
  console.log('\n📅 4. Membuat Sesi Pertemuan Awal Terbuka...');
  const initialMeetings = [
    {
      meeting_number: 1,
      grade_level: 4,
      title: 'Pertemuan 1: Belajar Mengetik 10 Jari',
      description: 'Pengenalan keyboard, posisi jari home row (ASDF JKL;), dan latihan mengetik cepat.',
      date: new Date().toISOString().split('T')[0],
      start_time: '12:30',
      end_time: '14:00',
      is_open: true,
      is_active: true,
    },
    {
      meeting_number: 1,
      grade_level: 5,
      title: 'Pertemuan 1: Pengenalan Aplikasi Pengolah Kata',
      description: 'Dasar membuat dokumen, format font, dan tata letak paragraf rapi.',
      date: new Date().toISOString().split('T')[0],
      start_time: '12:30',
      end_time: '14:00',
      is_open: true,
      is_active: true,
    },
    {
      meeting_number: 1,
      grade_level: 6,
      title: 'Pertemuan 1: Dasar Pemrograman & Logika Komputer',
      description: 'Pengenalan algoritma visual, logika urutan, dan pengenalan Scratch.',
      date: new Date().toISOString().split('T')[0],
      start_time: '12:30',
      end_time: '14:00',
      is_open: true,
      is_active: true,
    },
  ];

  for (const m of initialMeetings) {
    await tursoDb.insert(meetings).values(m);
  }
  console.log('✅ Sesi Pertemuan awal untuk Kelas 4, 5, dan 6 berhasil dibuat dan status DIBUKA.');

  // 5. Verifikasi Total
  const [totalUsers] = await tursoDb.select({ count: count() }).from(users);
  const [totalMeetings] = await tursoDb.select({ count: count() }).from(meetings);
  const [totalStations] = await tursoDb.select({ count: count() }).from(deviceStations);

  console.log('\n=============================================');
  console.log('🎉 MIGRASI KE TURSO BERHASIL SEMPURNA!');
  console.log(`Total User di Turso: ${totalUsers.count}`);
  console.log(`Total Sesi Pertemuan: ${totalMeetings.count}`);
  console.log(`Total Laptop: ${totalStations.count}`);
  console.log('=============================================');
}

seedRealTurso().catch(console.error);
