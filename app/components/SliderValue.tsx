import React, { useState, useEffect } from 'react';

interface SliderValueProps {
  value: string | number;
  min: number;
  max: number;
  dragging: boolean;
  displayValue?: string | number;
}

export const SliderValue: React.FC<SliderValueProps> = ({ value, min, max, dragging, displayValue }) => {
  const [show, setShow] = useState(dragging);

  useEffect(() => {
    if (dragging) {
      setShow(true);
    } else {
      const timer = setTimeout(() => setShow(false), 300); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [dragging]);

  if (!show) return null;

  const percentage = ((Number(value) - min) / (max - min)) * 100;

  return (
    <div
      className="slider-value"
      style={{
        position: 'absolute',
        left: `${percentage}%`,
        top: '-20px',
        transform: 'translateX(-50%)',
        background: 'var(--panel)',
        color: 'var(--text)',
        padding: '2px 6px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: '500',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        border: '1px solid var(--border)',
        boxShadow: '0 2px 8px var(--shadow)',
        opacity: dragging ? 1 : 0,
        transition: 'opacity 0.3s ease-out'
      }}
    >
      {displayValue !== undefined ? displayValue : value}
    </div>
  );
};