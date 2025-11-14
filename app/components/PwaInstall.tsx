import { useEffect, useState } from 'react';
import { Modal } from './Modal';

// Small component that listens for the beforeinstallprompt event and exposes
// a modal to trigger the browser install prompt. Useful for testing PWA on
// desktop during local development.
export default function PwaInstall({ loaderDone }: { loaderDone: boolean }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onBeforeInstall(e: any) {
      e.preventDefault();
      setDeferredPrompt(e);
      if (loaderDone) {
        setVisible(true);
      }
    }

    function onAppInstalled() {
      setDeferredPrompt(null);
      setVisible(false);
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall as any);
    window.addEventListener('appinstalled', onAppInstalled as any);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall as any);
      window.removeEventListener('appinstalled', onAppInstalled as any);
    };
  }, [loaderDone]);

  useEffect(() => {
    if (deferredPrompt && loaderDone && !visible) {
      setVisible(true);
    }
  }, [deferredPrompt, loaderDone, visible]);

  const handleInstall = async () => {
    try {
      if (!deferredPrompt) return;
      // Show the native install prompt
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      // Hide modal regardless of choice
      setVisible(false);
      setDeferredPrompt(null);
      // optionally log the choice
      // console.log('PWA install choice', choice);
    } catch (e) {
      setVisible(false);
      setDeferredPrompt(null);
    }
  };

  const handleClose = () => {
    setVisible(false);
  };

  return (
    <Modal
      isOpen={visible}
      onClose={handleClose}
      title=""
      showCloseButton={false}
    >
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ margin: '0 0 20px 0', fontSize: '24px', fontWeight: 'bold' }}>Install TLDRWire</h2>
        <img
          src="/logo.png"
          alt="TLDRWire logo"
          style={{ width: '80px', height: '80px', borderRadius: '12px', marginBottom: '20px' }}
        />
        <p>Install TLDRWire as an app for a faster, more immersive experience. Access it directly from your home screen!</p>
      </div>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
        <button
          onClick={handleClose}
          style={{
            background: 'transparent',
            color: '#64748b',
            border: '1px solid #64748b',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Not Now
        </button>
        <button
          onClick={handleInstall}
          style={{
            background: '#0f1724',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Install
        </button>
      </div>
    </Modal>
  );
}
