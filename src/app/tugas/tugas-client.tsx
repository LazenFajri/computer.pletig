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

const DEFAULT_GDRIVE_SUBMISSION_URL =
  'https://drive.google.com/drive/folders/1sgR-9GFibFvMxeGLKfrqVFh8SAVcI9dO';

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
      } catch { }
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
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
        {/* Tab Selection */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('assignments')}
            className={`px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'assignments'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" aria-hidden="true" />
            <span>Daftar Tugas ({filteredAssignments.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('results')}
            className={`px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'results'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Award className="w-4 h-4" aria-hidden="true" />
            <span>Nilai Saya ({filteredSubmissions.length})</span>
          </button>
        </div>

        {/* Meeting / Week Dropdown & Grade Filter */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Dropdown Minggu Pertemuan */}
          <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
            <span className="text-xs font-medium text-slate-700 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
              <span>Minggu:</span>
            </span>
            <select
              value={filterMeetingNumber}
              onChange={(e) =>
                setFilterMeetingNumber(e.target.value === 'all' ? 'all' : Number(e.target.value))
              }
              className="text-xs font-medium bg-white text-slate-900 border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:border-indigo-600 cursor-pointer shadow-xs transition-colors"
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
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1 mr-1">
              <GraduationCap className="w-4 h-4 text-slate-500" aria-hidden="true" />
              Kelas:
            </span>

            {(['all', 4, 5, 6] as const).map((grade) => (
              <button
                key={grade}
                type="button"
                onClick={() => setSelectedGrade(grade as any)}
                className={`text-xs px-2.5 sm:px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
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
            <div className="bg-white rounded-xl p-10 text-center border border-slate-200 text-slate-400 shadow-xs">
              <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" aria-hidden="true" />
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
                  className="mt-3 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors cursor-pointer"
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
                  DEFAULT_GDRIVE_SUBMISSION_URL;

                return (
                  <div
                    key={ass.id}
                    className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-xs hover:border-slate-300 transition-colors flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-[11px] font-medium uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {ass.meeting ? `Pertemuan ${ass.meeting.meetingNumber}` : 'Tugas Praktik'}
                        </span>
                        <span className="text-xs font-normal text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                          Batas: {ass.dueDate || 'Hari ini'}
                        </span>
                      </div>

                      <h3 className="font-semibold text-slate-900 text-base sm:text-lg mb-2">
                        {ass.title}
                      </h3>

                      {ass.instructions && (
                        <div className="bg-slate-50 p-3.5 rounded-lg text-xs text-slate-700 leading-relaxed mb-4 border border-slate-200">
                          <div className="font-medium text-slate-900 mb-1 flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
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
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-lg transition-colors shadow-xs"
                          >
                            <FileDown className="w-4 h-4 text-slate-500" aria-hidden="true" />
                            <span>Unduh Lembar Kerja / Panduan Tugas</span>
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Section di bawah border unduh lembar kerja / panduan tugas */}
                    <div className="pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <span className="text-xs text-slate-500 font-normal">
                        Nilai Maksimal: <strong className="text-slate-800">{ass.maxScore}</strong>
                      </span>

                      <a
                        href={gdriveLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium px-4 py-2 rounded-lg shadow-xs transition-colors cursor-pointer"
                        title="Buka Google Drive untuk mengumpulkan hasil tugas praktik"
                      >
                        <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Kumpulkan Tugas (Google Drive)</span>
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
            <div className="bg-white rounded-xl p-10 text-center border border-slate-200 text-slate-400 shadow-xs">
              <Award className="w-10 h-10 mx-auto text-slate-300 mb-2" aria-hidden="true" />
              <p className="font-semibold text-slate-700 text-base">
                Belum ada tugas yang dikumpulkan untuk {filterMeetingNumber !== 'all' ? `Minggu ke-${filterMeetingNumber}` : ''} {selectedGrade !== 'all' ? `Kelas ${selectedGrade} SD` : ''}.
              </p>
              <p className="text-xs text-slate-400 mt-1">Selesaikan tugas praktikum dan kumpulkan ke Google Drive pembina.</p>
              {filterMeetingNumber !== 'all' && (
                <button
                  type="button"
                  onClick={() => setFilterMeetingNumber('all')}
                  className="mt-3 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                >
                  Tampilkan Semua Minggu
                </button>
              )}
            </div>
          ) : (
            filteredSubmissions.map((sub) => (
              <div
                key={sub.id}
                className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-900 text-sm sm:text-base">
                      {sub.studentName}
                    </span>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded border border-slate-200 bg-slate-100 text-slate-700">
                      Kelas {sub.gradeLevel || 4}
                    </span>
                    {sub.status === 'graded' ? (
                      <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                        Nilai: {sub.score}/100
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                        Sudah Terkirim
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 font-normal">
                    Tugas: {sub.assignmentTitle || 'Praktikum Komputer'}
                  </p>

                  {sub.feedback && (
                    <div className="mt-2 text-xs bg-slate-50 text-slate-700 p-2.5 rounded-lg border border-slate-200 font-normal flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
                      <span>Catatan Pembina: &quot;{sub.feedback}&quot;</span>
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
                      className="text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shrink-0 shadow-xs"
                    >
                      <FileDown className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                      <span>Unduh File</span>
                    </a>
                  ) : (
                    <a
                      href={sub.submissionUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shrink-0"
                    >
                      <span>Buka Link Tugas</span>
                      <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
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
