import React, { useEffect, useRef } from 'react';
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

  useEffect(() => {
    if (swiperRef.current && swiperRef.current.activeIndex !== activeIndex) {
      swiperRef.current.slideTo(activeIndex);
    }
  }, [activeIndex]);

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
          {child}
        </SwiperSlide>
      ))}
    </Swiper>
  );
}