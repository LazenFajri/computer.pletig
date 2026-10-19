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
    hour,
    minute,
    currentMinutes,
    dayOfWeek,
    dayName: map.weekday || 'Hari Ini',
    isWithinDefaultTime,
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
}

/**
 * Cek apakah sesi presensi sedang dibuka untuk kelas tertentu (Kelas 4, 5, atau 6)
 * Mematuhi batas waktu jam mulai (start_time) dan jam selesai (end_time) secara ketat.
 */
export async function checkActiveSession(gradeLevel: GradeLevel): Promise<ActiveSessionResult> {
  const wib = getWIBInfo();

  // 1. Ambil semua daftar pertemuan untuk kelas ini atau semua kelas
  const allMeetingsForGrade = await db.query.meetings.findMany({
    where: or(eq(meetings.grade_level, gradeLevel), isNull(meetings.grade_level)),
    orderBy: [desc(meetings.meeting_number), desc(meetings.created_at)],
  });

  // 2. Bersihkan/tutup otomatis pertemuan hari lalu yang masih tertulis is_open = true
  try {
    const expiredMeetings = allMeetingsForGrade.filter(
      (m) => (m.date < wib.dateStr || (m.date === wib.dateStr && wib.currentMinutes > parseTimeToMinutes(m.end_time || '14:00'))) && m.is_open
    );
    for (const exp of expiredMeetings) {
      await db
        .update(meetings)
        .set({ is_open: false, is_active: false })
        .where(eq(meetings.id, exp.id));
    }
  } catch (err) {
    // Non-blocking cleanup
  }

  // 3. Cek apakah ada sesi khusus yang dibuat untuk HARI INI
  const todayMeetings = allMeetingsForGrade.filter((m) => m.date === wib.dateStr);

  if (todayMeetings.length > 0) {
    // Cari pertemuan yang sedang dalam rentang jam aktif saat ini
    const activeMeetingsNow: (typeof meetings.$inferSelect)[] = [];
    let latestMeeting = todayMeetings[0];

    for (const m of todayMeetings) {
      const startMin = parseTimeToMinutes(m.start_time || '12:30');
      const endMin = parseTimeToMinutes(m.end_time || '14:00');

      const isWithinTime = wib.currentMinutes >= startMin && wib.currentMinutes <= endMin;

      if (m.is_open && isWithinTime) {
        activeMeetingsNow.push(m);
      }
    }

    if (activeMeetingsNow.length > 0) {
      const primary = activeMeetingsNow[0];
      return {
        isOpen: true,
        reason: 'admin_override',
        message: `Sesi dibuka: ${primary.title} (${primary.start_time} - ${primary.end_time} WIB)`,
        meeting: primary,
        openMeetings: activeMeetingsNow,
        allMeetingsForGrade,
        wibInfo: wib,
        timeStatus: 'active',
      };
    }

    // Jika ada pertemuan hari ini tapi di luar jam aktif:
    const startMin = parseTimeToMinutes(latestMeeting.start_time || '12:30');
    const endMin = parseTimeToMinutes(latestMeeting.end_time || '14:00');

    if (wib.currentMinutes < startMin) {
      return {
        isOpen: false,
        reason: 'closed',
        message: `Sesi presensi belum dibuka. Sesi dibuka pukul ${latestMeeting.start_time} WIB (Jadwal: ${latestMeeting.start_time} - ${latestMeeting.end_time} WIB).`,
        meeting: latestMeeting,
        openMeetings: [],
        allMeetingsForGrade,
        wibInfo: wib,
        timeStatus: 'not_started',
      };
    }

    if (wib.currentMinutes > endMin) {
      return {
        isOpen: false,
        reason: 'closed',
        message: `Sesi presensi hari ini telah berakhir pada pukul ${latestMeeting.end_time} WIB.`,
        meeting: latestMeeting,
        openMeetings: [],
        allMeetingsForGrade,
        wibInfo: wib,
        timeStatus: 'ended',
      };
    }

    // Jika jam masuk tapi is_open diset false oleh pembina
    return {
      isOpen: false,
      reason: 'closed',
      message: `Sesi presensi sedang ditutup sementara oleh Pembina.`,
      meeting: latestMeeting,
      openMeetings: [],
      allMeetingsForGrade,
      wibInfo: wib,
      timeStatus: 'ended',
    };
  }

  // 4. Jika tidak ada pertemuan khusus yang dibuat untuk hari ini, periksa Jadwal Rutin Sekolah
  const isCorrectDayForGrade = wib.defaultGradeToday === gradeLevel;
  const gradeScheduleDay =
    gradeLevel === 4 ? 'Kamis' : gradeLevel === 5 ? 'Selasa' : 'Senin';

  if (isCorrectDayForGrade) {
    if (wib.isWithinDefaultTime) {
      // Dalam jam 12:30 - 14:00 WIB pada hari kegiatan kelas tersebut
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
            title: `Pertemuan Rutin Kelas ${gradeLevel} (${wib.dayName})`,
            description: `Sesi terjadwal otomatis ekstrakurikuler komputer hari ${wib.dayName} pukul 12.30 - 14.00 WIB.`,
            date: wib.dateStr,
            start_time: '12:30',
            end_time: '14:00',
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
          .set({ session_token: randomToken, attendance_token: randomToken })
          .where(eq(meetings.id, scheduledMeeting.id));
        scheduledMeeting.session_token = randomToken;
        scheduledMeeting.attendance_token = randomToken;
      }

      return {
        isOpen: true,
        reason: 'scheduled',
        message: `Sesi aktif sesuai jadwal rutin Kelas ${gradeLevel} (${wib.dayName}, 12.30 - 14.00 WIB)`,
        meeting: scheduledMeeting,
        openMeetings: [scheduledMeeting],
        allMeetingsForGrade: [scheduledMeeting, ...allMeetingsForGrade],
        wibInfo: wib,
        timeStatus: 'active',
      };
    }

    if (wib.currentMinutes < 750) {
      // Sebelum jam 12:30 WIB pada hari yang sama
      return {
        isOpen: false,
        reason: 'closed',
        message: `Sesi presensi Kelas ${gradeLevel} dibuka nanti pukul 12.30 WIB sesuai jadwal rutin hari ${gradeScheduleDay}.`,
        meeting: null,
        openMeetings: [],
        allMeetingsForGrade,
        wibInfo: wib,
        timeStatus: 'not_started',
      };
    }

    // Lewat jam 14:00 WIB pada hari yang sama (misal jam 17:00 sore)
    return {
      isOpen: false,
      reason: 'closed',
      message: `Sesi presensi Kelas ${gradeLevel} hari ini telah selesai pada pukul 14.00 WIB.`,
      meeting: null,
      openMeetings: [],
      allMeetingsForGrade,
      wibInfo: wib,
      timeStatus: 'ended',
    };
  }

  // 5. Bukan hari jadwal kelas ini (misal hari Jumat, Sabtu, Minggu, atau Rabu)
  return {
    isOpen: false,
    reason: 'closed',
    message: `Hari ini (${wib.dayName}) tidak ada jadwal praktikum komputer untuk Kelas ${gradeLevel}. Jadwal rutin adalah hari ${gradeScheduleDay} pukul 12.30 - 14.00 WIB.`,
    meeting: null,
    openMeetings: [],
    allMeetingsForGrade,
    wibInfo: wib,
    timeStatus: 'no_schedule_today',
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
