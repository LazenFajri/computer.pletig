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
      activeColor: 'text-blue-600',
      activeBg: 'bg-blue-50',
      indicatorColor: 'bg-blue-600',
    },
    {
      label: 'Presensi',
      href: '/absen',
      icon: CalendarCheck,
      isActive: isAbsen,
      activeColor: 'text-emerald-600',
      activeBg: 'bg-emerald-50',
      indicatorColor: 'bg-emerald-600',
      highlight: true,
    },
    {
      label: 'Tugas',
      href: '/tugas',
      icon: FileCheck,
      isActive: isTugas,
      activeColor: 'text-amber-600',
      activeBg: 'bg-amber-50',
      indicatorColor: 'bg-amber-600',
    },
  ];

  return (
    <nav
      aria-label="Navigasi Bawah Ponsel"
      className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      <div className="grid grid-cols-3 items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all active:scale-95 relative ${
                item.isActive ? `${item.activeBg}` : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {item.highlight && !item.isActive && (
                <span className="absolute top-1 right-5 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              )}

              <div
                className={`w-9 h-7 rounded-xl flex items-center justify-center transition-all ${
                  item.isActive ? item.activeColor : 'text-slate-500'
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    item.isActive ? 'scale-110 stroke-[2.5]' : 'stroke-[1.8]'
                  }`}
                />
              </div>

              <span
                className={`text-[10px] tracking-tight font-heading leading-tight transition-all ${
                  item.isActive
                    ? `${item.activeColor} font-bold`
                    : 'text-slate-500 font-medium'
                }`}
              >
                {item.label}
              </span>

              {item.isActive && (
                <span
                  className={`w-1.5 h-1.5 rounded-full mt-0.5 ${item.indicatorColor}`}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
