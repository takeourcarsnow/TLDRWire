import React, { ReactNode, useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  headerRight?: ReactNode;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, title, headerRight, children }: ModalProps) {
  const modalRef = React.useRef<HTMLDivElement | null>(null);
  const previouslyFocused = React.useRef<HTMLElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
      if (e.key === 'Tab' && isOpen && modalRef.current) {
        // simple focus trap
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    if (isOpen) {
      previouslyFocused.current = document.activeElement as HTMLElement | null;
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);
      // focus the modal container for screen readers
      setTimeout(() => {
        modalRef.current?.focus();
        const firstBtn = modalRef.current?.querySelector<HTMLElement>('button:not([disabled])');
        if (firstBtn) firstBtn.focus();
      }, 0);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocused.current) previouslyFocused.current.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const titleId = `modal-title-${Math.random().toString(36).slice(2, 9)}`;

  return (
    <div
      className="modal-backdrop"
      aria-hidden={!isOpen}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={handleBackdropClick}
    >
      <div ref={modalRef} className="modal" role="document" tabIndex={-1}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 id={titleId} style={{ margin: 0 }}>{title}</h2>
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