export function doInstantJump(carousel: HTMLDivElement, newLeft: number) {
  const prevBehavior = carousel.style.scrollBehavior;
  const prevSnap = carousel.style.scrollSnapType;
  try {
    carousel.style.scrollBehavior = 'auto';
    carousel.style.scrollSnapType = 'none';
    carousel.scrollLeft = newLeft;
  } finally {
    // Restore smooth behavior and snap after instant jump
    carousel.style.scrollBehavior = prevBehavior || 'smooth';
    carousel.style.scrollSnapType = prevSnap || 'x mandatory';
  }
}

