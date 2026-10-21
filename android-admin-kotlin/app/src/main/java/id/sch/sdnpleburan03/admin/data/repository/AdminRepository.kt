package id.sch.sdnpleburan03.admin.data.repository

import android.content.Context
import id.sch.sdnpleburan03.admin.data.local.AppDatabase
import id.sch.sdnpleburan03.admin.data.local.entity.AssignmentEntity
import id.sch.sdnpleburan03.admin.data.local.entity.AttendanceEntity
import id.sch.sdnpleburan03.admin.data.local.entity.MeetingEntity
import id.sch.sdnpleburan03.admin.data.local.entity.StudentEntity
import id.sch.sdnpleburan03.admin.data.local.entity.SubmissionEntity
import id.sch.sdnpleburan03.admin.data.local.entity.SyncStatus
import id.sch.sdnpleburan03.admin.data.remote.ApiClient
import id.sch.sdnpleburan03.admin.data.remote.AttendanceDto
import id.sch.sdnpleburan03.admin.data.remote.GradedSubmissionDto
import id.sch.sdnpleburan03.admin.data.remote.MeetingDto
import id.sch.sdnpleburan03.admin.data.remote.SyncPushRequest
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID

class AdminRepository(private val context: Context) {
    private val database = AppDatabase.getInstance(context)
    private val meetingDao = database.meetingDao()
    private val studentDao = database.studentDao()
    private val attendanceDao = database.attendanceDao()
    private val assignmentDao = database.assignmentDao()
    private val submissionDao = database.submissionDao()

    // 1. Data Streams
    fun getAllMeetings(): Flow<List<MeetingEntity>> = meetingDao.getAllMeetings()

    fun getPrimaryActiveMeeting(): Flow<MeetingEntity?> = meetingDao.getPrimaryActiveMeeting()

    fun getAllStudents(): Flow<List<StudentEntity>> = studentDao.getAllStudents()

    fun searchStudents(query: String): Flow<List<StudentEntity>> = studentDao.searchStudents(query)

    fun getStudentsByGrade(gradeLevel: Int): Flow<List<StudentEntity>> =
        studentDao.getStudentsByGrade(gradeLevel)

    fun getStudentsByGradeAndClass(gradeLevel: Int, className: String): Flow<List<StudentEntity>> =
        studentDao.getStudentsByGradeAndClass(gradeLevel, className)

    fun getDistinctClasses(gradeLevel: Int): Flow<List<String>> =
        studentDao.getDistinctClassesForGrade(gradeLevel)

    fun getAttendancesByMeeting(meetingId: String): Flow<List<AttendanceEntity>> =
        attendanceDao.getAttendancesByMeeting(meetingId)

    fun getAllAttendances(): Flow<List<AttendanceEntity>> = attendanceDao.getAllAttendances()

    fun getAllAssignments(): Flow<List<AssignmentEntity>> = assignmentDao.getAllAssignments()

    fun getAssignmentsByMeeting(meetingId: String): Flow<List<AssignmentEntity>> =
        assignmentDao.getAssignmentsByMeeting(meetingId)

    fun getAllSubmissions(): Flow<List<SubmissionEntity>> = submissionDao.getAllSubmissions()

    fun getSubmissionsByAssignment(assignmentId: String): Flow<List<SubmissionEntity>> =
        submissionDao.getSubmissionsByAssignment(assignmentId)

    fun getUnsyncedCount(): Flow<Int> = attendanceDao.getUnsyncedCount()

    // Ping test direct ke database Turso
    suspend fun pingTurso(): Pair<Boolean, Long> = TursoClient.pingTurso(context)

