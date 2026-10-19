package id.sch.sdnpleburan03.admin.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import id.sch.sdnpleburan03.admin.data.local.entity.AttendanceEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface AttendanceDao {
    @Query("SELECT * FROM attendances WHERE meeting_id = :meetingId ORDER BY check_in_time DESC")
    fun getAttendancesByMeeting(meetingId: String): Flow<List<AttendanceEntity>>

    @Query("SELECT * FROM attendances ORDER BY check_in_time DESC")
    fun getAllAttendances(): Flow<List<AttendanceEntity>>

    @Query("SELECT * FROM attendances WHERE sync_status != 'SYNCED'")
    suspend fun getUnsyncedAttendances(): List<AttendanceEntity>

    @Query("SELECT * FROM attendances WHERE meeting_id = :meetingId AND (user_id = :userId OR student_name = :studentName) LIMIT 1")
    suspend fun findAttendanceForStudent(meetingId: String, userId: String?, studentName: String): AttendanceEntity?

    @Query("SELECT COUNT(*) FROM attendances WHERE sync_status != 'SYNCED'")
    fun getUnsyncedCount(): Flow<Int>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrUpdate(attendance: AttendanceEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(attendances: List<AttendanceEntity>)

    @Query("UPDATE attendances SET sync_status = 'SYNCED' WHERE id IN (:ids)")
    suspend fun markAsSynced(ids: List<String>)

    @Query("DELETE FROM attendances WHERE id = :id")
    suspend fun deleteById(id: String)
}
