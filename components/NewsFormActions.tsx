import React from 'react';
import { Clock, Sparkles } from 'lucide-react';
import PresetCarousel from './PresetCarousel';

interface Props {
  onGenerate: () => Promise<void>;
  onPresetClick: (preset: string) => void;
  isLoading: boolean;
  rateLimited?: boolean;
  rateLimitCountdown?: number;
}

export default function NewsFormActions({ onGenerate, onPresetClick, isLoading, rateLimited = false, rateLimitCountdown = 0 }: Props) {
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
            {rateLimited ? (
              <span><Clock size={16} /> Wait {rateLimitCountdown}s…</span>
            ) : (
              <span><Sparkles size={16} /> Generate TLDR</span>
            )}
          </button>
        </div>
      </div>

  {/* PresetCarousel moved to top of home panel (pages/index.tsx) */}
    </>
  );
}
