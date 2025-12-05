import React, { useMemo, useRef, useCallback, useEffect } from 'react';
import { presets, Option, presetColors } from '../constants/presets';
import PresetButton from './PresetButton';
import CarouselArrows from './CarouselArrows';

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
  const carouselRef = useRef<HTMLDivElement>(null);

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

  const scrollToCenter = useCallback((val: string) => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    const button = carousel.querySelector(`[data-value="${val}"]`) as HTMLElement;
    if (button) {
      const carouselRect = carousel.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();
      const offset = buttonRect.left - carouselRect.left - (carouselRect.width - buttonRect.width) / 2;
      carousel.scrollBy({ left: offset, behavior: 'smooth' });
    }
  }, []);

  const currentValue = props.value || props.selectedPreset;

  const handleSelect = useCallback((val: string) => {
    if (props.onChange) props.onChange(val);
    else if (props.onPresetClick) props.onPresetClick(val);
  }, [props.onChange, props.onPresetClick]);

  useEffect(() => {
    if (currentValue) {
      scrollToCenter(currentValue);
    }
  }, [currentValue, scrollToCenter]);

  const scrollLeft = useCallback(() => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  }, []);

  const scrollRight = useCallback(() => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      scrollLeft();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      scrollRight();
    }
  }, [scrollLeft, scrollRight]);

  return (
    <div
      className="preset-carousel-container"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      onMouseEnter={props.onMouseEnter}
      onMouseLeave={props.onMouseLeave}
    >
      <CarouselArrows onScrollLeft={scrollLeft} onScrollRight={scrollRight} />
      <div 
        className="preset-carousel" 
        ref={carouselRef}
      >
        {items.map((it) => (
          <PresetButton
            key={it.value}
            value={it.value}
            label={it.label}
            icon={it.icon}
            color={it.color}
            isSelected={currentValue === it.value}
            onClick={() => handleSelect(it.value)}
          />
        ))}
      </div>
    </div>
  );
});

export default PresetCarousel;
