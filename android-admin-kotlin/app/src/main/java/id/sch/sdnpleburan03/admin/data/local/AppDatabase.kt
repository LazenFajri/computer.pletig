package id.sch.sdnpleburan03.admin.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverter
import androidx.room.TypeConverters
import id.sch.sdnpleburan03.admin.data.local.dao.AssignmentDao
import id.sch.sdnpleburan03.admin.data.local.dao.AttendanceDao
import id.sch.sdnpleburan03.admin.data.local.dao.MeetingDao
import id.sch.sdnpleburan03.admin.data.local.dao.StudentDao
import id.sch.sdnpleburan03.admin.data.local.dao.SubmissionDao
import id.sch.sdnpleburan03.admin.data.local.entity.AssignmentEntity
import id.sch.sdnpleburan03.admin.data.local.entity.AttendanceEntity
import id.sch.sdnpleburan03.admin.data.local.entity.MeetingEntity
import id.sch.sdnpleburan03.admin.data.local.entity.StudentEntity
import id.sch.sdnpleburan03.admin.data.local.entity.SubmissionEntity
import id.sch.sdnpleburan03.admin.data.local.entity.SyncStatus

class Converters {
    @TypeConverter
    fun fromSyncStatus(status: SyncStatus?): String = status?.name ?: SyncStatus.SYNCED.name

    @TypeConverter
    fun toSyncStatus(value: String?): SyncStatus = try {
        value?.let { SyncStatus.valueOf(it) } ?: SyncStatus.SYNCED
    } catch (_: Exception) {
        SyncStatus.SYNCED
    }
}

@Database(
    entities = [
        MeetingEntity::class,
        StudentEntity::class,
        AttendanceEntity::class,
        AssignmentEntity::class,
        SubmissionEntity::class
    ],
    version = 2,
    exportSchema = false
)
@TypeConverters(Converters::class)
abstract class AppDatabase : RoomDatabase() {
    abstract fun meetingDao(): MeetingDao
    abstract fun studentDao(): StudentDao
    abstract fun attendanceDao(): AttendanceDao
    abstract fun assignmentDao(): AssignmentDao
    abstract fun submissionDao(): SubmissionDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getInstance(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "admin_pletig.db"
                ).fallbackToDestructiveMigration()
                 .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
