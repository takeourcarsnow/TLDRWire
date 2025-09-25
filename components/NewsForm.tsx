import React from 'react';
import { Preferences } from '../hooks/usePreferences';

interface NewsFormProps {
  preferences: Preferences;
  onPreferenceChange: (key: keyof Preferences, value: string) => void;
  onGenerate: () => void;
  onReset: () => void;
  onPresetClick: (preset: string) => void;
  isLoading: boolean;
  compactMode: boolean;
  onCompactModeChange: (compact: boolean) => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
}

export function NewsForm({
  preferences,
  onPreferenceChange,
  onGenerate,
  onReset,
  onPresetClick,
  isLoading,
  compactMode,
  onCompactModeChange,
  fontSize,
  onFontSizeChange
}: NewsFormProps) {
  const handleTimeframeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = Number(e.target.value);
    if (value < 1) value = 1;
    if (value > 72) value = 72;
    onPreferenceChange('timeframe', value.toString());
  };

  const handleLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = Number(e.target.value);
    if (value < 8) value = 8;
    if (value > 40) value = 40;
    onPreferenceChange('limit', value.toString());
  };

  const LENGTH_OPTIONS = ['short', 'medium', 'long', 'very-long'];

  const handleLengthSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const idx = Number(e.target.value);
    const clamped = Math.min(Math.max(idx, 0), LENGTH_OPTIONS.length - 1);
    onPreferenceChange('length', LENGTH_OPTIONS[clamped]);
  };

  const lengthIndex = (len: string) => {
    const idx = LENGTH_OPTIONS.indexOf(len);
    return idx >= 0 ? idx : 1;
  };

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

      <div className="form-group">
          <div className="slider-row">
            <div className="slider-group">
              <label htmlFor="timeframe" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '1.1em' }}>⏰</span> Timeframe (hours)
              </label>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 4 }}>
                <input
                  aria-label="Timeframe hours slider"
                  type="range"
                  min={1}
                  max={72}
                  value={Number(preferences.timeframe)}
                  onChange={handleTimeframeChange}
                  style={{ flex: 1 }}
                />
                <div className="muted" style={{ minWidth: 40, textAlign: 'right' }}>{preferences.timeframe}</div>
              </div>
            </div>
            <div className="slider-group">
              <label htmlFor="limit" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '1.1em' }}>📊</span> Articles to Consider
              </label>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 4 }}>
                <input
                  aria-label="Articles to consider slider"
                  type="range"
                  min={8}
                  max={40}
                  value={Number(preferences.limit)}
                  onChange={handleLimitChange}
                  style={{ flex: 1 }}
                />
                <div className="muted" style={{ minWidth: 40, textAlign: 'right' }}>{preferences.limit}</div>
              </div>
            </div>
            <div className="slider-group">
              <label htmlFor="length" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '1.1em' }}>📏</span> TLDR Length
              </label>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 4 }}>
                <input
                  aria-label="TLDR length slider"
                  type="range"
                  min={0}
                  max={LENGTH_OPTIONS.length - 1}
                  step={1}
                  value={lengthIndex(preferences.length)}
                  onChange={handleLengthSliderChange}
                  style={{ flex: 1 }}
                />
                <div className="muted" style={{ minWidth: 80, textAlign: 'right' }}>{preferences.length.replace('-', ' ')}</div>
              </div>
            </div>
          </div>
      </div>

      <div className="form-group">
        <label htmlFor="compactToggle">🧩 Display</label>
        <div className="row">
          <div>
            <label 
              htmlFor="compactToggle" 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                userSelect: 'none', 
                cursor: 'pointer' 
              }}
            >
              <input 
                id="compactToggle" 
                type="checkbox" 
                checked={compactMode}
                onChange={(e) => onCompactModeChange(e.target.checked)}
              />
              🗜️ Compact reading mode
            </label>
          </div>
          <div>
            <label htmlFor="fontSize">
              📏 Font size
            </label>
            <div style={{ display: 'grid', gap: 8 }}>
              <input
                id="fontSize"
                type="range"
                min={12}
                max={20}
                step={1}
                value={fontSize}
                onChange={(e) => onFontSizeChange(Number(e.target.value))}
                aria-label="Summary font size"
              />
              <div className="muted" style={{ fontSize: '0.9rem' }}>{fontSize}px</div>
            </div>
          </div>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="query">🔍 Keyword Filter (Optional)</label>
        <input 
          id="query"
          type="text" 
          placeholder="e.g. climate change, AI breakthrough, sports championship"
          value={preferences.query}
          onChange={(e) => onPreferenceChange('query', e.target.value)}
        />
      </div>

      <div className="actions">
        <button 
          type="button" 
          onClick={onGenerate}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="btn-spinner" aria-hidden="true"></span>
              <span>Analyzing latest news…</span>
            </>
          ) : (
            <span>✨ Generate TLDR</span>
          )}
        </button>
      </div>
      
      <div className="btn-group" style={{ marginTop: '12px', gap: '8px', justifyContent: 'space-between' }}>
        <div className="btn-group" style={{ flex: 1 }}>
          <button className="secondary" type="button" title="Reset filters to defaults" onClick={onReset}>
            ♻️ Reset
          </button>
        </div>
      </div>
      
      <div className="btn-group" style={{ marginTop: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <button 
          className="secondary" 
          type="button" 
          onClick={() => onPresetClick('morning')}
        >
          🌅 Morning Brief
        </button>
        <button 
          className="secondary" 
          type="button" 
          onClick={() => onPresetClick('tech')}
        >
          💻 Tech Digest
        </button>
        <button 
          className="secondary" 
          type="button" 
          onClick={() => onPresetClick('markets')}
        >
          📈 Market Pulse
        </button>
        <button 
          className="secondary" 
          type="button" 
          onClick={() => onPresetClick('lt-local')}
        >
          🇱🇹 LT Local
        </button>
      </div>
      
      <div className="note">
        📡 Data sourced from Google News RSS across multiple publishers. 
        Your Gemini API key stays secure on the server. 
        <br />
        <small>💡 Tip: Use <kbd>Ctrl/Cmd + Enter</kbd> to generate quickly!</small>
      </div>
    </>
  );
}