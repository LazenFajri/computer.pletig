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
    ? `${relevantMeeting.start_time || '12:30'} - ${relevantMeeting.end_time || '14:00'} WIB`
    : '12:30 - 14:00 WIB (Sesi 1: 12:30-13:20 • Sesi 2: 13:20-14:00)';

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

        <div className="flex items-center gap-2">
          <Link
            href={`/absen/kelas/${grade}/${rombel}/mode`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Laptop className="w-4 h-4 text-slate-500" aria-hidden="true" />
            <span>Mode: {initialCapacity === 1 ? '1 Laptop 1 Siswa' : initialCapacity === 2 ? '1 Laptop 2 Siswa' : 'Pilih Mode Laptop'}</span>
          </Link>
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Rombel {rombel}</span>
          </div>
        </div>
      </div>

      {/* Header Title */}
      <div className="max-w-4xl mx-auto w-full text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg overflow-hidden bg-white border border-slate-200 shadow-xs mb-3">
          <img src="/logo.jpg" alt="Logo computer.pletig" className="w-full h-full object-cover" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center justify-center gap-2">
          <span>Presensi Siswa Rombel {rombel}</span>
          <GraduationCap className="w-6 h-6 text-indigo-600" aria-hidden="true" />
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-normal mt-1 max-w-lg mx-auto">
          Kelas {grade} SD SDN Pleburan 03 Semarang • Jadwal: <strong>{scheduleDay} ({scheduleTime})</strong>. Pilih namamu dan klik hadir!
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
      <footer className="text-center text-xs text-slate-400 py-4 border-t border-slate-200 max-w-4xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span>SDN Pleburan 03 Semarang</span>
        </div>
        <div>Portal computer.pletig • Jam Praktikum: 12:30 - 14:00 WIB (Sesi 1: 12:30-13:20 • Sesi 2: 13:20-14:00)</div>
      </footer>
    </div>
  );
}
