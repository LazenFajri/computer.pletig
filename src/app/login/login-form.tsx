'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginAction } from '@/app/actions/auth-actions';
import {
  Lock,
  User,
  ShieldCheck,
  Eye,
  EyeOff,
  ArrowRight,
  LogIn,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export default function LoginForm() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await loginAction(username, password);

      if (!res.success) {
        setErrorMsg(res.error || 'Login gagal, periksa kembali input Anda.');
        setLoading(false);
        return;
      }

      setSuccessMsg(res.message || 'Login berhasil! Sedang dialihkan...');

      setTimeout(() => {
        router.push(res.redirectUrl || '/admin/dashboard');
        router.refresh();
      }, 500);
    } catch {
      setErrorMsg('Terjadi kendala jaringan. Silakan coba lagi.');
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-xl p-6 sm:p-8 shadow-xs border border-slate-200 relative">
      {/* Icon & Title Header */}
      <div className="mb-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-slate-100 text-slate-800 mb-3 border border-slate-200">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Login Pembina
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Masuk ke panel kontrol administrasi ekstrakurikuler komputer SDN Pleburan 03.
        </p>
      </div>

      {/* Alert Error / Success */}
      {errorMsg && (
        <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div>{errorMsg}</div>
        </div>
      )}

      {successMsg && (
        <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="font-medium">{successMsg}</div>
        </div>
      )}

      {/* Form Input */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Username */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 ml-0.5">
            Username Pembina
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <User className="w-4 h-4" />
            </div>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="pembina.pletig"
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-sm transition-colors"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 ml-0.5">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-sm transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Tombol Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-lg font-medium text-sm text-white bg-slate-900 hover:bg-slate-800 shadow-xs transition-colors flex items-center justify-center gap-2 mt-2 disabled:opacity-60 cursor-pointer"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              Memverifikasi...
            </span>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              <span>Masuk Dashboard Admin</span>
            </>
          )}
        </button>
      </form>

      {/* Info Bebas Login */}
      <div className="mt-6 pt-5 border-t border-slate-100">
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 leading-relaxed">
          <span className="font-semibold text-slate-900">Catatan:</span> Siswa dan Guru tidak perlu login. Presensi kehadiran dan materi pembelajaran dapat diakses langsung secara bebas.
        </div>
      </div>
    </div>
  );
}
