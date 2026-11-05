import Link from 'next/link';
import { getHttpErrorInfo } from '@/lib/http-errors';
import { AlertCircle, AlertTriangle, ArrowLeft, Home, Laptop, RefreshCw, ShieldAlert, Wrench, BookOpen, Clock } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Status Sistem - computer.pletig SDN Pleburan 03',
  description: 'Halaman status dan penanganan kendala portal ekstrakurikuler komputer SDN Pleburan 03.',
};

export default async function SafeErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; message?: string }>;
}) {
  const resolvedParams = await searchParams;
  const statusParam = resolvedParams.status;
  const customMessage = resolvedParams.message;
  const info = getHttpErrorInfo(statusParam);

  // Dynamic Icon based on status
  const getIcon = () => {
    switch (info.code) {
      case 403:
      case 401:
        return <ShieldAlert className="w-6 h-6 text-slate-700" />;
      case 404:
        return <AlertTriangle className="w-6 h-6 text-amber-600" />;
      case 503:
        return <Wrench className="w-6 h-6 text-slate-700" />;
      default:
        return <AlertCircle className="w-6 h-6 text-rose-600" />;
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
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Beranda</span>
        </Link>

        <div className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-white px-3.5 py-1.5 rounded-lg border border-slate-200 shadow-xs">
          <Laptop className="w-4 h-4 text-slate-500" />
          <span className="hidden sm:inline">SDN Pleburan 03 Semarang</span>
          <span className="sm:hidden">SDN Pleburan 03</span>
        </div>
      </div>

      {/* Main Card */}
      <div className="max-w-xl mx-auto w-full my-auto">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-200">
          <div className="p-6 sm:p-10 text-center">
            {/* Status Code Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md text-xs font-mono font-medium mb-5 bg-slate-100 text-slate-700 border border-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
              <span>{info.badge}</span>
            </div>

            {/* Icon */}
            <div className="inline-block mb-4">
              <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto">
                {getIcon()}
              </div>
            </div>

            {/* Title & Subtitle */}
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mb-2">
              {info.title}
            </h1>
            <p className="text-xs sm:text-sm font-medium text-slate-600 mb-4 max-w-sm mx-auto">
              {info.subtitle}
            </p>

            {/* Friendly Description Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-left mb-6 space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <p>
                {customMessage || info.description}
              </p>
              <div className="pt-2 border-t border-slate-200 flex items-start gap-2 text-slate-700">
                <span className="text-slate-900 font-semibold shrink-0">Saran:</span>
                <span>{info.suggestion}</span>
              </div>
            </div>

            {/* Quick Navigation / Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <Link
                href="/"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm shadow-xs transition-colors cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Halaman Utama</span>
              </Link>

              <Link
                href="/absen"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-sm shadow-xs transition-colors cursor-pointer"
              >
                <Clock className="w-4 h-4 text-slate-500" />
                <span>Presensi Siswa</span>
              </Link>

              <Link
                href="/tugas"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-sm shadow-xs transition-colors cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-slate-500" />
                <span>Tugas Praktikum</span>
              </Link>
            </div>
          </div>

          {/* Footer note */}
          <div className="bg-slate-50 border-t border-slate-100 px-6 py-3.5 text-center text-xs text-slate-400">
            Portal Ekstrakurikuler Komputer • SDN Pleburan 03 Semarang
          </div>
        </div>
      </div>

      {/* Bottom spacer */}
      <div className="text-center text-xs text-slate-400 mt-4">
        Jika kendala berlanjut, hubungi Pembina Lab Komputer: Muhammad Fajri Setyawan
      </div>
    </div>
  );
}
