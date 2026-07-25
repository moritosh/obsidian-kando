interface ScrollToOptions {
  elementToScroll: Element;
  speed: number;
  minDuration: number;
  easing: (t: number) => number;
}

// Cancels a still-running animation on the same element so overlapping calls
// (e.g. rapid successive item inserts) don't fight over the scroll position.
const activeAnimations = new WeakMap<Element, () => void>();

export function animateScrollTo([x, y]: [number, number], options: ScrollToOptions): void {
  const { elementToScroll, speed, minDuration, easing } = options;

  activeAnimations.get(elementToScroll)?.();

  const initialX = elementToScroll.scrollLeft;
  const initialY = elementToScroll.scrollTop;
  const distanceX = x - initialX;
  const distanceY = y - initialY;

  if (distanceX === 0 && distanceY === 0) return;

  const duration = Math.max(
    minDuration,
    Math.round((Math.max(Math.abs(distanceX), Math.abs(distanceY)) / 1000) * speed)
  );

  const startTime = Date.now();
  let requestId: number;

  const cancel = () => {
    activeAnimations.delete(elementToScroll);
    cancelAnimationFrame(requestId);
  };

  const step = () => {
    const elapsed = Date.now() - startTime;
    const t = elapsed / duration;

    if (elapsed < duration) {
      elementToScroll.scrollLeft = initialX + distanceX * easing(t);
      elementToScroll.scrollTop = initialY + distanceY * easing(t);
      requestId = requestAnimationFrame(step);
    } else {
      elementToScroll.scrollLeft = x;
      elementToScroll.scrollTop = y;
      activeAnimations.delete(elementToScroll);
    }
  };

  activeAnimations.set(elementToScroll, cancel);
  requestId = requestAnimationFrame(step);
}
