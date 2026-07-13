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

export type WidgetKey =
  | 'deadlines' | 'studyToday' | 'scheduled' | 'analytics' | 'subjects'
  | 'agenda' | 'quickAccess';

export type DashboardPrefs = {
  density: 'comfortable' | 'compact';
  widgets: Record<WidgetKey, boolean>;
  pinnedShortcuts: Record<string, boolean>;
};

const ALL_WIDGET_KEYS: WidgetKey[] = [
  'deadlines', 'studyToday', 'scheduled', 'analytics', 'subjects',
  'agenda', 'quickAccess',
];

export const DEFAULT_DASHBOARD_PREFS: DashboardPrefs = {
  density: 'comfortable',
  widgets: Object.fromEntries(ALL_WIDGET_KEYS.map(k => [k, true])) as Record<WidgetKey, boolean>,
  pinnedShortcuts: {},
};

const WIDGET_LABELS: Record<WidgetKey, string> = {
  deadlines: 'Upcoming deadlines',
  studyToday: 'Study today',
  scheduled: 'Scheduled study',
  analytics: 'Analytics',
  subjects: 'My subjects',
  agenda: 'Agenda widget',
  quickAccess: 'Quick access',
};

const storageKey = (role: 'student' | 'teacher') => `studyweb-dashboard-prefs-${role}`;

export function loadDashboardPrefs(role: 'student' | 'teacher' = 'student'): DashboardPrefs {
  if (typeof window === 'undefined') return DEFAULT_DASHBOARD_PREFS;
  try {
    const raw = window.localStorage.getItem(storageKey(role));
    if (!raw) return DEFAULT_DASHBOARD_PREFS;
    const parsed = JSON.parse(raw);
    return {
      density: parsed?.density === 'compact' ? 'compact' : 'comfortable',
      widgets: { ...DEFAULT_DASHBOARD_PREFS.widgets, ...(parsed?.widgets || {}) },
      pinnedShortcuts: { ...(parsed?.pinnedShortcuts || {}) },
    };
  } catch {
    return DEFAULT_DASHBOARD_PREFS;
  }
}

export function DashboardCustomizeMenu({
  role = 'student',
  widgetKeys,
  shortcutOptions,
  onChange,
}: {
  role?: 'student' | 'teacher';
  widgetKeys: WidgetKey[];
  shortcutOptions?: { key: string; label: string }[];
  onChange: (prefs: DashboardPrefs) => void;
}) {
  const [prefs, setPrefs] = useState<DashboardPrefs>(DEFAULT_DASHBOARD_PREFS);

  useEffect(() => {
    setPrefs(loadDashboardPrefs(role));
  }, [role]);

  const update = (next: DashboardPrefs) => {
    setPrefs(next);
    onChange(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey(role), JSON.stringify(next));
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
          {widgetKeys.map((key) => (
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
        {shortcutOptions && shortcutOptions.length > 0 && (
          <>
            <div className="h-px bg-border" />
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Pinned shortcuts</p>
              <div className="space-y-2.5">
                {shortcutOptions.map((opt) => (
                  <div key={opt.key} className="flex items-center justify-between">
                    <Label htmlFor={`shortcut-${opt.key}`} className="text-sm font-normal">{opt.label}</Label>
                    <Switch
                      id={`shortcut-${opt.key}`}
                      checked={prefs.pinnedShortcuts[opt.key] !== false}
                      onCheckedChange={(checked) => update({ ...prefs, pinnedShortcuts: { ...prefs.pinnedShortcuts, [opt.key]: checked } })}
                    />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
