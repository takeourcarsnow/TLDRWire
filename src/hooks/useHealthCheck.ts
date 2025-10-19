import { useEffect } from 'react';

export function useHealthCheck() {
  useEffect(() => {
    // Health check on mount - only run in non-localhost environments to avoid
    // repeated dev traffic (HMR / dev tools often re-request assets).
    try {
      const host = window.location.hostname;
      const isLocalhost = host === 'localhost' || host === '127.0.0.1' || host === '';
      if (!isLocalhost && (process.env.NEXT_PUBLIC_ENABLE_HEALTHZ === 'true')) {
        fetch('/api/healthz')
          .then(res => res.json())
          .then(health => {
            if (!health.hasKey) {
              console.warn('Server missing GEMINI_API_KEY. Add it to .env and restart.');
            }
          })
          .catch(error => {
            console.warn('Health check failed:', error);
          });
      }
    } catch (e) {
      // ignore in non-browser contexts
    }
  }, []);
}