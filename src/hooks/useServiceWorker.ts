import { useEffect } from 'react';

export function useServiceWorker() {
  useEffect(() => {
    // Service worker registration (disabled by default to avoid background SW activity).
    // To enable, set NEXT_PUBLIC_ENABLE_SW=true in your environment.
    if (process.env.NEXT_PUBLIC_ENABLE_SW !== 'true') {
      // Intentionally do not register the SW to avoid background work on idle sites.
      console.log('Service Worker registration skipped (NEXT_PUBLIC_ENABLE_SW not set).');
      // If a service worker was registered previously (from earlier deploys), unregister it
      // so it stops intercepting requests (this helps remove repeated background fetches).
      try {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(regs => {
            regs.forEach(r => {
              try { r.unregister(); } catch (e) {}
            });
          }).catch(() => {});
        }
      } catch (e) {}
      return;
    }

    if ('serviceWorker' in navigator) {
      // Avoid duplicate registration/logs in development (React StrictMode mounts twice).
      (async () => {
        try {
          const existing = await navigator.serviceWorker.getRegistration('/sw.js');
          if (existing) {
            console.log('\u2705 Service Worker already registered');
            return;
          }
          try {
            await navigator.serviceWorker.register('/sw.js');
            console.log('\u2705 Service Worker registered successfully');
          } catch (error) {
            console.warn('Service Worker registration failed:', error);
          }
        } catch (err) {
          // Fallback: attempt registration if getRegistration fails for some reason
          try {
            await navigator.serviceWorker.register('/sw.js');
            console.log('\u2705 Service Worker registered successfully');
          } catch (error) {
            console.warn('Service Worker registration failed:', error);
          }
        }
      })();
    }
  }, []);
}