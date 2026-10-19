package id.sch.sdnpleburan03.admin.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "meetings")
data class MeetingEntity(
    @PrimaryKey
    val id: String,

    @ColumnInfo(name = "meeting_number")
    val meetingNumber: Int,

    @ColumnInfo(name = "grade_level")
    val gradeLevel: Int?, // 4, 5, 6, atau null untuk semua kelas

    val title: String,
    val description: String?,
    val date: String, // Format YYYY-MM-DD

    @ColumnInfo(name = "start_time")
    val startTime: String = "12:30",

    @ColumnInfo(name = "end_time")
    val endTime: String = "14:00",

    @ColumnInfo(name = "is_open")
    val isOpen: Boolean = true,

    @ColumnInfo(name = "is_active")
    val isActive: Boolean = true,

    @ColumnInfo(name = "session_token")
    val sessionToken: String? = null,

    @ColumnInfo(name = "sync_status")
    val syncStatus: SyncStatus = SyncStatus.SYNCED,

    @ColumnInfo(name = "updated_at")
    val updatedAt: Long = System.currentTimeMillis()
)
