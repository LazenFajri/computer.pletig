'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Laptop,
  User,
  Users,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Info,
} from 'lucide-react';

interface LaptopModeClientProps {
  grade: number;
  rombel: string;
  meetingId?: string | null;
  meetingTitle?: string | null;
}

export default function LaptopModeClient({
  grade,
  rombel,
  meetingId,
  meetingTitle,
}: LaptopModeClientProps) {
  const router = useRouter();
  const [selectedCapacity, setSelectedCapacity] = useState<1 | 2 | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Baca preferensi sebelumnya jika sudah pernah memilih di sesi ini
  useEffect(() => {
    try {
      const saved = meetingId
        ? localStorage.getItem(`pletig_laptop_capacity_${meetingId}`)
        : localStorage.getItem('pletig_laptop_capacity');
      if (saved === '1' || saved === '2') {
        setSelectedCapacity(Number(saved) as 1 | 2);
      }
    } catch {
      // non-blocking
    }
  }, [meetingId]);

  const handleSelectMode = (capacity: 1 | 2) => {
    setSelectedCapacity(capacity);
    setIsSaving(true);

    try {
      localStorage.setItem('pletig_laptop_capacity', String(capacity));
      if (meetingId) {
        localStorage.setItem(`pletig_laptop_capacity_${meetingId}`, String(capacity));
      }
      // Simpan cookie agar server action langsung mengenali kapasitas device
      const cKey = meetingId ? `pletig_dev_cap_${meetingId}` : 'pletig_dev_cap_active';
      document.cookie = `${cKey}=${capacity}; max-age=${60 * 60 * 12}; path=/; SameSite=Lax`;
    } catch {
      // non-blocking
    }

    // Arahkan ke halaman presensi rombel dengan query param mode
    setTimeout(() => {
      router.push(`/absen/kelas/${grade}/${rombel}?mode=${capacity}`);
    }, 150);
  };

  return (
    <div className="min-h-screen bg-playful-grid flex flex-col justify-between p-3 sm:p-6 md:p-8 pb-24 sm:pb-8 overflow-x-hidden">
      {/* Top Navbar */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between mb-4 sm:mb-6">
        <Link
          href={`/absen/kelas/${grade}`}
          className="inline-flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-blue-600 bg-white/90 backdrop-blur-md px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl border border-slate-200 shadow-xs transition-all hover:-translate-x-0.5 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Ganti Rombel</span>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-semibold text-slate-600 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-200">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          <span>Rombel {rombel} • Kelas {grade} SD</span>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto w-full flex-1 flex flex-col justify-center my-auto py-4">
        {/* Header Title */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/20 mb-3 sm:mb-4">
            <Laptop className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>

          <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3.5 py-1 rounded-full text-xs font-bold mb-2.5 border border-blue-200/80">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Langkah Persiapan Presensi • Rombel {rombel}</span>
          </div>

          <h1 className="font-heading text-2xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
            Pilih Penggunaan Laptop Ini
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1.5 max-w-lg mx-auto leading-relaxed">
            Berapa siswa yang menggunakan laptop ini untuk sesi praktikum hari ini? Pilihanmu akan otomatis menyesuaikan kuota <strong>Kode Token Sesi Lab</strong>.
          </p>

          {meetingTitle && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100/90 px-3 py-1 rounded-xl">
              <span>Sesi: <strong>{meetingTitle}</strong></span>
            </div>
          )}
        </div>

        {/* Option Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
          {/* Opsi 1: 1 Laptop 1 Orang */}
          <div
            onClick={() => !isSaving && handleSelectMode(1)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                !isSaving && handleSelectMode(1);
              }
            }}
            className={`bg-white rounded-3xl p-6 sm:p-7 border-3 transition-all cursor-pointer flex flex-col justify-between group relative text-left shadow-md hover:shadow-xl hover:-translate-y-1 ${
              selectedCapacity === 1
                ? 'border-blue-600 ring-4 ring-blue-500/15 shadow-blue-500/10'
                : 'border-slate-200 hover:border-blue-400'
            }`}
          >
            {/* Badge Rekomendasi / Pilihan */}
            <div className="flex items-center justify-between gap-2 mb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                <User className="w-3 h-3 text-blue-600" />
                Mode Mandiri
              </span>

              {selectedCapacity === 1 && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Terpilih
                </span>
              )}
            </div>

            {/* Icon & Title */}
            <div>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-500 to-sky-500 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform mb-4">
                <div className="flex items-center -space-x-1">
                  <Laptop className="w-7 h-7" />
                  <span className="text-xs font-bold bg-white text-blue-600 rounded-full w-5 h-5 flex items-center justify-center shadow-xs">1</span>
                </div>
              </div>

              <h2 className="font-heading font-black text-xl sm:text-2xl text-slate-900 group-hover:text-blue-600 transition-colors">
                1 Laptop 1 Orang
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1 leading-relaxed">
                Saya mengerjakan praktikum <strong>sendirian</strong> di laptop ini tanpa teman sebangku.
              </p>

              {/* Point Keunggulan */}
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Kode Token Lab berlaku untuk <strong>1 siswa</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Status token menampilkan: <strong>0/1 Siswa</strong></span>
                </div>
              </div>
            </div>

            {/* Button */}
            <div className="pt-5 mt-4">
              <button
                type="button"
                className="w-full py-3 px-4 rounded-2xl bg-blue-600 group-hover:bg-blue-700 text-white font-heading font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
              >
                <span>Pilih 1 Siswa (Sendiri)</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Opsi 2: 1 Laptop 2 Orang */}
          <div
            onClick={() => !isSaving && handleSelectMode(2)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                !isSaving && handleSelectMode(2);
              }
            }}
            className={`bg-white rounded-3xl p-6 sm:p-7 border-3 transition-all cursor-pointer flex flex-col justify-between group relative text-left shadow-md hover:shadow-xl hover:-translate-y-1 ${
              selectedCapacity === 2
                ? 'border-purple-600 ring-4 ring-purple-500/15 shadow-purple-500/10'
                : 'border-slate-200 hover:border-purple-400'
            }`}
          >
            {/* Badge */}
            <div className="flex items-center justify-between gap-2 mb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                <Users className="w-3 h-3 text-purple-600" />
                Mode Berpasangan
              </span>

              {selectedCapacity === 2 && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Terpilih
                </span>
              )}
            </div>

            {/* Icon & Title */}
            <div>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-purple-700 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-purple-600/25 group-hover:scale-105 transition-transform mb-4">
                <div className="flex items-center -space-x-1">
                  <Laptop className="w-7 h-7" />
                  <span className="text-xs font-bold bg-white text-purple-600 rounded-full w-5 h-5 flex items-center justify-center shadow-xs">2</span>
                </div>
              </div>

              <h2 className="font-heading font-black text-xl sm:text-2xl text-slate-900 group-hover:text-purple-600 transition-colors">
                1 Laptop 2 Orang
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1 leading-relaxed">
                Saya berbagi laptop ini <strong>berdua</strong> bersama 1 teman sebangku di lab komputer.
              </p>

              {/* Point Keunggulan */}
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>Kode Token Lab mengizinkan <strong>2 siswa</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Status token menampilkan: <strong>0/2 Siswa</strong></span>
                </div>
              </div>
            </div>

            {/* Button */}
            <div className="pt-5 mt-4">
              <button
                type="button"
                className="w-full py-3 px-4 rounded-2xl bg-purple-600 group-hover:bg-purple-700 text-white font-heading font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-purple-600/20 transition-all cursor-pointer"
              >
                <span>Pilih 2 Siswa (Berdua)</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>

        {/* Petunjuk Tambahan */}
        <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl text-xs text-blue-900 flex items-start gap-2.5 max-w-xl mx-auto">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Jika kamu salah memilih, kamu masih bisa mengganti mode penggunaan laptop ini kapan saja pada form presensi berikutnya.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 py-3 max-w-4xl mx-auto w-full">
        SDN Pleburan 03 Semarang • Ekstrakurikuler Komputer
      </footer>
    </div>
  );
}
