import { ArrowUp } from 'lucide-react';
import { profile } from '@/lib/profile';

export function Footer() {
  return (
    <footer className="border-t border-line py-10">
      <div className="container-page flex flex-col gap-4 text-sm text-ink-subtle sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-ink">
            {profile.fullName} <span className="font-normal text-ink-subtle">({profile.preferredName})</span>
          </p>
          <p>
            {profile.headline} · {profile.location}
          </p>
        </div>
        <p className="max-w-md sm:text-right">
          Built with Next.js, FastAPI, and Amazon Bedrock on AWS. The AI twin is an AI representation, not a person.
        </p>
        <a href="#home" className="inline-flex items-center gap-1.5 font-medium text-ink hover:text-accent">
          <ArrowUp size={15} aria-hidden /> Back to top
        </a>
      </div>
    </footer>
  );
}