    // 2. Real-Time Turso Database Mutators (Optimistic Local Cache + Direct Cloud Execution)
    suspend fun createMeeting(
        title: String,
        gradeLevel: Int?,
        startTime: String = "12:45",
        endTime: String = "13:55",
        description: String? = null
    ): MeetingEntity = withContext(Dispatchers.IO) {
        val todayStr = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
        val randomToken = (1000..9999).random().toString()
        val meetingId = UUID.randomUUID().toString()
        val meetingNum = ((meetingDao.getUnsyncedMeetings().size) + 1)

        val newMeeting = MeetingEntity(
            id = meetingId,
            meetingNumber = meetingNum,
            gradeLevel = gradeLevel,
            title = title,
            description = description,
            date = todayStr,
            startTime = startTime,
            endTime = endTime,
            isOpen = true,
            isActive = true,
            sessionToken = randomToken,
            syncStatus = SyncStatus.PENDING_INSERT,
            updatedAt = System.currentTimeMillis()
        )
        // A. Simpan lokal instan (UI responsive)
        meetingDao.insertOrUpdate(newMeeting)

        // B. Eksekusi realtime langsung ke database Turso
        val safeTitle = title.replace("'", "''")
        val safeDesc = (description ?: "").replace("'", "''")
        val gradeVal = gradeLevel?.toString() ?: "NULL"
        val sql = "INSERT INTO meetings (id, meeting_number, grade_level, title, description, date, start_time, end_time, is_open, is_active, session_token, attendance_token, created_at) " +
                  "VALUES ('$meetingId', $meetingNum, $gradeVal, '$safeTitle', '$safeDesc', '$todayStr', '$startTime', '$endTime', 1, 1, '$randomToken', '$randomToken', ${System.currentTimeMillis()})"
        val directSuccess = TursoClient.executeSql(context, sql)
        if (directSuccess) {
            meetingDao.markAsSynced(listOf(meetingId))
        }

        newMeeting
    }

    // Alias untuk kompatibilitas
    suspend fun createMeetingOffline(
        title: String,
        gradeLevel: Int?,
        startTime: String = "12:45",
        endTime: String = "13:55",
        description: String? = null
    ) = createMeeting(title, gradeLevel, startTime, endTime, description)

    suspend fun toggleMeetingStatus(meetingId: String, isOpen: Boolean) = withContext(Dispatchers.IO) {
        val existing = meetingDao.getMeetingById(meetingId) ?: return@withContext
        val token = if (isOpen && existing.sessionToken == null) {
            (1000..9999).random().toString()
        } else {
            existing.sessionToken
        }
        meetingDao.updateStatusAndToken(
            id = meetingId,
            isOpen = isOpen,
            isActive = isOpen,
            token = token,
            syncStatus = SyncStatus.PENDING_UPDATE
        )

        // Realtime Turso
        val openInt = if (isOpen) 1 else 0
        val tokenSql = if (token != null) "'$token'" else "NULL"
        val sql = "UPDATE meetings SET is_open = $openInt, is_active = $openInt, session_token = $tokenSql, attendance_token = $tokenSql WHERE id = '$meetingId'"
        val ok = TursoClient.executeSql(context, sql)
        if (ok) meetingDao.markAsSynced(listOf(meetingId))
    }

    suspend fun toggleMeetingStatusOffline(meetingId: String, isOpen: Boolean) = toggleMeetingStatus(meetingId, isOpen)

    suspend fun generateNewToken(meetingId: String): String = withContext(Dispatchers.IO) {
        val newToken = (1000..9999).random().toString()
        meetingDao.updateToken(
            id = meetingId,
            token = newToken,
            syncStatus = SyncStatus.PENDING_UPDATE
        )

        // Realtime Turso
        val sql = "UPDATE meetings SET session_token = '$newToken', attendance_token = '$newToken' WHERE id = '$meetingId'"
        val ok = TursoClient.executeSql(context, sql)
        if (ok) meetingDao.markAsSynced(listOf(meetingId))

        newToken
    }

    suspend fun generateNewTokenOffline(meetingId: String): String = generateNewToken(meetingId)

    suspend fun closeAllMeetings() = withContext(Dispatchers.IO) {
        meetingDao.closeAllMeetings()
        val sql = "UPDATE meetings SET is_open = 0, is_active = 0 WHERE is_open = 1"
        TursoClient.executeSql(context, sql)
    }

    suspend fun closeAllMeetingsOffline() = closeAllMeetings()

    suspend fun deleteMeeting(meetingId: String) = withContext(Dispatchers.IO) {
        meetingDao.deleteById(meetingId)
        val sql = "DELETE FROM meetings WHERE id = '$meetingId'"
        TursoClient.executeSql(context, sql)
    }

    suspend fun deleteMeetingOffline(meetingId: String) = deleteMeeting(meetingId)

