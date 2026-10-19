package id.sch.sdnpleburan03.admin.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Assignment
import androidx.compose.material.icons.filled.Grade
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import id.sch.sdnpleburan03.admin.data.local.entity.AssignmentEntity
import id.sch.sdnpleburan03.admin.data.local.entity.SubmissionEntity
import id.sch.sdnpleburan03.admin.ui.theme.EmeraldLight
import id.sch.sdnpleburan03.admin.ui.theme.EmeraldSuccess
import id.sch.sdnpleburan03.admin.ui.theme.PurplePrimary
import id.sch.sdnpleburan03.admin.ui.theme.SlateBorder
import id.sch.sdnpleburan03.admin.ui.theme.SlateCard
import id.sch.sdnpleburan03.admin.ui.theme.SlateTextMuted

@Composable
fun GradeSubmissionDialog(
    submission: SubmissionEntity,
    assignment: AssignmentEntity?,
    onDismiss: () -> Unit,
    onSaveGrade: (score: Int, feedback: String?) -> Unit
) {
    var scoreText by remember { mutableStateOf(submission.score?.toString() ?: "90") }
    var feedbackText by remember { mutableStateOf(submission.feedback ?: "Bagus sekali! Praktik mandiri tuntas dan rapi.") }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(EmeraldLight),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Grade,
                        contentDescription = null,
                        tint = EmeraldSuccess,
                        modifier = Modifier.size(20.dp)
                    )
                }
                Text(
                    text = "Penilaian Tugas Siswa",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
            }
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Info Siswa & Tugas
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = SlateCard),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Person, contentDescription = null, modifier = Modifier.size(16.dp), tint = SlateTextMuted)
                            Spacer(Modifier.width(6.dp))
                            Text(
                                text = submission.studentName,
                                fontWeight = FontWeight.Bold,
                                style = MaterialTheme.typography.bodyLarge
                            )
                            Spacer(Modifier.width(6.dp))
                            Text(
                                text = "• Kls ${submission.gradeLevel}",
                                color = SlateTextMuted,
                                style = MaterialTheme.typography.bodySmall
                            )
                        }

                        if (assignment != null) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Assignment, contentDescription = null, modifier = Modifier.size(16.dp), tint = SlateTextMuted)
                                Spacer(Modifier.width(6.dp))
                                Text(
                                    text = assignment.title,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = PurplePrimary
                                )
                            }
                        }

                        if (!submission.submissionText.isNullOrBlank()) {
                            Text(
                                text = "Pengumpulan: \"${submission.submissionText}\"",
                                style = MaterialTheme.typography.bodySmall,
                                color = SlateTextMuted,
                                modifier = Modifier.padding(top = 4.dp)
                            )
                        }
                    }
                }

                // Input Nilai (0 - 100)
                OutlinedTextField(
                    value = scoreText,
                    onValueChange = {
                        scoreText = it.filter { char -> char.isDigit() }
                        errorMessage = null
                    },
                    label = { Text("Nilai Angka (0 - 100)") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    isError = errorMessage != null,
                    supportingText = {
                        if (errorMessage != null) {
                            Text(errorMessage!!, color = MaterialTheme.colorScheme.error)
                        } else {
                            Text("Rentang nilai standar: 0 s/d 100")
                        }
                    }
                )

                // Input Feedback / Catatan Guru
                OutlinedTextField(
                    value = feedbackText,
                    onValueChange = { feedbackText = it },
                    label = { Text("Catatan / Komentar Guru") },
                    placeholder = { Text("misal: Sangat rapi, pertahankan!") },
                    minLines = 3,
                    maxLines = 4,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val score = scoreText.toIntOrNull()
                    if (score == null || score < 0 || score > 100) {
                        errorMessage = "Masukkan nilai valid antara 0 dan 100"
                    } else {
                        onSaveGrade(score, feedbackText.trim().ifEmpty { null })
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = PurplePrimary),
                shape = RoundedCornerShape(10.dp)
            ) {
                Text("Simpan Nilai", fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            OutlinedButton(
                onClick = onDismiss,
                shape = RoundedCornerShape(10.dp)
            ) {
                Text("Batal")
            }
        }
    )
}
