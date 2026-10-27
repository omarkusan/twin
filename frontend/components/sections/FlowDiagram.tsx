import { ChevronDown, ChevronRight } from 'lucide-react';

/** Simple step diagram built from the documented flow of a project (no invented detail). */
export function FlowDiagram({ steps, label, inline = false }: { steps: string[]; label: string; inline?: boolean }) {
  return (
    <ol className={inline ? 'flow flow--inline' : 'flow'} aria-label={label}>
      {steps.map((step, i) => (
        <li key={step} className="flow__step">
          <span className="flow__node">
            <span className="flow__num" aria-hidden>
              {i + 1}
            </span>
            {step}
          </span>
          {i < steps.length - 1 && (
            <>
              <ChevronDown size={16} aria-hidden className="flow__arrow flow__arrow--v" />
              <ChevronRight size={16} aria-hidden className="flow__arrow flow__arrow--h" />
            </>
          )}
        </li>
      ))}
    </ol>
  );
}
