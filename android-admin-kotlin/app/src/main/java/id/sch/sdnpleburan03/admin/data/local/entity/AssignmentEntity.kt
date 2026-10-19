package id.sch.sdnpleburan03.admin.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "assignments")
data class AssignmentEntity(
    @PrimaryKey
    val id: String,

    @ColumnInfo(name = "meeting_id")
    val meetingId: String,

    val title: String,
    val instructions: String? = null,

    @ColumnInfo(name = "due_date")
    val dueDate: String? = null,

    @ColumnInfo(name = "max_score")
    val maxScore: Int = 100,

    @ColumnInfo(name = "is_group_work")
    val isGroupWork: Boolean = false,

    @ColumnInfo(name = "created_at")
    val createdAt: Long = System.currentTimeMillis()
)
