import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { checkActiveSession, getWIBInfo } from '@/lib/attendance';
import {
  GraduationCap,
  ArrowLeft,
  ArrowRight,
  Clock,
  CalendarCheck,
  CheckCircle2,
  Sparkles,
  Info,
} from 'lucide-react';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Pilih Kelas Presensi - computer.pletig SDN Pleburan 03',
  description: 'Pilih kelas praktikum komputer (Kelas 4, Kelas 5, Kelas 6) SDN Pleburan 03 Semarang untuk mengisi presensi mandiri.',
};

interface AbsenPageProps {
  searchParams?: Promise<{
    grade?: string;
  }>;
}

export default async function AbsenPage({ searchParams }: AbsenPageProps) {
  // Dukungan redirect jika ada query ?grade=4/5/6
  if (searchParams) {
    const sp = await searchParams;
    if (sp.grade && ['4', '5', '6'].includes(sp.grade)) {
      redirect(`/absen/kelas/${sp.grade}`);
    }
  }

  const currentUser = await getCurrentUser();
  const wib = getWIBInfo();

  let sess4: any = { isOpen: false, meeting: null };
  let sess5: any = { isOpen: false, meeting: null };
  let sess6: any = { isOpen: false, meeting: null };

  try {
    const [s4, s5, s6] = await Promise.all([
      checkActiveSession(4),
      checkActiveSession(5),
      checkActiveSession(6),
    ]);
    sess4 = s4;
    sess5 = s5;
    sess6 = s6;
  } catch (err) {
    console.warn('Warning: Could not fetch active sessions for grade cards:', err);
  }

  const gradeCards = [
    {
      grade: 4,
      title: 'Kelas 4 SD',
      day: 'Kamis',
      time: '12.30 - 14.00 WIB',
      href: '/absen/kelas/4',
      isOpen: Boolean(sess4.isOpen),
      meetingTitle: sess4.meeting?.title || 'Ekstrakurikuler Komputer',
      accentBorder: 'border-sky-300 hover:border-sky-500',
      badgeBg: 'bg-sky-100 text-sky-800',
      numBg: 'bg-sky-500 text-white',
      btnBg: 'bg-sky-600 hover:bg-sky-700 shadow-sky-600/20',
      description: 'Pengenalan perangkat keras, mengetik 10 jari, dan dasar aplikasi komputer.',
    },
    {
      grade: 5,
      title: 'Kelas 5 SD',
      day: 'Selasa',
      time: '12.30 - 14.00 WIB',
      href: '/absen/kelas/5',
      isOpen: Boolean(sess5.isOpen),
      meetingTitle: sess5.meeting?.title || 'Ekstrakurikuler Komputer',
      accentBorder: 'border-emerald-300 hover:border-emerald-500',
      badgeBg: 'bg-emerald-100 text-emerald-800',
      numBg: 'bg-emerald-500 text-white',
      btnBg: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20',
      description: 'Pengolah kata (Word), pengolah angka (Excel), dan internet sehat.',
    },
    {
      grade: 6,
      title: 'Kelas 6 SD',
      day: 'Senin',
      time: '12.30 - 14.00 WIB',
      href: '/absen/kelas/6',
      isOpen: Boolean(sess6.isOpen),
      meetingTitle: sess6.meeting?.title || 'Ekstrakurikuler Komputer',
      accentBorder: 'border-amber-300 hover:border-amber-500',
      badgeBg: 'bg-amber-100 text-amber-800',
      numBg: 'bg-amber-500 text-white',
      btnBg: 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20',
      description: 'Presentasi kreatif (PowerPoint), Canva grafis, dan persiapan ujian praktik.',
    },
  ];

  return (
    <div className="min-h-screen bg-playful-grid flex flex-col justify-between p-3 sm:p-6 md:p-8 pb-24 sm:pb-8 overflow-x-hidden">
      {/* Top Navbar */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between mb-4 sm:mb-6">
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
          className="inline-flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-blue-600 bg-white/90 backdrop-blur-md px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl border border-slate-200 shadow-xs transition-all hover:-translate-x-0.5"
        >
          <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>{currentUser ? 'Dashboard' : 'Beranda'}</span>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-semibold text-slate-600 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-200">
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          <span>{wib.dayName}, {wib.timeStr} WIB</span>
        </div>
      </div>

      {/* Header Title */}
      <div className="max-w-4xl mx-auto w-full text-center mb-6 sm:mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl overflow-hidden bg-white border border-slate-200 shadow-lg shadow-emerald-500/15 mb-3">
          <img src="/logo.jpg" alt="Logo computer.pletig" className="w-full h-full object-cover" />
        </div>
        <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold mb-2 border border-blue-200/60">
          <CalendarCheck className="w-3.5 h-3.5 text-blue-600" />
          <span>Presensi Praktikum Komputer</span>
        </div>
        <h1 className="font-heading text-2xl sm:text-4xl font-bold text-slate-900 flex items-center justify-center gap-2">
          <span>Pilih Kelas Kamu</span>
          <GraduationCap className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1.5 max-w-lg mx-auto">
          Klik tombol kelas di bawah ini untuk membuka halaman daftar hadir kelasmu:
        </p>
      </div>

      {/* Main Grid: 3 Large Class Cards */}
      <main className="max-w-4xl mx-auto w-full flex-1 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {gradeCards.map((card) => (
            <Link
              key={card.grade}
              href={card.href}
              className={`bg-white rounded-3xl p-5 sm:p-6 border-2 ${card.accentBorder} shadow-md shadow-blue-500/5 hover:shadow-xl hover:scale-[1.02] transition-all flex flex-col justify-between group text-left relative overflow-hidden`}
            >
              {/* Decorative background glow */}
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-slate-50 rounded-full group-hover:scale-125 transition-transform pointer-events-none"></div>

              <div className="relative z-10">
                {/* Header Card: Angka Kelas & Status Badge */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center font-heading font-bold text-2xl shadow-sm ${card.numBg}`}
                  >
                    {card.grade}
                  </div>

                  {card.isOpen ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Sesi Buka
                    </span>
                  ) : (
                    <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${card.badgeBg}`}>
                      {card.day}
                    </span>
                  )}
                </div>

                {/* Judul & Jadwal */}
                <h2 className="font-heading font-bold text-xl text-slate-900 group-hover:text-blue-600 transition-colors">
                  {card.title}
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-1 mb-3">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Hari {card.day} • {card.time}</span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mb-4 line-clamp-2">
                  {card.isOpen ? (
                    <span className="font-bold text-emerald-700">
                      Sesi Pertemuan: {card.meetingTitle}
                    </span>
                  ) : (
                    card.description
                  )}
                </p>
              </div>

              {/* Action Button */}
              <div className="relative z-10 pt-3 border-t border-slate-100">
                <div
                  className={`w-full py-3 px-4 rounded-2xl text-white font-heading font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all group-hover:translate-x-0.5 ${card.btnBg}`}
                >
                  <span>Buka Presensi Kelas {card.grade}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Panduan Singkat untuk Siswa */}
        <div className="mt-8 bg-blue-50/70 border border-blue-200/80 rounded-3xl p-4 sm:p-5 flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
            <Info className="w-5 h-5" />
          </div>
          <div className="text-xs leading-relaxed text-slate-700">
            <h3 className="font-heading font-bold text-slate-900 text-sm mb-1">
              Petunjuk Presensi Mandiri di Lab Komputer:
            </h3>
            <ul className="list-disc pl-4 space-y-1 text-slate-600">
              <li>Pilih kartu jenjang kelasmu di atas (Kelas 4, Kelas 5, atau Kelas 6).</li>
              <li>Di halaman kelas, pilih rombelmu (misal: 4A atau 4B), cari namamu, lalu klik nama tersebut.</li>
              <li>Klik tombol hijau <strong>&quot;Saya Hadir!&quot;</strong> setelah sesi dibuka oleh Kak Pembina di lab.</li>
            </ul>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 py-4 border-t border-slate-200/60 max-w-4xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span>SDN Pleburan 03 Semarang</span>
        </div>
        <div>Portal computer.pletig • Jam Praktikum: 12.30 - 14.00 WIB</div>
      </footer>
    </div>
  );
}
