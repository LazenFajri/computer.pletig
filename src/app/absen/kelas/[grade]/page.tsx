import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/session';
import {
  checkActiveSession,
  getDistinctClassesForGrade,
  getStudentsByGrade,
  getWIBInfo,
} from '@/lib/attendance';
import type { GradeLevel } from '@/lib/auth-types';
import {
  ArrowLeft,
  ArrowRight,
  GraduationCap,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    grade: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { grade } = await params;
  return {
    title: `Pilih Rombel Kelas ${grade} - computer.pletig SDN Pleburan 03`,
    description: `Pilih indeks rombel kelas ${grade} (misal: 4A, 4B) untuk mengisi daftar hadir praktikum komputer SDN Pleburan 03 Semarang.`,
  };
}

export default async function GradeRombelPickerPage({ params }: PageProps) {
  const { grade: gradeParam } = await params;
  const gradeNum = parseInt(gradeParam, 10);

  if (![4, 5, 6].includes(gradeNum)) {
    redirect('/absen');
  }

  const grade = gradeNum as GradeLevel;
  const currentUser = await getCurrentUser();
  const wib = getWIBInfo();

  let distinctRombels: string[] = [];
  let allStudents: any[] = [];
  let sessionStatus: any = { isOpen: false, message: '', meeting: null };

  try {
    const [rombelList, studs, sess] = await Promise.all([
      getDistinctClassesForGrade(grade),
      getStudentsByGrade(grade),
      checkActiveSession(grade),
    ]);
    distinctRombels = rombelList;
    allStudents = studs;
    sessionStatus = sess;
  } catch (err) {
    console.warn(`Warning: Could not fetch rombel data for Grade ${grade}:`, err);
  }

  // Jika tidak ada rombel tersimpan, fallback ke [grade + 'A', grade + 'B']
  if (distinctRombels.length === 0) {
    distinctRombels = [`${grade}A`, `${grade}B`];
  }

  const gradeScheduleInfo =
    grade === 4
      ? { day: 'Kamis', time: '12.30 - 14.00 WIB', color: 'sky' }
      : grade === 5
      ? { day: 'Selasa', time: '12.30 - 14.00 WIB', color: 'emerald' }
      : { day: 'Senin', time: '12.30 - 14.00 WIB', color: 'amber' };

  return (
    <div className="min-h-screen bg-playful-grid flex flex-col justify-between p-3 sm:p-6 md:p-8 pb-24 sm:pb-8 overflow-x-hidden">
      {/* Top Navbar */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between mb-4 sm:mb-6">
        <Link
          href="/absen"
          className="inline-flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-blue-600 bg-white/90 backdrop-blur-md px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl border border-slate-200 shadow-xs transition-all hover:-translate-x-0.5"
        >
          <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Ganti Jenjang Kelas</span>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-semibold text-slate-600 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-200">
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          <span>{wib.dayName}, {wib.timeStr} WIB</span>
        </div>
      </div>

      {/* Header Title */}
      <div className="max-w-4xl mx-auto w-full text-center mb-5 sm:mb-7">
        <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl overflow-hidden bg-white border border-slate-200 shadow-lg shadow-blue-500/10 mb-2 sm:mb-3">
          <img src="/logo.jpg" alt="Logo computer.pletig" className="w-full h-full object-cover" />
        </div>
        <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold mb-2 border border-blue-200/60">
          <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
          <span>Langkah 2: Pilih Indeks Rombel</span>
        </div>
        <h1 className="font-heading text-2xl sm:text-4xl font-bold text-slate-900 flex items-center justify-center gap-2">
          <span>Pilih Rombel Kelas {grade} SD</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1 max-w-lg mx-auto">
          Klik indeks rombel kelasmu ({distinctRombels.join(' atau ')}) untuk membuka form pengisian daftar hadir:
        </p>
      </div>

      <main className="max-w-4xl mx-auto w-full flex-1 mb-8 space-y-6">
        {/* Status Sesi Pertemuan Kelas Ini */}
        <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Status Jam Presensi Kelas {grade}</span>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
              Jadwal: {gradeScheduleInfo.day} ({gradeScheduleInfo.time})
            </span>
          </div>

          <div className="mt-3.5">
            {sessionStatus?.isOpen ? (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                    Sesi Buka
                  </div>
                  <h4 className="font-heading font-bold text-sm text-emerald-950">
                    {sessionStatus.meeting?.title || 'Ekstrakurikuler Komputer SDN Pleburan 03'}
                  </h4>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    {sessionStatus.message || 'Silakan pilih rombelmu di bawah untuk melakukan presensi.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-heading font-bold text-sm text-amber-950">
                    Sesi Presensi Ditutup / Belum Dibuka
                  </h4>
                  <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                    {sessionStatus?.message ||
                      `Presensi dibuka saat jam praktikum berlangsung (12.30 - 14.00 WIB) pada hari ${gradeScheduleInfo.day}.`}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pilihan Kartu Rombel (Misal 4A, 4B) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {distinctRombels.map((rombel) => {
            const studentCount = allStudents.filter((s) => s.class_name === rombel).length;
            const rombelLetter = rombel.replace(String(grade), '').trim() || rombel;

            return (
              <Link
                key={rombel}
                href={`/absen/kelas/${grade}/${rombel}`}
                className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-slate-200 hover:border-blue-500 shadow-md shadow-blue-500/5 hover:shadow-xl hover:scale-[1.02] transition-all flex flex-col justify-between group text-left relative overflow-hidden"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-heading font-bold text-2xl shadow-md shadow-blue-500/20 group-hover:scale-110 transition-transform">
                      {rombel}
                    </div>

                    <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-3 py-1 rounded-full">
                      Indeks {rombelLetter}
                    </span>
                  </div>

                  <h3 className="font-heading font-bold text-xl text-slate-900 group-hover:text-blue-600 transition-colors">
                    Rombel {rombel}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span>{studentCount} Siswa Terdaftar</span>
                  </p>

                  <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                    Daftar hadir khusus siswa rombel {rombel} SDN Pleburan 03 Semarang.
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100">
                  <div className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-heading font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all group-hover:translate-x-0.5">
                    <span>Pilih Rombel {rombel}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Link Alternatif: Gabungan Semua Rombel */}
        <div className="text-center pt-2">
          <Link
            href={`/absen/kelas/${grade}/all`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 bg-white hover:bg-blue-50 px-4 py-2 rounded-2xl border border-slate-200 transition-colors"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Lihat Gabungan Semua Siswa Kelas {grade} ({allStudents.length} Siswa)</span>
          </Link>
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
