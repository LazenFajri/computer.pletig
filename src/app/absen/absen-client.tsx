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

  // Pilih siswa dari list auto-suggest
  const handleSelectStudent = (student: StudentItem) => {
    setSelectedStudent(student);
    setCustomName(student.name);
    setSearchQuery(student.name);
    setErrorMsg(null);
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

    if (isSelectedStudentAttended) {
      setErrorMsg(
        `Nama "${selectedStudent.name}" sudah tercatat hadir pada pertemuan ini (${attendedTimeString}). Kamu tidak bisa absen dua kali ya!`
      );
      return;
    }

    const finalName = selectedStudent.name;

    if (!finalName || finalName.length < 2) {
      setErrorMsg('Silakan pilih atau ketik nama lengkap kamu terlebih dahulu.');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const res = await submitAttendanceAction({
        gradeLevel: selectedGrade,
        studentName: finalName,
        studentUserId: selectedStudent?.id || null,
        meetingId: selectedMeetingId,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Presensi gagal dicatat.');
        setIsSubmitting(false);
        return;
      }

      playSuccessChime();
      setShowConfetti(true);

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
    }
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
      <div className="bg-white rounded-3xl p-4 sm:p-8 border border-slate-200 shadow-xl shadow-blue-500/5">
        <div className="text-center mb-3 sm:mb-6">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
            Langkah 1
          </span>
          <h2 className="font-heading text-lg sm:text-3xl font-bold text-slate-800 mt-1 sm:mt-2 flex items-center justify-center gap-1.5 sm:gap-2">
            <span>Pilih Kelas Kamu</span>
            <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
          </h2>
          <p className="text-[11px] sm:text-sm text-slate-500 mt-0.5 sm:mt-1">
            Klik tombol kelas sesuai kelasmu di SDN Pleburan 03:
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3.5">
          {/* Kelas 4 */}
          <button
            type="button"
            onClick={() => handleGradeChange(4)}
            className={`p-2.5 sm:p-4 rounded-2xl border-2 transition-all text-center sm:text-left flex flex-col sm:flex-row items-center sm:items-start gap-1.5 sm:gap-3.5 cursor-pointer ${
              selectedGrade === 4
                ? 'border-sky-500 bg-sky-50/70 shadow-md shadow-sky-500/10 scale-[1.02]'
                : 'border-slate-200 bg-white hover:border-sky-300 hover:bg-slate-50'
            }`}
          >
            <div
              className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center font-heading font-bold text-base sm:text-xl shrink-0 ${
                selectedGrade === 4 ? 'bg-sky-500 text-white' : 'bg-sky-100 text-sky-700'
              }`}
            >
              4
            </div>
            <div>
              <div className="font-heading text-xs sm:text-lg font-bold text-slate-900">Kelas 4</div>
              <div className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                <span className="font-bold text-sky-700">Kamis</span>
                <span className="hidden sm:inline"> (12.30 - 14.00 WIB)</span>
              </div>
            </div>
          </button>

          {/* Kelas 5 */}
          <button
            type="button"
            onClick={() => handleGradeChange(5)}
            className={`p-2.5 sm:p-4 rounded-2xl border-2 transition-all text-center sm:text-left flex flex-col sm:flex-row items-center sm:items-start gap-1.5 sm:gap-3.5 cursor-pointer ${
              selectedGrade === 5
                ? 'border-emerald-500 bg-emerald-50/70 shadow-md shadow-emerald-500/10 scale-[1.02]'
                : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50'
            }`}
          >
            <div
              className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center font-heading font-bold text-base sm:text-xl shrink-0 ${
                selectedGrade === 5 ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              5
            </div>
            <div>
              <div className="font-heading text-xs sm:text-lg font-bold text-slate-900">Kelas 5</div>
              <div className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                <span className="font-bold text-emerald-700">Selasa</span>
                <span className="hidden sm:inline"> (12.30 - 14.00 WIB)</span>
              </div>
            </div>
          </button>

          {/* Kelas 6 */}
          <button
            type="button"
            onClick={() => handleGradeChange(6)}
            className={`p-2.5 sm:p-4 rounded-2xl border-2 transition-all text-center sm:text-left flex flex-col sm:flex-row items-center sm:items-start gap-1.5 sm:gap-3.5 cursor-pointer ${
              selectedGrade === 6
                ? 'border-amber-500 bg-amber-50/70 shadow-md shadow-amber-500/10 scale-[1.02]'
                : 'border-slate-200 bg-white hover:border-amber-300 hover:bg-slate-50'
            }`}
          >
            <div
              className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center font-heading font-bold text-base sm:text-xl shrink-0 ${
                selectedGrade === 6 ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-700'
              }`}
            >
              6
            </div>
            <div>
              <div className="font-heading text-xs sm:text-lg font-bold text-slate-900">Kelas 6</div>
              <div className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                <span className="font-bold text-amber-700">Senin</span>
                <span className="hidden sm:inline"> (12.30 - 14.00 WIB)</span>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Bagian 2: Status Sesi Pertemuan */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl shadow-blue-500/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <h3 className="font-heading font-bold text-lg text-slate-800">
              Status Presensi Kelas {selectedGrade}
            </h3>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span>Waktu Sekarang:</span>
            <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-xl">
              {sessionStatus?.wibInfo?.dayName || 'Hari Ini'}, {sessionStatus?.wibInfo?.timeStr || '--:--'} WIB
            </span>
          </div>
        </div>

        {/* Loading status */}
        {loadingSession ? (
          <div className="py-8 text-center text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
            <span>Memeriksa jadwal dan sesi aktif...</span>
          </div>
        ) : sessionStatus?.isOpen ? (
          /* Sesi Sedang DIBUKA */
          <div className="mt-4 p-5 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                      Sesi Terbuka
                    </span>
                    <span className="text-xs font-semibold text-emerald-800">
                      {sessionStatus.reason === 'admin_override' ? 'Override Manual Pembina' : 'Sesuai Jadwal'}
                    </span>
                  </div>
                  <h4 className="font-heading font-bold text-base sm:text-lg text-emerald-950 mt-1">
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
          <div className="mt-4 p-5 rounded-3xl bg-amber-50 border border-amber-200 text-amber-900">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-heading font-bold text-base text-amber-950">
                  Sesi Presensi Belum Dibuka atau Sudah Selesai
                </h4>
                <p className="text-xs sm:text-sm text-amber-800 mt-1 leading-relaxed">
                  Presensi mandiri dibuka saat jam kegiatan ekstrakurikuler (pukul 12.30 s.d 14.00 WIB) sesuai jadwal kelasmu, atau jika Kak Pembina mengaktifkan sesi secara manual di lab.
                </p>

                {/* Jadwal ringkas */}
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
                  <span className="bg-amber-100 text-amber-900 px-2.5 py-1 rounded-xl">
                    Senin: Kelas 6
                  </span>
                  <span className="bg-amber-100 text-amber-900 px-2.5 py-1 rounded-xl">
                    Selasa: Kelas 5
                  </span>
                  <span className="bg-amber-100 text-amber-900 px-2.5 py-1 rounded-xl">
                    Kamis: Kelas 4
                  </span>
                  <span className="bg-amber-200/80 text-amber-900 font-bold px-2.5 py-1 rounded-xl">
                    Jam: 12.30 - 14.00 WIB
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
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl shadow-blue-500/5">
        {/* Tampilan Sukses */}
        {successData ? (
          <div className="text-center py-6 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 bg-emerald-600 text-white rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-emerald-600/20 mb-4 animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-3.5 py-1.5 rounded-full text-xs font-bold mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Presensi Berhasil Dicatat
            </div>
            <h3 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 mb-1">
              Terima Kasih, {successData.name}!
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Kamu resmi hadir pada kegiatan <span className="font-bold text-slate-700">{successData.meetingTitle}</span> di Kelas {successData.grade} pada pukul <span className="font-bold text-emerald-600">{successData.timeStr}</span>.
            </p>

            <div className="mt-6">
              <button
                type="button"
                onClick={handleResetForNextStudent}
                className="bg-blue-600 hover:bg-blue-700 text-white font-heading font-bold px-6 py-3 rounded-2xl shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer"
              >
                <span>Absen untuk Teman Selanjutnya</span>
                <ArrowRight className="w-4 h-4" />
              </button>
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
                  <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-2 border-emerald-500 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md shadow-emerald-500/10 mb-4 animate-in fade-in">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold font-heading text-lg shrink-0 shadow-sm">
                        {selectedStudent.name.charAt(0)}
                      </div>
                      <div>
                        <div className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Siswa Terpilih (Siap Absen)
                        </div>
                        <h4 className="font-heading font-bold text-lg text-slate-900 mt-0.5">
                          {selectedStudent.name}
                        </h4>
                        <div className="text-xs text-slate-600 font-medium">
                          Rombel: <span className="font-bold text-emerald-800">{selectedStudent.class_name || `Kelas ${selectedGrade}`}</span> • Akun: <span className="font-mono text-slate-500">{selectedStudent.username}</span>
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
                          className={`text-xs px-3.5 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 cursor-pointer ${
                            isSelected && isAttended
                              ? 'bg-slate-200 text-emerald-950 border-2 border-emerald-500 ring-2 ring-emerald-300 font-bold'
                              : isSelected
                              ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/20 ring-2 ring-emerald-500 scale-[1.02]'
                              : isAttended
                              ? 'bg-emerald-50/80 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs'
                              : 'bg-white hover:bg-sky-50 hover:text-sky-900 text-slate-700 border border-slate-200 hover:border-sky-300 shadow-xs'
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
                            className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                              isSelected && !isAttended
                                ? 'bg-emerald-800 text-white'
                                : isAttended
                                ? 'bg-emerald-200/90 text-emerald-900 border border-emerald-300'
                                : s.class_name?.includes('A')
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-teal-100 text-teal-800'
                            }`}
                          >
                            {isAttended ? `✓ Hadir ${attTime}` : s.class_name || `${selectedGrade}`}
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

            {/* Error Message Box */}
            {errorMsg && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs sm:text-sm flex items-start gap-3 animate-in fade-in">
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div>{errorMsg}</div>
              </div>
            )}

            {/* Tombol Besar Submit: Saya Hadir! */}
            <div>
              {/* Petunjuk jika nama belum diklik */}
              {!selectedStudent && sessionStatus?.isOpen && (
                <div className="mb-3 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Tombol Belum Aktif:</strong> Silakan cari & <strong>klik namamu</strong> pada daftar siswa di atas terlebih dahulu ya!
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !sessionStatus?.isOpen || !selectedStudent || isSelectedStudentAttended}
                className={`w-full py-4 sm:py-5 px-8 rounded-2xl sm:rounded-3xl font-heading font-bold text-lg sm:text-xl shadow-lg transition-all flex items-center justify-center gap-2.5 ${
                  !sessionStatus?.isOpen || !selectedStudent
                    ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed select-none shadow-none'
                    : isSelectedStudentAttended
                    ? 'bg-slate-100 text-emerald-800 border-2 border-emerald-300 cursor-not-allowed select-none shadow-none'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30 hover:scale-[1.01] cursor-pointer ring-4 ring-emerald-500/20'
                }`}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Mencatat Kehadiran...
                  </span>
                ) : isSelectedStudentAttended && selectedStudent ? (
                  <>
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                    <span>Sudah Hadir Hari Ini ({selectedStudent.name})</span>
                  </>
                ) : selectedStudent ? (
                  <>
                    <CheckCircle2 className="w-6 h-6 text-white shrink-0" />
                    <span>Saya Hadir! ({selectedStudent.name})</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-6 h-6 text-slate-400 shrink-0" />
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
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <h3 className="font-heading font-bold text-lg text-slate-800">
                Teman yang Sudah Hadir Hari Ini ({attendancesList.length})
              </h3>
            </div>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
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
