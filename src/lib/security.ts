import { headers } from 'next/headers';

// ============================================================
// 1. IP DETECTION HELPER
// ============================================================

/**
 * Mendapatkan IP Address klien dari header request (mendukung Cloudflare, Vercel, Nginx proxy)
 */
export async function getClientIp(): Promise<string> {
  try {
    const headersList = await headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    if (forwardedFor) {
      // Ambil IP pertama jika terdapat rantai proxy (client, proxy1, proxy2)
      const ip = forwardedFor.split(',')[0].trim();
      if (ip) return ip;
    }
    const realIp = headersList.get('x-real-ip');
    if (realIp) return realIp.trim();

    const cfConnectingIp = headersList.get('cf-connecting-ip');
    if (cfConnectingIp) return cfConnectingIp.trim();

    return '127.0.0.1';
  } catch {
    return '127.0.0.1';
  }
}

// ============================================================
// 2. CSRF & ORIGIN HEADER VERIFIER UNTUK SERVER ACTIONS
// ============================================================

/**
 * Memvalidasi apakah request mutasi berasal dari domain aplikasi sendiri (Anti-CSRF & Cross-Site Injection)
 */
export async function verifyRequestOrigin(): Promise<{ valid: boolean; reason?: string }> {
  try {
    const headersList = await headers();
    const origin = headersList.get('origin');
    const host = headersList.get('host');
    const referer = headersList.get('referer');

    // 1. Jika ada header origin (umum pada fetch, Server Action POST, form)
    if (origin) {
      const cleanOrigin = origin.toLowerCase().trim();

      // Izinkan WebView / Capacitor Android App & Localhost Dev Server
      if (
        cleanOrigin === 'https://localhost' ||
        cleanOrigin === 'http://localhost' ||
        cleanOrigin.startsWith('http://localhost:') ||
        cleanOrigin.startsWith('https://localhost:') ||
        cleanOrigin.startsWith('http://127.0.0.1:') ||
        cleanOrigin.startsWith('https://127.0.0.1:') ||
        cleanOrigin === 'capacitor://localhost' ||
        cleanOrigin.startsWith('ionic://')
      ) {
        return { valid: true };
      }

      // Verifikasi host domain web
      if (host) {
        const cleanHost = host.toLowerCase().trim();
        const expectedHttp = `http://${cleanHost}`;
        const expectedHttps = `https://${cleanHost}`;

        if (cleanOrigin === expectedHttp || cleanOrigin === expectedHttps) {
          return { valid: true };
        }
      }

      // Izinkan domain Vercel preview / production milik repository
      if (cleanOrigin.includes('computer-pletig') || cleanOrigin.includes('pletig.vercel.app')) {
        return { valid: true };
      }

      return {
        valid: false,
        reason: `CSRF Mismatch: Origin "${origin}" tidak diizinkan.`,
      };
    }

    // 2. Jika origin tidak ada, periksa referer
    if (referer && host) {
      try {
        const refUrl = new URL(referer);
        if (refUrl.host.toLowerCase() === host.toLowerCase()) {
          return { valid: true };
        }
      } catch {
        // referer format invalid
      }
    }

    // Default: izinkan jika internal server action tanpa origin eksplisit (same-site)
    return { valid: true };
  } catch {
    return { valid: true };
  }
}

// ============================================================
// 3. SCANNER & BOT PATH MATCHER (UNTUK MIDDLEWARE)
// ============================================================

const DANGEROUS_PATTERNS = [
  /^\/\.env/i,
  /^\/\.git/i,
  /^\/\.aws/i,
  /^\/\.ssh/i,
  /^\/\.vscode/i,
  /^\/\.ds_store/i,
  /^\/wp-admin/i,
  /^\/wp-login\.php/i,
  /^\/wp-content/i,
  /^\/xmlrpc\.php/i,
  /^\/phpmyadmin/i,
  /^\/pma(\/.*)?$/i,
  /^\/admin\.php/i,
  /^\/eval-stdin\.php/i,
  /^\/server-status/i,
  /^\/solr(\/.*)?$/i,
  /^\/actuator(\/.*)?$/i,
  /^\/cgi-bin(\/.*)?$/i,
  /^\/config\.json$/i,
  /^\/\.well-known\/(?!assetlinks\.json).*$/i,
];

/**
 * Mendeteksi apakah URL path merupakan target automated vulnerability scanner
 */
export function isScannerProbePath(pathname: string): boolean {
  return DANGEROUS_PATTERNS.some((pattern) => pattern.test(pathname));
}

// ============================================================
// 4. IN-MEMORY SLIDING WINDOW RATE LIMITER
// ============================================================

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Bersihkan data lama tiap 5 menit agar memori tetap bersih
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < 60000);
      if (record.timestamps.length === 0) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

/**
 * Generic Rate Limiter menggunakan sliding window
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const record = rateLimitStore.get(key) || { timestamps: [] };

  // Filter timestamp yang masih di dalam sliding window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= limit) {
    const oldestTimestamp = record.timestamps[0];
    const resetTime = Math.ceil((oldestTimestamp + windowMs - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetTime: Math.max(1, resetTime),
    };
  }

  record.timestamps.push(now);
  rateLimitStore.set(key, record);

  return {
    allowed: true,
    remaining: limit - record.timestamps.length,
    resetTime: windowSeconds,
  };
}

/**
 * Rate limiter presensi: membatasi request per IP lab sekolah agar tidak di-spam bot/script looping
 * Batas: Maksimal 25 presensi per 30 detik per IP publik (cukup untuk siswa antre presensi, aman dari DoS)
 */
