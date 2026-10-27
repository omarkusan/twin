'use client';

import { useEffect, useState } from 'react';
import { TwinAvatar } from './TwinAvatar';

/** Shown while the model is generating. After a while it reassures the visitor that work is still happening. */
export function TypingIndicator() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 8000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="flex items-start gap-3" role="status">
      <TwinAvatar size={32} className="mt-0.5 shrink-0" />
      <div className="rounded-2xl rounded-tl-md border border-line bg-surface px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="typing-dots" aria-hidden>
            <i />
            <i />
            <i />
          </span>
          <span className="text-sm text-ink-subtle">{slow ? 'Still working on it…' : 'Thinking…'}</span>
        </div>
      </div>
    </div>
  );
}
