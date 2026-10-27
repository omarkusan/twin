'use client';

import { useEffect, useRef } from 'react';
import { ChatPanel } from './ChatPanel';
import { useTwin } from './TwinProvider';

/**
 * Full-screen conversation on a native <dialog>: focus trapping, Escape to close and inert background
 * come from the platform. It shares state with the embedded chat through <TwinProvider>.
 */
export function ExpandedTwin() {
  const { expanded, closeTwin } = useTwin();
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (expanded && !el.open) {
      opener.current = document.activeElement as HTMLElement | null;
      el.showModal();
      document.documentElement.classList.add('modal-open');
    } else if (!expanded && el.open) {
      el.close();
    }
    return () => {
      document.documentElement.classList.remove('modal-open');
    };
  }, [expanded]);

  // When the on-screen keyboard opens (iOS Safari does not resize the layout viewport), track the
  // visual viewport so the composer stays visible above the keyboard.
  useEffect(() => {
    const vv = window.visualViewport;
    const el = dialog.current;
    if (!vv || !el || !expanded) return;
    const update = () => {
      el.style.setProperty('--vvh', `${vv.height}px`);
      el.style.setProperty('--vvt', `${vv.offsetTop}px`);
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, [expanded]);

  return (
    <dialog
      ref={dialog}
      className="twin-dialog"
      aria-label="Expanded conversation with Omar's AI twin"
      onClose={() => {
        document.documentElement.classList.remove('modal-open');
        closeTwin();
        opener.current?.focus?.();
      }}
      onClick={(e) => {
        // Clicking the backdrop (the dialog element itself) closes it.
        if (e.target === dialog.current) closeTwin();
      }}
    >
      {expanded && <ChatPanel variant="expanded" className="h-full" />}
    </dialog>
  );
}
