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
import AutoScroll from '@/components/auto-scroll';

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
        localStorage.setItem(`pletig_laptop_capacity_${meetingId}_${rombel}`, String(capacity));
      }
      // Simpan cookie agar server action langsung mengenali kapasitas device
      const cKey = meetingId ? `pletig_dev_cap_${meetingId}` : 'pletig_dev_cap_active';
      document.cookie = `${cKey}=${capacity}; max-age=${60 * 60 * 12}; path=/; SameSite=Lax`;
      if (meetingId) {
        document.cookie = `pletig_dev_cap_${meetingId}_${rombel}=${capacity}; max-age=${60 * 60 * 12}; path=/; SameSite=Lax`;
      }
    } catch {
      // non-blocking
    }

    // Arahkan ke halaman presensi rombel dengan query param mode
    setTimeout(() => {
      router.push(`/absen/kelas/${grade}/${rombel}?mode=${capacity}`);
    }, 150);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-6 md:p-8 pb-24 sm:pb-8 overflow-x-hidden">
      {/* Top Navbar */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between mb-6">
        <Link
          href={`/absen?grade=${grade}`}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-700 hover:text-slate-900 bg-white px-3.5 py-1.5 rounded-lg border border-slate-200 shadow-xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" aria-hidden="true" />
          <span>Ganti Rombel</span>
        </Link>

        <div className="flex items-center gap-2 text-xs font-medium text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Rombel {rombel} • Kelas {grade} SD</span>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto w-full flex-1 flex flex-col justify-center my-auto py-4">
        {/* Header Title */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 text-white shadow-xs mb-3">
            <Laptop className="w-6 h-6" aria-hidden="true" />
          </div>

          <div className="block">
            <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-medium mb-2.5 border border-slate-200">
              <Sparkles className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
              <span>Persiapan Presensi • Rombel {rombel}</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 leading-tight">
            Pilih Penggunaan Laptop Ini
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-normal mt-1.5 max-w-lg mx-auto leading-relaxed">
            Berapa siswa yang menggunakan laptop ini untuk sesi praktikum hari ini? Pilihan akan otomatis menyesuaikan batas presensi laptop.
          </p>

          {meetingTitle && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-white px-3 py-1 rounded-md border border-slate-200">
              <span>Sesi: <strong>{meetingTitle}</strong></span>
            </div>
          )}
        </div>

        {/* Auto Scroll ke Pilihan Kartu Laptop */}
        <AutoScroll targetId="pilihan-mode-laptop" delay={250} offset={-24} duration={800} />

        {/* Option Cards Grid */}
        <div id="pilihan-mode-laptop" className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 scroll-mt-6">
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
            className={`bg-white rounded-xl p-6 border transition-colors cursor-pointer flex flex-col justify-between group relative text-left shadow-xs ${
              selectedCapacity === 1
                ? 'border-indigo-600 ring-2 ring-indigo-500/20'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            {/* Badge */}
            <div className="flex items-center justify-between gap-2 mb-4">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                Mode Mandiri
              </span>

              {selectedCapacity === 1 && (
                <span className="text-xs font-medium text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                  Terpilih
                </span>
              )}
            </div>

            {/* Icon & Title */}
            <div>
              <div className="w-12 h-12 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-lg mb-4 shadow-xs group-hover:bg-indigo-600 transition-colors">
                <div className="flex items-center -space-x-1">
                  <Laptop className="w-5 h-5" aria-hidden="true" />
                  <span className="text-[10px] font-bold bg-white text-slate-900 rounded-full w-4 h-4 flex items-center justify-center ml-0.5">1</span>
                </div>
              </div>

              <h2 className="text-lg font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                1 Laptop 1 Siswa
              </h2>
              <p className="text-xs text-slate-500 font-normal mt-1 leading-relaxed">
                Saya mengerjakan praktikum <strong>sendirian</strong> di laptop ini tanpa teman sebangku.
              </p>

              {/* Point Keunggulan */}
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                  <span>Kode Token Lab berlaku untuk <strong>1 siswa</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
                  <span>Status token: <strong>0/1 Siswa</strong></span>
                </div>
              </div>
            </div>

            {/* Button */}
            <div className="pt-5 mt-4">
              <button
                type="button"
                className="w-full py-2.5 px-4 rounded-lg bg-slate-900 group-hover:bg-indigo-600 text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <span>Pilih 1 Siswa (Sendiri)</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
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
            className={`bg-white rounded-xl p-6 border transition-colors cursor-pointer flex flex-col justify-between group relative text-left shadow-xs ${
              selectedCapacity === 2
                ? 'border-indigo-600 ring-2 ring-indigo-500/20'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            {/* Badge */}
            <div className="flex items-center justify-between gap-2 mb-4">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                Mode Berpasangan
              </span>

              {selectedCapacity === 2 && (
                <span className="text-xs font-medium text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                  Terpilih
                </span>
              )}
            </div>

            {/* Icon & Title */}
            <div>
              <div className="w-12 h-12 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-lg mb-4 shadow-xs group-hover:bg-indigo-600 transition-colors">
                <div className="flex items-center -space-x-1">
                  <Laptop className="w-5 h-5" aria-hidden="true" />
                  <span className="text-[10px] font-bold bg-white text-slate-900 rounded-full w-4 h-4 flex items-center justify-center ml-0.5">2</span>
                </div>
              </div>

              <h2 className="text-lg font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                1 Laptop 2 Siswa
              </h2>
              <p className="text-xs text-slate-500 font-normal mt-1 leading-relaxed">
                Saya berbagi laptop ini <strong>berdua</strong> bersama 1 teman sebangku di lab komputer.
              </p>

              {/* Point Keunggulan */}
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                  <span>Kode Token Lab mengizinkan <strong>2 siswa</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
                  <span>Status token: <strong>0/2 Siswa</strong></span>
                </div>
              </div>
            </div>

            {/* Button */}
            <div className="pt-5 mt-4">
              <button
                type="button"
                className="w-full py-2.5 px-4 rounded-lg bg-slate-900 group-hover:bg-indigo-600 text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <span>Pilih 2 Siswa (Berdua)</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        {/* Petunjuk Tambahan */}
        <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-start gap-2.5 max-w-xl mx-auto">
          <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="leading-relaxed">
            Jika kamu salah memilih, kamu masih bisa mengganti mode penggunaan laptop ini kapan saja pada tombol Mode di sudut kanan atas.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 py-4 max-w-4xl mx-auto w-full">
        SDN Pleburan 03 Semarang • Ekstrakurikuler Komputer
      </footer>
    </div>
  );
}
