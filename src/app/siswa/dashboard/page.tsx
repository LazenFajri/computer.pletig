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
    ? await db.query.assignments.findMany({
        where: eq(assignments.meeting_id, activeMeeting.id),
        limit: 3,
      })
    : [];

  return (
    <div className="min-h-screen bg-playful-grid flex flex-col pb-24 sm:pb-8">
      {/* Top Navbar Ceria Siswa */}
      <header className="bg-white/90 backdrop-blur-md border-b border-emerald-100 sticky top-0 z-40 w-full max-w-full overflow-hidden">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-4 w-full">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <Link
              href="/"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm flex items-center justify-center shrink-0"
            >
              <img src="/logo.jpg" alt="Logo computer.pletig" className="w-full h-full object-cover" />
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
                <span className="font-heading text-sm sm:text-lg font-bold text-slate-900 truncate">
                  computer<span className="text-emerald-600">.pletig</span>
                </span>
                <span className="bg-emerald-100 text-emerald-800 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                  Siswa
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate hidden sm:block">
                SDN Pleburan 03 Semarang
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-800 truncate max-w-[140px]">{user.name}</div>
              <div className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full inline-block truncate max-w-[180px]">
                Kelas {user.grade_level || 'SD'} ({user.class_name || '4A'})
              </div>
            </div>
            <LogoutButton variant="pill" className="shrink-0" />
          </div>
        </div>
      </header>

      {/* Main Content Siswa */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 flex-1">
        {/* Welcome Banner Semangat Siswa */}
        <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-emerald-500/15 mb-6 relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full text-xs font-semibold mb-3">
              <Laptop className="w-3.5 h-3.5 text-emerald-200" />
              Ruang Belajar Digital Siswa
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold mb-2 flex items-center gap-2">
              <span>Halo, {user.name}</span>
              <Smile className="w-6 h-6 text-yellow-300" />
            </h1>
            <p className="text-emerald-50 text-xs sm:text-sm leading-relaxed">
              Selamat datang di portal lab komputer SDN Pleburan 03. Pantau sesi pertemuan aktif, isi presensi, dan kerjakan latihan praktikum di bawah ini.
            </p>
          </div>
        </div>

        {/* KARTU SESI PERTEMUAN PRAKTIKUM DINAMIS (Diatur oleh Pembina dari Panel Admin) */}
        <section className="mb-8">
          <div className="bg-white rounded-3xl p-5 sm:p-7 border-2 border-emerald-200/80 shadow-md shadow-emerald-500/5">
            {activeMeeting ? (
              <div className="space-y-4">
                {/* Header Sesi */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-emerald-600 text-white font-heading font-bold text-xs px-3 py-1 rounded-xl shadow-xs">
                      Pertemuan {activeMeeting.meeting_number}
                    </span>
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-xl">
                      Kelas {activeMeeting.grade_level ? `${activeMeeting.grade_level} SD` : 'Semua Kelas (4, 5, 6)'}
                    </span>
                    {activeMeeting.is_open ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-xl">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Sesi Presensi Terbuka
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-xl">
                        Sesi Terjadwal
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    <span>
                      {activeMeeting.date} • {activeMeeting.start_time} - {activeMeeting.end_time} WIB
                    </span>
                  </div>
                </div>

                {/* Judul & Deskripsi Sesi dari Admin */}
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                    Topik Praktikum Hari Ini:
                  </span>
                  <h3 className="font-heading text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
                    {activeMeeting.title}
                  </h3>
                  <div className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="font-semibold text-slate-700 mb-1">Catatan / Arahan Pembina:</div>
                    <p>{activeMeeting.description || 'Ikuti sesi praktikum komputer dengan tertib dan perhatikan arahan pembina lab.'}</p>
                  </div>
                </div>

                {/* Status Kehadiran Siswa Ini */}
                <div className="pt-2">
                  {myAttendanceRecord ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-emerald-950">
                            Kamu Sudah Tercatat Hadir!
                          </div>
                          <div className="text-xs text-emerald-700 mt-0.5">
                            Status: <span className="font-bold uppercase">{myAttendanceRecord.status}</span>
                            {myAttendanceRecord.station_number && ` • Perangkat: ${myAttendanceRecord.station_number}`}
                          </div>
                        </div>
                      </div>

                      <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-white px-3.5 py-2 rounded-xl border border-emerald-200 shadow-2xs self-start sm:self-auto">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Presensi Berhasil
                      </div>
                    </div>
                  ) : activeMeeting.is_open ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 animate-pulse">
                          <AlertCircle className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-amber-950">
                            Kamu Belum Mengisi Presensi Sesi Ini!
                          </div>
                          <div className="text-xs text-amber-800 mt-0.5">
                            Pembina telah membuka sesi presensi mandiri. Klik tombol di samping untuk mengisi kehadiran.
                          </div>
                        </div>
                      </div>

                      <Link
                        href={`/absen?grade=${studentGrade}`}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-bold text-xs px-5 py-2.5 rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 self-start sm:self-auto active:scale-95 cursor-pointer"
                      >
                        <CalendarCheck className="w-4 h-4" />
                        <span>Isi Presensi Sekarang</span>
                      </Link>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-3 text-xs text-slate-600">
                      <Clock className="w-5 h-5 text-slate-400 shrink-0" />
                      <div>
                        <div className="font-bold text-slate-700">Sesi Presensi Belum Dibuka</div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Presensi otomatis dibuka sesuai jam jadwal praktikum (12.30 - 14.00 WIB) atau saat Pembina mengaktifkan sesi.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tugas Terkait Sesi Ini (Jika Ada) */}
                {sessionAssignments.length > 0 && (
                  <div className="pt-3 border-t border-slate-100">
                    <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-100">
                      <div className="text-xs font-bold text-amber-900 mb-2 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-amber-600" />
                        <span>Tugas Praktikum Sesi Ini ({sessionAssignments.length}):</span>
                      </div>
                      <div className="space-y-1.5">
                        {sessionAssignments.map((ass) => (
                          <Link
                            key={ass.id}
                            href="/tugas"
                            className="text-xs font-semibold text-amber-800 hover:text-amber-950 bg-white p-2 rounded-xl border border-amber-200/60 flex items-center gap-1.5 truncate"
                          >
                            <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
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
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-6 h-6" />
                </div>
                <h4 className="font-heading font-bold text-base text-slate-800">
                  Belum Ada Sesi Pertemuan Khusus yang Dibuka
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Pembina lab belum membuat sesi khusus untuk kelas kamu. Silakan pantau jadwal praktikum reguler atau buka tugas latihan praktikum di bawah.
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
            className="bg-white p-5 rounded-3xl border-2 border-emerald-100 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <CalendarCheck className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-slate-900 text-lg group-hover:text-emerald-700 transition-colors">
                Presensi Mandiri
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {myAttendanceRecord
                  ? 'Kehadiranmu hari ini sudah tercatat. Kamu bisa cek daftar hadir teman sekelas.'
                  : 'Buka lembar presensi dan klik namamu untuk mencatat kehadiran lab hari ini.'}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-bold text-emerald-600 flex items-center gap-1">
              <span>{myAttendanceRecord ? 'Lihat Daftar Hadir' : 'Isi Kehadiran'}</span> →
            </div>
          </Link>

          {/* Card 2: Kirim Tugas */}
          <Link
            href="/tugas"
            className="bg-white p-5 rounded-3xl border-2 border-amber-100 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-slate-900 text-lg group-hover:text-amber-700 transition-colors">
                Kirim Tugas
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Kumpulkan hasil latihan mengetik, gambar digital, atau project Scratch kamu.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-bold text-amber-600 flex items-center gap-1">
              <span>Kirimkan Tugas</span> →
            </div>
          </Link>

          {/* Card 3: Nilai & Bintang */}
          <Link
            href="/tugas"
            className="bg-white p-5 rounded-3xl border-2 border-purple-100 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-slate-900 text-lg group-hover:text-purple-700 transition-colors">
                Bintang & Nilai
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Lihat feedback dan apresiasi langsung dari Bapak Guru pembimbing lab komputer.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-bold text-purple-600 flex items-center gap-1">
              <span>Lihat Prestasiku</span> →
            </div>
          </Link>
        </div>

        {/* Back Link */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-white px-3.5 py-2 rounded-2xl border border-slate-200 shadow-xs transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Lihat Portal Utama Beranda</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
