import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
});

// jsdom lacks these browser APIs used by the UI.
window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.scrollTo = vi.fn() as unknown as typeof window.HTMLElement.prototype.scrollTo;
window.matchMedia =
  window.matchMedia ||
  ((query: string) =>
    ({ matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(), onchange: null }) as unknown as MediaQueryList);
