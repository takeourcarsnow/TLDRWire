import React from 'react';
import TwEmoji from './TwEmoji';
import CustomSelect from './CustomSelect';
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
  return (
    <>
      <div className="form-group">
        <div className="row">
          <div>
            <label htmlFor="region"><MapPin size={16} /> Region</label>
            <div className="select-with-flag">
              <CustomSelect id="region" value={preferences.region} options={regionOptions} onChange={(v) => onPreferenceChange('region', v)} />
            </div>
          </div>
          <div>
            <label htmlFor="language"><Globe size={16} /> Language</label>
            <div className="select-with-flag">
              <CustomSelect id="language" value={preferences.language} options={languageOptions} onChange={(v) => onPreferenceChange('language', v)} />
            </div>
          </div>
        </div>
      </div>

      <div className="form-group">
        <div className="row">
          <div>
            <label htmlFor="category"><Folder size={16} /> Category</label>
            <select
              id="category"
              value={preferences.category}
              onChange={(e) => onPreferenceChange('category', e.target.value)}
            >
              <option value="top"><Star size={16} /> Top Stories</option>
              <option value="world"><Globe size={16} /> World</option>
              <option value="business"><Briefcase size={16} /> Business</option>
              <option value="technology"><Monitor size={16} /> Technology</option>
              <option value="science"><Microscope size={16} /> Science</option>
              <option value="sports"><Trophy size={16} /> Sports</option>
              <option value="entertainment"><Film size={16} /> Entertainment</option>
              <option value="culture"><Theater size={16} /> Culture & Arts</option>
              <option value="health"><Hospital size={16} /> Health</option>
              <option value="politics"><Building size={16} /> Politics</option>
              <option value="climate"><Leaf size={16} /> Climate</option>
              <option value="crypto"><Coins size={16} /> Crypto</option>
              <option value="energy"><Zap size={16} /> Energy</option>
              <option value="education"><GraduationCap size={16} /> Education</option>
              <option value="travel"><Plane size={16} /> Travel</option>
              <option value="gaming"><Gamepad size={16} /> Gaming</option>
              <option value="space"><Rocket size={16} /> Space</option>
              <option value="security"><Shield size={16} /> Security/Defense</option>
            </select>
          </div>
          <div>
            <label htmlFor="style"><PenTool size={16} /> Writing Style</label>
            <select
              id="style"
              value={preferences.style}
              onChange={(e) => onPreferenceChange('style', e.target.value)}
            >
              <option value="neutral"><FileText size={16} /> Neutral</option>
              <option value="concise-bullets"><Target size={16} /> Concise Bullets</option>
              <option value="casual"><MessageCircle size={16} /> Casual</option>
              <option value="headlines-only"><Newspaper size={16} /> Headlines Only</option>
              <option value="analytical"><BarChart size={16} /> Analytical</option>
              <option value="executive-brief"><Briefcase size={16} /> Executive Brief</option>
              <option value="snarky"><Meh size={16} /> Snarky</option>
              <option value="optimistic"><Rainbow size={16} /> Optimistic</option>
              <option value="skeptical"><Eye size={16} /> Skeptical</option>
              <option value="storyteller"><Book size={16} /> Storyteller</option>
              <option value="dry-humor"><Frown size={16} /> Dry Humor</option>
              <option value="urgent-brief"><Clock size={16} /> Urgent Brief</option>
              <option value="market-analyst"><TrendingUp size={16} /> Market Analyst</option>
              <option value="doomer"><AlertTriangle size={16} /> Doomer</option>
              <option value="4chan-user"><Glasses size={16} /> 4chan-style</option>
              <option value="uzkalnis"><Pen size={16} /> Užkalnis-esque</option>
              <option value="piktas-delfio-komentatorius"><Angry size={16} /> Piktas Delfio Komentatorius (švelnus)</option>
            </select>
          </div>
        </div>
      </div>
    </>
  );
}
