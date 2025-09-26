import React, { useEffect } from 'react';

type ToastType = 'info' | 'success' | 'warning' | 'danger';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number; // ms
  onClose: () => void;
}

export default function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => onClose(), duration);
    return () => clearTimeout(t);
  }, [message, duration, onClose]);

  if (!message) return null;

  return (
    <div className={`toast toast-${type} fade-in`} role="status" aria-live="polite">
      <div className="toast-message">{message}</div>
      <button className="toast-close secondary" aria-label="Dismiss" onClick={onClose}>
        ×
      </button>
    </div>
  );
}
