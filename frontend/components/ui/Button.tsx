import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'md' | 'lg';

const cls = (variant: Variant, size: Size, extra?: string) =>
  ['btn', `btn-${variant}`, size === 'lg' ? 'btn-lg' : '', extra ?? ''].filter(Boolean).join(' ');

interface CommonProps {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}

export function Button({ variant = 'primary', size = 'md', icon, className, children, ...rest }: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={cls(variant, size, className)} {...rest}>
      {icon}
      {children}
    </button>
  );
}

/** Link styled as a button. External links open safely in a new tab and announce that to screen readers. */
export function ButtonLink({
  variant = 'secondary',
  size = 'md',
  icon,
  href,
  className,
  children,
  ...rest
}: CommonProps & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const external = /^https?:\/\//.test(href);
  return (
    <a
      href={href}
      className={cls(variant, size, className)}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      {...rest}
    >
      {icon}
      {children}
      {external && (
        <>
          <ArrowUpRight size={16} aria-hidden className="opacity-70" />
          <span className="sr-only"> (opens in a new tab)</span>
        </>
      )}
    </a>
  );
}
