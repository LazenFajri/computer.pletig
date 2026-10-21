import { db } from '@/db';
import { meetings, attendance, users } from '@/db/schema';
import { eq, and, or, desc, asc, isNull, lt } from 'drizzle-orm';
import type { GradeLevel } from './auth-types';

export interface WIBInfo {
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // HH:mm
  hour: number;
  minute: number;
  currentMinutes: number; // hour * 60 + minute
  dayOfWeek: number; // 1=Senin, 2=Selasa, 3=Rabu, 4=Kamis, 5=Jumat, 6=Sabtu, 0=Minggu
  dayName: string; // 'Senin', 'Selasa', dst.
  isWithinDefaultTime: boolean; // 12:45 - 13:55 WIB
  activeShift: 1 | 2 | null; // Sesi 1: 12:45 - 13:20, Sesi 2: 13:20 - 13:55
  activeShiftLabel: string; // 'Sesi 1 (12:45 - 13:20 WIB)' atau 'Sesi 2 (13:20 - 13:55 WIB)'
  defaultGradeToday: GradeLevel | null; // Senin: 6, Selasa: 5, Kamis: 4
}

/**
 * Menghitung waktu WIB (Asia/Jakarta, UTC+7) secara akurat dari server
 * Jam Praktikum Terbagi Menjadi 2 Sesi:
 * - Sesi 1: 12:45 s/d 13:20 WIB (765 s/d 800 menit)
 * - Sesi 2: 13:20 s/d 13:55 WIB (800 s/d 835 menit)
 * Total rentang jam praktikum: 12:45 s/d 13:55 WIB
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

  // 12:45 = 12 * 60 + 45 = 765 menit
  // 13:20 = 13 * 60 + 20 = 800 menit
  // 13:55 = 13 * 60 + 55 = 835 menit
  const currentMinutes = hour * 60 + minute;
  const isWithinDefaultTime = currentMinutes >= 765 && currentMinutes <= 835;

  let activeShift: 1 | 2 | null = null;
  let activeShiftLabel = '';
  if (currentMinutes >= 765 && currentMinutes < 800) {
    activeShift = 1;
    activeShiftLabel = 'Sesi 1 (12:45 - 13:20 WIB)';
  } else if (currentMinutes >= 800 && currentMinutes <= 835) {
    activeShift = 2;
    activeShiftLabel = 'Sesi 2 (13:20 - 13:55 WIB)';
  }

  return {
    dateStr,
    timeStr,
    hour,
    minute,
    currentMinutes,
    dayOfWeek,
    dayName: map.weekday || 'Hari Ini',
    isWithinDefaultTime,
    activeShift,
    activeShiftLabel,
    defaultGradeToday: defaultGrade,
  };
}

/**
 * Mengubah string waktu 'HH:mm' menjadi jumlah menit sejak jam 00:00
 */
