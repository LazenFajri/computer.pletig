package id.sch.sdnpleburan03.admin.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import id.sch.sdnpleburan03.admin.data.local.entity.MeetingEntity
import id.sch.sdnpleburan03.admin.data.local.entity.SyncStatus
import kotlinx.coroutines.flow.Flow

@Dao
interface MeetingDao {
    @Query("SELECT * FROM meetings ORDER BY meeting_number DESC, date DESC")
    fun getAllMeetings(): Flow<List<MeetingEntity>>

    @Query("SELECT * FROM meetings WHERE id = :id LIMIT 1")
    suspend fun getMeetingById(id: String): MeetingEntity?

    @Query("SELECT * FROM meetings WHERE is_open = 1 AND is_active = 1 ORDER BY date DESC LIMIT 1")
    fun getPrimaryActiveMeeting(): Flow<MeetingEntity?>

    @Query("SELECT * FROM meetings WHERE sync_status != 'SYNCED'")
    suspend fun getUnsyncedMeetings(): List<MeetingEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrUpdate(meeting: MeetingEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(meetings: List<MeetingEntity>)

    @Update
    suspend fun update(meeting: MeetingEntity)

    @Query("UPDATE meetings SET is_open = :isOpen, is_active = :isActive, session_token = :token, sync_status = :syncStatus, updated_at = :updatedAt WHERE id = :id")
    suspend fun updateStatusAndToken(
        id: String,
        isOpen: Boolean,
        isActive: Boolean,
        token: String?,
        syncStatus: SyncStatus = SyncStatus.PENDING_UPDATE,
        updatedAt: Long = System.currentTimeMillis()
    )

    @Query("UPDATE meetings SET session_token = :token, sync_status = :syncStatus, updated_at = :updatedAt WHERE id = :id")
    suspend fun updateToken(
        id: String,
        token: String,
        syncStatus: SyncStatus = SyncStatus.PENDING_UPDATE,
        updatedAt: Long = System.currentTimeMillis()
    )

    @Query("UPDATE meetings SET sync_status = 'SYNCED' WHERE id IN (:ids)")
    suspend fun markAsSynced(ids: List<String>)

    @Query("DELETE FROM meetings WHERE id = :id")
    suspend fun deleteById(id: String)
}
