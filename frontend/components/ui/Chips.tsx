export function Chip({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'accent' }) {
  return <span className={tone === 'accent' ? 'chip chip-accent' : 'chip'}>{children}</span>;
}

export function ChipList({ items, label }: { items: string[]; label?: string }) {
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label={label}>
      {items.map((item) => (
        <li key={item}>
          <Chip>{item}</Chip>
        </li>
      ))}
    </ul>
  );
}
