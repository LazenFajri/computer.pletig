import Link from 'next/link';
import { Wrench, Laptop, ShieldCheck, RefreshCw, LogIn } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pemeliharaan Sistem (Maintenance) - computer.pletig SDN Pleburan 03',
  description: 'Portal Ekstrakurikuler Komputer SDN Pleburan 03 sedang dalam proses peningkatan dan pemeliharaan sistem.',
};

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-6 md:p-10">
      {/* Top Bar */}
      <div className="max-w-3xl mx-auto w-full flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            <Laptop className="w-4 h-4" />
          </span>
          <span className="font-semibold text-slate-900 text-sm sm:text-base">
            computer.pletig
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          <span>Mode Pemeliharaan</span>
        </div>
      </div>

      {/* Main Card */}
      <div className="max-w-xl mx-auto w-full my-auto">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-200">
          <div className="p-6 sm:p-10 text-center">
            {/* Status Code Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md text-xs font-mono font-medium mb-5 bg-slate-100 text-slate-700 border border-slate-200">
              <Wrench className="w-3.5 h-3.5 text-slate-500" />
              <span>HTTP 503 • SERVICE UNAVAILABLE</span>
            </div>

            {/* Icon */}
            <div className="inline-block mb-4">
              <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-700">
                <Wrench className="w-6 h-6" />
              </div>
            </div>

            {/* Title & Subtitle */}
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mb-2">
              Sistem Sedang Dalam Pemeliharaan
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mb-5 max-w-sm mx-auto">
              Portal Ekstrakurikuler Komputer SDN Pleburan 03 Semarang
            </p>

            {/* Explanation Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-left mb-6 space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <p className="flex items-start gap-2">
                <Laptop className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <span>
                  Halo siswa-siswi! Kami sedang melakukan pembaruan rutin pada database dan sistem agar praktikum berjalan jauh lebih cepat, hemat, dan stabil.
                </span>
              </p>
              <div className="pt-2 border-t border-slate-200 flex items-start gap-2 text-slate-700 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Seluruh data akun dan riwayat presensi kamu tetap aman 100%.</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <Link
                href="/"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm shadow-xs transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Cek Lagi Status Portal</span>
              </Link>

              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs sm:text-sm shadow-xs transition-colors cursor-pointer"
                title="Khusus Pembina / Guru Lab Komputer"
              >
                <LogIn className="w-3.5 h-3.5 text-slate-500" />
                <span>Login Pembina Lab</span>
              </Link>
            </div>
          </div>

          {/* Footer note */}
          <div className="bg-slate-50 border-t border-slate-100 px-6 py-3.5 text-center text-xs text-slate-400">
            Portal Resmi Ekstrakurikuler Komputer • SDN Pleburan 03 Semarang
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-center text-xs text-slate-400 mt-4">
        Pembina Ekstrakurikuler Komputer: Muhammad Fajri Setyawan
      </div>
    </div>
  );
}
