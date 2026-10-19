package id.sch.sdnpleburan03.admin.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import id.sch.sdnpleburan03.admin.data.local.entity.AssignmentEntity
import id.sch.sdnpleburan03.admin.data.local.entity.MeetingEntity
import id.sch.sdnpleburan03.admin.data.local.entity.StudentEntity
import id.sch.sdnpleburan03.admin.data.local.entity.SubmissionEntity
import id.sch.sdnpleburan03.admin.data.remote.ApiClient
import id.sch.sdnpleburan03.admin.data.repository.AdminRepository
import id.sch.sdnpleburan03.admin.sync.NetworkMonitor
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class AdminDashboardViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = AdminRepository(application)
    private val networkMonitor = NetworkMonitor(application)

    private val _uiState = MutableStateFlow(
        AdminDashboardState(
            serverBaseUrl = ApiClient.getBaseUrl(application)
        )
    )
    val uiState: StateFlow<AdminDashboardState> = _uiState.asStateFlow()

    init {
        // 1. Observe Network state & Sync real-time saat online
        viewModelScope.launch {
            networkMonitor.networkState.collectLatest { netState ->
                _uiState.update { it.copy(networkState = netState) }
                if (netState.isOnline && !_uiState.value.isSyncing) {
                    syncNow()
                }
            }
        }

        // 2. Observe Primary Active Meeting
        viewModelScope.launch {
            repository.getPrimaryActiveMeeting().collectLatest { activeMeeting ->
                _uiState.update { it.copy(primaryMeeting = activeMeeting) }
                if (activeMeeting != null && _uiState.value.selectedMeetingForMatrix == null) {
                    _uiState.update { it.copy(selectedMeetingForMatrix = activeMeeting) }
                    loadAttendancesForMeeting(activeMeeting.id)
                }
            }
        }

        // 3. Observe All Meetings
        viewModelScope.launch {
            repository.getAllMeetings().collectLatest { meetings ->
                _uiState.update { it.copy(allMeetings = meetings) }
                if (_uiState.value.primaryMeeting == null && meetings.isNotEmpty()) {
                    val firstM = meetings.first()
                    _uiState.update {
                        it.copy(
                            primaryMeeting = firstM,
                            selectedMeetingForMatrix = it.selectedMeetingForMatrix ?: firstM
                        )
                    }
                    loadAttendancesForMeeting(firstM.id)
                }
            }
        }

        // 4. Observe All Students (158 master)
        viewModelScope.launch {
            repository.getAllStudents().collectLatest { allStudents ->
                _uiState.update { it.copy(allStudents = allStudents) }
            }
        }

        // 5. Observe All Attendances for Rekap
        viewModelScope.launch {
            repository.getAllAttendances().collectLatest { allAtt ->
                _uiState.update { it.copy(allAttendances = allAtt) }
            }
        }

        // 6. Observe Assignments
        viewModelScope.launch {
            repository.getAllAssignments().collectLatest { assignments ->
                _uiState.update { it.copy(assignments = assignments) }
                if (_uiState.value.selectedAssignmentForFilter == null && assignments.isNotEmpty()) {
                    _uiState.update { it.copy(selectedAssignmentForFilter = assignments.first()) }
                }
            }
        }

        // 7. Observe Submissions
        viewModelScope.launch {
            repository.getAllSubmissions().collectLatest { submissions ->
                _uiState.update { it.copy(submissions = submissions) }
            }
        }

        // 8. Observe Unsynced Count
        viewModelScope.launch {
            repository.getUnsyncedCount().collectLatest { count ->
                _uiState.update { it.copy(unsyncedCount = count) }
            }
        }

        // 9. Initial load of filtered students
        loadFilteredStudents()

        // 10. Sync awal saat app dibuka
        syncNow()
    }

    fun setTab(tab: AdminTab) {
        _uiState.update { it.copy(currentTab = tab) }
    }

    fun selectMeetingForMatrix(meeting: MeetingEntity) {
        _uiState.update { it.copy(selectedMeetingForMatrix = meeting) }
        loadAttendancesForMeeting(meeting.id)
    }

    fun selectAssignmentForFilter(assignment: AssignmentEntity?) {
        _uiState.update { it.copy(selectedAssignmentForFilter = assignment) }
    }

    private fun loadAttendancesForMeeting(meetingId: String) {
        viewModelScope.launch {
            repository.getAttendancesByMeeting(meetingId).collectLatest { attList ->
                _uiState.update { it.copy(attendances = attList) }
            }
        }
    }

    fun filterByGrade(grade: Int?) {
        _uiState.update { it.copy(selectedGrade = grade, selectedClass = null) }
        loadFilteredStudents()
    }

    fun filterByClass(className: String?) {
        _uiState.update { it.copy(selectedClass = className) }
        loadFilteredStudents()
    }

    fun onSearchStudent(query: String) {
        _uiState.update { it.copy(studentSearchQuery = query) }
        loadFilteredStudents()
    }

    private fun loadFilteredStudents() {
        val grade = _uiState.value.selectedGrade
        val className = _uiState.value.selectedClass
        val query = _uiState.value.studentSearchQuery.trim()

        viewModelScope.launch {
            if (grade != null) {
                repository.getDistinctClasses(grade).collectLatest { classes ->
                    _uiState.update { it.copy(availableClasses = classes) }
                }
            } else {
                _uiState.update { it.copy(availableClasses = emptyList()) }
            }
        }

        viewModelScope.launch {
            val studentFlow = if (query.isNotBlank()) {
                repository.searchStudents(query)
            } else {
                when {
                    grade != null && className != null -> repository.getStudentsByGradeAndClass(grade, className)
                    grade != null -> repository.getStudentsByGrade(grade)
                    else -> repository.getAllStudents()
                }
            }

            studentFlow.collectLatest { list ->
                // Jika search query aktif dengan filter grade/class, filter in-memory
                val filtered = list.filter { st ->
                    (grade == null || st.gradeLevel == grade) &&
                    (className == null || st.className.equals(className, ignoreCase = true))
                }
                _uiState.update { it.copy(students = filtered) }
            }
        }
    }

    // Toggle Sesi Buka/Tutup
    fun toggleMeetingStatus(isOpen: Boolean) {
        val current = _uiState.value.primaryMeeting ?: return
        viewModelScope.launch {
            repository.toggleMeetingStatusOffline(current.id, isOpen)
            if (_uiState.value.networkState.isOnline) {
                syncNow()
            }
        }
    }

    fun toggleMeetingStatus(meetingId: String, isOpen: Boolean) {
        viewModelScope.launch {
            repository.toggleMeetingStatusOffline(meetingId, isOpen)
            if (_uiState.value.networkState.isOnline) {
                syncNow()
            }
        }
    }

    // Acak Token Sesi Lab Baru (Anti-Titip Absen)
    fun generateNewToken() {
        val current = _uiState.value.primaryMeeting ?: return
        generateNewTokenForMeeting(current.id)
    }

    fun generateNewTokenForMeeting(meetingId: String) {
        viewModelScope.launch {
            repository.generateNewTokenOffline(meetingId)
            if (_uiState.value.networkState.isOnline) {
                syncNow()
            }
        }
    }

    // Tutup Semua Sesi (Emergency Lock)
    fun closeAllMeetings() {
        viewModelScope.launch {
            repository.closeAllMeetingsOffline()
            if (_uiState.value.networkState.isOnline) {
                syncNow()
            }
        }
    }

    // Hapus Sesi Pertemuan
    fun deleteMeeting(meetingId: String) {
        viewModelScope.launch {
            repository.deleteMeetingOffline(meetingId)
            if (_uiState.value.networkState.isOnline) {
                syncNow()
            }
        }
    }

    // Quick Check-in Presensi (Hadir, Izin, Sakit, Alpa) 1-tap
    fun quickCheckIn(student: StudentEntity, status: String) {
        val meeting = _uiState.value.selectedMeetingForMatrix ?: _uiState.value.primaryMeeting ?: return
        viewModelScope.launch {
            repository.quickCheckInAttendance(
                meetingId = meeting.id,
                student = student,
                status = status
            )
            if (_uiState.value.networkState.isOnline) {
                syncNow()
            }
        }
    }

    // Catat Presensi Siswa Biasa
    fun recordAttendance(student: StudentEntity, status: String) {
        val current = _uiState.value.primaryMeeting ?: return
        viewModelScope.launch {
            repository.recordAttendanceOffline(
                meetingId = current.id,
                student = student,
                status = status
            )
            if (_uiState.value.networkState.isOnline) {
                syncNow()
            }
        }
    }

    // Buat Pertemuan Baru
    fun createMeeting(title: String, grade: Int?, start: String, end: String, desc: String?) {
        viewModelScope.launch {
            val created = repository.createMeetingOffline(
                title = title,
                gradeLevel = grade,
                startTime = start,
                endTime = end,
                description = desc
            )
            _uiState.update {
                it.copy(
                    primaryMeeting = created,
                    selectedMeetingForMatrix = created
                )
            }
            loadAttendancesForMeeting(created.id)
            if (_uiState.value.networkState.isOnline) {
                syncNow()
            }
        }
    }

    // Dialog Penilaian Tugas
    fun openGradeDialog(submission: SubmissionEntity) {
        _uiState.update { it.copy(selectedSubmissionForGrading = submission) }
    }

    fun closeGradeDialog() {
        _uiState.update { it.copy(selectedSubmissionForGrading = null) }
    }

    fun submitGrade(submissionId: String, score: Int, feedback: String?) {
        viewModelScope.launch {
            repository.gradeSubmissionOffline(submissionId, score, feedback)
            closeGradeDialog()
            if (_uiState.value.networkState.isOnline) {
                syncNow()
            }
        }
    }

    // Manual / Auto Real-Time Online Sync
    fun syncNow() {
        viewModelScope.launch {
            _uiState.update { it.copy(isSyncing = true) }
            val result = repository.performTwoWaySync()
            if (result.isSuccess) {
                _uiState.update {
                    it.copy(
                        isSyncing = false,
                        syncMessage = result.getOrNull() ?: "Online: Data tersinkron dengan cloud Turso"
                    )
                }
            } else {
                _uiState.update {
                    it.copy(
                        isSyncing = false,
                        syncMessage = if (it.networkState.isOnline) {
                            "Online status: ${result.exceptionOrNull()?.localizedMessage ?: "Gagal terhubung"}"
                        } else null
                    )
                }
            }
        }
    }

    fun dismissSyncMessage() {
        _uiState.update { it.copy(syncMessage = null) }
    }

    fun updateServerUrl(newUrl: String) {
        ApiClient.setBaseUrl(getApplication(), newUrl)
        _uiState.update { it.copy(serverBaseUrl = ApiClient.getBaseUrl(getApplication())) }
        syncNow()
    }
}
