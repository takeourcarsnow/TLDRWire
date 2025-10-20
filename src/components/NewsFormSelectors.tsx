import React, { useState } from 'react';
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
  const [showRegionLabel, setShowRegionLabel] = useState(false);
  const [showLanguageLabel, setShowLanguageLabel] = useState(false);
  const [showCategoryLabel, setShowCategoryLabel] = useState(false);
  const [showStyleLabel, setShowStyleLabel] = useState(false);

  return (
    <>
      <div className="form-group regions-group">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          <label htmlFor="region" style={{ marginBottom: 0, flexShrink: 0, fontSize: '16px', color: 'var(--text)', opacity: showRegionLabel ? 1 : 0, transition: 'opacity 0.3s ease' }}>Regions</label>
          <PresetCarousel options={REGION_OPTIONS} value={preferences.region} onChange={(v) => onPreferenceChange('region', v)} onMouseEnter={() => { setShowRegionLabel(true); setShowLanguageLabel(false); setShowCategoryLabel(false); setShowStyleLabel(false); }} onMouseLeave={() => setShowRegionLabel(false)} />
        </div>
      </div>

      <div className="form-group language-group">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          <label htmlFor="language" style={{ marginBottom: 0, flexShrink: 0, fontSize: '16px', color: 'var(--text)', opacity: showLanguageLabel ? 1 : 0, transition: 'opacity 0.3s ease' }}>Language</label>
          <PresetCarousel options={LANGUAGE_OPTIONS} value={preferences.language} onChange={(v) => onPreferenceChange('language', v)} onMouseEnter={() => { setShowLanguageLabel(true); setShowRegionLabel(false); setShowCategoryLabel(false); setShowStyleLabel(false); }} onMouseLeave={() => setShowLanguageLabel(false)} />
        </div>
      </div>

      <div className="form-group category-group">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', flex: 1 }}>
          <label htmlFor="category" style={{ marginBottom: 0, flexShrink: 0, fontSize: '16px', color: 'var(--text)', opacity: showCategoryLabel ? 1 : 0, transition: 'opacity 0.3s ease' }}>Category</label>
          <PresetCarousel options={CATEGORY_OPTIONS} value={preferences.category} onChange={(v) => onPreferenceChange('category', v)} onMouseEnter={() => { setShowCategoryLabel(true); setShowRegionLabel(false); setShowLanguageLabel(false); setShowStyleLabel(false); }} onMouseLeave={() => setShowCategoryLabel(false)} />
        </div>
      </div>

      <div className="form-group">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', flex: 1 }}>
          <label htmlFor="style" style={{ marginBottom: 0, flexShrink: 0, fontSize: '16px', color: 'var(--text)', opacity: showStyleLabel ? 1 : 0, transition: 'opacity 0.3s ease' }}>Style</label>
          <PresetCarousel options={STYLE_OPTIONS} value={preferences.style} onChange={(v) => onPreferenceChange('style', v)} onMouseEnter={() => { setShowStyleLabel(true); setShowRegionLabel(false); setShowLanguageLabel(false); setShowCategoryLabel(false); }} onMouseLeave={() => setShowStyleLabel(false)} />
        </div>
      </div>
    </>
  );
}
