import { useState, useEffect } from 'react';

const RATE_LIMIT_SECONDS = 60;
const RATE_LIMIT_KEY = 'tldrwire:rateLimitExpires';

export function useRateLimit() {
  const [lastGenerateTime, setLastGenerateTime] = useState<number>(0);
  const [rateLimitCountdown, setRateLimitCountdown] = useState<number>(0);

  // Countdown timer effect
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_DISABLE_RATE_LIMIT && rateLimitCountdown > 0) {
      const timer = setTimeout(() => {
        setRateLimitCountdown((c) => {
          const next = Math.max(0, c - 1);
          try {
            if (next === 0) {
              localStorage.removeItem(RATE_LIMIT_KEY);
            }
          } catch (e) {}
          return next;
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [rateLimitCountdown]);

  // Restore rate limit state from localStorage on mount and sync across tabs
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_DISABLE_RATE_LIMIT) return;

    try {
      const raw = localStorage.getItem(RATE_LIMIT_KEY);
      if (raw) {
        const expires = Number(raw) || 0;
        const now = Date.now();
        if (expires > now) {
          const remaining = Math.ceil((expires - now) / 1000);
          setRateLimitCountdown(remaining);
          // set lastGenerateTime to the original generation time so generateSummary honor check
          setLastGenerateTime(expires - RATE_LIMIT_SECONDS * 1000);
        } else {
          localStorage.removeItem(RATE_LIMIT_KEY);
        }
      }
    } catch (e) {}

    const onStorage = (e: StorageEvent) => {
      if (e.key !== RATE_LIMIT_KEY) return;
      try {
        if (!e.newValue) {
          setRateLimitCountdown(0);
          setLastGenerateTime(0);
          return;
        }
        const expires = Number(e.newValue) || 0;
        const now = Date.now();
        if (expires > now) {
          const remaining = Math.ceil((expires - now) / 1000);
          setRateLimitCountdown(remaining);
          setLastGenerateTime(expires - RATE_LIMIT_SECONDS * 1000);
        } else {
          setRateLimitCountdown(0);
          setLastGenerateTime(0);
        }
      } catch (err) {}
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const startRateLimit = () => {
    if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_DISABLE_RATE_LIMIT) return;

    const now = Date.now();
    setLastGenerateTime(now);
    setRateLimitCountdown(RATE_LIMIT_SECONDS);
    try {
      const expires = now + RATE_LIMIT_SECONDS * 1000;
      localStorage.setItem(RATE_LIMIT_KEY, String(expires));
    } catch (e) {}
  };

  const isRateLimited = () => {
    if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_DISABLE_RATE_LIMIT) {
      return rateLimitCountdown > 0;
    }
    return false;
  };

  return {
    lastGenerateTime,
    rateLimitCountdown,
    startRateLimit,
    isRateLimited
  };
}