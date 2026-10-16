'use client';

import { useState, useEffect, useTransition } from 'react';
import type { AssignmentWithDetails, SubmissionWithDetails } from '@/app/actions/assignment-actions';
import { submitAssignmentAction } from '@/app/actions/assignment-actions';
import { getStudentsByGradeAction } from '@/app/actions/attendance-actions';
import type { GradeLevel, SessionUser } from '@/lib/auth-types';
import { playSuccessChime } from '@/components/audio-feedback';
import ConfettiCelebration from '@/components/confetti';
import {
  FileText,
  Upload,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  GraduationCap,
  Award,
  Users,
  Search,
  AlertCircle,
  Send,
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
  const [isPending, startTransition] = useTransition();

  // Submission Form Modal
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentWithDetails | null>(null);
  const [formGrade, setFormGrade] = useState<GradeLevel>(4);
  const [studentName, setStudentName] = useState('');
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [submissionText, setSubmissionText] = useState('');

  // Auto-suggest students for chosen grade
  const [studentsList, setStudentsList] = useState<StudentItem[]>([]);
  const [searchStudent, setSearchStudent] = useState('');

  // Status & feedback
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // Submissions state
  const [submissionsList, setSubmissionsList] = useState<SubmissionWithDetails[]>(initialSubmissions);

  // Load students when form grade changes
  useEffect(() => {
    let isMounted = true;
    getStudentsByGradeAction(formGrade).then((students) => {
      if (isMounted) {
        setStudentsList(students as StudentItem[]);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [formGrade]);

  const handleOpenSubmitModal = (assignment: AssignmentWithDetails) => {
    setSelectedAssignment(assignment);
    const defaultG = assignment.meeting?.gradeLevel
      ? (assignment.meeting.gradeLevel as GradeLevel)
      : (4 as GradeLevel);
    setFormGrade(defaultG);
    setStudentName('');
    setSearchStudent('');
    setSubmissionUrl('');
    setSubmissionText('');
    setStatusMsg(null);
  };

  const handleSelectStudentChip = (name: string) => {
    setStudentName(name);
    setSearchStudent(name);
  };

  const filteredStudents = studentsList.filter((s) =>
    s.name.toLowerCase().includes(searchStudent.toLowerCase())
  );

  const handleSubmitTask = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = studentName.trim() || searchStudent.trim();

    if (!finalName || finalName.length < 2) {
      setStatusMsg({ type: 'error', text: 'Silakan pilih atau ketik nama lengkap kamu ya.' });
      return;
    }

    if (!submissionUrl.trim() && !submissionText.trim()) {
      setStatusMsg({
        type: 'error',
        text: 'Silakan isi link tugas (Google Drive / Canva / Scratch) atau ketik catatan hasil praktikummu.',
      });
      return;
    }

    if (!selectedAssignment) return;

    startTransition(async () => {
      const res = await submitAssignmentAction({
        assignmentId: selectedAssignment.id,
        studentName: finalName,
        gradeLevel: formGrade,
        submissionUrl,
        submissionText,
      });

      if (res.success && res.data) {
        playSuccessChime();
        setShowConfetti(true);
        setStatusMsg({
          type: 'success',
          text: res.message || 'Tugas berhasil dikirim! Hebat sekali!',
        });

        // Add to local submissions list
        const newSub: SubmissionWithDetails = {
          id: res.data.id,
          assignmentId: res.data.assignment_id,
          studentName: res.data.student_name,
          gradeLevel: res.data.grade_level,
          submissionUrl: res.data.submission_url,
          submissionText: res.data.submission_text,
          submittedAt: new Date(),
          status: 'submitted',
          score: null,
          feedback: null,
          gradedAt: null,
          assignmentTitle: selectedAssignment.title,
        };

        setSubmissionsList([newSub, ...submissionsList]);

        setTimeout(() => {
          setSelectedAssignment(null);
        }, 1800);
      } else {
        setStatusMsg({ type: 'error', text: res.error || 'Gagal mengirim tugas.' });
      }
    });
  };

  const filteredAssignments = initialAssignments.filter((ass) => {
    if (selectedGrade !== 'all') {
      if (ass.meeting && ass.meeting.gradeLevel !== null && ass.meeting.gradeLevel !== selectedGrade) {
        return false;
      }
    }
    return true;
  });

  const filteredSubmissions = submissionsList.filter((sub) => {
    if (selectedGrade !== 'all') {
      if (sub.gradeLevel !== selectedGrade) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <ConfettiCelebration active={showConfetti} onFinish={() => setShowConfetti(false)} />

      {/* Navigation Filter Bar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Tab Selection */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('assignments')}
            className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-heading font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'assignments'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Daftar Tugas Praktik ({filteredAssignments.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('results')}
            className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-heading font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'results'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Karya Terkumpul & Nilai ({filteredSubmissions.length})</span>
          </button>
        </div>

        {/* Grade Filter */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mr-1">
            <GraduationCap className="w-4 h-4 text-amber-600" />
            Kelas:
          </span>

          {(['all', 4, 5, 6] as const).map((grade) => (
            <button
              key={grade}
              type="button"
              onClick={() => setSelectedGrade(grade as any)}
              className={`text-xs px-3 py-1.5 rounded-2xl font-heading font-bold transition-all cursor-pointer ${
                selectedGrade === grade
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {grade === 'all' ? 'Semua' : `Kelas ${grade} SD`}
            </button>
          ))}
        </div>
      </div>

      {/* ==========================================
          TAB 1: DAFTAR TUGAS AKTIF
          ========================================== */}
      {activeTab === 'assignments' && (
        <>
          {filteredAssignments.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-400">
              <FileText className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-600 text-base">Belum ada tugas praktikum aktif untuk kelas ini.</p>
              <p className="text-xs text-slate-400 mt-1">Silakan ikuti materi pembelajaran terlebih dahulu bersama Kak Pembina.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAssignments.map((ass) => (
                <div
                  key={ass.id}
                  className="bg-white rounded-3xl p-6 border-2 border-slate-100 hover:border-amber-300 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
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
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">
                      Nilai Maksimal: <span className="font-bold text-slate-800">{ass.maxScore}</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => handleOpenSubmitModal(ass)}
                      className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-heading font-bold px-4 py-2.5 rounded-2xl shadow-md shadow-amber-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Kirim Tugas Saya</span>
                    </button>
                  </div>
                </div>
              ))}
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
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-400">
              <Award className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-600 text-base">Belum ada tugas yang dikumpulkan.</p>
              <p className="text-xs text-slate-400 mt-1">Selesaikan tugas praktikum dan tekan tombol &quot;Kirim Tugas Saya&quot;.</p>
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
                  <a
                    href={sub.submissionUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-xl flex items-center gap-1 transition-colors shrink-0"
                  >
                    <span>Buka File / Link</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ==========================================
          MODAL FORMULIR PENGUMPULAN TUGAS SISWA
          ========================================== */}
      {selectedAssignment && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                    Kirim Tugas Siswa
                  </span>
                  <h3 className="font-heading font-bold text-base text-slate-900 mt-0.5">
                    {selectedAssignment.title}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAssignment(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Notification message */}
            {statusMsg && (
              <div
                className={`p-3.5 rounded-2xl text-xs font-semibold mb-4 flex items-center gap-2 ${
                  statusMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : 'bg-rose-50 text-rose-900 border border-rose-200'
                }`}
              >
                {statusMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{statusMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleSubmitTask} className="space-y-4">
              {/* Step 1: Pilih Kelas */}
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-amber-600" />
                  1. Pilih Kelas Kamu
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[4, 5, 6].map((grade) => (
                    <button
                      key={grade}
                      type="button"
                      onClick={() => {
                        setFormGrade(grade as GradeLevel);
                        setStudentName('');
                        setSearchStudent('');
                      }}
                      className={`py-2 rounded-2xl text-xs font-heading font-bold border-2 transition-all cursor-pointer ${
                        formGrade === grade
                          ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-xs'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      Kelas {grade} SD
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Pilih / Ketik Nama Siswa */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-amber-600" />
                    2. Pilih atau Ketik Namamu
                  </label>
                  {studentName && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Terpilih
                    </span>
                  )}
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Ketik namamu di sini (misal: Aditia / Fathan)..."
                    value={searchStudent}
                    onChange={(e) => {
                      setSearchStudent(e.target.value);
                      setStudentName(e.target.value);
                    }}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl border border-slate-300 text-sm focus:border-amber-600 outline-none"
                  />
                </div>

                {/* Auto-suggest Chips */}
                {searchStudent.length > 0 && filteredStudents.length > 0 && (
                  <div className="mt-2 max-h-36 overflow-y-auto p-1.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap gap-1.5">
                    {filteredStudents.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSelectStudentChip(s.name)}
                        className={`text-xs px-2.5 py-1 rounded-xl transition-all font-medium cursor-pointer ${
                          studentName.toLowerCase() === s.name.toLowerCase()
                            ? 'bg-amber-500 text-white font-bold shadow-xs'
                            : 'bg-white hover:bg-amber-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {s.name} ({s.class_name || `${formGrade}A`})
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Step 3: Link Tugas */}
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1.5">
                  3. Link Hasil Tugas (Google Drive / Canva / Scratch / Video)
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/... atau https://scratch.mit.edu/..."
                  value={submissionUrl}
                  onChange={(e) => setSubmissionUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 text-sm focus:border-amber-600 outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Pastikan link Google Drive atau Canva disetel &quot;Siapa saja yang memiliki link dapat melihat&quot;.
                </span>
              </div>

              {/* Step 4: Catatan / Teks Tambahan */}
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1.5">
                  4. Catatan Tugas / Cerita Singkat (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Saya sudah mengetik 5 kalimat di Word dan menambahkan gambar pemandangan..."
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-2xl border border-slate-300 text-sm focus:border-amber-600 outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedAssignment(null)}
                  className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-heading font-bold px-6 py-2.5 rounded-2xl shadow-md shadow-amber-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{isPending ? 'Mengirim...' : 'Kirim Tugas Saya'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
