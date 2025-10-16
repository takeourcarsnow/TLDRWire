import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode } from 'swiper/modules';
import {
  Sunrise, 
  Monitor, 
  TrendingUp, 
  MapPin,
  Zap,
  Users,
  Building,
  Microscope,
  Heart,
  Cloud,
  Calendar,
  Globe,
  Briefcase,
  GraduationCap,
  Leaf,
  Shield,
  Palette,
  Gamepad2,
  Music,
  Camera
} from 'lucide-react';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';

interface PresetCarouselProps {
  onPresetClick: (preset: string) => void;
  selectedPreset?: string | null;
}

const presets = [
  { key: 'morning', label: 'Morning Brief', icon: Sunrise },
  { key: 'tech', label: 'Tech Digest', icon: Monitor },
  { key: 'markets', label: 'Market Pulse', icon: TrendingUp },
  { key: 'lt-local', label: 'Local News', icon: MapPin },
  { key: 'breaking', label: 'Breaking News', icon: Zap },
  { key: 'politics', label: 'Politics', icon: Building },
  { key: 'sports', label: 'Sports', icon: Gamepad2 },
  { key: 'entertainment', label: 'Entertainment', icon: Music },
  { key: 'science', label: 'Science', icon: Microscope },
  { key: 'health', label: 'Health', icon: Heart },
  { key: 'business', label: 'Business', icon: Briefcase },
  { key: 'international', label: 'World News', icon: Globe },
  { key: 'environment', label: 'Environment', icon: Leaf },
  { key: 'education', label: 'Education', icon: GraduationCap },
  { key: 'arts', label: 'Arts & Culture', icon: Palette },
  { key: 'weekend', label: 'Weekend Roundup', icon: Calendar },
];

export default function PresetCarousel({ onPresetClick, selectedPreset = null }: PresetCarouselProps) {
  const swiperRef = React.useRef<any>(null);

  React.useEffect(() => {
    if (!selectedPreset) return;
    if (!swiperRef.current) return;
    const idx = presets.findIndex(p => p.key === selectedPreset);
    if (idx >= 0) {
      try {
        // slideToLoop will navigate to the correct duplicated slide when looping is enabled
        // and will center the slide when centeredSlides is true.
        if (typeof swiperRef.current.slideToLoop === 'function') {
          swiperRef.current.slideToLoop(idx, 220);
        } else {
          swiperRef.current.slideTo(idx, 220);
        }
      } catch (e) {
        // ignore
      }
    }
  }, [selectedPreset]);
  return (
  <div className="preset-carousel" style={{ position: 'relative', overflow: 'visible' }}>
      <Swiper
        className="preset-swiper"
        modules={[FreeMode]}
        spaceBetween={6}
        // Use auto slide sizing so more items can fit; slide widths come from content/styles
        slidesPerView={'auto'}
        nested={true}
        allowTouchMove={true}
  freeMode={true}
  centeredSlides={true}
        loop={true}
        breakpoints={{
          // These breakpoints keep spacing sensible on larger screens but slides remain auto-sized
          640: { spaceBetween: 8 },
          1024: { spaceBetween: 10 },
          1280: { spaceBetween: 12 },
        }}
        onBeforeInit={(swiper) => {
          // attach swiper instance so we can fallback to programmatic control
          // @ts-ignore
          swiperRef.current = swiper;
        }}
        // Only select a preset when the user releases the swipe (or when the slide transition ends).
        // This prevents changing selection while the user is still dragging.
        onTouchEnd={(swiper) => {
          const idx = swiper.realIndex;
          if (idx >= 0 && idx < presets.length && presets[idx].key !== selectedPreset) {
            onPresetClick(presets[idx].key);
          }
        }}
        onSlideChangeTransitionEnd={(swiper) => {
          // Also handle programmatic or momentum transitions ending.
          const idx = swiper.realIndex;
          if (idx >= 0 && idx < presets.length && presets[idx].key !== selectedPreset) {
            onPresetClick(presets[idx].key);
          }
        }}
        style={{ height: '46px', overflow: 'visible' }}
      >
        {presets.map((preset) => {
          const Icon = preset.icon;
          return (
            <SwiperSlide key={preset.key} style={{ height: 'auto', width: 'auto' }}>
              <button
                className={"secondary preset-button compact-preset" + (selectedPreset === preset.key ? ' preset-selected' : '')}
                type="button"
                onClick={() => onPresetClick(preset.key)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '3px',
                  padding: '6px 8px',
                  minHeight: '46px',
                  borderRadius: '8px',
                }}
              >
                <Icon size={16} />
                <span style={{ fontSize: '10px', textAlign: 'center', lineHeight: '1.1', maxWidth: '72px' }}>{preset.label}</span>
              </button>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </div>
  );
}
