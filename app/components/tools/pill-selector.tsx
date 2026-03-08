'use client';

import { cn } from '@/lib/utils';

type PillOption = {
  value: string;
  label: string;
};

type PillSelectorProps = {
  label: string;
  options: PillOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function PillSelector({ label, options, value, onChange, disabled }: PillSelectorProps) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              'px-3 py-1 text-xs rounded-full border transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
              'disabled:opacity-50 disabled:pointer-events-none',
              value === opt.value
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-border'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
