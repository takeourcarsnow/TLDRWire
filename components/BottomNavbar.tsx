import React from 'react';
import { FaHome, FaNewspaper, FaHistory } from 'react-icons/fa';

interface BottomNavbarProps {
  activeIndex: number;
  onTabChange: (index: number) => void;
}

export function BottomNavbar({ activeIndex, onTabChange }: BottomNavbarProps) {
  const tabs = [
    { icon: FaHome, label: 'Home' },
    { icon: FaNewspaper, label: 'Results' },
    { icon: FaHistory, label: 'History' },
  ];

  return (
    <nav className="bottom-navbar">
      {tabs.map((tab, index) => {
        const Icon = tab.icon;
        return (
          <button
            key={index}
            className={`nav-tab ${activeIndex === index ? 'active' : ''}`}
            onClick={() => onTabChange(index)}
            aria-label={tab.label}
          >
            <Icon size={20} />
            <span className="nav-label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}