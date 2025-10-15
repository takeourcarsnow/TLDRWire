import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const { preferences, updatePreference, resetPreferences } = usePreferences();
  const { makeRequest, isLoading, error, data, clearError, history, clearHistory, removeHistoryItem } = useApi();
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<any | null>(null);
  const selectedSummaryRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  // Memoized markdown renderer so the function reference is stable across renders
  const renderMarkdownToElement = useMemo(() => {
    return (el: HTMLDivElement | null, markdown: string | undefined) => {
      if (!el || !markdown) return;
      try {
        const mdLib = (window as any).marked;
        const sanitizer = (window as any).DOMPurify;
        const html = sanitizer ? sanitizer.sanitize(mdLib ? mdLib.parse(markdown) : markdown) : (mdLib ? mdLib.parse(markdown) : markdown);
        const temp = document.createElement('div');
        temp.innerHTML = html;
        const children = Array.from(temp.children);
        el.innerHTML = '';
        children.forEach((child, idx) => {
          const wrapper = document.createElement('div');
          wrapper.className = 'reveal-up';
          wrapper.style.animationDelay = `${Math.min(idx * 60, 360)}ms`;
          wrapper.appendChild(child);
          el.appendChild(wrapper);
        });

        // Keep link processing lightweight; delegate complex behaviour to NewsOutput when available
        el.querySelectorAll('a').forEach((link) => {
          try {
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
            const rawHref = link.getAttribute('href') || '';
            if (rawHref && !/^https?:/i.test(rawHref)) return;
            const href = rawHref || '#';
            const url = new URL(href, window.location.href);
            const host = (url.hostname || '').replace(/^www\./, '');
            link.title = `Open ${host || 'link'} in new tab`;
          } catch (e) {
            // ignore link processing errors
          }
        });
      } catch (err) {
        if (el) el.textContent = markdown || '';
      }
    };
  }, []);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const lastRequestRef = useRef<any>(null);
  const [lastGenerateTime, setLastGenerateTime] = useState<number>(0);
  const [rateLimitCountdown, setRateLimitCountdown] = useState<number>(0);

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
    if (rateLimitCountdown > 0) {
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
    if (selectedHistoryEntry) {
      // Render the saved summaryFull (or snippet) into the modal's div
      const md = selectedHistoryEntry.summaryFull || selectedHistoryEntry.summarySnippet || '';
      renderMarkdownToElement(selectedSummaryRef.current, md);
    }
  }, [selectedHistoryEntry, renderMarkdownToElement]);
  
  // Keep the browser tab title stable; avoid tying it to changing preferences.

  const generateSummary = useCallback(async (overridePayload?: any) => {
    const now = Date.now();
    if (isLoading) return;
    if (lastGenerateTime && now - lastGenerateTime < RATE_LIMIT_SECONDS * 1000) {
      // Already rate limited
      return;
    }
    setLastGenerateTime(now);
    setRateLimitCountdown(RATE_LIMIT_SECONDS);
    try {
      const expires = now + RATE_LIMIT_SECONDS * 1000;
      localStorage.setItem(RATE_LIMIT_KEY, String(expires));
    } catch (e) {}
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
    
    switch (preset) {
      case 'morning':
        updates = {
          region: 'global',
          category: 'top',
          style: 'executive-brief',
          length: 'short',
          timeframe: '12',
          limit: '20'
        };
        break;
      case 'tech':
        updates = {
          region: 'global',
          category: 'technology',
          style: 'concise-bullets',
          length: 'medium',
          timeframe: '24',
          limit: '24'
        };
        break;
      case 'markets':
        updates = {
          region: 'global',
          category: 'business',
          style: 'market-analyst',
          length: 'long',
          timeframe: '24',
          limit: '28'
        };
        break;
      case 'breaking':
        updates = {
          region: 'global',
          category: 'top',
          style: 'bullet-points',
          length: 'short',
          timeframe: '6',
          limit: '15'
        };
        break;
      case 'politics':
        updates = {
          region: 'global',
          category: 'politics',
          style: 'neutral',
          length: 'medium',
          timeframe: '24',
          limit: '20'
        };
        break;
      case 'sports':
        updates = {
          region: 'global',
          category: 'sports',
          style: 'bullet-points',
          length: 'medium',
          timeframe: '24',
          limit: '25'
        };
        break;
      case 'entertainment':
        updates = {
          region: 'global',
          category: 'entertainment',
          style: 'casual',
          length: 'medium',
          timeframe: '24',
          limit: '20'
        };
        break;
      case 'science':
        updates = {
          region: 'global',
          category: 'science',
          style: 'educational',
          length: 'medium',
          timeframe: '48',
          limit: '15'
        };
        break;
      case 'health':
        updates = {
          region: 'global',
          category: 'health',
          style: 'informative',
          length: 'medium',
          timeframe: '24',
          limit: '18'
        };
        break;
      case 'business':
        updates = {
          region: 'global',
          category: 'business',
          style: 'executive-brief',
          length: 'medium',
          timeframe: '24',
          limit: '22'
        };
        break;
      case 'international':
        updates = {
          region: 'global',
          category: 'world',
          style: 'neutral',
          length: 'medium',
          timeframe: '24',
          limit: '25'
        };
        break;
      case 'environment':
        updates = {
          region: 'global',
          category: 'climate',
          style: 'informative',
          length: 'medium',
          timeframe: '48',
          limit: '15'
        };
        break;
      case 'education':
        updates = {
          region: 'global',
          category: 'education',
          style: 'educational',
          length: 'medium',
          timeframe: '48',
          limit: '12'
        };
        break;
      case 'arts':
        updates = {
          region: 'global',
          category: 'culture',
          style: 'casual',
          length: 'medium',
          timeframe: '48',
          limit: '15'
        };
        break;
      case 'weekend':
        updates = {
          region: 'global',
          category: 'top',
          style: 'casual',
          length: 'long',
          timeframe: '72',
          limit: '30'
        };
        break;
      case 'lt-local': {
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
            if (primary === 'lt') { regionGuess = 'lithuania'; langGuess = 'lt'; }
            else if (primary === 'fr') { regionGuess = 'france'; langGuess = 'fr'; }
            else if (primary === 'de') { regionGuess = 'germany'; langGuess = 'de'; }
            else if (primary === 'es') { regionGuess = 'spain'; langGuess = 'es'; }
            else if (primary === 'it') { regionGuess = 'italy'; langGuess = 'it'; }
            else { regionGuess = 'global'; }
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
        break;
      }
    }

    // Apply updates to preferences so the UI reflects the preset
    Object.entries(updates).forEach(([key, value]) => {
      updatePreference(key as keyof Preferences, value as string);
    });

    // Immediately generate using the preset payload (do not rely on state update timing)
    const payload = {
      region: (updates as any).region || preferences.region,
      category: (updates as any).category || preferences.category,
      style: (updates as any).style || preferences.style,
      language: (updates as any).language || preferences.language,
      timeframeHours: Number((updates as any).timeframe || preferences.timeframe) || 24,
      limit: Number((updates as any).limit || preferences.limit) || 20,
      length: (updates as any).length || preferences.length || 'medium'
    };

    (async () => {
      try {
        await generateSummary(payload);
      } catch (err: any) {
        console.warn('generateSummary failed', err);
      }
    })();
  }, [updatePreference, generateSummary, preferences]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        (async () => {
          try {
            await generateSummary();
            setActiveTab(1);
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
      </Head>

      <header>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
        <div className="header-content">
          <h1>TLDRWire</h1>
          <span className="tag">AI-powered quick rundowns 📰</span>
          <div style={{ marginLeft: 12 }}>
            {/* History is now available in the output controls */}
          </div>
        </div>
      </header>

      <main>
        <SwipeableContainer activeIndex={activeTab} onSlideChange={setActiveTab}>
          <section className="panel">
            {/* Put presets at the very top of the home panel */}
            <PresetCarousel onPresetClick={handlePresetClick} />
            <NewsForm
              preferences={preferences}
              onPreferenceChange={updatePreference}
              onGenerate={async () => { await generateSummary(); setActiveTab(1); }}
              onPresetClick={handlePresetClick}
              isLoading={isLoading}
              rateLimited={rateLimitCountdown > 0}
              rateLimitCountdown={rateLimitCountdown}
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
            renderMarkdownToElement={renderMarkdownToElement}
          />
        </SwipeableContainer>
      </main>

      <BottomNavbar activeIndex={activeTab} onTabChange={setActiveTab} />

      <footer>
        <p>
          Built with ❤️ using Google&apos;s Gemini AI •{' '}
          <a href="https://nefas.tv" target="_blank" rel="noopener noreferrer">
            Author
          </a>
        </p>
      </footer>




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