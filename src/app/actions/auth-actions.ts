'use server';

import { redirect } from 'next/navigation';
import { authenticateUser } from '@/lib/auth';
import { createSession, deleteSession, getCurrentUser } from '@/lib/session';
import type { ActionState, SessionUser } from '@/lib/auth-types';

/**
 * Server Action: Login Khusus Pembina / Admin
 * Siswa & Guru tidak dibebani akun/login ("masuk-masuk aja")
 */
export async function loginAction(
  username: string,
  password: string
): Promise<ActionState<SessionUser>> {
  try {
    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      return {
        success: false,
        error: 'Username dan password admin wajib diisi.',
      };
    }

    // Autentikasi Superadmin (.env)
    const result = await authenticateUser(cleanUser, cleanPass);

    if (!result.success || !result.user || result.user.role !== 'superadmin') {
      return {
        success: false,
        error: 'Username atau password Pembina salah.',
      };
    }

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
