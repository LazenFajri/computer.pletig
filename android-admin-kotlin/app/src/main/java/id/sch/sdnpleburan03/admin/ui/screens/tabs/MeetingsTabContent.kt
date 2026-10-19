package id.sch.sdnpleburan03.admin.ui.screens.tabs

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Autorenew
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Key
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import id.sch.sdnpleburan03.admin.data.local.entity.MeetingEntity
import id.sch.sdnpleburan03.admin.ui.theme.AmberWarning
import id.sch.sdnpleburan03.admin.ui.theme.EmeraldLight
import id.sch.sdnpleburan03.admin.ui.theme.EmeraldSuccess
import id.sch.sdnpleburan03.admin.ui.theme.IndigoAccent
import id.sch.sdnpleburan03.admin.ui.theme.PurplePrimary
import id.sch.sdnpleburan03.admin.ui.theme.RoseDanger
import id.sch.sdnpleburan03.admin.ui.theme.RoseLight
import id.sch.sdnpleburan03.admin.ui.theme.SlateBorder
import id.sch.sdnpleburan03.admin.ui.theme.SlateCard
import id.sch.sdnpleburan03.admin.ui.theme.SlateCardElevated
import id.sch.sdnpleburan03.admin.ui.theme.SlateDark
import id.sch.sdnpleburan03.admin.ui.theme.SlateTextMuted
import id.sch.sdnpleburan03.admin.ui.theme.White
import id.sch.sdnpleburan03.admin.ui.viewmodel.AdminDashboardState
import id.sch.sdnpleburan03.admin.ui.viewmodel.AdminDashboardViewModel

