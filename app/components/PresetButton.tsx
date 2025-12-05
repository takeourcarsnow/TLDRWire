import React from 'react';
import TwEmoji from './TwEmoji';
import { capitalizeLabel } from '../utils/carouselUtils';

interface PresetButtonProps {
  value: string;
  label?: string;
  icon?: string | React.ComponentType<any>;
  isSelected: boolean;
  color?: string;
  onClick: () => void;
  'data-seg'?: number;
  'data-original-value'?: string;
}

const PresetButton: React.FC<PresetButtonProps> = ({
  value,
  label,
  icon,
  isSelected,
  color,
  onClick,
  'data-seg': dataSeg,
  'data-original-value': dataOriginalValue
}) => {
  const iconSize = isSelected ? 36 : 28;

  return (
    <div
      className={`preset-button ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      title={label || capitalizeLabel(value)}
      aria-label={`Select ${label || capitalizeLabel(value)}`}
      aria-pressed={isSelected}
      data-value={value}
      data-seg={dataSeg}
      data-original-value={dataOriginalValue}
    >
      <div
        className="preset-icon"
        aria-hidden="true"
        style={isSelected && color ? { color } : undefined}
        data-color={isSelected && color ? color : undefined}
      >
        {icon ? (
          typeof icon === 'string'
            ? <TwEmoji text={icon} className="preset-twemoji" />
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