import React from 'react';
import { Home, Newspaper, History } from 'lucide-react';

interface BottomNavbarProps {
  activeIndex: number;
  onTabChange: (index: number) => void;
}

export function BottomNavbar({ activeIndex, onTabChange }: BottomNavbarProps) {
  const tabs = [
    { icon: Home, label: 'Home' },
    { icon: Newspaper, label: 'Results' },
    { icon: History, label: 'History' },
  ];

  return (
    <nav className="bottom-navbar" role="tablist" aria-label="Main navigation">
      {tabs.map((tab, index) => {
        const Icon = tab.icon;
        const isActive = activeIndex === index;

        return (
          <button
            key={index}
            className={`nav-tab ${isActive ? 'active' : ''}`}
            onClick={() => onTabChange(index)}
            aria-label={`${tab.label} tab`}
            aria-selected={isActive}
            role="tab"
            tabIndex={isActive ? 0 : -1}
          >
            <Icon size={20} />
            <span className="nav-label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}