'use client';

import { useState, useTransition, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  createMeetingAction,
  deleteMeetingAction,
  toggleMeetingStatusAction,
  updateMeetingAction,
  getAllMeetingsAction,
  type MeetingItemWithCounts,
} from '@/app/actions/meeting-actions';
import {
  createMaterialAction,
  deleteMaterialAction,
  updateMaterialAction,
  getMaterialsAction,
  type MaterialWithMeeting,
} from '@/app/actions/material-actions';
import {
  createAssignmentAction,
  deleteAssignmentAction,
  gradeSubmissionAction,
  updateAssignmentAction,
  getAssignmentsAction,
  getSubmissionsAction,
  type AssignmentWithDetails,
  type SubmissionWithDetails,
} from '@/app/actions/assignment-actions';
import {
  getMeetingAttendancesAction,
  deleteAttendanceAction,
} from '@/app/actions/attendance-actions';
import { saveOfflineData, getOfflineData, OFFLINE_KEYS } from '@/lib/offline-storage';
import {
  getRekapDataAction,
  cleanupStaleAttendanceAction,
  clearMeetingAttendanceAction,
  exportRekapExcelAction,
  type RekapItemPreview,
  type RekapSummaryData,
} from '@/app/actions/rekap-actions';
import type { GradeLevel } from '@/lib/auth-types';
import {
  Calendar,
  CalendarCheck,
  Clock,
  Plus,
  Trash2,
  BookOpen,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Users,
  Award,
  ToggleLeft,
  ToggleRight,
  Filter,
  Send,
  Video,
  Link as LinkIcon,
  Search,
  Check,
  Laptop,
  AlertTriangle,
  Pencil,
  FileSpreadsheet,
  Download,
  Database,
  RefreshCw,
  Archive,
} from 'lucide-react';

interface AdminDashboardClientProps {
  initialMeetings: MeetingItemWithCounts[];
  initialMaterials: MaterialWithMeeting[];
  initialAssignments: AssignmentWithDetails[];
  initialSubmissions: SubmissionWithDetails[];
  userName: string;
}

