'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Clock, ArrowRight } from 'lucide-react';

export interface DynamicMeetingData {
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

interface HomeScheduleTabsProps {
  initialMeetings?: DynamicMeetingData[];
}

interface ConfigItem {
  grade: number;
  day: string;
  time: string;
  title: string;
  description: string;
  accentBorder: string;
  accentBg: string;
  accentText: string;
  badgeBg: string;
  iconBg: string;
  btnBg: string;
  btnText: string;
  borderCard: string;
  badgeLight: string;
}

const DEFAULT_CONFIG: Record<number, ConfigItem> = {
  4: {
    grade: 4,
    day: 'Hari Kamis',
    time: '12.30 - 14.00 WIB',
    title: 'Pengenalan Komputer & Mouse',
    description:
      'Pengenalan perangkat keras komputer, cara memegang mouse yang benar, etika lab, dan latihan mengetik baris dasar.',
    accentBorder: 'border-sky-300',
    accentBg: 'bg-sky-50/50',
    accentText: 'text-sky-700',
    badgeBg: 'bg-sky-100 text-sky-800',
    iconBg: 'bg-sky-500 text-white',
    btnBg: 'bg-sky-600 hover:bg-sky-700',
    btnText: 'text-sky-700 hover:text-sky-800',
    borderCard: 'border-sky-200',
    badgeLight: 'text-sky-700 bg-sky-50',
  },
  5: {
    grade: 5,
    day: 'Hari Selasa',
    time: '12.30 - 14.00 WIB',
    title: 'Latihan Mengetik 10 Jari',
    description:
      'Latihan mengetik 10 jari, format teks kreatif, menyisipkan gambar, dan pembuatan dokumen tugas sekolah.',
    accentBorder: 'border-emerald-300',
    accentBg: 'bg-emerald-50/50',
    accentText: 'text-emerald-700',
    badgeBg: 'bg-emerald-100 text-emerald-800',
    iconBg: 'bg-emerald-500 text-white',
    btnBg: 'bg-emerald-600 hover:bg-emerald-700',
    btnText: 'text-emerald-700 hover:text-emerald-800',
    borderCard: 'border-emerald-200',
    badgeLight: 'text-emerald-700 bg-emerald-50',
  },
  6: {
    grade: 6,
    day: 'Hari Senin',
    time: '12.30 - 14.00 WIB',
    title: 'Mengetik Cepat & Logika Komputer',
    description:
      'Latihan mengetik cepat, pengolahan dokumen tingkat lanjut, dan pengenalan dasar logika komputer.',
    accentBorder: 'border-amber-300',
    accentBg: 'bg-amber-50/50',
    accentText: 'text-amber-700',
    badgeBg: 'bg-amber-100 text-amber-800',
    iconBg: 'bg-amber-500 text-white',
    btnBg: 'bg-amber-600 hover:bg-amber-700',
    btnText: 'text-amber-700 hover:text-amber-800',
    borderCard: 'border-amber-200',
    badgeLight: 'text-amber-700 bg-amber-50',
  },
};

function getIndonesianDateDetails(dateStr?: string | null) {
  if (!dateStr) return null;
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return null;
    const dateObj = new Date(Date.UTC(y, m - 1, d, 5, 0, 0));
    const dayName = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      weekday: 'long',
    }).format(dateObj);
    const formattedDate = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(dateObj);
    return { dayName, formattedDate };
  } catch {
    return null;
  }
}

