import { getCurrentUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import LogoutButton from '@/components/logout-button';
import Link from 'next/link';
import { db } from '@/db';
import { attendance, assignments } from '@/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { checkActiveSession } from '@/lib/attendance';
import type { GradeLevel } from '@/lib/auth-types';
import {
  Laptop,
  Award,
  Upload,
  CalendarCheck,
  ArrowLeft,
  Smile,
  Clock,
  CheckCircle2,
  FileText,
  AlertCircle,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Dashboard Siswa - computer.pletig SDN Pleburan 03',
  description: 'Portal kegiatan praktikum dan presensi siswa ekstrakurikuler komputer SDN Pleburan 03.',
};

export default async function SiswaDashboardPage() {
  const user = await getCurrentUser();

  // Proteksi: Hanya siswa atau superadmin yang boleh akses
  if (!user || (user.role !== 'siswa' && user.role !== 'superadmin')) {
    redirect('/login?tab=siswa');
  }

  const studentGrade = (user.grade_level as GradeLevel) || 4;
  const activeSessionResult = await checkActiveSession(studentGrade);
  const activeMeeting = activeSessionResult.meeting;

  // Cek apakah siswa ini sudah mengisi presensi untuk sesi pertemuan ini
  let myAttendanceRecord = null;
  if (activeMeeting) {
    const records = await db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.meeting_id, activeMeeting.id),
          or(
            eq(attendance.user_id, user.id),
            eq(attendance.student_name, user.name)
          )
        )
      )
      .limit(1);
    myAttendanceRecord = records[0] || null;
  }

  // Ambil tugas yang terkait dengan sesi pertemuan aktif
  const sessionAssignments = activeMeeting
    ? await db.query.assignments
        .findMany({
          where: eq(assignments.meeting_id, activeMeeting.id),
          limit: 3,
        })
        .catch(() => [])
    : [];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24 sm:pb-8">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 w-full max-w-full overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-2 sm:gap-4 w-full">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Link
              href="/"
              className="w-10 h-10 rounded-lg overflow-hidden bg-white border border-slate-200 shadow-xs flex items-center justify-center shrink-0"
            >
              <img src="/logo.jpg" alt="Logo computer.pletig" className="w-full h-full object-cover" />
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900 truncate">
                  computer<span className="text-indigo-600">.pletig</span>
                </span>
                <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider shrink-0">
                  Siswa
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-normal truncate hidden sm:block">
                SDN Pleburan 03 Semarang
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-slate-800 truncate max-w-[140px]">{user.name}</div>
              <div className="text-[11px] text-slate-500 font-normal">
                Kelas {user.grade_level || 'SD'} ({user.class_name || '4A'})
              </div>
            </div>
            <LogoutButton variant="pill" className="shrink-0" />
          </div>
        </div>
      </header>

      {/* Main Content Siswa */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 flex-1">
        {/* Welcome Banner */}
        <div className="bg-slate-900 rounded-xl p-6 sm:p-8 text-white border border-slate-800 shadow-sm mb-6 relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-full text-xs font-medium text-slate-300 mb-3 border border-slate-700">
              <Laptop className="w-4 h-4 text-indigo-400" aria-hidden="true" />
              Ruang Belajar Digital Siswa
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 text-white">
              Halo, {user.name}
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Selamat datang di portal praktikum komputer SDN Pleburan 03. Pantau sesi pertemuan aktif, isi presensi, dan kerjakan latihan praktikum.
            </p>
          </div>
        </div>

        {/* KARTU SESI PERTEMUAN PRAKTIKUM DINAMIS */}
        <section className="mb-8">
          <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-xs">
            {activeMeeting ? (
              <div className="space-y-4">
                {/* Header Sesi */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-slate-900 text-white font-medium text-xs px-3 py-1 rounded-md shadow-xs">
                      Pertemuan {activeMeeting.meeting_number}
                    </span>
                    <span className="text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md">
                      Kelas {activeMeeting.grade_level ? `${activeMeeting.grade_level} SD` : 'Semua Kelas (4, 5, 6)'}
                    </span>
                    {activeMeeting.is_open ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        Sesi Presensi Terbuka
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full">
                        Sesi Terjadwal
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                    <Clock className="w-4 h-4 text-slate-400" aria-hidden="true" />
                    <span>
                      {activeMeeting.date} • {activeMeeting.start_time} - {activeMeeting.end_time} WIB
                    </span>
                  </div>
                </div>

                {/* Judul & Deskripsi Sesi */}
                <div>
                  <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                    Topik Praktikum Hari Ini:
                  </span>
                  <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mt-0.5">
                    {activeMeeting.title}
                  </h3>
                  <div className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <div className="font-medium text-slate-800 mb-1">Catatan Pembina:</div>
                    <p>{activeMeeting.description || 'Ikuti sesi praktikum komputer dengan tertib dan perhatikan arahan pembina lab.'}</p>
                  </div>
                </div>

                {/* Status Kehadiran Siswa Ini */}
                <div className="pt-2">
                  {myAttendanceRecord ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-md bg-emerald-600 text-white flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-emerald-950">
                            Kamu Sudah Tercatat Hadir
                          </div>
                          <div className="text-xs text-emerald-800 mt-0.5">
                            Status: <span className="font-semibold uppercase">{myAttendanceRecord.status}</span>
                            {myAttendanceRecord.station_number && ` • Perangkat: ${myAttendanceRecord.station_number}`}
                          </div>
                        </div>
                      </div>

                      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800 bg-white px-3 py-1.5 rounded-md border border-emerald-200 shadow-xs self-start sm:self-auto">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                        Presensi Terverifikasi
                      </div>
                    </div>
                  ) : activeMeeting.is_open ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-md bg-amber-500 text-white flex items-center justify-center shrink-0">
                          <AlertCircle className="w-5 h-5" aria-hidden="true" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-amber-950">
                            Kamu Belum Mengisi Presensi Sesi Ini
                          </div>
                          <div className="text-xs text-amber-800 mt-0.5">
                            Pembina telah membuka sesi presensi mandiri. Klik tombol di samping untuk mengisi kehadiran.
                          </div>
                        </div>
                      </div>

                      <Link
                        href={`/absen?grade=${studentGrade}`}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs px-4 py-2 rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5 self-start sm:self-auto cursor-pointer"
                      >
                        <CalendarCheck className="w-4 h-4" aria-hidden="true" />
                        <span>Isi Presensi Sekarang</span>
                      </Link>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center gap-3 text-xs text-slate-600">
                      <Clock className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
                      <div>
                        <div className="font-semibold text-slate-700">Sesi Presensi Belum Dibuka</div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Presensi otomatis dibuka sesuai jadwal praktikum (12:30 - 14:00 WIB: Sesi 1: 12:30-13:20 • Sesi 2: 13:20-14:00).
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tugas Terkait Sesi Ini */}
                {sessionAssignments.length > 0 && (
                  <div className="pt-3 border-t border-slate-100">
                    <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                      <div className="text-xs font-semibold text-slate-800 mb-2 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-slate-500" aria-hidden="true" />
                        <span>Tugas Praktikum Sesi Ini ({sessionAssignments.length}):</span>
                      </div>
                      <div className="space-y-1.5">
                        {sessionAssignments.map((ass) => (
                          <Link
                            key={ass.id}
                            href="/tugas"
                            className="text-xs font-medium text-slate-700 hover:text-slate-900 bg-white p-2 rounded-md border border-slate-200 flex items-center gap-1.5 truncate transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                            <span className="truncate">{ass.title}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500">
                <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3 border border-slate-200">
                  <Clock className="w-5 h-5" aria-hidden="true" />
                </div>
                <h4 className="font-semibold text-sm text-slate-800">
                  Belum Ada Sesi Pertemuan Khusus yang Dibuka
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Pembina lab belum membuat sesi khusus untuk kelas kamu. Silakan pantau jadwal praktikum reguler atau buka tugas latihan praktikum.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* 3 Menu Pintasan Utama Siswa */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {/* Card 1: Presensi Siswa */}
          <Link
            href={`/absen?grade=${studentGrade}`}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors flex flex-col justify-between group cursor-pointer"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center mb-3">
                <CalendarCheck className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="font-semibold text-slate-900 text-base">
                Presensi Mandiri
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {myAttendanceRecord
                  ? 'Kehadiranmu hari ini sudah tercatat. Kamu bisa cek daftar hadir teman sekelas.'
                  : 'Buka lembar presensi dan klik namamu untuk mencatat kehadiran lab hari ini.'}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-medium text-indigo-600 flex items-center gap-1">
              <span>{myAttendanceRecord ? 'Lihat Daftar Hadir' : 'Isi Kehadiran'}</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </div>
          </Link>

          {/* Card 2: Kirim Tugas */}
          <Link
            href="/tugas"
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors flex flex-col justify-between group cursor-pointer"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center mb-3">
                <Upload className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="font-semibold text-slate-900 text-base">
                Kirim Tugas
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Kumpulkan hasil latihan mengetik, gambar digital, atau project Scratch kamu.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-medium text-indigo-600 flex items-center gap-1">
              <span>Kirimkan Tugas</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </div>
          </Link>

          {/* Card 3: Nilai & Hasil */}
          <Link
            href="/tugas"
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors flex flex-col justify-between group cursor-pointer"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center mb-3">
                <Award className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="font-semibold text-slate-900 text-base">
                Nilai & Catatan
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Lihat feedback dan evaluasi langsung dari pembina praktikum lab komputer.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-medium text-indigo-600 flex items-center gap-1">
              <span>Lihat Penilaian</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </div>
          </Link>
        </div>

        {/* Back Link */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white px-3.5 py-2 rounded-lg border border-slate-200 shadow-xs transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
            <span>Lihat Portal Utama Beranda</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
