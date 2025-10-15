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

interface PresetCarouselProps {
  onPresetClick: (preset: string) => void;
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

export default function PresetCarousel({ onPresetClick }: PresetCarouselProps) {
  return (
    <div className="preset-carousel">
      <Swiper
        modules={[FreeMode]}
        spaceBetween={6}
        // Use auto slide sizing so more items can fit; slide widths come from content/styles
        slidesPerView={'auto'}
        centeredSlides={false}
        nested={true}
        allowTouchMove={true}
        freeMode={true}
        breakpoints={{
          // These breakpoints keep spacing sensible on larger screens but slides remain auto-sized
          640: { spaceBetween: 8 },
          1024: { spaceBetween: 10 },
          1280: { spaceBetween: 12 },
        }}
        style={{ paddingBottom: '24px' }}
      >
        {presets.map((preset) => {
          const Icon = preset.icon;
          return (
            <SwiperSlide key={preset.key} style={{ height: 'auto', width: 'auto' }}>
              <button
                className="secondary preset-button compact-preset"
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
