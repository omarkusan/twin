'use client';

import { MessageCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTwin } from '@/components/twin/TwinProvider';

/** Floating shortcut to the twin. Hidden while the hero or the twin section is visible (they already offer it). */
export function TwinLauncher() {
  const { openTwin, expanded } = useTwin();
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set(['home']));

  useEffect(() => {
    const targets = ['home', 'twin'].map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
    const io = new IntersectionObserver((entries) => {
      setVisibleIds((prev) => {
        const next = new Set(prev);
        for (const e of entries) {
          if (e.isIntersecting) next.add(e.target.id);
          else next.delete(e.target.id);
        }
        return next;
      });
    });
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);

  const hidden = expanded || visibleIds.size > 0;
  return (
    <button
      type="button"
      onClick={() => openTwin()}
      className={`launcher ${hidden ? 'launcher--hidden' : ''}`}
      tabIndex={hidden ? -1 : 0}
      aria-hidden={hidden}
    >
      <MessageCircle size={18} aria-hidden />
      Ask my AI twin
    </button>
  );
}
