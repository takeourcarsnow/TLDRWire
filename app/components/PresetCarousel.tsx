import React, { useMemo } from 'react';
import { presets, Option, presetColors } from '../constants/presets';
import { useCarousel } from '../hooks/useCarousel';
import PresetButton from './PresetButton';

interface PresetCarouselProps {
  onPresetClick?: (preset: string) => void;
  selectedPreset?: string | null;
  options?: Option[];
  value?: string;
  onChange?: (value: string) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const capitalizeLabel = (label: string): string => {
  const special: Record<string, string> = {
    'lt-local': 'Local',
    'breaking': 'Breaking',
    'weekend': 'Weekend',
    'arts': 'Arts',
    'tech': 'Tech',
    'sports': 'Sports',
    'health': 'Health',
    'business': 'Business',
    'education': 'Education',
    'environment': 'Environment',
    'entertainment': 'Entertainment',
    'international': 'International',
    'politics': 'Politics',
    'science': 'Science',
    'weather': 'Weather',
    'travel': 'Travel',
    'finance': 'Finance',
    'markets': 'Markets',
    'morning': 'Morning'
  };
  return special[label] || label.charAt(0).toUpperCase() + label.slice(1);
};

const PresetCarousel = React.memo((props: PresetCarouselProps) => {
  const items = useMemo(() => 
    props.options?.map(opt => ({ 
      value: opt.value, 
      label: opt.label, 
      icon: opt.icon, 
      color: opt.color ?? presetColors[opt.value] 
    })) || presets.map(([key, Icon]) => ({ 
      value: key, 
      label: capitalizeLabel(key), 
      icon: Icon, 
      color: presetColors[key] 
    })),
    [props.options]
  );

  const {
    carouselRef,
    handleKeyDown,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    selectValue,
  } = useCarousel({
    options: items,
    value: props.value,
    selectedPreset: props.selectedPreset,
    onChange: props.onChange,
    onPresetClick: props.onPresetClick,
  });

  const currentValue = props.value || props.selectedPreset;

  return (
    <div
      className="preset-carousel-container"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      onMouseEnter={props.onMouseEnter}
      onMouseLeave={props.onMouseLeave}
    >
      <div 
        className="preset-carousel" 
        ref={carouselRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {items.map((it) => (
          <PresetButton
            key={it.value}
            value={it.value}
            label={it.label}
            icon={it.icon}
            color={it.color}
            isSelected={currentValue === it.value}
            onClick={() => selectValue(it.value)}
            data-seg={0}
          />
        ))}
      </div>
    </div>
  );
});

export default PresetCarousel;
