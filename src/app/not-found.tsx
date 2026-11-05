import Link from 'next/link';
import { HelpCircle, Home, Clock, BookOpen, FileCheck, ArrowLeft, Laptop } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '404 - Halaman Tidak Ditemukan | computer.pletig',
  description: 'Halaman yang kamu cari tidak ditemukan di portal Ekstrakurikuler Komputer SDN Pleburan 03.',
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-6 md:p-10">
      {/* Top Bar */}
      <div className="max-w-3xl mx-auto w-full flex items-center justify-between mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 bg-white px-3.5 py-1.5 rounded-lg border border-slate-200 shadow-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Beranda</span>
        </Link>

        <div className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-white px-3.5 py-1.5 rounded-lg border border-slate-200 shadow-xs">
          <Laptop className="w-4 h-4 text-slate-500" />
          <span>SDN Pleburan 03</span>
        </div>
      </div>

      {/* Main 404 Card */}
      <div className="max-w-xl mx-auto w-full my-auto">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-200">
          <div className="p-6 sm:p-10 text-center">
            {/* Status Code Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md text-xs font-mono font-medium mb-5 bg-amber-50 text-amber-700 border border-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              <span>HTTP 404 • NOT FOUND</span>
            </div>

            {/* Icon */}
            <div className="inline-block mb-4">
              <div className="w-12 h-12 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-700">
                <HelpCircle className="w-6 h-6" />
              </div>
            </div>

            {/* Title & Subtitle */}
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mb-2">
              Halaman Tidak Ditemukan
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mb-6 max-w-sm mx-auto">
              Sepertinya alamat web yang kamu buka keliru atau belum dibuat oleh Pembina.
            </p>

            {/* Helpful Quick Links Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-left mb-6">
              <span className="text-xs font-semibold text-slate-500 block mb-2.5">
                Navigasi Cepat
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Link
                  href="/absen"
                  className="p-2.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 text-xs font-medium text-slate-800 shadow-xs"
                >
                  <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Presensi Siswa</span>
                </Link>

                <Link
                  href="/tugas"
                  className="p-2.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 text-xs font-medium text-slate-800 shadow-xs"
                >
                  <FileCheck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Tugas Praktikum</span>
                </Link>
              </div>
            </div>

            {/* Primary Action Button */}
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm shadow-xs transition-colors cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>Kembali ke Beranda Utama</span>
            </Link>
          </div>

          {/* Footer note */}
          <div className="bg-slate-50 border-t border-slate-100 px-6 py-3.5 text-center text-xs text-slate-400">
            Portal Ekstrakurikuler Komputer • SDN Pleburan 03 Semarang
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-center text-xs text-slate-400 mt-4">
        Jika ada kendala tautan rusak, hubungi Pembina Lab Komputer: Muhammad Fajri Setyawan
      </div>
    </div>
  );
}
