# 🚀 computer.pletig Admin - Android Kotlin (Realtime Turso Database + Offline-Speed Native UI)

Aplikasi Native Android (Kotlin + Jetpack Compose) khusus **Admin / Pembina Ekstrakurikuler Komputer SDN Pleburan 03 Semarang**.

Aplikasi ini didesain dengan konsep **Offline-Speed UI terintegrasi langsung secara Realtime dengan Database Turso (libSQL Cloud)**:
Antarmuka pengguna tetap sangat cepat tanpa jeda (*zero UI freeze*) berkat local cache Room Database, sementara seluruh data (sesi pertemuan, kode token lab, data siswa, presensi hadir/izin/sakit, dan penilaian tugas) terhubung dan tersinkronisasi **dua arah secara realtime langsung ke database Turso cloud** (`computerpletig-lazenfajri.aws-ap-northeast-1.turso.io`).

---

## 📱 Fitur Utama UI/UX & Realtime Integration

1. **Direct Turso Cloud Realtime Database**:
   - Terkoneksi langsung ke server Turso Tokyo via libSQL HTTP pipeline `/v2/pipeline` dengan autentikasi Bearer JWT.
   - **Realtime Ticker Polling (~4 detik)**: Memantau presensi siswa yang mengisi dari web/komputer lab secara live.
   - Indikator Status & Latensi di Header:
     - 🟢 **TURSO REALTIME (e.g. 150ms)**: Database cloud terhubung langsung, data realtime.
     - 🟠 **OFFLINE CACHED**: Jika jaringan putus sementara, data tetap tersimpan di Room DB dan otomatis di-sync saat internet pulih.

2. **Kontrol Sesi Otomatis & Anti-Titip Absen Token Generator**:
   - Jadwal praktikum 2 sesi beruntun:
     - **Sesi 1**: `12:45` s/d `13:20` WIB.
     - **Sesi 2**: `13:20` s/d `13:55` WIB.
   - Toggle Buka / Tutup Sesi presensi seketika (eksekusi langsung update status ke Turso Cloud).
   - Generator Token Sesi 4-Digit berukuran besar dan eye-catching untuk dipajang di proyektor lab atau papan tulis.
   - Tombol **"Acak Token"** untuk rotasi token sesi kapan saja dengan update instan ke Turso.
   - Tombol **"Tutup Semua Sesi"** untuk merapikan semua sesi aktif sekaligus.

3. **Matriks Presensi Siswa Realtime (1-Tap Check-in)**:
   - Filter cepat berdasarkan jenjang (**Kelas 4, 5, 6**) dan Rombel (**4A, 4B, 5A, 5B, 6A, 6B**).
   - Tombol cepat 1-tap: **[Hadir]**, **[Izin]**, **[Sakit]** (langsung mutasi ke Turso Cloud).
   - Indikator status per siswa (Cloud Realtime = Tersimpan di database Turso).

4. **Penilaian Tugas Siswa (Grade Submissions)**:
   - Tab Tugas & Penilaian lengkap dengan dialog input nilai (0-100) dan catatan/feedback pembina.
   - Data penilaian langsung di-commit ke tabel `submissions` di Turso Cloud.

5. **Pengaturan Database & Server Gateway**:
   - Dialog pengaturan **Base URL Server Web / API Gateway** (`https://computer-pletig.vercel.app/`).
   - Monitoring direct ping & latency ke database Turso AWS Tokyo.

---

## 🛠️ Arsitektur Teknologi

- **Bahasa**: Kotlin 2.0
- **UI Toolkit**: Jetpack Compose Material 3 (Rich aesthetics, dark mode playful SDN Pleburan 03)
- **Cloud Database**: Turso Database (libSQL HTTP Pipeline `/v2/pipeline`, AWS Tokyo `ap-northeast-1`)
- **Direct Client**: `TursoClient.kt` (Direct libSQL query & execute statements)
- **Local Storage**: AndroidX Room Database 2.6 (Instant cache untuk 0ms latency UI)
- **Coroutines & Flow**: Reactive StateFlow & SharedFlow + Live Background Ticker Coroutine
- **REST Gateway**: Retrofit 2 + OkHttp 3 (`/api/admin/sync`)

---

## 📂 Struktur Direktori

```
android-admin-kotlin/
├── app/
│   ├── build.gradle.kts
│   ├── src/main/
│   │   ├── AndroidManifest.xml
│   │   ├── java/id/sch/sdnpleburan03/admin/
│   │   │   ├── AdminApplication.kt       # Application class & scheduler
│   │   │   ├── MainActivity.kt           # Compose activity host
│   │   │   ├── data/
│   │   │   │   ├── local/
│   │   │   │   │   ├── AppDatabase.kt    # Room DB singleton & converters
│   │   │   │   │   ├── DatabaseInitializer.kt # Seeder default siswa & sesi
│   │   │   │   │   ├── dao/              # MeetingDao, StudentDao, AttendanceDao, AssignmentDao
│   │   │   │   │   └── entity/           # MeetingEntity, StudentEntity, AttendanceEntity
│   │   │   │   ├── remote/               # TursoClient.kt (Direct libSQL), ApiClient, AdminApiService
│   │   │   │   └── repository/           # AdminRepository (Direct Turso + Room Cache)
│   │   │   ├── sync/                     # NetworkMonitor, AdminSyncWorker
│   │   │   └── ui/
│   │   │       ├── screens/              # AdminDashboardScreen, CreateMeetingDialog, ServerConfigDialog, GradeDialog
│   │   │       ├── screens/tabs/         # OverviewTab, MeetingsTab, StudentsTab, AssignmentsTab
│   │   │       ├── theme/                # Color, Theme, Type
│   │   │       └── viewmodel/            # AdminDashboardViewModel, AdminDashboardState
│   │   └── res/                          # Strings, Colors, Themes, XML rules
│   └── release/                          # Keystore signing configuration
├── gradle/
│   ├── libs.versions.toml                # Modern version catalog
│   └── wrapper/                          # Gradle wrapper 8.7
├── build.gradle.kts
├── settings.gradle.kts
└── gradle.properties
```

---

## 🚀 Cara Menjalankan & Build APK

1. Buka **Android Studio** (Koala / Ladybug atau versi terbaru).
2. Buka folder `android-admin-kotlin`.
3. Tunggu hingga proses **Gradle Sync** selesai.
4. Sambungkan HP Android via kabel USB atau jalankan di Android Emulator.
5. Klik **Run 'app'** (▶).
6. Aplikasi langsung terhubung ke **Turso Realtime Database** dengan data riil siswa dan sesi SDN Pleburan 03!
