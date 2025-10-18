import React, { useRef, useEffect } from 'react';
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

  // Function to properly capitalize preset labels
  const capitalizeLabel = (label: string): string => {
    // Handle special cases
    const specialCases: Record<string, string> = {
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

    return specialCases[label] || label.charAt(0).toUpperCase() + label.slice(1);
  };

  // We'll render the items 3x (tripled) and keep the scroll positioned on the middle segment
  // so the user can scroll endlessly. When near either edge we'll jump the scroll position
  // by one segment width to maintain the illusion of infinite looping.
  useEffect(() => {
    const initScrollToMiddle = () => {
      const carousel = carouselRef.current;
      if (!carousel) return;
      const seg = carousel.scrollWidth / 3;
      if (seg && isFinite(seg)) {
        // Jump to the middle segment without animation
        carousel.scrollLeft = seg;
      }
    };

    // Wait for layout to settle
    requestAnimationFrame(() => requestAnimationFrame(initScrollToMiddle));
  }, [props.options, props.value, props.selectedPreset]);

  // Center the selected button when selection changes. Choose the duplicate that
  // lives in the middle segment when possible (so centering keeps the user in the
  // middle segment of the tripled list).
  // Utility to center a given original value in the carousel. If possible
  // prefer the duplicate that lives in the middle segment (seg === '1') so
  // we remain in the middle tripled segment.
  const centerSelected = (value?: string, behaviour: ScrollBehavior = 'smooth') => {
    const selectedValue = value || props.value || props.selectedPreset;
    const carousel = carouselRef.current;
    if (!selectedValue || !carousel) return;

    const candidates = Array.from(carousel.querySelectorAll('[data-original-value]')) as HTMLElement[];
    // Prefer the middle segment duplicate
    let selectedButton = candidates.find(el => el.dataset.originalValue === selectedValue && el.dataset.seg === '1');
    if (!selectedButton) selectedButton = candidates.find(el => el.dataset.originalValue === selectedValue);

    if (selectedButton) {
      const carouselRect = carousel.getBoundingClientRect();
      const buttonRect = selectedButton.getBoundingClientRect();
      const carouselCenter = carouselRect.left + carouselRect.width / 2;
      const buttonCenter = buttonRect.left + buttonRect.width / 2;
      const scrollLeft = carousel.scrollLeft + (buttonCenter - carouselCenter);

      // Use scrollTo so we can control behaviour
      try {
        carousel.scrollTo({ left: scrollLeft, behavior: behaviour });
      } catch (e) {
        // fallback for older browsers
        carousel.scrollLeft = scrollLeft;
      }
    }
  };

  // Center on mount/when options change (use instant on init to avoid jump animations)
  useEffect(() => {
    // defer to next frames so layout is stable (matches earlier logic)
    requestAnimationFrame(() => requestAnimationFrame(() => centerSelected(undefined, 'auto')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.options, props.value, props.selectedPreset]);

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

  // Build a normalized items array (value, label, icon) that we can duplicate
  const normalizedItems = usingOptions
    ? props.options!.map(opt => ({ value: opt.value, label: opt.label, icon: opt.icon }))
    : presets.map(([key, Icon]) => ({ value: key, label: capitalizeLabel(key), icon: Icon }));

  // Triplicate for seamless looping
  const tripledItems = Array.from({ length: 3 }).flatMap((_, seg) =>
    normalizedItems.map((it, idx) => ({ ...it, _origIndex: idx, _seg: seg }))
  );

  // Scroll handler to jump when hitting either edge segment
  const handleScroll = () => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    const seg = carousel.scrollWidth / 3;
    if (!seg || !isFinite(seg)) return;

    // Use a small pixel threshold so we don't trigger during normal snapping
    const THRESHOLD = 4; // px
    const left = carousel.scrollLeft;

    // When we need to jump, disable smooth scrolling and scroll-snap so the
    // reposition is instantaneous and not visibly animated or snapped.
    const doInstantJump = (newLeft: number) => {
      const prevBehavior = carousel.style.scrollBehavior;
      const prevSnap = carousel.style.scrollSnapType;
      try {
        carousel.style.scrollBehavior = 'auto';
        carousel.style.scrollSnapType = 'none';
        carousel.scrollLeft = newLeft;
      } finally {
        // Restore on next frame so subsequent user scrolls still feel smooth
        requestAnimationFrame(() => {
          carousel.style.scrollBehavior = prevBehavior || 'smooth';
          carousel.style.scrollSnapType = prevSnap || 'x mandatory';
        });
      }
    };

    // if we've scrolled past the left edge into the first segment, jump right
    if (left <= THRESHOLD) {
      doInstantJump(left + seg);
      return;
    }

    // if we've scrolled into/after the last segment, jump left
    if (left >= seg * 2 - THRESHOLD) {
      doInstantJump(left - seg);
      return;
    }
  };

  return (
    <div className="preset-carousel-container" onKeyDown={handleKeyDown} tabIndex={0} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <div className="arrow-button" onClick={scrollLeft} aria-label="Scroll left"><ChevronLeft size={16} /></div>
      <div className="preset-carousel" ref={carouselRef} onScroll={handleScroll}>
        {tripledItems.map((it, i) => {
          const origValue = it.value as string;
          const isSelected = (props.value === origValue) || (props.selectedPreset === origValue);
          const onClick = () => {
            if (props.onChange) props.onChange(origValue);
            else if (props.onPresetClick) props.onPresetClick(origValue);
            // Center the clicked item immediately. Use 'smooth' so it animates.
            // We pass the origValue to prefer centering the exact clicked duplicate.
            centerSelected(origValue, 'smooth');
          };

          const iconSize = isSelected ? 36 : 28;

          return (
            <div
              key={`${it._seg}-${it._origIndex}-${i}`}
              className={`preset-button ${isSelected ? 'selected' : ''}`}
              onClick={onClick}
              title={it.label || capitalizeLabel(origValue)}
              aria-label={`Select ${it.label || capitalizeLabel(origValue)}`}
              aria-pressed={isSelected}
              data-original-value={origValue}
              data-seg={String(it._seg)}
            >
              <div className="preset-icon" aria-hidden="true">
                {it.icon ? (typeof it.icon === 'string' ? <TwEmoji text={it.icon} /> : React.createElement(it.icon as React.ComponentType<any>, { size: iconSize })) : null}
              </div>
              <div className={`preset-label ${isSelected ? 'visible' : 'hidden'}`}>
                {it.label || capitalizeLabel(origValue)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="arrow-button" onClick={scrollRight} aria-label="Scroll right"><ChevronRight size={16} /></div>
    </div>
  );
};

export default PresetCarousel;
