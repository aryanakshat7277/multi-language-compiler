import { useState, useEffect } from 'react';

export function useAnimatedCounter(targetValue: number, duration: number = 800): number {
  const [current, setCurrent] = useState<number>(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const startValue = current;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const nextVal = Math.round(startValue + (targetValue - startValue) * ease);
      setCurrent(nextVal);

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }, [targetValue, duration]);

  return current;
}
