/**
 * Utility untuk manajemen cache data lokal (localStorage)
 * Memungkinkan aplikasi menampilkan data siswa, presensi, jadwal, dan materi
 * meskipun ponsel sedang tidak memiliki koneksi internet (offline).
 */

export const OFFLINE_KEYS = {
  HOME_MEETINGS: 'pletig_offline_home_meetings',
  ALL_MEETINGS: 'pletig_offline_all_meetings',
  MATERIALS: 'pletig_offline_materials',
  ASSIGNMENTS: 'pletig_offline_assignments',
  STUDENTS: (grade: number | string) => `pletig_offline_students_kelas_${grade}`,
  ATTENDANCE: (meetingId: string) => `pletig_offline_attendance_${meetingId}`,
};

export function saveOfflineData<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    const payload = {
      timestamp: Date.now(),
      data,
    };
    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Abaikan jika localStorage penuh / kuota exceeded
  }
}

export function getOfflineData<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.data as T;
  } catch {
    return null;
  }
}
