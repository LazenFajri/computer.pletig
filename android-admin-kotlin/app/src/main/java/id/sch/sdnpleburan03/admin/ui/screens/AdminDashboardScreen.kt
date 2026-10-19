package id.sch.sdnpleburan03.admin.ui.screens

import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Autorenew
import androidx.compose.material.icons.filled.CloudDone
import androidx.compose.material.icons.filled.CloudUpload
import androidx.compose.material.icons.filled.Key
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Wifi
import androidx.compose.material.icons.filled.WifiOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import id.sch.sdnpleburan03.admin.data.local.entity.StudentEntity
import id.sch.sdnpleburan03.admin.data.local.entity.SyncStatus
import id.sch.sdnpleburan03.admin.ui.theme.AmberLight
import id.sch.sdnpleburan03.admin.ui.theme.AmberWarning
import id.sch.sdnpleburan03.admin.ui.theme.EmeraldLight
import id.sch.sdnpleburan03.admin.ui.theme.EmeraldSuccess
import id.sch.sdnpleburan03.admin.ui.theme.IndigoAccent
import id.sch.sdnpleburan03.admin.ui.theme.PurpleDark
import id.sch.sdnpleburan03.admin.ui.theme.PurplePrimary
import id.sch.sdnpleburan03.admin.ui.theme.RoseDanger
import id.sch.sdnpleburan03.admin.ui.theme.RoseLight
import id.sch.sdnpleburan03.admin.ui.theme.SlateBorder
import id.sch.sdnpleburan03.admin.ui.theme.SlateCard
import id.sch.sdnpleburan03.admin.ui.theme.SlateCardElevated
import id.sch.sdnpleburan03.admin.ui.theme.SlateDark
import id.sch.sdnpleburan03.admin.ui.theme.SlateTextMuted
import id.sch.sdnpleburan03.admin.ui.theme.White
import id.sch.sdnpleburan03.admin.ui.viewmodel.AdminDashboardViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminDashboardScreen(
    viewModel: AdminDashboardViewModel
) {
    val context = LocalContext.current
    val clipboardManager = LocalClipboardManager.current
    val state by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    var showCreateDialog by remember { mutableStateOf(false) }
    var showServerConfigDialog by remember { mutableStateOf(false) }

    LaunchedEffect(state.syncMessage) {
        state.syncMessage?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.dismissSyncMessage()
        }
    }

    // Animasi putaran saat sync berlangsung
    val infiniteTransition = rememberInfiniteTransition(label = "syncSpin")
    val spinAngle by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1000, easing = LinearEasing)
        ),
        label = "spinAngle"
    )

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(Brush.linearGradient(listOf(PurplePrimary, IndigoAccent))),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Shield,
                                contentDescription = null,
                                tint = White,
                                modifier = Modifier.size(20.dp)
                            )
                        }

                        Column {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = "computer",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = White
                                )
                                Text(
                                    text = ".pletig",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = PurplePrimary
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(6.dp))
                                        .background(PurplePrimary.copy(alpha = 0.25f))
                                        .padding(horizontal = 6.dp, vertical = 2.dp)
                                ) {
                                    Text(
                                        text = "ADMIN",
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.ExtraBold,
                                        color = PurplePrimary
                                    )
                                }
                            }
                            Text(
                                text = "SDN Pleburan 03 Semarang",
                                fontSize = 10.sp,
                                color = SlateTextMuted
                            )
                        }
                    }
                },
                actions = {
                    // Tombol Manual Sync dengan status animasi
                    IconButton(
                        onClick = { viewModel.syncNow() },
                        enabled = !state.isSyncing
                    ) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = "Sync Sekarang",
                            tint = if (state.networkState.isWifi) EmeraldSuccess else AmberWarning,
                            modifier = if (state.isSyncing) Modifier.rotate(spinAngle) else Modifier
                        )
                    }

                    // Tombol Pengaturan Server URL
                    IconButton(onClick = { showServerConfigDialog = true }) {
                        Icon(
                            imageVector = Icons.Default.Settings,
                            contentDescription = "Pengaturan BaaS",
                            tint = SlateTextMuted
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = SlateDark
                )
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showCreateDialog = true },
                containerColor = PurplePrimary,
                contentColor = White,
                shape = CircleShape
            ) {
                Icon(Icons.Default.Add, contentDescription = "Buat Sesi Baru")
            }
        },
        containerColor = SlateDark
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // 1. Connection Status Banner (Wi-Fi vs Full Offline)
            item {
                ConnectionStatusBanner(
                    isWifi = state.networkState.isWifi,
                    isOnline = state.networkState.isOnline,
                    unsyncedCount = state.unsyncedCount,
                    onSyncClick = { viewModel.syncNow() }
                )
            }

            // 2. Quick Stat Metrics
            item {
                QuickMetricsRow(
                    activeSessionTitle = state.primaryMeeting?.title ?: "Tidak Ada",
                    attendeesCount = state.attendances.size,
                    totalStudents = state.students.size,
                    unsyncedCount = state.unsyncedCount
                )
            }

            // 3. Sesi Aktif & Token Generator Card (Anti-Titip Absen)
            item {
                ActiveSessionCard(
                    meeting = state.primaryMeeting,
                    onToggleStatus = { isOpen -> viewModel.toggleMeetingStatus(isOpen) },
                    onGenerateToken = { viewModel.generateNewToken() },
                    onCopyToken = { token ->
                        clipboardManager.setText(AnnotatedString(token))
                        Toast.makeText(context, "Kode token $token berhasil disalin!", Toast.LENGTH_SHORT).show()
                    }
                )
            }

            // 4. Filter Jenjang & Rombel Siswa
            item {
                FilterSection(
                    selectedGrade = state.selectedGrade,
                    selectedClass = state.selectedClass,
                    availableClasses = state.availableClasses,
                    onGradeSelected = { viewModel.filterByGrade(it) },
                    onClassSelected = { viewModel.filterByClass(it) }
                )
            }

            // 5. Header Daftar Presensi Siswa
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "Presensi Siswa Praktikum",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = White
                        )
                        Text(
                            text = "Klik 1-tap tombol hadir/izin/sakit untuk simpan offline",
                            style = MaterialTheme.typography.bodySmall,
                            color = SlateTextMuted
                        )
                    }

                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(PurplePrimary.copy(alpha = 0.2f))
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Text(
                            text = "${state.students.size} Siswa",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            color = PurplePrimary
                        )
                    }
                }
            }

            // 6. Matriks Siswa & Quick Attendance Buttons
            if (state.students.isEmpty()) {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 32.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "Tidak ada siswa pada filter ini.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = SlateTextMuted
                        )
                    }
                }
            } else {
                items(state.students, key = { it.id }) { student ->
                    val studentAttendance = state.attendances.find {
                        it.studentName.equals(student.name, ignoreCase = true) || it.userId == student.id
                    }

                    StudentAttendanceCard(
                        student = student,
                        attendanceStatus = studentAttendance?.status,
                        syncStatus = studentAttendance?.syncStatus,
                        onCheckIn = { status ->
                            viewModel.recordAttendance(student, status)
                        }
                    )
                }
            }
        }
    }

    if (showCreateDialog) {
        CreateMeetingDialog(
            onDismiss = { showCreateDialog = false },
            onConfirm = { title, grade, start, end, desc ->
                viewModel.createMeeting(title, grade, start, end, desc)
            }
        )
    }

    if (showServerConfigDialog) {
        ServerConfigDialog(
            currentUrl = state.serverBaseUrl,
            onDismiss = { showServerConfigDialog = false },
            onSave = { newUrl ->
                viewModel.updateServerUrl(newUrl)
            }
        )
    }
}

