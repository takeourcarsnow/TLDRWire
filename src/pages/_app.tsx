import { AppProps } from 'next/app';
import Head from 'next/head';
import Script from 'next/script';
import { useEffect, useState } from 'react';
import '../../styles/globals.css';
// Layout debugger removed
import LogoLoader from '../components/LogoLoader';

export default function App({ Component, pageProps }: AppProps) {
  const [loading, setLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    // Show loader for 1.5 seconds, then fade out over 0.5 seconds
    const timer = setTimeout(() => {
      setLoading(false);
      setTimeout(() => setShowLoader(false), 500); // Remove after fade
    }, 1500);
  }, []);

  // Toggle a body-level class while the loader is visible so portal-mounted
  // elements (like BottomNavbar) can be hidden via CSS even though they are
  // rendered outside the app root.
  useEffect(() => {
    try {
      if (showLoader) {
        document.body.classList.add('loader-active');
      } else {
        document.body.classList.remove('loader-active');
      }
    } catch (e) {
      // ignore when document isn't available (SSR)
    }
    return () => {
      try { document.body.classList.remove('loader-active'); } catch (e) {}
    };
  }, [showLoader]);
  // Keep main app mounted while loader is visible so content can load in background.
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="dark light" />
        <meta name="theme-color" content="#4da3ff" />
        <link
          rel="icon"
          type="image/svg+xml"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📰</text></svg>"
        />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="TLDRWire" />
      </Head>
      
      {/* Ensure theme is set before hydration so the loader image matches the
          chosen theme immediately. This script runs before React boots. */}
      <Script
        id="set-theme"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: `(() => {
          try {
            const saved = localStorage.getItem('tldrwire:theme');
            if (saved === 'dark' || saved === 'light') {
              document.documentElement.setAttribute('data-theme', saved);
              return;
            }
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
          } catch (e) { /* ignore */ }
        })();` }}
      />

      {/* Always mount the main app so data fetching, scripts and components
          initialize while the loader overlay is visible. The loader is an
          overlay (`.logo-loader`) with high z-index so it sits above the UI.
          We keep `LogoLoader` mounted while `showLoader` is true and remove it
          after the fade completes. The content receives a fade-in class so
          it transitions once the loader is removed. */}
      <div className={showLoader ? 'app-hidden-under-loader' : 'content-fade-in'} aria-hidden={showLoader}>
        <Component {...pageProps} />
      </div>

      {showLoader && <LogoLoader hidden={!loading} />}

      {/* Markdown rendering + sanitization */}
      <Script 
        src="https://cdn.jsdelivr.net/npm/marked@12/marked.min.js" 
        strategy="afterInteractive" 
      />
      <Script 
        src="https://cdn.jsdelivr.net/npm/dompurify@3.1.7/dist/purify.min.js" 
        strategy="afterInteractive" 
      />
      
      <noscript>
        <div style={{
          background: '#fffae6',
          color: '#663c00',
          padding: '10px 16px',
          textAlign: 'center',
          borderBottom: '1px solid #e2e8f0'
        }}>
          This app requires JavaScript to run. Please enable JavaScript.
        </div>
      </noscript>
      
  {/* Layout debugger removed */}
    </>
  );
}