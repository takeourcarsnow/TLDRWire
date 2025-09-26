import React from 'react';
import TwEmoji from './TwEmoji';
import CustomSelect from './CustomSelect';
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
            <label htmlFor="region"><TwEmoji text={'📍'} /> Region</label>
            <div className="select-with-flag">
              <CustomSelect id="region" value={preferences.region} options={regionOptions} onChange={(v) => onPreferenceChange('region', v)} />
            </div>
          </div>
          <div>
            <label htmlFor="language"><TwEmoji text={'🌐'} /> Language</label>
            <div className="select-with-flag">
              <CustomSelect id="language" value={preferences.language} options={languageOptions} onChange={(v) => onPreferenceChange('language', v)} />
            </div>
          </div>
        </div>
      </div>

      <div className="form-group">
        <div className="row">
          <div>
            <label htmlFor="category">📂 Category</label>
            <select
              id="category"
              value={preferences.category}
              onChange={(e) => onPreferenceChange('category', e.target.value)}
            >
              <option value="top">⭐ Top Stories</option>
              <option value="world">🌐 World</option>
              <option value="business">💼 Business</option>
              <option value="technology">💻 Technology</option>
              <option value="science">🔬 Science</option>
              <option value="sports">⚽ Sports</option>
              <option value="entertainment">🎬 Entertainment</option>
              <option value="culture">🎭 Culture & Arts</option>
              <option value="health">🏥 Health</option>
              <option value="politics">🏛️ Politics</option>
              <option value="climate">🌱 Climate</option>
              <option value="crypto">🪙 Crypto</option>
              <option value="energy">⚡ Energy</option>
              <option value="education">🎓 Education</option>
              <option value="travel">✈️ Travel</option>
              <option value="gaming">🎮 Gaming</option>
              <option value="space">🚀 Space</option>
              <option value="security">🛡️ Security/Defense</option>
            </select>
          </div>
          <div>
            <label htmlFor="style">✍️ Writing Style</label>
            <select
              id="style"
              value={preferences.style}
              onChange={(e) => onPreferenceChange('style', e.target.value)}
            >
              <option value="neutral">📄 Neutral</option>
              <option value="concise-bullets">🎯 Concise Bullets</option>
              <option value="casual">💬 Casual</option>
              <option value="headlines-only">📰 Headlines Only</option>
              <option value="analytical">📊 Analytical</option>
              <option value="executive-brief">👔 Executive Brief</option>
              <option value="snarky">😏 Snarky</option>
              <option value="optimistic">🌈 Optimistic</option>
              <option value="skeptical">🧐 Skeptical</option>
              <option value="storyteller">📖 Storyteller</option>
              <option value="dry-humor">🙃 Dry Humor</option>
              <option value="urgent-brief">⏱️ Urgent Brief</option>
              <option value="market-analyst">📈 Market Analyst</option>
              <option value="doomer">🕳️ Doomer</option>
              <option value="4chan-user">🕶️ 4chan-style</option>
              <option value="uzkalnis">🖋️ Užkalnis-esque</option>
              <option value="piktas-delfio-komentatorius">💢 Piktas Delfio Komentatorius (švelnus)</option>
            </select>
          </div>
        </div>
      </div>
    </>
  );
}
