import Image from 'next/image';

export function TwinAvatar({ size = 36, className = '' }: { size?: number; className?: string }) {
  return (
    <Image
      src="/avatar-sm.webp"
      alt=""
      width={size}
      height={size}
      className={`rounded-full object-cover ring-1 ring-line-strong ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
