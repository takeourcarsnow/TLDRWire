// UI constants and options for TLDRWire

import { MapPin, Globe, Folder, Star, Briefcase, Monitor, Microscope, Trophy, Film, Theater, Hospital, Building, Leaf, Coins, Zap, GraduationCap, Plane, Gamepad, Rocket, Shield, PenTool, FileText, Target, MessageCircle, Newspaper, BarChart, Meh, Rainbow, Eye, Book, Frown, Clock, TrendingUp, AlertTriangle, Glasses, Pen, Angry } from 'lucide-react';

export const REGION_OPTIONS = [
  { value: 'global', label: 'Global', icon: '🌍' },
  { value: 'lithuania', label: 'Lithuania', icon: '🇱🇹' },
  { value: 'united-states', label: 'United States', icon: '🇺🇸' },
  { value: 'united-kingdom', label: 'United Kingdom', icon: '🇬🇧' },
  { value: 'germany', label: 'Germany', icon: '🇩🇪' },
  { value: 'france', label: 'France', icon: '🇫🇷' },
  { value: 'india', label: 'India', icon: '🇮🇳' },
  { value: 'japan', label: 'Japan', icon: '🇯🇵' },
  { value: 'brazil', label: 'Brazil', icon: '🇧🇷' },
  { value: 'australia', label: 'Australia', icon: '🇦🇺' },
];

export const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English', icon: '🇺🇸' },
  { value: 'lt', label: 'Lithuanian', icon: '🇱🇹' },
  { value: 'de', label: 'German', icon: '🇩🇪' },
  { value: 'fr', label: 'French', icon: '🇫🇷' },
  { value: 'pt', label: 'Portuguese', icon: '🇵🇹' },
  { value: 'ja', label: 'Japanese', icon: '🇯🇵' },
  { value: 'hi', label: 'Hindi', icon: '🇮🇳' },
];

export const CATEGORY_OPTIONS = [
  { value: 'top', label: 'Top Stories', icon: Star },
  { value: 'world', label: 'World', icon: Globe },
  { value: 'business', label: 'Business', icon: Briefcase },
  { value: 'technology', label: 'Technology', icon: Monitor },
  { value: 'science', label: 'Science', icon: Microscope },
  { value: 'sports', label: 'Sports', icon: Trophy },
  { value: 'entertainment', label: 'Entertainment', icon: Film },
  { value: 'culture', label: 'Culture & Arts', icon: Theater },
  { value: 'health', label: 'Health', icon: Hospital },
  { value: 'politics', label: 'Politics', icon: Building },
  { value: 'climate', label: 'Climate', icon: Leaf },
  { value: 'crypto', label: 'Crypto', icon: Coins },
  { value: 'energy', label: 'Energy', icon: Zap },
  { value: 'education', label: 'Education', icon: GraduationCap },
  { value: 'travel', label: 'Travel', icon: Plane },
  { value: 'gaming', label: 'Gaming', icon: Gamepad },
  { value: 'space', label: 'Space', icon: Rocket },
  { value: 'security', label: 'Security/Defense', icon: Shield },
];

export const STYLE_OPTIONS = [
  { value: 'neutral', label: 'Neutral', icon: FileText },
  { value: 'concise-bullets', label: 'Concise Bullets', icon: Target },
  { value: 'casual', label: 'Casual', icon: MessageCircle },
  { value: 'headlines-only', label: 'Headlines Only', icon: Newspaper },
  { value: 'analytical', label: 'Analytical', icon: BarChart },
  { value: 'executive-brief', label: 'Executive Brief', icon: Briefcase },
  { value: 'snarky', label: 'Snarky', icon: Meh },
  { value: 'optimistic', label: 'Optimistic', icon: Rainbow },
  { value: 'skeptical', label: 'Skeptical', icon: Eye },
  { value: 'storyteller', label: 'Storyteller', icon: Book },
  { value: 'dry-humor', label: 'Dry Humor', icon: Frown },
  { value: 'urgent-brief', label: 'Urgent Brief', icon: Clock },
  { value: 'market-analyst', label: 'Market Analyst', icon: TrendingUp },
  { value: 'doomer', label: 'Doomer', icon: AlertTriangle },
  { value: '4chan-user', label: '4chan-style', icon: Glasses },
  { value: 'uzkalnis', label: 'Užkalnis-esque', icon: Pen },
  { value: 'piktas-delfio-komentatorius', label: 'Piktas Delfio Komentatorius', icon: Angry },
];

export const LENGTH_OPTIONS = ['short', 'medium', 'long', 'very-long'];

// Slider ranges
export const TIMEFRAME_MIN = 1;
export const TIMEFRAME_MAX = 72;
export const ARTICLES_MIN = 8;
export const ARTICLES_MAX = 40;

export const PRESET_CONFIGS = {
  morning: {
    region: 'global',
    category: 'top',
    style: 'executive-brief',
    length: 'short',
    timeframe: '12',
    limit: '20'
  },
  tech: {
    region: 'global',
    category: 'technology',
    style: 'concise-bullets',
    length: 'medium',
    timeframe: '24',
    limit: '24'
  },
  markets: {
    region: 'global',
    category: 'business',
    style: 'market-analyst',
    length: 'long',
    timeframe: '24',
    limit: '28'
  },
  breaking: {
    region: 'global',
    category: 'top',
    style: 'concise-bullets',
    length: 'short',
    timeframe: '6',
    limit: '15'
  },
  politics: {
    region: 'global',
    category: 'politics',
    style: 'neutral',
    length: 'medium',
    timeframe: '24',
    limit: '20'
  },
  sports: {
    region: 'global',
    category: 'sports',
    style: 'concise-bullets',
    length: 'medium',
    timeframe: '24',
    limit: '25'
  },
  entertainment: {
    region: 'global',
    category: 'entertainment',
    style: 'casual',
    length: 'medium',
    timeframe: '24',
    limit: '20'
  },
  science: {
    region: 'global',
    category: 'science',
    style: 'analytical',
    length: 'medium',
    timeframe: '48',
    limit: '15'
  },
  health: {
    region: 'global',
    category: 'health',
    style: 'neutral',
    length: 'medium',
    timeframe: '24',
    limit: '18'
  },
  business: {
    region: 'global',
    category: 'business',
    style: 'executive-brief',
    length: 'medium',
    timeframe: '24',
    limit: '22'
  },
  international: {
    region: 'global',
    category: 'world',
    style: 'neutral',
    length: 'medium',
    timeframe: '24',
    limit: '25'
  },
  environment: {
    region: 'global',
    category: 'climate',
    style: 'neutral',
    length: 'medium',
    timeframe: '48',
    limit: '15'
  },
  education: {
    region: 'global',
    category: 'education',
    style: 'analytical',
    length: 'medium',
    timeframe: '48',
    limit: '12'
  },
  arts: {
    region: 'global',
    category: 'culture',
    style: 'casual',
    length: 'medium',
    timeframe: '48',
    limit: '15'
  },
  weekend: {
    region: 'global',
    category: 'top',
    style: 'casual',
    length: 'long',
    timeframe: '72',
    limit: '30'
  },
  'lt-local': {
    region: 'lithuania',
    category: 'top',
    language: 'lt',
    style: 'neutral',
    length: 'medium',
    timeframe: '24',
    limit: '20'
  }
};