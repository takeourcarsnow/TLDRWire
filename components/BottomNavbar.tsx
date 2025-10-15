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

  const navRef = React.useRef<HTMLElement | null>(null);
  const tabRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  React.useEffect(() => {
    // Update CSS vars for pill position/size whenever activeIndex changes
    const container = navRef.current;
    const activeBtn = tabRefs.current[activeIndex];
    if (!container || !activeBtn) return;
    // Use offsetLeft/offsetWidth to compute the position relative to the nav container.
    // The previous mix of getBoundingClientRect + offsetLeft double-counted offsets which
    // caused the pill to be misaligned.
    const left = activeBtn.offsetLeft - container.scrollLeft;
    const width = activeBtn.offsetWidth;
    container.style.setProperty('--nav-pill-left', `${left}px`);
    container.style.setProperty('--nav-pill-width', `${width}px`);
  // also set the center position for a small dot indicator
  const center = left + width / 2;
  container.style.setProperty('--nav-dot-left', `${center}px`);
  }, [activeIndex]);

  return (
    <nav ref={navRef} className="bottom-navbar" role="tablist" aria-label="Main navigation">
  <div className="nav-pill" aria-hidden="true" />
  <div className="nav-dot" aria-hidden="true" />
      {tabs.map((tab, index) => {
        const Icon = tab.icon;
        const isActive = activeIndex === index;

        return (
          <button
            key={index}
            ref={(el) => { tabRefs.current[index] = el; }}
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