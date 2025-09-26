import { AppProps } from 'next/app';
import Head from 'next/head';
import Script from 'next/script';
import { useEffect } from 'react';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Production-only diagnostic: fetch the manifest and log status/headers.
    // Helps debug 401/403 issues on hosted deployments (Vercel).
    try {
      // Only run the manifest diagnostic in production when explicitly enabled
      // via NEXT_PUBLIC_ENABLE_MANIFEST_DIAGNOSTIC. This avoids extra fetches
      // from every page load on hosted deployments unless the owner opts in.
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_ENABLE_MANIFEST_DIAGNOSTIC === 'true') {
        (async () => {
          try {
            const res = await fetch('/manifest.webmanifest', { credentials: 'omit' });
            console.log('🔎 manifest fetch status:', res.status, res.statusText);
            try {
              // Convert headers to array for readable console output
              const headers = Array.from(res.headers.entries());
              console.log('🔎 manifest response headers:', headers);
            } catch (hErr) {
              console.warn('🔎 Could not read manifest headers', hErr);
            }
            if (res.ok) {
              const text = await res.text();
              console.log('🔎 manifest body length:', text.length);
            } else {
              console.warn('🔎 manifest fetch not ok');
            }
          } catch (err) {
            console.warn('🔎 manifest fetch error:', err);
          }
        })();
      }
    } catch (err) {
      // swallow any unexpected errors in diagnostic code
      console.warn('manifest diagnostic setup error', err);
    }
  }, []);
  return (
    <>
      <Head>
        {/*
          In development, if the app previously registered a service worker it can
          intercept dev HMR requests and API calls causing repeated network traffic
          and full reloads. If SW is disabled (default) unregister any existing SWs
          as early as possible using an inline script so it doesn't block HMR.
        */}
        {process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_ENABLE_SW !== 'true' && (
          // Register a small no-op dev service worker to replace any previously
          // installed worker that might be intercepting HMR. The dev SW is a
          // passthrough and explicitly ignores /_next/ so it won't interfere
          // with Next.js hot-update.json requests.
          <Script id="register-dev-sw" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: `(function(){try{if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(r=>{r.forEach(reg=>{try{reg.unregister();}catch(e){}})}).catch(()=>{}).finally(function(){try{navigator.serviceWorker.register('/dev-sw.js').catch(()=>{});}catch(e){}});} }catch(e){} })();` }} />
        )}
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
      
      <Component {...pageProps} />
    </>
  );
}