import React, { useRef, useEffect, useCallback } from 'react';
import { Sunrise, Monitor, TrendingUp, MapPin, Zap, Building, Microscope, Heart, Calendar, Globe, Briefcase, GraduationCap, Leaf, Palette, Gamepad2, Music } from 'lucide-react';

const presets = [
  ['morning', 'Morning Brief', Sunrise],
  ['tech', 'Tech Digest', Monitor],
  ['markets', 'Market Pulse', TrendingUp],
  ['lt-local', 'Local News', MapPin],
  ['breaking', 'Breaking News', Zap],
  ['politics', 'Politics', Building],
  ['sports', 'Sports', Gamepad2],
  ['entertainment', 'Entertainment', Music],
  ['science', 'Science', Microscope],
  ['health', 'Health', Heart],
  ['business', 'Business', Briefcase],
  ['international', 'World News', Globe],
  ['environment', 'Environment', Leaf],
  ['education', 'Education', GraduationCap],
  ['arts', 'Arts & Culture', Palette],
  ['weekend', 'Weekend Roundup', Calendar],
] as const;

const PresetCarousel = (props: { onPresetClick: (preset: string) => void; selectedPreset?: string | null }) => {
  const carouselRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<number>();

  const findCenteredPreset = useCallback(() => {
    if (!carouselRef.current) return;

    const carousel = carouselRef.current;
    const carouselRect = carousel.getBoundingClientRect();
    const carouselCenter = carouselRect.left + carouselRect.width / 2;

    let closestPreset = '';
    let minDistance = Infinity;

    const buttons = carousel.querySelectorAll('.preset-button');
    buttons.forEach((button, index) => {
      const buttonRect = button.getBoundingClientRect();
      const buttonCenter = buttonRect.left + buttonRect.width / 2;
      const distance = Math.abs(buttonCenter - carouselCenter);

      if (distance < minDistance) {
        minDistance = distance;
        closestPreset = presets[index][0] as string;
      }
    });

    if (closestPreset && closestPreset !== props.selectedPreset) {
      props.onPresetClick(closestPreset);
    }
  }, [props]);

  const handleScroll = useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = window.setTimeout(findCenteredPreset, 150);
  }, [findCenteredPreset]);

  useEffect(() => {
    const carousel = carouselRef.current;
    if (carousel) {
      carousel.addEventListener('scroll', handleScroll, { passive: true });
      return () => carousel.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  return (
    <div className="preset-carousel" ref={carouselRef}>
      {presets.map(([key, label, Icon]) =>
        <button
          key={key as string}
          className={`preset-button ${props.selectedPreset === key ? 'preset-selected' : ''}`}
          onClick={() => props.onPresetClick(key as string)}
        >
          <Icon size={16} />
          <span>{label}</span>
        </button>
      )}
    </div>
  );
};

export default PresetCarousel;
