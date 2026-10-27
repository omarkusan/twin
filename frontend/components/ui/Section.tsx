import type { ReactNode } from 'react';

interface SectionProps {
  id: string;
  /** Which navigation item this section belongs to (for the active-link indicator). */
  nav?: string;
  eyebrow: string;
  title: ReactNode;
  lead?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Section({ id, nav, eyebrow, title, lead, children, className = '' }: SectionProps) {
  return (
    <section id={id} data-nav={nav ?? id} aria-labelledby={`${id}-title`} className={`section ${className}`}>
      <div className="container-page">
        <div className="mb-10 max-w-2xl md:mb-14">
          <p className="eyebrow">{eyebrow}</p>
          <h2 id={`${id}-title`} className="heading-display mt-3 text-4xl sm:text-5xl">
            {title}
          </h2>
          {lead && <p className="mt-4 text-lg leading-relaxed text-ink-muted">{lead}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}
