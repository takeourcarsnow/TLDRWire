import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { renderMarkdownToElement } from '../utils/rendering';
import Head from 'next/head';
import { useTheme } from '../hooks/useTheme';
import { usePreferences, type Preferences } from '../hooks/usePreferences';
import { useApi } from '../hooks/useApi';
import HistoryList from '../components/HistoryList';
import dynamic from 'next/dynamic';
const NewsForm = dynamic(() => import('../components/NewsForm').then(m => m.NewsForm), { ssr: false });
const NewsOutput = dynamic(() => import('../components/NewsOutput').then(m => m.NewsOutput), { ssr: false });
import { ThemeToggle } from '../components/ThemeToggle';
import { Modal } from '../components/Modal';
import { SwipeableContainer } from '../components/SwipeableContainer';
import { BottomNavbar } from '../components/BottomNavbar';
const HistoryPanel = dynamic(() => import('../components/HistoryPanel').then(m => m.HistoryPanel), { ssr: false });
const PresetCarousel = dynamic(() => import('../components/PresetCarousel').then(m => m.default), { ssr: false });
import { SettingsPanel } from '../components/SettingsPanel';
import { PRESET_CONFIGS } from '../constants/ui';
import { detectLanguage, detectRegionFromLanguage } from '../utils/language';

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const { preferences, updatePreference, resetPreferences } = usePreferences();
  const { makeRequest, isLoading, error, data, clearError, history, clearHistory, removeHistoryItem } = useApi();
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<any | null>(null);
  const selectedSummaryRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  // Memoized reference to the shared markdown renderer so history and output look identical
  const renderMarkdownToElementMemo = useMemo(() => renderMarkdownToElement, []);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const lastRequestRef = useRef<any>(null);
  const [lastGenerateTime, setLastGenerateTime] = useState<number>(0);
  const [rateLimitCountdown, setRateLimitCountdown] = useState<number>(0);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);

  // Memoized markdown renderer so the function reference is stable across renders
  const memoizedRenderMarkdownToElement = renderMarkdownToElementMemo;

  useEffect(() => {
    // Health check on mount - only run in non-localhost environments to avoid
    // repeated dev traffic (HMR / dev tools often re-request assets).
    try {
      const host = window.location.hostname;
      const isLocalhost = host === 'localhost' || host === '127.0.0.1' || host === '';
      if (!isLocalhost && (process.env.NEXT_PUBLIC_ENABLE_HEALTHZ === 'true')) {
        fetch('/api/healthz')
          .then(res => res.json())
          .then(health => {
            if (!health.hasKey) {
              console.warn('Server missing GEMINI_API_KEY. Add it to .env and restart.');
            }
          })
          .catch(error => {
            console.warn('Health check failed:', error);
          });
      }
    } catch (e) {
      // ignore in non-browser contexts
    }
  }, []);

  useEffect(() => {
    // Service worker registration (disabled by default to avoid background SW activity).
    // To enable, set NEXT_PUBLIC_ENABLE_SW=true in your environment.
    if (process.env.NEXT_PUBLIC_ENABLE_SW !== 'true') {
      // Intentionally do not register the SW to avoid background work on idle sites.
      console.log('Service Worker registration skipped (NEXT_PUBLIC_ENABLE_SW not set).');
      // If a service worker was registered previously (from earlier deploys), unregister it
      // so it stops intercepting requests (this helps remove repeated background fetches).
      try {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(regs => {
            regs.forEach(r => {
              try { r.unregister(); } catch (e) {}
            });
          }).catch(() => {});
        }
      } catch (e) {}
      return;
    }
    if ('serviceWorker' in navigator) {
      // Avoid duplicate registration/logs in development (React StrictMode mounts twice).
      (async () => {
        try {
          const existing = await navigator.serviceWorker.getRegistration('/sw.js');
          if (existing) {
            console.log('\u2705 Service Worker already registered');
            return;
          }
          try {
            await navigator.serviceWorker.register('/sw.js');
            console.log('\u2705 Service Worker registered successfully');
          } catch (error) {
            console.warn('Service Worker registration failed:', error);
          }
        } catch (err) {
          // Fallback: attempt registration if getRegistration fails for some reason
          try {
            await navigator.serviceWorker.register('/sw.js');
            console.log('\u2705 Service Worker registered successfully');
          } catch (error) {
            console.warn('Service Worker registration failed:', error);
          }
        }
      })();
    }
  }, []);
  const RATE_LIMIT_SECONDS = 60;
  const RATE_LIMIT_KEY = 'tldrwire:rateLimitExpires';
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_DISABLE_RATE_LIMIT && rateLimitCountdown > 0) {
      const timer = setTimeout(() => {
        setRateLimitCountdown((c) => {
          const next = Math.max(0, c - 1);
          try {
            if (next === 0) {
              localStorage.removeItem(RATE_LIMIT_KEY);
            }
          } catch (e) {}
          return next;
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [rateLimitCountdown]);

  // Restore rate limit state from localStorage on mount and sync across tabs
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DISABLE_RATE_LIMIT) return;
    
    try {
      const raw = localStorage.getItem(RATE_LIMIT_KEY);
      if (raw) {
        const expires = Number(raw) || 0;
        const now = Date.now();
        if (expires > now) {
          const remaining = Math.ceil((expires - now) / 1000);
          setRateLimitCountdown(remaining);
          // set lastGenerateTime to the original generation time so generateSummary honor check
          setLastGenerateTime(expires - RATE_LIMIT_SECONDS * 1000);
        } else {
          localStorage.removeItem(RATE_LIMIT_KEY);
        }
      }
    } catch (e) {}

    const onStorage = (e: StorageEvent) => {
      if (e.key !== RATE_LIMIT_KEY) return;
      try {
        if (!e.newValue) {
          setRateLimitCountdown(0);
          setLastGenerateTime(0);
          return;
        }
        const expires = Number(e.newValue) || 0;
        const now = Date.now();
        if (expires > now) {
          const remaining = Math.ceil((expires - now) / 1000);
          setRateLimitCountdown(remaining);
          setLastGenerateTime(expires - RATE_LIMIT_SECONDS * 1000);
        } else {
          setRateLimitCountdown(0);
          setLastGenerateTime(0);
        }
      } catch (err) {}
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (data && !isLoading) {
      setActiveTab(1);
    }
  }, [data, isLoading]);
  
  // Keep the browser tab title stable; avoid tying it to changing preferences.

  const generateSummary = useCallback(async (overridePayload?: any) => {
    const now = Date.now();
    if (isLoading) return;
    if (!process.env.NEXT_PUBLIC_DISABLE_RATE_LIMIT && lastGenerateTime && now - lastGenerateTime < RATE_LIMIT_SECONDS * 1000) {
      // Already rate limited
      return;
    }
    if (!process.env.NEXT_PUBLIC_DISABLE_RATE_LIMIT) {
      setLastGenerateTime(now);
      setRateLimitCountdown(RATE_LIMIT_SECONDS);
      try {
        const expires = now + RATE_LIMIT_SECONDS * 1000;
        localStorage.setItem(RATE_LIMIT_KEY, String(expires));
      } catch (e) {}
    }
    clearError();

    const payload = {
      region: preferences.region,
      category: preferences.category,
      style: preferences.style,
      language: preferences.language,
      timeframeHours: Number(preferences.timeframe) || 24,
      limit: Number(preferences.limit) || 20,
      length: preferences.length || 'medium'
    };
    lastRequestRef.current = payload;
    await makeRequest(payload);
  }, [isLoading, preferences, makeRequest, clearError, lastGenerateTime]);

  const handlePresetClick = useCallback(async (preset: string) => {
    // Pull the specific preference fields we rely on so we can list them
    // explicitly in the dependency array (satisfies react-hooks/exhaustive-deps).
    const {
      region: prefRegion,
      category: prefCategory,
      style: prefStyle,
      language: prefLanguage,
      timeframe: prefTimeframe,
      limit: prefLimit,
      length: prefLength,
    } = preferences;

    let updates = {};
    
    if (preset === 'lt-local') {
      // Try server-side geo lookup first (IP-based). If it fails, fall back to browser locale.
      let regionGuess = 'global';
      let langGuess = preferences.language || 'en';
      try {
        const resp = await fetch('/api/geo');
        if (resp.ok) {
          const j = await resp.json();
          if (j && j.regionKey) regionGuess = j.regionKey;
          if (j && j.language) langGuess = j.language;
        } else {
          throw new Error('geo fetch failed');
        }
      } catch (e) {
        try {
          const navLang = navigator.language || (navigator as any).userLanguage || '';
          const primary = (navLang || '').split('-')[0].toLowerCase();
          regionGuess = detectRegionFromLanguage(primary);
          langGuess = detectLanguage();
        } catch (ex) {
          regionGuess = 'global';
          langGuess = preferences.language || 'en';
        }
      }

      updates = {
        region: regionGuess,
        category: 'top',
        language: langGuess,
        style: 'neutral',
        length: 'medium',
        timeframe: '24',
        limit: '20'
      };
    } else {
      const config = PRESET_CONFIGS[preset as keyof typeof PRESET_CONFIGS];
      if (config) {
        updates = config;
      }
    }

    // Apply updates to preferences so the UI reflects the preset
    Object.entries(updates).forEach(([key, value]) => {
      updatePreference(key as keyof Preferences, value as string);
    });

    // Mark this preset as selected in the UI but do NOT auto-generate.
    // Generation remains an explicit action (Generate button / keyboard shortcut).
    setSelectedPreset(preset);
  }, [updatePreference, preferences]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        (async () => {
          try {
            await generateSummary();
          } catch (err) {
            console.warn('generateSummary failed via keyboard', err);
          }
        })();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [generateSummary]);

  return (
    <>
    <Head>
  <title>TLDRWire — AI-powered news summaries</title>
        <meta
          name="description"
          content="AI-powered news summarizer providing quick, intelligent rundowns of current events across regions and categories."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content="TLDRWire — AI-powered news summaries" />
        <meta property="og:description" content="AI-powered news summarizer providing quick, intelligent rundowns of current events across regions and categories." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="TLDRWire — AI-powered news summaries" />
        <meta name="twitter:description" content="AI-powered news summarizer providing quick, intelligent rundowns of current events across regions and categories." />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%F0%9F%93%B0%3C/text%3E%3C/svg%3E" />
      </Head>

      <header>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
        <div className="header-content">
          <div className="header-main">
            <h1>TLDRWire</h1>
            <span className="tag">Get the news, minus the noise</span>
          </div>
        </div>
      </header>

      <main className={isLoading ? 'blurred' : ''}>
        <SwipeableContainer activeIndex={activeTab} onSlideChange={setActiveTab} disabled={isDraggingSlider}>
          <section className="panel">
            <h2 style={{ margin: 0, flexShrink: 0, fontSize: '18px', fontWeight: 'normal', color: 'var(--text)' }}>Presets</h2>
            <PresetCarousel onPresetClick={handlePresetClick} selectedPreset={selectedPreset} />
            <div className="form-divider"></div>
            <NewsForm
              preferences={preferences}
              onPreferenceChange={updatePreference}
              onGenerate={generateSummary}
              onPresetClick={handlePresetClick}
              selectedPreset={selectedPreset}
              isLoading={isLoading}
              rateLimited={!process.env.NEXT_PUBLIC_DISABLE_RATE_LIMIT && rateLimitCountdown > 0}
              rateLimitCountdown={rateLimitCountdown}
              onSliderDrag={setIsDraggingSlider}
            />
          </section>

          <section className="panel output">
            <NewsOutput
              isLoading={isLoading}
              error={error}
              data={data}
              lastRequest={lastRequestRef.current}
              onHistory={() => setActiveTab(2)} // Switch to history tab
            />
          </section>

          <HistoryPanel
            history={history}
            onApply={(payload) => {
              Object.entries(payload).forEach(([key, value]) => {
                updatePreference(key as keyof Preferences, String(value));
              });
              setActiveTab(0); // Switch to home tab
            }}
            onDelete={removeHistoryItem}
            onClear={clearHistory}
            updatePreference={updatePreference}
            renderMarkdownToElement={memoizedRenderMarkdownToElement}
          />
        </SwipeableContainer>
      </main>

      <BottomNavbar activeIndex={activeTab} onTabChange={setActiveTab} />

      {/* Footer removed per user request */}




      <Modal
        isOpen={Boolean(selectedHistoryEntry)}
        onClose={() => setSelectedHistoryEntry(null)}
        title={selectedHistoryEntry ? `Generated ${new Date(selectedHistoryEntry.timestamp).toLocaleString()}` : 'Entry'}
      >
          {selectedHistoryEntry && (
            <div>
              <div style={{ marginBottom: 12 }}>
                <strong>Settings:</strong>
                <div className="muted" style={{ marginTop: 6 }}>
                  {selectedHistoryEntry.payload.region} • {selectedHistoryEntry.payload.category} • {selectedHistoryEntry.payload.style} • {selectedHistoryEntry.payload.length}
                </div>
              </div>

              <article
                ref={selectedSummaryRef}
                className="summary"
                aria-label="Saved summary"
                style={{
                  marginBottom: 12,
                  // Make modal content match main output width and allow internal scrolling
                  width: 'min(680px, 78vw)',
                  maxHeight: '68vh',
                  overflowY: 'auto',
                  paddingRight: 8
                }}
              />

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="secondary" onClick={() => {
                  // apply settings
                  Object.entries(selectedHistoryEntry.payload).forEach(([key, value]) => {
                    updatePreference(key as keyof Preferences, String(value));
                  });
                  setSelectedHistoryEntry(null);
                  setActiveTab(0); // Switch to home tab
                }}>Apply settings</button>
                <button className="secondary" onClick={() => {
                  navigator.clipboard?.writeText(selectedHistoryEntry.summaryFull || selectedHistoryEntry.summarySnippet || '');
                }}>Copy summary</button>
                <button className="danger" onClick={() => {
                  removeHistoryItem(selectedHistoryEntry.id);
                  setSelectedHistoryEntry(null);
                }}>Delete</button>
              </div>
            </div>
          )}
      </Modal>

      {/* Render sanitized HTML for selected history entry so links and favicons behave like the main output */}
      <script
        dangerouslySetInnerHTML={{ __html: '' }}
      />
    </>
  );
}