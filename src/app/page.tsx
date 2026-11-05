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
  Clock,
  ArrowRight,
  CheckCircle2,
  FileText,
  Calendar,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let currentUser = null;
  let allMeetings: any[] = [];

  try {
    const [user, dbMeetings] = await Promise.all([
      getCurrentUser(),
      db.query.meetings.findMany({
        orderBy: [desc(meetings.date), desc(meetings.meeting_number)],
      }),
    ]);
    currentUser = user;
    allMeetings = dbMeetings;
  } catch (err) {
    console.warn('Warning: Could not fetch meetings during render:', err);
  }

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
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24 sm:pb-0 overflow-x-hidden">
      {/* Top Notification / School Bar */}
      <div className="bg-slate-900 text-slate-200 text-xs font-medium py-2 px-4 border-b border-slate-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 truncate">
            <span className="inline-flex items-center justify-center bg-slate-800 text-slate-200 rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider shrink-0 border border-slate-700">
              SDN Pleburan 03
            </span>
            <span className="hidden sm:inline text-slate-400 text-xs truncate">
              Laboratorium Komputer & Literasi Digital
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-300 text-xs shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="hidden sm:inline text-slate-400">Jam Absen:</span>
            <span className="font-semibold text-white">12:30 - 14:00 WIB</span>
          </div>
        </div>
      </div>

      {/* Main Header / Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-white border border-slate-200 shrink-0 flex items-center justify-center">
              <img src="/logo.jpg" alt="Logo computer.pletig" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 leading-tight">
                computer<span className="text-indigo-600">.pletig</span>
              </h1>
              <p className="text-[11px] text-slate-500 font-normal">
                Portal Ekstrakurikuler Komputer
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden sm:flex items-center gap-2.5">
            <Link
              href="/absen"
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-medium px-4 py-2 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <CalendarCheck className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              <span>Presensi</span>
            </Link>

            <Link
              href="/tugas"
              className="text-slate-700 hover:text-slate-900 hover:bg-slate-100 text-xs sm:text-sm font-medium px-3.5 py-2 rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4 text-slate-500" aria-hidden="true" />
              <span>Tugas</span>
            </Link>

            {currentUser && (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <Link
                  href="/admin/dashboard"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium px-3.5 py-2 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                  <span>Dashboard Pembina</span>
                </Link>
                <LogoutButton variant="pill" />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-6 sm:pt-8 pb-4 sm:pb-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-slate-900 rounded-xl p-6 sm:p-10 text-white border border-slate-800 shadow-sm relative overflow-hidden">
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-full text-xs font-medium text-slate-300 mb-4 border border-slate-700">
                <Laptop className="w-4 h-4 text-indigo-400" aria-hidden="true" />
                <span>SDN Pleburan 03 Semarang</span>
              </div>

              <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-3 text-white">
                Belajar Komputer Jadi Terarah dan Terstruktur
              </h2>

              <p className="text-slate-300 text-xs sm:text-sm mb-6 leading-relaxed">
                Platform kegiatan praktikum komputer SDN Pleburan 03. Siswa dapat melakukan presensi mandiri berbasis kelas dan rombel secara teratur.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-row items-center gap-3">
                <Link
                  href="/absen"
                  className="bg-white text-slate-900 hover:bg-slate-100 font-medium text-xs sm:text-sm px-5 py-2.5 rounded-lg shadow-xs transition-colors flex items-center gap-2"
                >
                  <CalendarCheck className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                  <span>Buka Presensi</span>
                  <ArrowRight className="w-4 h-4 text-slate-500" aria-hidden="true" />
                </Link>

                <Link
                  href="#jadwal"
                  className="bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs sm:text-sm px-4 py-2.5 rounded-lg border border-slate-700 transition-colors flex items-center gap-2"
                >
                  <Clock className="w-4 h-4 text-slate-400" aria-hidden="true" />
                  <span>Lihat Jadwal</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* QUICK ACTION APP GRID */}
      <section className="py-2 sm:py-4 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {/* Action 1: Presensi */}
            <Link
              href="/absen"
              className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors flex flex-col sm:flex-row sm:items-center gap-3.5 text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
                <CalendarCheck className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-900 leading-tight">
                  Presensi Siswa
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-tight">
                  Pencatatan kehadiran praktikum
                </p>
              </div>
            </Link>

            {/* Action 2: Tugas */}
            <Link
              href="/tugas"
              className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors flex flex-col sm:flex-row sm:items-center gap-3.5 text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-900 leading-tight">
                  Tugas Praktikum
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-tight">
                  Pengumpulan latihan komputer
                </p>
              </div>
            </Link>

            {/* Action 3: Jadwal */}
            <a
              href="#jadwal"
              className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors flex flex-col sm:flex-row sm:items-center gap-3.5 text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-900 leading-tight">
                  Jadwal Praktikum
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-tight">
                  Senin, Selasa, dan Kamis
                </p>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* Jadwal Mingguan Ekstrakurikuler */}
      <section id="jadwal" className="py-6 sm:py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-6">
            <span className="text-xs font-medium text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
              Jadwal Praktikum Lab
            </span>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-2">
              Jadwal Kelas 4, 5, dan 6
            </h3>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              Presensi otomatis dibuka pukul 12:30 s.d 14:00 WIB (Sesi 1: 12:30-13:20 • Sesi 2: 13:20-14:00).
            </p>
          </div>

          <HomeScheduleTabs initialMeetings={serializedMeetings} />
        </div>
      </section>

      {/* 3 Keunggulan Platform */}
      <section className="py-6 sm:py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-xl p-6 sm:p-8 border border-slate-200 shadow-xs">
            <div className="text-center max-w-xl mx-auto mb-6">
              <h3 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                Terstruktur, Cepat, dan Akuntabel
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Dirancang khusus untuk mendukung operasional laboratorium komputer SDN Pleburan 03 Semarang.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              <div className="p-4 sm:p-5 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-3 sm:block">
                <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 text-emerald-600 flex items-center justify-center shrink-0 sm:mb-3 shadow-xs">
                  <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-slate-900">
                    Presensi Mandiri Cepat
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Siswa memilih kelas dan namanya, presensi tercatat otomatis tanpa membebani siswa dengan kata sandi.
                  </p>
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-3 sm:block">
                <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 text-amber-600 flex items-center justify-center shrink-0 sm:mb-3 shadow-xs">
                  <FileText className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-slate-900">
                    Penugasan Praktikum
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Pengumpulan hasil latihan mengetik, format dokumen, grafis digital, dan modul latihan.
                  </p>
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-3 sm:block">
                <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 text-indigo-600 flex items-center justify-center shrink-0 sm:mb-3 shadow-xs">
                  <ShieldCheck className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-slate-900">
                    Kendali Pembina Terpadu
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Pembina mengelola sesi, memantau matriks centang kehadiran, serta mengunduh rekapitulasi data.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-white border-t border-slate-200 py-6 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 text-xs text-slate-500 text-center sm:text-left">
          <div className="flex items-center gap-2 justify-center">
            <span className="font-semibold text-slate-800 text-xs sm:text-sm">
              computer.pletig
            </span>
            <span>•</span>
            <span>SDN Pleburan 03 Semarang</span>
          </div>
          <div className="text-xs text-slate-400">
            Pembina Lab Komputer: Muhammad Fajri Setyawan
          </div>
        </div>
      </footer>
    </div>
  );
}
