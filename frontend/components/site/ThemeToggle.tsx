'use client';

import { Moon, Sun } from 'lucide-react';

/** Toggles the data-theme attribute set by the inline script in layout.tsx. Both icons render; CSS shows the right one. */
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try {
      window.localStorage.setItem('theme', next);
    } catch {
      // Preference simply will not persist.
    }
  }

  return (
    <button type="button" className="icon-btn icon-btn-lg" onClick={toggle} aria-label="Toggle dark theme">
      <Sun size={18} aria-hidden className="theme-icon-sun" />
      <Moon size={18} aria-hidden className="theme-icon-moon" />
    </button>
  );
}
