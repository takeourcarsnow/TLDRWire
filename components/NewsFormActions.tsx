import React, { useState } from 'react';
import { Clock, Sparkles, RotateCcw, Sunrise, Monitor, TrendingUp, MapPin } from 'lucide-react';

interface Props {
  onGenerate: () => Promise<void>;
  onReset: () => void;
  onPresetClick: (preset: string) => void;
  isLoading: boolean;
  rateLimited?: boolean;
  rateLimitCountdown?: number;
}

export default function NewsFormActions({ onGenerate, onReset, onPresetClick, isLoading, rateLimited = false, rateLimitCountdown = 0 }: Props) {
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen((s) => !s);
  const panelId = 'disclaimer-panel';

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
            <>
              <span className="btn-spinner" aria-hidden="true"></span>
              <span>Analyzing latest news…</span>
            </>
          ) : rateLimited ? (
            <span><Clock size={16} /> Wait {rateLimitCountdown}s…</span>
          ) : (
            <span><Sparkles size={16} /> Generate TLDR</span>
          )}
          </button>
        </div>
      </div>

      <div className="btn-group" style={{ marginTop: '12px', gap: '8px', justifyContent: 'space-between' }}>
        <div className="btn-group" style={{ flex: 1 }}>
          <button className="secondary" type="button" title="Reset filters to defaults" onClick={onReset}>
            <RotateCcw size={16} /> Reset
          </button>
        </div>
      </div>

      <div className="btn-group" style={{ marginTop: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <button className="secondary" type="button" onClick={() => onPresetClick('morning')}><Sunrise size={16} /> Morning Brief</button>
        <button className="secondary" type="button" onClick={() => onPresetClick('tech')}><Monitor size={16} /> Tech Digest</button>
        <button className="secondary" type="button" onClick={() => onPresetClick('markets')}><TrendingUp size={16} /> Market Pulse</button>
  <button className="secondary" type="button" onClick={() => onPresetClick('lt-local')}><MapPin size={16} /> Local News</button>
      </div>

      {/* Slide-out disclosure: hidden by default, appears on hover or when toggled */}
      <div className="note-wrap">
        <button className="note-toggle" aria-expanded={open} aria-controls={panelId} onClick={toggle}>{open ? 'Hide' : 'More info'}</button>
        <div id={panelId} className={`note ${open ? 'slide-open' : 'slide-closed'}`} role="region" aria-hidden={!open}>
          <div className="note-inner">
            <strong>Note</strong>
            <p>
              Summaries are generated automatically from a variety of public news sources to provide concise, easy-to-scan overviews. Please treat them as a starting point and verify details before acting on them.
            </p>
            <p className="muted"><small>We process requests server-side for reliability and performance.</small></p>
          </div>
        </div>
      </div>
    </>
  );
}
