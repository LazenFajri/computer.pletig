package id.sch.sdnpleburan03.admin.ui.screens.tabs

import android.content.Intent
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Assessment
import androidx.compose.material.icons.filled.FileDownload
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
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

data class StudentRekapItem(
    val studentName: String,
    val username: String,
    val className: String,
    val gradeLevel: Int,
    val hadir: Int,
    val izin: Int,
    val sakit: Int,
    val alpa: Int,
    val totalMeetings: Int,
    val percentage: Float
)

@Composable
fun RekapTabContent(
    state: AdminDashboardState,
    viewModel: AdminDashboardViewModel
) {
    val context = LocalContext.current

    // Hitung rekap per siswa berdasarkan `allAttendances`
    val rekapList = remember(state.allStudents, state.allAttendances, state.selectedClass, state.selectedGrade) {
        val totalMeetingsCount = maxOf(state.allMeetings.size, 1)

        val attendancesByStudent = state.allAttendances.groupBy { it.studentName.lowercase().trim() }

        state.allStudents
            .filter { st ->
                (state.selectedGrade == null || st.gradeLevel == state.selectedGrade) &&
                (state.selectedClass == null || st.className.equals(state.selectedClass, ignoreCase = true))
            }
            .map { st ->
                val records = attendancesByStudent[st.name.lowercase().trim()] ?: emptyList()
                val h = records.count { it.status.equals("hadir", ignoreCase = true) }
                val i = records.count { it.status.equals("izin", ignoreCase = true) }
                val s = records.count { it.status.equals("sakit", ignoreCase = true) }
                val a = records.count { it.status.equals("alpa", ignoreCase = true) }
                val pct = if (totalMeetingsCount > 0) (h.toFloat() / totalMeetingsCount.toFloat()) * 100f else 0f

                StudentRekapItem(
                    studentName = st.name,
                    username = st.username,
                    className = st.className,
                    gradeLevel = st.gradeLevel,
                    hadir = h,
                    izin = i,
                    sakit = s,
                    alpa = a,
                    totalMeetings = totalMeetingsCount,
                    percentage = pct.coerceIn(0f, 100f)
                )
            }
    }

    // Statistik agregat
    val totalHadir = rekapList.sumOf { it.hadir }
    val totalIzin = rekapList.sumOf { it.izin }
    val totalSakit = rekapList.sumOf { it.sakit }
    val totalAlpa = rekapList.sumOf { it.alpa }
    val avgPercentage = if (rekapList.isNotEmpty()) rekapList.map { it.percentage }.average().toFloat() else 0f

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // 1. Ringkasan Tingkat Kehadiran
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = SlateCardElevated),
                shape = RoundedCornerShape(18.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, SlateBorder)
            ) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "RINGKASAN KEHADIRAN",
                                style = MaterialTheme.typography.labelSmall,
                                color = SlateTextMuted,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(Modifier.height(4.dp))
                            Text(
                                text = "Rata-rata %.1f%%".format(avgPercentage),
                                style = MaterialTheme.typography.headlineMedium,
                                fontWeight = FontWeight.ExtraBold,
                                color = EmeraldSuccess
                            )
                        }

                        Button(
                            onClick = {
                                val textBuilder = StringBuilder()
                                textBuilder.appendLine("REKAP PRESENSI EKSTRAKOMPUTER SDN PLEBURAN 03")
                                textBuilder.appendLine("Tanggal: ${java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.getDefault()).format(java.util.Date())}")
                                textBuilder.appendLine("----------------------------------------")
                                textBuilder.appendLine("No,Nama,Kelas,Hadir,Izin,Sakit,Alpa,Persentase")
                                rekapList.forEachIndexed { idx, item ->
                                    textBuilder.appendLine("${idx + 1},\"${item.studentName}\",${item.className},${item.hadir},${item.izin},${item.sakit},${item.alpa},%.0f%%".format(item.percentage))
                                }
                                val shareIntent = Intent(Intent.ACTION_SEND).apply {
                                    type = "text/plain"
                                    putExtra(Intent.EXTRA_SUBJECT, "Rekap Presensi Siswa SDN Pleburan 03")
                                    putExtra(Intent.EXTRA_TEXT, textBuilder.toString())
                                }
                                context.startActivity(Intent.createChooser(shareIntent, "Bagikan Rekap Presensi"))
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = PurplePrimary),
                            shape = RoundedCornerShape(10.dp),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                        ) {
                            Icon(Icons.Default.Share, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Bagikan", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }

                    Spacer(Modifier.height(14.dp))

                    // 4 Counter Agregat
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        RekapStatBadge("Hadir", totalHadir, EmeraldSuccess, Modifier.weight(1f))
                        RekapStatBadge("Izin", totalIzin, AmberWarning, Modifier.weight(1f))
                        RekapStatBadge("Sakit", totalSakit, IndigoAccent, Modifier.weight(1f))
                        RekapStatBadge("Alpa", totalAlpa, RoseDanger, Modifier.weight(1f))
                    }
                }
            }
        }

        // 2. Filter Rombel
        item {
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
                            selectedContainerColor = PurplePrimary,
                            selectedLabelColor = White
                        )
                    )
                }
            }
        }

        // 3. Header List
        item {
            Text(
                text = "Rekap Kehadiran Siswa (${rekapList.size} Siswa)",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
        }

        // 4. List Siswa dengan Progress Bar % Kehadiran
        items(rekapList, key = { it.username }) { item ->
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = SlateCard),
                shape = RoundedCornerShape(12.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, SlateBorder)
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = item.studentName,
                                fontWeight = FontWeight.Bold,
                                style = MaterialTheme.typography.bodyMedium,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Spacer(Modifier.height(2.dp))
                            Text(
                                text = "${item.className} • ${item.username}",
                                fontSize = 11.sp,
                                color = SlateTextMuted
                            )
                        }

                        Text(
                            text = "%.0f%%".format(item.percentage),
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 15.sp,
                            color = when {
                                item.percentage >= 80f -> EmeraldSuccess
                                item.percentage >= 60f -> AmberWarning
                                else -> RoseDanger
                            }
                        )
                    }

                    Spacer(Modifier.height(8.dp))

                    // Progress Bar Kehadiran
                    LinearProgressIndicator(
                        progress = { item.percentage / 100f },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(6.dp)
                            .clip(RoundedCornerShape(3.dp)),
                        color = when {
                            item.percentage >= 80f -> EmeraldSuccess
                            item.percentage >= 60f -> AmberWarning
                            else -> RoseDanger
                        },
                        trackColor = SlateDark
                    )

                    Spacer(Modifier.height(8.dp))

                    // Rincian H / I / S / A
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Text("H: ${item.hadir}", fontSize = 11.sp, color = EmeraldSuccess, fontWeight = FontWeight.Bold)
                        Text("I: ${item.izin}", fontSize = 11.sp, color = AmberWarning, fontWeight = FontWeight.Bold)
                        Text("S: ${item.sakit}", fontSize = 11.sp, color = IndigoAccent, fontWeight = FontWeight.Bold)
                        Text("A: ${item.alpa}", fontSize = 11.sp, color = RoseDanger, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
private fun RekapStatBadge(label: String, count: Int, color: Color, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(8.dp))
            .background(SlateCard)
            .border(1.dp, SlateBorder, RoundedCornerShape(8.dp))
            .padding(vertical = 8.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(text = count.toString(), fontWeight = FontWeight.ExtraBold, fontSize = 15.sp, color = color)
            Text(text = label, fontSize = 10.sp, color = SlateTextMuted, fontWeight = FontWeight.SemiBold)
        }
    }
}