export function checkAttendanceRateLimit(ip: string): { allowed: boolean; message?: string } {
  const key = `att_${ip}`;
  const result = checkRateLimit(key, 25, 30);

  if (!result.allowed) {
    return {
      allowed: false,
      message: `Terlalu banyak permintaan presensi dari perangkat/jaringan ini. Mohon tunggu ${result.resetTime} detik sebelum mencoba kembali.`,
    };
  }

  return { allowed: true };
}

// ============================================================
// 5. BRUTE FORCE LOCKOUT UNTUK LOGIN ADMIN
// ============================================================

interface LoginAttemptRecord {
  failedAttempts: number;
  lockedUntil: number | null;
}

const loginAttemptsStore = new Map<string, LoginAttemptRecord>();

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 menit

/**
 * Periksa apakah IP atau Username admin sedang dalam status terkunci
 */
export function checkAdminLoginLock(identifier: string): { isLocked: boolean; lockRemainingSeconds: number } {
  const now = Date.now();
  const record = loginAttemptsStore.get(identifier);

  if (!record || !record.lockedUntil) {
    return { isLocked: false, lockRemainingSeconds: 0 };
  }

  if (now < record.lockedUntil) {
    const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return { isLocked: true, lockRemainingSeconds: remainingSeconds };
  }

  // Waktu kunci telah berakhir -> reset
  loginAttemptsStore.delete(identifier);
  return { isLocked: false, lockRemainingSeconds: 0 };
}

/**
 * Catat kegagalan login. Jika mencapai 5 kali berturut-turut, kunci selama 15 menit.
 */
export function recordFailedAdminLogin(identifier: string): {
  isLocked: boolean;
  attemptsLeft: number;
  lockRemainingSeconds: number;
} {
  const now = Date.now();
  const record = loginAttemptsStore.get(identifier) || { failedAttempts: 0, lockedUntil: null };

  // Jika sebelumnya sudah terkunci dan masih berlaku
  if (record.lockedUntil && now < record.lockedUntil) {
    const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return { isLocked: true, attemptsLeft: 0, lockRemainingSeconds: remainingSeconds };
  }

  record.failedAttempts += 1;

  if (record.failedAttempts >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
    loginAttemptsStore.set(identifier, record);
    return {
      isLocked: true,
      attemptsLeft: 0,
      lockRemainingSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000),
    };
  }

  loginAttemptsStore.set(identifier, record);
  return {
    isLocked: false,
    attemptsLeft: MAX_FAILED_ATTEMPTS - record.failedAttempts,
    lockRemainingSeconds: 0,
  };
}

/**
 * Reset status percobaan login setelah berhasil login
 */
export function resetAdminLoginAttempts(identifier: string): void {
  loginAttemptsStore.delete(identifier);
}

// ============================================================
// 6. XSS & INPUT SANITIZATION (NAMA SISWA & KONTEN MATERI)
// ============================================================

/**
 * Sanitasi ketat untuk nama siswa:
 * - Menghilangkan tag HTML, script, atribut berbahaya
 * - Mengizinkan karakter alfabet, spasi, titik, koma, tanda hubung, dan petik satu (nama resmi SD)
 * - Mencegah XSS payload seperti <script>, onerror=, javascript:
 */
export function sanitizeStudentName(input: string, maxLength: number = 80): string {
  if (!input) return '';

  // 1. Hapus semua tag HTML/XML
  let cleaned = input.replace(/<[^>]*>?/gm, '');

  // 2. Hapus URL skema berbahaya jika ada
  cleaned = cleaned.replace(/javascript\s*:/gi, '').replace(/data\s*:/gi, '');

  // 3. Batasi hanya huruf, angka, spasi, dan tanda baca umum nama
  cleaned = cleaned.replace(/[^a-zA-Z0-9\s.,'-]/g, '');

  // 4. Normalisasi spasi ganda & trim
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // 5. Potong sesuai panjang maksimal
  return cleaned.slice(0, maxLength);
}

/**
 * Sanitasi string umum (judul materi, deskripsi, feedback nilai):
 * - Menghilangkan tag executable berbahaya (<script>, <iframe>, <object>, <embed>, <svg>, <form>)
 * - Menghilangkan event handler (onload=, onerror=, onclick=, dll)
 */
export function sanitizeText(input: string, maxLength: number = 2000): string {
  if (!input) return '';

  let cleaned = input;

  // Hapus tag berisiko tinggi beserta isinya
  cleaned = cleaned.replace(/<\s*(script|iframe|object|embed|svg|applet|meta|link|form|input)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
  cleaned = cleaned.replace(/<\s*(script|iframe|object|embed|svg|applet|meta|link|form|input)[^>]*\/?\s*>/gi, '');

  // Hapus event handler on* (onerror, onload, onclick, onmouseover, dsb)
  cleaned = cleaned.replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  // Hapus protokol javascript: atau data:
  cleaned = cleaned.replace(/href\s*=\s*["']?\s*javascript:[^"'>]*/gi, 'href="#"');
  cleaned = cleaned.replace(/src\s*=\s*["']?\s*javascript:[^"'>]*/gi, 'src=""');

  return cleaned.trim().slice(0, maxLength);
}

/**
 * Sanitasi link / URL eksternal (materi link, pengumpulan tugas)
 * Hanya mengizinkan protokol http:// atau https://
 */
export function sanitizeUrl(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}
