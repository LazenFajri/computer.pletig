export interface HttpErrorInfo {
  code: number;
  title: string;
  badge: string;
  subtitle: string;
  description: string;
  suggestion: string;
  actionText: string;
  actionHref: string;
  colorScheme: 'amber' | 'rose' | 'blue' | 'purple' | 'emerald';
}

export const HTTP_ERRORS: Record<number, HttpErrorInfo> = {
  400: {
    code: 400,
    title: 'Permintaan Tidak Valid',
    badge: 'HTTP 400 • Bad Request',
    subtitle: 'Data yang dikirimkan tidak sesuai format.',
    description: 'Sistem tidak dapat memproses permintaan ini karena ada informasi yang kurang atau tidak sesuai.',
    suggestion: 'Periksa kembali data atau tautan yang kamu buka, lalu coba lagi.',
    actionText: 'Kembali ke Beranda',
    actionHref: '/',
    colorScheme: 'amber',
  },
  401: {
    code: 401,
    title: 'Autentikasi Diperlukan',
    badge: 'HTTP 401 • Unauthorized',
    subtitle: 'Kamu perlu masuk terlebih dahulu.',
    description: 'Sesi kamu mungkin sudah berakhir atau kamu belum melakukan login sebagai Pembina / Guru.',
    suggestion: 'Silakan masuk menggunakan akun Pembina untuk melanjutkan ke dashboard pengelolaan.',
    actionText: 'Masuk sebagai Pembina',
    actionHref: '/login',
    colorScheme: 'blue',
  },
  403: {
    code: 403,
    title: 'Akses Dibatasi',
    badge: 'HTTP 403 • Forbidden',
    subtitle: 'Halaman ini khusus untuk Pembina / Guru.',
    description: 'Kamu tidak memiliki izin untuk membuka halaman pengelolaan ini.',
    suggestion: 'Jika kamu siswa, kamu bisa langsung membuka halaman Presensi, Materi Belajar, atau Penugasan tanpa perlu login.',
    actionText: 'Kembali ke Beranda',
    actionHref: '/',
    colorScheme: 'purple',
  },
  404: {
    code: 404,
    title: 'Halaman Tidak Ditemukan',
    badge: 'HTTP 404 • Not Found',
    subtitle: 'Wah, sepertinya halaman yang kamu tuju sedang jalan-jalan!',
    description: 'Alamat web (URL) yang kamu masukkan mungkin salah ketik, atau halamannya sudah dipindahkan oleh Pembina.',
    suggestion: 'Periksa kembali alamat webnya atau klik tombol di bawah untuk kembali ke halaman utama yang aman.',
    actionText: 'Kembali ke Halaman Utama',
    actionHref: '/',
    colorScheme: 'amber',
  },
  500: {
    code: 500,
    title: 'Gangguan Sistem Server',
    badge: 'HTTP 500 • Internal Server Error',
    subtitle: 'Terjadi sedikit kendala pada server aplikasi.',
    description: 'Jangan panik! Data dan riwayat presensi kamu tetap aman. Sistem sedang berusaha memulihkan koneksi.',
    suggestion: 'Tunggu beberapa saat lalu muat ulang halaman ini, atau beri tahu Pembina Ekstrakurikuler.',
    actionText: 'Muat Ulang Halaman',
    actionHref: '/',
    colorScheme: 'rose',
  },
  502: {
    code: 502,
    title: 'Gerbang Layanan Terputus',
    badge: 'HTTP 502 • Bad Gateway',
    subtitle: 'Koneksi ke database cloud sedang terhambat.',
    description: 'Server utama tidak dapat menerima respons cepat dari penyedia database atau jaringan.',
    suggestion: 'Silakan coba lagi dalam beberapa detik atau periksa koneksi internet di Lab Komputer.',
    actionText: 'Coba Lagi',
    actionHref: '/',
    colorScheme: 'rose',
  },
  503: {
    code: 503,
    title: 'Pemeliharaan Sistem (Maintenance)',
    badge: 'HTTP 503 • Service Unavailable',
    subtitle: 'Portal Lab Komputer sedang dalam perawatan rutin.',
    description: 'Kami sedang melakukan pembaruan sistem dan optimasi database agar kegiatan belajar siswa SDN Pleburan 03 semakin cepat, nyaman, dan lancar.',
    suggestion: 'Sistem akan segera kembali aktif setelah pemeliharaan selesai. Silakan ikuti instruksi Pembina Lab Komputer.',
    actionText: 'Periksa Status',
    actionHref: '/',
    colorScheme: 'blue',
  },
};

export function getHttpErrorInfo(code: number | string | undefined | null): HttpErrorInfo {
  const numCode = typeof code === 'string' ? parseInt(code, 10) : code;
  if (numCode && HTTP_ERRORS[numCode]) {
    return HTTP_ERRORS[numCode];
  }
  return HTTP_ERRORS[500];
}
