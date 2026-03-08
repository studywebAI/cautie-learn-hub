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
  { value: 'light', label: 'light', colors: { bg: '#ffffff', fg: '#000000', primary: '#262626', card: '#f5f5f5', muted: '#f0f0f0' } },
  { value: 'dark', label: 'dark', colors: { bg: '#121212', fg: '#ffffff', primary: '#e6e6e6', card: '#1c1c1c', muted: '#262626' } },
  { value: 'ocean', label: 'ocean', colors: { bg: '#dfe8ed', fg: '#1a2e38', primary: '#1e5f82', card: '#cfdce3', muted: '#c7d5dd' } },
  { value: 'forest', label: 'forest', colors: { bg: '#dde5df', fg: '#1c2e20', primary: '#2a6038', card: '#ced8d0', muted: '#c6d1c9' } },
  { value: 'sunset', label: 'sunset', colors: { bg: '#e8ddd5', fg: '#2b2118', primary: '#a85a20', card: '#d9ccbf', muted: '#d1c3b5' } },
  { value: 'rose', label: 'rose', colors: { bg: '#e5dade', fg: '#331a24', primary: '#943458', card: '#d6c9ce', muted: '#cfc1c7' } },
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