// -------------------------------------------------------------
// SUB-COMPONENTS
// -------------------------------------------------------------

@Composable
fun ConnectionStatusBanner(
    isWifi: Boolean,
    isOnline: Boolean,
    unsyncedCount: Int,
    onSyncClick: () -> Unit
) {
    val bgBrush = if (isWifi) {
        Brush.horizontalGradient(listOf(Color(0xFF065F46), Color(0xFF047857)))
    } else {
        Brush.horizontalGradient(listOf(Color(0xFF78350F), Color(0xFF92400E)))
    }

    val icon = if (isWifi) Icons.Default.Wifi else Icons.Default.WifiOff
    val title = if (isWifi) "Wi-Fi Lab Aktif (BaaS Online)" else "Mode Full Offline"
    val subtitle = if (isWifi) {
        if (unsyncedCount > 0) "$unsyncedCount data lokal siap disinkronkan otomatis"
        else "Semua data presensi & token sinkron dengan server"
    } else {
        if (unsyncedCount > 0) "$unsyncedCount perubahan disimpan lokal di HP (Aman)"
        else "Data tersimpan di perangkat lokal. Otomatis sync saat ada Wi-Fi"
    }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(bgBrush)
            .padding(14.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.weight(1f)
            ) {
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(CircleShape)
                        .background(White.copy(alpha = 0.2f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = White,
                        modifier = Modifier.size(20.dp)
                    )
                }

                Column {
                    Text(
                        text = title,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = White
                    )
                    Text(
                        text = subtitle,
                        style = MaterialTheme.typography.bodySmall,
                        color = White.copy(alpha = 0.85f),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            if (unsyncedCount > 0 && isWifi) {
                Button(
                    onClick = onSyncClick,
                    colors = ButtonDefaults.buttonColors(containerColor = White),
                    shape = RoundedCornerShape(10.dp),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Text(
                        text = "Sync",
                        color = EmeraldSuccess,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp
                    )
                }
            }
        }
    }
}

@Composable
fun QuickMetricsRow(
    activeSessionTitle: String,
    attendeesCount: Int,
    totalStudents: Int,
    unsyncedCount: Int
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        MetricMiniCard(
            modifier = Modifier.weight(1f),
            label = "Hadir",
            value = "$attendeesCount",
            accentColor = EmeraldSuccess
        )
        MetricMiniCard(
            modifier = Modifier.weight(1f),
            label = "Total Siswa",
            value = "$totalStudents",
            accentColor = IndigoAccent
        )
        MetricMiniCard(
            modifier = Modifier.weight(1f),
            label = "Pending Sync",
            value = "$unsyncedCount",
            accentColor = if (unsyncedCount > 0) AmberWarning else SlateTextMuted
        )
    }
}

