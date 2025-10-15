import React, { useEffect, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperType } from 'swiper';

// Import Swiper styles
import 'swiper/css';

interface SwipeableContainerProps {
  children: React.ReactNode[];
  activeIndex: number;
  onSlideChange: (index: number) => void;
}

export function SwipeableContainer({ children, activeIndex, onSlideChange }: SwipeableContainerProps) {
  const swiperRef = useRef<SwiperType | null>(null);

  useEffect(() => {
    if (swiperRef.current && swiperRef.current.activeIndex !== activeIndex) {
      swiperRef.current.slideTo(activeIndex);
    }
  }, [activeIndex]);

  return (
    <Swiper
      spaceBetween={0}
      slidesPerView={1}
      onSlideChange={(swiper) => onSlideChange(swiper.activeIndex)}
      onSwiper={(swiper) => (swiperRef.current = swiper)}
      style={{ height: '100%' }}
    >
      {children.map((child, index) => (
        <SwiperSlide key={index} style={{ height: '100%' }}>
          {child}
        </SwiperSlide>
      ))}
    </Swiper>
  );
}