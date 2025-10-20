import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { Home, Newspaper, History } from 'lucide-react';

interface BottomNavbarProps {
  activeIndex: number;
  onTabChange: (index: number) => void;
  isLoading: boolean;
}

export function BottomNavbar({ activeIndex, onTabChange, isLoading }: BottomNavbarProps) {
  const tabs = [
    { icon: Home, label: 'Home' },
    { icon: Newspaper, label: 'Results' },
    { icon: History, label: 'History' },
  ];

  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Create a container direct under document.body so fixed positioning
    // is calculated against the viewport even when other ancestors
    // have transforms/filters that would otherwise establish a containing block.
    const el = document.createElement('div');
    el.className = 'bottom-navbar-portal';
    document.body.appendChild(el);
    setContainer(el);

    return () => {
      try {
        document.body.removeChild(el);
      } catch (e) {
        // ignore
      }
      setContainer(null);
    };
  }, []);

  useEffect(() => {
    if (container) {
      container.className = `bottom-navbar-portal ${isLoading ? 'blurred' : ''}`;
    }
  }, [container, isLoading]);

  const nav = (
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

  if (container) {
    return ReactDOM.createPortal(nav, container);
  }

  // On server / initial render fall back to rendering nothing to avoid SSR issues.
  return null;
}