@Composable
fun MetricMiniCard(
    modifier: Modifier = Modifier,
    label: String,
    value: String,
    accentColor: Color
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = SlateCard),
        shape = RoundedCornerShape(14.dp),
        border = CardDefaults.outlinedCardBorder().copy(brush = Brush.linearGradient(listOf(SlateBorder, SlateBorder)))
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(2.dp)
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall,
                color = SlateTextMuted
            )
            Text(
                text = value,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = accentColor
            )
        }
    }
}

@Composable
fun ActiveSessionCard(
    meeting: id.sch.sdnpleburan03.admin.data.local.entity.MeetingEntity?,
    onToggleStatus: (Boolean) -> Unit,
    onGenerateToken: () -> Unit,
    onCopyToken: (String) -> Unit
) {
    if (meeting == null) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = SlateCard),
            shape = RoundedCornerShape(20.dp),
            border = CardDefaults.outlinedCardBorder().copy(brush = Brush.linearGradient(listOf(SlateBorder, SlateBorder)))
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "Belum Ada Sesi Aktif Hari Ini",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = White
                )
                Text(
                    text = "Klik tombol '+' di pojok kanan bawah untuk membuat sesi praktikum baru secara offline.",
                    style = MaterialTheme.typography.bodySmall,
                    color = SlateTextMuted,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(top = 4.dp)
                )
            }
        }
        return
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = SlateCard),
        shape = RoundedCornerShape(20.dp),
        border = CardDefaults.outlinedCardBorder().copy(brush = Brush.linearGradient(listOf(SlateBorder, PurplePrimary.copy(alpha = 0.4f))))
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // Header: Judul & Toggle Buka/Tutup
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .background(if (meeting.isOpen) EmeraldSuccess else RoseDanger)
                        )
                        Text(
                            text = if (meeting.isOpen) "SESI AKTIF DIBUKA" else "SESI DITUTUP",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = if (meeting.isOpen) EmeraldSuccess else RoseDanger
                        )
                    }

                    Text(
                        text = meeting.title,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = White,
                        modifier = Modifier.padding(top = 2.dp)
                    )

                    Text(
                        text = "${meeting.date} • ${meeting.startTime} - ${meeting.endTime} WIB",
                        style = MaterialTheme.typography.bodySmall,
                        color = SlateTextMuted
                    )
                }

                Switch(
                    checked = meeting.isOpen,
                    onCheckedChange = onToggleStatus,
                    colors = SwitchDefaults.colors(
                        checkedThumbColor = White,
                        checkedTrackColor = EmeraldSuccess,
                        uncheckedThumbColor = SlateTextMuted,
                        uncheckedTrackColor = SlateCardElevated
                    )
                )
            }

            // Token Generator Box (Anti-Titip Absen)
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(14.dp))
                    .background(SlateDark)
                    .border(1.dp, SlateBorder, RoundedCornerShape(14.dp))
                    .padding(14.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Key,
                                contentDescription = null,
                                tint = AmberWarning,
                                modifier = Modifier.size(16.dp)
                            )
                            Text(
                                text = "KODE TOKEN LAB (4-DIGIT)",
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                                color = AmberWarning
                            )
                        }

                        val token = meeting.sessionToken ?: "----"
                        Text(
                            text = token,
                            fontSize = 28.sp,
                            fontWeight = FontWeight.ExtraBold,
                            letterSpacing = 6.sp,
                            color = White,
                            modifier = Modifier
                                .padding(top = 4.dp)
                                .clickable { onCopyToken(token) }
                        )
                    }

                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Button(
                            onClick = onGenerateToken,
                            colors = ButtonDefaults.buttonColors(containerColor = SlateCardElevated),
                            shape = RoundedCornerShape(10.dp),
                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Autorenew,
                                contentDescription = null,
                                tint = White,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = "Acak Baru",
                                fontSize = 12.sp,
                                color = White
                            )
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FilterSection(
    selectedGrade: Int?,
    selectedClass: String?,
    availableClasses: List<String>,
    onGradeSelected: (Int?) -> Unit,
    onClassSelected: (String?) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        // Grade Chips
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            val grades = listOf(null to "Semua Jenjang", 4 to "Kelas 4", 5 to "Kelas 5", 6 to "Kelas 6")
            grades.forEach { (grade, label) ->
                FilterChip(
                    selected = selectedGrade == grade,
                    onClick = { onGradeSelected(grade) },
                    label = { Text(label) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = PurplePrimary,
                        selectedLabelColor = White,
                        containerColor = SlateCard,
                        labelColor = SlateTextMuted
                    ),
                    border = FilterChipDefaults.filterChipBorder(
                        enabled = true,
                        selected = selectedGrade == grade,
                        borderColor = if (selectedGrade == grade) PurplePrimary else SlateBorder
                    )
                )
            }
        }

        // Rombel Chips (if grade selected and classes exist)
        if (availableClasses.isNotEmpty()) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                FilterChip(
                    selected = selectedClass == null,
                    onClick = { onClassSelected(null) },
                    label = { Text("Semua Rombel") },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = IndigoAccent,
                        selectedLabelColor = White,
                        containerColor = SlateDark,
                        labelColor = SlateTextMuted
                    )
                )

                availableClasses.forEach { cls ->
                    FilterChip(
                        selected = selectedClass == cls,
                        onClick = { onClassSelected(cls) },
                        label = { Text("Rombel $cls") },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = IndigoAccent,
                            selectedLabelColor = White,
                            containerColor = SlateDark,
                            labelColor = SlateTextMuted
                        )
                    )
                }
            }
        }
    }
}

