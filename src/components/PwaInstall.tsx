import { useEffect, useState } from 'react';

// Small component that listens for the beforeinstallprompt event and exposes
// a button to trigger the browser install prompt. Useful for testing PWA on
// desktop during local development.
export default function PwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onBeforeInstall(e: any) {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    }

    function onAppInstalled() {
      setDeferredPrompt(null);
      setVisible(false);
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall as EventListener);
    window.addEventListener('appinstalled', onAppInstalled as EventListener);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall as EventListener);
      window.removeEventListener('appinstalled', onAppInstalled as EventListener);
    };
  }, []);

  if (!visible) return null;

  return (
    <div style={{ position: 'fixed', right: 12, bottom: 84, zIndex: 9999 }}>
      <button
        onClick={async () => {
          try {
            if (!deferredPrompt) return;
            // Show the native install prompt
            deferredPrompt.prompt();
            const choice = await deferredPrompt.userChoice;
            // Hide UI regardless of choice
            setVisible(false);
            setDeferredPrompt(null);
            // optionally log the choice
            // console.log('PWA install choice', choice);
          } catch (e) {
            setVisible(false);
            setDeferredPrompt(null);
          }
        }}
        style={{
          background: '#0f1724',
          color: '#fff',
          border: 'none',
          padding: '10px 14px',
          borderRadius: 8,
          boxShadow: '0 6px 18px rgba(2,6,23,0.3)'
        }}
      >
        Install TLDRWire
      </button>
    </div>
  );
}
