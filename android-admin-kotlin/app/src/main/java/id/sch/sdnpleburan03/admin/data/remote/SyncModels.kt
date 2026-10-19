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
    @SerializedName("grade_level") val gradeLevel: Int? = 4,
    @SerializedName("class_name") val className: String? = "4A",
    @SerializedName("avatar_url") val avatarUrl: String?
)

data class AttendanceDto(
    @SerializedName("id") val id: String,
    @SerializedName("meeting_id") val meetingId: String,
    @SerializedName("user_id") val userId: String?,
    @SerializedName("student_name") val studentName: String,
    @SerializedName("grade_level") val gradeLevel: Int? = 4,
    @SerializedName("station_number") val stationNumber: String?,
    @SerializedName("status") val status: String,
    @SerializedName("notes") val notes: String?,
    @SerializedName("check_in_time") val checkInTime: Long?
)

data class AssignmentDto(
    @SerializedName("id") val id: String,
    @SerializedName("meeting_id") val meetingId: String,
    @SerializedName("title") val title: String,
    @SerializedName("instructions") val instructions: String?,
    @SerializedName("due_date") val dueDate: String?,
    @SerializedName("max_score") val maxScore: Int,
    @SerializedName("is_group_work") val isGroupWork: Boolean = false
)

data class SubmissionDto(
    @SerializedName("id") val id: String,
    @SerializedName("assignment_id") val assignmentId: String,
    @SerializedName("user_id") val userId: String?,
    @SerializedName("student_name") val studentName: String,
    @SerializedName("grade_level") val gradeLevel: Int,
    @SerializedName("submission_url") val submissionUrl: String?,
    @SerializedName("submission_text") val submissionText: String?,
    @SerializedName("score") val score: Int?,
    @SerializedName("feedback") val feedback: String?,
    @SerializedName("status") val status: String,
    @SerializedName("submitted_at") val submittedAt: Long?
)

data class GradedSubmissionDto(
    @SerializedName("id") val id: String,
    @SerializedName("score") val score: Int,
    @SerializedName("feedback") val feedback: String?
)

data class SyncPullResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("timestamp") val timestamp: Long,
    @SerializedName("meetings") val meetings: List<MeetingDto> = emptyList(),
    @SerializedName("students") val students: List<StudentDto> = emptyList(),
    @SerializedName("attendances") val attendances: List<AttendanceDto> = emptyList(),
    @SerializedName("assignments") val assignments: List<AssignmentDto> = emptyList(),
    @SerializedName("submissions") val submissions: List<SubmissionDto> = emptyList()
)

data class SyncPushRequest(
    @SerializedName("unsyncedMeetings") val unsyncedMeetings: List<MeetingDto> = emptyList(),
    @SerializedName("unsyncedAttendances") val unsyncedAttendances: List<AttendanceDto> = emptyList(),
    @SerializedName("deletedMeetingIds") val deletedMeetingIds: List<String> = emptyList(),
    @SerializedName("deletedAttendanceIds") val deletedAttendanceIds: List<String> = emptyList(),
    @SerializedName("gradedSubmissions") val gradedSubmissions: List<GradedSubmissionDto> = emptyList()
)

data class SyncPushResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("message") val message: String?,
    @SerializedName("timestamp") val timestamp: Long,
    @SerializedName("meetings") val meetings: List<MeetingDto>? = null,
    @SerializedName("attendances") val attendances: List<AttendanceDto>? = null,
    @SerializedName("assignments") val assignments: List<AssignmentDto>? = null,
    @SerializedName("submissions") val submissions: List<SubmissionDto>? = null
)
