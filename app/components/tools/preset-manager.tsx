'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type Preset = {
  id: string;
  name: string;
  settings: Record<string, any>;
};

type PresetManagerProps = {
  toolId: string;
  currentSettings: Record<string, any>;
  onLoadPreset: (settings: Record<string, any>) => void;
};

export function PresetManager({ toolId, currentSettings, onLoadPreset }: PresetManagerProps) {
  const storageKey = `tools.${toolId}.presets`;
  const activeKey = `tools.${toolId}.activePreset`;

  const [presets, setPresets] = useState<Preset[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setPresets(JSON.parse(saved));
      const active = localStorage.getItem(activeKey);
      if (active) setActivePresetId(active);
    } catch {}
  }, [storageKey, activeKey]);

  const persist = (next: Preset[]) => {
    setPresets(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  const handleSave = () => {
    if (!newName.trim()) return;
    const preset: Preset = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      settings: { ...currentSettings },
    };
    persist([...presets, preset]);
    setActivePresetId(preset.id);
    localStorage.setItem(activeKey, preset.id);
    setNewName('');
    setIsCreating(false);
  };

  const handleLoad = (preset: Preset) => {
    setActivePresetId(preset.id);
    localStorage.setItem(activeKey, preset.id);
    onLoadPreset(preset.settings);
  };

  const handleDelete = (id: string) => {
    const next = presets.filter((p) => p.id !== id);
    persist(next);
    if (activePresetId === id) {
      setActivePresetId(null);
      localStorage.removeItem(activeKey);
    }
  };

  const handleUpdate = (id: string) => {
    const next = presets.map((p) =>
      p.id === id ? { ...p, settings: { ...currentSettings } } : p
    );
    persist(next);
  };

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>My Presets</span>
        <span className="text-[10px] font-mono bg-muted rounded-full px-1.5">{presets.length}</span>
        {expanded ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
      </button>

      {expanded && (
        <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
          {presets.map((preset) => (
            <div
              key={preset.id}
              className={cn(
                'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors cursor-pointer',
                activePresetId === preset.id
                  ? 'border-foreground bg-foreground/5'
                  : 'border-border hover:bg-muted/50'
              )}
              onClick={() => handleLoad(preset)}
            >
              <span className="flex-1 truncate font-medium">{preset.name}</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleUpdate(preset.id); }}
                className="p-0.5 text-muted-foreground hover:text-foreground"
                title="Overwrite with current settings"
              >
                <Save className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleDelete(preset.id); }}
                className="p-0.5 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}

          {isCreating ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setIsCreating(false); }}
                placeholder="Preset name…"
                className="flex-1 bg-background border rounded-md px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
              />
              <Button size="sm" variant="ghost" onClick={handleSave} className="h-6 px-2 text-xs">
                Save
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full py-1"
            >
              <Plus className="h-3 w-3" />
              <span>Save current as preset</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
