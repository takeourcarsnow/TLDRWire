import React, { ReactNode, useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  headerRight?: ReactNode;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, title, headerRight, children }: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="modal-backdrop" 
      aria-hidden={!isOpen}
      role="dialog" 
      aria-modal="true" 
      onClick={handleBackdropClick}
    >
      <div className="modal" role="document">
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ margin: 0 }}>{title}</h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* optional header actions placed to the left of the close button */}
            {headerRight}
            <button
              className="close-btn secondary"
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              style={{ padding: '6px 10px' }}
            >
              ✖
            </button>
          </div>
        </header>
        <div className="content">
          {children}
        </div>
      </div>
    </div>
  );
}