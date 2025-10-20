import React from 'react';
import { Download, X } from 'lucide-react';

interface InstallPromptProps {
  isVisible: boolean;
  onInstall: () => void;
  onDismiss: () => void;
}

export function InstallPrompt({ isVisible, onInstall, onDismiss }: InstallPromptProps) {
  if (!isVisible) return null;

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