    suspend fun recordAttendance(
        meetingId: String,
        student: StudentEntity,
        status: String = "hadir",
        stationNumber: String? = null,
        notes: String? = null
    ) = withContext(Dispatchers.IO) {
        val existing = attendanceDao.findAttendanceForStudent(meetingId, student.id, student.name)
        val attId = existing?.id ?: UUID.randomUUID().toString()
        val attendance = if (existing != null) {
            existing.copy(
                status = status,
                stationNumber = stationNumber ?: existing.stationNumber,
                notes = notes ?: existing.notes,
                checkInTime = System.currentTimeMillis(),
                syncStatus = SyncStatus.PENDING_UPDATE
            )
        } else {
            AttendanceEntity(
                id = attId,
                meetingId = meetingId,
                userId = student.id,
                studentName = student.name,
                gradeLevel = student.gradeLevel,
                stationNumber = stationNumber,
                status = status,
                notes = notes,
                checkInTime = System.currentTimeMillis(),
                syncStatus = SyncStatus.PENDING_INSERT
            )
        }
        attendanceDao.insertOrUpdate(attendance)

        // Realtime Turso
        val safeName = student.name.replace("'", "''")
        val safeNotes = (notes ?: "").replace("'", "''")
        val sql = "INSERT INTO attendance (id, meeting_id, user_id, student_name, grade_level, status, notes, checked_in_at) " +
                  "VALUES ('$attId', '$meetingId', '${student.id}', '$safeName', ${student.gradeLevel}, '$status', '$safeNotes', ${System.currentTimeMillis()}) " +
                  "ON CONFLICT(id) DO UPDATE SET status = '$status', notes = '$safeNotes', checked_in_at = ${System.currentTimeMillis()}"
        val ok = TursoClient.executeSql(context, sql)
        if (ok) attendanceDao.markAsSynced(listOf(attId))
    }

    suspend fun recordAttendanceOffline(
        meetingId: String,
        student: StudentEntity,
        status: String = "hadir",
        stationNumber: String? = null,
        notes: String? = null
    ) = recordAttendance(meetingId, student, status, stationNumber, notes)

    suspend fun quickCheckInAttendance(
        meetingId: String,
        student: StudentEntity,
        status: String
    ) = recordAttendance(meetingId, student, status)

    suspend fun gradeSubmission(
        submissionId: String,
        score: Int,
        feedback: String?
    ) = withContext(Dispatchers.IO) {
        submissionDao.gradeSubmission(submissionId, score, feedback, SyncStatus.PENDING_UPDATE)

        // Realtime Turso
        val safeFb = (feedback ?: "").replace("'", "''")
        val sql = "UPDATE submissions SET score = $score, feedback = '$safeFb', status = 'graded', graded_by = 'Guru Pembina', graded_at = ${System.currentTimeMillis()} WHERE id = '$submissionId'"
        val ok = TursoClient.executeSql(context, sql)
        if (ok) submissionDao.markAsSynced(listOf(submissionId))
    }

    suspend fun gradeSubmissionOffline(
        submissionId: String,
        score: Int,
        feedback: String?
    ) = gradeSubmission(submissionId, score, feedback)

