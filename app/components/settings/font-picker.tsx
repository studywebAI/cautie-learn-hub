'use client';

import { cn } from '@/lib/utils';
import type { FontType } from '@/contexts/app-context';
import { Check } from 'lucide-react';

type FontOption = {
  value: FontType;
  label: string;
  preview: string;
};

const FONTS: FontOption[] = [
  { value: 'inter', label: 'inter', preview: 'Clean UI text for all pages' },
  { value: 'legacy', label: 'original', preview: 'Old Segoe-based stack' },
];

export function FontPicker({
  font,
  setFont,
}: {
  font: FontType;
  setFont: (value: FontType) => void;
}) {
  return (
    <div className="space-y-3">
      <label className="text-sm text-foreground lowercase">font</label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {FONTS.map((option) => {
          const selected = font === option.value;
          return (
            <button
              key={option.value}
              onClick={() => setFont(option.value)}
              className={cn(
                'relative rounded-xl border-2 p-3 text-left transition-colors',
                selected ? 'border-primary bg-card' : 'border-border hover:border-muted-foreground/30'
              )}
            >
              {selected ? (
                <span className="absolute right-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3 w-3" />
                </span>
              ) : null}
              <p className="text-sm font-medium lowercase">{option.label}</p>
              <p className="text-xs text-muted-foreground">{option.preview}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