@Composable
fun StudentAttendanceCard(
    student: StudentEntity,
    attendanceStatus: String?,
    syncStatus: SyncStatus?,
    onCheckIn: (status: String) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = SlateCard),
        shape = RoundedCornerShape(16.dp),
        border = CardDefaults.outlinedCardBorder().copy(brush = Brush.linearGradient(listOf(SlateBorder, SlateBorder)))
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    // Avatar Inisial
                    Box(
                        modifier = Modifier
                            .size(38.dp)
                            .clip(CircleShape)
                            .background(
                                Brush.linearGradient(
                                    listOf(PurplePrimary.copy(alpha = 0.7f), IndigoAccent.copy(alpha = 0.7f))
                                )
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = student.name.take(2).uppercase(),
                            fontWeight = FontWeight.Bold,
                            color = White,
                            fontSize = 13.sp
                        )
                    }

                    Column {
                        Text(
                            text = student.name,
                            style = MaterialTheme.typography.bodyLarge,
                            fontWeight = FontWeight.SemiBold,
                            color = White
                        )
                        Text(
                            text = "Rombel ${student.className} • NISN: ${student.username}",
                            style = MaterialTheme.typography.bodySmall,
                            color = SlateTextMuted
                        )
                    }
                }

                // Status Badge & Sync Icon
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    val statusText = attendanceStatus ?: "belum"
                    val (badgeBg, badgeColor) = when (statusText.lowercase()) {
                        "hadir" -> EmeraldLight to EmeraldSuccess
                        "izin" -> Color(0xFFDBEAFE) to Color(0xFF2563EB)
                        "sakit" -> AmberLight to AmberWarning
                        "alpa" -> RoseLight to RoseDanger
                        else -> SlateCardElevated to SlateTextMuted
                    }

                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(badgeBg)
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Text(
                            text = statusText.uppercase(),
                            fontSize = 10.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = badgeColor
                        )
                    }

                    if (attendanceStatus != null) {
                        val isSynced = syncStatus == SyncStatus.SYNCED
                        Icon(
                            imageVector = if (isSynced) Icons.Default.CloudDone else Icons.Default.CloudUpload,
                            contentDescription = if (isSynced) "Tersinkron" else "Pending Sync",
                            tint = if (isSynced) EmeraldSuccess else AmberWarning,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
            }

            // Quick 1-Tap Offline Action Buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                QuickActionButton(
                    modifier = Modifier.weight(1f),
                    label = "Hadir",
                    isSelected = attendanceStatus == "hadir",
                    color = EmeraldSuccess,
                    onClick = { onCheckIn("hadir") }
                )
                QuickActionButton(
                    modifier = Modifier.weight(1f),
                    label = "Izin",
                    isSelected = attendanceStatus == "izin",
                    color = IndigoAccent,
                    onClick = { onCheckIn("izin") }
                )
                QuickActionButton(
                    modifier = Modifier.weight(1f),
                    label = "Sakit",
                    isSelected = attendanceStatus == "sakit",
                    color = AmberWarning,
                    onClick = { onCheckIn("sakit") }
                )
            }
        }
    }
}

@Composable
fun QuickActionButton(
    modifier: Modifier = Modifier,
    label: String,
    isSelected: Boolean,
    color: Color,
    onClick: () -> Unit
) {
    Button(
        onClick = onClick,
        modifier = modifier.height(34.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = if (isSelected) color else SlateCardElevated
        ),
        shape = RoundedCornerShape(8.dp),
        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)
    ) {
        Text(
            text = label,
            fontSize = 12.sp,
            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
            color = if (isSelected) White else SlateTextMuted
        )
    }
}
