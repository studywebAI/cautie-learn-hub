'use client';

import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Eye,
  EyeOff,
  Check,
  X,
  Lock,
  Unlock,
  Timer,
  Sparkles,
} from 'lucide-react';

interface TimerConfig {
  enabled: boolean;
  datetime: string;
}

interface AiGradingConfig {
  strictness: number;
  partial_credit: boolean;
  spelling_matters: boolean;
  grammar_matters: boolean;
  case_sensitive: boolean;
  custom_instructions: string;
}

interface AssignmentSettingsOverlayProps {
  isVisible: boolean;
  answersEnabled: boolean;
  isLocked: boolean;
  answerMode: 'view_only' | 'editable' | 'self_grade';
  visibilityTimer?: TimerConfig;
  answersTimer?: TimerConfig;
  lockTimer?: TimerConfig;
  aiGradingEnabled: boolean;
  aiGradingConfig?: AiGradingConfig;
  onVisibilityChange: (visible: boolean) => void;
  onAnswersEnabledChange: (enabled: boolean) => void;
  onLockedChange: (locked: boolean) => void;
  onAnswerModeChange: (mode: 'view_only' | 'editable' | 'self_grade') => void;
  onVisibilityTimerChange?: (timer: TimerConfig) => void;
  onAnswersTimerChange?: (timer: TimerConfig) => void;
  onLockTimerChange?: (timer: TimerConfig) => void;
  onAiGradingChange?: (enabled: boolean) => void;
  onAiGradingConfigChange?: (config: AiGradingConfig) => void;
  isLoading?: boolean;
  isBulk?: boolean;
}

const DEFAULT_AI_CONFIG: AiGradingConfig = {
  strictness: 5,
  partial_credit: true,
  spelling_matters: false,
  grammar_matters: false,
  case_sensitive: false,
  custom_instructions: '',
};

function TimerRow({
  label,
  timer,
  onChange,
  disabled,
}: {
  label: string;
  timer?: TimerConfig;
  onChange?: (timer: TimerConfig) => void;
  disabled?: boolean;
}) {
  const isEnabled = timer?.enabled ?? false;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Timer className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{label} timer</span>
        </div>
        <Switch
          checked={isEnabled}
          onCheckedChange={(v) => onChange?.({ enabled: v, datetime: timer?.datetime || '' })}
          disabled={disabled}
          className="scale-75"
        />
      </div>
      {isEnabled && (
        <Input
          type="datetime-local"
          value={timer?.datetime ? timer.datetime.slice(0, 16) : ''}
          onChange={(e) => onChange?.({ enabled: true, datetime: new Date(e.target.value).toISOString() })}
          className="h-7 text-xs"
          disabled={disabled}
        />
      )}
    </div>
  );
}

