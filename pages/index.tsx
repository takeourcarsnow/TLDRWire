import React, { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import { useTheme } from '../hooks/useTheme';
import { usePreferences, type Preferences } from '../hooks/usePreferences';
import { useApi } from '../hooks/useApi';
import { NewsForm } from '../components/NewsForm';
import { NewsOutput } from '../components/NewsOutput';
import { ThemeToggle } from '../components/ThemeToggle';
import { Modal } from '../components/Modal';

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const { preferences, updatePreference, resetPreferences } = usePreferences();
  const { makeRequest, isLoading, error, data, clearError } = useApi();
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  const lastRequestRef = useRef<any>(null);

  useEffect(() => {
    // Load compact mode from localStorage
    const saved = localStorage.getItem('tldrwire:compact') === 'true';
    setCompactMode(saved);
  }, []);

  useEffect(() => {
    // Save compact mode to localStorage
    localStorage.setItem('tldrwire:compact', compactMode ? 'true' : 'false');
  }, [compactMode]);

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

  const generateSummary = useCallback(async () => {
    if (isLoading) return;
    
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
  }, [isLoading, preferences, makeRequest, clearError]);

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
            compactMode={compactMode}
            onCompactModeChange={setCompactMode}
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
    </>
  );
}