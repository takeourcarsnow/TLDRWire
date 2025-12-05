// Function to properly capitalize preset labels
export const capitalizeLabel = (label: string): string => {
  // Handle special cases
  const specialCases: Record<string, string> = {
    'lt-local': 'Local',
    'breaking': 'Breaking',
    'weekend': 'Weekend',
    'arts': 'Arts',
    'tech': 'Tech',
    'sports': 'Sports',
    'health': 'Health',
    'business': 'Business',
    'education': 'Education',
    'environment': 'Environment',
    'entertainment': 'Entertainment',
    'international': 'International',
    'politics': 'Politics',
    'science': 'Science',
    'weather': 'Weather',
    'travel': 'Travel',
    'finance': 'Finance',
    'markets': 'Markets',
    'morning': 'Morning'
  };

  return specialCases[label] || label.charAt(0).toUpperCase() + label.slice(1);
};

// Center the selected button when selection changes. Choose the duplicate that
// lives closest to the current carousel center, preferring the middle segment
// duplicate to ensure the infinite loop works immediately.
export const centerSelected = (
  carousel: HTMLDivElement | null,
  value: string | undefined,
  behaviour: 'auto' | 'smooth' = 'smooth'
): void => {
  if (!value || !carousel) return;

  const candidates = Array.from(carousel.querySelectorAll('[data-original-value]')) as HTMLElement[];
  // Find all candidates with the requested value
  const matches = candidates.filter(el => el.dataset.originalValue === value);
  let selectedButton: HTMLElement | undefined = undefined;
  if (matches.length === 1) selectedButton = matches[0];
  else if (matches.length > 1) {
    // Prefer matches in the middle segment (data-seg="1") for infinite loop compatibility
    const middleMatches = matches.filter(el => el.dataset.seg === '1');
    const candidatesToCheck = middleMatches.length > 0 ? middleMatches : matches;
    
    // Choose the closest to the carousel center
    const carouselRect = carousel.getBoundingClientRect();
    const carouselCenter = carouselRect.left + carouselRect.width / 2;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const el of candidatesToCheck) {
      const r = el.getBoundingClientRect();
      const center = r.left + r.width / 2;
      const dist = Math.abs(center - carouselCenter);
      if (dist < bestDist) {
        bestDist = dist;
        selectedButton = el;
      }
    }
  } else {
    // no exact matches — nothing to center
    return;
  }

  if (selectedButton) {
    const prevSnap = carousel.style.scrollSnapType;
    const prevBehavior = carousel.style.scrollBehavior;
    carousel.style.scrollSnapType = 'none';
    carousel.style.scrollBehavior = 'smooth';
    const carouselRect = carousel.getBoundingClientRect();
    const buttonRect = selectedButton.getBoundingClientRect();
    const carouselCenter = carouselRect.left + carouselRect.width / 2;
    const buttonCenter = buttonRect.left + buttonRect.width / 2;
    const scrollLeft = carousel.scrollLeft + (buttonCenter - carouselCenter);

    try {
      carousel.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    } catch (e) {
      // fallback for older browsers
      carousel.scrollLeft = scrollLeft;
    }
    // Restore snap and behavior after animation
    setTimeout(() => {
      carousel.style.scrollSnapType = prevSnap || 'x mandatory';
      carousel.style.scrollBehavior = prevBehavior || 'auto';
    }, 1000);
  }
};

// Center the neighboring item relative to the currently centered item.
// direction: 1 -> next, -1 -> previous
export const centerNeighbor = (
  carousel: HTMLDivElement | null,
  direction: 1 | -1,
  onChange?: (value: string) => void,
  onPresetClick?: (preset: string) => void,
  centerSelectedFn?: (carousel: HTMLDivElement | null, value: string, behaviour?: 'auto' | 'smooth') => void
): void => {
  if (!carousel) return;

  const candidates = Array.from(carousel.querySelectorAll('[data-original-value]')) as HTMLElement[];
  if (candidates.length === 0) return;

  const carouselRect = carousel.getBoundingClientRect();
  const carouselCenter = carouselRect.left + carouselRect.width / 2;

  // find index of currently centered item
  let closestIndex = 0;
  let closestDist = Number.POSITIVE_INFINITY;
  candidates.forEach((el, idx) => {
    const r = el.getBoundingClientRect();
    const center = r.left + r.width / 2;
    const dist = Math.abs(center - carouselCenter);
    if (dist < closestDist) {
      closestDist = dist;
      closestIndex = idx;
    }
  });

  const nextIndex = (closestIndex + direction + candidates.length) % candidates.length;
  const nextEl = candidates[nextIndex];
  const val = nextEl?.dataset.originalValue;
  if (!val) return;

  if (onChange) onChange(val);
  else if (onPresetClick) onPresetClick(val);

  // Center the chosen item (no special segment logic required)
  if (centerSelectedFn) centerSelectedFn(carousel, val, 'smooth');
};

// Helper to find the closest item to the carousel center and select it.
export const selectClosest = (
  carousel: HTMLDivElement | null,
  onChange?: (value: string) => void,
  onPresetClick?: (preset: string) => void,
  currentValue?: string | null,
  currentSelectedPreset?: string | null,
  centerSelectedFn?: (carousel: HTMLDivElement | null, value: string, behaviour?: 'auto' | 'smooth') => void
): void => {
  if (!carousel) return;

  const candidates = Array.from(carousel.querySelectorAll('[data-original-value]')) as HTMLElement[];
  if (candidates.length === 0) return;

  const carouselRect = carousel.getBoundingClientRect();
  const carouselCenter = carouselRect.left + carouselRect.width / 2;

  let closest: HTMLElement | null = null;
  let closestDist = Number.POSITIVE_INFINITY;
  for (const el of candidates) {
    const r = el.getBoundingClientRect();
    const center = r.left + r.width / 2;
    const dist = Math.abs(center - carouselCenter);
    if (dist < closestDist) {
      closestDist = dist;
      closest = el;
    }
  }

  if (closest && closest.dataset.originalValue) {
    const val = closest.dataset.originalValue;
    // If different than current selection, notify parent
    const currentlySelected = currentValue || currentSelectedPreset;
    if (val !== currentlySelected) {
      if (onChange) onChange(val);
      else if (onPresetClick) onPresetClick(val);
    }

    // Center the found item smoothly
    if (centerSelectedFn) centerSelectedFn(carousel, val, 'smooth');
  }
};