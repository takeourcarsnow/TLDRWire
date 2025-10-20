import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { HomeHeader } from '../components/HomeHeader';
import { HomeMain } from '../components/HomeMain';
import { HomeModal } from '../components/HomeModal';
import { InstallPrompt } from '../components/InstallPrompt';
import { useHome } from '../hooks/useHome';
import { usePWAInstall } from '../hooks/usePWAInstall';

const LOADING_MESSAGES = [
  'Fetching articles',
  'Making summaries',
  'Getting photos',
  'Analyzing content',
  'Processing headlines',
  'Gathering sources',
  'Compiling insights',
  'Refining summaries'
];

export default function Home() {
  const h = useHome();
  const { isInstallable, isInstalled, installApp } = usePWAInstall();
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [hasShownInstallPrompt, setHasShownInstallPrompt] = useState(false);

  const [currentMessage, setCurrentMessage] = useState(LOADING_MESSAGES[0]);

  useEffect(() => {
    if (!h.isLoading) return;

    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * LOADING_MESSAGES.length);
      setCurrentMessage(LOADING_MESSAGES[randomIndex]);
    }, 2000);

    return () => clearInterval(interval);
  }, [h.isLoading]);

  // Show install prompt on first visit if installable and not installed
  useEffect(() => {
    if (isInstallable && !isInstalled && !hasShownInstallPrompt) {
      // Check if this is the first visit
      const hasVisited = localStorage.getItem('tldrwire-has-visited');
      if (!hasVisited) {
        // Delay showing the prompt to avoid showing it immediately on page load
        const timer = setTimeout(() => {
          setShowInstallPrompt(true);
          setHasShownInstallPrompt(true);
          localStorage.setItem('tldrwire-has-visited', 'true');
        }, 3000); // Show after 3 seconds

        return () => clearTimeout(timer);
      }
    }
  }, [isInstallable, isInstalled, hasShownInstallPrompt]);

  const handleInstall = () => {
    installApp();
    setShowInstallPrompt(false);
  };

  const handleDismissInstall = () => {
    setShowInstallPrompt(false);
  };

  return (
    <>
      <Head>
        <title>TLDRWire — Get the news, minus the noise</title>
        <meta
          name="description"
          content="AI-powered news summarizer providing quick, intelligent rundowns of current events across regions and categories."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content="TLDRWire — Get the news, minus the noise" />
        <meta property="og:description" content="AI-powered news summarizer providing quick, intelligent rundowns of current events across regions and categories." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="TLDRWire — Get the news, minus the noise" />
        <meta name="twitter:description" content="AI-powered news summarizer providing quick, intelligent rundowns of current events across regions and categories." />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%F0%9F%93%B0%3C/text%3E%3C/svg%3E" />
      </Head>

      <div className={h.isLoading ? 'blurred' : ''}>
        <HomeHeader />

        <HomeMain
          activeTab={h.activeTab}
          setActiveTab={h.setActiveTab}
          isLoading={h.isLoading}
          error={h.error}
          data={h.data}
          lastRequestRef={h.lastRequestRef}
          history={h.history}
          onApplyHistory={h.onApplyHistory}
          onDeleteHistory={h.removeHistoryItem}
          onClearHistory={h.clearHistory}
          preferences={h.preferences}
          updatePreference={h.updatePreference}
          onGenerate={h.generateSummary}
          onPresetClick={h.handlePresetClick}
          selectedPreset={h.selectedPreset}
          rateLimited={h.isRateLimited()}
          rateLimitCountdown={h.rateLimitCountdown}
          isDraggingSlider={h.isDraggingSlider}
          setIsDraggingSlider={h.setIsDraggingSlider}
          theme={h.theme}
          onToggleTheme={h.toggleTheme}
        />

        <HomeModal
          selectedHistoryEntry={h.selectedHistoryEntry}
          setSelectedHistoryEntry={h.setSelectedHistoryEntry}
          onApplyHistory={h.onApplyHistory}
          onDeleteHistory={h.removeHistoryItem}
          updatePreference={h.updatePreference}
          setActiveTab={h.setActiveTab}
        />
      </div>

      {h.isLoading && (
        <div className="loading-overlay">
          <div className="loading-container">
            <div className="loading-text">
              Generating
            </div>
            <div className="loading-subtitle">
              <div key={currentMessage} className="loading-stage">{currentMessage}</div>
            </div>
          </div>
        </div>
      )}

      <InstallPrompt
        isVisible={showInstallPrompt}
        onInstall={handleInstall}
        onDismiss={handleDismissInstall}
      />
    </>
  );
}