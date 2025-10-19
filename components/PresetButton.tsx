import React from 'react';
import TwEmoji from './TwEmoji';
import { capitalizeLabel } from '../utils/carouselUtils';

interface PresetButtonProps {
  value: string;
  label?: string;
  icon?: string | React.ComponentType<any>;
  isSelected: boolean;
  onClick: () => void;
  suppressClickUntil: number;
  seg: number;
}

const PresetButton: React.FC<PresetButtonProps> = ({
  value,
  label,
  icon,
  isSelected,
  onClick,
  suppressClickUntil,
  seg
}) => {
  const iconSize = isSelected ? 36 : 28;

  return (
    <div
      className={`preset-button ${isSelected ? 'selected' : ''}`}
      onClick={() => {
        // Ignore clicks that immediately follow a drag
        if (Date.now() < suppressClickUntil) {
          return;
        }
        onClick();
      }}
      title={label || capitalizeLabel(value)}
      aria-label={`Select ${label || capitalizeLabel(value)}`}
      aria-pressed={isSelected}
      data-original-value={value}
      data-seg={String(seg)}
    >
      <div className="preset-icon" aria-hidden="true">
        {icon ? (typeof icon === 'string' ? <TwEmoji text={icon} /> : React.createElement(icon as React.ComponentType<any>, { size: iconSize })) : null}
      </div>
      <div className={`preset-label ${isSelected ? 'visible' : 'hidden'}`}>
        {label || capitalizeLabel(value)}
      </div>
    </div>
  );
};

export default PresetButton;