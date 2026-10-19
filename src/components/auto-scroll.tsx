'use client';

import { useEffect } from 'react';

interface AutoScrollProps {
  targetId: string;
  delay?: number;
  offset?: number;
  behavior?: ScrollBehavior;
}

export default function AutoScroll({
  targetId,
  delay = 250,
  offset = -20,
  behavior = 'smooth',
}: AutoScrollProps) {
  useEffect(() => {
    let timer2: NodeJS.Timeout | null = null;

    const doScroll = () => {
      const el = document.getElementById(targetId);
      if (el) {
        const y = el.getBoundingClientRect().top + window.pageYOffset + offset;
        window.scrollTo({ top: Math.max(0, y), behavior });
        return true;
      }
      return false;
    };

    const timer = setTimeout(() => {
      const scrolled = doScroll();
      if (!scrolled) {
        timer2 = setTimeout(doScroll, 400);
      }
    }, delay);

    return () => {
      clearTimeout(timer);
      if (timer2) clearTimeout(timer2);
    };
  }, [targetId, delay, offset, behavior]);

  return null;
}
