package id.sch.sdnpleburan03.admin

import android.app.Application
import id.sch.sdnpleburan03.admin.data.local.AppDatabase
import id.sch.sdnpleburan03.admin.data.local.DatabaseInitializer
import id.sch.sdnpleburan03.admin.sync.AdminSyncWorker
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class AdminApplication : Application() {
    val database: AppDatabase by lazy { AppDatabase.getInstance(this) }

    override fun onCreate() {
        super.onCreate()

        // 1. Inisialisasi data offline default jika database baru/kosong
        CoroutineScope(Dispatchers.IO).launch {
            DatabaseInitializer.populateInitialDataIfEmpty(database)
        }

        // 2. Jadwalkan background auto-sync saat terhubung ke Wi-Fi sekolah
        AdminSyncWorker.scheduleWifiPeriodicSync(this)
    }
}
