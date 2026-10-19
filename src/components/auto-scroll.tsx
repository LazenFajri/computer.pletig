'use client';

import { useEffect } from 'react';

export interface SmoothScrollOptions {
  offset?: number;
  duration?: number;
}

/**
 * Animasi smooth scrolling menggunakan requestAnimationFrame dan kurva easeInOutCubic.
 * Memberikan efek camera glide yang sangat mulus dan stabil di semua browser & mobile webview.
 */
export function smoothScrollToElement(
  targetId: string,
  options: SmoothScrollOptions = {}
): boolean {
  if (typeof window === 'undefined') return false;

  const el = document.getElementById(targetId);
  if (!el) return false;

  const offset = options.offset ?? -24;
  const duration = options.duration ?? 750;

  const startY = window.pageYOffset || document.documentElement.scrollTop;
  const targetY = Math.max(0, el.getBoundingClientRect().top + startY + offset);
  const diff = targetY - startY;

  // Jika posisi sudah pas atau perbedaannya sangat tipis (< 8px), tidak perlu animasi
  if (Math.abs(diff) < 8) return true;

  const startTime = performance.now();

  // Easing function: easeInOutCubic (mula lambat, akselerasi mulus, melambat halus saat tiba)
  const easeInOutCubic = (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  let animationFrameId: number;

  function step(currentTime: number) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = easeInOutCubic(progress);

    window.scrollTo(0, startY + diff * ease);

    if (progress < 1) {
      animationFrameId = requestAnimationFrame(step);
    }
  }

  animationFrameId = requestAnimationFrame(step);
  return true;
}

interface AutoScrollProps {
  targetId: string;
  delay?: number;
  offset?: number;
  duration?: number;
}

export default function AutoScroll({
  targetId,
  delay = 250,
  offset = -24,
  duration = 750,
}: AutoScrollProps) {
  useEffect(() => {
    let timer2: NodeJS.Timeout | null = null;

    const timer = setTimeout(() => {
      const scrolled = smoothScrollToElement(targetId, { offset, duration });
      if (!scrolled) {
        // Coba ulang sekali lagi jika DOM target masih render
        timer2 = setTimeout(() => {
          smoothScrollToElement(targetId, { offset, duration });
        }, 350);
      }
    }, delay);

    return () => {
      clearTimeout(timer);
      if (timer2) clearTimeout(timer2);
    };
  }, [targetId, delay, offset, duration]);

  return null;
}
