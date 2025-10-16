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
  }, [value]);

  const handleSlideChange = (swiper: any) => {
    const idx = swiper.realIndex;
    if (idx >= 0 && idx < options.length && options[idx].value !== value) {
      onChange(options[idx].value);
    }
  };

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
        onSlideChangeTransitionEnd={() => {}} // Disabled auto-selection
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
                    ? 'linear-gradient(135deg, var(--accent), rgba(77,163,255,0.8))' 
                    : 'linear-gradient(135deg, var(--bg-secondary), rgba(255,255,255,0.02))',
                  color: isSelected ? 'var(--accent-text)' : 'var(--text)',
                  border: isSelected 
                    ? '1px solid rgba(77,163,255,0.3)' 
                    : '1px solid var(--border)',
                  cursor: 'pointer',
                  width: '100%',
                  fontSize: '14px',
                  boxShadow: isSelected 
                    ? '0 4px 16px rgba(77,163,255,0.25), inset 0 1px 0 rgba(255,255,255,0.1)' 
                    : '0 2px 8px var(--shadow), inset 0 1px 0 rgba(255,255,255,0.05)',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: 'translateY(0)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = isSelected 
                    ? '0 8px 24px rgba(77,163,255,0.35), inset 0 1px 0 rgba(255,255,255,0.15)' 
                    : '0 6px 20px var(--shadow), inset 0 1px 0 rgba(255,255,255,0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = isSelected 
                    ? '0 4px 16px rgba(77,163,255,0.25), inset 0 1px 0 rgba(255,255,255,0.1)' 
                    : '0 2px 8px var(--shadow), inset 0 1px 0 rgba(255,255,255,0.05)';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'translateY(1px)';
                  e.currentTarget.style.boxShadow = isSelected 
                    ? '0 2px 8px rgba(77,163,255,0.2), inset 0 2px 4px rgba(0,0,0,0.1)' 
                    : '0 1px 4px var(--shadow), inset 0 2px 4px rgba(0,0,0,0.05)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = isSelected 
                    ? '0 8px 24px rgba(77,163,255,0.35), inset 0 1px 0 rgba(255,255,255,0.15)' 
                    : '0 6px 20px var(--shadow), inset 0 1px 0 rgba(255,255,255,0.08)';
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