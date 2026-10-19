package id.sch.sdnpleburan03.admin.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import id.sch.sdnpleburan03.admin.data.local.entity.StudentEntity
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
        // 1. Observe Network state (Wi-Fi, Cellular, Offline)
        viewModelScope.launch {
            networkMonitor.networkState.collectLatest { netState ->
                _uiState.update { it.copy(networkState = netState) }
                // Jika koneksi beralih ke Wi-Fi dan ada data belum sync, jalankan auto-sync
                if (netState.isWifi && _uiState.value.unsyncedCount > 0 && !_uiState.value.isSyncing) {
                    syncNow()
                }
            }
        }

        // 2. Observe Primary Active Meeting
        viewModelScope.launch {
            repository.getPrimaryActiveMeeting().collectLatest { activeMeeting ->
                _uiState.update { it.copy(primaryMeeting = activeMeeting) }
                if (activeMeeting != null) {
                    loadAttendancesForMeeting(activeMeeting.id)
                }
            }
        }

        // 3. Observe All Meetings
        viewModelScope.launch {
            repository.getAllMeetings().collectLatest { meetings ->
                _uiState.update { it.copy(allMeetings = meetings) }
                if (_uiState.value.primaryMeeting == null && meetings.isNotEmpty()) {
                    _uiState.update { it.copy(primaryMeeting = meetings.first()) }
                    loadAttendancesForMeeting(meetings.first().id)
                }
            }
        }

        // 4. Observe Unsynced Count
        viewModelScope.launch {
            repository.getUnsyncedCount().collectLatest { count ->
                _uiState.update { it.copy(unsyncedCount = count) }
            }
        }

        // 5. Initial load of students
        loadFilteredStudents()
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

    private fun loadFilteredStudents() {
        val grade = _uiState.value.selectedGrade
        val className = _uiState.value.selectedClass

        viewModelScope.launch {
            // Update available distinct classes
            if (grade != null) {
                repository.getDistinctClasses(grade).collectLatest { classes ->
                    _uiState.update { it.copy(availableClasses = classes) }
                }
            } else {
                _uiState.update { it.copy(availableClasses = emptyList()) }
            }
        }

        viewModelScope.launch {
            val studentFlow = when {
                grade != null && className != null -> repository.getStudentsByGradeAndClass(grade, className)
                grade != null -> repository.getStudentsByGrade(grade)
                else -> repository.getAllStudents()
            }

            studentFlow.collectLatest { list ->
                _uiState.update { it.copy(students = list) }
            }
        }
    }

    // Toggle Sesi Buka/Tutup
    fun toggleMeetingStatus(isOpen: Boolean) {
        val current = _uiState.value.primaryMeeting ?: return
        viewModelScope.launch {
            repository.toggleMeetingStatusOffline(current.id, isOpen)
        }
    }

    // Acak Token Sesi Lab Baru
    fun generateNewToken() {
        val current = _uiState.value.primaryMeeting ?: return
        viewModelScope.launch {
            repository.generateNewTokenOffline(current.id)
        }
    }

    // Catat Presensi Siswa Offline
    fun recordAttendance(student: StudentEntity, status: String) {
        val current = _uiState.value.primaryMeeting ?: return
        viewModelScope.launch {
            repository.recordAttendanceOffline(
                meetingId = current.id,
                student = student,
                status = status
            )
        }
    }

    // Buat Pertemuan Baru Secara Offline
    fun createMeeting(title: String, grade: Int?, start: String, end: String, desc: String?) {
        viewModelScope.launch {
            val created = repository.createMeetingOffline(
                title = title,
                gradeLevel = grade,
                startTime = start,
                endTime = end,
                description = desc
            )
            _uiState.update { it.copy(primaryMeeting = created) }
            loadAttendancesForMeeting(created.id)
        }
    }

    // Manual Wi-Fi Sync Now
    fun syncNow() {
        viewModelScope.launch {
            _uiState.update { it.copy(isSyncing = true, syncMessage = "Sedang menyinkronkan dengan BaaS...") }
            val result = repository.performTwoWaySync()
            if (result.isSuccess) {
                _uiState.update {
                    it.copy(
                        isSyncing = false,
                        syncMessage = result.getOrNull() ?: "Sinkronisasi berhasil!"
                    )
                }
            } else {
                _uiState.update {
                    it.copy(
                        isSyncing = false,
                        syncMessage = "Sinkronisasi offline: ${result.exceptionOrNull()?.localizedMessage ?: "Gagal terhubung ke server"}"
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
