import React from 'react';
import TwEmoji from './TwEmoji';
import PresetCarousel from './PresetCarousel';
import { MapPin, Globe, Folder, Star, Briefcase, Monitor, Microscope, Trophy, Film, Theater, Hospital, Building, Leaf, Coins, Zap, GraduationCap, Plane, Gamepad, Rocket, Shield, PenTool, FileText, Target, MessageCircle, Newspaper, BarChart, Meh, Rainbow, Eye, Book, Frown, Clock, TrendingUp, AlertTriangle, Glasses, Pen, Angry } from 'lucide-react';
import { Preferences } from '../hooks/usePreferences';
import { REGION_OPTIONS, LANGUAGE_OPTIONS, CATEGORY_OPTIONS, STYLE_OPTIONS } from '../constants/ui';

interface Props {
  preferences: Preferences;
  onPreferenceChange: (key: keyof Preferences, value: string) => void;
}

export default function NewsFormSelectors({ preferences, onPreferenceChange }: Props) {
  return (
    <>
      <div className="form-group">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          <label htmlFor="region" style={{ marginBottom: 0, flexShrink: 0, fontSize: '14px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={16} /> Regions and Language:</label>
          <PresetCarousel options={REGION_OPTIONS} value={preferences.region} onChange={(v) => onPreferenceChange('region', v)} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          <PresetCarousel options={LANGUAGE_OPTIONS} value={preferences.language} onChange={(v) => onPreferenceChange('language', v)} />
        </div>
      </div>

      <div className="form-group">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', flex: 1 }}>
          <label htmlFor="category" style={{ marginBottom: 0, flexShrink: 0, fontSize: '14px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}><Folder size={16} /> Category</label>
          <PresetCarousel options={CATEGORY_OPTIONS} value={preferences.category} onChange={(v) => onPreferenceChange('category', v)} />
        </div>
      </div>

      <div className="form-group">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', flex: 1 }}>
          <label htmlFor="style" style={{ marginBottom: 0, flexShrink: 0, fontSize: '14px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}><PenTool size={16} /> Writing Style</label>
          <PresetCarousel options={STYLE_OPTIONS} value={preferences.style} onChange={(v) => onPreferenceChange('style', v)} />
        </div>
      </div>
    </>
  );
}
