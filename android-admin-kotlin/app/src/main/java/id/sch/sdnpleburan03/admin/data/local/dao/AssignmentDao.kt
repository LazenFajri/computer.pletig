package id.sch.sdnpleburan03.admin.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import id.sch.sdnpleburan03.admin.data.local.entity.AssignmentEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface AssignmentDao {
    @Query("SELECT * FROM assignments ORDER BY created_at DESC")
    fun getAllAssignments(): Flow<List<AssignmentEntity>>

    @Query("SELECT * FROM assignments WHERE meeting_id = :meetingId ORDER BY created_at DESC")
    fun getAssignmentsByMeeting(meetingId: String): Flow<List<AssignmentEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(assignments: List<AssignmentEntity>)

    @Query("DELETE FROM assignments")
    suspend fun clearAll()
}
