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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-6 md:p-8 pb-24 sm:pb-8 overflow-x-hidden">
      {/* Top Header */}
      <div className="max-w-5xl mx-auto w-full flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-700 hover:text-slate-900 bg-white px-3.5 py-1.5 rounded-lg border border-slate-200 shadow-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" aria-hidden="true" />
          <span>Kembali ke Beranda</span>
        </Link>

        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>SDN Pleburan 03</span>
        </div>
      </div>

      {/* Main Login Card Area */}
      <div className="flex flex-col items-center justify-center my-6">
        {/* Brand Icon & Heading */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg overflow-hidden bg-white border border-slate-200 shadow-xs mb-3">
            <img src="/logo.jpg" alt="Logo computer.pletig" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center justify-center gap-2">
            computer<span className="text-indigo-600">.pletig</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-normal mt-1">
            Ekstrakurikuler Komputer & Literasi Digital Siswa
          </p>
        </div>

        {/* Suspense Boundary for Client Component using useSearchParams */}
        <Suspense
          fallback={
            <div className="w-full max-w-md bg-white rounded-xl p-8 border border-slate-200 shadow-xs text-center text-slate-500">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
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
