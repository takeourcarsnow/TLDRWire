import React from 'react';
import { presets, Option } from '../constants/presets';
import { capitalizeLabel } from '../utils/carouselUtils';
import { useCarousel } from '../hooks/useCarousel';
import PresetButton from './PresetButton';
import CarouselArrows from './CarouselArrows';

interface PresetCarouselProps {
  // legacy API used on the homepage
  onPresetClick?: (preset: string) => void;
  selectedPreset?: string | null;

  options?: Option[];
  value?: string;
  onChange?: (value: string) => void;
}

const PresetCarousel = (props: PresetCarouselProps) => {
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
  const normalizedItems = usingOptions
    ? props.options!.map(opt => ({ value: opt.value, label: opt.label, icon: opt.icon }))
    : presets.map(([key, Icon]) => ({ value: key, label: capitalizeLabel(key), icon: Icon }));

  // Create a tripled list (left, middle, right) so the carousel can
  // seamlessly wrap. Each duplicate carries an _origIndex and _seg so
  // centering logic can prefer the middle segment when needed.
  const items = [0, 1, 2].flatMap(seg =>
    normalizedItems.map((it, idx) => ({ ...it, _origIndex: idx, _seg: seg }))
  );

  return (
    <div
      className="preset-carousel-container"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerCancel}
    >
      <CarouselArrows onScrollLeft={scrollLeft} onScrollRight={scrollRight} />
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
              key={`${it._seg}-${it._origIndex}-${i}`}
              value={origValue}
              label={it.label}
              icon={it.icon}
              isSelected={isSelected}
              onClick={onClick}
              suppressClickUntil={suppressClickUntilRef.current}
              seg={it._seg}
            />
          );
        })}
      </div>
    </div>
  );
};

export default PresetCarousel;
