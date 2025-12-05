import React, { useMemo, useRef, useCallback, useEffect } from 'react';
import { presets, Option, presetColors } from '../constants/presets';
import PresetButton from './PresetButton';
import CarouselArrows from './CarouselArrows';
import { doInstantJump } from '../hooks/carouselHandlers';
import { capitalizeLabel } from '../utils/carouselUtils';

interface PresetCarouselProps {
  onPresetClick?: (preset: string) => void;
  selectedPreset?: string | null;
  options?: Option[];
  value?: string;
  onChange?: (value: string) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const PresetCarousel = React.memo((props: PresetCarouselProps) => {
  const carouselRef = useRef<HTMLDivElement>(null);

  const baseItems = useMemo(() => 
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

  const items = useMemo(() => [...baseItems, ...baseItems, ...baseItems], [baseItems]);

  // Center the visually closest duplicate of the given value so that
  // moving from the last item to the next (wrapped) item feels seamless
  // instead of jumping back to the "first" copy.
  const scrollToCenter = useCallback((val: string, smooth: boolean = true) => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const candidates = Array.from(
      carousel.querySelectorAll<HTMLElement>(`[data-original-value="${val}"]`)
    );
    if (!candidates.length) return;

    let target: HTMLElement | null = null;
    if (candidates.length === 1) {
      target = candidates[0];
    } else {
      const carouselRect = carousel.getBoundingClientRect();
      const carouselCenter = carouselRect.left + carouselRect.width / 2;
      let bestDist = Number.POSITIVE_INFINITY;

      for (const el of candidates) {
        const r = el.getBoundingClientRect();
        const center = r.left + r.width / 2;
        const dist = Math.abs(center - carouselCenter);
        if (dist < bestDist) {
          bestDist = dist;
          target = el;
        }
      }
    }

    if (!target) return;

    target.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
      block: 'nearest',
      inline: 'center'
    });
  }, []);

  const currentValue = props.value || props.selectedPreset;

  const handleSelect = useCallback((val: string) => {
    if (props.onChange) props.onChange(val);
    else if (props.onPresetClick) props.onPresetClick(val);
    // Scroll to center after selection
    requestAnimationFrame(() => {
      scrollToCenter(val, true);
    });
  }, [props.onChange, props.onPresetClick, scrollToCenter]);

  useEffect(() => {
    if (currentValue) {
      // Use instant scroll on initial load, smooth on subsequent changes
      scrollToCenter(currentValue, false);
    }
  }, [currentValue, scrollToCenter]);

  // Handle infinite loop scrolling
  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const handleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const scrollLeft = carousel.scrollLeft;
        const segWidth = carousel.scrollWidth / 3;
        if (scrollLeft < segWidth * 0.1) {
          // Near left edge, jump to middle
          const newLeft = segWidth + scrollLeft;
          doInstantJump(carousel, newLeft);
        } else if (scrollLeft > segWidth * 2.9) {
          // Near right edge, jump to middle
          const newLeft = segWidth + (scrollLeft - segWidth * 2);
          doInstantJump(carousel, newLeft);
        }
      }, 100);
    };

    carousel.addEventListener('scroll', handleScroll);
    return () => {
      clearTimeout(timeoutId);
      carousel.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Initialize scroll to middle segment
  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    const segWidth = carousel.scrollWidth / 3;
    if (segWidth && isFinite(segWidth)) {
      carousel.scrollLeft = segWidth;
    }
  }, []);

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
        {items.map((it, index) => (
          <PresetButton
            key={`${it.value}-${Math.floor(index / baseItems.length)}`}
            value={it.value}
            label={it.label}
            icon={it.icon}
            color={it.color}
            isSelected={currentValue === it.value}
            onClick={() => handleSelect(it.value)}
            data-seg={Math.floor(index / baseItems.length)}
            data-original-value={it.value}
          />
        ))}
      </div>
    </div>
  );
});

export default PresetCarousel;

