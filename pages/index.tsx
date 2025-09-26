import React, { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import { useTheme } from '../hooks/useTheme';
import { usePreferences, type Preferences } from '../hooks/usePreferences';
import { useApi } from '../hooks/useApi';
import HistoryList from '../components/HistoryList';
import { NewsForm } from '../components/NewsForm';
import { NewsOutput } from '../components/NewsOutput';
import { ThemeToggle } from '../components/ThemeToggle';
import { Modal } from '../components/Modal';

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const { preferences, updatePreference, resetPreferences } = usePreferences();
  const { makeRequest, isLoading, error, data, clearError, history, clearHistory, removeHistoryItem } = useApi();
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<any | null>(null);
  const selectedSummaryRef = useRef<HTMLDivElement | null>(null);

  const renderMarkdownToElement = (el: HTMLDivElement | null, markdown: string | undefined) => {
    if (!el || !markdown) return;
    try {
      const html = (window as any).DOMPurify.sanitize((window as any).marked.parse(markdown));
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

      // Process links similarly to NewsOutput
      el.querySelectorAll('a').forEach((link) => {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
        try {
          const rawHref = link.getAttribute('href') || '';
          if (rawHref && !/^https?:/i.test(rawHref)) return;
          const href = rawHref || '#';
          let url = new URL(href, window.location.href);
          let host = (url.hostname || '').replace(/^www\./, '');
          const currentText = (link.textContent || '').trim();
          const looksLikeUrl = /^https?:\/\//i.test(currentText) || currentText === href;
          const endsWithPunct = /[.,;:!?]+$/.test(currentText);
          const looksLikeHostWithPunct = Boolean(host && currentText && currentText.toLowerCase().includes(host.toLowerCase()) && endsWithPunct);
          if (!currentText || looksLikeUrl || currentText.length > 42 || looksLikeHostWithPunct) {
            try {
              const prev = link.previousSibling;
              if (prev && prev.nodeType === Node.TEXT_NODE) {
                const txt = (prev.textContent || '');
                const m = txt.match(/\[([^\]]+)\]\($/);
                if (m) {
                    // remove the trailing bracketed fragment from the previous text node
                    prev.textContent = txt.slice(0, m.index);
                    // Do NOT re-insert the original label text here. Instead ensure a single
                    // separating space so the favicon/link doesn't glue to preceding text.
                    try {
                      const prevTxt = (prev.textContent || '');
                      if (!/\s$/.test(prevTxt)) {
                        link.parentNode?.insertBefore(document.createTextNode(' '), link);
                      } else {
                        prev.textContent = prevTxt.replace(/\s+$/, ' ');
                      }
                    } catch (e) {}
                    const next = link.nextSibling;
                    if (next && next.nodeType === Node.TEXT_NODE) {
                      const nextTxt = next.textContent || '';
                      if (/^\)/.test(nextTxt)) {
                        next.textContent = nextTxt.replace(/^\)+\s*/, '');
                      }
                    }
                } else {
                  if (txt.length > 0 && !/\s$/.test(txt)) {
                    link.parentNode?.insertBefore(document.createTextNode(' '), link);
                  }
                }
              }
            } catch { /* ignore link text repair errors */ }
            link.textContent = (host || 'source').trim().replace(/[\uFFFD\uFEFF\u200B]+/g, '');

            const trimLeadingPunctFromText = (textNode: Node | null) => {
              try {
                if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return;
                let t = (textNode.textContent || '');
                const m = t.match(/^([)\]\.,;:!?\u2026]+)\s*/);
                if (m) {
                  t = t.slice(m[0].length);
                  (textNode as any).textContent = t;
                }
                (textNode as any).textContent = (textNode as any).textContent.replace(/^[\uFFFD\uFEFF\u200B\u00A0\s]+/, '');
              } catch (e) { /* ignore punctuation trim errors */ }
            };

            const trimLeadingPunctFromElementFirstChild = (el: Node | null) => {
              try {
                if (!el || el.nodeType !== Node.ELEMENT_NODE) return;
                const first = (el as Element).firstChild;
                if (first && first.nodeType === Node.TEXT_NODE) {
                  trimLeadingPunctFromText(first);
                  if (((first.textContent || '').trim().length) === 0) {
                    (el as Element).removeChild(first);
                  }
                }
              } catch (e) {}
            };

            try {
              const nextNode = link.nextSibling;
              trimLeadingPunctFromText(nextNode);
              if (nextNode && nextNode.nodeType === Node.ELEMENT_NODE) {
                trimLeadingPunctFromElementFirstChild(nextNode);
              }

              const removePunctSiblings = (node: Node | null) => {
                try {
                  let n = node;
                  for (let i = 0; i < 3 && n; i++) {
                    if (n.nodeType === Node.TEXT_NODE) {
                      const txt = (n.textContent || '').trim();
                      if (/^[\u00A0\uFEFF\uFFFD\u200B\s]*[.,;:!?\u2026]+[\u00A0\uFEFF\uFFFD\u200B\s]*$/.test(txt)) {
                        const toRemove = n;
                        n = n.nextSibling;
                        toRemove.parentNode?.removeChild(toRemove);
                        continue;
                      }
                    }
                    n = n.nextSibling;
                  }
                } catch (e) { /* ignore sibling punctuation removal errors */ }
              };
              removePunctSiblings(link.nextSibling);

              const removePrevPunct = (node: Node | null) => {
                try {
                  let n = node;
                  for (let i = 0; i < 3 && n; i++) {
                    if (n.nodeType === Node.TEXT_NODE) {
                      const txt = (n.textContent || '');
                      if (/([\u00A0\uFEFF\uFFFD\u200B\s]*[.,;:!?\u2026]+)\s*$/.test(txt)) {
                        n.textContent = txt.replace(/([\u00A0\uFEFF\uFFFD\u200B\s]*[.,;:!?\u2026]+)\s*$/, '');
                      }
                    }
                    n = n.previousSibling;
                  }
                } catch (e) {}
              };
              removePrevPunct(link.previousSibling);
            } catch { /* ignore punctuation cleanup errors */ }
          }
          link.title = `Open ${host || 'link'} in new tab`;
          const isGNews = /(^|\.)news\.google\.com$/i.test(url.hostname || '');
          if (isGNews) {
            const raw = url.searchParams.get('url');
            if (raw) {
              try {
                const decoded = decodeURIComponent(raw);
                const candidate = new URL(decoded);
                url = candidate;
                host = (url.hostname || '').replace(/^www\./, '');
              } catch { /* ignore google news url decode errors */ }
            }
            link.setAttribute('href', url.toString());
          }
          if (host) {
            const faviconUrl = `https://www.google.com/s2/favicons?domain=${url.protocol}//${url.hostname}`;
            try {
              const parentEl = link.parentElement as HTMLElement | null;
              if (parentEl && parentEl.classList && parentEl.classList.contains('tldrwire-source')) {
                const first = parentEl.firstElementChild as HTMLElement | null;
                if (first && first.tagName !== 'IMG') {
                  const img = document.createElement('img');
                  img.src = faviconUrl;
                  img.alt = `${host} favicon`;
                  img.style.width = '16px';
                  img.style.height = '16px';
                  img.style.verticalAlign = 'middle';
                  img.style.marginRight = '6px';
                  parentEl.insertBefore(img, parentEl.firstChild);
                }
              } else {
                const wrapper = document.createElement('div');
                wrapper.className = 'tldrwire-source';
                wrapper.style.display = 'block';
                wrapper.style.marginTop = '6px';
                wrapper.style.marginBottom = '2px';

                const img = document.createElement('img');
                img.src = faviconUrl;
                img.alt = `${host} favicon`;
                img.dataset.tldrHost = host;
                img.style.width = '16px';
                img.style.height = '16px';
                img.style.verticalAlign = 'middle';
                img.style.marginRight = '6px';
                const applyThemeToFavicon = (image: HTMLImageElement | null) => {
                  try {
                    if (!image) return;
                    const h = (image.dataset.tldrHost || '').toLowerCase();
                    const theme = document.documentElement.getAttribute('data-theme') || 'light';
                    if (h.includes('nytimes.com')) {
                      if (theme === 'dark') {
                        image.style.filter = 'invert(1)';
                      } else {
                        image.style.filter = '';
                      }
                    }
                  } catch (e) {}
                };
                applyThemeToFavicon(img);
                try {
                  if (!(window as any).__tldrThemeObserverInitialized) {
                    const obs = new MutationObserver(() => {
                      document.querySelectorAll<HTMLImageElement>('.tldrwire-source img[data-tldr-host]').forEach((im) => applyThemeToFavicon(im));
                    });
                    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
                    (window as any).__tldrThemeObserverInitialized = true;
                  }
                } catch (e) {}

                link.parentNode?.insertBefore(wrapper, link);
                wrapper.appendChild(img);
                wrapper.appendChild(link);
              }
            } catch (e) {}
          }
        } catch {
          const t = (link.textContent || '').trim();
          if (t.length > 42) link.textContent = t.slice(0, 40) + '…';
          link.title = 'Open link in new tab';
        }
      });
    } catch (err) {
      if (el) el.textContent = markdown || '';
    }
  };
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [fontSize, setFontSize] = useState(15);
  const lastRequestRef = useRef<any>(null);
  const [lastGenerateTime, setLastGenerateTime] = useState<number>(0);
  const [rateLimitCountdown, setRateLimitCountdown] = useState<number>(0);

  useEffect(() => {
    // Load font size
    const savedSize = Number(localStorage.getItem('tldrwire:fontSize') || '15') || 15;
    setFontSize(savedSize);
  }, []);

  useEffect(() => {
    // Persist and apply summary font size
    localStorage.setItem('tldrwire:fontSize', String(fontSize));
    try {
      document.documentElement.style.setProperty('--summary-font-size', `${fontSize}px`);
    } catch (err) {
      // ignore in non-browser envs
    }
  }, [fontSize]);

  useEffect(() => {
    // Health check on mount
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
  }, []);

  useEffect(() => {
    // Service worker registration
    if ('serviceWorker' in navigator) {
      // Avoid duplicate registration/logs in development (React StrictMode mounts twice).
      (async () => {
        try {
          const existing = await navigator.serviceWorker.getRegistration('/sw.js');
          if (existing) {
            console.log('✅ Service Worker already registered');
            return;
          }
          try {
            await navigator.serviceWorker.register('/sw.js');
            console.log('✅ Service Worker registered successfully');
          } catch (error) {
            console.warn('Service Worker registration failed:', error);
          }
        } catch (err) {
          // Fallback: attempt registration if getRegistration fails for some reason
          try {
            await navigator.serviceWorker.register('/sw.js');
            console.log('✅ Service Worker registered successfully');
          } catch (error) {
            console.warn('Service Worker registration failed:', error);
          }
        }
      })();
    }
  }, []);

  const RATE_LIMIT_SECONDS = 60;
  const RATE_LIMIT_KEY = 'tldrwire:rateLimitExpires';
  // Update countdown every second
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
  }, [selectedHistoryEntry]);
  
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

    const payload = overridePayload || {
      region: preferences.region,
      category: preferences.category,
      style: preferences.style,
      language: preferences.language,
      timeframeHours: Number(preferences.timeframe) || 24,
      limit: Number(preferences.limit) || 20,
      length: preferences.length || 'medium',
      query: (preferences.query || '').trim()
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
      query: prefQuery,
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
          limit: '20',
          query: ''
        };
        break;
      case 'tech':
        updates = {
          region: 'global',
          category: 'technology',
          style: 'concise-bullets',
          length: 'medium',
          timeframe: '24',
          limit: '24',
          query: ''
        };
        break;
      case 'markets':
        updates = {
          region: 'global',
          category: 'business',
          style: 'market-analyst',
          length: 'long',
          timeframe: '24',
          limit: '28',
          query: 'stocks OR bonds OR inflation OR rate'
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
          limit: '20',
          query: ''
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
      length: (updates as any).length || preferences.length || 'medium',
      query: ((updates as any).query || preferences.query || '').trim()
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
          } catch (err) {
            console.warn('generateSummary failed via keyboard', err);
          }
        })();
      }
      if (e.key === 'Escape') {
        if (showAboutModal) setShowAboutModal(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [generateSummary, showAboutModal]);

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
        <h1>TLDRWire</h1>
        <span className="tag">AI-powered quick rundowns 📰</span>
        <div style={{ marginLeft: 12 }}>
          {/* History is now available in the output controls */}
        </div>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>

      <main>
        <section className="panel">
          <NewsForm
            preferences={preferences}
            onPreferenceChange={updatePreference}
            onGenerate={() => generateSummary()}
            onReset={resetPreferences}
            onPresetClick={handlePresetClick}
            isLoading={isLoading}
            rateLimited={rateLimitCountdown > 0}
            rateLimitCountdown={rateLimitCountdown}
            fontSize={fontSize}
            onFontSizeChange={setFontSize}
          />
        </section>

        <section className="panel output">
          <NewsOutput
            isLoading={isLoading}
            error={error}
            data={data}
            lastRequest={lastRequestRef.current}
            onHistory={() => setShowHistoryModal(true)}
          />
        </section>
      </main>

      <footer>
        <p>
          Built with ❤️ using Google&apos;s Gemini AI •{' '}
          <a href="#" onClick={(e) => { e.preventDefault(); setShowAboutModal(true); }}>
            About
          </a>{' '}
          •{' '}
          <a href="https://nefas.tv" target="_blank" rel="noopener noreferrer">
            Author
          </a>
        </p>
      </footer>

      <Modal
        isOpen={showAboutModal}
        onClose={() => setShowAboutModal(false)}
        title="About TLDRWire"
      >
        <p>
          TLDRWire delivers quick, readable summaries of today’s headlines from multiple publishers so you can stay informed fast. Choose region, topic, and length to get briefings tailored to what matters to you.
        </p>
      </Modal>

      

      <Modal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        title="Generation history"
        headerRight={<button className="secondary" onClick={() => clearHistory()} title="Clear all">Clear all</button>}
      >
        <HistoryList
          history={history}
          onApply={(payload) => {
            // apply settings back to preferences
            Object.entries(payload).forEach(([key, value]) => {
              updatePreference(key as keyof Preferences, String(value));
            });
            setShowHistoryModal(false);
          }}
          onDelete={(id) => removeHistoryItem(id)}
          onClear={() => clearHistory()}
          onView={(entry) => setSelectedHistoryEntry(entry)}
        />
      </Modal>

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
                  setShowHistoryModal(false);
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