@Composable
fun MeetingsTabContent(
    state: AdminDashboardState,
    viewModel: AdminDashboardViewModel,
    onCreateMeetingClick: () -> Unit
) {
    val context = LocalContext.current
    val clipboardManager = LocalClipboardManager.current
    val primary = state.primaryMeeting

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // 1. Hero Card: Sesi Utama Aktif
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = SlateCardElevated),
                shape = RoundedCornerShape(20.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, SlateBorder)
            ) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(10.dp)
                                    .clip(CircleShape)
                                    .background(if (primary?.isOpen == true) EmeraldSuccess else RoseDanger)
                            )
                            Spacer(Modifier.width(8.dp))
                            Text(
                                text = if (primary?.isOpen == true) "SESI LAB DIBUKA" else "SESI DITUTUP",
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                                color = if (primary?.isOpen == true) EmeraldSuccess else RoseDanger,
                                letterSpacing = 1.sp
                            )
                        }

                        if (primary != null) {
                            Switch(
                                checked = primary.isOpen,
                                onCheckedChange = { viewModel.toggleMeetingStatus(it) },
                                colors = SwitchDefaults.colors(
                                    checkedThumbColor = White,
                                    checkedTrackColor = EmeraldSuccess,
                                    uncheckedThumbColor = SlateTextMuted,
                                    uncheckedTrackColor = SlateDark
                                )
                            )
                        }
                    }

                    Spacer(Modifier.height(10.dp))

                    Text(
                        text = primary?.title ?: "Tidak ada sesi aktif",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )

                    Spacer(Modifier.height(4.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Text(
                            text = "Jenjang: ${if (primary?.gradeLevel != null) "Kelas ${primary.gradeLevel}" else "Semua Kelas"}",
                            style = MaterialTheme.typography.bodySmall,
                            color = SlateTextMuted
                        )
                        Text(
                            text = "• ${primary?.date ?: "-"} (${primary?.startTime ?: "12:30"} - ${primary?.endTime ?: "14:00"})",
                            style = MaterialTheme.typography.bodySmall,
                            color = SlateTextMuted
                        )
                    }

                    Spacer(Modifier.height(16.dp))

                    // Kotak Token Anti-Titip Absen
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                primary?.sessionToken?.let { token ->
                                    clipboardManager.setText(AnnotatedString(token))
                                    Toast.makeText(context, "Kode Token $token disalin!", Toast.LENGTH_SHORT).show()
                                }
                            },
                        colors = CardDefaults.cardColors(containerColor = SlateCard),
                        shape = RoundedCornerShape(16.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, SlateBorder)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(14.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    text = "KODE TOKEN SESI LAB (ANTI-TITIP ABSEN)",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = SlateTextMuted,
                                    fontWeight = FontWeight.SemiBold
                                )
                                Spacer(Modifier.height(4.dp))
                                Text(
                                    text = primary?.sessionToken ?: "----",
                                    style = MaterialTheme.typography.headlineLarge,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = IndigoAccent,
                                    letterSpacing = 6.sp
                                )
                            }

                            Button(
                                onClick = { viewModel.generateNewToken() },
                                colors = ButtonDefaults.buttonColors(containerColor = SlateDark),
                                shape = RoundedCornerShape(10.dp),
                                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                            ) {
                                Icon(Icons.Default.Autorenew, contentDescription = null, modifier = Modifier.size(16.dp), tint = IndigoAccent)
                                Spacer(Modifier.width(4.dp))
                                Text("Acak", color = IndigoAccent, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }

        // 2. Bar Aksi: Tutup Semua Sesi & Tambah Sesi Baru
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedButton(
                    onClick = { viewModel.closeAllMeetings() },
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = RoseDanger),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Default.Lock, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Tutup Semua Sesi", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                }

                Button(
                    onClick = onCreateMeetingClick,
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(containerColor = PurplePrimary),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Buat Sesi Baru", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        // 3. Header Daftar Sesi
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Daftar Sesi Praktikum (${state.allMeetings.size})",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }
        }

        // 4. List Semua Pertemuan
        items(state.allMeetings, key = { it.id }) { meeting ->
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = SlateCard),
                shape = RoundedCornerShape(14.dp),
                border = androidx.compose.foundation.BorderStroke(
                    1.dp,
                    if (meeting.id == primary?.id) PurplePrimary else SlateBorder
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
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(IndigoAccent.copy(alpha = 0.15f))
                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                            ) {
                                Text(
                                    text = if (meeting.gradeLevel != null) "Kelas ${meeting.gradeLevel}" else "Semua",
                                    color = IndigoAccent,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                            Spacer(Modifier.width(8.dp))
                            Text(
                                text = "P${meeting.meetingNumber}",
                                fontSize = 11.sp,
                                color = SlateTextMuted,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = if (meeting.isOpen) "Buka" else "Tutup",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (meeting.isOpen) EmeraldSuccess else SlateTextMuted
                            )
                            Spacer(Modifier.width(6.dp))
                            Switch(
                                checked = meeting.isOpen,
                                onCheckedChange = { viewModel.toggleMeetingStatus(meeting.id, it) },
                                colors = SwitchDefaults.colors(
                                    checkedThumbColor = White,
                                    checkedTrackColor = EmeraldSuccess
                                )
                            )
                        }
                    }

                    Spacer(Modifier.height(6.dp))

                    Text(
                        text = meeting.title,
                        fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.bodyLarge
                    )

                    Spacer(Modifier.height(4.dp))

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.CalendarToday, contentDescription = null, modifier = Modifier.size(13.dp), tint = SlateTextMuted)
                        Spacer(Modifier.width(4.dp))
                        Text(text = meeting.date, fontSize = 12.sp, color = SlateTextMuted)
                        Spacer(Modifier.width(10.dp))
                        Icon(Icons.Default.Schedule, contentDescription = null, modifier = Modifier.size(13.dp), tint = SlateTextMuted)
                        Spacer(Modifier.width(4.dp))
                        Text(text = "${meeting.startTime} - ${meeting.endTime}", fontSize = 12.sp, color = SlateTextMuted)
                    }

                    Spacer(Modifier.height(10.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Key, contentDescription = null, modifier = Modifier.size(14.dp), tint = AmberWarning)
                            Spacer(Modifier.width(4.dp))
                            Text(
                                text = "Token: ${meeting.sessionToken ?: "----"}",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = AmberWarning
                            )
                        }

                        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            IconButton(
                                onClick = { viewModel.generateNewTokenForMeeting(meeting.id) },
                                modifier = Modifier.size(32.dp)
                            ) {
                                Icon(Icons.Default.Autorenew, contentDescription = "Acak Token", modifier = Modifier.size(16.dp), tint = SlateTextMuted)
                            }
                            IconButton(
                                onClick = { viewModel.deleteMeeting(meeting.id) },
                                modifier = Modifier.size(32.dp)
                            ) {
                                Icon(Icons.Default.Delete, contentDescription = "Hapus Sesi", modifier = Modifier.size(16.dp), tint = RoseDanger)
                            }
                        }
                    }
                }
            }
        }
    }
}