export function AssignmentSettingsOverlay({
  isVisible,
  answersEnabled,
  isLocked,
  answerMode,
  visibilityTimer,
  answersTimer,
  lockTimer,
  aiGradingEnabled,
  aiGradingConfig,
  onVisibilityChange,
  onAnswersEnabledChange,
  onLockedChange,
  onAnswerModeChange,
  onVisibilityTimerChange,
  onAnswersTimerChange,
  onLockTimerChange,
  onAiGradingChange,
  onAiGradingConfigChange,
  isLoading = false,
  isBulk = false,
}: AssignmentSettingsOverlayProps) {
  const config = aiGradingConfig || DEFAULT_AI_CONFIG;

  const updateConfig = (key: keyof AiGradingConfig, value: any) => {
    onAiGradingConfigChange?.({ ...config, [key]: value });
  };

  return (
    <div className="bg-popover border rounded-lg shadow-lg p-4 min-w-[280px] max-w-[320px] space-y-3 max-h-[80vh] overflow-y-auto">
      <div className="text-sm font-medium text-foreground">
        {isBulk ? 'All Assignments Settings' : 'Assignment Settings'}
      </div>

      {/* Visibility */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {isVisible ? (
              <Eye className="h-4 w-4 text-muted-foreground" />
            ) : (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            )}
            <Label className="text-sm font-normal">Visible to students</Label>
          </div>
          <Switch
            checked={isVisible}
            onCheckedChange={onVisibilityChange}
            disabled={isLoading}
          />
        </div>
        <TimerRow
          label="Auto-show"
          timer={visibilityTimer}
          onChange={onVisibilityTimerChange}
          disabled={isLoading}
        />
      </div>

      <Separator />

      {/* Answers */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {answersEnabled ? (
              <Check className="h-4 w-4 text-muted-foreground" />
            ) : (
              <X className="h-4 w-4 text-muted-foreground" />
            )}
            <Label className="text-sm font-normal">Answers enabled</Label>
          </div>
          <Switch
            checked={answersEnabled}
            onCheckedChange={onAnswersEnabledChange}
            disabled={isLoading}
          />
        </div>

        {answersEnabled && (
          <div className="space-y-2 pl-2 border-l-2 border-muted">
            <Label className="text-xs text-muted-foreground">Answer mode</Label>
            <div className="space-y-1.5">
              {[
                { value: 'view_only' as const, label: 'View only (locked after reveal)' },
                { value: 'editable' as const, label: 'Editable (can change answers)' },
                { value: 'self_grade' as const, label: 'Self-grade (correct / semi / incorrect)' },
              ].map((mode) => (
                <label
                  key={mode.value}
                  className="flex items-center gap-2 cursor-pointer text-xs"
                >
                  <input
                    type="radio"
                    name={`answer_mode_${isBulk ? 'bulk' : 'single'}`}
                    value={mode.value}
                    checked={answerMode === mode.value}
                    onChange={() => onAnswerModeChange(mode.value)}
                    className="accent-primary"
                    disabled={isLoading}
                  />
                  {mode.label}
                </label>
              ))}
            </div>
          </div>
        )}

        <TimerRow
          label="Auto-answers"
          timer={answersTimer}
          onChange={onAnswersTimerChange}
          disabled={isLoading}
        />
      </div>

      <Separator />

      {/* Lock */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {isLocked ? (
              <Lock className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Unlock className="h-4 w-4 text-muted-foreground" />
            )}
            <Label className="text-sm font-normal">Lock assignment</Label>
          </div>
          <Switch
            checked={isLocked}
            onCheckedChange={onLockedChange}
            disabled={isLoading}
          />
        </div>
        <TimerRow
          label="Auto-lock"
          timer={lockTimer}
          onChange={onLockTimerChange}
          disabled={isLoading}
        />
      </div>

      <Separator />

      {/* AI Grading */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-normal">AI grading (open questions)</Label>
          </div>
          <Switch
            checked={aiGradingEnabled}
            onCheckedChange={onAiGradingChange}
            disabled={isLoading}
          />
        </div>

        {aiGradingEnabled && (
          <div className="space-y-3 pl-2 border-l-2 border-muted">
            {/* Strictness slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <Label className="text-xs text-muted-foreground">Strictness</Label>
                <span className="text-xs text-muted-foreground">{config.strictness}/10</span>
              </div>
              <Slider
                value={[config.strictness]}
                min={1}
                max={10}
                step={1}
                onValueChange={([v]) => updateConfig('strictness', v)}
                disabled={isLoading}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Lenient</span>
                <span>Strict</span>
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-normal">Partial credit</Label>
                <Switch
                  checked={config.partial_credit}
                  onCheckedChange={(v) => updateConfig('partial_credit', v)}
                  disabled={isLoading}
                  className="scale-75"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-normal">Spelling matters</Label>
                <Switch
                  checked={config.spelling_matters}
                  onCheckedChange={(v) => updateConfig('spelling_matters', v)}
                  disabled={isLoading}
                  className="scale-75"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-normal">Grammar matters</Label>
                <Switch
                  checked={config.grammar_matters}
                  onCheckedChange={(v) => updateConfig('grammar_matters', v)}
                  disabled={isLoading}
                  className="scale-75"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-normal">Case sensitive</Label>
                <Switch
                  checked={config.case_sensitive}
                  onCheckedChange={(v) => updateConfig('case_sensitive', v)}
                  disabled={isLoading}
                  className="scale-75"
                />
              </div>
            </div>

            {/* Custom instructions */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Custom grading instructions</Label>
              <Textarea
                value={config.custom_instructions}
                onChange={(e) => updateConfig('custom_instructions', e.target.value)}
                placeholder="e.g., Accept synonyms, focus on key concepts..."
                rows={2}
                className="text-xs resize-none"
                disabled={isLoading}
              />
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground pt-2 border-t">
        {!isVisible && 'Students cannot see this assignment. '}
        {isLocked && 'Students cannot submit answers. '}
        {answersEnabled
          ? answerMode === 'self_grade'
            ? 'Students grade their own answers.'
            : answerMode === 'editable'
              ? 'Students can view and edit answers.'
              : 'Students can view answers (locked).'
          : 'Self-check is disabled.'}
        {aiGradingEnabled && ` AI grades open questions (strictness ${config.strictness}/10).`}
      </p>
    </div>
  );
}
