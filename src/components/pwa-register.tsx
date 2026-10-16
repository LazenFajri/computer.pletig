'use client';

import { useEffect } from 'react';
import OfflineIndicator from '@/components/offline-indicator';

export default function PwaRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js', { scope: '/' })
          .then((registration) => {
            // Cek update berkala
            registration.onupdatefound = () => {
              const installingWorker = registration.installing;
              if (installingWorker) {
                installingWorker.onstatechange = () => {
                  if (installingWorker.state === 'installed') {
                    if (navigator.serviceWorker.controller) {
                      console.log('[SW] Versi baru aplikasi tersedia dan dicache.');
                    }
                  }
                };
              }
            };
          })
          .catch((err) => {
            console.warn('[SW] Service Worker registration failed:', err);
          });
      });
    }
  }, []);

  return <OfflineIndicator />;
}
