import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateIndo(dateStr: string | Date | number): string {
  const date = typeof dateStr === 'string' || typeof dateStr === 'number' ? new Date(dateStr) : dateStr;
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatTimeIndo(timeStr: string): string {
  return `${timeStr} WIB`;
}
