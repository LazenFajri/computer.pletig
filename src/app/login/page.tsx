import { Suspense } from 'react';
import Link from 'next/link';
import LoginForm from './login-form';
import { Laptop, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Login Pembina - computer.pletig SDN Pleburan 03',
  description: 'Masuk ke panel administrasi Pembina Ekstrakurikuler Komputer SDN Pleburan 03 Semarang.',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-playful-grid flex flex-col justify-between p-4 sm:p-6 md:p-8 pb-24 sm:pb-8 overflow-x-hidden">
      {/* Top Header */}
      <div className="max-w-5xl mx-auto w-full flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-blue-600 bg-white/80 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-200 shadow-sm transition-all hover:-translate-x-0.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Beranda
        </Link>

        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          SDN Pleburan 03
        </div>
      </div>

      {/* Main Login Card Area */}
      <div className="flex flex-col items-center justify-center my-6">
        {/* Brand Icon & Heading */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl overflow-hidden bg-white border border-slate-200 shadow-lg shadow-blue-500/20 mb-3">
            <img src="/logo.jpg" alt="Logo computer.pletig" className="w-full h-full object-cover" />
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-slate-900 flex items-center justify-center gap-2">
            computer<span className="text-blue-600">.pletig</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Ekstrakurikuler Komputer & Literasi Digital Siswa
          </p>
        </div>

        {/* Suspense Boundary for Client Component using useSearchParams */}
        <Suspense
          fallback={
            <div className="w-full max-w-lg bg-white rounded-3xl p-8 border border-slate-200 shadow-lg text-center text-slate-500">
              <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              Memuat formulir login...
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-400 pb-2">
        © 2026 SDN Pleburan 03 Semarang • Portal Ekstrakurikuler Komputer
      </div>
    </div>
  );
}
