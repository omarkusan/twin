'use client';

import { Check, Copy, Mail } from 'lucide-react';
import { GithubIcon, LinkedinIcon } from '@/components/ui/BrandIcons';
import { useState } from 'react';
import { copyText } from '@/lib/clipboard';
import { profile } from '@/lib/profile';
import { Reveal } from '@/components/ui/Reveal';
import { Section } from '@/components/ui/Section';

export function Contact() {
  const [copied, setCopied] = useState(false);
  const { email, linkedin, github } = profile.links;

  const cards = [
    { label: 'Email', value: email, href: `mailto:${email}`, icon: Mail, external: false },
    { label: 'LinkedIn', value: linkedin.replace(/^https?:\/\/(www\.)?/, ''), href: linkedin, icon: LinkedinIcon, external: true },
    { label: 'GitHub', value: github.replace(/^https?:\/\/(www\.)?/, ''), href: github, icon: GithubIcon, external: true },
  ];

  return (
    <Section
      id="contact"
      eyebrow="Contact"
      title="Let's talk."
      lead="The twin can cover the basics. For roles, collaborations, or anything that needs a human, reach me directly."
    >
      <ul className="grid gap-4 md:grid-cols-3">
        {cards.map((c, i) => (
          <li key={c.label}>
            <Reveal delay={i * 60} className="h-full">
              <a
                href={c.href}
                className="card card-hover group flex h-full items-center gap-4 p-5"
                {...(c.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                  <c.icon size={20} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm text-ink-subtle">{c.label}</span>
                  <span className="block truncate font-medium group-hover:text-accent">{c.value}</span>
                  {c.external && <span className="sr-only">(opens in a new tab)</span>}
                </span>
              </a>
            </Reveal>
          </li>
        ))}
      </ul>
      <Reveal delay={200}>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={async () => {
              if (await copyText(email)) {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2000);
              }
            }}
          >
            {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
            {copied ? 'Email copied' : 'Copy email address'}
          </button>
          <p className="text-sm text-ink-subtle" role="status">
            {copied ? 'Copied to your clipboard.' : `Based in ${profile.location}.`}
          </p>
        </div>
      </Reveal>
    </Section>
  );
}
