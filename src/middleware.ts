import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/session-token';

// ============================================================
// DAFTAR PROBE SCANNER OTOMATIS & SCRIPT KIDDIES
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

function isScannerProbePath(pathname: string): boolean {
  return DANGEROUS_PATTERNS.some((pattern) => pattern.test(pathname));
}

/**
 * Menambahkan HTTP Security Headers lengkap (CSP, Anti-Clickjacking, Anti-MIME Sniffing)
 */
function applySecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), browsing-topics=()');
  res.headers.set('Service-Worker-Allowed', '/');

  // Hanya terapkan CSP ketat pada mode production / deployment.
  // Pada mode development (localhost:3000), lewati CSP agar Fast Refresh / Turbopack dev tools tidak memicu auto-refresh berulang.
  if (process.env.NODE_ENV === 'development') {
    return res;
  }

  // Strict CSP: larang embedding iframe (frame-ancestors 'none'), blokir object-src
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https: http: wss: ws:",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];

  res.headers.set('Content-Security-Policy', cspDirectives.join('; '));
  return res;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Lewati semua aset dan internal WebSocket Next.js (HMR, chunks, Turbopack)
  if (pathname.startsWith('/_next')) {
    return NextResponse.next();
  }

  // 1. Blokir Akses Otomatis Bot / Vulnerability Scanner ke path umum
  if (isScannerProbePath(pathname)) {
    return new NextResponse('Access Denied: Automated Scanner Blocked', {
      status: 403,
      headers: {
        'Content-Type': 'text/plain',
        'X-Robots-Tag': 'noindex, nofollow',
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = token ? await verifySessionToken(token) : null;
  const isSuperadmin = user && user.role === 'superadmin';

  // 2. Dukungan Mode Pemeliharaan (Maintenance Mode)
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
      return applySecurityHeaders(NextResponse.redirect(new URL('/maintenance', request.url)));
    }
  }

  // 3. Jika sudah login sebagai superadmin dan mengakses /login -> langsung ke dashboard admin
  if (pathname === '/login') {
    if (isSuperadmin) {
      return applySecurityHeaders(NextResponse.redirect(new URL('/admin/dashboard', request.url)));
    }
    return applySecurityHeaders(NextResponse.next());
  }

  // 4. Proteksi rute /admin/* (Khusus Pembina / Superadmin)
  if (pathname.startsWith('/admin')) {
    if (!isSuperadmin) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return applySecurityHeaders(NextResponse.redirect(loginUrl));
    }
    return applySecurityHeaders(NextResponse.next());
  }

  // Siswa dan guru tidak dibebani login, rute lain terbuka bebas dengan security headers
  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for _next internal assets/HMR and static files, sw.js, manifest.json
     */
    '/((?!_next|favicon.ico|sw\\.js|manifest\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|xlsx)$).*)',
  ],
};
