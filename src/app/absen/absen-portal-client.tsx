'use client';

import { useState, useEffect } from 'react';
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
import AutoScroll from '@/components/auto-scroll';

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
}> = {
  4: {
    dayName: 'Kamis',
    timeDisplay: '12:30 - 14:00 WIB (Sesi 1: 12:30-13:20 • Sesi 2: 13:20-14:00)',
    defaultTitle: 'Pengenalan Komputer & Mouse',
  },
  5: {
    dayName: 'Selasa',
    timeDisplay: '12:30 - 14:00 WIB (Sesi 1: 12:30-13:20 • Sesi 2: 13:20-14:00)',
    defaultTitle: 'Latihan Mengetik 10 Jari & Word',
  },
  6: {
    dayName: 'Senin',
    timeDisplay: '12:30 - 14:00 WIB (Sesi 1: 12:30-13:20 • Sesi 2: 13:20-14:00)',
    defaultTitle: 'Presentasi Kreatif & Logika Komputer',
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

  useEffect(() => {
    setSelectedGrade(initialTodayGrade);
  }, [initialTodayGrade]);

  const activeMeeting = todayMeetings[selectedGrade];
  const config = GRADE_CONFIG[selectedGrade];
  const rombels = rombelsByGrade[selectedGrade] || [`${selectedGrade}A`, `${selectedGrade}B`];

  const isTodayGrade = selectedGrade === initialTodayGrade;
  const isSessionOpen = Boolean(activeMeeting?.isOpen || activeMeeting?.isActive);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-6 pb-24 sm:pb-8 overflow-x-hidden">
      {/* Top Navbar */}
      <header className="max-w-3xl mx-auto w-full flex items-center justify-between gap-2 mb-4">
        <Link
          href={
            currentUser
              ? currentUser.role === 'superadmin' || currentUser.role === 'guru'
                ? '/admin/dashboard'
                : '/siswa/dashboard'
              : '/'
          }
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white px-3.5 py-1.5 rounded-lg border border-slate-200 shadow-xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" aria-hidden="true" />
          <span>{currentUser ? 'Dashboard' : 'Beranda'}</span>
        </Link>

        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs">
          <Clock className="w-4 h-4 text-slate-500" aria-hidden="true" />
          <span>{dayName}, {timeStr} WIB</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto w-full flex-1 flex flex-col justify-start">
        {/* Banner Sesi Aktif */}
        <div className="bg-slate-900 text-white rounded-xl p-6 border border-slate-800 shadow-xs mb-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 bg-slate-800 px-3 py-1 rounded-full text-xs font-medium text-slate-200 border border-slate-700">
              {isSessionOpen ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  Sesi Dibuka Pembina
                </>
              ) : isTodayGrade ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  Sesi Hari Ini ({dayName})
                </>
              ) : (
                <>Jadwal Hari {config.dayName}</>
              )}
            </span>

            <span className="text-xs font-medium text-slate-300 bg-slate-800 px-2.5 py-0.5 rounded border border-slate-700">
              Kelas {selectedGrade} SD
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight leading-tight text-white">
            {activeMeeting?.title || config.defaultTitle}
          </h1>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-2 font-normal">
            <span>Jam Praktikum: 12:30 - 14:00 WIB (Sesi 1: 12:30-13:20 • Sesi 2: 13:20-14:00)</span>
            <span>•</span>
            <span>SDN Pleburan 03 Semarang</span>
          </div>
        </div>

        {/* PILIH ROMBEL */}
        <AutoScroll targetId="pilihan-rombel" delay={250} offset={-24} duration={800} />
        <div id="pilihan-rombel" className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs mb-5 text-center scroll-mt-6">
          <div className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-medium mb-3 border border-slate-200">
            <GraduationCap className="w-4 h-4 text-slate-500" aria-hidden="true" />
            <span>Presensi Siswa Kelas {selectedGrade} SD</span>
          </div>

          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 mb-1">
            Pilih Rombel Kamu:
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-normal mb-5">
            Pilih rombel kelas di bawah ini untuk memulai presensi:
          </p>

          {/* Grid Tombol Rombel */}
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
            {rombels.map((rombel) => (
              <Link
                key={rombel}
                href={`/absen/kelas/${selectedGrade}/${rombel}/mode`}
                className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-indigo-600 rounded-xl p-5 shadow-xs transition-colors flex flex-col items-center justify-center gap-3 group text-center cursor-pointer"
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-slate-900 text-white font-bold text-xl sm:text-2xl flex items-center justify-center group-hover:bg-indigo-600 transition-colors shadow-xs">
                  {rombel}
                </div>
                <div>
                  <div className="font-semibold text-base text-slate-900 group-hover:text-indigo-600 transition-colors">
                    Rombel {rombel}
                  </div>
                  <span className="text-xs text-slate-500 font-normal">
                    Siswa Kelas {rombel}
                  </span>
                </div>
                <div className="w-full mt-1 py-2 px-3 rounded-lg bg-slate-900 group-hover:bg-indigo-600 text-white font-medium text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs">
                  <span>Isi Presensi</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Pilihan Jenjang Lain */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs text-center">
          <p className="text-xs font-medium text-slate-600 mb-2.5">
            Bukan siswa Kelas {selectedGrade}? Pilih jenjang kelas lain:
          </p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {([4, 5, 6] as const).map((grade) => (
              <button
                key={grade}
                type="button"
                onClick={() => setSelectedGrade(grade)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  selectedGrade === grade
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Kelas {grade} ({GRADE_CONFIG[grade].dayName})
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Footer Minimalis */}
      <footer className="text-center text-xs text-slate-400 py-4 border-t border-slate-200 max-w-3xl mx-auto w-full mt-6">
        <div>SDN Pleburan 03 Semarang • Portal computer.pletig</div>
      </footer>
    </div>
  );
}
