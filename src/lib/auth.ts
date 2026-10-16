import bcrypt from 'bcryptjs';
import { db } from '@/db';
import { users, sessions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { SessionUser, AuthResult } from './auth-types';

const SUPERADMIN_ID = 'superadmin-root-user';

/**
 * Validasi apakah kredensial cocok dengan Akun Pembina (Superadmin) dari file .env
 */
export function verifySuperadminCredentials(username: string, password: string): SessionUser | null {
  const superadminUser = process.env.SUPERADMIN_USERNAME;
  const superadminPass = process.env.SUPERADMIN_PASSWORD;
  const superadminName = process.env.SUPERADMIN_NAME || 'Pembina Ekstra Komputer';

  if (!superadminUser || !superadminPass) {
    return null;
  }

  if (username === superadminUser && password === superadminPass) {
    return {
      id: SUPERADMIN_ID,
      name: superadminName,
      username: superadminUser,
      role: 'superadmin',
      grade_level: null,
      class_name: null,
      avatar_url: null,
      isSuperadmin: true,
    };
  }

  return null;
}

/**
 * Hash password menggunakan bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Komparasi password dengan hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Autentikasi terpadu: Cek Superadmin (.env) terlebih dahulu, jika bukan, cek tabel `users` (Guru / Siswa)
 */
export async function authenticateUser(username: string, password: string): Promise<AuthResult> {
  // 1. Cek kredensial Superadmin dari .env
  const superadmin = verifySuperadminCredentials(username, password);
  if (superadmin) {
    return { success: true, user: superadmin };
  }

  // 2. Cek database untuk Guru atau Siswa
  const existingUser = await db.query.users.findFirst({
    where: eq(users.username, username.trim()),
  });

  if (!existingUser) {
    return { success: false, error: 'Username atau NISN tidak ditemukan' };
  }

  if (!existingUser.is_active) {
    return { success: false, error: 'Akun ini sedang dinonaktifkan oleh Pembina' };
  }

  const isMatch = await verifyPassword(password, existingUser.password_hash);
  if (!isMatch) {
    return { success: false, error: 'Password atau PIN salah' };
  }

  return {
    success: true,
    user: {
      id: existingUser.id,
      name: existingUser.name,
      username: existingUser.username,
      role: existingUser.role as 'guru' | 'siswa',
      grade_level: existingUser.grade_level as any,
      class_name: existingUser.class_name,
      avatar_url: existingUser.avatar_url,
      isSuperadmin: false,
    },
  };
}
