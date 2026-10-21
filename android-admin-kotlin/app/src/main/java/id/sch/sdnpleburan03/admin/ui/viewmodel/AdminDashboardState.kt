package id.sch.sdnpleburan03.admin.ui.viewmodel

import id.sch.sdnpleburan03.admin.data.local.entity.AssignmentEntity
import id.sch.sdnpleburan03.admin.data.local.entity.AttendanceEntity
import id.sch.sdnpleburan03.admin.data.local.entity.MeetingEntity
import id.sch.sdnpleburan03.admin.data.local.entity.StudentEntity
import id.sch.sdnpleburan03.admin.data.local.entity.SubmissionEntity
import id.sch.sdnpleburan03.admin.sync.NetworkState

enum class AdminTab(val title: String) {
    MEETINGS("Sesi Praktikum"),
    MATRIX("Presensi Matrix"),
    REKAP("Rekapitulasi"),
    ASSIGNMENTS("Tugas & Nilai"),
    STUDENTS("Data Siswa")
}

data class AdminDashboardState(
    val currentTab: AdminTab = AdminTab.MEETINGS,
    val networkState: NetworkState = NetworkState(),
    val primaryMeeting: MeetingEntity? = null,
    val allMeetings: List<MeetingEntity> = emptyList(),
    val students: List<StudentEntity> = emptyList(),
    val allStudents: List<StudentEntity> = emptyList(),
    val attendances: List<AttendanceEntity> = emptyList(),
    val allAttendances: List<AttendanceEntity> = emptyList(),
    val assignments: List<AssignmentEntity> = emptyList(),
    val submissions: List<SubmissionEntity> = emptyList(),
    val unsyncedCount: Int = 0,
    val selectedGrade: Int? = null, // null = Semua Jenjang (4, 5, 6)
    val selectedClass: String? = null, // null = Semua Rombel (4A, 4B, 5A, 5B, 6A, 6B)
    val availableClasses: List<String> = emptyList(),
    val studentSearchQuery: String = "",
    val selectedMeetingForMatrix: MeetingEntity? = null,
    val selectedAssignmentForFilter: AssignmentEntity? = null,
    val selectedSubmissionForGrading: SubmissionEntity? = null,
    val isSyncing: Boolean = false,
    val isRealtimeConnected: Boolean = false,
    val tursoLatencyMs: Long? = null,
    val lastRealtimeSyncTime: Long? = null,
    val syncMessage: String? = null,
    val serverBaseUrl: String = ""
)
