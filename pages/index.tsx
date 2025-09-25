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
                  const label = m[1];
                  prev.textContent = txt.slice(0, m.index);
                  const labelNode = document.createTextNode(label + ' ');
                  link.parentNode?.insertBefore(labelNode, link);
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
            } catch {}
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
              } catch (e) {}
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
                } catch (e) {}
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
            } catch {}
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
              } catch {}
            }
            link.setAttribute('href', url.toString());
          }
          if (host) {
            const faviconUrl = `https://www.google.com/s2/favicons?domain=${url.protocol}//${url.hostname}`;
            if (!link.previousSibling || !(link.previousSibling as HTMLElement).tagName || ((link.previousSibling as HTMLElement).tagName !== 'IMG')) {
              const img = document.createElement('img');
              img.src = faviconUrl;
              img.alt = `${host} favicon`;
              img.style.width = '16px';
              img.style.height = '16px';
              img.style.verticalAlign = 'middle';
              img.style.marginRight = '6px';
              link.parentNode?.insertBefore(img, link);
            }
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
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  const [fontSize, setFontSize] = useState(15);
  const lastRequestRef = useRef<any>(null);
  const [lastGenerateTime, setLastGenerateTime] = useState<number>(0);
  const [rateLimitCountdown, setRateLimitCountdown] = useState<number>(0);

  useEffect(() => {
    // Load compact mode from localStorage
    const saved = localStorage.getItem('tldrwire:compact') === 'true';
    setCompactMode(saved);
    // Load font size
    const savedSize = Number(localStorage.getItem('tldrwire:fontSize') || '15') || 15;
    setFontSize(savedSize);
  }, []);

  useEffect(() => {
    // Save compact mode to localStorage
    localStorage.setItem('tldrwire:compact', compactMode ? 'true' : 'false');
  }, [compactMode]);

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
  // Update countdown every second
  useEffect(() => {
    if (rateLimitCountdown > 0) {
      const timer = setTimeout(() => {
        setRateLimitCountdown((c) => Math.max(0, c - 1));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [rateLimitCountdown]);

  useEffect(() => {
    if (selectedHistoryEntry) {
      // Render the saved summaryFull (or snippet) into the modal's div
      const md = selectedHistoryEntry.summaryFull || selectedHistoryEntry.summarySnippet || '';
      renderMarkdownToElement(selectedSummaryRef.current, md);
    }
  }, [selectedHistoryEntry]);

  const generateSummary = useCallback(async () => {
    const now = Date.now();
    if (isLoading) return;
    if (lastGenerateTime && now - lastGenerateTime < RATE_LIMIT_SECONDS * 1000) {
      // Already rate limited
      return;
    }
    setLastGenerateTime(now);
    setRateLimitCountdown(RATE_LIMIT_SECONDS);
    clearError();
    const payload = {
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
      case 'lt-local':
        updates = {
          region: 'lithuania',
          category: 'top',
          language: 'lt',
          style: 'neutral',
          length: 'medium',
          timeframe: '24',
          limit: '20',
          query: ''
        };
        break;
    }

    // Apply updates
    Object.entries(updates).forEach(([key, value]) => {
      updatePreference(key as keyof Preferences, value as string);
    });

    // Generate summary after a short delay to allow state updates
    setTimeout(async () => {
      try {
        await generateSummary();
      } catch (err: any) {
        console.warn('generateSummary failed', err);
      }
    }, 100);
  }, [updatePreference, generateSummary]);

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
        if (showFeedbackModal) setShowFeedbackModal(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [generateSummary, showAboutModal, showFeedbackModal]);

  return (
    <>
      <Head>
  <title>TLDRWire</title>
        <meta
          name="description"
          content="AI-powered news summarizer providing quick, intelligent rundowns of current events across regions and categories."
        />
      </Head>

      <ThemeToggle theme={theme} onToggle={toggleTheme} />

      <header>
        <h1>TLDRWire</h1>
        <span className="tag">AI-powered quick rundowns 📰</span>
        <div style={{ marginLeft: 12 }}>
          <button className="secondary" onClick={() => setShowHistoryModal(true)}>History</button>
        </div>
      </header>

      <main>
        <section className="panel">
          <NewsForm
            preferences={preferences}
            onPreferenceChange={updatePreference}
            onGenerate={generateSummary}
            onReset={resetPreferences}
            onPresetClick={handlePresetClick}
            isLoading={isLoading}
            rateLimited={rateLimitCountdown > 0}
            rateLimitCountdown={rateLimitCountdown}
            compactMode={compactMode}
            onCompactModeChange={setCompactMode}
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
            compactMode={compactMode}
          />
        </section>
      </main>

      <footer>
        <p>
          Built with ❤️ using Google's Gemini AI •{' '}
          <a href="#" onClick={(e) => { e.preventDefault(); setShowAboutModal(true); }}>
            About
          </a>{' '}
          •{' '}
          <a href="#" onClick={(e) => { e.preventDefault(); setShowFeedbackModal(true); }}>
            Feedback
          </a>
        </p>
      </footer>

      <Modal
        isOpen={showAboutModal}
        onClose={() => setShowAboutModal(false)}
        title="About TLDRWire"
      >
        <p>
          TLDRWire fetches headlines from Google News RSS and asks Google's Gemini model to
          produce clear, concise summaries. Your API key never leaves the server.
        </p>
        <p>
          Tips:
          <br />• Use presets for faster results
          <br />• Refine with a keyword filter
          <br />• Try different styles and lengths
        </p>
      </Modal>

      <Modal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        title="Send Feedback"
      >
        <p>Spotted an issue or have an idea? Open an issue on GitHub or email us.</p>
        <p>
          <a
            href="https://github.com/takeourcarsnow/qweasd/issues"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open GitHub Issue
          </a>
        </p>
      </Modal>

      <Modal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        title="Generation history"
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