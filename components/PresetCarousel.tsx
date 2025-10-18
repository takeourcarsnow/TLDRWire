import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Sunrise, Monitor, TrendingUp, MapPin, Zap, Building, Microscope, Heart, Calendar, Globe, Briefcase, GraduationCap, Leaf, Palette, Gamepad2, Music, Cloud, Plane, DollarSign } from 'lucide-react';
import TwEmoji from './TwEmoji';

type DefaultPreset = readonly [string, React.ComponentType<any>];

const presets: DefaultPreset[] = [
  ['morning', Sunrise],
  ['tech', Monitor],
  ['markets', TrendingUp],
  ['lt-local', MapPin],
  ['breaking', Zap],
  ['politics', Building],
  ['sports', Gamepad2],
  ['entertainment', Music],
  ['science', Microscope],
  ['health', Heart],
  ['business', Briefcase],
  ['international', Globe],
  ['environment', Leaf],
  ['education', GraduationCap],
  ['arts', Palette],
  ['weekend', Calendar],
  ['weather', Cloud],
  ['travel', Plane],
  ['finance', DollarSign],
];

type Option = {
  value: string;
  label?: string;
  icon?: string | React.ComponentType<any>;
};

interface PresetCarouselProps {
  // legacy API used on the homepage
  onPresetClick?: (preset: string) => void;
  selectedPreset?: string | null;

  // new API to replace VerticalSelectCarousel-style usage
  options?: Option[];
  value?: string;
  onChange?: (value: string) => void;
}

const PresetCarousel = (props: PresetCarouselProps) => {
  const carouselRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      scrollLeft();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      scrollRight();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
  };

  const usingOptions = Array.isArray(props.options) && props.options.length > 0;

  return (
    <div className="preset-carousel-container" onKeyDown={handleKeyDown} tabIndex={0} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <div className="arrow-button" onClick={scrollLeft} aria-label="Scroll left"><ChevronLeft size={16} /></div>
      <div className="preset-carousel" ref={carouselRef}>
        {usingOptions
          ? props.options!.map(opt => {
              const isSelected = props.value === opt.value;
              const onClick = () => {
                if (props.onChange) props.onChange(opt.value);
                else if (props.onPresetClick) props.onPresetClick(opt.value);
              };

              return (
                <div
                  key={opt.value}
                  className={`preset-button ${isSelected ? 'selected' : ''}`}
                  onClick={onClick}
                  title={opt.label || opt.value}
                  aria-label={`Select ${opt.label || opt.value}`}
                  aria-pressed={isSelected}
                >
                  <div className="preset-icon" aria-hidden="true">
                    {opt.icon ? (typeof opt.icon === 'string' ? <TwEmoji text={opt.icon} /> : React.createElement(opt.icon as React.ComponentType<any>, { size: 16 })) : null}
                  </div>
                  {/* label is visually hidden unless selected */}
                  <div className={`preset-label ${isSelected ? 'visible' : 'hidden'}`}>
                    {opt.label || opt.value}
                  </div>
                </div>
              );
            })
          : presets.map(([key, Icon]) => (
              <div
                  key={key}
                  className={`preset-button ${props.selectedPreset === key ? 'selected' : ''}`}
                  onClick={() => props.onPresetClick && props.onPresetClick(key)}
                  title={key}
                  aria-label={`Select ${key} preset`}
                  aria-pressed={props.selectedPreset === key}
                >
                  <div className="preset-icon" aria-hidden="true"><Icon size={16} /></div>
                  <div className={`preset-label ${props.selectedPreset === key ? 'visible' : 'hidden'}`}>{key}</div>
                </div>
            ))}
      </div>
      <div className="arrow-button" onClick={scrollRight} aria-label="Scroll right"><ChevronRight size={16} /></div>
    </div>
  );
};

export default PresetCarousel;
