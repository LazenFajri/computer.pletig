import Link from 'next/link';
import { HelpCircle, Home, Clock, BookOpen, FileCheck, ArrowLeft, Laptop } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '404 - Halaman Tidak Ditemukan | computer.pletig',
  description: 'Halaman yang kamu cari tidak ditemukan di portal Ekstrakurikuler Komputer SDN Pleburan 03.',
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-playful-grid flex flex-col justify-between p-4 sm:p-6 md:p-10">
      {/* Top Bar */}
      <div className="max-w-3xl mx-auto w-full flex items-center justify-between mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-blue-600 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-200 shadow-xs transition-all hover:-translate-x-0.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Beranda</span>
        </Link>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-white/80 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-slate-200">
          <Laptop className="w-4 h-4 text-teal-600" />
          <span>SDN Pleburan 03</span>
        </div>
      </div>

      {/* Main 404 Card */}
      <div className="max-w-2xl mx-auto w-full my-auto">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header Accent */}
          <div className="h-3 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />

          <div className="p-6 sm:p-10 text-center">
            {/* Status Code Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold font-mono tracking-wider mb-5 shadow-xs bg-amber-50 text-amber-800 border border-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span>HTTP 404 • NOT FOUND</span>
            </div>

            {/* Playful Number & Icon */}
            <div className="relative inline-block mb-6">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto shadow-inner text-amber-600">
                <HelpCircle className="w-12 h-12 text-amber-600" />
              </div>
              <span className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-xl bg-slate-900 text-white font-mono text-xs font-bold shadow-md">
                404
              </span>
            </div>

            {/* Title & Subtitle */}
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
              Halaman Tidak Ditemukan
            </h1>
            <p className="text-sm sm:text-base font-semibold text-slate-600 mb-5">
              Sepertinya alamat web yang kamu buka keliru atau belum dibuat oleh Pembina.
            </p>

            {/* Helpful Quick Links Box */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 text-left mb-6">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-3">
                Mau pergi ke mana sekarang?
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <Link
                  href="/absen"
                  className="p-3 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all flex items-center gap-2.5 text-xs font-bold text-slate-800 shadow-xs"
                >
                  <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Presensi Siswa</span>
                </Link>

                <Link
                  href="/materi"
                  className="p-3 rounded-xl bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 transition-all flex items-center gap-2.5 text-xs font-bold text-slate-800 shadow-xs"
                >
                  <BookOpen className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>Materi Belajar</span>
                </Link>

                <Link
                  href="/tugas"
                  className="p-3 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all flex items-center gap-2.5 text-xs font-bold text-slate-800 shadow-xs"
                >
                  <FileCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Tugas Praktikum</span>
                </Link>
              </div>
            </div>

            {/* Primary Action Button */}
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-heading font-bold text-sm shadow-md shadow-blue-500/20 transition-all cursor-pointer hover:-translate-y-0.5"
            >
              <Home className="w-4 h-4" />
              <span>Kembali ke Beranda Utama</span>
            </Link>
          </div>

          {/* Footer note */}
          <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 text-center text-xs text-slate-400">
            Portal Ekstrakurikuler Komputer • SDN Pleburan 03 Semarang
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-center text-[11px] text-slate-400 mt-4">
        Jika ada link yang rusak, hubungi Pembina Lab Komputer: Muhammad Fajri Setyawan
      </div>
    </div>
  );
}
