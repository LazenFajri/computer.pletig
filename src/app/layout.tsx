import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700'],
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
    <html lang="id" className={inter.variable}>
      <body className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-slate-200 selection:text-slate-900 overflow-x-hidden overflow-y-auto">
        <PwaRegister />
        <PullToRefresh />
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
