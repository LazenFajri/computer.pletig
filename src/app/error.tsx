'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, Home, ShieldAlert, ChevronDown, ChevronUp, Laptop } from 'lucide-react';

export default function GlobalRouteError({
  error,
  reset,
  retry,
}: {
  error: Error & { digest?: string };
  reset?: () => void;
  retry?: () => void;
}) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  useEffect(() => {
    // Log runtime error safely to console
    console.error('Unhandled app error:', error);
  }, [error]);

  const handleRetry = () => {
    if (typeof retry === 'function') {
      retry();
    } else if (typeof reset === 'function') {
      reset();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-playful-grid flex flex-col justify-between p-4 sm:p-6 md:p-10">
      {/* Top Bar */}
      <div className="max-w-3xl mx-auto w-full flex items-center justify-between mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-blue-600 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-200 shadow-xs transition-all hover:-translate-x-0.5"
        >
          <Home className="w-4 h-4" />
          <span>Kembali ke Beranda</span>
        </Link>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-white/80 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-slate-200">
          <Laptop className="w-4 h-4 text-teal-600" />
          <span>SDN Pleburan 03</span>
        </div>
      </div>

      {/* Main Card */}
      <div className="max-w-2xl mx-auto w-full my-auto">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header Accent */}
          <div className="h-3 bg-gradient-to-r from-rose-500 via-red-500 to-amber-500" />

          <div className="p-6 sm:p-10 text-center">
            {/* Status Code Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold font-mono tracking-wider mb-5 shadow-xs bg-rose-50 text-rose-800 border border-rose-200">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              <span>HTTP 500 • INTERNAL ERROR / SISTEM KENDALA</span>
            </div>

            {/* Playful Number & Icon */}
            <div className="relative inline-block mb-6">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto shadow-inner text-rose-600">
                <AlertCircle className="w-12 h-12 text-rose-600" />
              </div>
              <span className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-xl bg-slate-900 text-white font-mono text-xs font-bold shadow-md">
                500
              </span>
            </div>

            {/* Title & Subtitle */}
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
              Terjadi Kendala Sistem
            </h1>
            <p className="text-sm sm:text-base font-semibold text-slate-600 mb-5">
              Jangan panik, data dan presensi siswa kamu tetap tersimpan aman di database.
            </p>

            {/* Friendly Explanation Card */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 text-left mb-6 text-xs sm:text-sm text-slate-600 space-y-2 leading-relaxed">
              <p>
                Sistem mendeteksi adanya kendala saat memproses halaman ini. Hal ini biasanya bersifat sementara karena koneksi database atau jaringan lab.
              </p>
              <div className="pt-2 border-t border-slate-200 flex items-center gap-2 text-slate-700 font-medium">
                <span className="text-teal-600 font-bold">Solusi:</span>
                <span>Klik tombol &quot;Coba Lagi&quot; di bawah untuk memuat ulang halaman secara otomatis.</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
              <button
                type="button"
                onClick={handleRetry}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-heading font-bold text-sm shadow-md shadow-rose-500/20 transition-all cursor-pointer hover:-translate-y-0.5"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Coba Lagi Sekarang</span>
              </button>

              <Link
                href="/"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-heading font-bold text-sm transition-all cursor-pointer"
              >
                <Home className="w-4 h-4 text-slate-500" />
                <span>Kembali ke Beranda</span>
              </Link>
            </div>

            {/* Technical Detail Toggle for Admin / Pembina */}
            <div className="border-t border-slate-100 pt-4 text-left">
              <button
                type="button"
                onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Detail Teknis untuk Pembina</span>
                {showTechnicalDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {showTechnicalDetails && (
                <div className="mt-2 p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] overflow-x-auto border border-slate-800 space-y-1">
                  <div>
                    <span className="text-rose-400 font-bold">Pesan Error:</span> {error?.message || 'Unknown error occurred'}
                  </div>
                  {error?.digest && (
                    <div>
                      <span className="text-teal-400 font-bold">Error Digest ID:</span> {error.digest}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer note */}
          <div className="bg-slate-50 border-t border-slate-100 px-6 py-3.5 text-center text-xs text-slate-400">
            Portal Ekstrakurikuler Komputer • SDN Pleburan 03 Semarang
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-center text-[11px] text-slate-400 mt-4">
        Jika kendala belum teratasi, hubungi Pembina Lab Komputer: Muhammad Fajri Setyawan
      </div>
    </div>
  );
}
