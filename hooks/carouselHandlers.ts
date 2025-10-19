import { RefObject } from 'react';

export function initScrollToMiddle(carouselRef: RefObject<HTMLDivElement>) {
  const init = () => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    const seg = carousel.scrollWidth / 3;
    if (seg && isFinite(seg)) {
      carousel.scrollLeft = seg;
    }
  };
  requestAnimationFrame(() => requestAnimationFrame(init));
}

export function centerOnSelected(carouselRef: RefObject<HTMLDivElement>, value?: string | null | undefined) {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    // delegate to consumer implementation (imported util)
  }));
}

export function doInstantJump(carousel: HTMLDivElement, newLeft: number) {
  const prevBehavior = carousel.style.scrollBehavior;
  const prevSnap = carousel.style.scrollSnapType;
  try {
    carousel.style.scrollBehavior = 'auto';
    carousel.style.scrollSnapType = 'none';
    carousel.scrollLeft = newLeft;
  } finally {
    requestAnimationFrame(() => {
      carousel.style.scrollBehavior = prevBehavior || 'smooth';
      carousel.style.scrollSnapType = prevSnap || 'x mandatory';
    });
  }
}
