'use client';

import { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export default function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    // Cek status koneksi awal
    if (typeof navigator !== 'undefined') {
      setIsOffline(!navigator.onLine);
    }

    const handleOffline = () => {
      setIsOffline(true);
      setShowReconnected(false);
    };

    const handleOnline = () => {
      setIsOffline(false);
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, 3500);
      return () => clearTimeout(timer);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!isOffline && !showReconnected) {
    return null;
  }

  return (
    <div className="fixed top-2 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none animate-in fade-in slide-in-from-top-2 duration-300">
      {isOffline && (
        <div className="pointer-events-auto flex items-center gap-2 bg-amber-500/95 backdrop-blur-md text-amber-950 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-lg border border-amber-300/60 transition-all">
          <WifiOff className="w-3.5 h-3.5 text-amber-950 animate-pulse" />
          <span>Mode Offline — Menggunakan data tersimpan</span>
        </div>
      )}

      {showReconnected && !isOffline && (
        <div className="pointer-events-auto flex items-center gap-2 bg-emerald-600/95 backdrop-blur-md text-white px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-lg border border-emerald-400/60 transition-all">
          <Wifi className="w-3.5 h-3.5 text-white" />
          <span>Online — Terhubung kembali ke server</span>
        </div>
      )}
    </div>
  );
}
