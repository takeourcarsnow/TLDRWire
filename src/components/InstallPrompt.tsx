import React from 'react';
import { Download, X, Smartphone } from 'lucide-react';

interface InstallPromptProps {
  isVisible: boolean;
  onInstall: () => void;
  onDismiss: () => void;
  hasDeferredPrompt?: boolean;
}

export function InstallPrompt({ isVisible, onInstall, onDismiss, hasDeferredPrompt = true }: InstallPromptProps) {
  if (!isVisible) return null;

  const isIOS = typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = typeof window !== 'undefined' && /Android/.test(navigator.userAgent);

  if (isIOS) {
    // iOS doesn't support beforeinstallprompt, show manual instructions
    return (
      <div className="install-prompt-overlay">
        <div className="install-prompt">
          <button
            className="install-prompt-close"
            onClick={onDismiss}
            aria-label="Close install prompt"
          >
            <X size={20} />
          </button>

          <div className="install-prompt-content">
            <div className="install-prompt-icon">
              📱
            </div>
            <div className="install-prompt-text">
              <h3>Install TLDRWire on iOS</h3>
              <p>Tap the share button <Smartphone size={16} style={{display: 'inline'}} /> below, then &quot;Add to Home Screen&quot;</p>
            </div>
          </div>

          <button
            className="install-prompt-button"
            onClick={onDismiss}
          >
            Got it
          </button>
        </div>
      </div>
    );
  }

  if (isAndroid && !hasDeferredPrompt) {
    // Android but no deferred prompt (perhaps dismissed before)
    return (
      <div className="install-prompt-overlay">
        <div className="install-prompt">
          <button
            className="install-prompt-close"
            onClick={onDismiss}
            aria-label="Close install prompt"
          >
            <X size={20} />
          </button>

          <div className="install-prompt-content">
            <div className="install-prompt-icon">
              📱
            </div>
              <div className="install-prompt-text">
              <h3>Install TLDRWire</h3>
              <p>Use your browser&#39;s menu to install the app</p>
            </div>
          </div>

          <button
            className="install-prompt-button"
            onClick={onDismiss}
          >
            OK
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="install-prompt-overlay">
      <div className="install-prompt">
        <button
          className="install-prompt-close"
          onClick={onDismiss}
          aria-label="Close install prompt"
        >
          <X size={20} />
        </button>

        <div className="install-prompt-content">
          <div className="install-prompt-icon">
            📰
          </div>
          <div className="install-prompt-text">
            <h3>Install TLDRWire</h3>
            <p>Get quick access to news summaries on your device</p>
          </div>
        </div>

        <button
          className="install-prompt-button"
          onClick={onInstall}
        >
          <Download size={18} />
          Install App
        </button>
      </div>
    </div>
  );
}