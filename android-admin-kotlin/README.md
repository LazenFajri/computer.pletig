# 🚀 computer.pletig Admin - Android Kotlin (Full Offline-First + Wi-Fi BaaS Sync)

Aplikasi Native Android (Kotlin + Jetpack Compose) khusus **Admin / Pembina Ekstrakurikuler Komputer SDN Pleburan 03 Semarang**.

Aplikasi ini didesain dengan arsitektur **Full Offline-First**: seluruh fitur admin (buka/tutup sesi presensi, acak kode token lab 4-digit anti-titip absen, matriks absensi siswa per rombel, pencatatan hadir/izin/sakit) dapat berjalan 100% tanpa jaringan internet. Saat smartphone terhubung ke Wi-Fi lab / sekolah, aplikasi otomatis menyinkronkan data dua arah dengan **Backend As A Service (BaaS)** web `computer.pletig`.

---

## 📱 Fitur Utama UI/UX

1. **Dashboard Admin Modern & Responsif**:
   - Tampilan visual premium bergaya playful dark theme khas `computer.pletig` (aksen Purple `#7C3AED`, Indigo `#4F46E5`, Emerald `#10B981`, dan Amber `#F59E0B`).
   - Indikator Status Jaringan Real-Time:
     - 🟢 **Wi-Fi Lab Aktif (BaaS Online)**: Sinkronisasi latar belakang otomatis aktif.
     - 🟠 **Mode Full Offline**: Data tersimpan aman di SQLite lokal HP pembina.

2. **Kontrol Sesi & Anti-Titip Absen Token Generator**:
   - Toggle Buka / Tutup Sesi presensi seketika dengan 1 klik switch.
   - Generator Token Sesi 4-Digit berukuran besar dan eye-catching untuk dipajang di proyektor lab atau papan tulis.
   - Tombol **"Acak Baru"** untuk rotasi token sesi kapan saja.

3. **Matriks Presensi Siswa Offline (1-Tap Check-in)**:
   - Filter cepat berdasarkan jenjang (**Kelas 4, 5, 6**) dan Rombel (**4A, 4B, 5A, 5B, 6A, 6B**).
   - Tombol cepat 1-tap: **[Hadir]**, **[Izin]**, **[Sakit]**.
   - Indikator status per siswa (Cloud Checked = Sudah tersinkron ke server, Cloud Upload = Tersimpan lokal di HP).

4. **Background Auto-Sync Wi-Fi (BaaS)**:
   - Menggunakan AndroidX **WorkManager** dengan batasan `NetworkType.UNMETERED` (Wi-Fi).
   - Tombol **"Sync Sekarang"** manual dengan animasi putaran dan riwayat waktu sync.
   - Dialog pengaturan **Base URL Server** (misal: `http://192.168.1.100:3000/` atau server online).

---

## 🛠️ Arsitektur Teknologi

- **Bahasa**: Kotlin 2.0
- **UI Toolkit**: Jetpack Compose Material 3
- **Local Storage**: AndroidX Room Database 2.6 (SQLite Offline-first)
- **Background Task**: AndroidX WorkManager (Wi-Fi unmetered constraint)
- **HTTP / REST Client**: Retrofit 2 + OkHttp 3 + Gson
- **Coroutines & Flow**: Reactive StateFlow & SharedFlow
- **Next.js BaaS API**: `GET & POST /api/admin/sync`

---

## 📂 Struktur Direktori

```
android-admin-kotlin/
├── app/
│   ├── build.gradle.kts
│   ├── src/main/
│   │   ├── AndroidManifest.xml
│   │   ├── java/id/sch/sdnpleburan03/admin/
│   │   │   ├── AdminApplication.kt       # Application class (Seed & Worker scheduler)
│   │   │   ├── MainActivity.kt           # Compose activity host
│   │   │   ├── data/
│   │   │   │   ├── local/
│   │   │   │   │   ├── AppDatabase.kt    # Room DB singleton & converters
│   │   │   │   │   ├── DatabaseInitializer.kt # Seeder default siswa & sesi
│   │   │   │   │   ├── dao/              # MeetingDao, StudentDao, AttendanceDao
│   │   │   │   │   └── entity/           # MeetingEntity, StudentEntity, AttendanceEntity
│   │   │   │   ├── remote/               # ApiClient, AdminApiService, SyncModels
│   │   │   │   └── repository/           # AdminRepository (Single Source of Truth)
│   │   │   ├── sync/                     # NetworkMonitor, AdminSyncWorker
│   │   │   └── ui/
│   │   │       ├── screens/              # AdminDashboardScreen, Dialogs
│   │   │       ├── theme/                # Color, Theme, Type
│   │   │       └── viewmodel/            # AdminDashboardViewModel, State
│   │   └── res/                          # Strings, Colors, Themes, XML rules
├── gradle/
│   ├── libs.versions.toml                # Modern version catalog
│   └── wrapper/                          # Gradle wrapper 8.7
├── build.gradle.kts
├── settings.gradle.kts
└── gradle.properties
```

---

## 🚀 Cara Menjalankan Project di Android Studio

1. Buka **Android Studio** (Koala / Ladybug / Giraffe atau versi terbaru).
2. Pilih **Open** -> Arahkan ke folder:
   ```
   d:\computer.pletig\android-admin-kotlin
   ```
3. Tunggu hingga proses **Gradle Sync** selesai mengunduh dependencies (Room, Compose, Retrofit, WorkManager).
4. Sambungkan HP Android via kabel USB (Aktifkan USB Debugging) atau gunakan Android Emulator.
5. Klik tombol **Run 'app'** (Segitiga hijau ▶).
6. Aplikasi akan langsung terbuka dalam **Mode Full Offline** dengan data siswa SDN Pleburan 03 sudah siap digunakan!
7. Untuk menyinkronkan dengan server Next.js lokal:
   - Pastikan laptop/PC menjalankan `npm run dev` pada port 3000.
   - Di aplikasi Android, klik ikon **Settings (⚙️)** di pojok kanan atas.
   - Masukkan IP laptop di jaringan Wi-Fi lokal, contoh: `http://192.168.1.10:3000/`.
   - Tekan **"Simpan & Sinkronkan"**.
