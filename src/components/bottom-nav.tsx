'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CalendarCheck, FileCheck } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();

  const isHome = pathname === '/';
  const isAbsen = pathname.startsWith('/absen') || pathname.startsWith('/siswa/absen');
  const isTugas = pathname.startsWith('/tugas');

  const navItems = [
    {
      label: 'Beranda',
      href: '/',
      icon: Home,
      isActive: isHome,
    },
    {
      label: 'Presensi',
      href: '/absen',
      icon: CalendarCheck,
      isActive: isAbsen,
    },
    {
      label: 'Tugas',
      href: '/tugas',
      icon: FileCheck,
      isActive: isTugas,
    },
  ];

  return (
    <nav
      aria-label="Navigasi Utama Ponsel"
      className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-sm px-3 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))]"
    >
      <div className="grid grid-cols-3 items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-colors ${
                item.isActive
                  ? 'text-indigo-600 bg-indigo-50/70 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 font-medium'
              }`}
            >
              <div className="w-5 h-5 flex items-center justify-center mb-0.5">
                <Icon
                  className="w-5 h-5"
                  strokeWidth={item.isActive ? 2 : 1.75}
                  aria-hidden="true"
                />
              </div>
              <span className="text-[11px] tracking-tight leading-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
