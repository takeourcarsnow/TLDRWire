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
// lives in the middle segment when possible (so centering keeps the user in the
// middle segment of the tripled list).
export const centerSelected = (
  carousel: HTMLDivElement | null,
  value: string | undefined,
  behaviour: 'auto' | 'smooth' = 'smooth'
): void => {
  if (!value || !carousel) return;

  const candidates = Array.from(carousel.querySelectorAll('[data-original-value]')) as HTMLElement[];
  // Prefer the middle segment duplicate
  let selectedButton = candidates.find(el => el.dataset.originalValue === value && el.dataset.seg === '1');
  if (!selectedButton) selectedButton = candidates.find(el => el.dataset.originalValue === value);

  if (selectedButton) {
    const carouselRect = carousel.getBoundingClientRect();
    const buttonRect = selectedButton.getBoundingClientRect();
    const carouselCenter = carouselRect.left + carouselRect.width / 2;
    const buttonCenter = buttonRect.left + buttonRect.width / 2;
    const scrollLeft = carousel.scrollLeft + (buttonCenter - carouselCenter);

    // Use scrollTo so we can control behaviour
    try {
      carousel.scrollTo({ left: scrollLeft, behavior: behaviour });
    } catch (e) {
      // fallback for older browsers
      carousel.scrollLeft = scrollLeft;
    }
  }
};

// Center the neighboring item relative to the currently centered item.
// direction: 1 -> next, -1 -> previous
export const centerNeighbor = (
  carousel: HTMLDivElement | null,
  direction: 1 | -1,
  onChange?: (value: string) => void,
  onPresetClick?: (preset: string) => void,
  centerSelectedFn?: (value: string, behaviour?: 'auto' | 'smooth') => void
): void => {
  if (!carousel) return;

  const candidates = Array.from(carousel.querySelectorAll('[data-original-value]')) as HTMLElement[];
  if (candidates.length === 0) return;

  // Prefer the middle segment duplicates
  const midCandidates = candidates.filter(el => el.dataset.seg === '1');
  const list = midCandidates.length ? midCandidates : candidates;

  const carouselRect = carousel.getBoundingClientRect();
  const carouselCenter = carouselRect.left + carouselRect.width / 2;

  // find index of currently centered item
  let closestIndex = 0;
  let closestDist = Number.POSITIVE_INFINITY;
  list.forEach((el, idx) => {
    const r = el.getBoundingClientRect();
    const center = r.left + r.width / 2;
    const dist = Math.abs(center - carouselCenter);
    if (dist < closestDist) {
      closestDist = dist;
      closestIndex = idx;
    }
  });

  const nextIndex = (closestIndex + direction + list.length) % list.length;
  const nextEl = list[nextIndex];
  const val = nextEl?.dataset.originalValue;
  if (!val) return;

  // Notify parent of the change
  if (onChange) onChange(val);
  else if (onPresetClick) onPresetClick(val);

  // Center the chosen item smoothly (centerSelected prefers middle segment duplicate)
  if (centerSelectedFn) centerSelectedFn(val, 'smooth');
};

// Helper to find the closest item to the carousel center and select it.
export const selectClosest = (
  carousel: HTMLDivElement | null,
  onChange?: (value: string) => void,
  onPresetClick?: (preset: string) => void,
  currentValue?: string,
  currentSelectedPreset?: string | null,
  centerSelectedFn?: (value: string, behaviour?: 'auto' | 'smooth') => void
): void => {
  if (!carousel) return;

  const candidates = Array.from(carousel.querySelectorAll('[data-original-value]')) as HTMLElement[];
  if (candidates.length === 0) return;

  const carouselRect = carousel.getBoundingClientRect();
  const carouselCenter = carouselRect.left + carouselRect.width / 2;

  // Prefer items living in the middle tripled segment when possible
  const midCandidates = candidates.filter(el => el.dataset.seg === '1');
  const searchList = midCandidates.length ? midCandidates : candidates;

  let closest: HTMLElement | null = null;
  let closestDist = Number.POSITIVE_INFINITY;
  for (const el of searchList) {
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
    if (centerSelectedFn) centerSelectedFn(val, 'smooth');
  }
};