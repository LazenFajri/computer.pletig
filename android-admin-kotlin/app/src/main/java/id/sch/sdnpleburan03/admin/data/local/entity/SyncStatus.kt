package id.sch.sdnpleburan03.admin.data.local.entity

/**
 * Status sinkronisasi offline-first untuk mendeteksi data lokal yang belum dikirim ke BaaS/Server
 */
enum class SyncStatus {
    SYNCED,         // Data sudah sinkron dengan server
    PENDING_INSERT, // Data baru dibuat saat offline, belum dikirim ke server
    PENDING_UPDATE, // Data diubah saat offline (misal token diubah, sesi ditutup), belum dikirim
    PENDING_DELETE  // Data dihapus saat offline, belum dikirim ke server
}
