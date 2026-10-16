'use client';

import { useState, useTransition, useEffect } from 'react';
import Link from 'next/link';
import {
  checkActiveSessionAction,
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
  Clock,
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
  ArrowLeft,
  GraduationCap,
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
  grade_level: number;
  checked_in_at: Date;
}

interface ClassAbsenClientProps {
  grade: GradeLevel;
  rombel?: string;
  currentUser: SessionUser | null;
  initialSession?: ActiveSessionResult | null;
  initialStudents?: StudentItem[];
  initialAttendances?: AttendanceItem[];
}

export default function ClassAbsenClient({
  grade,
  rombel,
  currentUser,
  initialSession = null,
  initialStudents = [],
  initialAttendances = [],
}: ClassAbsenClientProps) {
  const [sessionStatus, setSessionStatus] = useState<ActiveSessionResult | null>(initialSession);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(
    initialSession?.meeting?.id || null
  );
  const [studentsList, setStudentsList] = useState<StudentItem[]>(initialStudents);
  const [attendancesList, setAttendancesList] = useState<AttendanceItem[]>(initialAttendances);
  const [loadingSession, setLoadingSession] = useState(false);

  // Form input
  const [selectedRombel, setSelectedRombel] = useState<string>(rombel || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentItem | null>(null);

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

  const refreshGradeData = async () => {
    setLoadingSession(true);
    setErrorMsg(null);
    try {
      const session = await checkActiveSessionAction(grade);
      setSessionStatus(session);

      if (session.meeting) {
        setSelectedMeetingId(session.meeting.id);
        const atts = await getMeetingAttendancesAction(session.meeting.id);
        if (atts) {
          setAttendancesList(atts as AttendanceItem[]);
          saveOfflineData(OFFLINE_KEYS.ATTENDANCE(session.meeting.id), atts);
        }
      } else {
        setSelectedMeetingId(null);
        setAttendancesList([]);
      }
    } catch (err) {
      console.warn('[ClassAbsen] Offline status check:', err);
      // Pulihkan daftar presensi sesi jika ada di cache
      if (selectedMeetingId) {
        const cachedAtts = getOfflineData<AttendanceItem[]>(OFFLINE_KEYS.ATTENDANCE(selectedMeetingId));
        if (cachedAtts) setAttendancesList(cachedAtts);
      }
    } finally {
      setLoadingSession(false);
    }
  };

  useEffect(() => {
    if (initialStudents && initialStudents.length > 0) {
      saveOfflineData(OFFLINE_KEYS.STUDENTS(grade), initialStudents);
    } else {
      const cachedStus = getOfflineData<StudentItem[]>(OFFLINE_KEYS.STUDENTS(grade));
      if (cachedStus && cachedStus.length > 0) {
        setStudentsList(cachedStus);
      }
    }

    const handlePullRefresh = () => {
      refreshGradeData();
    };
    window.addEventListener('app:pull-to-refresh', handlePullRefresh);

    const timer = setInterval(() => {
      if (document.hidden) return;
      refreshGradeData();
    }, 5000);

    return () => {
      window.removeEventListener('app:pull-to-refresh', handlePullRefresh);
      clearInterval(timer);
    };
  }, [grade]);

  // Ambil daftar rombel yang tersedia untuk kelas ini (misal: ['4A', '4B'])
  const availableRombels = Array.from(
    new Set(studentsList.map((s) => s.class_name).filter(Boolean))
  ).sort() as string[];

  const getRombelCount = (rombel: string) => {
    return studentsList.filter((s) => s.class_name === rombel).length;
  };

  const handleSelectStudent = (student: StudentItem) => {
    setSelectedStudent(student);
    setSearchQuery(student.name);
    setErrorMsg(null);
  };

  const handleClearSelectedStudent = () => {
    setSelectedStudent(null);
    setSearchQuery('');
    setErrorMsg(null);
  };

  // Filter siswa berdasarkan rombel & pencarian
  const filteredStudents = studentsList.filter((s) => {
    if (selectedRombel !== 'all' && s.class_name !== selectedRombel) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      s.name.toLowerCase().includes(q) ||
      s.username.toLowerCase().includes(q) ||
      (s.class_name || '').toLowerCase().includes(q)
    );
  });

  // Submit presensi
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStudent) {
      setErrorMsg('Kamu belum memilih namamu! Silakan cari & klik namamu pada daftar siswa di bawah.');
      return;
    }

    const finalName = selectedStudent.name;
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const res = await submitAttendanceAction({
        gradeLevel: grade,
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
        grade: grade,
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
    setSearchQuery('');
    setSelectedRombel('all');
    setErrorMsg(null);
    refreshGradeData();
  };

  // Admin Override
  const handleAdminOpenSession = () => {
    startAdminTransition(async () => {
      await openQuickSessionForGradeAction(grade);
      refreshGradeData();
    });
  };

  const handleAdminToggleOpen = (isOpen: boolean) => {
    if (!sessionStatus?.meeting) return;
    startAdminTransition(async () => {
      await toggleMeetingOpenAction(sessionStatus.meeting!.id, isOpen);
      refreshGradeData();
    });
  };

  const isSuperadmin = currentUser?.role === 'superadmin';

  const activeMeeting =
    sessionStatus?.openMeetings?.find((m) => m.id === selectedMeetingId) ||
    sessionStatus?.meeting;

  const gradeScheduleInfo =
    grade === 4
      ? { day: 'Kamis', time: '12.30 - 14.00 WIB', color: 'sky' }
      : grade === 5
      ? { day: 'Selasa', time: '12.30 - 14.00 WIB', color: 'emerald' }
      : { day: 'Senin', time: '12.30 - 14.00 WIB', color: 'amber' };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <ConfettiCelebration active={showConfetti} onFinish={() => setShowConfetti(false)} />

      {/* Navigasi Balik ke Pemilihan Kelas / Rombel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/90 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
        <Link
          href={rombel && rombel !== 'all' ? `/absen/kelas/${grade}` : '/absen'}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-heading font-bold text-slate-700 hover:text-blue-600 transition-colors w-fit group"
        >
          <div className="w-7 h-7 rounded-xl bg-slate-100 group-hover:bg-blue-50 flex items-center justify-center transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span>{rombel && rombel !== 'all' ? 'Ganti Rombel' : 'Ganti Jenjang Kelas'}</span>
        </Link>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 text-blue-700 font-heading font-bold border border-blue-200/60">
            <GraduationCap className="w-4 h-4 text-blue-600" />
            <span>Kelas {grade} SD {rombel && rombel !== 'all' ? `• Rombel ${rombel}` : ''}</span>
          </span>
          <span className="hidden sm:inline text-slate-300">•</span>
          <span className="text-slate-500 font-medium">
            Jadwal: <strong className="text-slate-700">{gradeScheduleInfo.day} ({gradeScheduleInfo.time})</strong>
          </span>
        </div>
      </div>

      {/* Bagian 1: Status Sesi Pertemuan Kelas Ini */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-xl shadow-blue-500/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-100 gap-2.5">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <h3 className="font-heading font-bold text-base sm:text-lg text-slate-800">
              Status Presensi Kelas {grade}
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
            <span>Memeriksa sesi pertemuan aktif...</span>
          </div>
        ) : sessionStatus?.isOpen ? (
          /* Sesi Sedang DIBUKA */
          <div className="mt-4 p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
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
                    {activeMeeting?.description || 'Silakan pilih namamu di bawah untuk mengisi daftar hadir.'}
                  </p>
                </div>
              </div>

              {/* Kontrol Pembina khusus jika superadmin login */}
              {isSuperadmin && activeMeeting && (
                <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-emerald-200/60">
                  <Link
                    href="/admin/dashboard"
                    className="text-xs font-bold text-purple-900 bg-purple-100 hover:bg-purple-200 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
                    <span>Panel Admin</span>
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

            {/* Switcher jika ada lebih dari 1 sesi terbuka */}
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
          <div className="mt-4 p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-amber-50 border border-amber-200 text-amber-900">
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

                <div className="mt-3 inline-flex items-center gap-2 text-xs font-bold bg-amber-100 text-amber-900 px-3 py-1.5 rounded-xl border border-amber-200">
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  <span>Jadwal Kelas {grade}: Hari {gradeScheduleInfo.day}, {gradeScheduleInfo.time}</span>
                </div>
              </div>
            </div>

            {/* Admin Force Open jika superadmin */}
            {isSuperadmin && (
              <div className="mt-4 pt-3 border-t border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  Mode Pembina: Ingin buka sesi kelas ini sekarang di luar jadwal?
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAdminOpenSession}
                    disabled={isPendingAdmin}
                    className="text-xs bg-purple-600 hover:bg-purple-700 text-white font-heading font-bold px-3.5 py-1.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
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

      {/* Bagian 2: Formulir Presensi & Input Nama Siswa */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-xl shadow-blue-500/5">
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
                    Pilih Rombel & Namamu
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

              {/* Filter Rombel Pills */}
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
                        Rombel: <span className="font-bold text-emerald-800">{selectedStudent.class_name || `Kelas ${grade}`}</span> • Akun: <span className="font-mono text-slate-500">{selectedStudent.username}</span>
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
              ) : (
                /* Input Pencarian Nama */
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
                    placeholder={`Ketik namamu di sini (misal: ${studentsList[0]?.name?.split(' ')[0] || 'Abizar'})...`}
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
                      : `Klik namamu dari daftar ${selectedRombel === 'all' ? `Kelas ${grade}` : `Rombel ${selectedRombel}`} (${filteredStudents.length} siswa):`}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto p-2 bg-slate-50/70 rounded-2xl border border-slate-200/80">
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((s) => {
                      const isSelected = selectedStudent?.id === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => handleSelectStudent(s)}
                          className={`text-xs px-3.5 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/20 ring-2 ring-emerald-500 scale-[1.02]'
                              : 'bg-white hover:bg-sky-50 hover:text-sky-900 text-slate-700 border border-slate-200 hover:border-sky-300 shadow-xs'
                          }`}
                        >
                          {isSelected ? (
                            <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                              {s.name.charAt(0)}
                            </div>
                          )}
                          <span className="font-heading font-semibold">{s.name}</span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                              isSelected
                                ? 'bg-emerald-800 text-white'
                                : s.class_name?.includes('A')
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-teal-100 text-teal-800'
                            }`}
                          >
                            {s.class_name || `${grade}`}
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="text-xs text-slate-500 italic py-4 px-3 w-full text-center">
                      Tidak ada siswa yang cocok dengan kata kunci &quot;{searchQuery}&quot; di {selectedRombel === 'all' ? `Kelas ${grade}` : `Rombel ${selectedRombel}`}.
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
              {!selectedStudent && sessionStatus?.isOpen && (
                <div className="mb-3 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Tombol Belum Aktif:</strong> Silakan cari & <strong>klik namamu</strong> pada daftar siswa di atas terlebih dahulu.
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !sessionStatus?.isOpen || !selectedStudent}
                className={`w-full py-4 sm:py-5 px-8 rounded-2xl sm:rounded-3xl font-heading font-bold text-lg sm:text-xl shadow-lg transition-all flex items-center justify-center gap-2.5 ${
                  !sessionStatus?.isOpen || !selectedStudent
                    ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed select-none shadow-none'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30 hover:scale-[1.01] cursor-pointer ring-4 ring-emerald-500/20'
                }`}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Mencatat Kehadiran...
                  </span>
                ) : selectedStudent ? (
                  <>
                    <CheckCircle2 className="w-6 h-6 text-white" />
                    <span>Saya Hadir! ({selectedStudent.name})</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-6 h-6 text-slate-400" />
                    <span>Pilih & Klik Namamu di Atas Dulu!</span>
                  </>
                )}
              </button>

              {!sessionStatus?.isOpen ? (
                <p className="text-center text-xs text-slate-400 mt-2 font-medium">
                  Tombol ini akan aktif otomatis saat sesi presensi dibuka oleh Kak Pembina.
                </p>
              ) : !selectedStudent ? (
                <p className="text-center text-xs text-slate-400 mt-2 font-medium">
                  Tombol &quot;Saya Hadir!&quot; akan otomatis aktif dan berwarna hijau setelah kamu mengklik namamu.
                </p>
              ) : null}
            </div>
          </form>
        )}
      </div>

      {/* Bagian 3: Papan Teman yang Sudah Hadir Hari Ini */}
      {attendancesList.length > 0 && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <h3 className="font-heading font-bold text-base sm:text-lg text-slate-800">
                Teman Kelas {grade} yang Sudah Hadir Hari Ini ({attendancesList.length})
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
