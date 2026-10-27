'use client';

import { ArrowUp, FolderOpen, MessageCircle } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { useTwin } from '@/components/twin/TwinProvider';
import { twin } from '@/lib/profile';

export function HeroActions() {
  const { openTwin } = useTwin();
  return (
    <div className="mt-9 flex flex-wrap items-center gap-3">
      <Button size="lg" icon={<MessageCircle size={18} aria-hidden />} onClick={() => openTwin()}>
        Meet My Digital Twin
      </Button>
      <ButtonLink href="#projects" size="lg" variant="secondary" icon={<FolderOpen size={18} aria-hidden />}>
        Explore My Projects
      </ButtonLink>
    </div>
  );
}

/** Compact entry point to the twin inside the hero: ask a question and the expanded chat opens with it. */
export function HeroTwinCard() {
  const { openTwin } = useTwin();
  const [value, setValue] = useState('');

  function submit(e: FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (!q) return openTwin();
    openTwin(q);
    setValue('');
  }

  return (
    <div className="hero-card__ask">
      <p className="text-sm font-semibold">Ask my AI twin</p>
      <p className="text-xs text-ink-subtle">An AI representation of me, grounded in my documented background.</p>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {twin.starters.slice(0, 2).map((q) => (
          <li key={q}>
            <button type="button" className="chip-btn chip-btn--sm" onClick={() => openTwin(q)}>
              {q}
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={submit} className="composer mt-3" aria-label="Ask the AI twin a question">
        <label htmlFor="hero-ask" className="sr-only">
          Ask the AI twin a question
        </label>
        <input id="hero-ask" value={value} onChange={(e) => setValue(e.target.value)} className="composer__input composer__input--single" placeholder="Type a question…" autoComplete="off" enterKeyHint="send" />
        <button type="submit" className="composer__send" aria-label="Ask the twin" disabled={false}>
          <ArrowUp size={18} aria-hidden />
        </button>
      </form>
    </div>
  );
}
