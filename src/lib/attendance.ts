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

  // 1. Ambil semua daftar pertemuan untuk kelas ini atau semua kelas (urutkan dari Minggu 1, 2, dst)
  const allMeetingsForGrade = await db.query.meetings.findMany({
    where: or(eq(meetings.grade_level, gradeLevel), isNull(meetings.grade_level)),
    orderBy: [asc(meetings.meeting_number), asc(meetings.date)],
  });

  // 2. Tutup otomatis pertemuan masa lalu (sebelum hari ini) yang masih terbuka
  try {
    const pastExpired = allMeetingsForGrade.filter((m) => m.date < wib.dateStr && m.is_open);
    for (const exp of pastExpired) {
      await db
        .update(meetings)
        .set({ is_open: false, is_active: false })
        .where(eq(meetings.id, exp.id));
      exp.is_open = false;
      exp.is_active = false;
    }
  } catch {
    // Non-blocking cleanup
  }

  // 3. PRIORITAS UTAMA: Cek jika ada pertemuan yang SEDANG TERBUKA untuk kelas ini
  const openMeeting = allMeetingsForGrade.find((m) => m.is_open);
  if (openMeeting) {
    if (!openMeeting.session_token && !openMeeting.attendance_token) {
      const randomToken = Math.floor(1000 + Math.random() * 9000).toString();
      await db
        .update(meetings)
        .set({ session_token: randomToken, attendance_token: randomToken })
        .where(eq(meetings.id, openMeeting.id));
      openMeeting.session_token = randomToken;
      openMeeting.attendance_token = randomToken;
    }
    const token = openMeeting.session_token || openMeeting.attendance_token || '4432';
    return {
      isOpen: true,
      reason: 'admin_override',
      message: `Sesi presensi aktif dibuka: ${openMeeting.title} (${wib.activeShiftLabel || 'Sesi Dibuka'})`,
      meeting: openMeeting,
      openMeetings: [openMeeting],
      allMeetingsForGrade,
      wibInfo: wib,
      timeStatus: 'active',
      activeShift: wib.activeShift,
      activeShiftLabel: wib.activeShiftLabel,
      sessionToken: token,
    };
  }

  // 4. Jadwal Praktikum Mingguan:
  // - Senin: Kelas 6
  // - Selasa: Kelas 5
  // - Kamis: Kelas 4
  const isCorrectDayForGrade = wib.defaultGradeToday === gradeLevel;
  const gradeScheduleDay =
    gradeLevel === 4 ? 'Kamis' : gradeLevel === 5 ? 'Selasa' : 'Senin';

  // OTOMATIS BUKA: Jika saat ini berada di rentang jam praktikum (12:45 - 13:55 WIB) & hari kegiatan kelas ini
  if (wib.isWithinDefaultTime && isCorrectDayForGrade) {
    // Cari sesi yang SESUAI untuk hari ini secara berurutan:
    // 1. Utamakan sesi yang tanggalnya persis hari ini (misal: Minggu 1 di 2026-10-22, Minggu 2 di 2026-10-29)
    // 2. Jika tidak ada tanggal hari ini, cari sesi mendatang (date >= today) yang belum terlaksana
    const todayMeeting = allMeetingsForGrade.find((m) => m.date === wib.dateStr);
    const existingMeeting = todayMeeting || allMeetingsForGrade.find((m) => m.date >= wib.dateStr);

    const randomToken = Math.floor(1000 + Math.random() * 9000).toString();

    if (existingMeeting) {
      // BUKA SESI YANG SUDAH ADA SESUAI MINGGU TERSEBUT! JANGAN PERNAH OVERWRITE SESI LAIN!
      const token = existingMeeting.session_token || existingMeeting.attendance_token || randomToken;
      await db
        .update(meetings)
        .set({
          is_open: true,
          is_active: true,
          date: existingMeeting.date || wib.dateStr,
          start_time: '12:45',
          end_time: '13:55',
          session_token: token,
          attendance_token: token,
          updated_at: new Date(),
        })
        .where(eq(meetings.id, existingMeeting.id));

      existingMeeting.is_open = true;
      existingMeeting.is_active = true;
      existingMeeting.session_token = token;
      existingMeeting.attendance_token = token;

      return {
        isOpen: true,
        reason: 'scheduled',
        message: `Sesi presensi otomatis dibuka: ${existingMeeting.title} (Minggu ke-${existingMeeting.meeting_number || 1}, Kelas ${gradeLevel})`,
        meeting: existingMeeting,
        openMeetings: [existingMeeting],
        allMeetingsForGrade,
        wibInfo: wib,
        timeStatus: 'active',
        activeShift: wib.activeShift,
        activeShiftLabel: wib.activeShiftLabel,
        sessionToken: token,
      };
    } else {
      // Jika semua sesi yang ada sudah selesai di minggu-minggu lalu:
      // Buat sesi otomatis berurutan untuk minggu berikutnya (Minggu ke-1 -> Minggu ke-2 -> Minggu ke-3 dst)!
      const maxMeetingNum = allMeetingsForGrade.length > 0
        ? Math.max(...allMeetingsForGrade.map((m) => m.meeting_number || 1))
        : 0;
      const nextNum = maxMeetingNum + 1;

      const inserted = await db
        .insert(meetings)
        .values({
          meeting_number: nextNum,
          grade_level: gradeLevel,
          title: `Praktikum Komputer Kelas ${gradeLevel} (Minggu ke-${nextNum})`,
          description: `Sesi praktikum otomatis Minggu ke-${nextNum} dibuka pukul 12:45 - 13:55 WIB (${wib.activeShiftLabel || 'Sesi Aktif'}).`,
          date: wib.dateStr,
          start_time: '12:45',
          end_time: '13:55',
          is_open: true,
          is_active: true,
          session_token: randomToken,
          attendance_token: randomToken,
        })
        .returning();
      const createdMeeting = inserted[0];

      return {
        isOpen: true,
        reason: 'scheduled',
        message: `Sesi presensi otomatis dibuka: ${createdMeeting.title} (${wib.dayName}, ${wib.activeShiftLabel || '12:45 - 13:55 WIB'})`,
        meeting: createdMeeting,
        openMeetings: [createdMeeting],
        allMeetingsForGrade: [createdMeeting, ...allMeetingsForGrade],
        wibInfo: wib,
        timeStatus: 'active',
        activeShift: wib.activeShift,
        activeShiftLabel: wib.activeShiftLabel,
        sessionToken: randomToken,
      };
    }
  }

  // 5. Cek sesi relevan untuk informasi tampilan ketika sesi sedang tidak aktif
  const todayMeeting = allMeetingsForGrade.find((m) => m.date === wib.dateStr);
  const relevantMeeting = todayMeeting || (allMeetingsForGrade.length > 0 ? allMeetingsForGrade[0] : null);

  // Jika hari ini jadwal kelas tersebut tetapi waktu sebelum 12:45 WIB
  if (isCorrectDayForGrade && wib.currentMinutes < 765) {
    return {
      isOpen: false,
      reason: 'closed',
      message: `Sesi presensi Kelas ${gradeLevel} otomatis dibuka pukul 12:45 WIB (Sesi 1: 12:45 - 13:20 • Sesi 2: 13:20 - 13:55 WIB).`,
      meeting: relevantMeeting,
      openMeetings: [],
      allMeetingsForGrade,
      wibInfo: wib,
      timeStatus: 'not_started',
      sessionToken: relevantMeeting?.session_token || null,
    };
  }

  // Jika hari ini jadwal kelas tersebut tetapi waktu sudah lewat 13:55 WIB
  if (isCorrectDayForGrade && wib.currentMinutes > 835) {
    return {
      isOpen: false,
      reason: 'closed',
      message: `Sesi presensi Kelas ${gradeLevel} hari ini telah selesai pada pukul 13:55 WIB. Pembina dapat membuka kembali sesi sewaktu-waktu di dashboard.`,
      meeting: relevantMeeting,
      openMeetings: [],
      allMeetingsForGrade,
      wibInfo: wib,
      timeStatus: 'ended',
      sessionToken: relevantMeeting?.session_token || null,
    };
  }

  // Jika di luar hari jadwal kegiatan kelas ini
  return {
    isOpen: false,
    reason: 'closed',
    message: `Hari ini (${wib.dayName}) bukan jadwal kegiatan Kelas ${gradeLevel}. Jadwal praktikum Kelas ${gradeLevel} adalah setiap hari ${gradeScheduleDay} pukul 12:45 - 13:55 WIB.`,
    meeting: relevantMeeting,
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
