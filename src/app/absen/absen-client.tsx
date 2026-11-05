'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import Link from 'next/link';
import {
  checkActiveSessionAction,
  getStudentsByGradeAction,
  getMeetingAttendancesAction,
  submitAttendanceAction,
  openQuickSessionForGradeAction,
  toggleMeetingOpenAction,
} from '@/app/actions/attendance-actions';
import type { GradeLevel, SessionUser } from '@/lib/auth-types';
import type { ActiveSessionResult } from '@/lib/attendance';
import { playSuccessChime } from '@/components/audio-feedback';
import ConfettiCelebration from '@/components/confetti';
import { saveOfflineData, getOfflineData, OFFLINE_KEYS } from '@/lib/offline-storage';
import {
  CheckCircle2,
  CalendarCheck,
  Clock,
  GraduationCap,
  Users,
  Search,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Award,
  Zap,
  Calendar,
  ShieldCheck,
  Filter,
  KeyRound,
  Laptop,
  Lock,
  Check,
} from 'lucide-react';

interface StudentItem {
  id: string;
  name: string;
  username: string;
  class_name: string | null;
  grade_level: number | null;
  avatar_url: string | null;
}

interface AttendanceItem {
  id: string;
  student_name: string;
  user_id?: string | null;
  grade_level: number;
  checked_in_at: Date | string;
}

interface AbsenClientProps {
  currentUser: SessionUser | null;
  initialGrade?: GradeLevel;
  initialSession?: ActiveSessionResult | null;
  initialStudents?: StudentItem[];
  initialAttendances?: AttendanceItem[];
}