export function parseTimeToMinutes(t?: string | null): number {
  if (!t) return 0;
  const parts = t.trim().split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

export interface ActiveSessionResult {
  isOpen: boolean;
  reason: 'admin_override' | 'scheduled' | 'closed';
  message: string;
  meeting: typeof meetings.$inferSelect | null;
  openMeetings: (typeof meetings.$inferSelect)[];
  allMeetingsForGrade: (typeof meetings.$inferSelect)[];
  wibInfo: WIBInfo;
  timeStatus?: 'not_started' | 'active' | 'ended' | 'no_schedule_today';
  activeShift?: 1 | 2 | null;
  activeShiftLabel?: string;
  sessionToken?: string | null;
}

/**
 * Cek apakah sesi presensi sedang dibuka untuk kelas tertentu (Kelas 4, 5, atau 6).
 * OTOMATIS BUKA pada jam 12:45 WIB dan OTOMATIS TUTUP pada jam 13:55 WIB
 * Pembina tidak perlu membuka sesi manual di dashboard!
 */
export async function checkActiveSession(gradeLevel: GradeLevel): Promise<ActiveSessionResult> {
  const wib = getWIBInfo();

  // 1. Ambil semua daftar pertemuan untuk kelas ini atau semua kelas
  const allMeetingsForGrade = await db.query.meetings.findMany({
    where: or(eq(meetings.grade_level, gradeLevel), isNull(meetings.grade_level)),
    orderBy: [desc(meetings.meeting_number), desc(meetings.created_at)],
  });

  // 2. Bersihkan/tutup otomatis pertemuan hari lalu yang sudah kedaluwarsa
  try {
    const expiredMeetings = allMeetingsForGrade.filter(
      (m) =>
        (m.date < wib.dateStr ||
          (m.date === wib.dateStr && wib.currentMinutes > parseTimeToMinutes(m.end_time || '13:55'))) &&
        m.is_open
    );
    for (const exp of expiredMeetings) {
      await db
        .update(meetings)
        .set({ is_open: false, is_active: false })
        .where(eq(meetings.id, exp.id));
    }
  } catch {
    // Non-blocking cleanup
  }

  // 3. Cek apakah ada sesi yang dijadwalkan untuk HARI INI
  const todayMeetings = allMeetingsForGrade.filter((m) => m.date === wib.dateStr);

  if (todayMeetings.length > 0) {
    const activeMeetingsNow: (typeof meetings.$inferSelect)[] = [];
    const latestMeeting = todayMeetings[0];

    for (const m of todayMeetings) {
      const startMin = parseTimeToMinutes(m.start_time || '12:45');
      const endMin = parseTimeToMinutes(m.end_time || '13:55');

      const isWithinTime = wib.currentMinutes >= startMin && wib.currentMinutes <= endMin;

      // OTOMATIS BUKA: Jika dalam jam praktikum (12:45 - 13:55 WIB) atau jika admin override buka manual
      if (isWithinTime || m.is_open) {
        if (!m.session_token && !m.attendance_token) {
          const randomToken = Math.floor(1000 + Math.random() * 9000).toString();
          m.session_token = randomToken;
          m.attendance_token = randomToken;
          try {
            await db
              .update(meetings)
              .set({ session_token: randomToken, attendance_token: randomToken })
              .where(eq(meetings.id, m.id));
          } catch {}
        }
        activeMeetingsNow.push(m);
      }
    }

    if (activeMeetingsNow.length > 0) {
      const primary = activeMeetingsNow[0];
      const shiftName = wib.activeShiftLabel || (primary.start_time ? `${primary.start_time} - ${primary.end_time} WIB` : 'Sesi Aktif');
      const token = primary.session_token || primary.attendance_token || '4432';

      return {
        isOpen: true,
        reason: primary.is_open ? 'admin_override' : 'scheduled',
        message: `Sesi presensi otomatis dibuka: ${primary.title} (${shiftName})`,
        meeting: primary,
        openMeetings: activeMeetingsNow,
        allMeetingsForGrade,
        wibInfo: wib,
        timeStatus: 'active',
        activeShift: wib.activeShift,
        activeShiftLabel: wib.activeShiftLabel,
        sessionToken: token,
      };
    }

    // Jika ada pertemuan hari ini tapi waktu sebelum jam mulai
    const startMin = parseTimeToMinutes(latestMeeting.start_time || '12:45');
    const endMin = parseTimeToMinutes(latestMeeting.end_time || '13:55');

    if (wib.currentMinutes < startMin) {
      return {
        isOpen: false,
        reason: 'closed',
        message: `Sesi presensi belum dimulai. Sesi 1 otomatis dibuka pukul 12:45 WIB (Jadwal: Sesi 1: 12:45 - 13:20 • Sesi 2: 13:20 - 13:55 WIB).`,
        meeting: latestMeeting,
        openMeetings: [],
        allMeetingsForGrade,
        wibInfo: wib,
        timeStatus: 'not_started',
        sessionToken: latestMeeting.session_token,
      };
    }

    if (wib.currentMinutes > endMin) {
      return {
        isOpen: false,
        reason: 'closed',
        message: `Sesi presensi hari ini telah otomatis ditutup pada pukul 13:55 WIB.`,
        meeting: latestMeeting,
        openMeetings: [],
        allMeetingsForGrade,
        wibInfo: wib,
        timeStatus: 'ended',
        sessionToken: latestMeeting.session_token,
      };
    }
  }

  // 4. Jadwal Praktikum: Otomatis Buka Saat 12:45 - 13:55 WIB (Sesi 1: 12:45-13:20 • Sesi 2: 13:20-13:55)
  const isCorrectDayForGrade = wib.defaultGradeToday === gradeLevel;
  const gradeScheduleDay =
    gradeLevel === 4 ? 'Kamis' : gradeLevel === 5 ? 'Selasa' : 'Senin';

  // OTOMATIS BUKA: Jika saat ini berada di rentang jam praktikum (12:45 - 13:55 WIB)
  if (wib.isWithinDefaultTime) {
    let scheduledMeeting = await db.query.meetings.findFirst({
      where: and(
        eq(meetings.date, wib.dateStr),
        or(eq(meetings.grade_level, gradeLevel), isNull(meetings.grade_level))
      ),
    });

    if (!scheduledMeeting) {
      const countAll = await db.query.meetings.findMany();
      const newNum = countAll.length + 1;
      const randomToken = Math.floor(1000 + Math.random() * 9000).toString();
      const inserted = await db
        .insert(meetings)
        .values({
          meeting_number: newNum,
          grade_level: gradeLevel,
          title: `Praktikum Komputer Kelas ${gradeLevel} (${wib.dayName})`,
          description: `Sesi praktikum otomatis dibuka pukul 12:45 - 13:55 WIB (${wib.activeShiftLabel || 'Sesi Aktif'}).`,
          date: wib.dateStr,
          start_time: '12:45',
          end_time: '13:55',
          is_open: true,
          is_active: true,
          session_token: randomToken,
          attendance_token: randomToken,
        })
        .returning();
      scheduledMeeting = inserted[0];
    } else if (!scheduledMeeting.session_token && !scheduledMeeting.attendance_token) {
      const randomToken = Math.floor(1000 + Math.random() * 9000).toString();
      await db
        .update(meetings)
        .set({ session_token: randomToken, attendance_token: randomToken, is_open: true, is_active: true })
        .where(eq(meetings.id, scheduledMeeting.id));
      scheduledMeeting.session_token = randomToken;
      scheduledMeeting.attendance_token = randomToken;
    }

    const token = scheduledMeeting.session_token || scheduledMeeting.attendance_token || '4432';

    return {
      isOpen: true,
      reason: 'scheduled',
      message: `Sesi presensi otomatis dibuka: Kelas ${gradeLevel} (${wib.dayName}, ${wib.activeShiftLabel || '12:45 - 13:55 WIB'})`,
      meeting: scheduledMeeting,
      openMeetings: [scheduledMeeting],
      allMeetingsForGrade: [scheduledMeeting, ...allMeetingsForGrade],
      wibInfo: wib,
      timeStatus: 'active',
      activeShift: wib.activeShift,
      activeShiftLabel: wib.activeShiftLabel,
      sessionToken: token,
    };
  }

  // 5. Cek jika ada pertemuan yang dibuka manual oleh admin (override)
  const manualOpenMeeting = allMeetingsForGrade.find((m) => m.is_open);
  if (manualOpenMeeting) {
    const token = manualOpenMeeting.session_token || manualOpenMeeting.attendance_token || '4432';
    return {
      isOpen: true,
      reason: 'admin_override',
      message: `Sesi dibuka manual oleh Pembina: ${manualOpenMeeting.title}`,
      meeting: manualOpenMeeting,
      openMeetings: [manualOpenMeeting],
      allMeetingsForGrade,
      wibInfo: wib,
      timeStatus: 'active',
      activeShift: wib.activeShift,
      activeShiftLabel: wib.activeShiftLabel,
      sessionToken: token,
    };
  }

  // 6. Jika di luar jam praktikum pada hari kegiatan kelas ini
  if (isCorrectDayForGrade) {
    if (wib.currentMinutes < 765) {
      // Sebelum jam 12:45 WIB pada hari yang sama
      return {
        isOpen: false,
        reason: 'closed',
        message: `Sesi presensi Kelas ${gradeLevel} otomatis dibuka pukul 12:45 WIB (Sesi 1: 12:45 - 13:20 • Sesi 2: 13:20 - 13:55 WIB).`,
        meeting: null,
        openMeetings: [],
        allMeetingsForGrade,
        wibInfo: wib,
        timeStatus: 'not_started',
        sessionToken: null,
      };
    }

    // Lewat jam 13:55 WIB pada hari yang sama
    return {
      isOpen: false,
      reason: 'closed',
      message: `Sesi presensi Kelas ${gradeLevel} hari ini telah otomatis ditutup pada pukul 13:55 WIB.`,
      meeting: null,
      openMeetings: [],
      allMeetingsForGrade,
      wibInfo: wib,
      timeStatus: 'ended',
      sessionToken: null,
    };
  }

  // 7. Jika di luar hari jadwal reguler dan di luar jam praktikum
  return {
    isOpen: false,
    reason: 'closed',
    message: `Hari ini (${wib.dayName}) tidak ada jadwal praktikum komputer untuk Kelas ${gradeLevel}. Jadwal rutin adalah hari ${gradeScheduleDay} pukul 12:45 - 13:55 WIB (Sesi 1: 12:45-13:20 • Sesi 2: 13:20-13:55).`,
    meeting: null,
    openMeetings: [],
    allMeetingsForGrade,
    wibInfo: wib,
    timeStatus: 'no_schedule_today',
    sessionToken: null,
  };
}

/**
 * Ambil daftar nama siswa yang terdaftar di database untuk kelas dan rombel tertentu
 */
export async function getStudentsByGradeAndClass(
  gradeLevel: GradeLevel,
  className?: string | null
) {
  const conditions = [
    eq(users.role, 'siswa'),
    eq(users.grade_level, gradeLevel),
    eq(users.is_active, true),
  ];

  if (className && className !== 'all') {
    conditions.push(eq(users.class_name, className));
  }

  return db.query.users.findMany({
    where: and(...conditions),
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
 * Ambil daftar nama siswa untuk jenjang kelas tertentu
 */
export async function getStudentsByGrade(gradeLevel: GradeLevel) {
  return getStudentsByGradeAndClass(gradeLevel, null);
}

/**
 * Ambil daftar rombel/indeks yang tersedia untuk kelas tertentu (misal: ['4A', '4B'])
 */
export async function getDistinctClassesForGrade(gradeLevel: GradeLevel): Promise<string[]> {
  const students = await db.query.users.findMany({
    where: and(
      eq(users.role, 'siswa'),
      eq(users.grade_level, gradeLevel),
      eq(users.is_active, true)
    ),
    columns: {
      class_name: true,
    },
  });

  const classes = Array.from(
    new Set(students.map((s) => s.class_name).filter(Boolean))
  ).sort() as string[];

  return classes;
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
