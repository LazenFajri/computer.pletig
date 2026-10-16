import { cookies } from 'next/headers';
import type { SessionUser } from './auth-types';
import { db } from '@/db';
import { sessions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
  signSessionToken,
  verifySessionToken,
} from './session-token';

export { SESSION_COOKIE_NAME, SESSION_DURATION_SECONDS, signSessionToken, verifySessionToken };

/**
 * Set HTTP-Only Cookie dan catat session di database
 */
export async function createSession(user: SessionUser): Promise<string> {
  const token = await signSessionToken(user);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);

  // Set HTTP-Only Cookie di browser
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });

  // Catat session di tabel database untuk audit / tracking
  try {
    await db.insert(sessions).values({
      session_token: token,
      user_id: user.id,
      role: user.role,
      user_data: JSON.stringify({
        name: user.name,
        username: user.username,
        role: user.role,
        grade_level: user.grade_level,
        class_name: user.class_name,
      }),
      expires_at: expiresAt,
    });
  } catch (err) {
    // Abaikan error DB jika tabel offline / duplicate
    console.error('Failed to log session in DB:', err);
  }

  return token;
}

/**
 * Ambil session user saat ini dari request cookies (di Server Component / Server Action)
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      return null;
    }

    return verifySessionToken(token);
  } catch {
    // Saat static export / prerendering Capacitor, cookies() belum tersedia di build-time
    return null;
  }
}

/**
 * Hapus session cookie dan hapus record dari database
 */
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    try {
      await db.delete(sessions).where(eq(sessions.session_token, token));
    } catch {
      // Abaikan jika sudah tidak ada
    }
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}
