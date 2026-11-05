'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
  retry,
}: {
  error: Error & { digest?: string };
  reset?: () => void;
  retry?: () => void;
}) {
  useEffect(() => {
    console.error('Critical root error:', error);
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
    <html lang="id">
      <body className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-800">
        <div className="max-w-md w-full bg-white rounded-xl p-6 sm:p-8 shadow-sm border border-slate-200 text-center">
          <div className="w-12 h-12 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>

          <div className="inline-block px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-slate-100 text-slate-700 mb-3 border border-slate-200">
            HTTP 500 • ROOT SYSTEM ERROR
          </div>

          <h2 className="text-xl font-bold tracking-tight text-slate-900 mb-2">
            Terjadi Gangguan pada Sistem
          </h2>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            Portal Ekstrakurikuler Komputer SDN Pleburan 03 mengalami kendala saat memuat halaman utama. Silakan muat ulang.
          </p>

          <button
            type="button"
            onClick={handleRetry}
            className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Muat Ulang Halaman</span>
          </button>
        </div>
      </body>
    </html>
  );
}
