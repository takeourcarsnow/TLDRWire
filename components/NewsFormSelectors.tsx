import React from 'react';
import { Preferences } from '../hooks/usePreferences';

interface Props {
  preferences: Preferences;
  onPreferenceChange: (key: keyof Preferences, value: string) => void;
}

export default function NewsFormSelectors({ preferences, onPreferenceChange }: Props) {
  return (
    <>
      <div className="form-group">
        <div className="row">
          <div>
            <label htmlFor="region">📍 Region</label>
            <select
              id="region"
              value={preferences.region}
              onChange={(e) => onPreferenceChange('region', e.target.value)}
            >
              <option value="global">🌍 Global</option>
              <option value="lithuania">🇱🇹 Lithuania</option>
              <option value="united-states">🇺🇸 United States</option>
              <option value="united-kingdom">🇬🇧 United Kingdom</option>
              <option value="germany">🇩🇪 Germany</option>
              <option value="france">🇫🇷 France</option>
              <option value="india">🇮🇳 India</option>
              <option value="japan">🇯🇵 Japan</option>
              <option value="brazil">🇧🇷 Brazil</option>
              <option value="australia">🇦🇺 Australia</option>
            </select>
          </div>
          <div>
            <label htmlFor="language">🌐 Language</label>
            <select
              id="language"
              value={preferences.language}
              onChange={(e) => onPreferenceChange('language', e.target.value)}
            >
              <option value="en">🇺🇸 English</option>
              <option value="lt">🇱🇹 Lithuanian</option>
              <option value="de">🇩🇪 German</option>
              <option value="fr">🇫🇷 French</option>
              <option value="pt">🇵🇹 Portuguese</option>
              <option value="ja">🇯🇵 Japanese</option>
              <option value="hi">🇮🇳 Hindi</option>
            </select>
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
