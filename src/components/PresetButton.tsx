import React from 'react';
import TwEmoji from './TwEmoji';
import { capitalizeLabel } from '../utils/carouselUtils';

interface PresetButtonProps {
  value: string;
  label?: string;
  icon?: string | React.ComponentType<any>;
  isSelected: boolean;
  // optional color used to tint the icon (CSS color string)
  color?: string;
  // Accept the clicked DOM element so callers can center exactly that
  // duplicate when needed (useful for tripled-segment carousels).
  onClick: (el?: HTMLElement) => void;
  suppressClickUntil: number;
  seg: number;
}

const PresetButton: React.FC<PresetButtonProps> = ({
  value,
  label,
  icon,
  isSelected,
  color,
  onClick,
  suppressClickUntil,
  seg
}) => {
  const iconSize = isSelected ? 36 : 28;

  return (
    <div
      className={`preset-button ${isSelected ? 'selected' : ''}`}
      onClick={(e) => {
        // Ignore clicks that immediately follow a drag
        if (Date.now() < suppressClickUntil) {
          return;
        }
        // Pass the clicked DOM element to the handler for precise centering
        onClick(e.currentTarget as HTMLElement);
      }}
      title={label || capitalizeLabel(value)}
      aria-label={`Select ${label || capitalizeLabel(value)}`}
      aria-pressed={isSelected}
      data-original-value={value}
      data-seg={String(seg)}
    >
      <div
        className="preset-icon"
        aria-hidden="true"
        // Only apply the preset color when this button is selected so
        // presets are not colored all the time.
        style={isSelected && color ? { color } : undefined}
        data-color={isSelected && color ? color : undefined}
      >
        {icon ? (
          typeof icon === 'string'
            ? <TwEmoji text={icon} className="preset-twemoji" />
            // Only pass a color prop to the icon component when selected so
            // the icon isn't tinted in the unselected state.
            : React.createElement(icon as React.ComponentType<any>, { size: iconSize, color: isSelected ? color : undefined })
        ) : null}
      </div>
      <div className={`preset-label ${isSelected ? 'visible' : 'hidden'}`}>
        {label || capitalizeLabel(value)}
      </div>
    </div>
  );
};

export default PresetButton;