'use client';

import { ArrowUp } from 'lucide-react';
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { MAX_MESSAGE_CHARS } from '@/lib/twin/types';

interface ComposerProps {
  /** Returns a validation message when the text was rejected, otherwise null. */
  onSend: (text: string) => string | null;
  busy: boolean;
  autoFocus?: boolean;
}

export function Composer({ onSend, busy, autoFocus = false }: ComposerProps) {
  const [value, setValue] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);
  const hintId = useId();

  // Grow with content up to a few lines.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, [value]);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  function submit(e?: FormEvent) {
    e?.preventDefault();
    if (busy) return;
    const problem = onSend(value);
    setHint(problem);
    if (!problem) {
      setValue('');
      ref.current?.focus();
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends, Shift+Enter inserts a newline. Do not hijack Enter during IME composition.
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  }

  const remaining = MAX_MESSAGE_CHARS - value.length;
  const canSend = value.trim().length > 0 && !busy;

  return (
    <form onSubmit={submit} className="px-3 pb-3 pt-2 sm:px-4 sm:pb-4" aria-label="Message the AI twin">
      <div className="composer">
        <label htmlFor={`${hintId}-input`} className="sr-only">
          Message to Omar&apos;s AI twin
        </label>
        <textarea
          id={`${hintId}-input`}
          ref={ref}
          value={value}
          rows={1}
          onChange={(e) => {
            setValue(e.target.value);
            if (hint) setHint(null);
          }}
          onKeyDown={onKeyDown}
          placeholder="Ask about my background, projects, or AI engineering…"
          enterKeyHint="send"
          autoComplete="off"
          aria-describedby={hint ? `${hintId}-hint` : undefined}
          aria-invalid={hint ? true : undefined}
          className="composer__input"
        />
        <button type="submit" className="composer__send" disabled={!canSend} aria-label="Send message">
          <ArrowUp size={18} aria-hidden />
        </button>
      </div>
      <div className="mt-2 flex min-h-5 items-start justify-between gap-3 text-xs text-ink-subtle">
        <p id={`${hintId}-hint`} role="status" className={hint ? 'text-danger' : ''}>
          {hint ?? 'AI-generated from my documented profile. It can be wrong, so verify anything important.'}
        </p>
        {remaining < 300 && (
          <p className={remaining < 0 ? 'shrink-0 text-danger' : 'shrink-0'} aria-live="polite">
            {remaining} left
          </p>
        )}
      </div>
    </form>
  );
}