export default function AbsenClient({
  currentUser,
  initialGrade = 4,
  initialSession = null,
  initialStudents = [],
  initialAttendances = [],
}: AbsenClientProps) {
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>(
    currentUser?.grade_level ? (currentUser.grade_level as GradeLevel) : initialGrade
  );

  const [sessionStatus, setSessionStatus] = useState<ActiveSessionResult | null>(initialSession);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(
    initialSession?.meeting?.id || null
  );
  const [studentsList, setStudentsList] = useState<StudentItem[]>(initialStudents);
  const [attendancesList, setAttendancesList] = useState<AttendanceItem[]>(initialAttendances);
  const [loadingSession, setLoadingSession] = useState(false);

  // Form input
  const [selectedRombel, setSelectedRombel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentItem | null>(null);
  const [customName, setCustomName] = useState('');

  // Submit states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    name: string;
    grade: GradeLevel;
    meetingTitle: string;
    timeStr: string;
  } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [sessionToken, setSessionToken] = useState(initialSession?.sessionToken || '');
  const [deviceStudentsCount, setDeviceStudentsCount] = useState<number>(0);
  const [deviceCapacity, setDeviceCapacity] = useState<number>(2);
  const isSubmittingRef = useRef(false);

  // Helper Deteksi Shift Otomatis (Sesi 1: 12:30-13:20 • Sesi 2: 13:20-14:00 WIB)
  const getCurrentShift = (): 1 | 2 => {
    if (sessionStatus?.activeShift === 1 || sessionStatus?.activeShift === 2) {
      return sessionStatus.activeShift;
    }
    const now = new Date();
    const wibMinutes = ((now.getUTCHours() + 7) % 24) * 60 + now.getUTCMinutes();
    return wibMinutes >= 800 ? 2 : 1; // 13:20 WIB = 800 menit
  };

  // Helper Proteksi Lapis 2: Device / Browser Session Locking (Scoped per Sesi & Rombel)
  // Sesi 1 (12:30 - 13:20) dan Sesi 2 (13:20 - 14:00) otomatis memiliki kuota mandiri pada laptop yang sama
  const getDeviceStudents = (meetingId?: string | null): string[] => {
    if (typeof window === 'undefined' || !meetingId) return [];
    try {
      const shift = getCurrentShift();
      const r = selectedRombel && selectedRombel !== 'all' ? selectedRombel : 'all';
      const scopedKey = `pletig_dev_students_${meetingId}_${r}_s${shift}`;
      const localVal = localStorage.getItem(scopedKey);
      if (localVal) {
        const parsed = JSON.parse(localVal);
        if (Array.isArray(parsed)) return parsed;
      }
      const cookieKey = `pletig_dev_att_${meetingId}_${r}_s${shift}`;
      const match = document.cookie.match(new RegExp(`(^|;\\s*)${cookieKey}=([^;]*)`));
      if (match && match[2]) {
        const parsedCookie = JSON.parse(decodeURIComponent(match[2]));
        if (Array.isArray(parsedCookie)) return parsedCookie;
      }
    } catch {
      return [];
    }
    return [];
  };

  const recordDeviceStudent = (meetingId: string, name: string) => {
    if (typeof window === 'undefined') return;
    try {
      const shift = getCurrentShift();
      const r = selectedRombel && selectedRombel !== 'all' ? selectedRombel : 'all';
      const scopedKey = `pletig_dev_students_${meetingId}_${r}_s${shift}`;
      const existing = getDeviceStudents(meetingId);
      if (!existing.some((n) => n.toLowerCase() === name.toLowerCase())) {
        existing.push(name);
      }
      localStorage.setItem(scopedKey, JSON.stringify(existing));
      setDeviceStudentsCount(existing.length);
    } catch {
      // non-blocking
    }
  };

  const [isPendingAdmin, startAdminTransition] = useTransition();

  // Load session & students data saat grade berubah
  const loadGradeData = async (grade: GradeLevel) => {
    setLoadingSession(true);
    setErrorMsg(null);
    try {
      const [session, students] = await Promise.all([
        checkActiveSessionAction(grade),
        getStudentsByGradeAction(grade),
      ]);

      setSessionStatus(session);
      if (students && students.length > 0) {
        setStudentsList(students as StudentItem[]);
        saveOfflineData(OFFLINE_KEYS.STUDENTS(grade), students);
      }

      if (session.meeting) {
        setSelectedMeetingId(session.meeting.id);
        const atts = await getMeetingAttendancesAction(session.meeting.id);
        setAttendancesList(atts as AttendanceItem[]);
      } else {
        setSelectedMeetingId(null);
        setAttendancesList([]);
      }
    } catch (err) {
      console.warn('[Absen] Network error, recovering offline cache:', err);
      // Pulihkan daftar siswa dari penyimpanan lokal perangkat jika sedang offline
      const cached = getOfflineData<StudentItem[]>(OFFLINE_KEYS.STUDENTS(grade));
      if (cached && cached.length > 0) {
        setStudentsList(cached);
        setErrorMsg(null);
      } else {
        setErrorMsg('Perangkat offline. Belum ada data siswa tersimpan di cache.');
      }
    } finally {
      setLoadingSession(false);
    }
  };

  const isFirstMount = useRef(true);

  useEffect(() => {
    if (initialStudents && initialStudents.length > 0) {
      saveOfflineData(OFFLINE_KEYS.STUDENTS(initialGrade), initialStudents);
    }

    if (isFirstMount.current) {
      isFirstMount.current = false;
      if (initialStudents.length > 0 && selectedGrade === initialGrade) {
        // Data SSR sudah ada
      } else {
        loadGradeData(selectedGrade);
      }
    } else {
      loadGradeData(selectedGrade);
    }

    // Tangkap event pull-to-refresh
    const handlePullRefresh = () => {
      loadGradeData(selectedGrade);
    };
    window.addEventListener('app:pull-to-refresh', handlePullRefresh);

    // Auto-sync realtime tiap 5 detik saat tab aktif
    const timer = setInterval(() => {
      if (document.hidden) return;
      loadGradeData(selectedGrade);
    }, 5000);

    return () => {
      window.removeEventListener('app:pull-to-refresh', handlePullRefresh);
      clearInterval(timer);
    };
  }, [selectedGrade]);

  useEffect(() => {
    try {
      const saved = selectedMeetingId
        ? localStorage.getItem(`pletig_laptop_capacity_${selectedMeetingId}`)
        : localStorage.getItem('pletig_laptop_capacity');
      if (saved === '1' || saved === '2') {
        setDeviceCapacity(Number(saved));
      }
    } catch {}
  }, [selectedMeetingId]);

  useEffect(() => {
    if (selectedMeetingId) {
      setDeviceStudentsCount(getDeviceStudents(selectedMeetingId).length);
    }
  }, [selectedMeetingId, selectedRombel, sessionStatus?.activeShift]);

  const handleGradeChange = (grade: GradeLevel) => {
    setSelectedGrade(grade);
    setSelectedRombel('all');
    setSelectedStudent(null);
    setCustomName('');
    setSearchQuery('');
    setErrorMsg(null);
    setSuccessData(null);
  };

  // Ambil daftar rombel yang tersedia untuk kelas yang dipilih (misal: ['4A', '4B'])
  const availableRombels = Array.from(
    new Set(studentsList.map((s) => s.class_name).filter(Boolean))
  ).sort() as string[];

  // Hitung jumlah siswa per rombel
  const getRombelCount = (rombel: string) => {
    return studentsList.filter((s) => s.class_name === rombel).length;
  };

  // Cek apakah siswa tertentu sudah tercatat hadir di pertemuan aktif ini
  const getStudentAttendanceRecord = (student: StudentItem | null) => {
    if (!student) return null;
    return (
      attendancesList.find(
        (a) =>
          (a.user_id && a.user_id === student.id) ||
          a.student_name.trim().toLowerCase() === student.name.trim().toLowerCase()
      ) || null
    );
  };

  const selectedStudentAttendance = getStudentAttendanceRecord(selectedStudent);
  const isSelectedStudentAttended = Boolean(selectedStudentAttendance);
  const attendedTimeString = selectedStudentAttendance
    ? new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(selectedStudentAttendance.checked_in_at)) + ' WIB'
    : '';

  // Eksekusi Submit Presensi (Dukungan Auto-Submit Saat Token Terisi)
  const executeSubmit = async (targetStudent: StudentItem, tokenToUse: string) => {
    if (isSubmittingRef.current) return;

    if (!targetStudent) {
      setErrorMsg('Kamu belum memilih namamu! Silakan cari & klik namamu pada daftar siswa di atas.');
      return;
    }

    const attRecord = getStudentAttendanceRecord(targetStudent);
    if (attRecord) {
      const timeFormatted = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(attRecord.checked_in_at)) + ' WIB';
      setErrorMsg(
        `Nama "${targetStudent.name}" sudah tercatat hadir pada pertemuan ini (${timeFormatted}). Kamu tidak bisa absen dua kali ya!`
      );
      return;
    }

    const finalName = targetStudent.name;
    const deviceStudents = getDeviceStudents(selectedMeetingId);
    const normFinalName = finalName.toLowerCase();
    const isAlreadyOnThisDevice = deviceStudents.some((n) => n.toLowerCase() === normFinalName);
    if (deviceStudents.length >= deviceCapacity && !isAlreadyOnThisDevice) {
      setErrorMsg(
        `Laptop ini sudah dipakai absen ${deviceCapacity} orang (${deviceCapacity === 1 ? '1 Laptop 1 Siswa' : '1 Laptop 2 Siswa'}). Silakan gunakan laptop lain atau minta bantuan Kak Pembina!`
      );
      return;
    }

    const cleanToken = tokenToUse.trim();
    if (!cleanToken) {
      setErrorMsg('Kode Token Sesi wajib diisi! Masukkan 4 angka token yang ditampilkan di layar.');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);
    isSubmittingRef.current = true;

    try {
      const res = await submitAttendanceAction({
        gradeLevel: selectedGrade,
        studentName: finalName,
        studentUserId: targetStudent.id || null,
        meetingId: selectedMeetingId,
        sessionToken: cleanToken,
        laptopCapacity: deviceCapacity,
        className: selectedRombel && selectedRombel !== 'all' ? selectedRombel : (targetStudent.class_name || null),
        shift: getCurrentShift(),
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Presensi gagal dicatat.');
        setIsSubmitting(false);
        isSubmittingRef.current = false;
        return;
      }

      playSuccessChime();
      setShowConfetti(true);

      if (selectedMeetingId) {
        recordDeviceStudent(selectedMeetingId, finalName);
      }

      const nowTime = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date());

      const chosenMeeting =
        sessionStatus?.openMeetings?.find((m) => m.id === selectedMeetingId) ||
        sessionStatus?.meeting;

      setSuccessData({
        name: finalName,
        grade: selectedGrade,
        meetingTitle: chosenMeeting?.title || 'Ekstrakurikuler Komputer',
        timeStr: `${nowTime} WIB`,
      });

      if (selectedMeetingId) {
        const atts = await getMeetingAttendancesAction(selectedMeetingId);
        setAttendancesList(atts as AttendanceItem[]);
      }
    } catch {
      setErrorMsg('Terjadi kendala jaringan. Coba tekan tombol sekali lagi.');
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  const handleTokenChange = (val: string) => {
    const formatted = val.replace(/[^0-9a-zA-Z]/g, '').toUpperCase();
    setSessionToken(formatted);
    setErrorMsg(null);

    // Otomatis Submit: Saat token 4 karakter terisi & siswa sudah dipilih
    if (formatted.length === 4 && selectedStudent && !isSelectedStudentAttended) {
      executeSubmit(selectedStudent, formatted);
    }
  };

  const handleAutoFillToken = (tokenVal: string) => {
    if (!tokenVal) return;
    const clean = tokenVal.trim().toUpperCase();
    setSessionToken(clean);
    setErrorMsg(null);

    // Otomatis Submit jika siswa sudah dipilih
    if (selectedStudent && !isSelectedStudentAttended) {
      executeSubmit(selectedStudent, clean);
    }
  };

  // Pilih siswa dari list auto-suggest
  const handleSelectStudent = (student: StudentItem) => {
    setSelectedStudent(student);
    setCustomName(student.name);
    setSearchQuery(student.name);
    setErrorMsg(null);

    const attRecord = getStudentAttendanceRecord(student);
    // Otomatis Submit: Jika siswa dipilih dan token sudah terisi (>= 4 karakter)
    const effectiveToken = sessionToken.trim() || sessionStatus?.sessionToken || '';
    if (!attRecord && effectiveToken.length >= 4) {
      if (!sessionToken.trim()) {
        setSessionToken(effectiveToken);
      }
      executeSubmit(student, effectiveToken);
    }
  };

  const handleClearSelectedStudent = () => {
    setSelectedStudent(null);
    setCustomName('');
    setSearchQuery('');
    setErrorMsg(null);
  };

  // Filter daftar siswa berdasarkan rombel & ketikan pencarian
  const filteredStudents = studentsList.filter((s) => {
    // Filter rombel jika dipilih
    if (selectedRombel !== 'all' && s.class_name !== selectedRombel) {
      return false;
    }
    // Filter pencarian teks nama, username, atau rombel
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      s.name.toLowerCase().includes(q) ||
      s.username.toLowerCase().includes(q) ||
      (s.class_name || '').toLowerCase().includes(q)
    );
  });

  // Submit presensi (WAJIB memilih siswa yang terdaftar)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      setErrorMsg('Kamu belum memilih namamu! Silakan cari & klik namamu pada daftar siswa di atas.');
      return;
    }
    const tokenToUse = sessionToken.trim() || sessionStatus?.sessionToken || '';
    executeSubmit(selectedStudent, tokenToUse);
  };

  const handleResetForNextStudent = () => {
    setSuccessData(null);
    setShowConfetti(false);
    setSelectedStudent(null);
    setCustomName('');
    setSearchQuery('');
    setSelectedRombel('all');
    setErrorMsg(null);
    loadGradeData(selectedGrade);
  };

  // Admin Override Action: Buka sesi cepat
  const handleAdminOpenSession = () => {
    startAdminTransition(async () => {
      await openQuickSessionForGradeAction(selectedGrade);
      loadGradeData(selectedGrade);
    });
  };

  const handleAdminToggleOpen = (isOpen: boolean) => {
    if (!sessionStatus?.meeting) return;
    startAdminTransition(async () => {
      await toggleMeetingOpenAction(sessionStatus.meeting!.id, isOpen);
      loadGradeData(selectedGrade);
    });
  };

  const isSuperadmin = currentUser?.role === 'superadmin';

  const activeMeeting =
    sessionStatus?.openMeetings?.find((m) => m.id === selectedMeetingId) ||
    sessionStatus?.meeting;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <ConfettiCelebration active={showConfetti} onFinish={() => setShowConfetti(false)} />

      {/* Bagian 1: Pilih Kelas */}
      <div className="bg-white rounded-xl p-4 sm:p-6 border border-slate-200 shadow-xs">
        <div className="text-center mb-3 sm:mb-6">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md">
            Langkah 1
          </span>
          <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-slate-900 mt-1 sm:mt-2 flex items-center justify-center gap-1.5 sm:gap-2">
            <span>Pilih Kelas Kamu</span>
            <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-slate-700" />
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1">
            Klik tombol kelas sesuai kelasmu di SDN Pleburan 03:
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3.5">
          {/* Kelas 4 */}
          <button
            type="button"
            onClick={() => handleGradeChange(4)}
            className={`p-2.5 sm:p-4 rounded-xl border transition-colors text-center sm:text-left flex flex-col sm:flex-row items-center sm:items-start gap-1.5 sm:gap-3 cursor-pointer ${
              selectedGrade === 4
                ? 'border-slate-900 bg-slate-50 shadow-xs ring-1 ring-slate-900'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div
              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center font-bold text-sm sm:text-base shrink-0 ${
                selectedGrade === 4 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              4
            </div>
            <div>
              <div className="text-xs sm:text-base font-bold text-slate-900">Kelas 4</div>
              <div className="text-[10px] sm:text-xs text-slate-500 font-medium">
                <span className="font-semibold text-slate-800">Kamis</span>
                <span className="hidden sm:inline"> (12:45 - 13:55 WIB)</span>
              </div>
            </div>
          </button>

          {/* Kelas 5 */}
          <button
            type="button"
            onClick={() => handleGradeChange(5)}
            className={`p-2.5 sm:p-4 rounded-xl border transition-colors text-center sm:text-left flex flex-col sm:flex-row items-center sm:items-start gap-1.5 sm:gap-3 cursor-pointer ${
              selectedGrade === 5
                ? 'border-slate-900 bg-slate-50 shadow-xs ring-1 ring-slate-900'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div
              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center font-bold text-sm sm:text-base shrink-0 ${
                selectedGrade === 5 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              5
            </div>
            <div>
              <div className="text-xs sm:text-base font-bold text-slate-900">Kelas 5</div>
              <div className="text-[10px] sm:text-xs text-slate-500 font-medium">
                <span className="font-semibold text-slate-800">Selasa</span>
                <span className="hidden sm:inline"> (12:45 - 13:55 WIB)</span>
              </div>
            </div>
          </button>

          {/* Kelas 6 */}
          <button
            type="button"
            onClick={() => handleGradeChange(6)}
            className={`p-2.5 sm:p-4 rounded-xl border transition-colors text-center sm:text-left flex flex-col sm:flex-row items-center sm:items-start gap-1.5 sm:gap-3 cursor-pointer ${
              selectedGrade === 6
                ? 'border-slate-900 bg-slate-50 shadow-xs ring-1 ring-slate-900'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div
              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center font-bold text-sm sm:text-base shrink-0 ${
                selectedGrade === 6 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              6
            </div>
            <div>
              <div className="text-xs sm:text-base font-bold text-slate-900">Kelas 6</div>
              <div className="text-[10px] sm:text-xs text-slate-500 font-medium">
                <span className="font-semibold text-slate-800">Senin</span>
                <span className="hidden sm:inline"> (12:45 - 13:55 WIB)</span>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Bagian 2: Status Sesi Pertemuan */}
      <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-700" />
            <h3 className="font-bold text-base sm:text-lg text-slate-900">
              Status Presensi Kelas {selectedGrade}
            </h3>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span>Waktu Sekarang:</span>
            <span className="font-semibold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
              {sessionStatus?.wibInfo?.dayName || 'Hari Ini'}, {sessionStatus?.wibInfo?.timeStr || '--:--'} WIB
            </span>
          </div>
        </div>

        {/* Loading status */}
        {loadingSession ? (
          <div className="py-8 text-center text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-slate-500" />
            <span className="text-xs">Memeriksa jadwal dan sesi aktif...</span>
          </div>
        ) : sessionStatus?.isOpen ? (
          /* Sesi Sedang DIBUKA */
          <div className="mt-4 p-4 sm:p-5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 bg-emerald-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                      Sesi Terbuka
                    </span>
                    <span className="text-xs font-medium text-emerald-800">
                      {sessionStatus.reason === 'admin_override' ? 'Override Manual Pembina' : 'Sesuai Jadwal'}
                    </span>
                  </div>
                  <h4 className="font-bold text-base sm:text-lg text-emerald-950 mt-1">
                    {activeMeeting?.title || 'Ekstrakurikuler Komputer SDN Pleburan 03'}
                  </h4>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    {activeMeeting?.description || 'Silakan masukkan namamu untuk absen sekarang.'}
                  </p>
                </div>
              </div>

              {/* Admin controls */}
              {isSuperadmin && activeMeeting && (
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href="/admin/dashboard"
                    className="text-xs font-bold text-purple-900 bg-purple-100 hover:bg-purple-200 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
                    <span className="hidden sm:inline">Kelola Sesi</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleAdminToggleOpen(false)}
                    disabled={isPendingAdmin}
                    className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 rounded-xl transition-colors shadow-xs cursor-pointer"
                  >
                    {isPendingAdmin ? 'Menutup...' : 'Tutup Sesi'}
                  </button>
                </div>
              )}
            </div>

            {/* Switcher jika ada lebih dari 1 sesi terbuka untuk kelas ini */}
            {sessionStatus.openMeetings && sessionStatus.openMeetings.length > 1 && (
              <div className="pt-3 border-t border-emerald-200/80">
                <div className="text-xs font-bold text-emerald-950 mb-2 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Pilih Sesi Pertemuan yang Ingin Kamu Hadiri:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {sessionStatus.openMeetings.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setSelectedMeetingId(m.id);
                        getMeetingAttendancesAction(m.id).then((atts) =>
                          setAttendancesList(atts as AttendanceItem[])
                        );
                      }}
                      className={`text-xs px-3 py-1.5 rounded-xl font-heading font-bold transition-all cursor-pointer ${
                        selectedMeetingId === m.id
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'bg-white text-emerald-900 border border-emerald-300 hover:bg-emerald-100'
                      }`}
                    >
                      Pertemuan {m.meeting_number}: {m.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Sesi DITUTUP */
          <div className="mt-4 p-4 sm:p-5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-base text-amber-950">
                  Sesi Presensi Belum Dibuka atau Sudah Selesai
                </h4>
                <p className="text-xs sm:text-sm text-amber-800 mt-1 leading-relaxed">
                  Presensi otomatis dibuka saat jam kegiatan ekstrakurikuler (pukul 12:45 s.d 13:55 WIB: Sesi 1: 12:45-13:20 • Sesi 2: 13:20-13:55) sesuai jadwal kelasmu, atau jika dibuka manual oleh Pembina di lab.
                </p>

                {/* Jadwal ringkas */}
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
                  <span className="bg-amber-100 text-amber-900 px-2.5 py-1 rounded-md border border-amber-200">
                    Senin: Kelas 6
                  </span>
                  <span className="bg-amber-100 text-amber-900 px-2.5 py-1 rounded-md border border-amber-200">
                    Selasa: Kelas 5
                  </span>
                  <span className="bg-amber-100 text-amber-900 px-2.5 py-1 rounded-md border border-amber-200">
                    Kamis: Kelas 4
                  </span>
                  <span className="bg-amber-200/80 text-amber-900 font-bold px-2.5 py-1 rounded-md border border-amber-300">
                    12:45 - 13:55 WIB (Sesi 1: 12:45-13:20 • Sesi 2: 13:20-13:55)
                  </span>
                </div>
              </div>
            </div>

            {/* Admin Force Open Button & Dashboard Link */}
            {isSuperadmin && (
              <div className="mt-4 pt-3 border-t border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  Mode Pembina: Ingin buka sesi kelas ini sekarang di luar jadwal?
                </span>

                <div className="flex items-center gap-2">
                  <Link
                    href="/admin/dashboard"
                    className="text-xs font-bold text-purple-800 bg-purple-100 hover:bg-purple-200 px-3 py-2 rounded-xl transition-colors flex items-center gap-1"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
                    <span>Kelola Semua Sesi</span>
                  </Link>

                  <button
                    type="button"
                    onClick={handleAdminOpenSession}
                    disabled={isPendingAdmin}
                    className="text-xs bg-purple-600 hover:bg-purple-700 text-white font-heading font-bold px-4 py-2 rounded-xl transition-all shadow-md shadow-purple-600/20 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>{isPendingAdmin ? 'Membuka...' : 'Buka Sesi Kelas Ini'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bagian 3: Formulir Presensi & Input Nama Siswa */}
      <div className="bg-white rounded-xl p-5 sm:p-7 border border-slate-200 shadow-xs">
        {/* Tampilan Sukses */}
        {successData ? (
          <div className="text-center py-6 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 bg-emerald-600 text-white rounded-lg mx-auto flex items-center justify-center shadow-xs mb-3">
              <CheckCircle2 className="w-7 h-7" aria-hidden="true" />
            </div>
            <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full text-xs font-medium mb-2 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
              Presensi Berhasil Dicatat
            </div>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mb-1">
              Terima Kasih, {successData.name}!
            </h3>
            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                <Laptop className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                <span>
                  Siswa ke-{deviceStudentsCount || 1} di laptop ini (Batas {deviceCapacity} siswa per laptop)
                </span>
              </span>
            </div>

            <div className="mt-5">
              {deviceStudentsCount >= deviceCapacity ? (
                <div className="p-3 bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs max-w-sm mx-auto font-medium flex items-center justify-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
                  <span>Kuota presensi laptop ini telah selesai ({deviceStudentsCount}/{deviceCapacity} siswa). Selamat belajar!</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleResetForNextStudent}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-medium px-5 py-2.5 rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 mx-auto cursor-pointer"
                >
                  <span>Absen untuk Teman Sebangku (Maks 1 orang lagi)</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-blue-600" />
                    Langkah 2: Pilih Rombel & Namamu
                  </label>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pilih rombelmu atau ketik namamu, lalu <strong>klik kotak namamu</strong> agar tombol hadir aktif.
                  </p>
                </div>

                {selectedStudent && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-full animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Namamu Terpilih: {selectedStudent.name}
                  </span>
                )}
              </div>

              {/* Filter Rombel Pills (4A, 4B, 5A, dst) */}
              {availableRombels.length > 0 && (
                <div className="mb-4">
                  <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-blue-600" />
                    <span>Pilih Rombel / Kelas:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedRombel('all')}
                      className={`text-xs px-3.5 py-2 rounded-xl font-heading font-bold transition-all cursor-pointer ${
                        selectedRombel === 'all'
                          ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/30'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                      }`}
                    >
                      Semua Rombel ({studentsList.length})
                    </button>
                    {availableRombels.map((rombel) => {
                      const count = getRombelCount(rombel);
                      const isSelected = selectedRombel === rombel;
                      return (
                        <button
                          key={rombel}
                          type="button"
                          onClick={() => setSelectedRombel(rombel)}
                          className={`text-xs px-3.5 py-2 rounded-xl font-heading font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-sky-600 text-white shadow-sm ring-2 ring-sky-500/30'
                              : 'bg-white hover:bg-sky-50 text-slate-700 border border-slate-200 hover:border-sky-300'
                          }`}
                        >
                          Rombel {rombel} ({count} siswa)
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tampilan Siswa Terpilih (Jika sudah diklik) */}
              {selectedStudent ? (
                isSelectedStudentAttended ? (
                  /* Kartu Jika Siswa Ini SUDAH TERCATAT HADIR */
                  <div className="p-4 bg-emerald-50/90 border-2 border-emerald-400 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs mb-4 animate-in fade-in">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-bold font-heading text-lg shrink-0 shadow-xs">
                        <CheckCircle2 className="w-7 h-7 text-emerald-200" />
                      </div>
                      <div>
                        <div className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-emerald-900 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                          Sudah Hadir Hari Ini ({attendedTimeString})
                        </div>
                        <h4 className="font-heading font-bold text-lg text-slate-800 mt-0.5">
                          {selectedStudent.name}
                        </h4>
                        <div className="text-xs text-slate-600 font-medium">
                          Rombel: <span className="font-bold text-slate-800">{selectedStudent.class_name || `Kelas ${selectedGrade}`}</span> • Status: <span className="text-emerald-700 font-bold">Presensi telah tercatat</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleClearSelectedStudent}
                      className="text-xs bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 font-bold px-3.5 py-2 rounded-xl border border-slate-300 transition-colors shadow-xs flex items-center justify-center gap-1.5 self-start sm:self-auto cursor-pointer"
                    >
                      <span>Pilih Siswa Lain</span>
                    </button>
                  </div>
                ) : (
                  /* Kartu Jika Siswa Belum Hadir (Siap Absen) */
                  <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs mb-4 animate-in fade-in">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-base shrink-0">
                        {selectedStudent.name.charAt(0)}
                      </div>
                      <div>
                        <div className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Siswa Terpilih (Siap Absen)
                        </div>
                        <h4 className="font-bold text-base sm:text-lg text-slate-900 mt-0.5">
                          {selectedStudent.name}
                        </h4>
                        <div className="text-xs text-slate-600 font-medium">
                          Rombel: <span className="font-semibold text-emerald-800">{selectedStudent.class_name || `Kelas ${selectedGrade}`}</span> • Akun: <span className="font-mono text-slate-500">{selectedStudent.username}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleClearSelectedStudent}
                      className="text-xs bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 font-bold px-3.5 py-2 rounded-xl border border-rose-200 transition-colors shadow-xs flex items-center justify-center gap-1.5 self-start sm:self-auto cursor-pointer"
                    >
                      <span>Ganti Nama Lain</span>
                    </button>
                  </div>
                )
              ) : (
                /* Input Pencarian Nama jika belum ada yang terpilih */
                <div className="relative mb-3">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder={`Ketik namamu di sini (misal: ${studentsList[0]?.name?.split(' ')[0] || 'Abizar'} / ${studentsList[1]?.name?.split(' ')[0] || 'Aditia'})...`}
                    className="w-full pl-12 pr-14 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-heading font-bold text-base sm:text-lg placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      Hapus
                    </button>
                  )}
                </div>
              )}

              {/* Daftar Pilihan Nama Siswa */}
              <div className="mt-2">
                <div className="text-[11px] font-semibold text-slate-500 mb-2 flex items-center justify-between">
                  <span>
                    {selectedStudent
                      ? 'Klik nama lain jika ingin mengganti:'
                      : `Klik namamu dari daftar ${selectedRombel === 'all' ? `Kelas ${selectedGrade}` : `Rombel ${selectedRombel}`} (${filteredStudents.length} siswa ditemukan):`}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto p-2 bg-slate-50/70 rounded-2xl border border-slate-200/80">
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((s) => {
                      const isSelected = selectedStudent?.id === s.id;
                      const attRecord = getStudentAttendanceRecord(s);
                      const isAttended = Boolean(attRecord);
                      const attTime = attRecord
                        ? new Intl.DateTimeFormat('id-ID', {
                            timeZone: 'Asia/Jakarta',
                            hour: '2-digit',
                            minute: '2-digit',
                          }).format(new Date(attRecord.checked_in_at)) + ' WIB'
                        : '';

                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => handleSelectStudent(s)}
                          className={`text-xs px-3.5 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 cursor-pointer ${
                            isSelected && isAttended
                              ? 'bg-slate-200 text-slate-900 border border-slate-400 font-semibold'
                              : isSelected
                              ? 'bg-slate-900 text-white font-medium shadow-xs'
                              : isAttended
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs'
                              : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs'
                          }`}
                        >
                          {isSelected && !isAttended ? (
                            <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                          ) : isAttended ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                              {s.name.charAt(0)}
                            </div>
                          )}
                          <span className="font-heading font-semibold">{s.name}</span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-md font-medium inline-flex items-center gap-1 ${
                              isSelected && !isAttended
                                ? 'bg-slate-900 text-white'
                                : isAttended
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {isAttended ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-700 inline" aria-hidden="true" />
                                <span>Hadir {attTime}</span>
                              </>
                            ) : (
                              s.class_name || `${selectedGrade}`
                            )}
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="text-xs text-slate-500 italic py-4 px-3 w-full text-center">
                      Tidak ada siswa yang cocok dengan kata kunci &quot;{searchQuery}&quot; di {selectedRombel === 'all' ? `Kelas ${selectedGrade}` : `Rombel ${selectedRombel}`}.
                      <br />
                      <span className="text-[11px] text-slate-400 not-italic">
                        Pastikan ejaan namamu benar atau klik tombol &quot;Semua Rombel&quot; di atas.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Lapis Proteksi 1 & 2: Token Sesi Dinamis & Device Locking */}
            <div className="bg-slate-50 rounded-xl p-4 sm:p-5 border border-slate-200 space-y-3.5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold shrink-0">
                    <KeyRound className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-semibold text-slate-900 flex items-center gap-1.5 flex-wrap">
                      <span>Kode Token Sesi Lab</span>
                      <span className="text-[10px] font-medium bg-slate-200 text-slate-800 px-2 py-0.5 rounded uppercase">
                        Wajib
                      </span>
                      {sessionStatus?.activeShiftLabel && (
                        <span className="text-[10px] font-medium bg-slate-200 text-slate-700 border border-slate-300 px-2 py-0.5 rounded">
                          {sessionStatus.activeShiftLabel}
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Token aktif ditampilkan di bawah. Kamu bisa langsung ketik atau klik tombol isi otomatis.
                    </p>
                  </div>
                </div>

                {/* Device locking status badge */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white border border-slate-200 text-slate-700 shadow-xs shrink-0">
                  <Laptop className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                  <span>Laptop ini: {deviceStudentsCount}/{deviceCapacity} Siswa (Sesi {getCurrentShift()})</span>
                </div>
              </div>

              {/* Banner Tampilan Token Aktif untuk Siswa */}
              {sessionStatus?.sessionToken && (
                <div className="p-3 bg-white border border-slate-200 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-2.5 shadow-xs">
                  <div className="flex items-center gap-2 text-center sm:text-left">
                    <span className="text-xs font-medium text-slate-600">Kode Token Sesi Ini:</span>
                    <span className="font-mono text-xl font-bold tracking-widest text-slate-900 bg-slate-100 px-3 py-1 rounded-md border border-slate-200">
                      {sessionStatus.sessionToken}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAutoFillToken(sessionStatus.sessionToken || '')}
                    className="w-full sm:w-auto px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <Zap className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Isi Token Otomatis</span>
                  </button>
                </div>
              )}

              <div className="relative max-w-xs mx-auto">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder={sessionStatus?.sessionToken ? `Ketik: ${sessionStatus.sessionToken}` : 'Contoh: 7821'}
                  value={sessionToken}
                  onChange={(e) => handleTokenChange(e.target.value)}
                  className="w-full text-center text-2xl tracking-[0.35em] font-mono font-bold py-2 px-3 rounded-lg border border-slate-300 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none uppercase bg-white text-slate-900 placeholder:tracking-normal placeholder:font-sans placeholder:text-xs placeholder:text-slate-400 placeholder:font-normal"
                />
              </div>

              <p className="text-center text-[11px] text-slate-500 font-normal">
                <Zap className="w-3.5 h-3.5 text-indigo-600 inline mr-1" aria-hidden="true" />
                <strong>Otomatis Hadir:</strong> Saat 4 angka token terisi dan namamu dipilih, presensi langsung tersimpan otomatis.
              </p>

              {deviceStudentsCount >= deviceCapacity && !getDeviceStudents(selectedMeetingId).some((n) => n.toLowerCase() === (selectedStudent?.name || '').toLowerCase()) && (
                <div className="p-3 rounded-lg bg-amber-50 text-amber-900 text-xs flex items-center gap-2.5 font-medium border border-amber-200">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
                  <span>
                    Laptop ini sudah dipakai absen {deviceCapacity} orang ({deviceCapacity === 1 ? '1 Laptop 1 Siswa' : '1 Laptop 2 Siswa'}) untuk Sesi {getCurrentShift()}. Pergantian ke sesi berikutnya otomatis dibuka sesuai jam lab (Sesi 1: 12:30-13:20 • Sesi 2: 13:20-14:00 WIB).
                  </span>
                </div>
              )}
            </div>

            {/* Error Message Box */}
            {errorMsg && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs sm:text-sm flex items-start gap-3 animate-in fade-in">
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" aria-hidden="true" />
                <div>{errorMsg}</div>
              </div>
            )}

            {/* Status Auto-Submitting Indicator */}
            {isSubmitting && (
              <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-800 font-medium flex items-center justify-center gap-2.5">
                <span className="w-4 h-4 border-2 border-slate-700 border-t-transparent rounded-full animate-spin"></span>
                <span>Mencatat kehadiran otomatis untuk {selectedStudent?.name || 'Siswa'}...</span>
              </div>
            )}

            {/* Tombol Besar Submit: Saya Hadir! */}
            <div>
              {!selectedStudent && sessionStatus?.isOpen && (
                <div className="mb-3 p-3 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
                  <span>
                    <strong>Pilih Namamu:</strong> Cari dan klik namamu pada daftar siswa di atas terlebih dahulu.
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  !sessionStatus?.isOpen ||
                  !selectedStudent ||
                  isSelectedStudentAttended ||
                  (deviceStudentsCount >= deviceCapacity &&
                    !getDeviceStudents(selectedMeetingId).some(
                      (n) => n.toLowerCase() === (selectedStudent?.name || '').toLowerCase()
                    ))
                }
                className={`w-full py-3.5 px-6 rounded-lg font-semibold text-base shadow-xs transition-colors flex items-center justify-center gap-2 ${
                  !sessionStatus?.isOpen || !selectedStudent
                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed select-none'
                    : isSelectedStudentAttended
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 cursor-not-allowed select-none'
                    : deviceStudentsCount >= deviceCapacity &&
                      !getDeviceStudents(selectedMeetingId).some(
                        (n) => n.toLowerCase() === (selectedStudent?.name || '').toLowerCase()
                      )
                    ? 'bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed select-none'
                    : 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer'
                }`}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Mencatat Kehadiran...
                  </span>
                ) : isSelectedStudentAttended && selectedStudent ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" aria-hidden="true" />
                    <span>Sudah Hadir Hari Ini ({selectedStudent.name})</span>
                  </>
                ) : deviceStudentsCount >= deviceCapacity &&
                  !getDeviceStudents(selectedMeetingId).some(
                    (n) => n.toLowerCase() === (selectedStudent?.name || '').toLowerCase()
                  ) ? (
                  <>
                    <Laptop className="w-5 h-5 text-slate-500 shrink-0" aria-hidden="true" />
                    <span>Laptop Sudah Dipakai {deviceCapacity} Orang</span>
                  </>
                ) : selectedStudent ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-white shrink-0" aria-hidden="true" />
                    <span>Saya Hadir! ({selectedStudent.name})</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
                    <span>Pilih & Klik Namamu di Atas Dulu!</span>
                  </>
                )}
              </button>

              {!sessionStatus?.isOpen ? (
                <p className="text-center text-xs text-slate-400 mt-2 font-medium">
                  Tombol ini akan aktif otomatis saat sesi presensi dibuka oleh Kak Pembina.
                </p>
              ) : isSelectedStudentAttended && selectedStudent ? (
                <div className="mt-2.5 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium text-center flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Presensi atas nama <strong>{selectedStudent.name}</strong> sudah tercatat pada pukul <strong>{attendedTimeString}</strong>. Kamu tidak perlu absen lagi ya!
                  </span>
                </div>
              ) : !selectedStudent ? (
                <p className="text-center text-xs text-slate-400 mt-2 font-medium">
                  Tombol &quot;Saya Hadir!&quot; akan otomatis aktif dan berwarna hijau setelah kamu mengklik namamu.
                </p>
              ) : null}
            </div>
          </form>
        )}
      </div>

      {/* Bagian 4: Papan Teman yang Sudah Hadir Hari Ini */}
      {attendancesList.length > 0 && (
        <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-slate-700" />
              <h3 className="font-bold text-base sm:text-lg text-slate-900">
                Teman yang Sudah Hadir Hari Ini ({attendancesList.length})
              </h3>
            </div>
            <span className="text-xs font-medium text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
              Pertemuan Aktif
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-4">
            {attendancesList.map((a, idx) => {
              const timeString = new Date(a.checked_in_at).toLocaleTimeString('id-ID', {
                timeZone: 'Asia/Jakarta',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={a.id}
                  className="p-3 bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 rounded-2xl flex items-center gap-3 transition-colors"
                >
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                    {idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-heading font-bold text-sm text-slate-800 truncate">
                      {a.student_name}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{timeString} WIB</span>
                    </div>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
