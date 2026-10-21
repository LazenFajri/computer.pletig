package id.sch.sdnpleburan03.admin.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Assessment
import androidx.compose.material.icons.filled.Assignment
import androidx.compose.material.icons.filled.CloudDone
import androidx.compose.material.icons.filled.CloudUpload
import androidx.compose.material.icons.filled.Event
import androidx.compose.material.icons.filled.FactCheck
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Wifi
import androidx.compose.material.icons.filled.WifiOff
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import id.sch.sdnpleburan03.admin.ui.screens.tabs.AssignmentsTabContent
import id.sch.sdnpleburan03.admin.ui.screens.tabs.AttendanceMatrixTabContent
import id.sch.sdnpleburan03.admin.ui.screens.tabs.MeetingsTabContent
import id.sch.sdnpleburan03.admin.ui.screens.tabs.RekapTabContent
import id.sch.sdnpleburan03.admin.ui.screens.tabs.StudentsTabContent
import id.sch.sdnpleburan03.admin.ui.theme.AmberWarning
import id.sch.sdnpleburan03.admin.ui.theme.EmeraldLight
import id.sch.sdnpleburan03.admin.ui.theme.EmeraldSuccess
import id.sch.sdnpleburan03.admin.ui.theme.IndigoAccent
import id.sch.sdnpleburan03.admin.ui.theme.PurplePrimary
import id.sch.sdnpleburan03.admin.ui.theme.RoseDanger
import id.sch.sdnpleburan03.admin.ui.theme.SlateBorder
import id.sch.sdnpleburan03.admin.ui.theme.SlateCard
import id.sch.sdnpleburan03.admin.ui.theme.SlateDark
import id.sch.sdnpleburan03.admin.ui.theme.SlateTextMuted
import id.sch.sdnpleburan03.admin.ui.theme.White
import id.sch.sdnpleburan03.admin.ui.viewmodel.AdminDashboardState
import id.sch.sdnpleburan03.admin.ui.viewmodel.AdminDashboardViewModel
import id.sch.sdnpleburan03.admin.ui.viewmodel.AdminTab

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminDashboardScreen(
    viewModel: AdminDashboardViewModel
) {
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

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = "Admin Pletig",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = White
                            )
                            Spacer(Modifier.width(8.dp))
                            // Status Realtime Turso Cloud DB badge
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(
                                        if (state.isRealtimeConnected) EmeraldSuccess.copy(alpha = 0.2f)
                                        else if (state.networkState.isOnline) IndigoAccent.copy(alpha = 0.2f)
                                        else SlateBorder
                                    )
                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        imageVector = if (state.isRealtimeConnected) Icons.Default.CloudDone else if (state.networkState.isOnline) Icons.Default.Wifi else Icons.Default.WifiOff,
                                        contentDescription = null,
                                        modifier = Modifier.size(10.dp),
                                        tint = if (state.isRealtimeConnected) EmeraldSuccess else if (state.networkState.isOnline) IndigoAccent else SlateTextMuted
                                    )
                                    Spacer(Modifier.width(4.dp))
                                    Text(
                                        text = if (state.isRealtimeConnected) {
                                            if (state.tursoLatencyMs != null) "TURSO REALTIME (${state.tursoLatencyMs}ms)" else "TURSO REALTIME"
                                        } else if (state.networkState.isOnline) {
                                            "TURSO SYNCING..."
                                        } else {
                                            "CACHE OFFLINE"
                                        },
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.ExtraBold,
                                        color = if (state.isRealtimeConnected) EmeraldSuccess else if (state.networkState.isOnline) IndigoAccent else SlateTextMuted
                                    )
                                }
                            }
                        }
                        Text(
                            text = "SDN Pleburan 03 Semarang",
                            style = MaterialTheme.typography.bodySmall,
                            color = SlateTextMuted
                        )
                    }
                },
                actions = {
                    // Badge data antrean offline yang belum tersinkron
                    if (state.unsyncedCount > 0) {
                        BadgedBox(
                            badge = {
                                Badge(containerColor = AmberWarning) {
                                    Text(text = state.unsyncedCount.toString(), color = SlateDark)
                                }
                            }
                        ) {
                            IconButton(onClick = { viewModel.syncNow() }) {
                                Icon(
                                    imageVector = Icons.Default.CloudUpload,
                                    contentDescription = "Data lokal belum sinkron",
                                    tint = AmberWarning
                                )
                            }
                        }
                    }

                    // Tombol Konfigurasi Server
                    IconButton(onClick = { showServerConfigDialog = true }) {
                        Icon(
                            imageVector = Icons.Default.Settings,
                            contentDescription = "Pengaturan URL Server",
                            tint = SlateTextMuted
                        )
                    }

                    // Tombol Refresh / Sync
                    val infiniteTransition = rememberInfiniteTransition(label = "sync")
                    val angle by infiniteTransition.animateFloat(
                        initialValue = 0f,
                        targetValue = 360f,
                        animationSpec = infiniteRepeatable(animation = tween(1000, easing = LinearEasing)),
                        label = "spin"
                    )

                    IconButton(
                        onClick = { viewModel.syncNow() },
                        enabled = !state.isSyncing
                    ) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = "Sinkronisasi Realtime",
                            tint = if (state.isSyncing) PurplePrimary else White,
                            modifier = if (state.isSyncing) Modifier.rotate(angle) else Modifier
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = SlateDark
                )
            )
        },
        bottomBar = {
            NavigationBar(
                containerColor = SlateDark,
                contentColor = White,
                tonalElevation = 8.dp
            ) {
                // 1. Tab Sesi
                NavigationBarItem(
                    selected = state.currentTab == AdminTab.MEETINGS,
                    onClick = { viewModel.setTab(AdminTab.MEETINGS) },
                    icon = { Icon(Icons.Default.Event, contentDescription = "Sesi") },
                    label = { Text("Sesi", fontSize = 11.sp, fontWeight = FontWeight.SemiBold) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = White,
                        selectedTextColor = PurplePrimary,
                        indicatorColor = PurplePrimary,
                        unselectedIconColor = SlateTextMuted,
                        unselectedTextColor = SlateTextMuted
                    )
                )

                // 2. Tab Presensi Matriks
                NavigationBarItem(
                    selected = state.currentTab == AdminTab.MATRIX,
                    onClick = { viewModel.setTab(AdminTab.MATRIX) },
                    icon = { Icon(Icons.Default.FactCheck, contentDescription = "Presensi") },
                    label = { Text("Presensi", fontSize = 11.sp, fontWeight = FontWeight.SemiBold) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = White,
                        selectedTextColor = PurplePrimary,
                        indicatorColor = PurplePrimary,
                        unselectedIconColor = SlateTextMuted,
                        unselectedTextColor = SlateTextMuted
                    )
                )

                // 3. Tab Rekapitulasi
                NavigationBarItem(
                    selected = state.currentTab == AdminTab.REKAP,
                    onClick = { viewModel.setTab(AdminTab.REKAP) },
                    icon = { Icon(Icons.Default.Assessment, contentDescription = "Rekap") },
                    label = { Text("Rekap", fontSize = 11.sp, fontWeight = FontWeight.SemiBold) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = White,
                        selectedTextColor = PurplePrimary,
                        indicatorColor = PurplePrimary,
                        unselectedIconColor = SlateTextMuted,
                        unselectedTextColor = SlateTextMuted
                    )
                )

                // 4. Tab Tugas
                NavigationBarItem(
                    selected = state.currentTab == AdminTab.ASSIGNMENTS,
                    onClick = { viewModel.setTab(AdminTab.ASSIGNMENTS) },
                    icon = { Icon(Icons.Default.Assignment, contentDescription = "Tugas") },
                    label = { Text("Tugas", fontSize = 11.sp, fontWeight = FontWeight.SemiBold) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = White,
                        selectedTextColor = PurplePrimary,
                        indicatorColor = PurplePrimary,
                        unselectedIconColor = SlateTextMuted,
                        unselectedTextColor = SlateTextMuted
                    )
                )

                // 5. Tab Siswa
                NavigationBarItem(
                    selected = state.currentTab == AdminTab.STUDENTS,
                    onClick = { viewModel.setTab(AdminTab.STUDENTS) },
                    icon = { Icon(Icons.Default.People, contentDescription = "Siswa") },
                    label = { Text("Siswa", fontSize = 11.sp, fontWeight = FontWeight.SemiBold) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = White,
                        selectedTextColor = PurplePrimary,
                        indicatorColor = PurplePrimary,
                        unselectedIconColor = SlateTextMuted,
                        unselectedTextColor = SlateTextMuted
                    )
                )
            }
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
        containerColor = SlateDark
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            when (state.currentTab) {
                AdminTab.MEETINGS -> {
                    MeetingsTabContent(
                        state = state,
                        viewModel = viewModel,
                        onCreateMeetingClick = { showCreateDialog = true }
                    )
                }
                AdminTab.MATRIX -> {
                    AttendanceMatrixTabContent(
                        state = state,
                        viewModel = viewModel
                    )
                }
                AdminTab.REKAP -> {
                    RekapTabContent(
                        state = state,
                        viewModel = viewModel
                    )
                }
                AdminTab.ASSIGNMENTS -> {
                    AssignmentsTabContent(
                        state = state,
                        viewModel = viewModel
                    )
                }
                AdminTab.STUDENTS -> {
                    StudentsTabContent(
                        state = state,
                        viewModel = viewModel
                    )
                }
            }
        }
    }

    // Dialog Tambah Sesi Pertemuan
    if (showCreateDialog) {
        CreateMeetingDialog(
            onDismiss = { showCreateDialog = false },
            onConfirm = { title, grade, start, end, desc ->
                viewModel.createMeeting(title, grade, start, end, desc)
                showCreateDialog = false
            }
        )
    }

    // Dialog Pengaturan URL Server & Database
    if (showServerConfigDialog) {
        ServerConfigDialog(
            currentUrl = state.serverBaseUrl,
            isRealtimeConnected = state.isRealtimeConnected,
            tursoLatencyMs = state.tursoLatencyMs,
            onDismiss = { showServerConfigDialog = false },
            onSave = { newUrl ->
                viewModel.updateServerUrl(newUrl)
                showServerConfigDialog = false
            }
        )
    }

    // Dialog Penilaian Tugas
    val gradingSubmission = state.selectedSubmissionForGrading
    if (gradingSubmission != null) {
        val targetAssignment = state.assignments.find { it.id == gradingSubmission.assignmentId }
        GradeSubmissionDialog(
            submission = gradingSubmission,
            assignment = targetAssignment,
            onDismiss = { viewModel.closeGradeDialog() },
            onSaveGrade = { score, feedback ->
                viewModel.submitGrade(gradingSubmission.id, score, feedback)
            }
        )
    }
}
