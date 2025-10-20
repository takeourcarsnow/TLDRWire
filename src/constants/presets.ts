import React from 'react';
import { Sunrise, Monitor, TrendingUp, MapPin, Zap, Building, Microscope, Heart, Calendar, Globe, Briefcase, GraduationCap, Leaf, Palette, Gamepad2, Music, Cloud, Plane, DollarSign } from 'lucide-react';

export type DefaultPreset = readonly [string, React.ComponentType<any>];

export const presets: DefaultPreset[] = [
  ['morning', Sunrise],
  ['tech', Monitor],
  ['markets', TrendingUp],
  ['lt-local', MapPin],
  ['breaking', Zap],
  ['politics', Building],
  ['sports', Gamepad2],
  ['entertainment', Music],
  ['science', Microscope],
  ['health', Heart],
  ['business', Briefcase],
  ['international', Globe],
  ['environment', Leaf],
  ['education', GraduationCap],
  ['arts', Palette],
  ['weekend', Calendar],
  ['weather', Cloud],
  ['travel', Plane],
  ['finance', DollarSign],
];

export type Option = {
  value: string;
  label?: string;
  icon?: string | React.ComponentType<any>;
  // optional color (CSS color string) to tint the icon for this option
  color?: string;
};

// Per-preset color mapping. These colors are intentionally simple and
// chosen to semantically match the category (e.g. green for finance,
// yellow for morning/sun, red for health/breaking).
export const presetColors: Record<string, string> = {
  morning: '#F59E0B', // yellow / sunrise
  tech: '#6366F1', // indigo
  markets: '#10B981', // green
  'lt-local': '#06B6D4', // cyan
  breaking: '#EF4444', // red
  politics: '#2563EB', // blue
  sports: '#FB923C', // orange
  entertainment: '#DB2777', // pink
  science: '#7C3AED', // violet
  health: '#EF4444', // red
  business: '#6B7280', // neutral gray
  international: '#3B82F6', // blue
  environment: '#16A34A', // green
  education: '#1E40AF', // navy
  arts: '#D946EF', // magenta
  weekend: '#F97316', // amber/orange
  weather: '#60A5FA', // light blue
  travel: '#06B6D4', // cyan
  finance: '#059669', // green/teal
};