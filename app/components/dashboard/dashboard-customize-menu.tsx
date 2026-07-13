'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { SlidersHorizontal } from 'lucide-react';

export type WidgetKey = 'deadlines' | 'studyToday' | 'scheduled' | 'analytics' | 'subjects';

export type DashboardPrefs = {
  density: 'comfortable' | 'compact';
  widgets: Record<WidgetKey, boolean>;
};

const STORAGE_KEY = 'studyweb-dashboard-prefs';

export const DEFAULT_DASHBOARD_PREFS: DashboardPrefs = {
  density: 'comfortable',
  widgets: {
    deadlines: true,
    studyToday: true,
    scheduled: true,
    analytics: true,
    subjects: true,
  },
};

const WIDGET_LABELS: Record<WidgetKey, string> = {
  deadlines: 'Upcoming deadlines',
  studyToday: 'Study today',
  scheduled: 'Scheduled study',
  analytics: 'Analytics',
  subjects: 'My subjects',
};

export function loadDashboardPrefs(): DashboardPrefs {
  if (typeof window === 'undefined') return DEFAULT_DASHBOARD_PREFS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DASHBOARD_PREFS;
    const parsed = JSON.parse(raw);
    return {
      density: parsed?.density === 'compact' ? 'compact' : 'comfortable',
      widgets: { ...DEFAULT_DASHBOARD_PREFS.widgets, ...(parsed?.widgets || {}) },
    };
  } catch {
    return DEFAULT_DASHBOARD_PREFS;
  }
}

export function DashboardCustomizeMenu({ onChange }: { onChange: (prefs: DashboardPrefs) => void }) {
  const [prefs, setPrefs] = useState<DashboardPrefs>(DEFAULT_DASHBOARD_PREFS);

  useEffect(() => {
    setPrefs(loadDashboardPrefs());
  }, []);

  const update = (next: DashboardPrefs) => {
    setPrefs(next);
    onChange(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Customize dashboard">
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="dashboard-density" className="text-sm">Compact view</Label>
          <Switch
            id="dashboard-density"
            checked={prefs.density === 'compact'}
            onCheckedChange={(checked) => update({ ...prefs, density: checked ? 'compact' : 'comfortable' })}
          />
        </div>
        <div className="h-px bg-border" />
        <div className="space-y-2.5">
          {(Object.keys(WIDGET_LABELS) as WidgetKey[]).map((key) => (
            <div key={key} className="flex items-center justify-between">
              <Label htmlFor={`widget-${key}`} className="text-sm font-normal">{WIDGET_LABELS[key]}</Label>
              <Switch
                id={`widget-${key}`}
                checked={prefs.widgets[key]}
                onCheckedChange={(checked) => update({ ...prefs, widgets: { ...prefs.widgets, [key]: checked } })}
              />
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
