'use client';

import { useTransition } from 'react';
import { logoutAction } from '@/app/actions/auth-actions';
import { LogOut } from 'lucide-react';

interface LogoutButtonProps {
  className?: string;
  variant?: 'danger' | 'ghost' | 'pill';
}

export default function LogoutButton({ className = '', variant = 'pill' }: LogoutButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
    });
  };

  const baseStyles =
    'inline-flex items-center gap-1.5 font-medium transition-all text-xs cursor-pointer';

  let variantStyles =
    'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-xl shadow-xs';
  if (variant === 'danger') {
    variantStyles =
      'bg-rose-600 text-white hover:bg-rose-700 px-4 py-2 rounded-2xl shadow-md shadow-rose-600/20';
  } else if (variant === 'ghost') {
    variantStyles = 'text-slate-500 hover:text-rose-600 px-2 py-1';
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isPending}
      className={`${baseStyles} ${variantStyles} ${className} disabled:opacity-50`}
      title="Keluar dari akun"
    >
      <LogOut className="w-3.5 h-3.5" />
      <span>{isPending ? 'Keluar...' : 'Keluar'}</span>
    </button>
  );
}
