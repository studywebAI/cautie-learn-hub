'use client';

import { cn } from '@/lib/utils';

type CautieLoaderProps = {
  className?: string;
  label?: string;
  sublabel?: string;
  size?: 'sm' | 'md' | 'lg';
};

const sizeClasses = {
  sm: {
    wrap: 'h-10 w-10',
    inner: 'h-4 w-4',
    text: 'text-xs',
  },
  md: {
    wrap: 'h-14 w-14',
    inner: 'h-5 w-5',
    text: 'text-sm',
  },
  lg: {
    wrap: 'h-16 w-16',
    inner: 'h-6 w-6',
    text: 'text-sm',
  },
} as const;

export function CautieLoader({
  className,
  label = 'Loading',
  sublabel = 'Preparing your workspace',
  size = 'md',
}: CautieLoaderProps) {
  const s = sizeClasses[size];

  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 text-center', className)}>
      <div className={cn('relative', s.wrap)}>
        <div className="absolute inset-0 rounded-full border border-zinc-300/80" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-zinc-600 border-r-zinc-500" />
        <div className="absolute inset-[28%] rounded-full bg-zinc-800/90" />
      </div>
      <div className={cn('leading-tight', s.text)}>
        <p className="font-medium text-foreground">{label}</p>
        <p className="text-muted-foreground">{sublabel}</p>
      </div>
    </div>
  );
}

