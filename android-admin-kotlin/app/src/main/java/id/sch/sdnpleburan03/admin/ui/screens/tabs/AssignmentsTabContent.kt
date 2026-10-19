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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.Assignment
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Grade
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import id.sch.sdnpleburan03.admin.data.local.entity.AssignmentEntity
import id.sch.sdnpleburan03.admin.data.local.entity.SubmissionEntity
import id.sch.sdnpleburan03.admin.ui.theme.AmberWarning
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
fun AssignmentsTabContent(
    state: AdminDashboardState,
    viewModel: AdminDashboardViewModel
) {
    val selectedAss = state.selectedAssignmentForFilter
    var assDropdownExpanded by remember { mutableStateOf(false) }

    val filteredSubmissions = remember(state.submissions, selectedAss) {
        if (selectedAss == null) {
            state.submissions
        } else {
            state.submissions.filter { it.assignmentId == selectedAss.id }
        }
    }

    val totalSub = filteredSubmissions.size
    val gradedCount = filteredSubmissions.count { it.status == "graded" || it.score != null }
    val pendingCount = totalSub - gradedCount

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // 1. Selector Tugas / Modul Praktikum
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = SlateCardElevated),
                shape = RoundedCornerShape(16.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, SlateBorder)
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Text(
                        text = "PILIH TUGAS PRAKTIKUM",
                        style = MaterialTheme.typography.labelSmall,
                        color = SlateTextMuted,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(Modifier.height(6.dp))

                    Box {
                        OutlinedCard(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { assDropdownExpanded = true },
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
                                    Icon(Icons.Default.Assignment, contentDescription = null, tint = IndigoAccent, modifier = Modifier.size(18.dp))
                                    Spacer(Modifier.width(8.dp))
                                    Text(
                                        text = selectedAss?.title ?: "Semua Tugas Praktikum",
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
                            expanded = assDropdownExpanded,
                            onDismissRequest = { assDropdownExpanded = false },
                            modifier = Modifier.background(SlateCard)
                        ) {
                            DropdownMenuItem(
                                text = {
                                    Text("Semua Tugas Praktikum", color = if (selectedAss == null) PurplePrimary else White)
                                },
                                onClick = {
                                    viewModel.selectAssignmentForFilter(null)
                                    assDropdownExpanded = false
                                }
                            )
                            state.assignments.forEach { ass ->
                                DropdownMenuItem(
                                    text = {
                                        Text(
                                            text = ass.title,
                                            color = if (ass.id == selectedAss?.id) PurplePrimary else White,
                                            fontWeight = if (ass.id == selectedAss?.id) FontWeight.Bold else FontWeight.Normal
                                        )
                                    },
                                    onClick = {
                                        viewModel.selectAssignmentForFilter(ass)
                                        assDropdownExpanded = false
                                    }
                                )
                            }
                        }
                    }
                }
            }
        }

        // 2. Ringkasan Tugas Dinilai vs Belum
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Card(
                    modifier = Modifier.weight(1f),
                    colors = CardDefaults.cardColors(containerColor = SlateCard),
                    shape = RoundedCornerShape(12.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, SlateBorder)
                ) {
                    Column(modifier = Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(text = totalSub.toString(), fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = White)
                        Text(text = "Total Kumpul", fontSize = 10.sp, color = SlateTextMuted, fontWeight = FontWeight.SemiBold)
                    }
                }
                Card(
                    modifier = Modifier.weight(1f),
                    colors = CardDefaults.cardColors(containerColor = SlateCard),
                    shape = RoundedCornerShape(12.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, EmeraldSuccess.copy(alpha = 0.3f))
                ) {
                    Column(modifier = Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(text = gradedCount.toString(), fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = EmeraldSuccess)
                        Text(text = "Sudah Dinilai", fontSize = 10.sp, color = SlateTextMuted, fontWeight = FontWeight.SemiBold)
                    }
                }
                Card(
                    modifier = Modifier.weight(1f),
                    colors = CardDefaults.cardColors(containerColor = SlateCard),
                    shape = RoundedCornerShape(12.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, AmberWarning.copy(alpha = 0.3f))
                ) {
                    Column(modifier = Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(text = pendingCount.toString(), fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = AmberWarning)
                        Text(text = "Belum Dinilai", fontSize = 10.sp, color = SlateTextMuted, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }

        // 3. Header Daftar Pengumpulan
        item {
            Text(
                text = "Daftar Pengumpulan Tugas Siswa (${filteredSubmissions.size})",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
        }

        // 4. List Submissions
        if (filteredSubmissions.isEmpty()) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "Belum ada siswa yang mengumpulkan tugas ini.",
                        color = SlateTextMuted,
                        fontSize = 13.sp
                    )
                }
            }
        } else {
            items(filteredSubmissions, key = { it.id }) { sub ->
                val isGraded = sub.score != null

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = SlateCard),
                    shape = RoundedCornerShape(14.dp),
                    border = androidx.compose.foundation.BorderStroke(
                        1.dp,
                        if (isGraded) SlateBorder else AmberWarning.copy(alpha = 0.4f)
                    )
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(32.dp)
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(if (isGraded) EmeraldSuccess.copy(alpha = 0.15f) else AmberWarning.copy(alpha = 0.15f)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = if (isGraded) Icons.Default.Grade else Icons.Default.Edit,
                                        contentDescription = null,
                                        tint = if (isGraded) EmeraldSuccess else AmberWarning,
                                        modifier = Modifier.size(16.dp)
                                    )
                                }
                                Spacer(Modifier.width(10.dp))
                                Column {
                                    Text(
                                        text = sub.studentName,
                                        fontWeight = FontWeight.Bold,
                                        style = MaterialTheme.typography.bodyLarge
                                    )
                                    Text(
                                        text = "Kelas ${sub.gradeLevel}",
                                        fontSize = 11.sp,
                                        color = SlateTextMuted
                                    )
                                }
                            }

                            // Badge Nilai
                            if (isGraded) {
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(6.dp))
                                        .background(EmeraldSuccess.copy(alpha = 0.15f))
                                        .padding(horizontal = 8.dp, vertical = 4.dp)
                                ) {
                                    Text(
                                        text = "Nilai: ${sub.score}/100",
                                        color = EmeraldSuccess,
                                        fontWeight = FontWeight.ExtraBold,
                                        fontSize = 12.sp
                                    )
                                }
                            } else {
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(6.dp))
                                        .background(AmberWarning.copy(alpha = 0.15f))
                                        .padding(horizontal = 8.dp, vertical = 4.dp)
                                ) {
                                    Text(
                                        text = "Belum Dinilai",
                                        color = AmberWarning,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 11.sp
                                    )
                                }
                            }
                        }

                        // Isi submission
                        if (!sub.submissionText.isNullOrBlank()) {
                            Spacer(Modifier.height(8.dp))
                            Text(
                                text = sub.submissionText,
                                style = MaterialTheme.typography.bodySmall,
                                color = White.copy(alpha = 0.9f)
                            )
                        }

                        // Feedback guru jika sudah ada
                        if (!sub.feedback.isNullOrBlank()) {
                            Spacer(Modifier.height(6.dp))
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(SlateDark)
                                    .padding(8.dp)
                            ) {
                                Text(
                                    text = "Catatan Guru: \"${sub.feedback}\"",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = EmeraldSuccess,
                                    fontSize = 11.sp
                                )
                            }
                        }

                        Spacer(Modifier.height(10.dp))

                        // Tombol Beri Nilai / Ubah Nilai
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.End
                        ) {
                            Button(
                                onClick = { viewModel.openGradeDialog(sub) },
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (isGraded) SlateDark else PurplePrimary
                                ),
                                shape = RoundedCornerShape(8.dp),
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                            ) {
                                Icon(
                                    imageVector = if (isGraded) Icons.Default.Edit else Icons.Default.Grade,
                                    contentDescription = null,
                                    modifier = Modifier.size(14.dp),
                                    tint = if (isGraded) IndigoAccent else White
                                )
                                Spacer(Modifier.width(6.dp))
                                Text(
                                    text = if (isGraded) "Ubah Nilai" else "Beri Nilai",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isGraded) IndigoAccent else White
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
