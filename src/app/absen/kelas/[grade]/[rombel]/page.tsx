import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/session';
import ClassAbsenClient from '../class-absen-client';
import {
  checkActiveSession,
  getStudentsByGradeAndClass,
  getMeetingAttendances,
} from '@/lib/attendance';
import { db } from '@/db';
import { meetings } from '@/db/schema';
import { desc } from 'drizzle-orm';
import type { GradeLevel } from '@/lib/auth-types';
import { ArrowLeft, GraduationCap, Laptop } from 'lucide-react';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    grade: string;
    rombel: string;
  }>;
  searchParams?: Promise<{
    mode?: string;
    capacity?: string;
  }>;
}

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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { grade, rombel } = await params;
  return {
    title: `Presensi Siswa Rombel ${rombel} - computer.pletig SDN Pleburan 03`,
    description: `Halaman presensi mandiri praktikum ekstrakurikuler komputer Rombel ${rombel} Kelas ${grade} SD SDN Pleburan 03 Semarang.`,
  };
}

export default async function RombelAttendancePage({ params, searchParams }: PageProps) {
  const { grade: gradeParam, rombel } = await params;
  const gradeNum = parseInt(gradeParam, 10);

  if (![4, 5, 6].includes(gradeNum)) {
    redirect('/absen');
  }

  const sp = searchParams ? await searchParams : {};
  const rawMode = sp.mode || sp.capacity;
  const initialCapacity = rawMode === '1' ? 1 : rawMode === '2' ? 2 : undefined;

  const grade = gradeNum as GradeLevel;
  const currentUser = await getCurrentUser();

  let initialSession: any = {
    isOpen: false,
    reason: 'closed',
    message: '',
    meeting: null,
    openMeetings: [],
    allMeetingsForGrade: [],
    wibInfo: null,
  };
  let initialStudents: any[] = [];
  let initialAttendances: any[] = [];
  let allDbMeetings: any[] = [];

  try {
    const [sess, studs, dbMeetings] = await Promise.all([
      checkActiveSession(grade),
      getStudentsByGradeAndClass(grade, rombel === 'all' ? null : rombel),
      db.query.meetings.findMany({
        orderBy: [desc(meetings.date), desc(meetings.meeting_number)],
      }),
    ]);
    initialSession = sess;
    initialStudents = studs;
    allDbMeetings = dbMeetings || [];

    if (initialSession.meeting) {
      initialAttendances = await getMeetingAttendances(initialSession.meeting.id);
    }
  } catch (err) {
    console.warn(`Warning: Could not fetch attendance data for Grade ${grade} Rombel ${rombel}:`, err);
  }

  // Cari meeting yang relevan jika initialSession.meeting belum ada
  const relevantMeeting =
    initialSession.meeting ||
    allDbMeetings.find((m) => m.grade_level === grade || m.grade_level === null);

  const dateDetails = relevantMeeting ? getIndonesianDateDetails(relevantMeeting.date) : null;
  const defaultDay = grade === 4 ? 'Kamis' : grade === 5 ? 'Selasa' : 'Senin';
  const scheduleDay = dateDetails ? `${dateDetails.dayName}, ${dateDetails.formattedDate}` : defaultDay;
  const scheduleTime = relevantMeeting
    ? `${relevantMeeting.start_time || '12:45'} - ${relevantMeeting.end_time || '13:55'} WIB`
    : '12:45 - 13:55 WIB (Sesi 1: 12:45-13:20 • Sesi 2: 13:20-13:55)';

  return (
    <div className="min-h-screen bg-playful-grid flex flex-col justify-between p-3 sm:p-6 md:p-8 pb-24 sm:pb-8 overflow-x-hidden">
      {/* Top Navbar */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between mb-4 sm:mb-6">
        <Link
          href={`/absen?grade=${grade}`}
          className="inline-flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-blue-600 bg-white/90 backdrop-blur-md px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl border border-slate-200 shadow-xs transition-all hover:-translate-x-0.5 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Ganti Rombel</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href={`/absen/kelas/${grade}/${rombel}/mode`}
            className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-2xl transition-colors cursor-pointer"
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>Mode: {initialCapacity === 1 ? '1 Laptop 1 Siswa' : initialCapacity === 2 ? '1 Laptop 2 Siswa' : 'Pilih Mode Laptop'}</span>
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-semibold text-slate-600 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Rombel {rombel}</span>
          </div>
        </div>
      </div>

      {/* Header Title */}
      <div className="max-w-4xl mx-auto w-full text-center mb-5 sm:mb-7">
        <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl overflow-hidden bg-white border border-slate-200 shadow-lg shadow-emerald-500/15 mb-2 sm:mb-3">
          <img src="/logo.jpg" alt="Logo computer.pletig" className="w-full h-full object-cover" />
        </div>
        <h1 className="font-heading text-2xl sm:text-4xl font-bold text-slate-900 flex items-center justify-center gap-2">
          <span>Presensi Siswa Rombel {rombel}</span>
          <GraduationCap className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1 max-w-lg mx-auto">
          Kelas {grade} SD SDN Pleburan 03 Semarang • Jadwal Hari <strong>{scheduleDay} ({scheduleTime})</strong>. Cari namamu & klik hadir!
        </p>
      </div>

      {/* Main Attendance Client */}
      <main className="max-w-4xl mx-auto w-full flex-1 mb-8">
        <ClassAbsenClient
          grade={grade}
          rombel={rombel}
          initialCapacity={initialCapacity}
          currentUser={currentUser}
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
        <div>Portal computer.pletig • Jam Praktikum: 12:45 - 13:55 WIB (Sesi 1: 12:45-13:20 • Sesi 2: 13:20-13:55)</div>
      </footer>
    </div>
  );
}
