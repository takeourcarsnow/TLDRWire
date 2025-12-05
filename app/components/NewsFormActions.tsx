import React from 'react';
import { Clock, Sparkles, Loader, User } from 'lucide-react';
import dynamic from 'next/dynamic';
import PresetCarousel from './PresetCarousel';

const ThemeToggle = dynamic(() => import('./ThemeToggle').then(m => ({ default: m.ThemeToggle })), { ssr: false });

interface Props {
  onGenerate: () => Promise<void>;
  onPresetClick: (preset: string) => void;
  isLoading: boolean;
  rateLimited?: boolean;
  rateLimitCountdown?: number;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export default function NewsFormActions({ onGenerate, onPresetClick, isLoading, rateLimited = false, rateLimitCountdown = 0, theme, onToggleTheme }: Props) {
  return (
    <>
      <div className="actions">
        <div className="btn-group" style={{ flex: 1 }}>
          <button
            type="button"
            onClick={onGenerate}
            className="primary"
            disabled={isLoading || rateLimited}
            style={rateLimited ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
          >
            {isLoading ? (
              <span><Loader size={16} className="spin" /> Generating…</span>
            ) : rateLimited ? (
              <span><Clock size={16} /> Wait {rateLimitCountdown}s…</span>
            ) : (
              <span><Sparkles size={16} /> Generate TLDR</span>
            )}
          </button>
        </div>
      </div>

      <div className="form-actions">
        <a
          href="https://nefas.tv"
          target="_blank"
          rel="noopener noreferrer"
          className="author-link"
          title="Visit author's website"
          aria-label="Visit author's website"
        >
          <User size={16} />
        </a>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>

  {/* PresetCarousel moved to top of home panel (pages/index.tsx) */}
    </>
  );
}
