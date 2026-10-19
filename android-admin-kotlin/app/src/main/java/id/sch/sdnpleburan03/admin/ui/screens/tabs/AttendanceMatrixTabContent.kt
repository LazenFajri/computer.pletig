package id.sch.sdnpleburan03.admin.ui.screens.tabs

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
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Event
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import id.sch.sdnpleburan03.admin.data.local.entity.StudentEntity
import id.sch.sdnpleburan03.admin.ui.theme.AmberWarning
import id.sch.sdnpleburan03.admin.ui.theme.EmeraldLight
import id.sch.sdnpleburan03.admin.ui.theme.EmeraldSuccess
import id.sch.sdnpleburan03.admin.ui.theme.IndigoAccent
import id.sch.sdnpleburan03.admin.ui.theme.PurplePrimary
import id.sch.sdnpleburan03.admin.ui.theme.RoseDanger
import id.sch.sdnpleburan03.admin.ui.theme.SlateBorder
import id.sch.sdnpleburan03.admin.ui.theme.SlateCard
import id.sch.sdnpleburan03.admin.ui.theme.SlateCardElevated
import id.sch.sdnpleburan03.admin.ui.theme.SlateDark
import id.sch.sdnpleburan03.admin.ui.theme.SlateTextMuted
import id.sch.sdnpleburan03.admin.ui.theme.White
import id.sch.sdnpleburan03.admin.ui.viewmodel.AdminDashboardState
import id.sch.sdnpleburan03.admin.ui.viewmodel.AdminDashboardViewModel

