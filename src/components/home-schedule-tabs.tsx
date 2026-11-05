'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clock, ArrowRight } from 'lucide-react';
import { getAllMeetingsAction } from '@/app/actions/meeting-actions';
import { saveOfflineData, getOfflineData, OFFLINE_KEYS } from '@/lib/offline-storage';

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
}

const DEFAULT_CONFIG: Record<number, ConfigItem> = {
  4: {
    grade: 4,
    day: 'Hari Kamis',
    time: '12:30 - 14:00 WIB (Sesi 1: 12:30-13:20 • Sesi 2: 13:20-14:00)',
    title: 'Pengenalan Komputer & Mouse',
    description:
      'Pengenalan perangkat keras komputer, cara memegang mouse yang benar, etika lab, dan latihan mengetik baris dasar.',
  },
  5: {
    grade: 5,
    day: 'Hari Selasa',
    time: '12:30 - 14:00 WIB (Sesi 1: 12:30-13:20 • Sesi 2: 13:20-14:00)',
    title: 'Latihan Mengetik 10 Jari',
    description:
      'Latihan mengetik 10 jari, format teks kreatif, menyisipkan gambar, dan pembuatan dokumen tugas sekolah.',
  },
  6: {
    grade: 6,
    day: 'Hari Senin',
    time: '12:30 - 14:00 WIB (Sesi 1: 12:30-13:20 • Sesi 2: 13:20-14:00)',
    title: 'Mengetik Cepat & Logika Komputer',
    description:
      'Latihan mengetik cepat, pengolahan dokumen tingkat lanjut, dan pengenalan dasar logika komputer.',
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
  const [meetings, setMeetings] = useState(initialMeetings);

  useEffect(() => {
    if (Array.isArray(initialMeetings)) {
      setMeetings(initialMeetings);
      saveOfflineData(OFFLINE_KEYS.HOME_MEETINGS, initialMeetings);
    } else {
      // Pulihkan dari cache offline hanya jika initialMeetings tidak terdefinisi
      const cached = getOfflineData<DynamicMeetingData[]>(OFFLINE_KEYS.HOME_MEETINGS);
      if (cached && cached.length > 0) {
        setMeetings(cached);
      }
    }
  }, [initialMeetings]);

  // Real-time synchronization saat pull-to-refresh atau berkala tiap 5 detik jika tab aktif
  useEffect(() => {
    const handleRefresh = async () => {
      try {
        const refreshed = await getAllMeetingsAction();
        if (Array.isArray(refreshed)) {
          saveOfflineData(OFFLINE_KEYS.HOME_MEETINGS, refreshed);
          setMeetings((prev) => {
            if (JSON.stringify(prev) !== JSON.stringify(refreshed)) {
              return refreshed as any;
            }
            return prev;
          });
        }
      } catch {
        // Jika offline, ambil dari penyimpanan lokal perangkat
        const cached = getOfflineData<DynamicMeetingData[]>(OFFLINE_KEYS.HOME_MEETINGS);
        if (cached && cached.length > 0) {
          setMeetings(cached);
        }
      }
    };

    window.addEventListener('app:pull-to-refresh', handleRefresh);

    const timer = setInterval(() => {
      if (document.hidden) return;
      handleRefresh();
    }, 6000);

    return () => {
      window.removeEventListener('app:pull-to-refresh', handleRefresh);
      clearInterval(timer);
    };
  }, []);

  // Bangun jadwal dinamis berdasarkan data sesi yang dibuat oleh Admin/Pembina
  const schedules = [4, 5, 6].map((grade) => {
    const base = DEFAULT_CONFIG[grade];

    // Filter pertemuan yang berlaku untuk jenjang kelas ini atau semua kelas
    const applicable = meetings.filter(
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
      {/* MOBILE VIEW: Compact Tab Switcher */}
      <div className="sm:hidden space-y-3">
        {/* Tab Pills */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200">
          {schedules.map((item) => (
            <button
              key={item.grade}
              type="button"
              onClick={() => setActiveGrade(item.grade)}
              className={`py-2 px-1 rounded-md text-xs font-semibold transition-colors text-center cursor-pointer ${
                activeGrade === item.grade
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
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
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center font-semibold text-base shrink-0">
                {selectedItem.grade}
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="text-base font-semibold text-slate-900 leading-tight">
                    Kelas {selectedItem.grade} SD
                  </h4>
                  {selectedItem.meetingNumber && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-700">
                      Pertemuan {selectedItem.meetingNumber}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {selectedItem.isOpen ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Sesi Dibuka
              </span>
            ) : (
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-700 shrink-0">
                {selectedItem.day}
              </span>
            )}
          </div>

          {selectedItem.title && (
            <div className="text-sm font-semibold text-slate-800 mb-2">
              {selectedItem.title}
            </div>
          )}

          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium mb-3">
            <Clock className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {selectedItem.day}{selectedItem.dateDisplay ? `, ${selectedItem.dateDisplay}` : ''} • {selectedItem.time}
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed mb-4 p-3 rounded-lg bg-slate-50 border border-slate-200">
            {selectedItem.description}
          </p>

          <Link
            href={`/absen?grade=${selectedItem.grade}`}
            className="w-full py-2.5 px-4 rounded-lg text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors bg-slate-900 hover:bg-slate-800 shadow-xs"
          >
            <span>Buka Presensi Kelas {selectedItem.grade}</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* DESKTOP VIEW: Clean 3-Column Grid */}
      <div className="hidden sm:grid sm:grid-cols-3 gap-5">
        {schedules.map((item) => (
          <div
            key={item.grade}
            className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-colors flex flex-col justify-between"
          >
            <div>
              {/* Header: Grade number & Status Badge */}
              <div className="flex items-center justify-between mb-3.5">
                <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center font-semibold text-base">
                  {item.grade}
                </div>
                {item.isOpen ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Sesi Dibuka
                  </span>
                ) : (
                  <div className="text-xs font-medium px-2.5 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-700">
                    {item.day}
                  </div>
                )}
              </div>

              {/* Title & Meeting Badge */}
              <div className="flex items-center gap-2 mb-1.5">
                <h4 className="text-base font-semibold text-slate-900">
                  Kelas {item.grade} SD
                </h4>
                {item.meetingNumber && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-700">
                    Pertemuan {item.meetingNumber}
                  </span>
                )}
              </div>

              {item.title && (
                <div className="text-sm font-semibold text-slate-800 mb-2 line-clamp-1">
                  {item.title}
                </div>
              )}

              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4 line-clamp-2">
                {item.description}
              </p>
            </div>

            {/* Bottom Row: Jadwal & Tombol Aksi */}
            <div className="space-y-3 pt-3.5 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                <Clock className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {item.day}{item.dateDisplay ? `, ${item.dateDisplay}` : ''} • {item.time}
                </span>
              </div>

              <Link
                href={`/absen?grade=${item.grade}`}
                className="w-full py-2.5 px-4 rounded-lg text-white font-medium text-xs flex items-center justify-center gap-2 shadow-xs transition-colors bg-slate-900 hover:bg-slate-800 cursor-pointer"
              >
                <span>Buka Presensi Kelas {item.grade}</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
