import React, { ReactNode, useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
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
        <header>
          <h2>{title}</h2>
          <button 
            className="close-btn secondary" 
            type="button" 
            onClick={onClose}
            aria-label="Close modal"
          >
            ✖
          </button>
        </header>
        <div className="content">
          {children}
        </div>
      </div>
    </div>
  );
}