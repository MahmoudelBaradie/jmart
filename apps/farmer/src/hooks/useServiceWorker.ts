'use client';
import { useEffect } from 'react';

export function useServiceWorker() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('[SW] registered:', reg.scope))
        .catch((err) => console.warn('[SW] failed:', err));
    }
  }, []);
}
