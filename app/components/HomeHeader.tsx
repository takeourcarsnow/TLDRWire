import React from 'react';

interface HomeHeaderProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export function HomeHeader({ theme, onToggleTheme }: HomeHeaderProps) {
  return (
    <header className="site-header">
      <div className="header-content">
        <div className="header-main">
          <h1>TLDRWire</h1>
          <span className="tag">Get the news, minus the noise</span>
        </div>
      </div>
    </header>
  );
}