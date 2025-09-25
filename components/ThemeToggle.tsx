import React from 'react';

interface ThemeToggleProps {
  theme: 'light' | 'dark';
  onToggle: () => void;
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  return (
    <button 
      className="theme-toggle" 
      onClick={onToggle} 
      title="Toggle theme"
      aria-label="Toggle theme"
    >
      <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
    </button>
  );
}