import Link from 'next/link';
import { getCurrentUser } from '@/lib/session';
import AbsenClient from './absen-client';
import { checkActiveSession, getStudentsByGrade, getMeetingAttendances } from '@/lib/attendance';
import type { GradeLevel } from '@/lib/auth-types';
import { Laptop, ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Presensi Mandiri Siswa - computer.pletig SDN Pleburan 03',
  description: 'Halaman absen praktikum ekstrakurikuler komputer siswa SDN Pleburan 03 Semarang.',
};

export default async function AbsenPage() {
  const currentUser = await getCurrentUser();
  const initialGrade: GradeLevel = (currentUser?.grade_level as GradeLevel) || 4;

  const [initialSession, initialStudents] = await Promise.all([
    checkActiveSession(initialGrade),
    getStudentsByGrade(initialGrade),
  ]);

  let initialAttendances: any[] = [];
  if (initialSession.meeting) {
    initialAttendances = await getMeetingAttendances(initialSession.meeting.id);
  }

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
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Presensi Siswa SD</span>
        </div>
      </div>

      {/* Header Title */}
      <div className="max-w-4xl mx-auto w-full text-center mb-4 sm:mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl overflow-hidden bg-white border border-slate-200 shadow-lg shadow-emerald-500/15 mb-2 sm:mb-3">
          <img src="/logo.jpg" alt="Logo computer.pletig" className="w-full h-full object-cover" />
        </div>
        <h1 className="font-heading text-2xl sm:text-4xl font-bold text-slate-900 flex items-center justify-center gap-2">
          <span>Presensi Ekstra Komputer</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
          SDN Pleburan 03 Semarang • Pilih Kelas & Namamu untuk Mengisi Daftar Hadir
        </p>
      </div>

      {/* Main Interactive Attendance Component */}
      <main className="max-w-4xl mx-auto w-full flex-1 mb-8">
        <AbsenClient
          currentUser={currentUser}
          initialGrade={initialGrade}
          initialSession={initialSession}
          initialStudents={initialStudents}
          initialAttendances={initialAttendances}
        />
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 py-4 border-t border-slate-200/60 max-w-4xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span>SDN Pleburan 03 Semarang</span>
        </div>
        <div>Portal computer.pletig • Jam Absen: 12.30 - 14.00 WIB</div>
      </footer>
    </div>
  );
}
