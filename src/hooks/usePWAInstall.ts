import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (typeof window !== 'undefined') {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInWebAppiOS = (window.navigator as any).standalone === true;
      setIsInstalled(isStandalone || isInWebAppiOS);
      console.log('PWA Install Check - isStandalone:', isStandalone, 'isInWebAppiOS:', isInWebAppiOS, 'isInstalled:', isStandalone || isInWebAppiOS);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('PWA: beforeinstallprompt event fired');
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      console.log('PWA: appinstalled event fired');
      // Hide the install button
      setIsInstallable(false);
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.addEventListener('appinstalled', handleAppInstalled);

      // Check if app is already installed (for browsers that don't fire appinstalled)
      const checkInstalled = () => {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
        const isInWebAppiOS = (window.navigator as any).standalone === true;
        if (isStandalone || isInWebAppiOS) {
          setIsInstalled(true);
          setIsInstallable(false);
          console.log('PWA: App detected as already installed');
        }
      };

      // Check immediately and after a short delay
      checkInstalled();
      setTimeout(checkInstalled, 1000);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
      }
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) {
      console.warn('No deferred prompt available');
      return;
    }

    try {
      // Show the install prompt
      await deferredPrompt.prompt();

      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;

      // Reset the deferred prompt
      setDeferredPrompt(null);
      setIsInstallable(false);

      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
        setIsInstalled(true);
      } else {
        console.log('User dismissed the install prompt');
      }
    } catch (error) {
      console.error('Error during PWA installation:', error);
    }
  };

  return {
    isInstallable,
    isInstalled,
    installApp,
    hasDeferredPrompt: !!deferredPrompt
  };
}