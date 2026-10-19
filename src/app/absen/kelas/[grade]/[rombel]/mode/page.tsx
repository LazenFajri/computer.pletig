import { redirect } from 'next/navigation';
import LaptopModeClient from './laptop-mode-client';
import { checkActiveSession } from '@/lib/attendance';
import type { GradeLevel } from '@/lib/auth-types';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    grade: string;
    rombel: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { grade, rombel } = await params;
  return {
    title: `Pilih Mode Laptop Rombel ${rombel} - computer.pletig SDN Pleburan 03`,
    description: `Pilih konfigurasi penggunaan laptop (1 laptop 1 orang atau 1 laptop 2 orang) untuk presensi Rombel ${rombel} Kelas ${grade} SD SDN Pleburan 03.`,
  };
}

export default async function LaptopModePage({ params }: PageProps) {
  const { grade: gradeParam, rombel } = await params;
  const gradeNum = parseInt(gradeParam, 10);

  if (![4, 5, 6].includes(gradeNum)) {
    redirect('/absen');
  }

  const grade = gradeNum as GradeLevel;
  let sessionMeetingId: string | null = null;
  let sessionMeetingTitle: string | null = null;

  try {
    const session = await checkActiveSession(grade);
    if (session.meeting) {
      sessionMeetingId = session.meeting.id;
      sessionMeetingTitle = session.meeting.title;
    }
  } catch (err) {
    console.warn(`Warning: Could not fetch active session for Grade ${grade}:`, err);
  }

  return (
    <LaptopModeClient
      grade={gradeNum}
      rombel={rombel}
      meetingId={sessionMeetingId}
      meetingTitle={sessionMeetingTitle}
    />
  );
}
