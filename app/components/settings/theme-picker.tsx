'use client';

import { cn } from '@/lib/utils';
import type { ThemeType } from '@/contexts/app-context';
import { Check } from 'lucide-react';

type ThemeOption = {
  value: ThemeType;
  label: string;
  colors: { bg: string; fg: string; primary: string; card: string; muted: string };
};

const THEMES: ThemeOption[] = [
  { value: 'light', label: 'light', colors: { bg: '#fff', fg: '#000', primary: '#262626', card: '#fff', muted: '#f5f5f5' } },
  { value: 'dark', label: 'dark', colors: { bg: '#0d0d0d', fg: '#fff', primary: '#e6e6e6', card: '#141414', muted: '#262626' } },
  { value: 'ocean', label: 'ocean', colors: { bg: '#f4f7f9', fg: '#1a2a33', primary: '#2a6a8f', card: '#eef3f6', muted: '#e4eaee' } },
  { value: 'forest', label: 'forest', colors: { bg: '#f2f5f3', fg: '#1c2e20', primary: '#2d6b3f', card: '#edf2ee', muted: '#e2e8e3' } },
  { value: 'sunset', label: 'sunset', colors: { bg: '#f9f5f2', fg: '#2b2118', primary: '#b86425', card: '#f5f0eb', muted: '#ebe3dc' } },
  { value: 'rose', label: 'rose', colors: { bg: '#f9f2f5', fg: '#331a24', primary: '#a33c5e', card: '#f5eaef', muted: '#ebe0e5' } },
];

function ThemeCard({ option, selected, onClick }: { option: ThemeOption; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex flex-col rounded-xl border-2 p-3 transition-all duration-200 text-left group',
        selected
          ? 'border-primary shadow-sm'
          : 'border-border hover:border-muted-foreground/30'
      )}
      style={{ backgroundColor: option.colors.bg }}
    >
      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: option.colors.primary }}>
          <Check className="w-3 h-3" style={{ color: option.colors.bg }} />
        </div>
      )}
      <div className="flex flex-col gap-1.5 w-full">
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-1.5 rounded-full" style={{ backgroundColor: option.colors.primary }} />
          <div className="w-5 h-1.5 rounded-full" style={{ backgroundColor: option.colors.muted }} />
        </div>
        <div className="flex gap-1.5 mt-1">
          <div className="flex-1 rounded-md p-1.5" style={{ backgroundColor: option.colors.card }}>
            <div className="w-full h-1 rounded-full mb-1" style={{ backgroundColor: option.colors.fg, opacity: 0.7 }} />
            <div className="w-3/4 h-1 rounded-full" style={{ backgroundColor: option.colors.fg, opacity: 0.3 }} />
          </div>
          <div className="w-8 rounded-md" style={{ backgroundColor: option.colors.muted }} />
        </div>
        <div className="w-10 h-3 rounded-full mt-0.5" style={{ backgroundColor: option.colors.primary }} />
      </div>
      <span className="text-xs mt-2 lowercase" style={{ color: option.colors.fg }}>{option.label}</span>
    </button>
  );
}

export function ThemePicker({
  theme,
  setTheme,
}: {
  theme: ThemeType;
  setTheme: (t: ThemeType) => void;
}) {
  return (
    <div className="space-y-3">
      <label className="text-sm text-foreground lowercase">theme</label>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-3">
        {THEMES.map((t) => (
          <ThemeCard key={t.value} option={t} selected={theme === t.value} onClick={() => setTheme(t.value)} />
        ))}
      </div>
    </div>
  );
}