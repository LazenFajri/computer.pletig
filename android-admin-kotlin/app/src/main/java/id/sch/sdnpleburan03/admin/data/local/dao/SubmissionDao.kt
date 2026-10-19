package id.sch.sdnpleburan03.admin.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import id.sch.sdnpleburan03.admin.data.local.entity.SubmissionEntity
import id.sch.sdnpleburan03.admin.data.local.entity.SyncStatus
import kotlinx.coroutines.flow.Flow

@Dao
interface SubmissionDao {
    @Query("SELECT * FROM submissions ORDER BY submitted_at DESC")
    fun getAllSubmissions(): Flow<List<SubmissionEntity>>

    @Query("SELECT * FROM submissions WHERE assignment_id = :assignmentId ORDER BY submitted_at DESC")
    fun getSubmissionsByAssignment(assignmentId: String): Flow<List<SubmissionEntity>>

    @Query("SELECT * FROM submissions WHERE sync_status != 'SYNCED'")
    suspend fun getUnsyncedGradedSubmissions(): List<SubmissionEntity>

    @Query("UPDATE submissions SET score = :score, feedback = :feedback, status = 'graded', sync_status = :syncStatus WHERE id = :id")
    suspend fun gradeSubmission(
        id: String,
        score: Int,
        feedback: String?,
        syncStatus: SyncStatus = SyncStatus.PENDING_UPDATE
    )

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(submissions: List<SubmissionEntity>)

    @Query("UPDATE submissions SET sync_status = 'SYNCED' WHERE id IN (:ids)")
    suspend fun markAsSynced(ids: List<String>)

    @Query("DELETE FROM submissions")
    suspend fun clearAll()
}
