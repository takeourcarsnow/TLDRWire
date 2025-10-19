import React from 'react';
import Head from 'next/head';
import { HomeHeader } from '../components/HomeHeader';
import { HomeMain } from '../components/HomeMain';
import { HomeModal } from '../components/HomeModal';
import { useHome } from '../hooks/useHome';

export default function Home() {
  const h = useHome();

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

      <HomeHeader theme={h.theme} onToggleTheme={h.toggleTheme} />

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
      />

      <HomeModal
        selectedHistoryEntry={h.selectedHistoryEntry}
        setSelectedHistoryEntry={h.setSelectedHistoryEntry}
        onApplyHistory={h.onApplyHistory}
        onDeleteHistory={h.removeHistoryItem}
        updatePreference={h.updatePreference}
        setActiveTab={h.setActiveTab}
      />
    </>
  );
}