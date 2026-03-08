'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Info, X } from 'lucide-react';

type PillOption = {
  value: string;
  label: string;
  description?: string;
};

type PillSelectorProps = {
  label: string;
  options: PillOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function PillSelector({ label, options, value, onChange, disabled }: PillSelectorProps) {
  const [showInfo, setShowInfo] = useState(false);
  const hasDescriptions = options.some((o) => o.description);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <p className="text-xs text-muted-foreground">{label}</p>
        {hasDescriptions && (
          <button
            type="button"
            onClick={() => setShowInfo(!showInfo)}
            className={cn(
              'p-0.5 rounded-full transition-colors',
              showInfo
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            {showInfo ? <X className="h-3 w-3" /> : <Info className="h-3 w-3" />}
          </button>
        )}
      </div>

      {showInfo && (
        <div className="rounded-lg border bg-background p-2.5 space-y-1.5 text-[11px] leading-snug animate-in fade-in slide-in-from-top-1 duration-150">
          {options.map((opt) => (
            <div key={opt.value}>
              <span className="font-medium text-foreground">{opt.label}</span>
              {opt.description && (
                <span className="text-muted-foreground"> — {opt.description}</span>
              )}
            </div>
          ))}
        </div>
      )}

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
                ? 'bg-primary text-primary-foreground border-primary'
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
