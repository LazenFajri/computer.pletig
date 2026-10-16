import type { Metadata } from 'next';
import { Fredoka, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const fredoka = Fredoka({
  subsets: ['latin'],
  variable: '--font-fredoka',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'computer.pletig - Ekstrakurikuler Komputer SDN Pleburan 03',
  description: 'Portal Ekstrakurikuler Komputer SDN Pleburan 03 Semarang: Presensi Siswa, Manajemen Laptop, Materi Mengetik, Desain, dan Penugasan.',
  manifest: '/manifest.json',
  icons: {
    icon: '/logo.jpg',
    apple: '/logo.jpg',
    shortcut: '/logo.jpg',
  },
};

import BottomNav from '@/components/bottom-nav';
import PullToRefresh from '@/components/pull-to-refresh';
import PwaRegister from '@/components/pwa-register';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${fredoka.variable} ${plusJakarta.variable}`}>
      <body className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-amber-300 selection:text-slate-900 overflow-x-hidden">
        <PwaRegister />
        <PullToRefresh />
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
