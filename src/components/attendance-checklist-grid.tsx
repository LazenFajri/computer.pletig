'use client';

import { useState, useEffect, useTransition, useMemo } from 'react';
import {
  getAttendanceMatrixAction,
  toggleAttendanceCellAction,
  type AttendanceMatrixData,
  type MatrixColumn,
  type StudentMatrixRow,
} from '@/app/actions/attendance-matrix-actions';
import { playSuccessChime } from '@/components/audio-feedback';
import {
  Calendar,
  Check,
  CheckCircle2,
  Users,
  Search,
  RefreshCw,
  AlertCircle,
  GraduationCap,
  Sparkles,
  Loader2,
  SlidersHorizontal,
} from 'lucide-react';

interface AttendanceChecklistGridProps {
  isAdmin?: boolean; // true untuk Superadmin (bisa klik centang), false untuk Guru (read-only)
  initialClass?: '6B' | '6A' | '5B' | '5A' | '4B' | '4A';
  classNameWrapper?: string;
}

const AVAILABLE_ROMBELS: Array<{ code: '6B' | '6A' | '5B' | '5A' | '4B' | '4A'; grade: number; day: string; color: string }> = [
  { code: '6B', grade: 6, day: 'Senin', color: 'from-purple-600 to-indigo-600' },
  { code: '6A', grade: 6, day: 'Senin', color: 'from-purple-600 to-indigo-600' },
  { code: '5B', grade: 5, day: 'Selasa', color: 'from-blue-600 to-cyan-600' },
  { code: '5A', grade: 5, day: 'Selasa', color: 'from-blue-600 to-cyan-600' },
  { code: '4B', grade: 4, day: 'Kamis', color: 'from-emerald-600 to-teal-600' },
  { code: '4A', grade: 4, day: 'Kamis', color: 'from-emerald-600 to-teal-600' },
];

