import { SignJWT, jwtVerify } from 'jose';
import type { SessionUser, SessionJWTPayload } from './auth-types';

export const SESSION_COOKIE_NAME = 'pletig_session';
export const SESSION_DURATION_SECONDS = 24 * 60 * 60; // 24 jam (otomatis logout setelah 24 jam)

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET || 'pletig-sdn03-super-secret-auth-key-2026-min-32-chars';
  return new TextEncoder().encode(secret);
}

/**
 * Buat JWT token untuk session user (Edge & Node compatible)
 */
export async function signSessionToken(user: SessionUser): Promise<string> {
  const key = getSecretKey();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);

  return new SignJWT({
    username: user.username,
    name: user.name,
    role: user.role,
    grade_level: user.grade_level ?? null,
    class_name: user.class_name ?? null,
    avatar_url: user.avatar_url ?? null,
    isSuperadmin: user.isSuperadmin,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(key);
}

/**
 * Verifikasi JWT token session (Edge & Node compatible, murni jose tanpa dependency DB)
 */
export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const key = getSecretKey();
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
    });

    const jwtPayload = payload as unknown as SessionJWTPayload;

    return {
      id: (payload.sub as string) || '',
      username: jwtPayload.username,
      name: jwtPayload.name,
      role: jwtPayload.role,
      grade_level: jwtPayload.grade_level,
      class_name: jwtPayload.class_name,
      avatar_url: jwtPayload.avatar_url,
      isSuperadmin: Boolean(jwtPayload.isSuperadmin),
    };
  } catch {
    return null;
  }
}
