package id.sch.sdnpleburan03.admin.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "attendances")
data class AttendanceEntity(
    @PrimaryKey
    val id: String,

    @ColumnInfo(name = "meeting_id")
    val meetingId: String,

    @ColumnInfo(name = "user_id")
    val userId: String?,

    @ColumnInfo(name = "student_name")
    val studentName: String,

    @ColumnInfo(name = "grade_level")
    val gradeLevel: Int,

    @ColumnInfo(name = "station_number")
    val stationNumber: String? = null,

    val status: String = "hadir", // hadir, izin, sakit, alpa
    val notes: String? = null,

    @ColumnInfo(name = "check_in_time")
    val checkInTime: Long = System.currentTimeMillis(),

    @ColumnInfo(name = "sync_status")
    val syncStatus: SyncStatus = SyncStatus.SYNCED
)
