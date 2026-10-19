'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { GradeLevel, SessionUser } from '@/lib/auth-types';
import {
  Clock,
  ArrowLeft,
  ArrowRight,
  GraduationCap,
  CalendarCheck,
  CheckCircle2,
  Sparkles,
  Laptop,
  Users,
} from 'lucide-react';

interface MeetingSummary {
  id: string;
  meetingNumber: number;
  gradeLevel: number | null;
  title: string;
  description: string | null;
  date: string;
  startTime: string;
  endTime: string;
  isOpen: boolean;
  isActive: boolean;
}

interface AbsenPortalClientProps {
  initialTodayGrade: GradeLevel;
  todayMeetings: Record<number, MeetingSummary | null>;
  rombelsByGrade: Record<number, string[]>;
  dayName: string;
  timeStr: string;
  dateStr: string;
  currentUser: SessionUser | null;
}

const GRADE_CONFIG: Record<number, {
  dayName: string;
  timeDisplay: string;
  defaultTitle: string;
  colorGradient: string;
  badgeBg: string;
  borderTheme: string;
  btnTheme: string;
}> = {
  4: {
    dayName: 'Kamis',
    timeDisplay: '12.30 - 14.00 WIB',
    defaultTitle: 'Pengenalan Komputer & Mouse',
    colorGradient: 'from-sky-600 via-blue-600 to-indigo-700',
    badgeBg: 'bg-sky-100 text-sky-900 border-sky-300',
    borderTheme: 'border-sky-300 hover:border-sky-500',
    btnTheme: 'bg-sky-600 hover:bg-sky-700 shadow-sky-600/25',
  },
  5: {
    dayName: 'Selasa',
    timeDisplay: '12.30 - 14.00 WIB',
    defaultTitle: 'Latihan Mengetik 10 Jari & Word',
    colorGradient: 'from-emerald-600 via-teal-600 to-emerald-800',
    badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    borderTheme: 'border-emerald-300 hover:border-emerald-500',
    btnTheme: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25',
  },
  6: {
    dayName: 'Senin',
    timeDisplay: '12.30 - 14.00 WIB',
    defaultTitle: 'Presentasi Kreatif & Logika Komputer',
    colorGradient: 'from-purple-700 via-indigo-600 to-purple-900',
    badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
    borderTheme: 'border-purple-300 hover:border-purple-600',
    btnTheme: 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/25',
  },
};

