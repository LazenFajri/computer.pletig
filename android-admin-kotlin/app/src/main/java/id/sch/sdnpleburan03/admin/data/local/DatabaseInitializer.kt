package id.sch.sdnpleburan03.admin.data.local

import android.content.Context
import com.google.gson.Gson
import id.sch.sdnpleburan03.admin.data.local.entity.AttendanceEntity
import id.sch.sdnpleburan03.admin.data.local.entity.MeetingEntity
import id.sch.sdnpleburan03.admin.data.local.entity.StudentEntity
import id.sch.sdnpleburan03.admin.data.local.entity.SyncStatus
import id.sch.sdnpleburan03.admin.data.remote.SyncPullResponse
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.InputStreamReader

object DatabaseInitializer {

    suspend fun populateInitialDataIfEmpty(context: Context, database: AppDatabase) = withContext(Dispatchers.IO) {
        val studentDao = database.studentDao()
        val meetingDao = database.meetingDao()
        val attendanceDao = database.attendanceDao()

        val count = studentDao.getStudentCount()
        // Jika database masih kosong atau kurang dari 50 siswa (indikasi data dummy sebelumnya), load data riil dari seed_data.json
        if (count < 50) {
            try {
                val inputStream = context.assets.open("seed_data.json")
                val reader = InputStreamReader(inputStream)
                val seedData = Gson().fromJson(reader, SyncPullResponse::class.java)
                reader.close()
                inputStream.close()

                if (seedData != null && seedData.students.isNotEmpty()) {
                    // 1. Bersihkan data dummy lama
                    studentDao.clearAll()

                    // 2. Insert 158 Siswa Riil SDN Pleburan 03
                    val realStudents = seedData.students.map { dto ->
                        StudentEntity(
                            id = dto.id,
                            name = dto.name,
                            username = dto.username,
                            gradeLevel = dto.gradeLevel ?: 4,
                            className = dto.className ?: "4A",
                            avatarUrl = dto.avatarUrl
                        )
                    }
                    studentDao.insertAll(realStudents)

                    // 3. Insert 6 Pertemuan Riil
                    val realMeetings = seedData.meetings.map { dto ->
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
                    meetingDao.insertAll(realMeetings)

                    // 4. Insert Riwayat Presensi Riil
                    val realAttendances = seedData.attendances.map { dto ->
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
                    attendanceDao.insertAll(realAttendances)

                    // 5. Insert Tugas Praktikum jika ada
                    if (seedData.assignments.isNotEmpty()) {
                        val assignmentDao = database.assignmentDao()
                        val realAssignments = seedData.assignments.map { dto ->
                            id.sch.sdnpleburan03.admin.data.local.entity.AssignmentEntity(
                                id = dto.id,
                                meetingId = dto.meetingId,
                                title = dto.title,
                                instructions = dto.instructions,
                                dueDate = dto.dueDate,
                                maxScore = dto.maxScore,
                                isGroupWork = dto.isGroupWork
                            )
                        }
                        assignmentDao.insertAll(realAssignments)
                    }

                    // 6. Insert Pengumpulan Tugas (Submissions) jika ada
                    if (seedData.submissions.isNotEmpty()) {
                        val submissionDao = database.submissionDao()
                        val realSubmissions = seedData.submissions.map { dto ->
                            id.sch.sdnpleburan03.admin.data.local.entity.SubmissionEntity(
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
                        submissionDao.insertAll(realSubmissions)
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
}
