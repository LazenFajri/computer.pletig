package id.sch.sdnpleburan03.admin.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "students")
data class StudentEntity(
    @PrimaryKey
    val id: String,

    val name: String,
    val username: String, // NISN

    @ColumnInfo(name = "grade_level")
    val gradeLevel: Int, // 4, 5, 6

    @ColumnInfo(name = "class_name")
    val className: String, // '4A', '4B', '5A', '5B', '6A', '6B'

    @ColumnInfo(name = "avatar_url")
    val avatarUrl: String? = null
)
