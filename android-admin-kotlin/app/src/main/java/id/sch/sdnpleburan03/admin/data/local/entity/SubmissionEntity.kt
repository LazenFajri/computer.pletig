package id.sch.sdnpleburan03.admin.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "submissions")
data class SubmissionEntity(
    @PrimaryKey
    val id: String,

    @ColumnInfo(name = "assignment_id")
    val assignmentId: String,

    @ColumnInfo(name = "user_id")
    val userId: String? = null,

    @ColumnInfo(name = "student_name")
    val studentName: String,

    @ColumnInfo(name = "grade_level")
    val gradeLevel: Int = 4,

    @ColumnInfo(name = "submission_url")
    val submissionUrl: String? = null,

    @ColumnInfo(name = "submission_text")
    val submissionText: String? = null,

    val score: Int? = null,
    val feedback: String? = null,
    val status: String = "submitted", // submitted, graded, late

    @ColumnInfo(name = "submitted_at")
    val submittedAt: Long = System.currentTimeMillis(),

    @ColumnInfo(name = "sync_status")
    val syncStatus: SyncStatus = SyncStatus.SYNCED
)
