'use client';

import { Menu, MessageCircle, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { profile } from '@/lib/profile';
import { useTwin } from '@/components/twin/TwinProvider';
import { ThemeToggle } from './ThemeToggle';

const LINKS = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'experience', label: 'Experience' },
  { id: 'projects', label: 'Projects' },
  { id: 'twin', label: 'AI Digital Twin' },
  { id: 'contact', label: 'Contact' },
] as const;

export function Nav() {
  const { openTwin } = useTwin();
  const [active, setActive] = useState<string>('home');
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

  // Scroll spy: highlight the nav item for the section in the middle of the viewport.
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-nav]'));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.getAttribute('data-nav') ?? 'home');
        }
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the mobile menu with Escape or when the viewport grows to desktop size.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    const mq = window.matchMedia('(min-width: 900px)');
    const onChange = () => mq.matches && setOpen(false);
    document.addEventListener('keydown', onKey);
    mq.addEventListener('change', onChange);
    return () => {
      document.removeEventListener('keydown', onKey);
      mq.removeEventListener('change', onChange);
    };
  }, [open]);

  return (
    <header className={`site-nav ${scrolled || open ? 'site-nav--solid' : ''}`}>
      <nav aria-label="Primary" className="container-page flex h-[var(--nav-h)] items-center justify-between gap-4">
        <a href="#home" className="flex items-center gap-2.5 font-semibold tracking-tight" onClick={() => setOpen(false)}>
          <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-ink font-display text-lg leading-none text-page">
            M
          </span>
          <span className="hidden sm:inline">{profile.fullName}</span>
          <span className="sm:hidden">{profile.preferredName}</span>
        </a>

        <ul className="hidden items-center gap-1 min-[900px]:flex">
          {LINKS.map((l) => (
            <li key={l.id}>
              <a href={`#${l.id}`} className="nav-link" aria-current={active === l.id ? 'true' : undefined}>
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button type="button" className="btn btn-primary hidden min-[900px]:inline-flex" onClick={() => openTwin()}>
            <MessageCircle size={16} aria-hidden />
            Talk to My AI Twin
          </button>
          <button
            ref={menuButton}
            type="button"
            className="icon-btn icon-btn-lg min-[900px]:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
          </button>
        </div>
      </nav>

      <div id="mobile-menu" hidden={!open} className="absolute inset-x-0 top-full max-h-[calc(100dvh-var(--nav-h))] overflow-y-auto border-b border-t border-line bg-page shadow-lg min-[900px]:hidden">
        <div className="container-page py-3">
          <ul className="flex flex-col">
            {LINKS.map((l) => (
              <li key={l.id}>
                <a
                  href={`#${l.id}`}
                  className="flex min-h-12 items-center rounded-lg px-3 text-base font-medium hover:bg-surface-muted aria-[current=true]:text-accent"
                  aria-current={active === l.id ? 'true' : undefined}
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn btn-primary btn-lg mt-3 w-full"
            onClick={() => {
              setOpen(false);
              openTwin();
            }}
          >
            <MessageCircle size={18} aria-hidden />
            Talk to My AI Twin
          </button>
        </div>
      </div>
    </header>
  );
}