export default function AdminDashboardClient({
  initialMeetings,
  initialMaterials,
  initialAssignments,
  initialSubmissions,
  userName,
}: AdminDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<'meetings' | 'materials' | 'assignments' | 'submissions' | 'rekap'>('meetings');
  const [isPending, startTransition] = useTransition();

  // State lists
  const [meetingsList, setMeetingsList] = useState(initialMeetings);
  const [materialsList, setMaterialsList] = useState(initialMaterials);
  const [assignmentsList, setAssignmentsList] = useState(initialAssignments);
  const [submissionsList, setSubmissionsList] = useState(initialSubmissions);

  // Sync state saat initial props dari server ter-update
  useEffect(() => {
    if (Array.isArray(initialMeetings)) {
      setMeetingsList(initialMeetings);
      saveOfflineData(OFFLINE_KEYS.ALL_MEETINGS, initialMeetings);
    }
  }, [initialMeetings]);

  useEffect(() => {
    if (Array.isArray(initialMaterials)) {
      setMaterialsList(initialMaterials);
      saveOfflineData(OFFLINE_KEYS.MATERIALS, initialMaterials);
    }
  }, [initialMaterials]);

  useEffect(() => {
    if (Array.isArray(initialAssignments)) {
      setAssignmentsList(initialAssignments);
      saveOfflineData(OFFLINE_KEYS.ASSIGNMENTS, initialAssignments);
    }
  }, [initialAssignments]);

  useEffect(() => {
    if (Array.isArray(initialSubmissions)) {
      setSubmissionsList(initialSubmissions);
    }
  }, [initialSubmissions]);

  // Real-time synchronization: Saat pull-to-refresh ditarik atau berkala tiap 4 detik jika tab aktif
  const refetchAllData = useCallback(async () => {
    try {
      const [refreshedM, refreshedMat, refreshedAss, refreshedSub] = await Promise.all([
        getAllMeetingsAction(),
        getMaterialsAction(),
        getAssignmentsAction(),
        getSubmissionsAction(),
      ]);

      if (Array.isArray(refreshedM)) {
        saveOfflineData(OFFLINE_KEYS.ALL_MEETINGS, refreshedM);
        setMeetingsList((prev) => {
          if (JSON.stringify(prev) !== JSON.stringify(refreshedM)) {
            return refreshedM;
          }
          return prev;
        });
      }
      if (Array.isArray(refreshedMat)) {
        saveOfflineData(OFFLINE_KEYS.MATERIALS, refreshedMat);
        setMaterialsList((prev) => {
          if (JSON.stringify(prev) !== JSON.stringify(refreshedMat)) {
            return refreshedMat;
          }
          return prev;
        });
      }
      if (Array.isArray(refreshedAss)) {
        saveOfflineData(OFFLINE_KEYS.ASSIGNMENTS, refreshedAss);
        setAssignmentsList((prev) => {
          if (JSON.stringify(prev) !== JSON.stringify(refreshedAss)) {
            return refreshedAss;
          }
          return prev;
        });
      }
      if (Array.isArray(refreshedSub)) {
        setSubmissionsList((prev) => {
          if (JSON.stringify(prev) !== JSON.stringify(refreshedSub)) {
            return refreshedSub;
          }
          return prev;
        });
      }
    } catch {
      // silent fallback
    }
  }, []);

  useEffect(() => {
    // 1. Respon event pull-to-refresh seketika
    const handlePullRefresh = () => {
      refetchAllData();
    };
    window.addEventListener('app:pull-to-refresh', handlePullRefresh);

    // 2. Auto-sync realtime tiap 5 detik (hanya jika tab/layar sedang aktif)
    const timer = setInterval(() => {
      if (document.hidden) return;
      refetchAllData();
    }, 5000);

    return () => {
      window.removeEventListener('app:pull-to-refresh', handlePullRefresh);
      clearInterval(timer);
    };
  }, [refetchAllData]);

  // Rekap Presensi State
  const [rekapMeetingFilter, setRekapMeetingFilter] = useState<string>('all');
  const [rekapGradeFilter, setRekapGradeFilter] = useState<GradeLevel | 'all'>('all');
  const [rekapStatusTab, setRekapStatusTab] = useState<'all' | 'HADIR' | 'TIDAK HADIR'>('all');
  const [cleanupAfterDownload, setCleanupAfterDownload] = useState<boolean>(false);
  const [rekapData, setRekapData] = useState<RekapSummaryData | null>(null);
  const [loadingRekap, setLoadingRekap] = useState<boolean>(false);
  const [isCleaningStale, setIsCleaningStale] = useState<boolean>(false);
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);

  // Filter grade
  const [filterGrade, setFilterGrade] = useState<GradeLevel | 'all'>('all');

  // Modal / Form state: Sesi Pertemuan Baru
  const [showNewMeetingModal, setShowNewMeetingModal] = useState(false);
  const [meetingForm, setMeetingForm] = useState({
    title: '',
    meetingNumber: meetingsList.length > 0 ? Math.max(...meetingsList.map((m) => m.meetingNumber)) + 1 : 1,
    gradeLevel: 'all' as 'all' | '4' | '5' | '6',
    date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date()),
    startTime: '12:30',
    endTime: '14:00',
    description: '',
    isOpen: true,
  });

  // Modal / Form state: Materi Baru
  const [showNewMaterialModal, setShowNewMaterialModal] = useState(false);
  const [materialForm, setMaterialForm] = useState({
    meetingId: meetingsList[0]?.id || '',
    title: '',
    contentMarkdown: '',
    fileUrl: '',
    fileType: 'link' as 'link' | 'pdf' | 'doc' | 'video',
  });

  // Modal / Form state: Tugas Baru
  const [showNewAssignmentModal, setShowNewAssignmentModal] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({
    meetingId: meetingsList[0]?.id || '',
    title: '',
    instructions: '',
    dueDate: '',
    maxScore: 100,
  });

  // Feedback & Message notifications
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Grading state
  const [gradingState, setGradingState] = useState<Record<string, { score: number; feedback: string }>>({});

  // Custom Confirmation Modal State (Pengganti confirm() browser)
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: 'meeting' | 'material' | 'assignment';
    id: string;
    title: string;
    details?: string;
  }>({
    isOpen: false,
    type: 'meeting',
    id: '',
    title: '',
  });

  // Edit Modal States
  const [editMeetingModal, setEditMeetingModal] = useState<{
    isOpen: boolean;
    data: MeetingItemWithCounts | null;
  }>({ isOpen: false, data: null });

  const [editMaterialModal, setEditMaterialModal] = useState<{
    isOpen: boolean;
    data: MaterialWithMeeting | null;
  }>({ isOpen: false, data: null });

  const [editAssignmentModal, setEditAssignmentModal] = useState<{
    isOpen: boolean;
    data: AssignmentWithDetails | null;
  }>({ isOpen: false, data: null });

  // Modal Daftar Hadir Siswa per Sesi
  const [attendanceListModal, setAttendanceListModal] = useState<{
    isOpen: boolean;
    meetingId: string;
    meetingTitle: string;
    list: Array<{
      id: string;
      student_name: string;
      grade_level: number;
      checked_in_at: Date;
    }>;
    loading: boolean;
  }>({
    isOpen: false,
    meetingId: '',
    meetingTitle: '',
    list: [],
    loading: false,
  });

  const showNotification = (type: 'success' | 'error', text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 5000);
  };

  const handleOpenAttendanceList = async (meetingId: string, meetingTitle: string) => {
    setAttendanceListModal({
      isOpen: true,
      meetingId,
      meetingTitle,
      list: [],
      loading: true,
    });
    try {
      const records = await getMeetingAttendancesAction(meetingId);
      setAttendanceListModal((prev) => ({
        ...prev,
        list: records as any,
        loading: false,
      }));
    } catch {
      setAttendanceListModal((prev) => ({ ...prev, loading: false }));
      showNotification('error', 'Gagal memuat data presensi siswa.');
    }
  };

  const handleDeleteAttendanceRecord = async (attendanceId: string, studentName: string) => {
    startTransition(async () => {
      const res = await deleteAttendanceAction(attendanceId);
      if (res.success) {
        showNotification('success', `Presensi atas nama "${studentName}" berhasil dihapus.`);
        setAttendanceListModal((prev) => ({
          ...prev,
          list: prev.list.filter((a) => a.id !== attendanceId),
        }));
        setMeetingsList((prev) =>
          prev.map((m) =>
            m.id === attendanceListModal.meetingId
              ? { ...m, attendanceCount: Math.max(0, m.attendanceCount - 1) }
              : m
          )
        );
      } else {
        showNotification('error', res.error || 'Gagal menghapus presensi.');
      }
    });
  };

  // --- REKAP PRESENSI & EXCEL EXPORT HANDLERS ---
  const loadRekap = useCallback(async (meetingId?: string, grade?: GradeLevel | 'all') => {
    setLoadingRekap(true);
    try {
      const data = await getRekapDataAction(
        meetingId ?? rekapMeetingFilter,
        grade ?? rekapGradeFilter
      );
      setRekapData(data);
    } catch {
      showNotification('error', 'Gagal memuat data rekap presensi.');
    } finally {
      setLoadingRekap(false);
    }
  }, [rekapMeetingFilter, rekapGradeFilter]);

  useEffect(() => {
    if (activeTab === 'rekap') {
      loadRekap(rekapMeetingFilter, rekapGradeFilter);
    }
  }, [activeTab, rekapMeetingFilter, rekapGradeFilter, loadRekap]);

  const handleDownloadRekapExcel = async (
    meetingId?: string,
    grade?: GradeLevel | 'all',
    cleanup?: boolean
  ) => {
    if (isExportingExcel) return;
    const mId = meetingId ?? rekapMeetingFilter;
    const grd = grade ?? rekapGradeFilter;
    const clean = cleanup ?? cleanupAfterDownload;

    setIsExportingExcel(true);
    showNotification('success', 'Sedang menyiapkan berkas Excel...');

    try {
      // 1. Ekspor melalui Server Action (100% aman session & kompatibel di mobile browser / Android WebView)
      const res = await exportRekapExcelAction(mId, grd, clean);
      if (!res.success || !res.data?.base64) {
        showNotification('error', res.error || 'Gagal membuat file Excel rekap presensi.');
        setIsExportingExcel(false);
        return;
      }

      // 2. Buat Blob Excel (.xlsx) dengan MIME type resmi agar tidak tersimpan sebagai file .json
      const binaryString = window.atob(res.data.base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const fileName = res.data.filename || `Rekap_Presensi_Komputer_${Date.now()}.xlsx`;

      // 3. Unduh berkas melalui Object URL
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 10000);

      if (clean) {
        showNotification(
          'success',
          'File Excel berhasil diunduh dan data presensi telah dibersihkan untuk menghemat database Turso!'
        );
        setTimeout(() => {
          loadRekap(mId, grd);
          if (mId !== 'all') {
            setMeetingsList((prev) =>
              prev.map((m) => (m.id === mId ? { ...m, attendanceCount: 0 } : m))
            );
          } else {
            setMeetingsList((prev) =>
              prev.map((m) => ({ ...m, attendanceCount: 0 }))
            );
          }
        }, 1500);
      } else {
        showNotification('success', `File Excel (${fileName}) berhasil diunduh!`);
      }
    } catch (err) {
      console.error('Error downloading excel:', err);
      // Fallback: Direct endpoint URL dengan filename eksplisit jika blob browser dibatasi
      try {
        const url = `/api/admin/rekap-excel?meetingId=${encodeURIComponent(mId)}&grade=${encodeURIComponent(grd)}&cleanup=${clean ? 'true' : 'false'}`;
        const link = document.createElement('a');
        link.href = url;
        link.download = `Rekap_Presensi_Komputer.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch {
        showNotification('error', 'Terjadi kesalahan saat mengunduh file Excel.');
      }
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleCleanupStale = async () => {
    setIsCleaningStale(true);
    try {
      const res = await cleanupStaleAttendanceAction();
      if (res.success) {
        showNotification('success', res.message || 'Pembersihan data lampau berhasil!');
        loadRekap(rekapMeetingFilter, rekapGradeFilter);
        // Refresh meeting attendances
        const refreshedMeetings = await dbRefreshMeetings();
        if (refreshedMeetings) setMeetingsList(refreshedMeetings);
      } else {
        showNotification('error', res.error || 'Gagal membersihkan data.');
      }
    } catch {
      showNotification('error', 'Terjadi kendala saat pembersihan database.');
    } finally {
      setIsCleaningStale(false);
    }
  };

  const dbRefreshMeetings = async () => {
    try {
      const data = await getRekapDataAction('all', 'all');
      return meetingsList.map((m) => {
        const count = data.records.filter((r) => r.meetingId === m.id).length;
        return { ...m, attendanceCount: count };
      });
    } catch {
      return null;
    }
  };

  // --- HANDLER: CREATE MEETING ---
  const handleCreateMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingForm.title.trim()) {
      showNotification('error', 'Judul pertemuan wajib diisi.');
      return;
    }

    startTransition(async () => {
      const res = await createMeetingAction({
        title: meetingForm.title,
        meetingNumber: Number(meetingForm.meetingNumber),
        gradeLevel: meetingForm.gradeLevel === 'all' ? null : (Number(meetingForm.gradeLevel) as GradeLevel),
        date: meetingForm.date,
        startTime: meetingForm.startTime,
        endTime: meetingForm.endTime,
        description: meetingForm.description,
        isOpen: meetingForm.isOpen,
      });

      if (res.success && res.data) {
        showNotification('success', res.message || 'Sesi pertemuan berhasil dibuat!');
        const newM: MeetingItemWithCounts = {
          id: res.data.id,
          meetingNumber: res.data.meeting_number,
          gradeLevel: res.data.grade_level,
          title: res.data.title,
          description: res.data.description,
          date: res.data.date,
          startTime: res.data.start_time,
          endTime: res.data.end_time,
          isOpen: res.data.is_open,
          isActive: res.data.is_active,
          attendanceCount: 0,
          materialCount: 0,
          assignmentCount: 0,
          createdAt: new Date(),
        };
        setMeetingsList([newM, ...meetingsList]);
        setShowNewMeetingModal(false);
        setMeetingForm({
          title: '',
          meetingNumber: newM.meetingNumber + 1,
          gradeLevel: 'all',
          date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date()),
          startTime: '12:30',
          endTime: '14:00',
          description: '',
          isOpen: true,
        });
      } else {
        showNotification('error', res.error || 'Gagal membuat sesi.');
      }
    });
  };

  // --- HANDLER: UPDATE MEETING ---
  const handleUpdateMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMeetingModal.data || !editMeetingModal.data.title.trim()) {
      showNotification('error', 'Judul pertemuan wajib diisi.');
      return;
    }

    startTransition(async () => {
      const target = editMeetingModal.data!;
      const res = await updateMeetingAction({
        meetingId: target.id,
        title: target.title,
        meetingNumber: Number(target.meetingNumber),
        gradeLevel: target.gradeLevel as GradeLevel | null,
        date: target.date,
        startTime: target.startTime,
        endTime: target.endTime,
        description: target.description || '',
        isOpen: target.isOpen,
      });

      if (res.success && res.data) {
        showNotification('success', res.message || 'Sesi berhasil diperbarui!');
        setMeetingsList(
          meetingsList.map((m) =>
            m.id === target.id
              ? {
                  ...m,
                  title: target.title,
                  meetingNumber: target.meetingNumber,
                  gradeLevel: target.gradeLevel,
                  date: target.date,
                  startTime: target.startTime,
                  endTime: target.endTime,
                  description: target.description,
                  isOpen: target.isOpen,
                  isActive: target.isOpen,
                }
              : m
          )
        );
        setEditMeetingModal({ isOpen: false, data: null });
      } else {
        showNotification('error', res.error || 'Gagal memperbarui sesi.');
      }
    });
  };

  // --- HANDLER: PROMPT DELETE MEETING ---
  const promptDeleteMeeting = (meetingId: string, title: string) => {
    setDeleteModal({
      isOpen: true,
      type: 'meeting',
      id: meetingId,
      title,
      details: 'Data presensi siswa, modul materi, dan tugas praktikum pada sesi ini juga akan terhapus secara permanen.',
    });
  };

  // --- HANDLER: TOGGLE MEETING OPEN STATUS ---
  const handleToggleMeetingStatus = (meetingId: string, currentOpen: boolean) => {
    const nextStatus = !currentOpen;
    startTransition(async () => {
      const res = await toggleMeetingStatusAction(meetingId, nextStatus);
      if (res.success) {
        showNotification('success', res.message || 'Status sesi berhasil diubah.');
        setMeetingsList(
          meetingsList.map((m) => (m.id === meetingId ? { ...m, isOpen: nextStatus, isActive: nextStatus } : m))
        );
      } else {
        showNotification('error', res.error || 'Gagal mengubah status.');
      }
    });
  };

  // --- HANDLER: CREATE MATERIAL ---
  const handleCreateMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialForm.title.trim()) {
      showNotification('error', 'Judul materi wajib diisi.');
      return;
    }

    startTransition(async () => {
      const res = await createMaterialAction({
        meetingId: materialForm.meetingId,
        title: materialForm.title,
        contentMarkdown: materialForm.contentMarkdown,
        fileUrl: materialForm.fileUrl,
        fileType: materialForm.fileType,
      });

      if (res.success && res.data) {
        showNotification('success', res.message || 'Materi berhasil ditambahkan!');
        const parentMeeting = meetingsList.find((m) => m.id === materialForm.meetingId);
        const newMat: MaterialWithMeeting = {
          id: res.data.id,
          meetingId: res.data.meeting_id,
          title: res.data.title,
          contentMarkdown: res.data.content_markdown,
          fileUrl: res.data.file_url,
          fileType: res.data.file_type as any,
          orderIndex: res.data.order_index,
          createdAt: new Date(),
          meeting: parentMeeting
            ? {
                id: parentMeeting.id,
                meetingNumber: parentMeeting.meetingNumber,
                title: parentMeeting.title,
                gradeLevel: parentMeeting.gradeLevel,
                date: parentMeeting.date,
              }
            : null,
        };
        setMaterialsList([newMat, ...materialsList]);
        setShowNewMaterialModal(false);
        setMaterialForm({
          meetingId: meetingsList[0]?.id || '',
          title: '',
          contentMarkdown: '',
          fileUrl: '',
          fileType: 'link',
        });
      } else {
        showNotification('error', res.error || 'Gagal menambahkan materi.');
      }
    });
  };

  // --- HANDLER: UPDATE MATERIAL ---
  const handleUpdateMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMaterialModal.data || !editMaterialModal.data.title.trim()) {
      showNotification('error', 'Judul materi wajib diisi.');
      return;
    }

    startTransition(async () => {
      const target = editMaterialModal.data!;
      const res = await updateMaterialAction({
        materialId: target.id,
        meetingId: target.meetingId,
        title: target.title,
        contentMarkdown: target.contentMarkdown || '',
        fileUrl: target.fileUrl || '',
        fileType: target.fileType as any,
        orderIndex: target.orderIndex,
      });

      if (res.success && res.data) {
        showNotification('success', res.message || 'Materi berhasil diperbarui!');
        const parentMeeting = meetingsList.find((m) => m.id === target.meetingId);
        setMaterialsList(
          materialsList.map((mat) =>
            mat.id === target.id
              ? {
                  ...mat,
                  meetingId: target.meetingId,
                  title: target.title,
                  contentMarkdown: target.contentMarkdown,
                  fileUrl: target.fileUrl,
                  fileType: target.fileType,
                  meeting: parentMeeting
                    ? {
                        id: parentMeeting.id,
                        meetingNumber: parentMeeting.meetingNumber,
                        title: parentMeeting.title,
                        gradeLevel: parentMeeting.gradeLevel,
                        date: parentMeeting.date,
                      }
                    : mat.meeting,
                }
              : mat
          )
        );
        setEditMaterialModal({ isOpen: false, data: null });
      } else {
        showNotification('error', res.error || 'Gagal memperbarui materi.');
      }
    });
  };

  // --- HANDLER: PROMPT DELETE MATERIAL ---
  const promptDeleteMaterial = (materialId: string, title: string) => {
    setDeleteModal({
      isOpen: true,
      type: 'material',
      id: materialId,
      title,
      details: 'Modul materi ini tidak akan dapat diakses lagi oleh siswa di perpustakaan digital.',
    });
  };

  // --- HANDLER: CREATE ASSIGNMENT ---
  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignmentForm.title.trim()) {
      showNotification('error', 'Judul tugas wajib diisi.');
      return;
    }

    startTransition(async () => {
      const res = await createAssignmentAction({
        meetingId: assignmentForm.meetingId,
        title: assignmentForm.title,
        instructions: assignmentForm.instructions,
        dueDate: assignmentForm.dueDate,
        maxScore: Number(assignmentForm.maxScore) || 100,
      });

      if (res.success && res.data) {
        showNotification('success', res.message || 'Tugas berhasil dibuat!');
        const parentMeeting = meetingsList.find((m) => m.id === assignmentForm.meetingId);
        const newAss: AssignmentWithDetails = {
          id: res.data.id,
          meetingId: res.data.meeting_id,
          title: res.data.title,
          instructions: res.data.instructions,
          dueDate: res.data.due_date,
          maxScore: res.data.max_score,
          createdAt: new Date(),
          submissionCount: 0,
          meeting: parentMeeting
            ? {
                id: parentMeeting.id,
                meetingNumber: parentMeeting.meetingNumber,
                title: parentMeeting.title,
                gradeLevel: parentMeeting.gradeLevel,
                date: parentMeeting.date,
              }
            : null,
        };
        setAssignmentsList([newAss, ...assignmentsList]);
        setShowNewAssignmentModal(false);
        setAssignmentForm({
          meetingId: meetingsList[0]?.id || '',
          title: '',
          instructions: '',
          dueDate: '',
          maxScore: 100,
        });
      } else {
        showNotification('error', res.error || 'Gagal membuat tugas.');
      }
    });
  };

  // --- HANDLER: UPDATE ASSIGNMENT ---
  const handleUpdateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAssignmentModal.data || !editAssignmentModal.data.title.trim()) {
      showNotification('error', 'Judul tugas wajib diisi.');
      return;
    }

    startTransition(async () => {
      const target = editAssignmentModal.data!;
      const res = await updateAssignmentAction({
        assignmentId: target.id,
        meetingId: target.meetingId,
        title: target.title,
        instructions: target.instructions || '',
        dueDate: target.dueDate || '',
        maxScore: Number(target.maxScore) || 100,
      });

      if (res.success && res.data) {
        showNotification('success', res.message || 'Tugas berhasil diperbarui!');
        const parentMeeting = meetingsList.find((m) => m.id === target.meetingId);
        setAssignmentsList(
          assignmentsList.map((ass) =>
            ass.id === target.id
              ? {
                  ...ass,
                  meetingId: target.meetingId,
                  title: target.title,
                  instructions: target.instructions,
                  dueDate: target.dueDate,
                  maxScore: target.maxScore,
                  meeting: parentMeeting
                    ? {
                        id: parentMeeting.id,
                        meetingNumber: parentMeeting.meetingNumber,
                        title: parentMeeting.title,
                        gradeLevel: parentMeeting.gradeLevel,
                        date: parentMeeting.date,
                      }
                    : ass.meeting,
                }
              : ass
          )
        );
        setEditAssignmentModal({ isOpen: false, data: null });
      } else {
        showNotification('error', res.error || 'Gagal memperbarui tugas.');
      }
    });
  };

  // --- HANDLER: PROMPT DELETE ASSIGNMENT ---
  const promptDeleteAssignment = (assignmentId: string, title: string) => {
    setDeleteModal({
      isOpen: true,
      type: 'assignment',
      id: assignmentId,
      title,
      details: 'Seluruh berkas pengumpulan hasil karya dan nilai siswa pada tugas ini akan ikut terhapus.',
    });
  };

  // --- HANDLER: CONFIRM DELETE (EXECUTOR) ---
  const handleConfirmDelete = () => {
    if (!deleteModal.id) return;
    const targetId = deleteModal.id;
    const targetType = deleteModal.type;

    // Tutup modal konfirmasi seketika
    setDeleteModal({ isOpen: false, type: 'meeting', id: '', title: '' });

    startTransition(async () => {
      if (targetType === 'meeting') {
        // 1. Optimistic UI update: hilangkan langsung dari tampilan layar
        setMeetingsList((prev) => {
          const next = prev.filter((m) => m.id !== targetId);
          saveOfflineData(OFFLINE_KEYS.ALL_MEETINGS, next);
          return next;
        });
        try {
          const homeCached = getOfflineData<any[]>(OFFLINE_KEYS.HOME_MEETINGS);
          if (homeCached) {
            saveOfflineData(OFFLINE_KEYS.HOME_MEETINGS, homeCached.filter((m) => m.id !== targetId));
          }
        } catch {}

        const res = await deleteMeetingAction(targetId);
        if (res.success) {
          showNotification('success', res.message || 'Sesi pertemuan berhasil dihapus.');
        } else {
          showNotification('error', res.error || 'Gagal menghapus sesi.');
        }
        refetchAllData();
      } else if (targetType === 'material') {
        setMaterialsList((prev) => {
          const next = prev.filter((m) => m.id !== targetId);
          saveOfflineData(OFFLINE_KEYS.MATERIALS, next);
          return next;
        });

        const res = await deleteMaterialAction(targetId);
        if (res.success) {
          showNotification('success', res.message || 'Materi berhasil dihapus.');
        } else {
          showNotification('error', res.error || 'Gagal menghapus materi.');
        }
        refetchAllData();
      } else if (targetType === 'assignment') {
        setAssignmentsList((prev) => {
          const next = prev.filter((a) => a.id !== targetId);
          saveOfflineData(OFFLINE_KEYS.ASSIGNMENTS, next);
          return next;
        });

        const res = await deleteAssignmentAction(targetId);
        if (res.success) {
          showNotification('success', res.message || 'Tugas berhasil dihapus.');
        } else {
          showNotification('error', res.error || 'Gagal menghapus tugas.');
        }
        refetchAllData();
      }
    });
  };

  // --- HANDLER: GRADE SUBMISSION ---
  const handleGradeSubmission = (submissionId: string) => {
    const data = gradingState[submissionId];
    if (!data || data.score === undefined) {
      showNotification('error', 'Masukkan nilai terlebih dahulu.');
      return;
    }

    startTransition(async () => {
      const res = await gradeSubmissionAction({
        submissionId,
        score: Number(data.score),
        feedback: data.feedback,
      });

      if (res.success) {
        showNotification('success', res.message || 'Nilai berhasil disimpan!');
        setSubmissionsList(
          submissionsList.map((s) =>
            s.id === submissionId
              ? {
                  ...s,
                  status: 'graded',
                  score: Number(data.score),
                  feedback: data.feedback,
                  gradedAt: new Date(),
                }
              : s
          )
        );
      } else {
        showNotification('error', res.error || 'Gagal menyimpan nilai.');
      }
    });
  };

  // Filtered lists
  const filteredMeetings = meetingsList.filter((m) => {
    if (filterGrade === 'all') return true;
    return m.gradeLevel === filterGrade || m.gradeLevel === null;
  });

  const filteredMaterials = materialsList.filter((mat) => {
    if (filterGrade === 'all') return true;
    return mat.meeting?.gradeLevel === filterGrade || mat.meeting?.gradeLevel === null;
  });

  const filteredAssignments = assignmentsList.filter((ass) => {
    if (filterGrade === 'all') return true;
    return ass.meeting?.gradeLevel === filterGrade || ass.meeting?.gradeLevel === null;
  });

  const filteredSubmissions = submissionsList.filter((sub) => {
    if (filterGrade === 'all') return true;
    return sub.gradeLevel === filterGrade;
  });

  return (
    <div className="space-y-6 pb-24 sm:pb-8">
      {/* Alert / Notification Bar */}
      {statusMsg && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-sm font-semibold transition-all shadow-md ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMsg(null)}
            className="text-xs opacity-60 hover:opacity-100 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Quick Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-heading font-bold text-slate-800">{meetingsList.length}</div>
            <div className="text-[11px] text-slate-500 font-medium">Total Sesi Pertemuan</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-heading font-bold text-slate-800">
              {meetingsList.filter((m) => m.isOpen).length}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">Sesi Sedang Dibuka</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-heading font-bold text-slate-800">{materialsList.length}</div>
            <div className="text-[11px] text-slate-500 font-medium">Materi Praktikum</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-heading font-bold text-slate-800">{submissionsList.length}</div>
            <div className="text-[11px] text-slate-500 font-medium">Tugas Terkumpul</div>
          </div>
        </div>
      </div>

      {/* Main Tab Bar Navigation */}
      <div className="bg-white rounded-3xl p-2 sm:p-2.5 border border-slate-200 shadow-sm flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-2.5 sm:gap-3 overflow-hidden">
        {/* Scrollable Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 xl:pb-0 scrollbar-none min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setActiveTab('meetings')}
            className={`px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-heading font-bold transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer shrink-0 ${
              activeTab === 'meetings'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CalendarCheck className="w-4 h-4 shrink-0" />
            <span>
              <span className="2xl:hidden">Sesi ({meetingsList.length})</span>
              <span className="hidden 2xl:inline">Kelola Sesi Pertemuan ({meetingsList.length})</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('materials')}
            className={`px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-heading font-bold transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer shrink-0 ${
              activeTab === 'materials'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            <span>
              <span className="2xl:hidden">Materi ({materialsList.length})</span>
              <span className="hidden 2xl:inline">Materi Pembelajaran ({materialsList.length})</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('assignments')}
            className={`px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-heading font-bold transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer shrink-0 ${
              activeTab === 'assignments'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span>
              <span className="2xl:hidden">Tugas ({assignmentsList.length})</span>
              <span className="hidden 2xl:inline">Tugas Siswa ({assignmentsList.length})</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('submissions')}
            className={`px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-heading font-bold transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer shrink-0 ${
              activeTab === 'submissions'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Award className="w-4 h-4 shrink-0" />
            <span>
              <span className="2xl:hidden">Nilai ({submissionsList.length})</span>
              <span className="hidden 2xl:inline">Nilai & Masukan ({submissionsList.length})</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rekap')}
            className={`px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-heading font-bold transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer shrink-0 ${
              activeTab === 'rekap'
                ? 'bg-teal-700 text-white shadow-md shadow-teal-700/25 ring-2 ring-teal-500/30'
                : 'text-teal-700 bg-teal-50/70 hover:bg-teal-100/70'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>
              <span className="2xl:hidden">Rekap Excel</span>
              <span className="hidden 2xl:inline">Rekap & Unduh Excel</span>
            </span>
          </button>
        </div>

        {/* Filter Kelas */}
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-between sm:justify-end px-1 pt-1.5 xl:pt-0 border-t xl:border-t-0 border-slate-100">
          <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Filter Kelas:</span>
          </div>
          <div className="flex items-center gap-1">
            {(['all', 4, 5, 6] as const).map((grade) => (
              <button
                key={grade}
                type="button"
                onClick={() => setFilterGrade(grade as any)}
                className={`text-xs px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer shrink-0 ${
                  filterGrade === grade
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

      {/* ========================================================
          TAB 1: KELOLA SESI PERTEMUAN (BUAT & HAPUS SESI DINAMIS)
          ======================================================== */}
      {activeTab === 'meetings' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
            <div>
              <h2 className="font-heading font-bold text-lg text-slate-900 flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-purple-600" />
                <span>Daftar Sesi Pertemuan Ekstrakurikuler</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Jam operasional standar: <span className="font-bold text-slate-700">12.30 s.d 14.00 WIB</span>. Buat sesi baru atau hapus sesi kapan saja sesuai kebutuhan.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Link
                href="/absen"
                className="text-xs font-heading font-bold px-3.5 py-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition-all shadow-xs"
              >
                <Laptop className="w-3.5 h-3.5 text-emerald-600" />
                <span>Buka Layar Presensi Siswa</span>
              </Link>

              <button
                type="button"
                onClick={() => setShowNewMeetingModal(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-heading font-bold px-4 py-2.5 rounded-2xl shadow-md shadow-purple-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Sesi Pertemuan Baru</span>
              </button>
            </div>
          </div>

          {/* List Sesi Pertemuan */}
          {filteredMeetings.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-400">
              <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-600">Belum ada sesi pertemuan untuk kelas ini.</p>
              <p className="text-xs text-slate-400 mt-1">Klik tombol &quot;Buat Sesi Pertemuan Baru&quot; di atas untuk memulai.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMeetings.map((m) => (
                <div
                  key={m.id}
                  className={`bg-white rounded-3xl p-4 sm:p-5 border-2 transition-all relative overflow-hidden ${
                    m.isOpen
                      ? 'border-emerald-300 bg-gradient-to-br from-white to-emerald-50/30 shadow-md shadow-emerald-500/10'
                      : 'border-slate-200 shadow-xs opacity-95'
                  }`}
                >
                  {/* Top row: Meeting number, Badges, and Action buttons */}
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 font-heading font-bold text-sm flex items-center justify-center shrink-0">
                        {m.meetingNumber}
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 whitespace-nowrap shrink-0">
                          {m.gradeLevel ? `Kelas ${m.gradeLevel} SD` : 'Semua Kelas'}
                        </span>
                        {m.isOpen ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 whitespace-nowrap shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                            Sesi Dibuka
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 whitespace-nowrap shrink-0">
                            Sesi Ditutup
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons: Edit & Delete (always stays within card border) */}
                    <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditMeetingModal({ isOpen: true, data: { ...m } })}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-all border border-purple-200/80 shadow-xs cursor-pointer shrink-0"
                        title="Edit Sesi Pertemuan Ini"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => promptDeleteMeeting(m.id, m.title)}
                        disabled={isPending}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors cursor-pointer shrink-0"
                        title="Hapus Sesi Pertemuan Ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-heading font-bold text-slate-900 text-base mb-1">
                    {m.title}
                  </h3>
                  {m.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">
                      {m.description}
                    </p>
                  )}

                  {/* Info Row: Tanggal & Jam */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-2xl mb-3.5">
                    <span className="inline-flex items-center gap-1 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-purple-600" />
                      {m.date}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="inline-flex items-center gap-1 font-bold text-slate-800">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      {m.startTime} - {m.endTime} WIB
                    </span>
                  </div>

                  {/* Badges count & Toggle - Responsive wrap to prevent mobile overflow */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-slate-500">
                      <button
                        type="button"
                        onClick={() => handleOpenAttendanceList(m.id, m.title)}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-xl font-bold flex items-center gap-1 transition-colors cursor-pointer border border-emerald-200/60 shadow-xs shrink-0"
                        title="Klik untuk melihat & mengelola daftar siswa hadir"
                      >
                        <Users className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{m.attendanceCount} Hadir</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadRekapExcel(m.id, 'all', false)}
                        disabled={isExportingExcel}
                        className="bg-teal-50 hover:bg-teal-100 text-teal-800 px-2 py-1 rounded-xl font-bold flex items-center gap-1 transition-colors cursor-pointer border border-teal-200/60 shadow-xs shrink-0 disabled:opacity-50"
                        title="Unduh Rekap Excel Sesi Ini"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600" />
                        <span>{isExportingExcel ? 'Unduh...' : 'Excel'}</span>
                      </button>
                      <span className="bg-blue-50 text-blue-800 px-2 py-1 rounded-xl font-semibold flex items-center gap-1 shrink-0">
                        <BookOpen className="w-3 h-3 text-blue-600" />
                        <span>{m.materialCount} Materi</span>
                      </span>
                      <span className="bg-amber-50 text-amber-800 px-2 py-1 rounded-xl font-semibold flex items-center gap-1 shrink-0">
                        <FileText className="w-3 h-3 text-amber-600" />
                        <span>{m.assignmentCount} Tugas</span>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleMeetingStatus(m.id, m.isOpen)}
                      disabled={isPending}
                      className={`w-full sm:w-auto text-xs font-bold px-3 py-2 sm:py-1.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs shrink-0 ${
                        m.isOpen
                          ? 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700'
                      }`}
                    >
                      {m.isOpen ? (
                        <>
                          <ToggleRight className="w-4 h-4" />
                          <span>Tutup Sesi</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-4 h-4" />
                          <span>Buka Sesi</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 2: KELOLA MATERI PEMBELAJARAN
          ======================================================== */}
      {activeTab === 'materials' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
            <div>
              <h2 className="font-heading font-bold text-lg text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <span>Materi Praktikum Komputer SDN Pleburan 03</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Tambahkan modul PDF, materi Canva, link Google Drive, atau tutorial video untuk siswa.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowNewMaterialModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-heading font-bold px-4 py-2.5 rounded-2xl shadow-md shadow-blue-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Materi Baru</span>
            </button>
          </div>

          {filteredMaterials.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-400">
              <BookOpen className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-600">Belum ada materi pembelajaran untuk kelas ini.</p>
              <p className="text-xs text-slate-400 mt-1">Klik tombol &quot;Tambah Materi Baru&quot; di atas untuk mengunggah materi pertama.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMaterials.map((mat) => (
                <div
                  key={mat.id}
                  className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 sm:gap-3 mb-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                          {mat.fileType === 'pdf' ? (
                            <FileText className="w-4 h-4" />
                          ) : mat.fileType === 'video' ? (
                            <Video className="w-4 h-4" />
                          ) : (
                            <LinkIcon className="w-4 h-4" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                            {mat.fileType ? mat.fileType.toUpperCase() : 'MODUL'}
                          </span>
                          <div className="text-[11px] text-slate-400 font-medium mt-0.5 truncate">
                            {mat.meeting?.title || 'Ekstrakurikuler Komputer'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditMaterialModal({ isOpen: true, data: { ...mat } })}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-all border border-blue-200/80 shadow-xs cursor-pointer shrink-0"
                          title="Edit Materi Ini"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => promptDeleteMaterial(mat.id, mat.title)}
                          disabled={isPending}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors cursor-pointer shrink-0"
                          title="Hapus Materi Ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <h3 className="font-heading font-bold text-slate-900 text-base mb-1">
                      {mat.title}
                    </h3>

                    {mat.contentMarkdown && (
                      <p className="text-xs text-slate-600 line-clamp-3 mb-3 leading-relaxed">
                        {mat.contentMarkdown}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400">
                      Kelas: {mat.meeting?.gradeLevel ? `Kelas ${mat.meeting.gradeLevel}` : 'Semua'}
                    </span>

                    {mat.fileUrl ? (
                      <a
                        href={mat.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl flex items-center gap-1 transition-colors shrink-0"
                      >
                        <span>Buka File / Link</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-medium">Teks Modul Web</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 3: KELOLA TUGAS SISWA
          ======================================================== */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
            <div>
              <h2 className="font-heading font-bold text-lg text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-600" />
                <span>Kelola Tugas & Praktik Siswa</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Buat instruksi latihan mengetik, gambar digital, atau project Scratch untuk dikerjakan siswa.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowNewAssignmentModal(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-heading font-bold px-4 py-2.5 rounded-2xl shadow-md shadow-amber-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Tugas Baru</span>
            </button>
          </div>

          {filteredAssignments.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-400">
              <FileText className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-600">Belum ada tugas praktikum untuk kelas ini.</p>
              <p className="text-xs text-slate-400 mt-1">Klik tombol &quot;Buat Tugas Baru&quot; di atas untuk memberikan tugas pertama.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAssignments.map((ass) => (
                <div
                  key={ass.id}
                  className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 sm:gap-3 mb-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </span>
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-800">
                            {ass.meeting ? `Pertemuan ${ass.meeting.meetingNumber}` : 'Tugas Praktik'}
                          </span>
                          <div className="text-[11px] text-slate-400 font-medium mt-0.5 truncate">
                            {ass.meeting?.title || 'Ekstrakurikuler Komputer'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditAssignmentModal({ isOpen: true, data: { ...ass } })}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition-all border border-amber-200/80 shadow-xs cursor-pointer shrink-0"
                          title="Edit Tugas Ini"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => promptDeleteAssignment(ass.id, ass.title)}
                          disabled={isPending}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors cursor-pointer shrink-0"
                          title="Hapus Tugas Ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <h3 className="font-heading font-bold text-slate-900 text-base mb-1">
                      {ass.title}
                    </h3>

                    {ass.instructions && (
                      <p className="text-xs text-slate-600 line-clamp-3 mb-3 leading-relaxed bg-slate-50 p-3 rounded-2xl">
                        {ass.instructions}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-xl self-start sm:self-auto shrink-0">
                      Batas: {ass.dueDate || 'Sesi Berlangsung'}
                    </span>

                    <button
                      type="button"
                      onClick={() => setActiveTab('submissions')}
                      className="text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-xl transition-colors cursor-pointer w-full sm:w-auto text-center shrink-0"
                    >
                      {ass.submissionCount} Siswa Mengumpulkan →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 4: PENILAIAN TUGAS SISWA (SUBMISSIONS)
          ======================================================== */}
      {activeTab === 'submissions' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
            <h2 className="font-heading font-bold text-lg text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-600" />
              <span>Daftar Pengumpulan Tugas & Penilaian Siswa</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Periksa link/karya siswa, berikan nilai (0 - 100), dan ketik pesan motivasi ceria untuk anak.
            </p>
          </div>

          {filteredSubmissions.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-400">
              <Award className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-600">Belum ada pengumpulan tugas dari siswa.</p>
              <p className="text-xs text-slate-400 mt-1">Siswa dapat mengumpulkan tugas lewat halaman &quot;Tugas Praktikum&quot; di portal siswa.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSubmissions.map((sub) => {
                const currentScore =
                  gradingState[sub.id]?.score !== undefined
                    ? gradingState[sub.id].score
                    : sub.score !== null
                    ? sub.score
                    : '';
                const currentFeedback =
                  gradingState[sub.id]?.feedback !== undefined
                    ? gradingState[sub.id].feedback
                    : sub.feedback || '';

                return (
                  <div
                    key={sub.id}
                    className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-heading font-bold text-base text-slate-900">
                          {sub.studentName}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          Kelas {sub.gradeLevel || 4}
                        </span>
                        {sub.status === 'graded' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600" />
                            Dinilai: {sub.score}/100
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                            Menunggu Penilaian
                          </span>
                        )}
                      </div>

                      <div className="text-xs font-semibold text-slate-600 mb-2">
                        Tugas: {sub.assignmentTitle || 'Praktikum Komputer'}
                      </div>

                      {/* Content or URL */}
                      {sub.submissionUrl && (
                        <div className="mb-2">
                          <a
                            href={sub.submissionUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold bg-blue-50 px-2.5 py-1 rounded-xl"
                          >
                            <span>Lihat Link Karya / Drive Siswa</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}

                      {sub.submissionText && (
                        <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-2xl line-clamp-2">
                          &quot;{sub.submissionText}&quot;
                        </p>
                      )}
                    </div>

                    {/* Grading Form Formlet */}
                    <div className="w-full md:w-80 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 shrink-0 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-24">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Nilai (0-100)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="Nilai"
                            value={currentScore}
                            onChange={(e) =>
                              setGradingState({
                                ...gradingState,
                                [sub.id]: {
                                  score: Number(e.target.value),
                                  feedback: currentFeedback,
                                },
                              })
                            }
                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-white"
                          />
                        </div>

                        <div className="flex-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Pesan Semangat</label>
                          <input
                            type="text"
                            placeholder="Bagus sekali! Rapi!"
                            value={currentFeedback}
                            onChange={(e) =>
                              setGradingState({
                                ...gradingState,
                                [sub.id]: {
                                  score: Number(currentScore) || 0,
                                  feedback: e.target.value,
                                },
                              })
                            }
                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleGradeSubmission(sub.id)}
                        disabled={isPending}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-heading font-bold py-1.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Simpan Nilai</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 5: REKAP PRESENSI & EKSPOR EXCEL (OPTIMASI DATABASE TURSO)
          ======================================================== */}
      {activeTab === 'rekap' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Header Card */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-9 h-9 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5 text-teal-700" />
                </span>
                <h2 className="font-heading font-bold text-lg text-slate-900">
                  Rekapitulasi Presensi & Ekspor Excel (.xlsx)
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                Unduh rekap kehadiran siswa SDN Pleburan 03 dalam format spreadsheet Excel berwarna dan tertata rapi. Dilengkapi fitur arsip data otomatis untuk menghemat kuota database Turso (siap deploy ke Vercel).
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadRekap(rekapMeetingFilter, rekapGradeFilter)}
              disabled={loadingRekap}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
              title="Segarkan Data Rekap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingRekap ? 'animate-spin text-teal-600' : 'text-slate-500'}`} />
              <span>{loadingRekap ? 'Memuat...' : 'Segarkan'}</span>
            </button>
          </div>

          {/* Kontrol Filter & Tombol Download */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Filter Sesi & Kelas */}
            <div className="lg:col-span-7 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-heading font-bold text-sm text-slate-900 flex items-center gap-2">
                <Filter className="w-4 h-4 text-teal-600" />
                <span>Pengaturan Filter Laporan</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    Pilih Sesi Pertemuan
                  </label>
                  <select
                    value={rekapMeetingFilter}
                    onChange={(e) => {
                      const val = e.target.value;
                      setRekapMeetingFilter(val);
                      loadRekap(val, rekapGradeFilter);
                    }}
                    className="w-full px-3 py-2.5 rounded-2xl border border-slate-300 text-xs font-semibold focus:border-teal-600 outline-none bg-white"
                  >
                    <option value="all">Semua Sesi Pertemuan ({meetingsList.length} Sesi)</option>
                    {meetingsList.map((m) => (
                      <option key={m.id} value={m.id}>
                        Pertemuan {m.meetingNumber} - {m.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    Filter Tingkat Kelas
                  </label>
                  <select
                    value={rekapGradeFilter}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setRekapGradeFilter(val);
                      loadRekap(rekapMeetingFilter, val);
                    }}
                    className="w-full px-3 py-2.5 rounded-2xl border border-slate-300 text-xs font-semibold focus:border-teal-600 outline-none bg-white"
                  >
                    <option value="all">Semua Kelas (Kelas 4, 5, 6)</option>
                    <option value="4">Kelas 4 SD (Kamis)</option>
                    <option value="5">Kelas 5 SD (Selasa)</option>
                    <option value="6">Kelas 6 SD (Senin)</option>
                  </select>
                </div>
              </div>

              {/* Opsi Penghemat Database Saat Download */}
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="cleanupCheck"
                  checked={cleanupAfterDownload}
                  onChange={(e) => setCleanupAfterDownload(e.target.checked)}
                  className="w-4 h-4 text-teal-600 rounded mt-0.5 cursor-pointer accent-teal-600"
                />
                <label htmlFor="cleanupCheck" className="text-xs text-slate-700 cursor-pointer select-none">
                  <strong className="text-amber-900 block font-heading font-bold">
                    Kosongkan / Arsipkan data presensi setelah di-download
                  </strong>
                  <span className="text-[11px] text-slate-500 leading-relaxed block mt-0.5">
                    Centang opsi ini agar data presensi yang sudah Anda simpan di Excel langsung dihapus dari Turso database, sehingga kuota penyimpanan cloud tetap hemat dan performa Vercel kencang.
                  </span>
                </label>
              </div>

              {/* Tombol Download Excel */}
              <button
                type="button"
                onClick={() => handleDownloadRekapExcel()}
                disabled={isExportingExcel || loadingRekap || !rekapData || rekapData.records.length === 0}
                className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white font-heading font-bold text-sm py-3 px-5 rounded-2xl shadow-lg shadow-teal-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5"
              >
                <Download className="w-4 h-4" />
                <span>{isExportingExcel ? 'Sedang Menyiapkan Excel...' : 'Unduh File Excel Berwarna (.xlsx)'}</span>
                {rekapData && (
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-normal">
                    {rekapData.records.length} Siswa
                  </span>
                )}
              </button>
            </div>

            {/* Storage Optimizer Card (Hemat Kuota Turso & Vercel) */}
            <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-5 rounded-3xl shadow-lg border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
                      Turso Cloud Storage Optimizer
                    </span>
                    <h4 className="font-heading font-bold text-sm text-white">
                      Penghemat Database Vercel
                    </h4>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  Free tier Turso memiliki batasan baris database. Bersihkan data presensi lampau secara berkala setelah selesai direkap ke Excel.
                </p>

                <div className="bg-white/10 rounded-2xl p-3 mb-4 space-y-1.5 border border-white/5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">Total Siswa Terdaftar:</span>
                    <strong className="text-white font-bold">{rekapData?.totalRecords ?? '...'} Siswa</strong>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-emerald-300 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      Hadir:
                    </span>
                    <strong className="text-emerald-400 font-bold">
                      {rekapData?.totalPresent ?? 0} Siswa ({rekapData?.attendancePercentage ?? 0}%)
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-rose-300 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                      Tidak Hadir:
                    </span>
                    <strong className="text-rose-400 font-bold">
                      {rekapData?.totalAbsent ?? 0} Siswa
                    </strong>
                  </div>
                  <div className="pt-1.5 mt-1 border-t border-white/10 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Data Lampau (&gt; 7 Hari):</span>
                    <span
                      className={`px-2 py-0.5 rounded-md font-bold text-xs ${
                        (rekapData?.staleRecordsCount ?? 0) > 0
                          ? 'bg-amber-400/20 text-amber-300'
                          : 'bg-emerald-400/20 text-emerald-300'
                      }`}
                    >
                      {rekapData?.staleRecordsCount ?? 0} Presensi
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleCleanupStale}
                  disabled={isCleaningStale || (rekapData?.staleRecordsCount ?? 0) === 0}
                  className="w-full bg-rose-600 hover:bg-rose-700 disabled:bg-slate-800 text-white disabled:text-slate-500 text-xs font-heading font-bold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shadow-sm"
                  title="Hapus data presensi yang berusia lebih dari 1 minggu"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>
                    {isCleaningStale
                      ? 'Sedang Membersihkan...'
                      : (rekapData?.staleRecordsCount ?? 0) > 0
                      ? `Bersihkan ${rekapData?.staleRecordsCount} Data Lampau (> 7 Hari)`
                      : 'Data Sudah Bersih (Tidak Ada Data Lampau)'}
                  </span>
                </button>
                <div className="text-[10px] text-slate-400 text-center mt-2">
                  Otomatis mendeteksi presensi yang lebih dari 1 minggu.
                </div>
              </div>
            </div>
          </div>

          {/* Tabel Pratinjau Rekap */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-600" />
                <h3 className="font-heading font-bold text-sm text-slate-900">
                  Pratinjau Data Laporan ({rekapData?.records.length || 0} Siswa)
                </h3>
              </div>

              {/* Status Tab Filter: Semua / Hadir / Tidak Hadir */}
              <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl text-xs font-heading font-semibold">
                <button
                  type="button"
                  onClick={() => setRekapStatusTab('all')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    rekapStatusTab === 'all'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semua ({rekapData?.totalRecords ?? 0})
                </button>
                <button
                  type="button"
                  onClick={() => setRekapStatusTab('HADIR')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    rekapStatusTab === 'HADIR'
                      ? 'bg-emerald-600 text-white shadow-xs font-bold'
                      : 'text-emerald-700 hover:text-emerald-900'
                  }`}
                >
                  <span>✓ Hadir ({rekapData?.totalPresent ?? 0})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRekapStatusTab('TIDAK HADIR')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    rekapStatusTab === 'TIDAK HADIR'
                      ? 'bg-rose-600 text-white shadow-xs font-bold'
                      : 'text-rose-700 hover:text-rose-900'
                  }`}
                >
                  <span>✗ Tidak Hadir ({rekapData?.totalAbsent ?? 0})</span>
                </button>
              </div>
            </div>

            {loadingRekap ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-teal-600" />
                <span>Memuat pratinjau rekap presensi...</span>
              </div>
            ) : !rekapData || rekapData.records.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <FileSpreadsheet className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-600 text-sm">Tidak ada data siswa untuk filter ini.</p>
                <p className="text-xs text-slate-400 mt-1">
                  Pilih sesi pertemuan lain atau tingkat kelas yang sesuai.
                </p>
              </div>
            ) : (() => {
              const filteredList = rekapData.records.filter((rec) => {
                if (rekapStatusTab === 'all') return true;
                return rec.status === rekapStatusTab;
              });

              if (filteredList.length === 0) {
                return (
                  <div className="p-12 text-center text-slate-400">
                    <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600 text-sm">
                      Tidak ada siswa dengan status &quot;{rekapStatusTab}&quot;.
                    </p>
                  </div>
                );
              }

              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-teal-700 text-white font-heading font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-3.5 text-center w-12">No</th>
                        <th className="py-3 px-3.5">Nama Lengkap Siswa</th>
                        <th className="py-3 px-3.5 text-center">Kelas / Rombel</th>
                        <th className="py-3 px-3.5">Sesi Pertemuan</th>
                        <th className="py-3 px-3.5 text-center">Waktu Presensi</th>
                        <th className="py-3 px-3.5 text-center">Status Kehadiran</th>
                        <th className="py-3 px-3.5 text-center w-12">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {filteredList.map((rec, idx) => {
                        const isPresent = rec.status === 'HADIR';
                        return (
                          <tr
                            key={rec.id}
                            className={`hover:bg-teal-50/40 transition-colors ${
                              idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                            }`}
                          >
                            <td className="py-2.5 px-3.5 text-center font-bold text-slate-400">{idx + 1}</td>
                            <td className="py-2.5 px-3.5 font-bold text-slate-900">{rec.studentName}</td>
                            <td className="py-2.5 px-3.5 text-center">
                              <span className="bg-purple-100 text-purple-800 font-bold px-2.5 py-0.5 rounded-lg text-[11px]">
                                {rec.className || `Kelas ${rec.gradeLevel}`}
                              </span>
                            </td>
                            <td className="py-2.5 px-3.5 text-slate-600 max-w-xs truncate">
                              {rec.meetingTitle}
                            </td>
                            <td className="py-2.5 px-3.5 text-center text-slate-500 text-[11px]">
                              {rec.checkedInAt ? (
                                <>
                                  {new Date(rec.checkedInAt).toLocaleDateString('id-ID', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    timeZone: 'Asia/Jakarta',
                                  })}{' '}
                                  •{' '}
                                  <strong className="text-slate-700">
                                    {new Date(rec.checkedInAt).toLocaleTimeString('id-ID', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      timeZone: 'Asia/Jakarta',
                                    })}{' '}
                                    WIB
                                  </strong>
                                </>
                              ) : (
                                <span className="text-slate-400 italic font-normal">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3.5 text-center">
                              {isPresent ? (
                                <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full text-[10px] inline-flex items-center gap-1 border border-emerald-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                  HADIR
                                </span>
                              ) : (
                                <span className="bg-rose-100 text-rose-700 font-bold px-2.5 py-0.5 rounded-full text-[10px] inline-flex items-center gap-1 border border-rose-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                                  TIDAK HADIR
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3.5 text-center">
                              {isPresent ? (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAttendanceRecord(rec.id, rec.studentName)}
                                  disabled={isPending}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Hapus presensi siswa ini"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: BUAT SESI PERTEMUAN BARU
          ======================================================== */}
      {showNewMeetingModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <h3 className="font-heading font-bold text-lg text-slate-900">
                  Buat Sesi Pertemuan Baru
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewMeetingModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMeeting} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
                  Judul Pertemuan *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Pertemuan 4: Membuat Presentasi Cerita Canva"
                  value={meetingForm.title}
                  onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 text-sm focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
                    Nomor Pertemuan
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={meetingForm.meetingNumber}
                    onChange={(e) => setMeetingForm({ ...meetingForm, meetingNumber: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 text-sm focus:border-purple-600 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
                    Target Kelas
                  </label>
                  <select
                    value={meetingForm.gradeLevel}
                    onChange={(e) => setMeetingForm({ ...meetingForm, gradeLevel: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 text-sm focus:border-purple-600 outline-none bg-white"
                  >
                    <option value="all">Semua Kelas (4, 5, 6)</option>
                    <option value="4">Kelas 4 SD (Kamis)</option>
                    <option value="5">Kelas 5 SD (Selasa)</option>
                    <option value="6">Kelas 6 SD (Senin)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
                  Tanggal Kegiatan (WIB)
                </label>
                <input
                  type="date"
                  value={meetingForm.date}
                  onChange={(e) => setMeetingForm({ ...meetingForm, date: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 text-sm focus:border-purple-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
                    Jam Mulai
                  </label>
                  <input
                    type="text"
                    value={meetingForm.startTime}
                    onChange={(e) => setMeetingForm({ ...meetingForm, startTime: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 text-sm focus:border-purple-600 outline-none font-bold"
                  />
                  <span className="text-[10px] text-slate-400">Standar: 12:30 WIB</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
                    Jam Selesai
                  </label>
                  <input
                    type="text"
                    value={meetingForm.endTime}
                    onChange={(e) => setMeetingForm({ ...meetingForm, endTime: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 text-sm focus:border-purple-600 outline-none font-bold"
                  />
                  <span className="text-[10px] text-slate-400">Standar: 14:00 WIB</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
                  Deskripsi / Catatan Pembina
                </label>
                <textarea
                  rows={2}
                  placeholder="Catatan materi atau tujuan praktikum hari ini..."
                  value={meetingForm.description}
                  onChange={(e) => setMeetingForm({ ...meetingForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-2xl border border-slate-300 text-sm focus:border-purple-600 outline-none"
                />
              </div>

              <div className="bg-purple-50 p-3.5 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-purple-900">Langsung Buka Sesi Presensi</div>
                  <div className="text-[11px] text-purple-700">Siswa dapat langsung presensi begitu sesi ini disimpan.</div>
                </div>
                <input
                  type="checkbox"
                  checked={meetingForm.isOpen}
                  onChange={(e) => setMeetingForm({ ...meetingForm, isOpen: e.target.checked })}
                  className="w-5 h-5 text-purple-600 rounded cursor-pointer"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewMeetingModal(false)}
                  className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-heading font-bold px-5 py-2.5 rounded-2xl shadow-md shadow-purple-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isPending ? 'Menyimpan...' : 'Simpan Sesi Pertemuan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: TAMBAH MATERI BARU
          ======================================================== */}
      {showNewMaterialModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="font-heading font-bold text-lg text-slate-900">
                  Tambah Materi Praktikum Baru
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewMaterialModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMaterial} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
                  Pilih Sesi Pertemuan *
                </label>
                <select
                  value={materialForm.meetingId}
                  onChange={(e) => setMaterialForm({ ...materialForm, meetingId: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 text-sm focus:border-blue-600 outline-none bg-white"
                >
                  {meetingsList.map((m) => (
                    <option key={m.id} value={m.id}>
                      Pertemuan {m.meetingNumber} - {m.title} ({m.gradeLevel ? `Kelas ${m.gradeLevel}` : 'Semua'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
                  Judul Materi *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Tutorial Mengetik 10 Jari - Posisi Home Row"
                  value={materialForm.title}
                  onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 text-sm focus:border-blue-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
                    Tipe File / Media
                  </label>
                  <select
                    value={materialForm.fileType}
                    onChange={(e) => setMaterialForm({ ...materialForm, fileType: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 text-sm focus:border-blue-600 outline-none bg-white"
                  >
                    <option value="link">Link Google Drive / Canva</option>
                    <option value="pdf">Dokumen Modul PDF</option>
                    <option value="video">Video Tutorial</option>
                    <option value="doc">Dokumen Word / Teks</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
                    URL File / Tautan Materi
                  </label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/..."
                    value={materialForm.fileUrl}
                    onChange={(e) => setMaterialForm({ ...materialForm, fileUrl: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 text-sm focus:border-blue-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
                  Ringkasan / Penjelasan Materi
                </label>
                <textarea
                  rows={3}
                  placeholder="Panduan ringkas atau langkah praktikum untuk dibaca anak-anak..."
                  value={materialForm.contentMarkdown}
                  onChange={(e) => setMaterialForm({ ...materialForm, contentMarkdown: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-2xl border border-slate-300 text-sm focus:border-blue-600 outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewMaterialModal(false)}
                  className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-heading font-bold px-5 py-2.5 rounded-2xl shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isPending ? 'Menyimpan...' : 'Simpan Materi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: BUAT TUGAS BARU
          ======================================================== */}
      {showNewAssignmentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="font-heading font-bold text-lg text-slate-900">
                  Buat Tugas Praktikum Baru
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewAssignmentModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
                  Pilih Sesi Pertemuan *
                </label>
                <select
                  value={assignmentForm.meetingId}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, meetingId: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 text-sm focus:border-amber-600 outline-none bg-white"
                >
                  {meetingsList.map((m) => (
                    <option key={m.id} value={m.id}>
                      Pertemuan {m.meetingNumber} - {m.title} ({m.gradeLevel ? `Kelas ${m.gradeLevel}` : 'Semua'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
                  Judul Tugas *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Latihan Mengetik 1 Paragraf Cerita Liburan di Word"
                  value={assignmentForm.title}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 text-sm focus:border-amber-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
                    Batas Waktu (Due Date)
                  </label>
                  <input
                    type="date"
                    value={assignmentForm.dueDate}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, dueDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 text-sm focus:border-amber-600 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
                    Nilai Maksimal
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={assignmentForm.maxScore}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, maxScore: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 text-sm focus:border-amber-600 outline-none font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
                  Petunjuk / Instruksi Pengerjaan
                </label>
                <textarea
                  rows={3}
                  placeholder="Jelaskan langkah apa yang harus dilakukan anak (misal: buka aplikasi Word, ketik 5 baris, lalu kirim link Google Drive atau simpan file)..."
                  value={assignmentForm.instructions}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, instructions: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-2xl border border-slate-300 text-sm focus:border-amber-600 outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewAssignmentModal(false)}
                  className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-heading font-bold px-5 py-2.5 rounded-2xl shadow-md shadow-amber-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isPending ? 'Menyimpan...' : 'Simpan Tugas'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL KONFIRMASI HAPUS ELEGAN (CUSTOM POP UP)
          ======================================================== */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-rose-100 text-center relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Decorative top background glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 bg-rose-500/10 rounded-full blur-2xl pointer-events-none"></div>

            {/* Warning Icon Badge */}
            <div className="w-16 h-16 rounded-3xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4 shadow-sm border border-rose-200/60 relative z-10">
              <Trash2 className="w-8 h-8" />
            </div>

            {/* Badge Category */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200/80 mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>
                {deleteModal.type === 'meeting'
                  ? 'Konfirmasi Hapus Sesi'
                  : deleteModal.type === 'material'
                  ? 'Konfirmasi Hapus Materi'
                  : 'Konfirmasi Hapus Tugas'}
              </span>
            </div>

            {/* Title */}
            <h3 className="font-heading font-bold text-xl text-slate-900 mb-2">
              Apakah Anda Yakin?
            </h3>

            {/* Target Item Callout */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 mb-3 text-left flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                {deleteModal.type === 'meeting' ? (
                  <CalendarCheck className="w-4 h-4" />
                ) : deleteModal.type === 'material' ? (
                  <BookOpen className="w-4 h-4 text-blue-600" />
                ) : (
                  <FileText className="w-4 h-4 text-amber-600" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold text-slate-400 uppercase">Item yang akan dihapus:</div>
                <div className="font-heading font-bold text-slate-900 text-sm truncate">
                  {deleteModal.title}
                </div>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-slate-500 leading-relaxed mb-6">
              {deleteModal.details ||
                'Data yang terhubung dengan item ini akan ikut terhapus secara permanen dari database.'}
              <br />
              <span className="font-semibold text-rose-600 mt-1 inline-block">
                Tindakan ini tidak dapat dibatalkan.
              </span>
            </p>

            {/* Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDeleteModal({ isOpen: false, type: 'meeting', id: '', title: '' })}
                disabled={isPending}
                className="px-4 py-3 rounded-2xl border border-slate-200 font-heading font-bold text-xs sm:text-sm text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isPending}
                className="px-4 py-3 rounded-2xl font-heading font-bold text-xs sm:text-sm text-white bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isPending ? 'Menghapus...' : 'Ya, Hapus'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================
          MODAL: EDIT SESI PERTEMUAN
          ======================================================== */}
      {editMeetingModal.isOpen && editMeetingModal.data && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                  <Pencil className="w-5 h-5" />
                </div>
                <h3 className="font-heading font-bold text-lg text-slate-900">
                  Edit Sesi Pertemuan
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditMeetingModal({ isOpen: false, data: null })}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateMeeting} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
                  Judul Pertemuan *
                </label>
                <input
                  type="text"
                  required
                  value={editMeetingModal.data.title}
                  onChange={(e) =>
                    setEditMeetingModal({
                      ...editMeetingModal,
                      data: { ...editMeetingModal.data!, title: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 text-sm focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
                    Nomor Pertemuan
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editMeetingModal.data.meetingNumber}
                    onChange={(e) =>
                      setEditMeetingModal({
                        ...editMeetingModal,
                        data: { ...editMeetingModal.data!, meetingNumber: Number(e.target.value) },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 text-sm focus:border-purple-600 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
                    Target Kelas
                  </label>
                  <select
                    value={editMeetingModal.data.gradeLevel === null ? 'all' : String(editMeetingModal.data.gradeLevel)}
                    onChange={(e) =>
                      setEditMeetingModal({
                        ...editMeetingModal,
                        data: {
                          ...editMeetingModal.data!,
                          gradeLevel: e.target.value === 'all' ? null : (Number(e.target.value) as GradeLevel),
                        },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 text-sm focus:border-purple-600 outline-none bg-white"
                  >
                    <option value="all">Semua Kelas (4, 5, 6)</option>
                    <option value="4">Kelas 4 SD (Kamis)</option>
                    <option value="5">Kelas 5 SD (Selasa)</option>
                    <option value="6">Kelas 6 SD (Senin)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
                  Tanggal Kegiatan (WIB)
                </label>
                <input
                  type="date"
                  value={editMeetingModal.data.date}
                  onChange={(e) =>
                    setEditMeetingModal({
                      ...editMeetingModal,
                      data: { ...editMeetingModal.data!, date: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 text-sm focus:border-purple-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
                    Jam Mulai
                  </label>
                  <input
                    type="text"
                    value={editMeetingModal.data.startTime}
                    onChange={(e) =>
                      setEditMeetingModal({
                        ...editMeetingModal,
                        data: { ...editMeetingModal.data!, startTime: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 text-sm focus:border-purple-600 outline-none font-bold"
                  />
                  <span className="text-[10px] text-slate-400">Standar: 12:30 WIB</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
                    Jam Selesai
                  </label>
                  <input
                    type="text"
                    value={editMeetingModal.data.endTime}
                    onChange={(e) =>
                      setEditMeetingModal({
                        ...editMeetingModal,
                        data: { ...editMeetingModal.data!, endTime: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 text-sm focus:border-purple-600 outline-none font-bold"
                  />
                  <span className="text-[10px] text-slate-400">Standar: 14:00 WIB</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
                  Deskripsi / Catatan Pembina
                </label>
                <textarea
                  rows={2}
                  value={editMeetingModal.data.description || ''}
                  onChange={(e) =>
                    setEditMeetingModal({
                      ...editMeetingModal,
                      data: { ...editMeetingModal.data!, description: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2 rounded-2xl border border-slate-300 text-sm focus:border-purple-600 outline-none"
                />
              </div>

              <div className="bg-purple-50 p-3.5 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-purple-900">Status Sesi Presensi Terbuka</div>
                  <div className="text-[11px] text-purple-700">Aktifkan untuk mengizinkan siswa presensi mandiri.</div>
                </div>
                <input
                  type="checkbox"
                  checked={editMeetingModal.data.isOpen}
                  onChange={(e) =>
                    setEditMeetingModal({
                      ...editMeetingModal,
                      data: { ...editMeetingModal.data!, isOpen: e.target.checked },
                    })
                  }
                  className="w-5 h-5 text-purple-600 rounded cursor-pointer"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditMeetingModal({ isOpen: false, data: null })}
                  className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-heading font-bold px-5 py-2.5 rounded-2xl shadow-md shadow-purple-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{isPending ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: EDIT MATERI PEMBELAJARAN
          ======================================================== */}
      {editMaterialModal.isOpen && editMaterialModal.data && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Pencil className="w-5 h-5" />
                </div>
                <h3 className="font-heading font-bold text-lg text-slate-900">
                  Edit Materi Praktikum
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditMaterialModal({ isOpen: false, data: null })}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateMaterial} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
                  Pilih Sesi Pertemuan *
                </label>
                <select
                  value={editMaterialModal.data.meetingId}
                  onChange={(e) =>
                    setEditMaterialModal({
                      ...editMaterialModal,
                      data: { ...editMaterialModal.data!, meetingId: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 text-sm focus:border-blue-600 outline-none bg-white"
                >
                  {meetingsList.map((m) => (
                    <option key={m.id} value={m.id}>
                      Pertemuan {m.meetingNumber} - {m.title} ({m.gradeLevel ? `Kelas ${m.gradeLevel}` : 'Semua'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
                  Judul Materi *
                </label>
                <input
                  type="text"
                  required
                  value={editMaterialModal.data.title}
                  onChange={(e) =>
                    setEditMaterialModal({
                      ...editMaterialModal,
                      data: { ...editMaterialModal.data!, title: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 text-sm focus:border-blue-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
                    Tipe File / Media
                  </label>
                  <select
                    value={editMaterialModal.data.fileType || 'link'}
                    onChange={(e) =>
                      setEditMaterialModal({
                        ...editMaterialModal,
                        data: { ...editMaterialModal.data!, fileType: e.target.value as any },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 text-sm focus:border-blue-600 outline-none bg-white"
                  >
                    <option value="link">Link Google Drive / Canva</option>
                    <option value="pdf">Dokumen Modul PDF</option>
                    <option value="video">Video Tutorial</option>
                    <option value="doc">Dokumen Word / Teks</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
                    URL File / Tautan Materi
                  </label>
                  <input
                    type="url"
                    value={editMaterialModal.data.fileUrl || ''}
                    onChange={(e) =>
                      setEditMaterialModal({
                        ...editMaterialModal,
                        data: { ...editMaterialModal.data!, fileUrl: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 text-sm focus:border-blue-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
                  Ringkasan / Penjelasan Materi
                </label>
                <textarea
                  rows={3}
                  value={editMaterialModal.data.contentMarkdown || ''}
                  onChange={(e) =>
                    setEditMaterialModal({
                      ...editMaterialModal,
                      data: { ...editMaterialModal.data!, contentMarkdown: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2 rounded-2xl border border-slate-300 text-sm focus:border-blue-600 outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditMaterialModal({ isOpen: false, data: null })}
                  className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-heading font-bold px-5 py-2.5 rounded-2xl shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{isPending ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: EDIT TUGAS PRAKTIKUM
          ======================================================== */}
      {editAssignmentModal.isOpen && editAssignmentModal.data && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                  <Pencil className="w-5 h-5" />
                </div>
                <h3 className="font-heading font-bold text-lg text-slate-900">
                  Edit Tugas Praktikum
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditAssignmentModal({ isOpen: false, data: null })}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateAssignment} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
                  Pilih Sesi Pertemuan *
                </label>
                <select
                  value={editAssignmentModal.data.meetingId}
                  onChange={(e) =>
                    setEditAssignmentModal({
                      ...editAssignmentModal,
                      data: { ...editAssignmentModal.data!, meetingId: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 text-sm focus:border-amber-600 outline-none bg-white"
                >
                  {meetingsList.map((m) => (
                    <option key={m.id} value={m.id}>
                      Pertemuan {m.meetingNumber} - {m.title} ({m.gradeLevel ? `Kelas ${m.gradeLevel}` : 'Semua'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
                  Judul Tugas *
                </label>
                <input
                  type="text"
                  required
                  value={editAssignmentModal.data.title}
                  onChange={(e) =>
                    setEditAssignmentModal({
                      ...editAssignmentModal,
                      data: { ...editAssignmentModal.data!, title: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 text-sm focus:border-amber-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
                    Batas Waktu (Due Date)
                  </label>
                  <input
                    type="date"
                    value={editAssignmentModal.data.dueDate || ''}
                    onChange={(e) =>
                      setEditAssignmentModal({
                        ...editAssignmentModal,
                        data: { ...editAssignmentModal.data!, dueDate: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 text-sm focus:border-amber-600 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
                    Nilai Maksimal
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={editAssignmentModal.data.maxScore}
                    onChange={(e) =>
                      setEditAssignmentModal({
                        ...editAssignmentModal,
                        data: { ...editAssignmentModal.data!, maxScore: Number(e.target.value) },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 text-sm focus:border-amber-600 outline-none font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">
                  Petunjuk / Instruksi Pengerjaan
                </label>
                <textarea
                  rows={3}
                  value={editAssignmentModal.data.instructions || ''}
                  onChange={(e) =>
                    setEditAssignmentModal({
                      ...editAssignmentModal,
                      data: { ...editAssignmentModal.data!, instructions: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2 rounded-2xl border border-slate-300 text-sm focus:border-amber-600 outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditAssignmentModal({ isOpen: false, data: null })}
                  className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-heading font-bold px-5 py-2.5 rounded-2xl shadow-md shadow-amber-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{isPending ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: DAFTAR HADIR SISWA PER SESI (KELOLA PRESENSI)
          ======================================================== */}
      {attendanceListModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base sm:text-lg text-slate-900 leading-tight">
                    Daftar Siswa Hadir
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-1">
                    {attendanceListModal.meetingTitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setAttendanceListModal({
                    isOpen: false,
                    meetingId: '',
                    meetingTitle: '',
                    list: [],
                    loading: false,
                  })
                }
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {attendanceListModal.loading ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Memuat data presensi siswa...
                </div>
              ) : attendanceListModal.list.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="font-semibold text-slate-600 text-sm">Belum ada siswa yang absen.</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Siswa dapat melakukan presensi mandiri saat sesi dibuka.
                  </p>
                </div>
              ) : (
                attendanceListModal.list.map((att, idx) => (
                  <div
                    key={att.id}
                    className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200/70 flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-7 h-7 rounded-xl bg-white border border-slate-200 text-slate-600 font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="font-heading font-bold text-slate-900 text-sm truncate">
                          {att.student_name}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.2 rounded-md">
                            Kelas {att.grade_level}
                          </span>
                          <span>•</span>
                          <span>
                            {new Date(att.checked_in_at).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                              timeZone: 'Asia/Jakarta',
                            })}{' '}
                            WIB
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteAttendanceRecord(att.id, att.student_name)}
                      disabled={isPending}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="Hapus presensi siswa ini"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 mt-3 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs text-slate-500 font-medium">
                  Total: <strong className="text-slate-800">{attendanceListModal.list.length}</strong> siswa
                </span>
                {attendanceListModal.list.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      handleDownloadRekapExcel(attendanceListModal.meetingId, 'all', false)
                    }
                    className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-xl transition-colors border border-teal-200/60 shadow-xs cursor-pointer"
                    title="Unduh data presensi sesi ini ke file Excel"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600" />
                    <span>Unduh Excel</span>
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() =>
                  setAttendanceListModal({
                    isOpen: false,
                    meetingId: '',
                    meetingTitle: '',
                    list: [],
                    loading: false,
                  })
                }
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-heading font-bold rounded-xl transition-all cursor-pointer"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
