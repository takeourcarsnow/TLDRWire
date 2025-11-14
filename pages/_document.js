import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Preload critical resources */}
        <link
          rel="preload"
          href="/logo.svg"
          as="image"
          type="image/svg+xml"
        />
        <link
          rel="dns-prefetch"
          href="//fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* Inline theme initializer + critical loader styles to avoid FOUC */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var s=localStorage.getItem('tldrwire:theme'); if(s==='dark'||s==='light'){document.documentElement.setAttribute('data-theme',s);return;} var m=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches; document.documentElement.setAttribute('data-theme', m ? 'dark' : 'light');}catch(e){} })();` }} />
        {/* Critical theme initializer kept; loader styles removed */}
        <meta name="color-scheme" content="dark light" />
        <meta name="theme-color" content="#4da3ff" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link rel="manifest" href="/manifest.webmanifest" />
  {/* Favicons and touch icons */}
  <link rel="icon" type="image/svg+xml" href="/logo.svg" />
  <link rel="alternate icon" href="/favicon.ico" />
  <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="TLDRWire" />
      </Head>
      <body>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}