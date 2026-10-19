package id.sch.sdnpleburan03.admin.ui.viewmodel

import id.sch.sdnpleburan03.admin.data.local.entity.AttendanceEntity
import id.sch.sdnpleburan03.admin.data.local.entity.MeetingEntity
import id.sch.sdnpleburan03.admin.data.local.entity.StudentEntity
import id.sch.sdnpleburan03.admin.sync.NetworkState

data class AdminDashboardState(
    val networkState: NetworkState = NetworkState(),
    val primaryMeeting: MeetingEntity? = null,
    val allMeetings: List<MeetingEntity> = emptyList(),
    val students: List<StudentEntity> = emptyList(),
    val attendances: List<AttendanceEntity> = emptyList(),
    val unsyncedCount: Int = 0,
    val selectedGrade: Int? = null, // null = Semua Jenjang
    val selectedClass: String? = null, // null = Semua Rombel
    val availableClasses: List<String> = emptyList(),
    val isSyncing: Boolean = false,
    val syncMessage: String? = null,
    val serverBaseUrl: String = ""
)
