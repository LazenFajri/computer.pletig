package id.sch.sdnpleburan03.admin.data.local

import id.sch.sdnpleburan03.admin.data.local.entity.MeetingEntity
import id.sch.sdnpleburan03.admin.data.local.entity.StudentEntity
import id.sch.sdnpleburan03.admin.data.local.entity.SyncStatus
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID

object DatabaseInitializer {

    suspend fun populateInitialDataIfEmpty(database: AppDatabase) = withContext(Dispatchers.IO) {
        val studentDao = database.studentDao()
        val meetingDao = database.meetingDao()

        val count = studentDao.getStudentCount()
        if (count == 0) {
            // 1. Seed Siswa Kelas 4, 5, 6 SDN Pleburan 03
            val sampleStudents = listOf(
                // Kelas 4A
                StudentEntity(UUID.randomUUID().toString(), "Aditia Pratama", "40101", 4, "4A"),
                StudentEntity(UUID.randomUUID().toString(), "Dimas Arya Putra", "40103", 4, "4A"),
                StudentEntity(UUID.randomUUID().toString(), "Ahmad Rizky Pratama", "40105", 4, "4A"),
                StudentEntity(UUID.randomUUID().toString(), "Bima Satria Wijaya", "40107", 4, "4A"),
                StudentEntity(UUID.randomUUID().toString(), "Citra Kirana", "40109", 4, "4A"),

                // Kelas 4B
                StudentEntity(UUID.randomUUID().toString(), "Naura Azkadina", "40102", 4, "4B"),
                StudentEntity(UUID.randomUUID().toString(), "Anisa Rahma", "40104", 4, "4B"),
                StudentEntity(UUID.randomUUID().toString(), "Daffa Alfarezi", "40106", 4, "4B"),
                StudentEntity(UUID.randomUUID().toString(), "Evelyn Aurelia", "40108", 4, "4B"),

                // Kelas 5A
                StudentEntity(UUID.randomUUID().toString(), "Fathan Alvaro", "50101", 5, "5A"),
                StudentEntity(UUID.randomUUID().toString(), "Ghani Pratama", "50103", 5, "5A"),
                StudentEntity(UUID.randomUUID().toString(), "Haikal Firdaus", "50105", 5, "5A"),
                StudentEntity(UUID.randomUUID().toString(), "Indra Maulana", "50107", 5, "5A"),

                // Kelas 5B
                StudentEntity(UUID.randomUUID().toString(), "Keysha Aurelia", "50102", 5, "5B"),
                StudentEntity(UUID.randomUUID().toString(), "Jihan Salsabila", "50104", 5, "5B"),
                StudentEntity(UUID.randomUUID().toString(), "Kayla Azzahra", "50106", 5, "5B"),

                // Kelas 6A
                StudentEntity(UUID.randomUUID().toString(), "Muhammad Fakhri", "60101", 6, "6A"),
                StudentEntity(UUID.randomUUID().toString(), "Naufal Ramadhan", "60103", 6, "6A"),
                StudentEntity(UUID.randomUUID().toString(), "Panji Kusuma", "60105", 6, "6A"),

                // Kelas 6B
                StudentEntity(UUID.randomUUID().toString(), "Zaskia Mecca", "60102", 6, "6B"),
                StudentEntity(UUID.randomUUID().toString(), "Rania Putri", "60104", 6, "6B"),
                StudentEntity(UUID.randomUUID().toString(), "Salwa Aurelia", "60106", 6, "6B")
            )
            studentDao.insertAll(sampleStudents)

            // 2. Seed Pertemuan Awal
            val todayDate = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
            val initialMeeting = MeetingEntity(
                id = UUID.randomUUID().toString(),
                meetingNumber = 1,
                gradeLevel = null, // Semua Kelas
                title = "Pertemuan 1 - Praktik Lab Komputer Pleburan",
                description = "Sesi aktif ekstrakurikuler komputer lab SDN Pleburan 03 Semarang.",
                date = todayDate,
                startTime = "12:30",
                endTime = "14:00",
                isOpen = true,
                isActive = true,
                sessionToken = (1000..9999).random().toString(),
                syncStatus = SyncStatus.SYNCED
            )
            meetingDao.insertOrUpdate(initialMeeting)
        }
    }
}
