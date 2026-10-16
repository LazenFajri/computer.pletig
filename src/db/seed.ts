import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import bcrypt from 'bcryptjs';
import { db } from './index';
import { users, deviceStations, meetings, materials, assignments } from './schema';

async function seed() {
  console.log('🌱 Memulai proses seeding database computer.pletig SDN Pleburan 03...');

  // 1. Hash default password
  const defaultStudentPasswordHash = await bcrypt.hash('123456', 10); // PIN simpel untuk anak SD
  const defaultTeacherPasswordHash = await bcrypt.hash('guru12345', 10);

  // 2. Data Guru
  console.log('👤 Menambahkan data Guru (Pengawas / Laporan)...');
  const dummyTeachers = [
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

  for (const teacher of dummyTeachers) {
    await db
      .insert(users)
      .values(teacher)
      .onConflictDoUpdate({
        target: users.username,
        set: teacher,
      });
  }

  // 3. Data Siswa Kelas 4, 5, 6
  console.log('🎒 Menambahkan data Siswa Kelas 4, 5, dan 6...');
  const dummyStudents = [
    // Kelas 4
    {
      name: 'Aditia Pratama',
      username: '40101',
      password_hash: defaultStudentPasswordHash,
      role: 'siswa' as const,
      grade_level: 4,
      class_name: '4A',
      gender: 'L' as const,
      avatar_url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Aditia',
    },
    {
      name: 'Naura Azkadina',
      username: '40102',
      password_hash: defaultStudentPasswordHash,
      role: 'siswa' as const,
      grade_level: 4,
      class_name: '4B',
      gender: 'P' as const,
      avatar_url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Naura',
    },
    {
      name: 'Dimas Arya Putra',
      username: '40103',
      password_hash: defaultStudentPasswordHash,
      role: 'siswa' as const,
      grade_level: 4,
      class_name: '4A',
      gender: 'L' as const,
      avatar_url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Dimas',
    },
    // Kelas 5
    {
      name: 'Fathan Alvaro',
      username: '50101',
      password_hash: defaultStudentPasswordHash,
      role: 'siswa' as const,
      grade_level: 5,
      class_name: '5A',
      gender: 'L' as const,
      avatar_url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Fathan',
    },
    {
      name: 'Keysha Aurelia',
      username: '50102',
      password_hash: defaultStudentPasswordHash,
      role: 'siswa' as const,
      grade_level: 5,
      class_name: '5B',
      gender: 'P' as const,
      avatar_url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Keysha',
    },
    {
      name: 'Rayyan Bagas Saputra',
      username: '50103',
      password_hash: defaultStudentPasswordHash,
      role: 'siswa' as const,
      grade_level: 5,
      class_name: '5A',
      gender: 'L' as const,
      avatar_url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Rayyan',
    },
    // Kelas 6
    {
      name: 'Kevin Ramadhan',
      username: '60101',
      password_hash: defaultStudentPasswordHash,
      role: 'siswa' as const,
      grade_level: 6,
      class_name: '6A',
      gender: 'L' as const,
      avatar_url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Kevin',
    },
    {
      name: 'Zahra Putri Kirana',
      username: '60102',
      password_hash: defaultStudentPasswordHash,
      role: 'siswa' as const,
      grade_level: 6,
      class_name: '6B',
      gender: 'P' as const,
      avatar_url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Zahra',
    },
    {
      name: 'Gilang Pratama',
      username: '60103',
      password_hash: defaultStudentPasswordHash,
      role: 'siswa' as const,
      grade_level: 6,
      class_name: '6C',
      gender: 'L' as const,
      avatar_url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Gilang',
    },
  ];

  for (const student of dummyStudents) {
    await db
      .insert(users)
      .values(student)
      .onConflictDoUpdate({
        target: users.username,
        set: student,
      });
  }

  // 4. Data 20 Device Stations (Laptop 01 - Laptop 20)
  console.log('💻 Menambahkan 20 Nomor Station / Laptop Lab Komputer...');
  const laptopBrands = ['Lenovo ThinkPad', 'Asus VivoBook', 'Acer Aspire', 'HP Pavilion'];

  for (let i = 1; i <= 20; i++) {
    const paddedNum = i.toString().padStart(2, '0');
    const stationNumber = `Laptop ${paddedNum}`;
    const brand = laptopBrands[(i - 1) % laptopBrands.length];
    const tableNumber = Math.ceil(i / 2);
    const position = i % 2 === 1 ? 'Sisi Kiri' : 'Sisi Kanan';

    await db
      .insert(deviceStations)
      .values({
        station_number: stationNumber,
        device_name: `${brand} (Unit #${paddedNum})`,
        status: i === 18 ? 'maintenance' : 'available',
        assigned_notes: `Meja ${tableNumber} - ${position} (Lab Komputer Utama)`,
      })
      .onConflictDoUpdate({
        target: deviceStations.station_number,
        set: {
          device_name: `${brand} (Unit #${paddedNum})`,
          assigned_notes: `Meja ${tableNumber} - ${position} (Lab Komputer Utama)`,
        },
      });
  }

  // 5. Data Pertemuan Awal (Pertemuan 1, 2, 3)
  console.log('📅 Menambahkan data pertemuan awal (Meetings)...');
  const sampleMeetings = [
    {
      meeting_number: 1,
      grade_level: null,
      title: 'Pertemuan 1: Pengenalan Komputer & Etika Lab SDN Pleburan 03',
      description: 'Mengenal bagian perangkat komputer (CPU, Monitor, Keyboard, Mouse) dan tata tertib lab komputer.',
      date: '2026-10-17',
      start_time: '12:30',
      end_time: '14:00',
      is_open: true, // Manual override aktif untuk testing presensi
      is_active: true,
      attendance_token: 'PLEBURAN-01',
    },
    {
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
    },
    {
      meeting_number: 3,
      grade_level: null,
      title: 'Pertemuan 3: Membuat Dokumen Cerita di Pengolah Kata',
      description: 'Menulis cerita pendek liburan sekolah, format teks (Bold, Italic, Warna), dan menyisipkan gambar.',
      date: '2026-10-31',
      start_time: '12:30',
      end_time: '14:00',
      is_open: false,
      is_active: false,
      attendance_token: 'PLEBURAN-03',
    },
  ];

  for (const m of sampleMeetings) {
    const existing = await db.query.meetings.findFirst({
      where: (tbl, { eq }) => eq(tbl.meeting_number, m.meeting_number),
    });

    let meetingId = existing?.id;
    if (!existing) {
      const inserted = await db.insert(meetings).values(m).returning();
      meetingId = inserted[0]?.id;
    }

    if (meetingId && m.meeting_number === 1) {
      // Tambahkan materi untuk pertemuan 1
      await db.insert(materials).values({
        meeting_id: meetingId,
        title: 'Modul 01: Pengenalan Hardware & Aturan Lab',
        content_markdown: '# Selamat Datang di Ekstra Komputer SDN Pleburan 03!\n\nMari kita jaga kebersihan dan keselamatan di ruang lab komputer bersama-sama.',
        file_url: 'https://drive.google.com',
        file_type: 'pdf',
        order_index: 1,
      });

      // Tambahkan tugas untuk pertemuan 1
      await db.insert(assignments).values({
        meeting_id: meetingId,
        title: 'Tugas 1: Sebutkan 4 Perangkat Keras Komputer Utama',
        instructions: 'Buka program Notepad, ketikkan 4 nama perangkat keras beserta fungsinya, lalu simpan file dengan namamu.',
        due_date: '2026-10-18',
        max_score: 100,
        is_group_work: false,
      });
    }
  }

  console.log('✅ Seeding berhasil diselesaikan!');
  console.log('\n--- RINGKASAN KREDENSIAL DUMMY ---');
  console.log('1. Superadmin (dari .env):');
  console.log('   Username: ' + (process.env.SUPERADMIN_USERNAME || 'pembina.pletig'));
  console.log('   Password: ' + (process.env.SUPERADMIN_PASSWORD || 'pembina123!'));
  console.log('2. Akun Guru (DB):');
  console.log('   Username: guru.budi / guru.siti | Password: guru12345');
  console.log('3. Akun Siswa (DB):');
  console.log('   Kelas 4: NISN 40101 (Aditia), 40102 (Naura), 40103 (Dimas) | PIN: 123456');
  console.log('   Kelas 5: NISN 50101 (Fathan), 50102 (Keysha), 50103 (Rayyan) | PIN: 123456');
  console.log('   Kelas 6: NISN 60101 (Kevin), 60102 (Zahra), 60103 (Gilang) | PIN: 123456');
  console.log('4. Stasiun Laptop:');
  console.log('   Laptop 01 s/d Laptop 20 tersedia.');
}

seed()
  .catch((err) => {
    console.error('❌ Gagal menjalankan seed:', err);
    process.exit(1);
  });
