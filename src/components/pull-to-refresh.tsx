'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

const PULL_THRESHOLD = 65; // Jarak tarik dalam pixel untuk memicu refresh
const MAX_PULL = 110; // Batas maksimal visual tarikan

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
    setPullY(55); // Tahan indikator di posisi visual yang nyaman

    // Getaran haptic ringan jika didukung browser / HP
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(25);
      } catch {
        // Abaikan
      }
    }

    // Jalankan reload data server Next.js App Router
    router.refresh();

    // Selesaikan animasi
    setTimeout(() => {
      setIsRefreshing(false);
      setPullY(0);
      wheelAccumulatorRef.current = 0;
    }, 850);
  }, [router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // ==========================================
    // 1. TOUCH EVENT (HP, Tablet, WebView APK Android)
    // ==========================================
    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY <= 0 && !isRefreshing) {
        startYRef.current = e.touches[0].clientY;
        isDraggingTouchRef.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingTouchRef.current || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - startYRef.current;

      if (diff > 0 && window.scrollY <= 0) {
        const boundedY = Math.min(diff * 0.45, MAX_PULL);
        setPullY(boundedY);

        if (diff > 15 && e.cancelable) {
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
    // 2. WHEEL EVENT (Touchpad Laptop 2 Jari & Mouse Wheel di atas)
    // ==========================================
    const handleWheel = (e: WheelEvent) => {
      if (isRefreshing) return;

      // Saat posisi scroll berada di paling atas dan user swipe 2 jari ke bawah (scroll up / pull down: deltaY < 0)
      if (window.scrollY <= 0 && e.deltaY < 0) {
        const added = Math.abs(e.deltaY) * 0.4;
        wheelAccumulatorRef.current = Math.min(wheelAccumulatorRef.current + added, MAX_PULL);
        setPullY(wheelAccumulatorRef.current);

        if (wheelResetTimerRef.current) {
          clearTimeout(wheelResetTimerRef.current);
        }

        // Jika tarikan sudah melewati ambang batas
        if (wheelAccumulatorRef.current >= PULL_THRESHOLD) {
          wheelResetTimerRef.current = setTimeout(() => {
            triggerRefresh();
          }, 180);
        } else {
          // Jika berhenti sebelum batas, kembalikan ke atas
          wheelResetTimerRef.current = setTimeout(() => {
            wheelAccumulatorRef.current = 0;
            setPullY(0);
          }, 350);
        }
      } else if (e.deltaY > 0 && !isRefreshing) {
        // Jika user scroll ke bawah normal, sembunyikan indikator
        wheelAccumulatorRef.current = 0;
        setPullY(0);
      }
    };

    // ==========================================
    // 3. MOUSE DRAG EVENT (Klik & Tarik dari Atas di Desktop)
    // ==========================================
    const handleMouseDown = (e: MouseEvent) => {
      if (window.scrollY <= 0 && e.clientY <= 70 && !isRefreshing && e.button === 0) {
        startYRef.current = e.clientY;
        isDraggingMouseRef.current = true;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingMouseRef.current || isRefreshing) return;
      const diff = e.clientY - startYRef.current;
      if (diff > 0 && window.scrollY <= 0) {
        setPullY(Math.min(diff * 0.45, MAX_PULL));
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

  // Jika tidak sedang ditarik dan tidak refreshing, jangan render apa-apa
  if (pullY === 0 && !isRefreshing) return null;

  const isTriggered = pullY >= PULL_THRESHOLD;
  const rotationDegrees = Math.min((pullY / PULL_THRESHOLD) * 360, 360);

  return (
    <div
      className="fixed left-0 right-0 z-50 flex justify-center pointer-events-none transition-transform duration-100 ease-out"
      style={{
        top: 0,
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
            : 'Tarik untuk refresh'}
        </span>
      </div>
    </div>
  );
}
