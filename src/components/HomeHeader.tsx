import React from 'react';
import dynamic from 'next/dynamic';

const ThemeToggle = dynamic(() => import('./ThemeToggle').then(m => ({ default: m.ThemeToggle })), { ssr: false });

interface HomeHeaderProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export function HomeHeader({ theme, onToggleTheme }: HomeHeaderProps) {
  return (
    <header>
      <div className="header-content">
        <div className="header-main">
          <h1>TLDRWire</h1>
          <span className="tag">Get the news, minus the noise</span>
        </div>
      </div>
      <ThemeToggle theme={theme} onToggle={onToggleTheme} />
    </header>
  );
}