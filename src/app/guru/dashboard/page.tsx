import { getCurrentUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import LogoutButton from '@/components/logout-button';
import Link from 'next/link';
import {
  GraduationCap,
  Laptop,
  Users,
  CalendarCheck,
  Award,
  ArrowLeft,
  FileSpreadsheet,
  CheckCircle2,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function GuruDashboardPage() {
  const user = await getCurrentUser();

  // Proteksi: Hanya guru atau superadmin yang boleh akses
  if (!user || (user.role !== 'guru' && user.role !== 'superadmin')) {
    redirect('/login?tab=guru');
  }

  return (
    <div className="min-h-screen bg-playful-grid flex flex-col">
      {/* Top Navbar */}
      <header className="bg-white/90 backdrop-blur-md border-b border-blue-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20"
            >
              <Laptop className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading text-lg font-bold text-slate-900">
                  computer<span className="text-blue-600">.pletig</span>
                </span>
                <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Portal Guru
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Pengawas & Laporan • SDN Pleburan 03
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-800">{user.name}</div>
              <div className="text-[10px] text-blue-600 font-medium">
                {user.class_name || 'Guru Pembimbing'}
              </div>
            </div>
            <LogoutButton variant="pill" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 flex-1">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-blue-600/15 mb-8 relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full text-xs font-semibold mb-3">
              <GraduationCap className="w-3.5 h-3.5 text-yellow-300" />
              Akses Pengawas & Laporan Akademik
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold mb-2 flex items-center gap-2">
              <span>Selamat Datang, Bapak/Ibu {user.name}</span>
              <GraduationCap className="w-6 h-6 text-yellow-300" />
            </h1>
            <p className="text-blue-100 text-sm leading-relaxed">
              Melalui portal ini, Anda dapat memantau presensi kehadiran siswa, melihat progres latihan, dan melihat rekap keaktifan ekstrakurikuler komputer SDN Pleburan 03.
            </p>
          </div>
        </div>

        {/* Guru Quick Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="font-heading font-bold text-slate-900 text-base">Rekap Kehadiran Siswa</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Pantau siswa kelas 4, 5, dan 6 yang hadir pada tiap sesi pertemuan praktikum.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="font-heading font-bold text-slate-900 text-base">Penilaian & Nilai Tugas</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Lihat hasil pengerjaan latihan mengetik, menggambar, dan dokumen pengolah kata yang dikumpulkan anak.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mb-4">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="font-heading font-bold text-slate-900 text-base">Laporan Semester Sekolah</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Ekspor rekap partisipasi ekstrakurikuler komputer untuk dimasukkan ke dalam rapor SDN Pleburan 03.
            </p>
          </div>
        </div>

        {/* Back Link */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-white px-3.5 py-2 rounded-2xl border border-slate-200 shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Lihat Portal Utama Beranda
          </Link>
        </div>
      </main>
    </div>
  );
}
