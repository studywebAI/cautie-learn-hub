'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Star, StarOff, Save, X } from 'lucide-react';

export interface GradingPresetSettings {
  strictness: number; // 1-10
  partial_credit: boolean;
  spelling_matters: boolean;
  grammar_matters: boolean;
  case_sensitive: boolean;
  custom_instructions: string;
  ai_enabled: boolean;
}

export interface GradingPreset {
  id: string;
  name: string;
  is_default: boolean;
  settings: GradingPresetSettings;
}

const DEFAULT_SETTINGS: GradingPresetSettings = {
  strictness: 5,
  partial_credit: true,
  spelling_matters: false,
  grammar_matters: false,
  case_sensitive: false,
  custom_instructions: '',
  ai_enabled: true,
};

interface AIGradingPresetsProps {
  presets: GradingPreset[];
  selectedPresetId?: string;
  blockOverride?: Partial<GradingPresetSettings>;
  onSelectPreset: (presetId: string) => void;
  onSavePreset: (preset: GradingPreset) => void;
  onDeletePreset: (presetId: string) => void;
  onSetDefault: (presetId: string) => void;
  onBlockOverrideChange?: (settings: Partial<GradingPresetSettings> | null) => void;
  isLoading?: boolean;
}

export function AIGradingPresets({
  presets,
  selectedPresetId,
  blockOverride,
  onSelectPreset,
  onSavePreset,
  onDeletePreset,
  onSetDefault,
  onBlockOverrideChange,
  isLoading = false,
}: AIGradingPresetsProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPreset, setEditingPreset] = useState<GradingPreset | null>(null);
  const [hasBlockOverride, setHasBlockOverride] = useState(!!blockOverride);

  const selectedPreset = presets.find(p => p.id === selectedPresetId);
  const activeSettings = blockOverride || selectedPreset?.settings || DEFAULT_SETTINGS;

  const handleCreateNew = () => {
    setEditingPreset({
      id: `preset-${Date.now()}`,
      name: 'New Preset',
      is_default: false,
      settings: { ...DEFAULT_SETTINGS },
    });
    setIsCreating(true);
    setIsEditing(true);
  };

  const handleEditCurrent = () => {
    if (selectedPreset) {
      setEditingPreset({ ...selectedPreset });
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    if (editingPreset) {
      onSavePreset(editingPreset);
      setIsEditing(false);
      setIsCreating(false);
      setEditingPreset(null);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setIsCreating(false);
    setEditingPreset(null);
  };

  const updateEditingSetting = <K extends keyof GradingPresetSettings>(
    key: K,
    value: GradingPresetSettings[K]
  ) => {
    if (editingPreset) {
      setEditingPreset({
        ...editingPreset,
        settings: { ...editingPreset.settings, [key]: value },
      });
    }
  };

  const handleBlockOverrideToggle = (enabled: boolean) => {
    setHasBlockOverride(enabled);
    if (enabled) {
      onBlockOverrideChange?.(selectedPreset?.settings || DEFAULT_SETTINGS);
    } else {
      onBlockOverrideChange?.(null);
    }
  };

  const updateBlockOverride = <K extends keyof GradingPresetSettings>(
    key: K,
    value: GradingPresetSettings[K]
  ) => {
    if (blockOverride) {
      onBlockOverrideChange?.({ ...blockOverride, [key]: value });
    }
  };

  // Render settings editor
  const renderSettingsEditor = (
    settings: GradingPresetSettings,
    onChange: <K extends keyof GradingPresetSettings>(key: K, value: GradingPresetSettings[K]) => void,
    disabled = false
  ) => (
    <div className="space-y-4">
      {/* AI Enabled */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-normal">AI Grading Enabled</Label>
        <Switch
          checked={settings.ai_enabled}
          onCheckedChange={(v) => onChange('ai_enabled', v)}
          disabled={disabled}
        />
      </div>

      {settings.ai_enabled && (
        <>
          {/* Strictness slider */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-sm font-normal">Strictness</Label>
              <span className="text-xs text-muted-foreground">{settings.strictness}/10</span>
            </div>
            <Slider
              value={[settings.strictness]}
              min={1}
              max={10}
              step={1}
              onValueChange={([v]) => onChange('strictness', v)}
              disabled={disabled}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Lenient</span>
              <span>Strict</span>
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-normal">Partial Credit</Label>
              <Switch
                checked={settings.partial_credit}
                onCheckedChange={(v) => onChange('partial_credit', v)}
                disabled={disabled}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm font-normal">Spelling Matters</Label>
              <Switch
                checked={settings.spelling_matters}
                onCheckedChange={(v) => onChange('spelling_matters', v)}
                disabled={disabled}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm font-normal">Grammar Matters</Label>
              <Switch
                checked={settings.grammar_matters}
                onCheckedChange={(v) => onChange('grammar_matters', v)}
                disabled={disabled}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm font-normal">Case Sensitive</Label>
              <Switch
                checked={settings.case_sensitive}
                onCheckedChange={(v) => onChange('case_sensitive', v)}
                disabled={disabled}
              />
            </div>
          </div>

          {/* Custom instructions */}
          <div className="space-y-2">
            <Label className="text-sm font-normal">Custom Instructions</Label>
            <Textarea
              value={settings.custom_instructions}
              onChange={(e) => onChange('custom_instructions', e.target.value)}
              placeholder="Additional grading criteria..."
              rows={3}
              className="text-sm"
              disabled={disabled}
            />
          </div>
        </>
      )}
    </div>
  );

  if (isEditing && editingPreset) {
    return (
      <div className="bg-popover border rounded-lg shadow-lg p-4 min-w-[280px] space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            {isCreating ? 'Create Preset' : 'Edit Preset'}
          </span>
          <Button variant="ghost" size="sm" onClick={handleCancel} className="h-6 w-6 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-normal">Name</Label>
          <Input
            value={editingPreset.name}
            onChange={(e) => setEditingPreset({ ...editingPreset, name: e.target.value })}
            placeholder="Preset name"
            className="h-8 text-sm"
          />
        </div>

        {renderSettingsEditor(editingPreset.settings, updateEditingSetting)}

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isLoading}>
            <Save className="h-3 w-3 mr-1" />
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-popover border rounded-lg shadow-lg p-4 min-w-[280px] space-y-4">
      <div className="text-sm font-medium text-foreground">AI Grading Settings</div>

      {/* Preset selector */}
      <div className="space-y-2">
        <Label className="text-sm font-normal">Preset</Label>
        <div className="flex gap-2">
          <Select value={selectedPresetId || ''} onValueChange={onSelectPreset}>
            <SelectTrigger className="h-8 text-sm flex-1">
              <SelectValue placeholder="Select preset..." />
            </SelectTrigger>
            <SelectContent>
              {presets.map((preset) => (
                <SelectItem key={preset.id} value={preset.id}>
                  <span className="flex items-center gap-2">
                    {preset.is_default && <Star className="h-3 w-3 text-yellow-500" />}
                    {preset.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleCreateNew} className="h-8 px-2">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Preset actions */}
      {selectedPreset && (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEditCurrent}
            className="h-7 text-xs"
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSetDefault(selectedPreset.id)}
            className="h-7 text-xs"
            disabled={selectedPreset.is_default}
          >
            {selectedPreset.is_default ? (
              <Star className="h-3 w-3 mr-1 text-yellow-500" />
            ) : (
              <StarOff className="h-3 w-3 mr-1" />
            )}
            {selectedPreset.is_default ? 'Default' : 'Set Default'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDeletePreset(selectedPreset.id)}
            className="h-7 text-xs text-destructive"
            disabled={presets.length <= 1}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Block override */}
      {onBlockOverrideChange && (
        <div className="pt-2 border-t space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-normal">Override for this block</Label>
            <Switch
              checked={hasBlockOverride}
              onCheckedChange={handleBlockOverrideToggle}
            />
          </div>
          
          {hasBlockOverride && blockOverride && (
            <div className="pl-2 border-l-2 border-primary/20">
              {renderSettingsEditor(
                { ...DEFAULT_SETTINGS, ...blockOverride },
                updateBlockOverride
              )}
            </div>
          )}
        </div>
      )}

      {/* Current settings preview */}
      {!hasBlockOverride && selectedPreset && (
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-2">Current settings:</p>
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span>AI Grading:</span>
              <span>{activeSettings.ai_enabled ? 'On' : 'Off'}</span>
            </div>
            {activeSettings.ai_enabled && (
              <>
                <div className="flex justify-between">
                  <span>Strictness:</span>
                  <span>{activeSettings.strictness}/10</span>
                </div>
                <div className="flex justify-between">
                  <span>Partial Credit:</span>
                  <span>{activeSettings.partial_credit ? 'Yes' : 'No'}</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
