import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import bcrypt from 'bcryptjs';
import ExcelJS from 'exceljs';
import path from 'path';
import { db } from '../db';
import { users, deviceStations, meetings, materials, assignments } from '../db/schema';
import { eq } from 'drizzle-orm';

async function importStudentsAndSeed() {
  console.log('🚀 Memulai migrasi & seeding ke database Turso...');
  console.log('🔗 URL:', process.env.TURSO_DATABASE_URL);

  const defaultStudentPasswordHash = await bcrypt.hash('123456', 10);
  const defaultTeacherPasswordHash = await bcrypt.hash('guru12345', 10);

  // 1. Seed Guru
  console.log('👤 Memasukkan data Guru...');
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
    },
  ];

  for (const t of teachers) {
    await db
      .insert(users)
      .values(t)
      .onConflictDoUpdate({
        target: users.username,
        set: t,
      });
  }

  // 2. Baca file Excel KLS 4-6 PER OKT 2026.xlsx
  console.log('📊 Membaca file KLS 4-6 PER OKT 2026.xlsx...');
  const filePath = path.join(process.cwd(), 'KLS 4-6 PER OKT 2026.xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) {
    throw new Error('Worksheet 1 tidak ditemukan!');
  }

  const rombelTracker: Record<string, number> = {};
  const studentsToInsert: Array<typeof users.$inferInsert> = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= 2) return; // skip 2 baris header

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

    // Generate username unik ramah anak: rombel + no urut (misal: 4a-01, 5b-12)
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

  console.log(`🎒 Memasukkan ${studentsToInsert.length} siswa ke tabel users Turso...`);

  // Batch insert per 25 items agar LibSQL Turso aman dan cepat
  const batchSize = 25;
  for (let i = 0; i < studentsToInsert.length; i += batchSize) {
    const batch = studentsToInsert.slice(i, i + batchSize);
    for (const student of batch) {
      await db
        .insert(users)
        .values(student)
        .onConflictDoUpdate({
          target: users.username,
          set: {
            name: student.name,
            grade_level: student.grade_level,
            class_name: student.class_name,
            avatar_url: student.avatar_url,
          },
        });
    }
    process.stdout.write(`  Inserted ${Math.min(i + batchSize, studentsToInsert.length)}/${studentsToInsert.length}\r`);
  }
  console.log(`\n✅ Selesai memasukkan ${studentsToInsert.length} siswa!`);

  // 3. Stasiun Laptop
  console.log('💻 Memastikan 20 Nomor Laptop tersedia...');
  for (let i = 1; i <= 20; i++) {
    const padded = i.toString().padStart(2, '0');
    const stationNumber = `Laptop ${padded}`;
    await db
      .insert(deviceStations)
      .values({
        station_number: stationNumber,
        device_name: `Laptop Lab (${padded})`,
        status: 'available',
        assigned_notes: `Meja Lab Komputer SDN Pleburan 03`,
      })
      .onConflictDoNothing();
  }

  // 4. Pastikan Pertemuan Awal tersedia jika belum ada
  console.log('📅 Memeriksa Sesi Pertemuan Awal...');
  const existingMeetings = await db.query.meetings.findMany();
  if (existingMeetings.length === 0) {
    console.log('  Membuat Sesi Pertemuan 1, 2, dan 3...');
    const m1 = await db.insert(meetings).values({
      meeting_number: 1,
      grade_level: null,
      title: 'Pertemuan 1: Pengenalan Komputer & Etika Lab SDN Pleburan 03',
      description: 'Mengenal bagian perangkat komputer (CPU, Monitor, Keyboard, Mouse) dan tata tertib lab komputer.',
      date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date()),
      start_time: '12:30',
      end_time: '14:00',
      is_open: true,
      is_active: true,
      attendance_token: 'PLEBURAN-01',
    }).returning();

    const m2 = await db.insert(meetings).values({
      meeting_number: 2,
      grade_level: null,
      title: 'Pertemuan 2: Latihan Mengetik 10 Jari & Game Edukasi',
      description: 'Melatih posisi jari dasar di home row (ASDF - JKL;) dan bermain typing speed game.',
      date: '2026-10-24',
      start_time: '12:30',
      end_time: '14:00',
      is_open: false,
      is_active: false,
      attendance_token: 'PLEBURAN-02',
    }).returning();

    if (m1[0]) {
      await db.insert(materials).values({
        meeting_id: m1[0].id,
        title: 'Modul 01: Pengenalan Hardware & Aturan Lab',
        content_markdown: '# Selamat Datang di Ekstra Komputer SDN Pleburan 03!\n\nMari kita jaga kebersihan dan keselamatan di ruang lab komputer bersama-sama.',
        file_url: 'https://drive.google.com',
        file_type: 'pdf',
        order_index: 1,
      });

      await db.insert(assignments).values({
        meeting_id: m1[0].id,
        title: 'Tugas 1: Sebutkan 4 Perangkat Keras Komputer Utama',
        instructions: 'Buka program Word atau Notepad, ketikkan 4 nama perangkat keras beserta fungsinya.',
        due_date: '2026-10-25',
        max_score: 100,
        is_group_work: false,
      });
    }
  }

  console.log('🎉 Sukses! Semua data siswa dari Excel dan setup Turso telah rampung.');
}

importStudentsAndSeed().catch((err) => {
  console.error('❌ Terjadi kesalahan saat migrasi Turso:', err);
  process.exit(1);
});
