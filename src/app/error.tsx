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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-6 md:p-10">
      {/* Top Bar */}
      <div className="max-w-3xl mx-auto w-full flex items-center justify-between mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 bg-white px-3.5 py-1.5 rounded-lg border border-slate-200 shadow-xs transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>Kembali ke Beranda</span>
        </Link>

        <div className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-white px-3.5 py-1.5 rounded-lg border border-slate-200 shadow-xs">
          <Laptop className="w-4 h-4 text-slate-500" />
          <span>SDN Pleburan 03</span>
        </div>
      </div>

      {/* Main Card */}
      <div className="max-w-xl mx-auto w-full my-auto">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-200">
          <div className="p-6 sm:p-10 text-center">
            {/* Status Code Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md text-xs font-mono font-medium mb-5 bg-rose-50 text-rose-700 border border-rose-200">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              <span>HTTP 500 • INTERNAL ERROR</span>
            </div>

            {/* Icon */}
            <div className="inline-block mb-4">
              <div className="w-12 h-12 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-600">
                <AlertCircle className="w-6 h-6" />
              </div>
            </div>

            {/* Title & Subtitle */}
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mb-2">
              Terjadi Kendala Sistem
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mb-5 max-w-sm mx-auto">
              Data dan presensi siswa kamu tetap tersimpan dengan aman di database.
            </p>

            {/* Friendly Explanation Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-left mb-6 text-xs sm:text-sm text-slate-600 space-y-2 leading-relaxed">
              <p>
                Sistem mendeteksi adanya kendala saat memproses halaman ini. Hal ini biasanya bersifat sementara karena koneksi database atau jaringan lab.
              </p>
              <div className="pt-2 border-t border-slate-200 flex items-center gap-2 text-slate-700 font-medium">
                <span className="text-slate-900 font-semibold">Solusi:</span>
                <span>Klik tombol &quot;Coba Lagi&quot; di bawah untuk memuat ulang halaman secara otomatis.</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 mb-6">
              <button
                type="button"
                onClick={handleRetry}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm shadow-xs transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Coba Lagi Sekarang</span>
              </button>

              <Link
                href="/"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-sm shadow-xs transition-colors cursor-pointer"
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
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Detail Teknis untuk Pembina</span>
                {showTechnicalDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {showTechnicalDetails && (
                <div className="mt-2 p-3 bg-slate-900 text-slate-200 rounded-lg font-mono text-xs overflow-x-auto border border-slate-800 space-y-1">
                  <div>
                    <span className="text-rose-400 font-semibold">Pesan Error:</span> {error?.message || 'Unknown error occurred'}
                  </div>
                  {error?.digest && (
                    <div>
                      <span className="text-slate-400 font-semibold">Error Digest ID:</span> {error.digest}
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
      <div className="text-center text-xs text-slate-400 mt-4">
        Jika kendala belum teratasi, hubungi Pembina Lab Komputer: Muhammad Fajri Setyawan
      </div>
    </div>
  );
}
