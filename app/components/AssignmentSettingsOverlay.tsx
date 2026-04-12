'use client';

import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { AssignmentSettings } from '@/lib/assignments/settings';

interface AssignmentSettingsOverlayProps {
  settings: AssignmentSettings;
  onSettingsChange: (settings: AssignmentSettings) => void;
  isLoading?: boolean;
}

function NumberInput({ value, onChange, min, step = 1, disabled }: { value: number | null; onChange: (v: number | null) => void; min?: number; step?: number; disabled?: boolean }) {
  return (
    <Input
      type="number"
      value={value ?? ''}
      min={min}
      step={step}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      disabled={disabled}
      className="h-8"
    />
  );
}

export function AssignmentSettingsOverlay({ settings, onSettingsChange, isLoading = false }: AssignmentSettingsOverlayProps) {
  const update = (patch: Partial<AssignmentSettings>) => {
    onSettingsChange({ ...settings, ...patch });
  };

  return (
    <div className="bg-popover rounded-lg p-4 space-y-4 max-h-[82vh] overflow-y-auto">
      <div>
        <h3 className="text-sm font-medium">Assignment Settings</h3>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Start / End</Label>
        <Input
          type="datetime-local"
          value={settings.time.startAt ? settings.time.startAt.slice(0, 16) : ''}
          onChange={(e) => update({ time: { ...settings.time, startAt: e.target.value ? new Date(e.target.value).toISOString() : null } })}
          disabled={isLoading}
          className="h-8"
        />
        <Input
          type="datetime-local"
          value={settings.time.endAt ? settings.time.endAt.slice(0, 16) : ''}
          onChange={(e) => update({ time: { ...settings.time, endAt: e.target.value ? new Date(e.target.value).toISOString() : null } })}
          disabled={isLoading}
          className="h-8"
        />
        <div className="grid grid-cols-2 gap-2">
          <NumberInput
            value={settings.time.durationMinutes}
            min={1}
            onChange={(v) => update({ time: { ...settings.time, durationMinutes: v } })}
            disabled={isLoading}
          />
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            value={settings.time.timerMode}
            onChange={(e) => update({ time: { ...settings.time, timerMode: e.target.value as any } })}
            disabled={isLoading}
          >
            <option value="deadline">Deadline</option>
            <option value="per_student">Per student timer</option>
          </select>
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-xs">Auto submit on timeout</Label>
          <Switch checked={settings.time.autoSubmitOnTimeout} onCheckedChange={(v) => update({ time: { ...settings.time, autoSubmitOnTimeout: v } })} disabled={isLoading} />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-xs">Show timer</Label>
          <Switch checked={settings.time.showTimer} onCheckedChange={(v) => update({ time: { ...settings.time, showTimer: v } })} disabled={isLoading} />
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Attempts</Label>
        <NumberInput
          value={settings.attempts.maxAttempts}
          min={1}
          onChange={(v) => update({ attempts: { ...settings.attempts, maxAttempts: v } })}
          disabled={isLoading}
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            value={settings.attempts.scoreMode}
            onChange={(e) => update({ attempts: { ...settings.attempts, scoreMode: e.target.value as any } })}
            disabled={isLoading}
          >
            <option value="best">Best score</option>
            <option value="latest">Latest score</option>
          </select>
          <NumberInput
            value={settings.attempts.cooldownMinutes}
            min={0}
            onChange={(v) => update({ attempts: { ...settings.attempts, cooldownMinutes: v ?? 0 } })}
            disabled={isLoading}
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Access & randomization</Label>
        <Input
          value={settings.access.accessCode || ''}
          onChange={(e) => update({ access: { ...settings.access, accessCode: e.target.value || null } })}
          placeholder="Access code"
          disabled={isLoading}
          className="h-8"
        />
        <Input
          value={settings.access.allowedClassIds.join(',')}
          onChange={(e) => update({ access: { ...settings.access, allowedClassIds: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) } })}
          placeholder="Allowed class IDs (comma separated)"
          disabled={isLoading}
          className="h-8"
        />
        <div className="flex items-center justify-between"><Label className="text-xs">Shuffle questions</Label><Switch checked={settings.access.shuffleQuestions} onCheckedChange={(v) => update({ access: { ...settings.access, shuffleQuestions: v } })} disabled={isLoading} /></div>
        <div className="flex items-center justify-between"><Label className="text-xs">Shuffle answers</Label><Switch checked={settings.access.shuffleAnswers} onCheckedChange={(v) => update({ access: { ...settings.access, shuffleAnswers: v } })} disabled={isLoading} /></div>
        <div className="flex items-center justify-between"><Label className="text-xs">Per-student shuffle</Label><Switch checked={settings.access.shuffleQuestionsPerStudent} onCheckedChange={(v) => update({ access: { ...settings.access, shuffleQuestionsPerStudent: v } })} disabled={isLoading} /></div>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Feedback & grading</Label>
        <div className="flex items-center justify-between"><Label className="text-xs">Auto grade</Label><Switch checked={settings.grading.autoGrade} onCheckedChange={(v) => update({ grading: { ...settings.grading, autoGrade: v } })} disabled={isLoading} /></div>
        <div className="flex items-center justify-between"><Label className="text-xs">Manual review open questions</Label><Switch checked={settings.grading.manualReviewOpenQuestions} onCheckedChange={(v) => update({ grading: { ...settings.grading, manualReviewOpenQuestions: v } })} disabled={isLoading} /></div>
        <select
          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          value={settings.grading.feedbackReleaseMode}
          onChange={(e) => update({ grading: { ...settings.grading, feedbackReleaseMode: e.target.value as any } })}
          disabled={isLoading}
        >
          <option value="per_question">Feedback per question</option>
          <option value="after_submit">Feedback after submit</option>
          <option value="after_deadline">Feedback after deadline</option>
        </select>
        <div className="flex items-center justify-between"><Label className="text-xs">Show correct answers</Label><Switch checked={settings.grading.showCorrectAnswers} onCheckedChange={(v) => update({ grading: { ...settings.grading, showCorrectAnswers: v } })} disabled={isLoading} /></div>
        <div className="flex items-center justify-between"><Label className="text-xs">Show points</Label><Switch checked={settings.grading.showPoints} onCheckedChange={(v) => update({ grading: { ...settings.grading, showPoints: v } })} disabled={isLoading} /></div>
        <div className="grid grid-cols-2 gap-2">
          <NumberInput value={settings.grading.totalPoints} min={1} onChange={(v) => update({ grading: { ...settings.grading, totalPoints: v ?? 100 } })} disabled={isLoading} />
          <NumberInput value={settings.grading.weight} min={0} step={0.1} onChange={(v) => update({ grading: { ...settings.grading, weight: v ?? 1 } })} disabled={isLoading} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            value={settings.grading.gradeDisplayMode}
            onChange={(e) => update({ grading: { ...settings.grading, gradeDisplayMode: e.target.value as any } })}
            disabled={isLoading}
          >
            <option value="score">Grade</option>
            <option value="points">Points</option>
          </select>
          <NumberInput value={settings.grading.roundingDecimals} min={0} onChange={(v) => update({ grading: { ...settings.grading, roundingDecimals: v ?? 1 } })} disabled={isLoading} />
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Anti-cheat</Label>
        <div className="flex items-center justify-between"><Label className="text-xs">Require fullscreen</Label><Switch checked={settings.antiCheat.requireFullscreen} onCheckedChange={(v) => update({ antiCheat: { ...settings.antiCheat, requireFullscreen: v } })} disabled={isLoading} /></div>
        <div className="flex items-center justify-between"><Label className="text-xs">Detect tab switches</Label><Switch checked={settings.antiCheat.detectTabSwitch} onCheckedChange={(v) => update({ antiCheat: { ...settings.antiCheat, detectTabSwitch: v } })} disabled={isLoading} /></div>
        <div className="flex items-center justify-between"><Label className="text-xs">Restrict IP/device</Label><Switch checked={settings.antiCheat.restrictIpOrDevice} onCheckedChange={(v) => update({ antiCheat: { ...settings.antiCheat, restrictIpOrDevice: v } })} disabled={isLoading} /></div>
        <NumberInput value={settings.antiCheat.perQuestionTimeLimitSeconds} min={1} onChange={(v) => update({ antiCheat: { ...settings.antiCheat, perQuestionTimeLimitSeconds: v } })} disabled={isLoading} />
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Delivery</Label>
        <div className="flex items-center justify-between"><Label className="text-xs">Autosave</Label><Switch checked={settings.delivery.autosave} onCheckedChange={(v) => update({ delivery: { ...settings.delivery, autosave: v } })} disabled={isLoading} /></div>
        <div className="flex items-center justify-between"><Label className="text-xs">Allow resume</Label><Switch checked={settings.delivery.allowResume} onCheckedChange={(v) => update({ delivery: { ...settings.delivery, allowResume: v } })} disabled={isLoading} /></div>
        <Textarea
          value={settings.delivery.instructionText}
          onChange={(e) => update({ delivery: { ...settings.delivery, instructionText: e.target.value } })}
          rows={3}
          disabled={isLoading}
          className="text-sm"
        />
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Advanced</Label>
        <NumberInput value={settings.advanced.questionPoolSize} min={1} onChange={(v) => update({ advanced: { ...settings.advanced, questionPoolSize: v } })} disabled={isLoading} />
        <div className="flex items-center justify-between"><Label className="text-xs">Adaptive logic</Label><Switch checked={settings.advanced.adaptiveEnabled} onCheckedChange={(v) => update({ advanced: { ...settings.advanced, adaptiveEnabled: v } })} disabled={isLoading} /></div>
        <Textarea
          value={settings.advanced.adaptiveRules.map((r) => `${r.when}=>${r.then}`).join('\n')}
          onChange={(e) => update({
            advanced: {
              ...settings.advanced,
              adaptiveRules: e.target.value
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean)
                .map((line) => {
                  const [when, then] = line.split('=>');
                  return { when: (when || '').trim(), then: (then || '').trim() };
                }),
            },
          })}
          rows={3}
          disabled={isLoading}
          className="text-sm"
        />
        <div className="flex items-center justify-between"><Label className="text-xs">Review mode</Label><Switch checked={settings.advanced.reviewModeEnabled} onCheckedChange={(v) => update({ advanced: { ...settings.advanced, reviewModeEnabled: v } })} disabled={isLoading} /></div>
        <div className="flex items-center justify-between"><Label className="text-xs">Reflection enabled</Label><Switch checked={settings.advanced.reflectionEnabled} onCheckedChange={(v) => update({ advanced: { ...settings.advanced, reflectionEnabled: v } })} disabled={isLoading} /></div>
        <div className="flex items-center justify-between"><Label className="text-xs">Improvement attempt</Label><Switch checked={settings.advanced.improvementAttemptEnabled} onCheckedChange={(v) => update({ advanced: { ...settings.advanced, improvementAttemptEnabled: v } })} disabled={isLoading} /></div>
      </div>
    </div>
  );
}
