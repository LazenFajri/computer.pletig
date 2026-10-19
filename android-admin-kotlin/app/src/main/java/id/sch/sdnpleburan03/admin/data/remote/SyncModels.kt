package id.sch.sdnpleburan03.admin.data.remote

import com.google.gson.annotations.SerializedName

data class MeetingDto(
    @SerializedName("id") val id: String,
    @SerializedName("meeting_number") val meetingNumber: Int,
    @SerializedName("grade_level") val gradeLevel: Int?,
    @SerializedName("title") val title: String,
    @SerializedName("description") val description: String?,
    @SerializedName("date") val date: String,
    @SerializedName("start_time") val startTime: String,
    @SerializedName("end_time") val endTime: String,
    @SerializedName("is_open") val isOpen: Boolean,
    @SerializedName("is_active") val isActive: Boolean,
    @SerializedName("session_token") val sessionToken: String?
)

data class StudentDto(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("username") val username: String,
    @SerializedName("grade_level") val gradeLevel: Int,
    @SerializedName("class_name") val className: String,
    @SerializedName("avatar_url") val avatarUrl: String?
)

data class AttendanceDto(
    @SerializedName("id") val id: String,
    @SerializedName("meeting_id") val meetingId: String,
    @SerializedName("user_id") val userId: String?,
    @SerializedName("student_name") val studentName: String,
    @SerializedName("grade_level") val gradeLevel: Int,
    @SerializedName("station_number") val stationNumber: String?,
    @SerializedName("status") val status: String,
    @SerializedName("notes") val notes: String?,
    @SerializedName("check_in_time") val checkInTime: Long?
)

data class SyncPullResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("timestamp") val timestamp: Long,
    @SerializedName("meetings") val meetings: List<MeetingDto> = emptyList(),
    @SerializedName("students") val students: List<StudentDto> = emptyList(),
    @SerializedName("attendances") val attendances: List<AttendanceDto> = emptyList()
)

data class SyncPushRequest(
    @SerializedName("unsyncedMeetings") val unsyncedMeetings: List<MeetingDto>,
    @SerializedName("unsyncedAttendances") val unsyncedAttendances: List<AttendanceDto>
)

data class SyncPushResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("message") val message: String?,
    @SerializedName("timestamp") val timestamp: Long,
    @SerializedName("meetings") val meetings: List<MeetingDto>? = null,
    @SerializedName("attendances") val attendances: List<AttendanceDto>? = null
)