@Composable
fun AttendanceMatrixTabContent(
    state: AdminDashboardState,
    viewModel: AdminDashboardViewModel
) {
    val selectedMeeting = state.selectedMeetingForMatrix ?: state.primaryMeeting
    val attendancesMap = remember(state.attendances) {
        state.attendances.associateBy { it.studentName.lowercase().trim() }
    }

    var meetingDropdownExpanded by remember { mutableStateOf(false) }

    // Hitung counter hadir, izin, sakit, alpa untuk sesi ini
    val countHadir = state.attendances.count { it.status.equals("hadir", ignoreCase = true) }
    val countIzin = state.attendances.count { it.status.equals("izin", ignoreCase = true) }
    val countSakit = state.attendances.count { it.status.equals("sakit", ignoreCase = true) }
    val countAlpa = state.attendances.count { it.status.equals("alpa", ignoreCase = true) }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // 1. Selector Sesi Pertemuan (Dropdown Picker)
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = SlateCardElevated),
                shape = RoundedCornerShape(16.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, SlateBorder)
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Text(
                        text = "PILIH SESI PERTEMUAN",
                        style = MaterialTheme.typography.labelSmall,
                        color = SlateTextMuted,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(Modifier.height(6.dp))

                    Box {
                        OutlinedCard(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { meetingDropdownExpanded = true },
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 14.dp, vertical = 10.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Event, contentDescription = null, tint = PurplePrimary, modifier = Modifier.size(18.dp))
                                    Spacer(Modifier.width(8.dp))
                                    Text(
                                        text = selectedMeeting?.let { "P${it.meetingNumber} - ${it.title} (${it.date})" } ?: "Pilih Sesi Pertemuan",
                                        fontWeight = FontWeight.Bold,
                                        style = MaterialTheme.typography.bodyMedium,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                                Icon(Icons.Default.ArrowDropDown, contentDescription = null, tint = SlateTextMuted)
                            }
                        }

                        DropdownMenu(
                            expanded = meetingDropdownExpanded,
                            onDismissRequest = { meetingDropdownExpanded = false },
                            modifier = Modifier.background(SlateCard)
                        ) {
                            state.allMeetings.forEach { m ->
                                DropdownMenuItem(
                                    text = {
                                        Text(
                                            text = "P${m.meetingNumber} (${if (m.gradeLevel != null) "Kls ${m.gradeLevel}" else "Semua"}): ${m.title} - ${m.date}",
                                            fontWeight = if (m.id == selectedMeeting?.id) FontWeight.Bold else FontWeight.Normal,
                                            color = if (m.id == selectedMeeting?.id) PurplePrimary else White
                                        )
                                    },
                                    onClick = {
                                        viewModel.selectMeetingForMatrix(m)
                                        meetingDropdownExpanded = false
                                    }
                                )
                            }
                        }
                    }
                }
            }
        }

        // 2. Filter Jenjang & Rombel
        item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                // Baris Jenjang Kelas (Semua, 4, 5, 6)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    val grades = listOf(null to "Semua Kelas", 4 to "Kelas 4", 5 to "Kelas 5", 6 to "Kelas 6")
                    grades.forEach { (g, label) ->
                        FilterChip(
                            selected = state.selectedGrade == g,
                            onClick = { viewModel.filterByGrade(g) },
                            label = { Text(label, fontSize = 12.sp) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = PurplePrimary,
                                selectedLabelColor = White
                            )
                        )
                    }
                }

                // Baris Rombel (Semua Rombel, 4A, 4B, 5A, 5B, 6A, 6B)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    val rombelList = listOf(null, "4A", "4B", "5A", "5B", "6A", "6B")
                    rombelList.forEach { r ->
                        FilterChip(
                            selected = state.selectedClass == r,
                            onClick = { viewModel.filterByClass(r) },
                            label = { Text(r ?: "Semua Rombel", fontSize = 11.sp) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = IndigoAccent,
                                selectedLabelColor = White
                            )
                        )
                    }
                }
            }
        }

        // 3. Ringkasan Counter Kehadiran Cepat
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                StatusCounterChip("Hadir", countHadir, EmeraldSuccess, Modifier.weight(1f))
                StatusCounterChip("Izin", countIzin, AmberWarning, Modifier.weight(1f))
                StatusCounterChip("Sakit", countSakit, IndigoAccent, Modifier.weight(1f))
                StatusCounterChip("Alpa", countAlpa, RoseDanger, Modifier.weight(1f))
            }
        }

        // 4. Header Matriks
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Daftar Siswa (${state.students.size})",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "1-Tap Quick Check-In",
                    style = MaterialTheme.typography.labelSmall,
                    color = SlateTextMuted
                )
            }
        }

        // 5. List Siswa dengan 1-Tap Quick Action Button [H] [I] [S] [A]
        items(state.students, key = { it.id }) { student ->
            val attendanceRecord = attendancesMap[student.name.lowercase().trim()]
            val currentStatus = attendanceRecord?.status?.lowercase() ?: "belum"

            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = SlateCard),
                shape = RoundedCornerShape(12.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, SlateBorder)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 10.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Info Siswa
                    Column(modifier = Modifier.weight(1f)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = student.name,
                                fontWeight = FontWeight.Bold,
                                style = MaterialTheme.typography.bodyMedium,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        Spacer(Modifier.height(2.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = "${student.className} • ${student.username}",
                                fontSize = 11.sp,
                                color = SlateTextMuted
                            )
                            Spacer(Modifier.width(6.dp))
                            StatusBadge(currentStatus)
                        }
                    }

                    Spacer(Modifier.width(8.dp))

                    // 4 Tombol Cepat: [H] [I] [S] [A]
                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        QuickCheckInButton(
                            label = "H",
                            isSelected = currentStatus == "hadir",
                            activeColor = EmeraldSuccess,
                            onClick = { viewModel.quickCheckIn(student, "hadir") }
                        )
                        QuickCheckInButton(
                            label = "I",
                            isSelected = currentStatus == "izin",
                            activeColor = AmberWarning,
                            onClick = { viewModel.quickCheckIn(student, "izin") }
                        )
                        QuickCheckInButton(
                            label = "S",
                            isSelected = currentStatus == "sakit",
                            activeColor = IndigoAccent,
                            onClick = { viewModel.quickCheckIn(student, "sakit") }
                        )
                        QuickCheckInButton(
                            label = "A",
                            isSelected = currentStatus == "alpa",
                            activeColor = RoseDanger,
                            onClick = { viewModel.quickCheckIn(student, "alpa") }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun StatusCounterChip(label: String, count: Int, color: Color, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = SlateCard),
        shape = RoundedCornerShape(10.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, color.copy(alpha = 0.3f))
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 6.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(text = count.toString(), fontWeight = FontWeight.ExtraBold, fontSize = 16.sp, color = color)
            Text(text = label, fontSize = 10.sp, color = SlateTextMuted, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun StatusBadge(status: String) {
    val (bgColor, textColor, label) = when (status) {
        "hadir" -> Triple(EmeraldSuccess.copy(alpha = 0.2f), EmeraldSuccess, "HADIR")
        "izin" -> Triple(AmberWarning.copy(alpha = 0.2f), AmberWarning, "IZIN")
        "sakit" -> Triple(IndigoAccent.copy(alpha = 0.2f), IndigoAccent, "SAKIT")
        "alpa" -> Triple(RoseDanger.copy(alpha = 0.2f), RoseDanger, "ALPA")
        else -> Triple(SlateDark, SlateTextMuted, "BELUM")
    }

    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(4.dp))
            .background(bgColor)
            .padding(horizontal = 5.dp, vertical = 1.dp)
    ) {
        Text(text = label, color = textColor, fontSize = 9.sp, fontWeight = FontWeight.ExtraBold)
    }
}

@Composable
private fun QuickCheckInButton(
    label: String,
    isSelected: Boolean,
    activeColor: Color,
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .size(34.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(if (isSelected) activeColor else SlateCardElevated)
            .border(
                1.dp,
                if (isSelected) activeColor else SlateBorder,
                RoundedCornerShape(8.dp)
            )
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = label,
            fontWeight = FontWeight.ExtraBold,
            fontSize = 13.sp,
            color = if (isSelected) White else SlateTextMuted
        )
    }
}
