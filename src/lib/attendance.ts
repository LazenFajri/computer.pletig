import { db } from '@/db';
import { meetings, attendance, users } from '@/db/schema';
import { eq, and, or, desc, asc, isNull } from 'drizzle-orm';
import type { GradeLevel } from './auth-types';

export interface WIBInfo {
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // HH:mm
  dayOfWeek: number; // 1=Senin, 2=Selasa, 3=Rabu, 4=Kamis, 5=Jumat, 6=Sabtu, 0=Minggu
  dayName: string; // 'Senin', 'Selasa', dst.
  isWithinDefaultTime: boolean; // 12:30 - 14:00 WIB
  defaultGradeToday: GradeLevel | null; // Senin: 6, Selasa: 5, Kamis: 4
}

/**
 * Menghitung waktu WIB (Asia/Jakarta, UTC+7) secara akurat dari server
 */
export function getWIBInfo(customDate = new Date()): WIBInfo {
  const formatter = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'long',
  });

  const parts = formatter.formatToParts(customDate);
  const map: Record<string, string> = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }

  const year = map.year;
  const month = map.month;
  const day = map.day;
  const hour = parseInt(map.hour || '0', 10);
  const minute = parseInt(map.minute || '0', 10);

  const dateStr = `${year}-${month}-${day}`;
  const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

  const weekdayLower = (map.weekday || '').toLowerCase();
  let dayOfWeek = 0;
  let defaultGrade: GradeLevel | null = null;

  if (weekdayLower.includes('senin')) {
    dayOfWeek = 1;
    defaultGrade = 6; // Senin: Kelas 6
  } else if (weekdayLower.includes('selasa')) {
    dayOfWeek = 2;
    defaultGrade = 5; // Selasa: Kelas 5
  } else if (weekdayLower.includes('kamis')) {
    dayOfWeek = 4;
    defaultGrade = 4; // Kamis: Kelas 4
  } else if (weekdayLower.includes('rabu')) {
    dayOfWeek = 3;
  } else if (weekdayLower.includes('jumat')) {
    dayOfWeek = 5;
  } else if (weekdayLower.includes('sabtu')) {
    dayOfWeek = 6;
  }

  // Rentang jam 12.30 s.d 14.00 WIB
  // 12:30 = 12 * 60 + 30 = 750 menit
  // 14:00 = 14 * 60 = 840 menit
  const currentMinutes = hour * 60 + minute;
  const isWithinDefaultTime = currentMinutes >= 750 && currentMinutes <= 840;

  return {
    dateStr,
    timeStr,
    dayOfWeek,
    dayName: map.weekday || 'Hari Ini',
    isWithinDefaultTime,
    defaultGradeToday: defaultGrade,
  };
}

export interface ActiveSessionResult {
  isOpen: boolean;
  reason: 'admin_override' | 'scheduled' | 'closed';
  message: string;
  meeting: typeof meetings.$inferSelect | null;
  openMeetings: (typeof meetings.$inferSelect)[];
  allMeetingsForGrade: (typeof meetings.$inferSelect)[];
  wibInfo: WIBInfo;
}

/**
 * Cek apakah sesi presensi sedang dibuka untuk kelas tertentu (Kelas 4, 5, atau 6)
 */
export async function checkActiveSession(gradeLevel: GradeLevel): Promise<ActiveSessionResult> {
  const wib = getWIBInfo();

  // Ambil semua daftar pertemuan untuk kelas ini atau semua kelas
  const allMeetingsForGrade = await db.query.meetings.findMany({
    where: or(eq(meetings.grade_level, gradeLevel), isNull(meetings.grade_level)),
    orderBy: [desc(meetings.meeting_number), desc(meetings.created_at)],
  });

  // 1. Cek apakah ada sesi yang dibuka manual oleh Admin/Pembina (is_open = true atau is_active = true)
  const openMeetings = await db.query.meetings.findMany({
    where: and(
      or(eq(meetings.grade_level, gradeLevel), isNull(meetings.grade_level)),
      or(eq(meetings.is_open, true), eq(meetings.is_active, true))
    ),
    orderBy: [desc(meetings.meeting_number), desc(meetings.created_at)],
  });

  if (openMeetings.length > 0) {
    const primaryMeeting = openMeetings[0];
    return {
      isOpen: true,
      reason: 'admin_override',
      message: `Sesi dibuka: ${primaryMeeting.title}`,
      meeting: primaryMeeting,
      openMeetings,
      allMeetingsForGrade,
      wibInfo: wib,
    };
  }

  // 2. Cek apakah sesuai Jadwal Default (Senin=Kls 6, Selasa=Kls 5, Kamis=Kls 4 pukul 12.30 - 14.00 WIB)
  const isCorrectDayForGrade = wib.defaultGradeToday === gradeLevel;
  if (isCorrectDayForGrade && wib.isWithinDefaultTime) {
    // Cari pertemuan untuk hari ini atau buat jika belum ada
    let scheduledMeeting = await db.query.meetings.findFirst({
      where: and(
        eq(meetings.date, wib.dateStr),
        or(eq(meetings.grade_level, gradeLevel), isNull(meetings.grade_level))
      ),
    });

    if (!scheduledMeeting) {
      // Auto-create sesi pertemuan terjadwal jika belum dibuat
      const count = await db.query.meetings.findMany();
      const newNum = count.length + 1;
      const inserted = await db
        .insert(meetings)
        .values({
          meeting_number: newNum,
          grade_level: gradeLevel,
          title: `Pertemuan Rutin Kelas ${gradeLevel} (${wib.dayName})`,
          description: `Sesi terjadwal otomatis ekstrakurikuler komputer hari ${wib.dayName} pukul 12.30 - 14.00 WIB.`,
          date: wib.dateStr,
          start_time: '12:30',
          end_time: '14:00',
          is_open: true,
          is_active: true,
        })
        .returning();

      scheduledMeeting = inserted[0];
    }

    return {
      isOpen: true,
      reason: 'scheduled',
      message: `Sesi aktif sesuai jadwal rutin Kelas ${gradeLevel} (${wib.dayName}, 12.30 - 14.00 WIB)`,
      meeting: scheduledMeeting,
      openMeetings: [scheduledMeeting],
      allMeetingsForGrade: [scheduledMeeting, ...allMeetingsForGrade.filter((m) => m.id !== scheduledMeeting?.id)],
      wibInfo: wib,
    };
  }

  // 3. Sesi ditutup
  return {
    isOpen: false,
    reason: 'closed',
    message: 'Sesi absen belum dibuka atau sudah selesai. Hubungi Kak Pembina ya.',
    meeting: null,
    openMeetings: [],
    allMeetingsForGrade,
    wibInfo: wib,
  };
}

/**
 * Ambil daftar nama siswa yang terdaftar di database untuk kelas tertentu (Kelas 4, 5, atau 6)
 */
export async function getStudentsByGrade(gradeLevel: GradeLevel) {
  return db.query.users.findMany({
    where: and(
      eq(users.role, 'siswa'),
      eq(users.grade_level, gradeLevel),
      eq(users.is_active, true)
    ),
    orderBy: [asc(users.class_name), asc(users.name)],
    columns: {
      id: true,
      name: true,
      username: true,
      class_name: true,
      grade_level: true,
      avatar_url: true,
    },
  });
}

/**
 * Ambil daftar siswa yang sudah hadir di pertemuan ini
 */
export async function getMeetingAttendances(meetingId: string) {
  return db.query.attendance.findMany({
    where: eq(attendance.meeting_id, meetingId),
    orderBy: [desc(attendance.checked_in_at)],
  });
}
