'use client';

import { useState, useEffect } from 'react';
import type { AssignmentWithDetails, SubmissionWithDetails } from '@/app/actions/assignment-actions';
import type { GradeLevel, SessionUser } from '@/lib/auth-types';
import {
  FileText,
  Calendar,
  Clock,
  ExternalLink,
  GraduationCap,
  Award,
  FileDown,
  CheckCircle2,
} from 'lucide-react';

interface TugasClientProps {
  initialAssignments: AssignmentWithDetails[];
  initialSubmissions: SubmissionWithDetails[];
  currentUser: SessionUser | null;
}

export default function TugasClient({
  initialAssignments,
  initialSubmissions,
  currentUser,
}: TugasClientProps) {
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'assignments' | 'results'>('assignments');

  // Ambil daftar nomor pertemuan unik yang tersedia
  const availableMeetingNumbers = Array.from(
    new Set(
      initialAssignments
        .map((a) => a.meeting?.meetingNumber ?? (a as any).meeting_number)
        .filter((n): n is number => typeof n === 'number' && !isNaN(n))
    )
  ).sort((a, b) => a - b);

  const displayMeetingNumbers = availableMeetingNumbers.length > 0 ? availableMeetingNumbers : [1, 2, 3, 4];

  const [filterMeetingNumber, setFilterMeetingNumber] = useState<number | 'all'>(() => {
    if (availableMeetingNumbers.length > 0) {
      return availableMeetingNumbers[0];
    }
    return 1;
  });

  // Submissions state
  const [submissionsList, setSubmissionsList] = useState<SubmissionWithDetails[]>(initialSubmissions);

  useEffect(() => {
    if (Array.isArray(initialSubmissions)) {
      setSubmissionsList(initialSubmissions);
    }
  }, [initialSubmissions]);

  // Tangkap event pull-to-refresh global
  useEffect(() => {
    const handlePull = async () => {
      try {
        const { getSubmissionsAction } = await import('@/app/actions/assignment-actions');
        const freshSubmissions = await getSubmissionsAction();
        if (Array.isArray(freshSubmissions)) {
          setSubmissionsList(freshSubmissions);
        }
      } catch {}
    };
    window.addEventListener('app:pull-to-refresh', handlePull);
    return () => window.removeEventListener('app:pull-to-refresh', handlePull);
  }, []);

  const filteredAssignments = initialAssignments.filter((ass) => {
    if (selectedGrade !== 'all') {
      if (ass.meeting && ass.meeting.gradeLevel !== null && ass.meeting.gradeLevel !== selectedGrade) {
        return false;
      }
    }
    if (filterMeetingNumber !== 'all') {
      const assMeetingNum = ass.meeting?.meetingNumber ?? (ass as any).meeting_number;
      if (assMeetingNum !== undefined && assMeetingNum !== filterMeetingNumber) {
        return false;
      }
    }
    return true;
  });

  const filteredSubmissions = submissionsList.filter((sub) => {
    if (selectedGrade !== 'all') {
      if (sub.gradeLevel !== null && sub.gradeLevel !== selectedGrade) {
        return false;
      }
    }
    if (filterMeetingNumber !== 'all') {
      const targetAss = initialAssignments.find((a) => a.id === sub.assignmentId);
      const assMeetingNum = targetAss?.meeting?.meetingNumber ?? (targetAss as any)?.meeting_number;
      if (assMeetingNum !== undefined && assMeetingNum !== filterMeetingNumber) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Navigation Filter Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
        {/* Tab Selection */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('assignments')}
            className={`px-3.5 sm:px-4 py-2 rounded-2xl text-xs sm:text-sm font-heading font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'assignments'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Daftar Tugas ({filteredAssignments.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('results')}
            className={`px-3.5 sm:px-4 py-2 rounded-2xl text-xs sm:text-sm font-heading font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'results'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Nilai Saya ({filteredSubmissions.length})</span>
          </button>
        </div>

        {/* Meeting / Week Dropdown & Grade Filter */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Dropdown Minggu Pertemuan */}
          <div className="flex items-center gap-1.5 bg-amber-50/80 px-2.5 py-1 rounded-2xl border border-amber-200">
            <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-600" />
              <span>Minggu:</span>
            </span>
            <select
              value={filterMeetingNumber}
              onChange={(e) =>
                setFilterMeetingNumber(e.target.value === 'all' ? 'all' : Number(e.target.value))
              }
              className="text-xs font-heading font-bold bg-white text-amber-950 border border-amber-300 rounded-xl px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-xs transition-colors"
              title="Pilih minggu pertemuan untuk memfilter tugas praktikum siswa"
            >
              <option value="all">Semua Minggu</option>
              {displayMeetingNumbers.map((num) => (
                <option key={num} value={num}>
                  Minggu ke-{num} (Pertemuan {num})
                </option>
              ))}
            </select>
          </div>

          {/* Grade Filter */}
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mr-1">
              <GraduationCap className="w-4 h-4 text-amber-600" />
              Kelas:
            </span>

            {(['all', 4, 5, 6] as const).map((grade) => (
              <button
                key={grade}
                type="button"
                onClick={() => setSelectedGrade(grade as any)}
                className={`text-xs px-2.5 sm:px-3 py-1.5 rounded-2xl font-heading font-bold transition-all cursor-pointer ${
                  selectedGrade === grade
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {grade === 'all' ? 'Semua' : `Kls ${grade}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ==========================================
          TAB 1: DAFTAR TUGAS AKTIF
          ========================================== */}
      {activeTab === 'assignments' && (
        <>
          {filteredAssignments.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 text-slate-400">
              <FileText className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700 text-base">
                Belum ada tugas praktikum untuk {filterMeetingNumber !== 'all' ? `Minggu ke-${filterMeetingNumber}` : ''} {selectedGrade !== 'all' ? `Kelas ${selectedGrade} SD` : ''}.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Silakan tunggu arahan tugas latihan praktikum dari Kak Pembina di lab komputer.
              </p>
              {filterMeetingNumber !== 'all' && (
                <button
                  type="button"
                  onClick={() => setFilterMeetingNumber('all')}
                  className="mt-3 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-xl border border-amber-200 transition-colors cursor-pointer"
                >
                  Tampilkan Semua Minggu
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAssignments.map((ass) => {
                const gdriveLink =
                  ass.gdriveUrl ||
                  process.env.NEXT_PUBLIC_GDRIVE_SUBMISSION_URL ||
                  'https://drive.google.com';

                return (
                  <div
                    key={ass.id}
                    className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800">
                          {ass.meeting ? `Pertemuan ${ass.meeting.meetingNumber}` : 'Tugas Praktik'}
                        </span>
                        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Batas: {ass.dueDate || 'Hari ini'}
                        </span>
                      </div>

                      <h3 className="font-heading font-bold text-slate-900 text-lg mb-2 group-hover:text-amber-700 transition-colors">
                        {ass.title}
                      </h3>

                      {ass.instructions && (
                        <div className="bg-amber-50/60 p-3.5 rounded-2xl text-xs text-amber-950 leading-relaxed mb-4 border border-amber-100">
                          <div className="font-bold text-amber-900 mb-1 flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5 text-amber-600" />
                            Petunjuk Pengerjaan:
                          </div>
                          {ass.instructions}
                        </div>
                      )}

                      {ass.attachmentUrl && (
                        <div className="mb-4">
                          <a
                            href={ass.attachmentUrl}
                            target="_blank"
                            download
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 bg-amber-100/90 hover:bg-amber-200 border border-amber-300/80 px-3.5 py-2 rounded-2xl transition-all shadow-xs"
                          >
                            <FileDown className="w-4 h-4 text-amber-700" />
                            <span>Unduh Lembar Kerja / Panduan Tugas</span>
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Section di bawah border unduh lembar kerja / panduan tugas */}
                    <div className="pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <span className="text-xs text-slate-500 font-medium">
                        Nilai Maksimal: <span className="font-bold text-slate-800">{ass.maxScore}</span>
                      </span>

                      <a
                        href={gdriveLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-blue-600 via-emerald-600 to-amber-600 hover:from-blue-700 hover:via-emerald-700 hover:to-amber-700 text-white text-xs font-heading font-bold px-4 py-2.5 rounded-2xl shadow-md shadow-emerald-600/20 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                        title="Buka Google Drive untuk mengumpulkan hasil tugas praktik"
                      >
                        <svg className="w-4 h-4 shrink-0 drop-shadow-xs" viewBox="0 0 87.3 78" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5l5.4 9.35z" fill="#0066DA"/>
                          <path d="M43.65 25L29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44C.4 50 0 51.55 0 53.1h27.5L43.65 25z" fill="#00AC47"/>
                          <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 10.15 7.9 13.65z" fill="#EA4335"/>
                          <path d="M43.65 25L57.4 1.2C56.05.4 54.5 0 52.85 0H34.45c-1.65 0-3.2.4-4.55 1.2L43.65 25z" fill="#00832D"/>
                          <path d="M59.8 53.1H27.5l-13.75 23.8c1.35.8 2.9 1.2 4.55 1.2h50.6c1.65 0 3.2-.4 4.55-1.2L59.8 53.1z" fill="#2684FC"/>
                          <path d="M73.4 26.5l-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25l16.15 28.1h27.5c0-1.55-.4-3.1-1.2-4.5l-12.7-22.1z" fill="#FFBA00"/>
                        </svg>
                        <span>Kumpulkan Tugas (Google Drive) ↗</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ==========================================
          TAB 2: KARYA TERKUMPUL & NILAI SISWA
          ========================================== */}
      {activeTab === 'results' && (
        <div className="space-y-3">
          {filteredSubmissions.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 text-slate-400">
              <Award className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700 text-base">
                Belum ada tugas yang dikumpulkan untuk {filterMeetingNumber !== 'all' ? `Minggu ke-${filterMeetingNumber}` : ''} {selectedGrade !== 'all' ? `Kelas ${selectedGrade} SD` : ''}.
              </p>
              <p className="text-xs text-slate-400 mt-1">Selesaikan tugas praktikum dan kumpulkan ke Google Drive pembina.</p>
              {filterMeetingNumber !== 'all' && (
                <button
                  type="button"
                  onClick={() => setFilterMeetingNumber('all')}
                  className="mt-3 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 transition-colors cursor-pointer"
                >
                  Tampilkan Semua Minggu
                </button>
              )}
            </div>
          ) : (
            filteredSubmissions.map((sub) => (
              <div
                key={sub.id}
                className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-heading font-bold text-slate-900 text-base">
                      {sub.studentName}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      Kelas {sub.gradeLevel || 4}
                    </span>
                    {sub.status === 'graded' ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Nilai: {sub.score}/100
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        Sudah Terkirim
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 font-medium">
                    Tugas: {sub.assignmentTitle || 'Praktikum Komputer'}
                  </p>

                  {sub.feedback && (
                    <div className="mt-2 text-xs bg-emerald-50 text-emerald-900 p-2.5 rounded-2xl border border-emerald-100 font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Pesan Pembina: &quot;{sub.feedback}&quot;</span>
                    </div>
                  )}
                </div>

                {sub.submissionUrl && (
                  sub.submissionUrl.startsWith('/api/files/') ? (
                    <a
                      href={sub.submissionUrl}
                      target="_blank"
                      download
                      rel="noreferrer"
                      className="text-xs font-bold text-emerald-800 bg-emerald-100/90 hover:bg-emerald-200 border border-emerald-300/80 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors shrink-0 shadow-xs"
                    >
                      <FileDown className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Unduh File Saya</span>
                    </a>
                  ) : (
                    <a
                      href={sub.submissionUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-xl flex items-center gap-1 transition-colors shrink-0"
                    >
                      <span>Buka Link Tugas</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
