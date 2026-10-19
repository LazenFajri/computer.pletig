import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { checkActiveSession, getDistinctClassesForGrade, getWIBInfo } from '@/lib/attendance';
import { db } from '@/db';
import { meetings } from '@/db/schema';
import { desc } from 'drizzle-orm';
import type { GradeLevel } from '@/lib/auth-types';
import AbsenPortalClient from './absen-portal-client';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Presensi Praktikum Komputer - computer.pletig SDN Pleburan 03',
  description: 'Presensi mandiri praktikum komputer siswa SDN Pleburan 03 Semarang.',
};

interface AbsenPageProps {
  searchParams?: Promise<{
    grade?: string;
  }>;
}

function findRelevantMeeting(
  meetingsList: any[],
  grade: number,
  todayStr: string,
  activeSessionMeeting: any
) {
  if (activeSessionMeeting) return activeSessionMeeting;

  const applicable = meetingsList.filter(
    (m) => m.grade_level === grade || m.grade_level === null
  );

  if (applicable.length === 0) return null;

  const openMeeting = applicable.find((m) => m.is_open);
  if (openMeeting) return openMeeting;

  const todayMeeting = applicable.find((m) => m.date === todayStr);
  if (todayMeeting) return todayMeeting;

  const upcomingMeetings = applicable
    .filter((m) => m.date > todayStr)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (upcomingMeetings.length > 0) {
    const specificUpcoming = upcomingMeetings.find((m) => m.grade_level === grade);
    return specificUpcoming || upcomingMeetings[0];
  }

  const pastMeetings = applicable
    .filter((m) => m.date <= todayStr)
    .sort((a, b) => b.date.localeCompare(a.date) || (b.meeting_number || 0) - (a.meeting_number || 0));
  if (pastMeetings.length > 0) {
    const specificPast = pastMeetings.find((m) => m.grade_level === grade);
    return specificPast || pastMeetings[0];
  }

  return applicable[0];
}

export default async function AbsenPage({ searchParams }: AbsenPageProps) {
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
  let allDbMeetings: any[] = [];
  let rombels4: string[] = [];
  let rombels5: string[] = [];
  let rombels6: string[] = [];

  try {
    const [s4, s5, s6, dbMeetings, r4, r5, r6] = await Promise.all([
      checkActiveSession(4),
      checkActiveSession(5),
      checkActiveSession(6),
      db.query.meetings.findMany({
        orderBy: [desc(meetings.date), desc(meetings.meeting_number)],
      }),
      getDistinctClassesForGrade(4),
      getDistinctClassesForGrade(5),
      getDistinctClassesForGrade(6),
    ]);
    sess4 = s4;
    sess5 = s5;
    sess6 = s6;
    allDbMeetings = dbMeetings || [];
    rombels4 = r4;
    rombels5 = r5;
    rombels6 = r6;
  } catch (err) {
    console.warn('Warning: Could not fetch active sessions or meetings for grade cards:', err);
  }

  // Tentukan jenjang aktif hari ini:
  // 1. Sesi yang sedang dibuka secara manual oleh Admin/Pembina
  // 2. Jadwal hari ini (Senin = 6, Selasa = 5, Kamis = 4)
  // 3. Fallback ke Kelas 6
  const openMeeting = allDbMeetings.find((m) => m.is_open);
  const todayGrade: GradeLevel =
    (openMeeting?.grade_level as GradeLevel) ||
    (wib.defaultGradeToday as GradeLevel) ||
    6;

  // Siapkan ringkasan data sesi per jenjang
  const todayMeetings: Record<number, any> = {};
  ([4, 5, 6] as const).forEach((grade) => {
    const sess = grade === 4 ? sess4 : grade === 5 ? sess5 : sess6;
    const meeting = findRelevantMeeting(allDbMeetings, grade, wib.dateStr, sess.meeting);
    if (meeting) {
      todayMeetings[grade] = {
        id: meeting.id,
        meetingNumber: meeting.meeting_number,
        gradeLevel: meeting.grade_level,
        title: meeting.title,
        description: meeting.description,
        date: meeting.date,
        startTime: meeting.start_time,
        endTime: meeting.end_time,
        isOpen: Boolean(sess.isOpen || meeting.is_open),
        isActive: Boolean(sess.isOpen || meeting.is_active),
      };
    } else {
      todayMeetings[grade] = null;
    }
  });

  const rombelsByGrade = {
    4: rombels4.length > 0 ? rombels4 : ['4A', '4B'],
    5: rombels5.length > 0 ? rombels5 : ['5A', '5B'],
    6: rombels6.length > 0 ? rombels6 : ['6A', '6B'],
  };

  return (
    <AbsenPortalClient
      initialTodayGrade={todayGrade}
      todayMeetings={todayMeetings}
      rombelsByGrade={rombelsByGrade}
      dayName={wib.dayName}
      timeStr={wib.timeStr}
      dateStr={wib.dateStr}
      currentUser={currentUser}
    />
  );
}