    // 3. Two-Way BaaS Synchronization
    suspend fun performTwoWaySync(): kotlin.Result<String> = withContext(Dispatchers.IO) {
        try {
            val api = ApiClient.getService(context)

            // Step A: Push unsynced changes to server
            val unsyncedMeetings = meetingDao.getUnsyncedMeetings()
            val unsyncedAttendances = attendanceDao.getUnsyncedAttendances()
            val unsyncedGradedSubmissions = submissionDao.getUnsyncedGradedSubmissions()

            if (unsyncedMeetings.isNotEmpty() || unsyncedAttendances.isNotEmpty() || unsyncedGradedSubmissions.isNotEmpty()) {
                val pushRequest = SyncPushRequest(
                    unsyncedMeetings = unsyncedMeetings.map {
                        MeetingDto(
                            id = it.id,
                            meetingNumber = it.meetingNumber,
                            gradeLevel = it.gradeLevel,
                            title = it.title,
                            description = it.description,
                            date = it.date,
                            startTime = it.startTime,
                            endTime = it.endTime,
                            isOpen = it.isOpen,
                            isActive = it.isActive,
                            sessionToken = it.sessionToken
                        )
                    },
                    unsyncedAttendances = unsyncedAttendances.map {
                        AttendanceDto(
                            id = it.id,
                            meetingId = it.meetingId,
                            userId = it.userId,
                            studentName = it.studentName,
                            gradeLevel = it.gradeLevel,
                            stationNumber = it.stationNumber,
                            status = it.status,
                            notes = it.notes,
                            checkInTime = it.checkInTime
                        )
                    },
                    gradedSubmissions = unsyncedGradedSubmissions.map {
                        GradedSubmissionDto(
                            id = it.id,
                            score = it.score ?: 100,
                            feedback = it.feedback
                        )
                    }
                )

                val pushResponse = api.pushSyncData(pushRequest)
                if (pushResponse.isSuccessful && pushResponse.body()?.success == true) {
                    meetingDao.markAsSynced(unsyncedMeetings.map { it.id })
                    attendanceDao.markAsSynced(unsyncedAttendances.map { it.id })
                    submissionDao.markAsSynced(unsyncedGradedSubmissions.map { it.id })
                }
            }

            // Step B: Pull latest unified snapshot from server
            val pullResponse = api.pullSyncData()
            if (pullResponse.isSuccessful && pullResponse.body()?.success == true) {
                val data = pullResponse.body()!!

                // Merge meetings
                val serverMeetings = data.meetings.map { dto ->
                    MeetingEntity(
                        id = dto.id,
                        meetingNumber = dto.meetingNumber,
                        gradeLevel = dto.gradeLevel,
                        title = dto.title,
                        description = dto.description,
                        date = dto.date,
                        startTime = dto.startTime,
                        endTime = dto.endTime,
                        isOpen = dto.isOpen,
                        isActive = dto.isActive,
                        sessionToken = dto.sessionToken,
                        syncStatus = SyncStatus.SYNCED
                    )
                }
                meetingDao.insertAll(serverMeetings)

                // Merge students master data (158 siswa)
                val serverStudents = data.students.map { dto ->
                    StudentEntity(
                        id = dto.id,
                        name = dto.name,
                        username = dto.username,
                        gradeLevel = dto.gradeLevel ?: 4,
                        className = dto.className ?: "4A",
                        avatarUrl = dto.avatarUrl
                    )
                }
                if (serverStudents.isNotEmpty()) {
                    studentDao.insertAll(serverStudents)
                }

                // Merge attendances
                val serverAttendances = data.attendances.map { dto ->
                    AttendanceEntity(
                        id = dto.id,
                        meetingId = dto.meetingId,
                        userId = dto.userId,
                        studentName = dto.studentName,
                        gradeLevel = dto.gradeLevel ?: 4,
                        stationNumber = dto.stationNumber,
                        status = dto.status,
                        notes = dto.notes,
                        checkInTime = dto.checkInTime ?: System.currentTimeMillis(),
                        syncStatus = SyncStatus.SYNCED
                    )
                }
                if (serverAttendances.isNotEmpty()) {
                    attendanceDao.insertAll(serverAttendances)
                }

                // Merge assignments
                if (data.assignments.isNotEmpty()) {
                    val serverAssignments = data.assignments.map { dto ->
                        AssignmentEntity(
                            id = dto.id,
                            meetingId = dto.meetingId,
                            title = dto.title,
                            instructions = dto.instructions,
                            dueDate = dto.dueDate,
                            maxScore = dto.maxScore,
                            isGroupWork = dto.isGroupWork
                        )
                    }
                    assignmentDao.insertAll(serverAssignments)
                }

                // Merge submissions
                if (data.submissions.isNotEmpty()) {
                    val serverSubmissions = data.submissions.map { dto ->
                        SubmissionEntity(
                            id = dto.id,
                            assignmentId = dto.assignmentId,
                            userId = dto.userId,
                            studentName = dto.studentName,
                            gradeLevel = dto.gradeLevel,
                            submissionUrl = dto.submissionUrl,
                            submissionText = dto.submissionText,
                            score = dto.score,
                            feedback = dto.feedback,
                            status = dto.status,
                            submittedAt = dto.submittedAt ?: System.currentTimeMillis(),
                            syncStatus = SyncStatus.SYNCED
                        )
                    }
                    submissionDao.insertAll(serverSubmissions)
                }

                return@withContext kotlin.Result.success("Sinkronisasi Berhasil! Terhubung direct ke database Turso.")
            } else {
                return@withContext kotlin.Result.failure(Exception("Server mengembalikan kode: ${pullResponse.code()}"))
            }
        } catch (e: Exception) {
            return@withContext kotlin.Result.failure(e)
        }
    }
}
