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
    <div className="preset-carousel">
      <Swiper
        className="preset-swiper"
        modules={[FreeMode]}
        spaceBetween={6}
        slidesPerView={'auto'}
        nested={true}
        allowTouchMove={true}
        freeMode={true}
        centeredSlides={true}
        loop={true}
        breakpoints={{
          640: { spaceBetween: 8 },
          1024: { spaceBetween: 10 },
          1280: { spaceBetween: 12 },
        }}
        onBeforeInit={(swiper) => {
          swiperRef.current = swiper;
        }}
        onTouchEnd={(swiper) => {
          const idx = swiper.realIndex;
          if (idx >= 0 && idx < presets.length && presets[idx].key !== selectedPreset) {
            onPresetClick(presets[idx].key);
          }
        }}
        onSlideChangeTransitionEnd={(swiper) => {
          const idx = swiper.realIndex;
          if (idx >= 0 && idx < presets.length && presets[idx].key !== selectedPreset) {
            onPresetClick(presets[idx].key);
          }
        }}
      >
        {presets.map((preset) => {
          const Icon = preset.icon;
          return (
            <SwiperSlide key={preset.key}>
              <button
                className={`preset-button ${selectedPreset === preset.key ? 'preset-selected' : ''}`}
                type="button"
                onClick={() => onPresetClick(preset.key)}
              >
                <Icon size={16} />
                <span>{preset.label}</span>
              </button>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </div>
  );
}