export default function AttendanceChecklistGrid({
  isAdmin = false,
  initialClass = '6B',
  classNameWrapper = '',
}: AttendanceChecklistGridProps) {
  const [selectedRombel, setSelectedRombel] = useState<'6B' | '6A' | '5B' | '5A' | '4B' | '4A'>(initialClass);
  const [sessionCount, setSessionCount] = useState<number>(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [matrixData, setMatrixData] = useState<AttendanceMatrixData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Pending cell updates for loading indicator on clicked cell
  const [pendingCells, setPendingCells] = useState<Record<string, boolean>>({}); // key = `${studentId}_${dateStr}`
  const [isPending, startTransition] = useTransition();

  const showToast = (type: 'success' | 'error', text: string) => {
    setFeedbackToast({ type, text });
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  // 1. Load Matrix Data dari Server
  const loadMatrix = async (rombel: string, count: number) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await getAttendanceMatrixAction(rombel, count);
      if (res.success && res.data) {
        setMatrixData(res.data);
      } else {
        setErrorMsg(res.error || 'Gagal memuat data matriks presensi.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatrix(selectedRombel, sessionCount);
  }, [selectedRombel, sessionCount]);

  // 2. Handle Klik Centang (Khusus Admin dengan Optimistic Update)
  const handleToggleCell = async (student: StudentMatrixRow, column: MatrixColumn) => {
    if (!isAdmin) return;

    const cellKey = `${student.studentId}_${column.dateStr}`;
    const currentStatus = !!student.attendanceMap[column.dateStr];
    const newStatus = !currentStatus;

    // Tandai cell sedang loading
    setPendingCells((prev) => ({ ...prev, [cellKey]: true }));

    // Optimistic Update: Perbarui state lokal seketika agar UX instan
    setMatrixData((prev) => {
      if (!prev) return prev;

      const updatedStudents = prev.students.map((s) => {
        if (s.studentId !== student.studentId) return s;

        const updatedMap = { ...s.attendanceMap, [column.dateStr]: newStatus };
        let newTotal = 0;
        prev.columns.forEach((col) => {
          if (updatedMap[col.dateStr]) newTotal += 1;
        });

        const newPct = prev.columns.length > 0 ? Math.round((newTotal / prev.columns.length) * 100) : 0;

        return {
          ...s,
          attendanceMap: updatedMap,
          totalPresent: newTotal,
          attendancePercentage: newPct,
        };
      });

      // Hitung ulang column totals
      const updatedTotals = { ...prev.columnTotals };
      let newColTotal = 0;
      updatedStudents.forEach((s) => {
        if (s.attendanceMap[column.dateStr]) newColTotal += 1;
      });
      updatedTotals[column.dateStr] = newColTotal;

      return {
        ...prev,
        students: updatedStudents,
        columnTotals: updatedTotals,
      };
    });

    if (newStatus) {
      playSuccessChime();
    }

    // Panggil Server Action
    startTransition(async () => {
      try {
        const res = await toggleAttendanceCellAction({
          studentId: student.studentId,
          sessionDate: column.dateStr,
          present: newStatus,
        });

        if (res.success) {
          showToast('success', res.message || `${student.studentName} (${column.displayDate}) diperbarui.`);
        } else {
          // Rollback jika server action gagal
          showToast('error', res.error || 'Gagal mengubah presensi. Mengembalikan status.');
          setMatrixData((prev) => {
            if (!prev) return prev;
            const rolledBack = prev.students.map((s) => {
              if (s.studentId !== student.studentId) return s;
              const rolledMap = { ...s.attendanceMap, [column.dateStr]: currentStatus };
              let total = 0;
              prev.columns.forEach((col) => {
                if (rolledMap[col.dateStr]) total += 1;
              });
              return {
                ...s,
                attendanceMap: rolledMap,
                totalPresent: total,
                attendancePercentage: prev.columns.length > 0 ? Math.round((total / prev.columns.length) * 100) : 0,
              };
            });
            const rolledTotals = { ...prev.columnTotals };
            let count = 0;
            rolledBack.forEach((s) => {
              if (s.attendanceMap[column.dateStr]) count += 1;
            });
            rolledTotals[column.dateStr] = count;
            return { ...prev, students: rolledBack, columnTotals: rolledTotals };
          });
        }
      } catch (err: any) {
        showToast('error', 'Terjadi kendala jaringan saat menyimpan.');
      } finally {
        setPendingCells((prev) => {
          const next = { ...prev };
          delete next[cellKey];
          return next;
        });
      }
    });
  };

  // 3. Filter siswa berdasarkan search input
  const filteredStudents = useMemo(() => {
    if (!matrixData) return [];
    if (!searchQuery.trim()) return matrixData.students;
    const q = searchQuery.toLowerCase().trim();
    return matrixData.students.filter((s) => s.studentName.toLowerCase().includes(q));
  }, [matrixData, searchQuery]);

  const activeRombelMeta = AVAILABLE_ROMBELS.find((r) => r.code === selectedRombel) || AVAILABLE_ROMBELS[0];

  return (
    <div className={`space-y-4 ${classNameWrapper}`}>
      {/* Toast Feedback */}
      {feedbackToast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-bottom-5 ${
            feedbackToast.type === 'success'
              ? 'bg-emerald-600 text-white shadow-emerald-600/30'
              : 'bg-rose-600 text-white shadow-rose-600/30'
          }`}
        >
          {feedbackToast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-100" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-100" />
          )}
          <span>{feedbackToast.text}</span>
        </div>
      )}

      {/* Header Card Matriks Presensi */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200/80">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>Matriks Presensi Centang Otomatis</span>
              <span className="text-[10px] font-semibold bg-teal-100 text-teal-800 px-1.5 py-0.2 rounded-md">
                Jadwal Nyata 2026
              </span>
            </div>
            <h2 className="font-heading font-bold text-xl text-slate-900 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-teal-600" />
              <span>Tabel Matriks Kehadiran Siswa</span>
            </h2>
            <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
              Daftar centang presensi berbasis kalender nyata SDN Pleburan 03 (Mulai 19 Oktober 2026).
              {isAdmin ? (
                <span className="text-teal-700 font-semibold ml-1">
                  💡 Mode Admin: Anda dapat mengeklik langsung kotak centang untuk mengubah kehadiran siswa.
                </span>
              ) : (
                <span className="text-slate-600 font-semibold ml-1">
                  👁️ Mode Guru: Tampilan baca (read-only) untuk memantau keaktifan siswa tiap pertemuan.
                </span>
              )}
            </p>
          </div>

          {/* Quick Actions & Session Selector */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Session Count Selector */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl text-xs font-bold">
              <span className="text-[10px] text-slate-500 pl-2 uppercase tracking-wider hidden sm:inline">
                Sesi:
              </span>
              {[8, 10, 12].map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => setSessionCount(cnt)}
                  className={`px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
                    sessionCount === cnt
                      ? 'bg-white text-teal-700 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cnt}
                </button>
              ))}
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => loadMatrix(selectedRombel, sessionCount)}
              disabled={loading}
              className="px-3.5 py-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              title="Muat Ulang Data Matriks"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-600' : 'text-slate-500'}`} />
              <span>{loading ? 'Memuat...' : 'Segarkan'}</span>
            </button>
          </div>
        </div>

        {/* Info Jadwal Bar */}
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <div className="flex items-center gap-2 bg-purple-50/70 border border-purple-200/80 px-3 py-2 rounded-2xl">
            <span className="w-2 h-2 rounded-full bg-purple-600 shrink-0"></span>
            <span className="text-purple-950 font-bold">Kelas 6 (6A & 6B):</span>
            <span className="text-purple-700 font-medium">Tiap Senin (Mulai 19/10)</span>
          </div>
          <div className="flex items-center gap-2 bg-blue-50/70 border border-blue-200/80 px-3 py-2 rounded-2xl">
            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0"></span>
            <span className="text-blue-950 font-bold">Kelas 5 (5A & 5B):</span>
            <span className="text-blue-700 font-medium">Tiap Selasa (Mulai 20/10)</span>
          </div>
          <div className="flex items-center gap-2 bg-emerald-50/70 border border-emerald-200/80 px-3 py-2 rounded-2xl">
            <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0"></span>
            <span className="text-emerald-950 font-bold">Kelas 4 (4A & 4B):</span>
            <span className="text-emerald-700 font-medium">Tiap Kamis (Mulai 22/10)</span>
          </div>
        </div>
      </div>

      {/* FILTER ROMBEL TABS & SEARCH INPUT */}
      <div className="bg-white rounded-3xl p-3.5 sm:p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Rombel Tabs (6B, 6A, 5B, 5A, 4B, 4A) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {AVAILABLE_ROMBELS.map((rombel) => {
            const isActive = selectedRombel === rombel.code;
            return (
              <button
                key={rombel.code}
                type="button"
                onClick={() => setSelectedRombel(rombel.code)}
                className={`px-4 py-2 rounded-2xl text-xs font-heading font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-md shadow-slate-900/15'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'
                }`}
              >
                <span>Kelas {rombel.code}</span>
                <span
                  className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {rombel.day}
                </span>
              </button>
            );
          })}
        </div>

        {/* Student Name Search */}
        <div className="relative shrink-0 md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={`Cari nama di ${selectedRombel}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-2xl border border-slate-200 text-xs font-medium focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10 outline-none bg-slate-50/60 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* TABEL MATRIKS CHECKLIST */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400 text-xs">
            <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-teal-600" />
            <p className="font-bold text-slate-700 text-sm">Menyiapkan Matriks Presensi Kelas {selectedRombel}...</p>
            <p className="text-[11px] text-slate-400 mt-1">Mengambil data siswa dan riwayat presensi tanggal nyata.</p>
          </div>
        ) : errorMsg ? (
          <div className="p-12 text-center text-rose-600 text-xs">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
            <p className="font-bold">{errorMsg}</p>
            <button
              type="button"
              onClick={() => loadMatrix(selectedRombel, sessionCount)}
              className="mt-3 px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Coba Lagi
            </button>
          </div>
        ) : !matrixData || matrixData.students.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <Users className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-600 text-sm">Belum ada siswa terdaftar di Kelas {selectedRombel}.</p>
            <p className="text-xs text-slate-400 mt-1">Pastikan data siswa dari Excel sudah terimpor ke database.</p>
          </div>
        ) : (
          <div className="relative overflow-x-auto max-w-full">
            <table className="w-full text-left text-xs border-collapse">
              {/* Table Header */}
              <thead className="bg-slate-900 text-white font-heading text-[11px] uppercase tracking-wider sticky top-0 z-20">
                <tr>
                  {/* Sticky No */}
                  <th className="py-3 px-2.5 text-center w-10 sticky left-0 z-30 bg-slate-900 border-r border-slate-800">
                    No
                  </th>
                  {/* Sticky Nama Siswa */}
                  <th className="py-3 px-3.5 min-w-[190px] sm:min-w-[220px] sticky left-10 z-30 bg-slate-900 border-r border-slate-800 shadow-[2px_0_5px_rgba(0,0,0,0.15)]">
                    Nama Siswa ({filteredStudents.length})
                  </th>

                  {/* Dynamic Date Columns */}
                  {matrixData.columns.map((col) => (
                    <th
                      key={col.dateStr}
                      className="py-2.5 px-2 text-center min-w-[56px] sm:min-w-[62px] border-r border-slate-800/80 hover:bg-slate-800/70 transition-colors"
                      title={`${col.dayName}, ${col.dateStr}`}
                    >
                      <div className="font-extrabold text-teal-400 text-xs leading-none">
                        {col.displayDate}
                      </div>
                      <div className="text-[9px] text-slate-400 font-semibold mt-0.5 lowercase">
                        {col.dayName}
                      </div>
                    </th>
                  ))}

                  {/* Summary Columns */}
                  <th className="py-3 px-3 text-center min-w-[70px] bg-slate-800/90 border-r border-slate-700/80 text-teal-300">
                    Hadir
                  </th>
                  <th className="py-3 px-3 text-center min-w-[65px] bg-slate-800 text-yellow-300">
                    %
                  </th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={matrixData.columns.length + 4}
                      className="py-12 text-center text-slate-400 text-xs italic"
                    >
                      Tidak ada nama siswa yang cocok dengan &quot;{searchQuery}&quot;
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student, idx) => {
                    const isEven = idx % 2 === 0;
                    return (
                      <tr
                        key={student.studentId}
                        className={`transition-colors hover:bg-teal-50/40 group ${
                          isEven ? 'bg-white' : 'bg-slate-50/50'
                        }`}
                      >
                        {/* Sticky No */}
                        <td
                          className={`py-2 px-2.5 text-center text-slate-400 font-bold text-xs sticky left-0 z-10 border-r border-slate-100 ${
                            isEven ? 'bg-white' : 'bg-slate-50'
                          } group-hover:bg-teal-50/70`}
                        >
                          {idx + 1}
                        </td>

                        {/* Sticky Student Name */}
                        <td
                          className={`py-2 px-3.5 sticky left-10 z-10 border-r border-slate-200/80 shadow-[2px_0_4px_rgba(0,0,0,0.04)] ${
                            isEven ? 'bg-white' : 'bg-slate-50'
                          } group-hover:bg-teal-50/70`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {student.avatarUrl ? (
                              <img
                                src={student.avatarUrl}
                                alt={student.studentName}
                                className="w-6 h-6 rounded-full shrink-0 border border-slate-200 bg-white"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                                {student.studentName.charAt(0)}
                              </div>
                            )}
                            <span className="font-semibold text-slate-900 text-xs truncate max-w-[170px] sm:max-w-[200px]" title={student.studentName}>
                              {student.studentName}
                            </span>
                          </div>
                        </td>

                        {/* Checklist Cells */}
                        {matrixData.columns.map((column) => {
                          const isPresent = !!student.attendanceMap[column.dateStr];
                          const cellKey = `${student.studentId}_${column.dateStr}`;
                          const isCellLoading = !!pendingCells[cellKey];

                          return (
                            <td
                              key={column.dateStr}
                              className="py-1.5 px-1.5 text-center border-r border-slate-100/90 align-middle"
                            >
                              {isAdmin ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleCell(student, column)}
                                  disabled={isCellLoading}
                                  className={`w-9 h-9 mx-auto rounded-xl flex items-center justify-center transition-all cursor-pointer font-bold ${
                                    isPresent
                                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs shadow-emerald-500/30 scale-100 hover:scale-105 active:scale-95'
                                      : 'bg-slate-100 hover:bg-emerald-100 text-slate-300 hover:text-emerald-700 hover:border-emerald-300 border border-transparent'
                                  }`}
                                  title={`${student.studentName} - ${column.displayDate}: ${
                                    isPresent ? 'Hadir (Klik untuk batalkan)' : 'Tidak Hadir (Klik untuk centang hadir)'
                                  }`}
                                >
                                  {isCellLoading ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                                  ) : isPresent ? (
                                    <Check className="w-4 h-4 stroke-[3]" />
                                  ) : (
                                    <span className="text-xs font-normal opacity-40">-</span>
                                  )}
                                </button>
                              ) : (
                                /* Guru Mode: Read-Only */
                                <div
                                  className={`w-8 h-8 mx-auto rounded-xl flex items-center justify-center font-bold select-none ${
                                    isPresent
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                      : 'text-slate-300 font-normal'
                                  }`}
                                  title={`${student.studentName} - ${column.displayDate}: ${
                                    isPresent ? 'Hadir' : 'Tidak Hadir'
                                  }`}
                                >
                                  {isPresent ? (
                                    <Check className="w-4 h-4 text-emerald-700 stroke-[3]" />
                                  ) : (
                                    <span>-</span>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}

                        {/* Total Hadir */}
                        <td className="py-2 px-3 text-center border-r border-slate-100 font-bold text-xs text-slate-800 bg-slate-50/30">
                          <span className="px-2 py-0.5 rounded-lg bg-teal-50 text-teal-800 font-extrabold">
                            {student.totalPresent}
                          </span>
                        </td>

                        {/* Persentase Kehadiran */}
                        <td className="py-2 px-3 text-center font-bold text-xs">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-extrabold ${
                              student.attendancePercentage >= 80
                                ? 'bg-emerald-100 text-emerald-800'
                                : student.attendancePercentage >= 50
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {student.attendancePercentage}%
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Bottom Summary Row ("Total Siswa Hadir") */}
              <tfoot className="bg-slate-100 font-heading font-extrabold text-xs text-slate-900 border-t-2 border-slate-300 sticky bottom-0 z-20 shadow-md">
                <tr>
                  <td
                    colSpan={2}
                    className="py-3 px-4 text-slate-900 uppercase tracking-wider text-xs sticky left-0 z-30 bg-slate-100 border-r border-slate-300 shadow-[2px_0_5px_rgba(0,0,0,0.06)]"
                  >
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-teal-700 shrink-0" />
                      <span>Total Siswa Hadir</span>
                      <span className="text-[10px] text-slate-500 font-medium normal-case">
                        (dari {matrixData.totalStudents} anak)
                      </span>
                    </div>
                  </td>

                  {/* Totals Per Date Column */}
                  {matrixData.columns.map((col) => {
                    const countPresent = matrixData.columnTotals[col.dateStr] || 0;
                    const pct = matrixData.totalStudents > 0
                      ? Math.round((countPresent / matrixData.totalStudents) * 100)
                      : 0;

                    return (
                      <td
                        key={col.dateStr}
                        className="py-2.5 px-1.5 text-center border-r border-slate-200"
                      >
                        <div className="text-teal-900 font-extrabold text-xs">
                          {countPresent}
                        </div>
                        <div className="text-[9px] text-slate-500 font-semibold">
                          {pct}%
                        </div>
                      </td>
                    );
                  })}

                  {/* Summary Overall Total */}
                  <td className="py-2.5 px-3 text-center border-r border-slate-200 text-teal-950 font-extrabold">
                    {Object.values(matrixData.columnTotals).reduce((a, b) => a + b, 0)}
                  </td>
                  <td className="py-2.5 px-3 text-center text-emerald-800 font-extrabold bg-emerald-100/60">
                    {matrixData.overallAttendancePercentage}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Footer Note */}
        {matrixData && (
          <div className="p-3 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>Centang Hijau (✓) = Hadir pada sesi tersebut</span>
              <span className="text-slate-300 mx-1">•</span>
              <span className="text-slate-400">Dash (-) = Belum hadir / belum sesi</span>
            </div>
            <div className="text-slate-600 font-bold">
              Rombel {selectedRombel} • Total {matrixData.totalStudents} Siswa • Rata-rata Kehadiran: {matrixData.overallAttendancePercentage}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
