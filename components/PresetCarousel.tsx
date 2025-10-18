import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Sunrise, Monitor, TrendingUp, MapPin, Zap, Building, Microscope, Heart, Calendar, Globe, Briefcase, GraduationCap, Leaf, Palette, Gamepad2, Music, Cloud, Plane, DollarSign } from 'lucide-react';

const presets = [
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
] as const;

const PresetCarousel = (props: { onPresetClick: (preset: string) => void; selectedPreset?: string | null }) => {
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

  return (
    <div className="preset-carousel-container" onKeyDown={handleKeyDown} tabIndex={0} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <div className="arrow-button" onClick={scrollLeft} aria-label="Scroll left"><ChevronLeft size={16} /></div>
      <div className="preset-carousel" ref={carouselRef}>
        {presets.map(([key, Icon]) => (
          <div
            key={key as string}
            className={`preset-button ${props.selectedPreset === key ? 'selected' : ''}`}
            onClick={() => props.onPresetClick(key as string)}
            title={key as string}
            aria-label={`Select ${key} preset`}
          >
            <Icon size={16} />
          </div>
        ))}
      </div>
      <div className="arrow-button" onClick={scrollRight} aria-label="Scroll right"><ChevronRight size={16} /></div>
    </div>
  );
};

export default PresetCarousel;
