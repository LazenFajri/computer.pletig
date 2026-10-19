package id.sch.sdnpleburan03.admin.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import id.sch.sdnpleburan03.admin.data.local.entity.StudentEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface StudentDao {
    @Query("SELECT * FROM students ORDER BY grade_level ASC, class_name ASC, name ASC")
    fun getAllStudents(): Flow<List<StudentEntity>>

    @Query("SELECT * FROM students WHERE grade_level = :gradeLevel ORDER BY class_name ASC, name ASC")
    fun getStudentsByGrade(gradeLevel: Int): Flow<List<StudentEntity>>

    @Query("SELECT * FROM students WHERE grade_level = :gradeLevel AND class_name = :className ORDER BY name ASC")
    fun getStudentsByGradeAndClass(gradeLevel: Int, className: String): Flow<List<StudentEntity>>

    @Query("SELECT DISTINCT class_name FROM students WHERE grade_level = :gradeLevel ORDER BY class_name ASC")
    fun getDistinctClassesForGrade(gradeLevel: Int): Flow<List<String>>

    @Query("SELECT COUNT(*) FROM students")
    suspend fun getStudentCount(): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(students: List<StudentEntity>)
}