export default function HomeScheduleTabs({ initialMeetings = [] }: HomeScheduleTabsProps) {
  const [activeGrade, setActiveGrade] = useState<number>(4);

  // Bangun jadwal dinamis berdasarkan data sesi yang dibuat oleh Admin/Pembina
  const schedules = [4, 5, 6].map((grade) => {
    const base = DEFAULT_CONFIG[grade];

    // Filter pertemuan yang berlaku untuk jenjang kelas ini atau semua kelas
    const applicable = initialMeetings.filter(
      (m) => m.gradeLevel === grade || m.gradeLevel === null
    );

    // Prioritas:
    // 1. Sesi yang sedang dibuka (isOpen / isActive)
    // 2. Pertemuan yang berlaku (spesifik kelas > semua kelas)
    const matching =
      applicable.find((m) => (m.isOpen || m.isActive) && m.gradeLevel === grade) ||
      applicable.find((m) => m.isOpen || m.isActive) ||
      applicable.find((m) => m.gradeLevel === grade) ||
      applicable[0];

    if (matching) {
      const dateDetails = getIndonesianDateDetails(matching.date);
      const dayName = dateDetails ? `Hari ${dateDetails.dayName}` : base.day;
      const dateDisplay = dateDetails ? dateDetails.formattedDate : null;

      return {
        ...base,
        title: matching.title || base.title,
        meetingNumber: matching.meetingNumber,
        day: dayName,
        dayName: dateDetails ? dateDetails.dayName : base.day.replace('Hari ', ''),
        dateDisplay,
        time: `${matching.startTime} - ${matching.endTime} WIB`,
        description: matching.description?.trim() ? matching.description : base.description,
        isOpen: Boolean(matching.isOpen || matching.isActive),
        hasDynamicSession: true,
      };
    }

    return {
      ...base,
      meetingNumber: null,
      dayName: base.day.replace('Hari ', ''),
      dateDisplay: null,
      isOpen: false,
      hasDynamicSession: false,
    };
  });

  const selectedItem = schedules.find((s) => s.grade === activeGrade) || schedules[0];

  return (
    <div>
      {/* MOBILE VIEW: Compact Tab Switcher (Hemat Ruang & Dinamis) */}
      <div className="sm:hidden space-y-3">
        {/* Tab Pills */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-200/80 rounded-2xl">
          {schedules.map((item) => (
            <button
              key={item.grade}
              type="button"
              onClick={() => setActiveGrade(item.grade)}
              className={`py-2 px-1 rounded-xl text-xs font-heading font-bold transition-all text-center cursor-pointer ${
                activeGrade === item.grade
                  ? 'bg-white text-slate-900 shadow-sm scale-100'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Kelas {item.grade}</span>
              <span className="block text-[10px] font-normal text-slate-500">
                {item.isOpen ? 'Buka' : item.day.replace('Hari ', '')}
              </span>
            </button>
          ))}
        </div>

        {/* Selected Single Card */}
        <div
          className={`bg-white rounded-3xl p-4 sm:p-5 border-2 ${selectedItem.accentBorder} shadow-sm animate-in fade-in zoom-in-95 duration-150`}
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center font-heading font-bold text-lg shrink-0 ${selectedItem.iconBg}`}
              >
                {selectedItem.grade}
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="font-heading text-base font-bold text-slate-900 leading-tight">
                    Kelas {selectedItem.grade} SD
                  </h4>
                  {selectedItem.meetingNumber && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                      Pertemuan {selectedItem.meetingNumber}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {selectedItem.isOpen ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Sesi Dibuka
              </span>
            ) : (
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${selectedItem.badgeBg}`}>
                {selectedItem.day}
              </span>
            )}
          </div>

          {selectedItem.title && (
            <div className="font-heading font-bold text-sm text-slate-800 mb-2">
              {selectedItem.title}
            </div>
          )}

          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium mb-3">
            <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="truncate">
              {selectedItem.day}{selectedItem.dateDisplay ? `, ${selectedItem.dateDisplay}` : ''} • {selectedItem.time}
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed mb-3.5 bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
            {selectedItem.description}
          </p>

          <Link
            href={`/absen/kelas/${selectedItem.grade}`}
            className={`w-full py-2.5 px-3 rounded-xl font-heading font-bold text-xs flex items-center justify-center gap-1.5 transition-all text-white shadow-xs ${selectedItem.btnBg}`}
          >
            <span>Buka Presensi Kelas {selectedItem.grade}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* DESKTOP VIEW: Full 3-Column Grid */}
      <div className="hidden sm:grid sm:grid-cols-3 gap-6">
        {schedules.map((item) => (
          <div
            key={item.grade}
            className={`bg-white rounded-3xl p-6 border-2 ${item.borderCard} shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between`}
          >
            <div>
              {/* Header: Grade number & Status Badge */}
              <div className="flex items-center justify-between mb-3.5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-heading font-bold text-xl ${item.iconBg}`}>
                  {item.grade}
                </div>
                {item.isOpen ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Sesi Dibuka
                  </span>
                ) : (
                  <div className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${item.badgeLight}`}>
                    {item.day}
                  </div>
                )}
              </div>

              {/* Title & Meeting Badge */}
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-heading text-lg font-bold text-slate-900">
                  Kelas {item.grade} SD
                </h4>
                {item.meetingNumber && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                    Pertemuan {item.meetingNumber}
                  </span>
                )}
              </div>

              {item.title && (
                <div className="font-heading font-bold text-sm text-slate-800 mb-2.5 line-clamp-1">
                  {item.title}
                </div>
              )}

              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/70 p-3 rounded-2xl border border-slate-100 mb-4 line-clamp-2">
                {item.description}
              </p>
            </div>

            {/* Bottom Row: Jadwal & Tombol Aksi */}
            <div className="space-y-3 pt-3.5 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="truncate">
                  {item.day}{item.dateDisplay ? `, ${item.dateDisplay}` : ''} • {item.time}
                </span>
              </div>

              <Link
                href={`/absen/kelas/${item.grade}`}
                className={`w-full py-2.5 px-4 rounded-2xl text-white font-heading font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all hover:opacity-95 hover:shadow-md cursor-pointer ${item.btnBg}`}
              >
                <span>Buka Presensi Kelas {item.grade}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
