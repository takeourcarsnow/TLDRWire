import { useEffect } from 'react';

export function usePerformanceMonitoring() {
  useEffect(() => {
    // Only run in production and browser
    if (typeof window === 'undefined' || process.env.NODE_ENV !== 'production') return;

    // Core Web Vitals tracking
    const reportWebVitals = (metric: any) => {
      // Send to analytics service if available
      console.log('Web Vital:', metric.name, metric.value);
    };

    // Track LCP (Largest Contentful Paint)
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'largest-contentful-paint') {
          reportWebVitals({
            name: 'LCP',
            value: entry.startTime,
            id: 'v3-' + Date.now() + '-' + Math.floor(Math.random() * 1000)
          });
        }
      }
    });

    try {
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      // LCP not supported
    }

    // Track FID (First Input Delay)
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        reportWebVitals({
          name: 'FID',
          value: (entry as any).processingStart - entry.startTime,
          id: 'v3-' + Date.now() + '-' + Math.floor(Math.random() * 1000)
        });
      }
    });

    try {
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      // FID not supported
    }

    // Track CLS (Cumulative Layout Shift)
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
    });

    try {
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      // CLS not supported
    }

    // Report CLS on page unload
    const reportCLS = () => {
      if (clsValue > 0) {
        reportWebVitals({
          name: 'CLS',
          value: clsValue,
          id: 'v3-' + Date.now() + '-' + Math.floor(Math.random() * 1000)
        });
      }
    };

    window.addEventListener('beforeunload', reportCLS);

    return () => {
      observer.disconnect();
      fidObserver.disconnect();
      clsObserver.disconnect();
      window.removeEventListener('beforeunload', reportCLS);
    };
  }, []);
}