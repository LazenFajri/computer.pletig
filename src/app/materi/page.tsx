import Link from 'next/link';
import { getMaterialsAction } from '@/app/actions/material-actions';
import { getCurrentUser } from '@/lib/session';
import MateriClient from './materi-client';
import { BookOpen, Laptop, ArrowLeft, CalendarCheck, FileText } from 'lucide-react';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Materi Pembelajaran Komputer - computer.pletig SDN Pleburan 03',
  description: 'Modul praktikum, tutorial mengetik 10 jari, trik shortcut, dan panduan belajar komputer siswa SDN Pleburan 03 Semarang.',
};

export default async function MateriPage() {
  let currentUser = null;
  let allMaterials: any[] = [];

  try {
    const [user, materials] = await Promise.all([
      getCurrentUser(),
      getMaterialsAction(),
    ]);
    currentUser = user;
    allMaterials = materials;
  } catch (err) {
    console.warn('Warning: Could not fetch materials during render:', err);
  }

  return (
    <div className="min-h-screen bg-playful-grid flex flex-col justify-between pb-24 sm:pb-0 overflow-x-hidden">
      {/* Top Navbar */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link
              href="/"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-md shadow-purple-600/10 flex items-center justify-center shrink-0"
            >
              <img src="/logo.jpg" alt="Logo computer.pletig" className="w-full h-full object-cover" />
            </Link>
            <div>
              <Link href="/" className="font-heading text-base sm:text-lg font-bold text-slate-900 block">
                computer<span className="text-purple-600">.pletig</span>
              </Link>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                Materi Belajar • SDN Pleburan 03
              </p>
            </div>
          </div>

          {/* Desktop Right Links (Disembunyikan di Ponsel karena sudah ada Bottom Navigation) */}
          <div className="hidden sm:flex items-center gap-2">
            <Link
              href="/absen"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-heading font-bold px-3.5 py-2 rounded-2xl shadow-xs transition-all flex items-center gap-1.5"
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>Presensi Siswa</span>
            </Link>

            <Link
              href="/tugas"
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-heading font-bold px-3.5 py-2 rounded-2xl shadow-xs transition-all flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Tugas Siswa</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 flex-1">
        {/* Banner Ceria */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-blue-600/15 mb-8 relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full text-xs font-semibold mb-3">
              <BookOpen className="w-3.5 h-3.5 text-blue-200" />
              Perpustakaan Digital Siswa
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold mb-2 flex items-center gap-2">
              <span>Materi Belajar Komputer</span>
              <BookOpen className="w-7 h-7 text-yellow-300" />
            </h1>
            <p className="text-blue-100 text-xs sm:text-sm leading-relaxed">
              Temukan tutorial mengetik 10 jari, modul panduan Word, trik shortcut keyboard, dan bahan praktikum seru untuk kelas 4, 5, dan 6.
            </p>
          </div>
        </div>

        {/* Client Interactive Filter & Material Cards */}
        <MateriClient initialMaterials={allMaterials} />
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 py-6 border-t border-slate-200/60 max-w-6xl mx-auto w-full px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span>SDN Pleburan 03 Semarang</span>
        </div>
        <div className="flex items-center gap-3 text-slate-400">
          <span>Portal computer.pletig • SDN Pleburan 03</span>
        </div>
      </footer>
    </div>
  );
}
