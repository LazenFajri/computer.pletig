package id.sch.sdnpleburan03.admin.ui.screens.tabs

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import id.sch.sdnpleburan03.admin.ui.theme.EmeraldSuccess
import id.sch.sdnpleburan03.admin.ui.theme.IndigoAccent
import id.sch.sdnpleburan03.admin.ui.theme.PurplePrimary
import id.sch.sdnpleburan03.admin.ui.theme.SlateBorder
import id.sch.sdnpleburan03.admin.ui.theme.SlateCard
import id.sch.sdnpleburan03.admin.ui.theme.SlateDark
import id.sch.sdnpleburan03.admin.ui.theme.SlateTextMuted
import id.sch.sdnpleburan03.admin.ui.theme.White
import id.sch.sdnpleburan03.admin.ui.viewmodel.AdminDashboardState
import id.sch.sdnpleburan03.admin.ui.viewmodel.AdminDashboardViewModel

@Composable
fun StudentsTabContent(
    state: AdminDashboardState,
    viewModel: AdminDashboardViewModel
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // 1. Live Search Bar
        item {
            OutlinedTextField(
                value = state.studentSearchQuery,
                onValueChange = { viewModel.onSearchStudent(it) },
                placeholder = { Text("Cari nama siswa atau NISN...", fontSize = 13.sp) },
                leadingIcon = {
                    Icon(Icons.Default.Search, contentDescription = null, tint = SlateTextMuted)
                },
                trailingIcon = {
                    if (state.studentSearchQuery.isNotEmpty()) {
                        IconButton(onClick = { viewModel.onSearchStudent("") }) {
                            Icon(Icons.Default.Close, contentDescription = "Hapus pencarian", tint = SlateTextMuted)
                        }
                    }
                },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = PurplePrimary,
                    unfocusedBorderColor = SlateBorder,
                    focusedContainerColor = SlateCard,
                    unfocusedContainerColor = SlateCard
                )
            )
        }

        // 2. Filter Jenjang & Rombel
        item {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                // Filter Jenjang
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    val grades = listOf(null to "Semua", 4 to "Kelas 4", 5 to "Kelas 5", 6 to "Kelas 6")
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

                // Filter Rombel
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    val rombels = listOf(null, "4A", "4B", "5A", "5B", "6A", "6B")
                    rombels.forEach { r ->
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

        // 3. Counter Info
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Direktori Siswa (${state.students.size} dari ${state.allStudents.size})",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "SDN Pleburan 03",
                    style = MaterialTheme.typography.labelSmall,
                    color = SlateTextMuted
                )
            }
        }

        // 4. List Siswa
        if (state.students.isEmpty()) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "Tidak ada siswa yang sesuai pencarian.",
                        color = SlateTextMuted,
                        fontSize = 13.sp
                    )
                }
            }
        } else {
            items(state.students, key = { it.id }) { student ->
                val initial = student.name.firstOrNull()?.uppercase() ?: "S"
                val avatarColor = remember(student.id) {
                    val colors = listOf(
                        PurplePrimary,
                        IndigoAccent,
                        EmeraldSuccess,
                        Color(0xFF0284C7),
                        Color(0xFFD97706),
                        Color(0xFFE11D48)
                    )
                    colors[Math.abs(student.name.hashCode()) % colors.size]
                }

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = SlateCard),
                    shape = RoundedCornerShape(12.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, SlateBorder)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Avatar Bulat
                        Box(
                            modifier = Modifier
                                .size(40.dp)
                                .clip(CircleShape)
                                .background(avatarColor.copy(alpha = 0.2f))
                                .border(1.5.dp, avatarColor, CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = initial,
                                fontWeight = FontWeight.ExtraBold,
                                color = avatarColor,
                                fontSize = 16.sp
                            )
                        }

                        Spacer(Modifier.width(12.dp))

                        // Nama & NISN
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = student.name,
                                fontWeight = FontWeight.Bold,
                                style = MaterialTheme.typography.bodyLarge,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Spacer(Modifier.height(2.dp))
                            Text(
                                text = "NISN: ${student.username}",
                                fontSize = 11.sp,
                                color = SlateTextMuted
                            )
                        }

                        // Badge Rombel
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(IndigoAccent.copy(alpha = 0.15f))
                                .padding(horizontal = 10.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = "Kelas ${student.className}",
                                color = IndigoAccent,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }
    }
}
