'use server';

import { redirect } from 'next/navigation';
import { authenticateUser } from '@/lib/auth';
import { createSession, deleteSession, getCurrentUser } from '@/lib/session';
import type { ActionState, SessionUser } from '@/lib/auth-types';
import {
  getClientIp,
  verifyRequestOrigin,
  checkAdminLoginLock,
  recordFailedAdminLogin,
  resetAdminLoginAttempts,
  sanitizeText,
} from '@/lib/security';

/**
 * Server Action: Login Khusus Pembina / Admin
 * Dilengkapi proteksi: CSRF / Origin verification, anti brute-force lockout (5x gagal kunci 15 menit), IP detection
 */
export async function loginAction(
  username: string,
  password: string
): Promise<ActionState<SessionUser>> {
  try {
    // 1. Validasi CSRF / Origin Header
    const originCheck = await verifyRequestOrigin();
    if (!originCheck.valid) {
      return {
        success: false,
        error: 'Permintaan login ditolak: Mismatched Origin (CSRF Protection).',
      };
    }

    // 2. Deteksi IP Klien & Periksa Lockout Status (Anti Automated Wordlist Attack)
    const clientIp = await getClientIp();
    const lockStatus = checkAdminLoginLock(clientIp);

    if (lockStatus.isLocked) {
      const remainingMinutes = Math.ceil(lockStatus.lockRemainingSeconds / 60);
      return {
        success: false,
        error: `Akses login terkunci sementara karena 5 kali percobaan gagal berturut-turut. Silakan coba lagi dalam ${remainingMinutes} menit.`,
      };
    }

    const cleanUser = sanitizeText(username.trim(), 50);
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      return {
        success: false,
        error: 'Username dan password admin wajib diisi.',
      };
    }

    // 3. Autentikasi Kredensial Superadmin
    const result = await authenticateUser(cleanUser, cleanPass);

    if (!result.success || !result.user || result.user.role !== 'superadmin') {
      // Catat kegagalan login untuk IP ini
      const failStatus = recordFailedAdminLogin(clientIp);

      if (failStatus.isLocked) {
        return {
          success: false,
          error:
            'Terlalu banyak percobaan gagal (5x)! Akses login dikunci sementara selama 15 menit demi keamanan.',
        };
      }

      return {
        success: false,
        error: `Username atau password Pembina salah. (Tersisa ${failStatus.attemptsLeft} kesempatan)`,
      };
    }

    // 4. Login Berhasil: Reset catatan percobaan gagal
    resetAdminLoginAttempts(clientIp);

    // Buat session baru (otomatis logout setelah 24 jam)
    await createSession(result.user);

    return {
      success: true,
      data: result.user,
      redirectUrl: '/admin/dashboard',
      message: 'Login Pembina berhasil. Membuka dashboard admin...',
    };
  } catch (error) {
    console.error('Login admin error:', error);
    return {
      success: false,
      error: 'Terjadi kendala pada server. Silakan coba lagi.',
    };
  }
}

/**
 * Server Action: Logout Pembina
 */
export async function logoutAction(): Promise<void> {
  await deleteSession();
  redirect('/login');
}

/**
 * Server Action: Mendapatkan User Pembina yang Sedang Login
 */
export async function getCurrentUserAction(): Promise<SessionUser | null> {
  return getCurrentUser();
}
