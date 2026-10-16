import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/session-token';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = token ? await verifySessionToken(token) : null;
  const isSuperadmin = user && user.role === 'superadmin';

  // 1. Dukungan Mode Pemeliharaan (Maintenance Mode)
  // Dapat diaktifkan melalui MAINTENANCE_MODE=true di .env / .env.local
  const isMaintenanceMode = process.env.MAINTENANCE_MODE === 'true';

  if (isMaintenanceMode && !isSuperadmin) {
    const isAllowedDuringMaintenance =
      pathname.startsWith('/maintenance') ||
      pathname.startsWith('/login') ||
      pathname.startsWith('/api/auth') ||
      pathname.startsWith('/_next') ||
      pathname === '/favicon.ico';

    if (!isAllowedDuringMaintenance) {
      return NextResponse.redirect(new URL('/maintenance', request.url));
    }
  }

  // 2. Jika sudah login sebagai superadmin dan mengakses /login -> langsung ke dashboard admin
  if (pathname === '/login') {
    if (isSuperadmin) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // 3. Proteksi rute /admin/* (Khusus Pembina / Superadmin)
  if (pathname.startsWith('/admin')) {
    if (!isSuperadmin) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // Siswa dan guru tidak dibebani login, rute lain terbuka bebas
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for static assets and images
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|xlsx)$).*)',
  ],
};
