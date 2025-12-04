import React, { useRef, useMemo, useCallback } from 'react';
import { presets, Option, presetColors } from '../constants/presets';
import { capitalizeLabel } from '../utils/carouselUtils';
import { useCarousel } from '../hooks/useCarousel';
import PresetButton from './PresetButton';

interface PresetCarouselProps {
  // legacy API used on the homepage
  onPresetClick?: (preset: string) => void;
  selectedPreset?: string | null;

  options?: Option[];
  value?: string;
  onChange?: (value: string) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const PresetCarousel = React.memo((props: PresetCarouselProps) => {
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {
    carouselRef,
    scrollLeft,
    scrollRight,
    handleKeyDown,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleScroll,
    suppressClickUntilRef,
    selectValue,
    pendingValue,
  } = useCarousel({
    options: props.options,
    value: props.value,
    selectedPreset: props.selectedPreset,
    onChange: props.onChange,
    onPresetClick: props.onPresetClick,
  });

  const usingOptions = Array.isArray(props.options) && props.options.length > 0;

  // Build a normalized items array (value, label, icon) that we can duplicate
  // Memoize to prevent re-creating on every render
  const normalizedItems = useMemo(() => usingOptions
    ? props.options!.map(opt => ({ value: opt.value, label: opt.label, icon: opt.icon, color: opt.color ?? presetColors[opt.value] }))
    : presets.map(([key, Icon]) => ({ value: key, label: capitalizeLabel(key), icon: Icon, color: presetColors[key] })),
    [usingOptions, props.options]
  );

  // Duplicate items twice for seamless looping - memoize
  const items = useMemo(() => 
    [...normalizedItems, ...normalizedItems, ...normalizedItems].map((it, idx) => ({ ...it, _origIndex: idx % normalizedItems.length, _seg: Math.floor(idx / normalizedItems.length) })),
    [normalizedItems]
  );

  return (
    <div
      className="preset-carousel-container"
      onKeyDown={(e) => { 
        handleKeyDown(e); 
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        props.onMouseEnter?.();
        hideTimeoutRef.current = setTimeout(() => { props.onMouseLeave?.(); hideTimeoutRef.current = null; }, 2000);
      }}
      tabIndex={0}
      onTouchStart={(e) => { 
        handleTouchStart(e); 
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        props.onMouseEnter?.();
        hideTimeoutRef.current = setTimeout(() => { props.onMouseLeave?.(); hideTimeoutRef.current = null; }, 2000);
      }}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onPointerDown={(e) => { 
        handlePointerDown(e); 
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        props.onMouseEnter?.();
        hideTimeoutRef.current = setTimeout(() => { props.onMouseLeave?.(); hideTimeoutRef.current = null; }, 2000);
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerCancel}
      onMouseEnter={props.onMouseEnter}
      onMouseLeave={(e) => { e.stopPropagation(); props.onMouseLeave?.(); }}
      // Ensure mouse and wheel interactions on desktop do not bubble
      // up to the page-level swiper which would change the active
      // section while the user is interacting with this carousel.
      onMouseDown={(e) => { e.stopPropagation(); }}
      onMouseMove={(e) => { e.stopPropagation(); }}
      onMouseUp={(e) => { e.stopPropagation(); }}
      onWheel={(e) => { 
        e.stopPropagation(); 
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        props.onMouseEnter?.();
        hideTimeoutRef.current = setTimeout(() => { props.onMouseLeave?.(); hideTimeoutRef.current = null; }, 2000);
      }}
    >
      <div className="preset-carousel" ref={carouselRef} onScroll={handleScroll}>
        {items.map((it, i) => {
          const origValue = it.value as string;
          const isSelected = (props.value === origValue) || (props.selectedPreset === origValue) || (pendingValue === origValue);
          const onClick = (el?: HTMLElement) => {
            // Delegate selection to the carousel hook which will animate and
            // notify the parent after the scroll completes. We pass the
            // clicked DOM element so the hook can center that element.
            selectValue(origValue, el || null);
          };

          return (
            <PresetButton
              key={`${it._origIndex}-${i}`}
              value={origValue}
              label={it.label}
              icon={it.icon}
              color={it.color}
              isSelected={isSelected}
              onClick={onClick}
              suppressClickUntil={suppressClickUntilRef.current}
              data-seg={it._seg}
            />
          );
        })}
      </div>
    </div>
  );
});

export default PresetCarousel;
