import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode } from 'swiper/modules';
import TwEmoji from './TwEmoji';

// Import Swiper styles
import 'swiper/css';

interface Option {
  value: string;
  label: string;
  icon?: string | React.ComponentType<any>;
}

interface VerticalSelectCarouselProps {
  id?: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  className?: string;
}

export default function VerticalSelectCarousel({ id, value, options, onChange, className }: VerticalSelectCarouselProps) {
  const swiperRef = React.useRef<any>(null);
  const timeoutRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!swiperRef.current) return;
    const idx = options.findIndex(o => o.value === value);
    if (idx >= 0) {
      try {
        if (typeof swiperRef.current.slideToLoop === 'function') {
          swiperRef.current.slideToLoop(idx, 220);
        } else {
          swiperRef.current.slideTo(idx, 220);
        }
      } catch (e) {
        // ignore
      }
    }
  }, [value, options]);

  const handleTouchEnd = React.useCallback(() => {
    // Small delay to let momentum scrolling finish
    setTimeout(() => {
      if (swiperRef.current) {
        const idx = swiperRef.current.realIndex;
        if (idx >= 0 && idx < options.length && options[idx].value !== value) {
          onChange(options[idx].value);
        }
      }
    }, 100);
  }, [options, value, onChange]);

  return (
    <div className={`vertical-select-carousel ${className || ''}`} style={{ height: '120px', overflow: 'hidden' }}>
      <Swiper
        direction="vertical"
        modules={[FreeMode]}
        spaceBetween={8}
        slidesPerView={3}
        centeredSlides={true}
        loop={true}
        freeMode={true}
        allowTouchMove={true}
        onBeforeInit={(swiper) => {
          swiperRef.current = swiper;
        }}
        onTouchEnd={handleTouchEnd}
        style={{ height: '100%' }}
      >
        {options.map((opt) => {
          const isSelected = opt.value === value;
          return (
            <SwiperSlide key={opt.value} style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                type="button"
                className={`vertical-carousel-option ${isSelected ? 'selected' : ''}`}
                onClick={() => onChange(opt.value)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: isSelected 
                    ? 'linear-gradient(135deg, rgba(77,163,255,0.18) 0%, rgba(77,163,255,0.12) 50%, rgba(77,163,255,0.06) 100%)' 
                    : 'linear-gradient(135deg, var(--bg-secondary) 0%, rgba(255,255,255,0.03) 50%, var(--bg-secondary) 100%)',
                  color: isSelected ? 'var(--accent)' : 'var(--text)',
                  border: isSelected 
                    ? '1px solid rgba(77,163,255,0.3)' 
                    : '1px solid var(--border)',
                  cursor: 'pointer',
                  width: '100%',
                  fontSize: '14px',
                  boxShadow: isSelected 
                    ? '0 2px 4px rgba(77,163,255,0.2), 0 4px 8px rgba(77,163,255,0.15), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.05)' 
                    : '0 1px 2px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.03)',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: 'translateY(0)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = isSelected 
                    ? '0 4px 8px rgba(77,163,255,0.25), 0 6px 12px rgba(77,163,255,0.2), inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.08)' 
                    : '0 3px 6px rgba(0,0,0,0.15), 0 6px 12px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = isSelected 
                    ? '0 2px 4px rgba(77,163,255,0.2), 0 4px 8px rgba(77,163,255,0.15), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.05)' 
                    : '0 1px 2px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.03)';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = isSelected 
                    ? '0 1px 2px rgba(77,163,255,0.15), inset 0 1px 2px rgba(0,0,0,0.1), inset 0 -1px 0 rgba(0,0,0,0.08)' 
                    : '0 0 1px rgba(0,0,0,0.08), inset 0 1px 2px rgba(0,0,0,0.08), inset 0 -1px 0 rgba(0,0,0,0.05)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = isSelected 
                    ? '0 4px 8px rgba(77,163,255,0.25), 0 6px 12px rgba(77,163,255,0.2), inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.08)' 
                    : '0 3px 6px rgba(0,0,0,0.15), 0 6px 12px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.05)';
                }}
              >
                {opt.icon ? (
                  typeof opt.icon === 'string' ?
                    <TwEmoji text={opt.icon} /> :
                    React.createElement(opt.icon, { size: 16 })
                ) : null}
                <span>{opt.label}</span>
              </button>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </div>
  );
}