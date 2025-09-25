import React from 'react';

interface Props {
  onGenerate: () => void;
  onReset: () => void;
  onPresetClick: (preset: string) => void;
  isLoading: boolean;
  rateLimited?: boolean;
  rateLimitCountdown?: number;
}

export default function NewsFormActions({ onGenerate, onReset, onPresetClick, isLoading, rateLimited = false, rateLimitCountdown = 0 }: Props) {
  return (
    <>
      <div className="actions">
        <button
          type="button"
          onClick={onGenerate}
          disabled={isLoading || rateLimited}
          style={rateLimited ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
        >
          {isLoading ? (
            <>
              <span className="btn-spinner" aria-hidden="true"></span>
              <span>Analyzing latest news…</span>
            </>
          ) : rateLimited ? (
            <span>⏳ Wait {rateLimitCountdown}s…</span>
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
        <button className="secondary" type="button" onClick={() => onPresetClick('morning')}>🌅 Morning Brief</button>
        <button className="secondary" type="button" onClick={() => onPresetClick('tech')}>💻 Tech Digest</button>
        <button className="secondary" type="button" onClick={() => onPresetClick('markets')}>📈 Market Pulse</button>
        <button className="secondary" type="button" onClick={() => onPresetClick('lt-local')}>🇱🇹 LT Local</button>
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
