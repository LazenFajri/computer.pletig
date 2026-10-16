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

  // Dynamic Icon & Colors based on status
  const getIcon = () => {
    switch (info.code) {
      case 403:
      case 401:
        return <ShieldAlert className="w-12 h-12 text-purple-600" />;
      case 404:
        return <AlertTriangle className="w-12 h-12 text-amber-600" />;
      case 503:
        return <Wrench className="w-12 h-12 text-blue-600" />;
      default:
        return <AlertCircle className="w-12 h-12 text-rose-600" />;
    }
  };

  const getGradientHeader = () => {
    switch (info.colorScheme) {
      case 'amber':
        return 'from-amber-500 to-orange-500 text-amber-700 bg-amber-50 border-amber-200';
      case 'blue':
        return 'from-blue-600 to-indigo-600 text-blue-700 bg-blue-50 border-blue-200';
      case 'purple':
        return 'from-purple-600 to-indigo-600 text-purple-700 bg-purple-50 border-purple-200';
      default:
        return 'from-rose-500 to-red-600 text-rose-700 bg-rose-50 border-rose-200';
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
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Beranda</span>
        </Link>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-white/80 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-slate-200">
          <Laptop className="w-4 h-4 text-teal-600" />
          <span className="hidden sm:inline">SDN Pleburan 03 Semarang</span>
          <span className="sm:hidden">SDN Pleburan 03</span>
        </div>
      </div>

      {/* Main Card */}
      <div className="max-w-2xl mx-auto w-full my-auto">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Top Banner Accent */}
          <div className={`h-3 bg-gradient-to-r ${getGradientHeader()}`} />

          <div className="p-6 sm:p-10 text-center">
            {/* Status Code Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold font-mono tracking-wider mb-5 shadow-xs bg-slate-100 text-slate-700 border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              <span>{info.badge}</span>
            </div>

            {/* Big Status Number & Friendly Icon */}
            <div className="relative inline-block mb-6">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto shadow-inner">
                {getIcon()}
              </div>
              <span className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-xl bg-slate-900 text-white font-mono text-xs font-bold shadow-md">
                {info.code}
              </span>
            </div>

            {/* Title & Subtitle */}
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
              {info.title}
            </h1>
            <p className="text-sm sm:text-base font-semibold text-slate-700 mb-4">
              {info.subtitle}
            </p>

            {/* Friendly Description Card */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 text-left mb-6 space-y-2.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <p>
                {customMessage || info.description}
              </p>
              <div className="pt-2 border-t border-slate-200 flex items-start gap-2 text-slate-700">
                <span className="text-teal-600 font-bold shrink-0">Saran:</span>
                <span>{info.suggestion}</span>
              </div>
            </div>

            {/* Quick Navigation / Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-heading font-bold text-sm shadow-md shadow-blue-500/20 transition-all cursor-pointer hover:-translate-y-0.5"
              >
                <Home className="w-4 h-4" />
                <span>Kembali ke Halaman Utama</span>
              </Link>

              <Link
                href="/absen"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-heading font-bold text-sm transition-all cursor-pointer"
              >
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>Buka Presensi Siswa</span>
              </Link>

              <Link
                href="/materi"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-heading font-bold text-sm transition-all cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-purple-600" />
                <span>Materi Belajar</span>
              </Link>
            </div>
          </div>

          {/* Footer note */}
          <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 text-center text-xs text-slate-400">
            Portal Ekstrakurikuler Komputer • SDN Pleburan 03 Semarang
          </div>
        </div>
      </div>

      {/* Bottom spacer */}
      <div className="text-center text-[11px] text-slate-400 mt-4">
        Jika kendala berlanjut, hubungi Pembina Lab Komputer: Muhammad Fajri Setyawan
      </div>
    </div>
  );
}
