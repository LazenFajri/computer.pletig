'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, CheckCircle2 } from 'lucide-react';

const PULL_THRESHOLD = 38; // Ambang batas tarikan visual yang responsif
const MAX_PULL = 78; // Batas maksimum tarikan visual

function getScrollTop(): number {
  if (typeof window === 'undefined') return 0;
  return window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
}

export default function PullToRefresh() {
  const router = useRouter();
  const [pullY, setPullY] = useState(0);
  const [refreshState, setRefreshState] = useState<'idle' | 'pulling' | 'refreshing' | 'success'>('idle');

  const pullYRef = useRef(0);
  const startYRef = useRef(0);
  const isDraggingTouchRef = useRef(false);
  const isDraggingMouseRef = useRef(false);
  const isRefreshingRef = useRef(false);
  const wheelAccumulatorRef = useRef(0);
  const wheelTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sinkronisasi state dan ref agar event handler selalu membaca nilai terbaru
  const updatePullY = useCallback((val: number) => {
    pullYRef.current = val;
    setPullY(val);
  }, []);

  const triggerRefresh = useCallback(() => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    setRefreshState('refreshing');
    updatePullY(50); // Tahan indikator di posisi visual yang nyaman

    // Haptic feedback getaran ringan di ponsel jika didukung
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([25, 40, 25]);
      } catch {
        // Abaikan
      }
    }

    // 1. Dispatch event custom agar Client Components (Admin, Absen, Jadwal) memuat data segar seketika
    window.dispatchEvent(new CustomEvent('app:pull-to-refresh'));

    // 2. Jalankan reload server Next.js App Router
    router.refresh();

    // Tahan visual loading 950ms agar user merasa proses refresh benar-benar tuntas
    setTimeout(() => {
      // 3. Tampilkan status sukses "Data berhasil diperbarui ✓"
      setRefreshState('success');

      setTimeout(() => {
        // 4. Tutup animasi visual secara halus ke atas
        updatePullY(0);
        setTimeout(() => {
          isRefreshingRef.current = false;
          setRefreshState('idle');
          wheelAccumulatorRef.current = 0;
        }, 300);
      }, 550);
    }, 950);
  }, [router, updatePullY]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // ==========================================
    // 1. TOUCH EVENTS (Ponsel & Tablet)
    // ==========================================
    const handleTouchStart = (e: TouchEvent) => {
      if (isRefreshingRef.current) return;
      if (getScrollTop() <= 2 && e.touches.length === 1) {
        startYRef.current = e.touches[0].clientY;
        isDraggingTouchRef.current = true;
      } else {
        isDraggingTouchRef.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingTouchRef.current || isRefreshingRef.current || e.touches.length === 0) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - startYRef.current;

      // Jika user menggeser ke atas (scroll ke bawah halaman), batalkan pull
      if (diff <= 0) {
        if (pullYRef.current > 0) {
          updatePullY(0);
          setRefreshState('idle');
        }
        return;
      }

      // Hanya jalankan pull jika user berada di paling atas halaman
      if (getScrollTop() <= 2) {
        const bounded = Math.min(diff * 0.52, MAX_PULL);
        updatePullY(bounded);
        setRefreshState('pulling');

        // Cegah overscroll browser jika sedang menarik ke bawah
        if (diff > 10 && e.cancelable) {
          e.preventDefault();
        }
      } else {
        isDraggingTouchRef.current = false;
        updatePullY(0);
        setRefreshState('idle');
      }
    };

    const handleTouchEnd = () => {
      if (!isDraggingTouchRef.current) return;
      isDraggingTouchRef.current = false;

      // Gunakan ref untuk evaluasi jarak aktual tarikan
      if (pullYRef.current >= PULL_THRESHOLD && !isRefreshingRef.current) {
        triggerRefresh();
      } else {
        updatePullY(0);
        setRefreshState('idle');
      }
    };

    // ==========================================
    // 2. MOUSE DRAG EVENTS (Laptop / Desktop Testing)
    // ==========================================
    const handleMouseDown = (e: MouseEvent) => {
      if (isRefreshingRef.current) return;
      // Hanya izinkan drag mouse jika klik di area atas (Y <= 120px) saat posisi scrollTop <= 2
      if (getScrollTop() <= 2 && e.clientY <= 120 && e.button === 0) {
        startYRef.current = e.clientY;
        isDraggingMouseRef.current = true;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingMouseRef.current || isRefreshingRef.current) return;
      const diff = e.clientY - startYRef.current;

      if (diff > 0 && getScrollTop() <= 2) {
        const bounded = Math.min(diff * 0.52, MAX_PULL);
        updatePullY(bounded);
        setRefreshState('pulling');
      } else {
        updatePullY(0);
        setRefreshState('idle');
      }
    };

    const handleMouseUp = () => {
      if (!isDraggingMouseRef.current) return;
      isDraggingMouseRef.current = false;

      if (pullYRef.current >= PULL_THRESHOLD && !isRefreshingRef.current) {
        triggerRefresh();
      } else {
        updatePullY(0);
        setRefreshState('idle');
      }
    };

    // ==========================================
    // 3. WHEEL / TOUCHPAD GESTURE (Dua Jari ke Atas di Puncak Layar)
    // ==========================================
    const handleWheel = (e: WheelEvent) => {
      if (isRefreshingRef.current) return;

      // Scroll ke bawah: reset akumulator seketika agar tidak menghambat scroll halaman
      if (e.deltaY > 0) {
        if (wheelAccumulatorRef.current > 0) {
          wheelAccumulatorRef.current = 0;
          updatePullY(0);
          setRefreshState('idle');
        }
        return;
      }

      // Hanya jika deltaY negatif (scroll ke atas) saat posisi di paling atas
      if (getScrollTop() <= 1 && e.deltaY < 0) {
        const delta = Math.min(Math.abs(e.deltaY) * 0.35, 25);
        wheelAccumulatorRef.current = Math.min(wheelAccumulatorRef.current + delta, MAX_PULL);
        updatePullY(wheelAccumulatorRef.current);
        setRefreshState('pulling');

        if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);

        if (wheelAccumulatorRef.current >= PULL_THRESHOLD) {
          wheelTimerRef.current = setTimeout(() => {
            triggerRefresh();
          }, 120);
        } else {
          // Timer reset yang manusiawi (650ms agar tidak hilang seketika)
          wheelTimerRef.current = setTimeout(() => {
            wheelAccumulatorRef.current = 0;
            updatePullY(0);
            setRefreshState('idle');
          }, 650);
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);

      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('wheel', handleWheel);

      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
    };
  }, [triggerRefresh, updatePullY]);

  if (pullY === 0 && refreshState === 'idle') return null;

  const isTriggered = pullY >= PULL_THRESHOLD;
  const rotationDegrees = Math.min((pullY / PULL_THRESHOLD) * 360, 360);

  return (
    <div
      className="fixed left-0 right-0 z-50 flex justify-center pointer-events-none transition-all duration-200 ease-out"
      style={{
        top: 12,
        transform: `translateY(${pullY}px)`,
        opacity: pullY > 4 ? 1 : 0,
      }}
    >
      <div
        className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-xl border backdrop-blur-md transition-all duration-200 ${
          refreshState === 'success'
            ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/30 scale-100'
            : refreshState === 'refreshing'
            ? 'bg-purple-600 text-white border-purple-500 shadow-purple-600/30 scale-100'
            : isTriggered
            ? 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-600/30 scale-105'
            : 'bg-white/95 text-slate-800 border-slate-200 shadow-slate-900/15 scale-95'
        }`}
      >
        {refreshState === 'success' ? (
          <CheckCircle2 className="w-4 h-4 text-white shrink-0 animate-in zoom-in-75 duration-200" />
        ) : (
          <RefreshCw
            className={`w-4 h-4 shrink-0 transition-transform ${
              refreshState === 'refreshing' ? 'animate-spin' : ''
            }`}
            style={{
              transform: refreshState === 'refreshing' ? undefined : `rotate(${rotationDegrees}deg)`,
            }}
          />
        )}
        <span className="text-xs font-heading font-bold select-none tracking-tight">
          {refreshState === 'success'
            ? 'Data berhasil diperbarui ✓'
            : refreshState === 'refreshing'
            ? 'Memperbarui data...'
            : isTriggered
            ? 'Lepas untuk perbarui'
            : 'Tarik ke bawah untuk refresh'}
        </span>
      </div>
    </div>
  );
}
