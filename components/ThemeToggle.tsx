import React from 'react';
import { Sun, Moon } from 'lucide-react';

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
      <span>{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}</span>
    </button>
  );
}