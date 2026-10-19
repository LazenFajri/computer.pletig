package id.sch.sdnpleburan03.admin.sync

import android.content.Context
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import id.sch.sdnpleburan03.admin.data.repository.AdminRepository
import java.util.concurrent.TimeUnit

class AdminSyncWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    private val repository = AdminRepository(appContext)

    override suspend fun doWork(): Result {
        val syncResult = repository.performTwoWaySync()
        return if (syncResult.isSuccess) {
            Result.success()
        } else {
            Result.retry()
        }
    }

    companion object {
        private const val PERIODIC_SYNC_WORK_NAME = "computer_pletig_wifi_sync"

        /**
         * Mendaftarkan background worker yang otomatis menyinkronkan data ketika terhubung ke Wi-Fi
         */
        fun scheduleWifiPeriodicSync(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED) // Online via Wi-Fi maupun Paket Data HP
                .build()

            val periodicRequest = PeriodicWorkRequestBuilder<AdminSyncWorker>(
                15, TimeUnit.MINUTES
            ).setConstraints(constraints).build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                PERIODIC_SYNC_WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                periodicRequest
            )
        }

        /**
         * Menjalankan sync instan satu kali saat tombol manual sync ditekan
         */
        fun triggerImmediateSync(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val oneTimeRequest = OneTimeWorkRequestBuilder<AdminSyncWorker>()
                .setConstraints(constraints)
                .build()

            WorkManager.getInstance(context).enqueue(oneTimeRequest)
        }
    }
}
