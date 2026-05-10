'use client';

import { useEffect, useState } from 'react';
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
  const [activeValue, setActiveValue] = useState(value);
  const hasDescriptions = options.some((o) => o.description);

  useEffect(() => {
    setActiveValue(value);
  }, [value]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.5px] text-[#666]">{label}</p>
        {hasDescriptions && (
          <button
            type="button"
            onClick={() => setShowInfo(!showInfo)}
            className={cn(
              'p-0.5 rounded-full transition-colors',
              showInfo
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:surface-interactive'
            )}
          >
            {showInfo ? <X className="h-3 w-3" /> : <Info className="h-3 w-3" />}
          </button>
        )}
      </div>

      {showInfo && (
        <div className="rounded-lg bg-sidebar-accent/60 p-2.5 space-y-1.5 text-[11px] leading-snug animate-in fade-in slide-in-from-top-1 duration-150">
          {options.map((opt) => (
            <div key={opt.value}>
              <span className="font-medium text-foreground">{opt.label}</span>
              {opt.description && (
                <span className="text-muted-foreground"> â€” {opt.description}</span>
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
            onClick={() => {
              setActiveValue(opt.value);
              onChange(opt.value);
            }}
            className={cn(
              'px-[11px] py-[5px] text-[11px] rounded-[16px] border border-[#d0d0d0] outline-none transition-all duration-200',
              'hover:border-[var(--accent-brand)]',
              'focus-visible:ring-1 focus-visible:ring-ring',
              'disabled:opacity-50 disabled:pointer-events-none',
              activeValue === opt.value
                ? 'bg-white text-[#333] border-[#d0d0d0]'
                : 'bg-[#f8f8f8] text-[#333]'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
