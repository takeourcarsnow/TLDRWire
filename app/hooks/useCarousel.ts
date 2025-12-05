import { useRef, useEffect, useCallback } from 'react';

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
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);

  const items = options || [];
  const currentValue = value || selectedPreset;

  // Center the selected item when selection changes
  useEffect(() => {
    if (!currentValue || !carouselRef.current) return;

    const carousel = carouselRef.current;
    const button = carousel.querySelector(`[data-value="${currentValue}"]`) as HTMLElement;
    
    if (button) {
      const carouselRect = carousel.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();
      const offset = buttonRect.left - carouselRect.left - (carouselRect.width - buttonRect.width) / 2;
      
      carousel.scrollTo({
        left: carousel.scrollLeft + offset,
        behavior: 'smooth'
      });
    }
  }, [currentValue]);

  const handleSelect = useCallback((val: string) => {
    if (onChange) onChange(val);
    else if (onPresetClick) onPresetClick(val);
  }, [onChange, onPresetClick]);

  const scrollToPrev = useCallback(() => {
    const idx = items.findIndex(it => it.value === currentValue);
    if (idx > 0) {
      handleSelect(items[idx - 1].value);
    }
  }, [items, currentValue, handleSelect]);

  const scrollToNext = useCallback(() => {
    const idx = items.findIndex(it => it.value === currentValue);
    if (idx < items.length - 1) {
      handleSelect(items[idx + 1].value);
    }
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

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    startXRef.current = e.pageX;
    scrollLeftRef.current = carouselRef.current?.scrollLeft || 0;
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !carouselRef.current) return;
    const dx = e.pageX - startXRef.current;
    carouselRef.current.scrollLeft = scrollLeftRef.current - dx;
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    isDraggingRef.current = true;
    startXRef.current = e.touches[0].pageX;
    scrollLeftRef.current = carouselRef.current?.scrollLeft || 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current || !carouselRef.current) return;
    const dx = e.touches[0].pageX - startXRef.current;
    carouselRef.current.scrollLeft = scrollLeftRef.current - dx;
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
  };

  return {
    carouselRef,
    scrollLeft: scrollToPrev,
    scrollRight: scrollToNext,
    handleKeyDown,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    selectValue: handleSelect,
  };
};