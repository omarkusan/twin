'use client';

import { Globe, X } from 'lucide-react';
import { GithubIcon } from '@/components/ui/BrandIcons';
import { useEffect, useRef } from 'react';
import { ButtonLink } from '@/components/ui/Button';
import { ChipList } from '@/components/ui/Chips';
import type { Project } from '@/lib/profile';
import { FlowDiagram } from './FlowDiagram';

export function ProjectDialog({ project, onClose }: { project: Project | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (project && !el.open) {
      el.showModal();
      document.documentElement.classList.add('modal-open');
    } else if (!project && el.open) {
      el.close();
    }
  }, [project]);

  const hasLinks = !!project && (project.links.github || project.links.demo);

  return (
    <dialog
      ref={ref}
      className="detail-dialog"
      aria-labelledby="project-dialog-title"
      onClose={() => {
        document.documentElement.classList.remove('modal-open');
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {project && (
        <div className="flex max-h-[inherit] flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-5 sm:px-8">
            <div>
              <p className="eyebrow">
                {project.kind} · {project.status}
              </p>
              <h3 id="project-dialog-title" className="heading-display mt-2 text-3xl sm:text-4xl">
                {project.name}
              </h3>
            </div>
            <button type="button" className="icon-btn icon-btn-lg shrink-0" onClick={onClose} aria-label="Close project details">
              <X size={20} aria-hidden />
            </button>
          </header>

          <div className="space-y-7 overflow-y-auto px-6 py-6 sm:px-8">
            <p className="text-lg leading-relaxed text-ink">{project.summary}</p>

            <div>
              <h4 className="eyebrow mb-2">Problem</h4>
              <p className="leading-relaxed text-ink-muted">{project.problem}</p>
            </div>

            <div>
              <h4 className="eyebrow mb-3">How it works</h4>
              <FlowDiagram steps={project.flow} label={`${project.name} flow`} inline />
            </div>

            <div>
              <h4 className="eyebrow mb-3">Technical approach</h4>
              <ul className="space-y-2.5 leading-relaxed text-ink-muted">
                {project.approach.map((a) => (
                  <li key={a} className="bullet">
                    {a}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="eyebrow mb-3">Stack</h4>
              <ChipList items={project.stack} label="Technology stack" />
            </div>

            {project.limits && (
              <p className="rounded-xl border border-line bg-surface-muted p-4 text-sm leading-relaxed text-ink-muted">
                <strong className="font-semibold text-ink">Known limit: </strong>
                {project.limits}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
              {project.links.demo && (
                <ButtonLink href={project.links.demo} variant="primary" icon={<Globe size={16} aria-hidden />}>
                  Live site
                </ButtonLink>
              )}
              {project.links.github && (
                <ButtonLink href={project.links.github} variant="secondary" icon={<GithubIcon size={16} />}>
                  Source on GitHub
                </ButtonLink>
              )}
              {!hasLinks && <p className="text-sm text-ink-subtle">No public repository or demo is linked for this project yet.</p>}
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}
