import React from 'react';
import TwEmoji from './TwEmoji';
import VerticalSelectCarousel from './VerticalSelectCarousel';
import { MapPin, Globe, Folder, Star, Briefcase, Monitor, Microscope, Trophy, Film, Theater, Hospital, Building, Leaf, Coins, Zap, GraduationCap, Plane, Gamepad, Rocket, Shield, PenTool, FileText, Target, MessageCircle, Newspaper, BarChart, Meh, Rainbow, Eye, Book, Frown, Clock, TrendingUp, AlertTriangle, Glasses, Pen, Angry } from 'lucide-react';
import { Preferences } from '../hooks/usePreferences';

interface Props {
  preferences: Preferences;
  onPreferenceChange: (key: keyof Preferences, value: string) => void;
}

export default function NewsFormSelectors({ preferences, onPreferenceChange }: Props) {
  const regionOptions = [
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

  const languageOptions = [
    { value: 'en', label: 'English', icon: '🇺🇸' },
    { value: 'lt', label: 'Lithuanian', icon: '🇱🇹' },
    { value: 'de', label: 'German', icon: '🇩🇪' },
    { value: 'fr', label: 'French', icon: '🇫🇷' },
    { value: 'pt', label: 'Portuguese', icon: '🇵🇹' },
    { value: 'ja', label: 'Japanese', icon: '🇯🇵' },
    { value: 'hi', label: 'Hindi', icon: '🇮🇳' },
  ];

  const categoryOptions = [
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

  const styleOptions = [
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
    { value: 'piktas-delfio-komentatorius', label: 'Piktas Delfio Komentatorius (švelnus)', icon: Angry },
  ];
  return (
    <>
      <div className="form-group">
        <div className="row">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            <label htmlFor="region" style={{ marginBottom: 0, flexShrink: 0, fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}><MapPin size={16} /> Region:</label>
            <VerticalSelectCarousel id="region" value={preferences.region} options={regionOptions} onChange={(v) => onPreferenceChange('region', v)} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            <label htmlFor="language" style={{ marginBottom: 0, flexShrink: 0, fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}><Globe size={16} /> Language:</label>
            <VerticalSelectCarousel id="language" value={preferences.language} options={languageOptions} onChange={(v) => onPreferenceChange('language', v)} />
          </div>
        </div>
      </div>

      <div className="form-group">
        <div className="row">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            <label htmlFor="category" style={{ marginBottom: 0, flexShrink: 0, fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}><Folder size={16} /> Category:</label>
            <VerticalSelectCarousel id="category" value={preferences.category} options={categoryOptions} onChange={(v) => onPreferenceChange('category', v)} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            <label htmlFor="style" style={{ marginBottom: 0, flexShrink: 0, fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}><PenTool size={16} /> Writing Style:</label>
            <VerticalSelectCarousel id="style" value={preferences.style} options={styleOptions} onChange={(v) => onPreferenceChange('style', v)} />
          </div>
        </div>
      </div>
    </>
  );
}
