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

  const observerRef = React.useRef<ResizeObserver | null>(null);
  const bodyObserverRef = React.useRef<ResizeObserver | null>(null);

  const updatePositions = React.useCallback(() => {
    // Defer measurement to the next animation frame so layout (including
    // scrollbar appearance/disappearance) has settled.
    requestAnimationFrame(() => {
      const container = navRef.current;
      const activeBtn = tabRefs.current[activeIndex];
      if (!container || !activeBtn) return;

      // Use getBoundingClientRect to compute position relative to nav container
  const containerRect = container.getBoundingClientRect();
  const activeRect = activeBtn.getBoundingClientRect();

  // Compute center and width as percentages of the nav container. Using
  // percentages makes the visual position stable when the browser
  // scrollbar appears/disappears (which changes the viewport but not
  // relative percentages inside the container).
  const centerPx = (activeRect.left - containerRect.left) + activeRect.width / 2;
  const centerPct = (centerPx / containerRect.width) * 100;
  const widthPct = (activeRect.width / containerRect.width) * 100;

  // Store percentage values (include % suffix) so CSS can use them
  // directly in left and width calculations.
  container.style.setProperty('--nav-dot-left-percent', `${centerPct}%`);
  container.style.setProperty('--nav-pill-left-percent', `${centerPct}%`);
  container.style.setProperty('--nav-pill-width-percent', `${widthPct}%`);
    });
  }, [activeIndex]);

  // Run on mount and whenever activeIndex changes.
  React.useEffect(() => {
    updatePositions();
  }, [updatePositions]);

  // Observe changes that can affect layout: nav size, document size (to
  // detect scrollbar toggles) and viewport resizes. This ensures the
  // pill is recalculated when the page gets/loses a vertical scrollbar.
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const onResize = () => updatePositions();

    // Window/viewport events
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize);

    // Observe the documentElement (root) to pick up scrollbar width/layout
    // changes. ResizeObserver on root will fire when the viewport changes
    // due to a scrollbar appearing/disappearing.
    try {
      bodyObserverRef.current = new ResizeObserver(onResize);
      bodyObserverRef.current.observe(document.documentElement);
    } catch (e) {
      // ResizeObserver may not be supported in some environments; fall back
      // to window resize only.
    }

    // Also observe the nav container itself for size changes
    const container = navRef.current;
    if (container) {
      observerRef.current = new ResizeObserver(onResize);
      observerRef.current.observe(container);
    }

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      if (window.visualViewport) window.visualViewport.removeEventListener('resize', onResize);
      bodyObserverRef.current?.disconnect();
      observerRef.current?.disconnect();
    };
  }, [updatePositions]);

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