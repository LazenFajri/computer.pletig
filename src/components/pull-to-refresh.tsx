'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

const PULL_THRESHOLD = 48; // Ambang batas yang ramah & responsif di mobile
const MAX_PULL = 90; // Batas tarikan visual

function getScrollTop(): number {
  if (typeof window === 'undefined') return 0;
  return window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
}

export default function PullToRefresh() {
  const router = useRouter();
  const [pullY, setPullY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const startYRef = useRef(0);
  const isDraggingTouchRef = useRef(false);
  const isDraggingMouseRef = useRef(false);
  const wheelAccumulatorRef = useRef(0);
  const wheelResetTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerRefresh = useCallback(() => {
    setIsRefreshing(true);
    setPullY(50); // Tahan indikator di posisi visual yang nyaman

    // Getaran haptic ringan jika didukung browser / HP
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([20, 30, 20]);
      } catch {
        // Abaikan
      }
    }

    // 1. Dispatch event global agar Client Components (Admin, Absen, Jadwal) langsung refresh data seketika
    window.dispatchEvent(new CustomEvent('app:pull-to-refresh'));

    // 2. Jalankan reload server Next.js App Router
    router.refresh();

    // Selesaikan animasi visual
    setTimeout(() => {
      setIsRefreshing(false);
      setPullY(0);
      wheelAccumulatorRef.current = 0;
    }, 750);
  }, [router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // ==========================================
    // 1. TOUCH EVENT (HP, Tablet, WebView APK Android)
    // ==========================================
    const handleTouchStart = (e: TouchEvent) => {
      if (getScrollTop() <= 5 && !isRefreshing && e.touches.length === 1) {
        startYRef.current = e.touches[0].clientY;
        isDraggingTouchRef.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingTouchRef.current || isRefreshing || e.touches.length === 0) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - startYRef.current;

      if (diff > 0 && getScrollTop() <= 5) {
        const boundedY = Math.min(diff * 0.55, MAX_PULL);
        setPullY(boundedY);

        if (diff > 12 && e.cancelable) {
          e.preventDefault();
        }
      } else {
        setPullY(0);
      }
    };

    const handleTouchEnd = () => {
      if (!isDraggingTouchRef.current) return;
      isDraggingTouchRef.current = false;

      if (pullY >= PULL_THRESHOLD && !isRefreshing) {
        triggerRefresh();
      } else {
        setPullY(0);
      }
    };

    // ==========================================
    // 2. WHEEL EVENT (Touchpad Laptop 2 Jari / Scroll di bagian atas)
    // ==========================================
    const handleWheel = (e: WheelEvent) => {
      if (isRefreshing) return;

      if (getScrollTop() <= 5 && e.deltaY < 0) {
        const added = Math.abs(e.deltaY) * 0.45;
        wheelAccumulatorRef.current = Math.min(wheelAccumulatorRef.current + added, MAX_PULL);
        setPullY(wheelAccumulatorRef.current);

        if (wheelResetTimerRef.current) {
          clearTimeout(wheelResetTimerRef.current);
        }

        if (wheelAccumulatorRef.current >= PULL_THRESHOLD) {
          wheelResetTimerRef.current = setTimeout(() => {
            triggerRefresh();
          }, 150);
        } else {
          wheelResetTimerRef.current = setTimeout(() => {
            wheelAccumulatorRef.current = 0;
            setPullY(0);
          }, 300);
        }
      } else if (e.deltaY > 0 && !isRefreshing) {
        wheelAccumulatorRef.current = 0;
        setPullY(0);
      }
    };

    // ==========================================
    // 3. MOUSE DRAG EVENT (Klik & Tarik di Desktop)
    // ==========================================
    const handleMouseDown = (e: MouseEvent) => {
      if (getScrollTop() <= 5 && e.clientY <= 80 && !isRefreshing && e.button === 0) {
        startYRef.current = e.clientY;
        isDraggingMouseRef.current = true;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingMouseRef.current || isRefreshing) return;
      const diff = e.clientY - startYRef.current;
      if (diff > 0 && getScrollTop() <= 5) {
        setPullY(Math.min(diff * 0.55, MAX_PULL));
      } else {
        setPullY(0);
      }
    };

    const handleMouseUp = () => {
      if (!isDraggingMouseRef.current) return;
      isDraggingMouseRef.current = false;
      if (pullY >= PULL_THRESHOLD && !isRefreshing) {
        triggerRefresh();
      } else {
        setPullY(0);
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);

    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);

      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      if (wheelResetTimerRef.current) {
        clearTimeout(wheelResetTimerRef.current);
      }
    };
  }, [isRefreshing, pullY, triggerRefresh]);

  if (pullY === 0 && !isRefreshing) return null;

  const isTriggered = pullY >= PULL_THRESHOLD;
  const rotationDegrees = Math.min((pullY / PULL_THRESHOLD) * 360, 360);

  return (
    <div
      className="fixed left-0 right-0 z-50 flex justify-center pointer-events-none transition-transform duration-150 ease-out"
      style={{
        top: 10,
        transform: `translateY(${pullY}px)`,
      }}
    >
      <div
        className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg border backdrop-blur-md transition-all ${
          isRefreshing
            ? 'bg-blue-600 text-white border-blue-500 shadow-blue-500/25 scale-100'
            : isTriggered
            ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-500/25 scale-105'
            : 'bg-white/95 text-slate-700 border-slate-200/90 shadow-slate-900/10 scale-95'
        }`}
      >
        <RefreshCw
          className={`w-4 h-4 shrink-0 transition-transform ${
            isRefreshing ? 'animate-spin' : ''
          }`}
          style={{
            transform: isRefreshing ? undefined : `rotate(${rotationDegrees}deg)`,
          }}
        />
        <span className="text-xs font-heading font-bold select-none">
          {isRefreshing
            ? 'Memperbarui data...'
            : isTriggered
            ? 'Lepas untuk refresh'
            : 'Tarik ke bawah untuk refresh'}
        </span>
      </div>
    </div>
  );
}
