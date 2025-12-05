import { useRef, useEffect, useCallback } from 'react';
import { centerSelected, selectClosest } from '../utils/carouselUtils';
import { doInstantJump } from '../hooks/carouselHandlers';

interface UseCarouselProps {
  options?: Array<{ value: string; label?: string; icon?: string | React.ComponentType<any> }>;
  value?: string;
  selectedPreset?: string | null;
  onChange?: (value: string) => void;
  onPresetClick?: (preset: string) => void;
}

export const useCarousel = ({
  options,
  value,
  selectedPreset,
  onChange,
  onPresetClick
}: UseCarouselProps) => {
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const items = options || [];
  const currentValue = value || selectedPreset;

  // Center the selected item when selection changes
  useEffect(() => {
    if (!currentValue || !carouselRef.current) return;
    centerSelected(carouselRef.current, currentValue);
  }, [currentValue]);

  const handleSelect = useCallback((val: string) => {
    if (onChange) onChange(val);
    else if (onPresetClick) onPresetClick(val);
  }, [onChange, onPresetClick]);

  const scrollToPrev = useCallback(() => {
    const idx = items.findIndex(it => it.value === currentValue);
    const newIdx = idx > 0 ? idx - 1 : items.length - 1;
    handleSelect(items[newIdx].value);
  }, [items, currentValue, handleSelect]);

  const scrollToNext = useCallback(() => {
    const idx = items.findIndex(it => it.value === currentValue);
    const newIdx = idx < items.length - 1 ? idx + 1 : 0;
    handleSelect(items[newIdx].value);
  }, [items, currentValue, handleSelect]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      scrollToPrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      scrollToNext();
    }
  };

  // Handle seamless looping and keep selected in middle
  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const handleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        // Select the closest item to the center and center it
        selectClosest(carousel, onChange, onPresetClick, currentValue, selectedPreset, centerSelected);
      }, 100);
    };

    carousel.addEventListener('scroll', handleScroll);
    return () => {
      clearTimeout(timeoutId);
      carousel.removeEventListener('scroll', handleScroll);
    };
  }, [onChange, onPresetClick, currentValue, selectedPreset]);

  return {
    carouselRef,
    scrollLeft: scrollToPrev,
    scrollRight: scrollToNext,
    handleKeyDown,
    selectValue: handleSelect,
  };
};