import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperType } from 'swiper';

// Import Swiper styles
import 'swiper/css';

interface SwipeableContainerProps {
  children: React.ReactNode[];
  activeIndex: number;
  onSlideChange: (index: number) => void;
  disabled?: boolean;
}

export function SwipeableContainer({ children, activeIndex, onSlideChange, disabled = false }: SwipeableContainerProps) {
  const swiperRef = useRef<SwiperType | null>(null);
  const [slideMinHeight, setSlideMinHeight] = useState<number>(0);

  // Compute a minimum slide height so the swiper still receives touch
  // events across the full visible area below the header and above the
  // fixed bottom navbar. This ensures users can swipe from empty lower
  // regions of the page even when a slide doesn't contain much content.
  const updateSlideMinHeight = useCallback(() => {
    try {
      const main = document.getElementById('main-content');
      const bottomBar = document.querySelector('.bottom-navbar');
      const bottomHeight = bottomBar ? bottomBar.getBoundingClientRect().height : 72; // fallback
      const topOffset = main ? main.getBoundingClientRect().top : 0;
      const available = Math.max(0, window.innerHeight - topOffset - bottomHeight);
      setSlideMinHeight(available);
    } catch (e) {
      // Defensive: ignore when running in SSR or unusual environments
      setSlideMinHeight(0);
    }
  }, []);

  useEffect(() => {
    if (swiperRef.current && swiperRef.current.activeIndex !== activeIndex) {
      swiperRef.current.slideTo(activeIndex);
    }
  }, [activeIndex]);

  useEffect(() => {
    updateSlideMinHeight();
    window.addEventListener('resize', updateSlideMinHeight);
    return () => window.removeEventListener('resize', updateSlideMinHeight);
  }, [updateSlideMinHeight]);

  // When the filler min-height changes, ensure Swiper recalculates any
  // autoHeight measurements so the wrapper height matches the new size.
  useEffect(() => {
    if (swiperRef.current) {
      const s = swiperRef.current as any;
      if (typeof s.updateAutoHeight === 'function') {
        s.updateAutoHeight();
      } else if (typeof s.update === 'function') {
        s.update();
      }
    }
  }, [slideMinHeight]);

  useEffect(() => {
    if (swiperRef.current) {
      if (disabled) {
        swiperRef.current.disable();
      } else {
        swiperRef.current.enable();
      }
    }
  }, [disabled]);

  return (
    <Swiper
      spaceBetween={0}
      slidesPerView={1}
      autoHeight={true}
      onSlideChange={(swiper) => onSlideChange(swiper.activeIndex)}
      onSwiper={(swiper) => (swiperRef.current = swiper)}
      allowTouchMove={!disabled}
      /* Let slides size to their content. Avoid forcing full-height which
         creates large empty space when content is short. */
    >
      {children.map((child, index) => (
        <SwiperSlide key={index}>
          <div
            className="swipe-slide-content"
            style={{
              minHeight: slideMinHeight || undefined,
              boxSizing: 'border-box'
            }}
          >
            {child}
          </div>
        </SwiperSlide>
      ))}
    </Swiper>
  );
}