import Link from 'next/link';
import { db } from '@/db';
import { meetings } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/session';
import LogoutButton from '@/components/logout-button';
import HomeScheduleTabs from '@/components/home-schedule-tabs';
import {
  Laptop,
  CalendarCheck,
  ShieldCheck,
  BookOpen,
  Clock,
  ArrowRight,
  CheckCircle2,
  FileText,
  Calendar,
} from 'lucide-react';

export default async function HomePage() {
  const [currentUser, allMeetings] = await Promise.all([
    getCurrentUser(),
    db.query.meetings.findMany({
      orderBy: [desc(meetings.date), desc(meetings.meeting_number)],
    }),
  ]);

  const serializedMeetings = allMeetings.map((m) => ({
    id: m.id,
    meetingNumber: m.meeting_number,
    gradeLevel: m.grade_level,
    title: m.title,
    description: m.description,
    date: m.date,
    startTime: m.start_time,
    endTime: m.end_time,
    isOpen: Boolean(m.is_open),
    isActive: Boolean(m.is_active),
  }));

  return (
    <div className="min-h-screen bg-playful-grid flex flex-col pb-24 sm:pb-0 overflow-x-hidden">
      {/* Top Notification / School Bar */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 text-white text-xs font-medium py-1.5 sm:py-2 px-3 sm:px-4 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 truncate">
            <span className="inline-flex items-center justify-center bg-white/20 rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider shrink-0">
              SDN Pleburan 03
            </span>
            <span className="hidden sm:inline text-blue-100 text-xs truncate">
              Laboratorium Komputer & Literasi Digital
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-blue-100 text-[11px] sm:text-xs shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="hidden sm:inline">Jam Absen:</span>
            <span className="font-semibold text-white">12.30 - 14.00 WIB</span>
          </div>
        </div>
      </div>

      {/* Main Header / Navigation */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl overflow-hidden bg-white border border-slate-200/80 shadow-md shadow-blue-600/10 shrink-0 flex items-center justify-center">
              <img src="/logo.jpg" alt="Logo computer.pletig" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="font-heading text-lg sm:text-2xl font-bold tracking-tight text-slate-900 leading-tight">
                computer<span className="text-blue-600">.pletig</span>
              </h1>
              <p className="text-[10px] sm:text-xs text-slate-500 font-medium">
                Portal Ekstrakurikuler Komputer
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links (Disembunyikan di Ponsel karena sudah ada Bottom Navigation) */}
          <div className="hidden sm:flex items-center gap-2 sm:gap-3">
            <Link
              href="/absen"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-heading font-bold px-3.5 sm:px-4 py-2 rounded-2xl shadow-sm transition-all flex items-center gap-1.5 hover:-translate-y-0.5"
            >
              <CalendarCheck className="w-4 h-4" />
              <span>Presensi</span>
            </Link>

            <Link
              href="/materi"
              className="text-slate-700 hover:text-purple-600 hover:bg-purple-50 text-xs sm:text-sm font-heading font-bold px-3 py-2 rounded-2xl border border-slate-200 transition-all flex items-center gap-1.5"
            >
              <BookOpen className="w-4 h-4 text-purple-600" />
              <span>Materi</span>
            </Link>

            <Link
              href="/tugas"
              className="text-slate-700 hover:text-amber-600 hover:bg-amber-50 text-xs sm:text-sm font-heading font-bold px-3 py-2 rounded-2xl border border-slate-200 transition-all flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4 text-amber-600" />
              <span>Tugas</span>
            </Link>

            {currentUser && (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <Link
                  href="/admin/dashboard"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-heading font-bold px-3 py-2 rounded-2xl shadow-sm transition-all flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Dashboard Pembina</span>
                </Link>
                <LogoutButton variant="pill" />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section (Dioptimalkan agar tidak memanjang berlebihan di ponsel) */}
      <section className="pt-4 sm:pt-8 pb-3 sm:pb-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-600 rounded-3xl p-5 sm:p-10 text-white shadow-xl shadow-blue-600/15 relative overflow-hidden">
            {/* Background decorative circles */}
            <div className="absolute -right-10 -bottom-10 w-60 sm:w-72 h-60 sm:h-72 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
            <div className="absolute left-1/2 -top-20 w-48 sm:w-60 h-48 sm:h-60 bg-yellow-300/10 rounded-full blur-xl pointer-events-none"></div>

            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-white/15 backdrop-blur-sm px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold text-white mb-3 border border-white/20">
                <Laptop className="w-3.5 h-3.5 text-blue-200" />
                <span>SDN Pleburan 03 Semarang</span>
              </div>

              <h2 className="font-heading text-2xl sm:text-4xl md:text-5xl font-bold leading-tight mb-2 sm:mb-4 text-white">
                Belajar Komputer Jadi Mudah dan Menyenangkan
              </h2>

              <p className="text-blue-100 text-xs sm:text-base mb-4 sm:mb-6 leading-relaxed line-clamp-2 sm:line-clamp-none">
                Platform kegiatan praktikum komputer SDN Pleburan 03. Siswa cukup memilih kelas dan klik namanya untuk presensi tanpa repot password.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-row items-center gap-2.5 sm:gap-3">
                <Link
                  href="/absen"
                  className="flex-1 sm:flex-none justify-center bg-white text-blue-700 hover:bg-blue-50 font-heading font-bold text-xs sm:text-base px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl shadow-lg transition-all flex items-center gap-1.5 sm:gap-2 active:scale-95"
                >
                  <CalendarCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                  <span>Presensi Kehadiran</span>
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
                </Link>

                <Link
                  href="#jadwal"
                  className="flex-none justify-center bg-white/15 hover:bg-white/25 text-white font-heading font-semibold text-xs sm:text-base px-3.5 sm:px-5 py-2.5 sm:py-3 rounded-2xl backdrop-blur-md border border-white/20 transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <Clock className="w-3.5 h-3.5 text-blue-200" />
                  <span>Jadwal</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* QUICK ACTION APP GRID (Khas Aplikasi: Teks Lengkap Tanpa Terpotong Titik-Titik) */}
      <section className="py-2 sm:py-4 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
            {/* Action 1: Presensi */}
            <Link
              href="/absen"
              className="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3.5 active:scale-95 group text-left"
            >
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <CalendarCheck className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <h4 className="font-heading font-bold text-xs sm:text-sm text-slate-900 leading-tight">
                  Presensi Siswa
                </h4>
                <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 leading-tight">
                  Isi kehadiran harian
                </p>
              </div>
            </Link>

            {/* Action 2: Materi */}
            <Link
              href="/materi"
              className="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3.5 active:scale-95 group text-left"
            >
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <h4 className="font-heading font-bold text-xs sm:text-sm text-slate-900 leading-tight">
                  Materi Belajar
                </h4>
                <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 leading-tight">
                  Modul & tutorial
                </p>
              </div>
            </Link>

            {/* Action 3: Tugas */}
            <Link
              href="/tugas"
              className="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3.5 active:scale-95 group text-left"
            >
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <h4 className="font-heading font-bold text-xs sm:text-sm text-slate-900 leading-tight">
                  Tugas Praktikum
                </h4>
                <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 leading-tight">
                  Latihan komputer
                </p>
              </div>
            </Link>

            {/* Action 4: Jadwal */}
            <a
              href="#jadwal"
              className="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3.5 active:scale-95 group text-left"
            >
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <h4 className="font-heading font-bold text-xs sm:text-sm text-slate-900 leading-tight">
                  Jadwal Kelas
                </h4>
                <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 leading-tight">
                  Senin, Selasa, Kamis
                </p>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* Jadwal Mingguan Ekstrakurikuler (Senin: Kelas 6, Selasa: Kelas 5, Kamis: Kelas 4) */}
      <section id="jadwal" className="py-4 sm:py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-4 sm:mb-6">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
              Jadwal Praktikum Lab
            </span>
            <h3 className="font-heading text-lg sm:text-2xl font-bold text-slate-800 mt-1">
              Jadwal Kelas 4, 5, dan 6
            </h3>
            <p className="text-slate-500 text-xs mt-0.5">
              Presensi otomatis dibuka pukul 12.30 s.d 14.00 WIB.
            </p>
          </div>

          {/* Schedule Component (Mobile: Ringkas Tab Switcher, Desktop: 3 Kolom - Dinamis dari Sesi Pembina) */}
          <HomeScheduleTabs initialMeetings={serializedMeetings} />
        </div>
      </section>

      {/* 3 Keunggulan Platform (Ringkas & Efisien di Ponsel) */}
      <section className="py-4 sm:py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-3xl p-5 sm:p-8 border border-slate-200 shadow-xs">
            <div className="text-center max-w-xl mx-auto mb-5 sm:mb-8">
              <h3 className="font-heading text-lg sm:text-2xl font-bold text-slate-900">
                Ramah Anak & Tanpa Beban Akun
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Dirancang khusus agar siswa SD langsung belajar tanpa kebingungan kata sandi.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
              <div className="p-3.5 sm:p-5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3 sm:block">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 sm:mb-3">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h4 className="font-heading font-bold text-xs sm:text-base text-slate-900">
                    Presensi Siswa Cepat
                  </h4>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Tinggal klik kelas dan nama siswa, tombol presensi langsung aktif.
                  </p>
                </div>
              </div>

              <div className="p-3.5 sm:p-5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3 sm:block">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 sm:mb-3">
                  <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h4 className="font-heading font-bold text-xs sm:text-base text-slate-900">
                    Materi Praktik SD
                  </h4>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Panduan mengetik 10 jari dan trik komputer mudah dipahami.
                  </p>
                </div>
              </div>

              <div className="p-3.5 sm:p-5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3 sm:block">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 sm:mb-3">
                  <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h4 className="font-heading font-bold text-xs sm:text-base text-slate-900">
                    Kendali Guru Fleksibel
                  </h4>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Pembina bisa mengaktifkan sesi tambahan kapan saja sesuai kebutuhan.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-white border-t border-slate-200 py-4 sm:py-6 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 text-xs text-slate-500 text-center sm:text-left">
          <div className="flex items-center gap-2 justify-center">
            <span className="font-heading font-bold text-slate-700 text-xs sm:text-sm">
              computer.pletig
            </span>
            <span>•</span>
            <span>SDN Pleburan 03 Semarang</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Pembina Lab Komputer: Muhammad Fajri Setyawan
          </div>
        </div>
      </footer>
    </div>
  );
}
