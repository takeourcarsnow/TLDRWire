import React from 'react';
import TwEmoji from './TwEmoji';
import VerticalSelectCarousel from './VerticalSelectCarousel';
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
        <div className="row">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            <label htmlFor="region" style={{ marginBottom: 0, flexShrink: 0, fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}><MapPin size={16} /> Region:</label>
            <VerticalSelectCarousel id="region" value={preferences.region} options={REGION_OPTIONS} onChange={(v) => onPreferenceChange('region', v)} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            <label htmlFor="language" style={{ marginBottom: 0, flexShrink: 0, fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}><Globe size={16} /> Language:</label>
            <VerticalSelectCarousel id="language" value={preferences.language} options={LANGUAGE_OPTIONS} onChange={(v) => onPreferenceChange('language', v)} />
          </div>
        </div>
      </div>

      <div className="form-group">
        <div className="row">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            <label htmlFor="category" style={{ marginBottom: 0, flexShrink: 0, fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}><Folder size={16} /> Category:</label>
            <VerticalSelectCarousel id="category" value={preferences.category} options={CATEGORY_OPTIONS} onChange={(v) => onPreferenceChange('category', v)} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            <label htmlFor="style" style={{ marginBottom: 0, flexShrink: 0, fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}><PenTool size={16} /> Writing Style:</label>
            <VerticalSelectCarousel id="style" value={preferences.style} options={STYLE_OPTIONS} onChange={(v) => onPreferenceChange('style', v)} />
          </div>
        </div>
      </div>
    </>
  );
}