export default function AbsenPortalClient({
  initialTodayGrade,
  todayMeetings,
  rombelsByGrade,
  dayName,
  timeStr,
  dateStr,
  currentUser,
}: AbsenPortalClientProps) {
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>(initialTodayGrade);

  const activeMeeting = todayMeetings[selectedGrade];
  const config = GRADE_CONFIG[selectedGrade];
  const rombels = rombelsByGrade[selectedGrade] || [`${selectedGrade}A`, `${selectedGrade}B`];

  const isTodayGrade = selectedGrade === initialTodayGrade;
  const isSessionOpen = Boolean(activeMeeting?.isOpen || activeMeeting?.isActive);

  return (
    <div className="min-h-screen bg-playful-grid flex flex-col justify-between p-3 sm:p-5 md:p-6 pb-24 sm:pb-8 overflow-x-hidden">
      {/* Top Navbar Ramping */}
      <header className="max-w-3xl mx-auto w-full flex items-center justify-between gap-2 mb-3 sm:mb-4">
        <Link
          href={
            currentUser
              ? currentUser.role === 'superadmin'
                ? '/admin/dashboard'
                : currentUser.role === 'guru'
                ? '/guru/dashboard'
                : '/siswa/dashboard'
              : '/'
          }
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-purple-700 bg-white/90 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-slate-200 shadow-xs transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{currentUser ? 'Dashboard' : 'Beranda'}</span>
        </Link>

        <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-slate-700 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-200 shadow-xs">
          <Clock className="w-3.5 h-3.5 text-purple-600" />
          <span>{dayName}, {timeStr} WIB</span>
        </div>
      </header>

      {/* Main Container - Ditarik ke atas agar langsung kelihatan tombol rombel */}
      <main className="max-w-3xl mx-auto w-full flex-1 flex flex-col justify-start">
        {/* Banner Sesi Aktif Hari Ini */}
        <div
          className={`bg-gradient-to-r ${config.colorGradient} text-white rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden mb-5`}
        >
          <div className="relative z-10">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider text-white border border-white/20">
                {isSessionOpen ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
                    Sesi Dibuka Pembina
                  </>
                ) : isTodayGrade ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-yellow-300"></span>
                    Sesi Hari Ini ({dayName})
                  </>
                ) : (
                  <>Jadwal Hari {config.dayName}</>
                )}
              </span>

              <span className="text-[11px] font-semibold text-white/80 bg-black/20 px-2.5 py-0.5 rounded-full">
                Kelas {selectedGrade} SD
              </span>
            </div>

            <h1 className="font-heading font-black text-xl sm:text-2xl leading-tight">
              {activeMeeting?.title || config.defaultTitle}
            </h1>

            <div className="flex flex-wrap items-center gap-2 text-xs text-white/90 mt-1.5 font-medium">
              <span>Jam Praktikum: 12.30 - 14.00 WIB</span>
              <span>•</span>
              <span>SDN Pleburan 03 Semarang</span>
            </div>
          </div>
        </div>

        {/* ========================================================
            LANGSUNG PILIH ROMBEL (Langsung di atas, mudah dijangkau)
            ======================================================== */}
        <div className="bg-white rounded-3xl p-5 sm:p-7 border-2 border-purple-200/80 shadow-md shadow-purple-600/5 mb-5 text-center">
          <div className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-xs font-bold mb-2 border border-purple-200">
            <GraduationCap className="w-3.5 h-3.5 text-purple-600" />
            <span>Presensi Siswa Kelas {selectedGrade} SD</span>
          </div>

          <h2 className="font-heading font-black text-xl sm:text-2xl text-slate-900 mb-1">
            Pilih Rombel Kamu:
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mb-5">
            Klik tombol rombel kelasmu di bawah ini untuk mengisi nama dan token presensi:
          </p>

          {/* Grid Tombol Rombel */}
          <div className="grid grid-cols-2 gap-3 sm:gap-5 max-w-lg mx-auto">
            {rombels.map((rombel) => (
              <Link
                key={rombel}
                href={`/absen/kelas/${selectedGrade}/${rombel}`}
                className="bg-gradient-to-b from-white to-purple-50/40 hover:to-purple-100/60 rounded-3xl p-5 sm:p-7 border-2 border-purple-200 hover:border-purple-600 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all text-center flex flex-col items-center justify-center gap-2.5 group cursor-pointer"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-purple-700 text-white font-heading font-black text-2xl sm:text-3xl flex items-center justify-center shadow-lg shadow-purple-600/30 group-hover:scale-110 transition-transform">
                  {rombel}
                </div>
                <div>
                  <div className="font-heading font-extrabold text-base sm:text-lg text-slate-900 group-hover:text-purple-700 transition-colors">
                    Rombel {rombel}
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Siswa Kelas {rombel}
                  </span>
                </div>
                <div className="w-full mt-1 py-2 px-3 rounded-xl bg-purple-600 group-hover:bg-purple-700 text-white font-heading font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5">
                  <span>Isi Presensi</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Pilihan Jenjang Lain (Jika ada siswa susulan atau jadwal pengganti) */}
        <div className="bg-slate-50 rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 text-center">
          <p className="text-xs font-semibold text-slate-600 mb-2">
            Bukan siswa Kelas {selectedGrade}? Pilih jenjang kelas lain:
          </p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {([4, 5, 6] as const).map((grade) => (
              <button
                key={grade}
                type="button"
                onClick={() => setSelectedGrade(grade)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-heading font-bold transition-all cursor-pointer ${
                  selectedGrade === grade
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Kelas {grade} ({GRADE_CONFIG[grade].dayName})
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Footer Minimalis */}
      <footer className="text-center text-xs text-slate-400 py-3 border-t border-slate-200/60 max-w-3xl mx-auto w-full mt-6">
        <div>SDN Pleburan 03 Semarang • Portal computer.pletig</div>
      </footer>
    </div>
  );
}
