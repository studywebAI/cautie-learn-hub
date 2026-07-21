'use client';

import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AssignmentSettings } from '@/lib/assignments/settings';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

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

  type SectionId = 'time' | 'attempts' | 'access' | 'grading' | 'antiCheat' | 'delivery' | 'advanced';
  const [openSection, setOpenSection] = useState<SectionId>('time');

  const SECTION_LABELS: Record<SectionId, string> = {
    time: 'Time',
    attempts: 'Attempts',
    access: 'Access',
    grading: 'Grading',
    antiCheat: 'Anti-cheat',
    delivery: 'Delivery',
    advanced: 'Advanced',
  };

  // Tab pills instead of a stacked accordion -- one header row up top, one
  // content pane below, so picking a category doesn't push you past six
  // other collapsed headers to reach it.
  const Section = ({ id, children }: { id: SectionId; children: React.ReactNode }) => {
    if (openSection !== id) return null;
    return <div className="space-y-2 pt-3">{children}</div>;
  };

  return (
    <div className="rounded-lg bg-background p-2 text-foreground">
      <h3 className="px-1 pb-2 text-sm font-medium">Assignment Settings</h3>
      <div className="flex flex-wrap gap-1 border-b border-border/60 px-1 pb-2">
        {(Object.keys(SECTION_LABELS) as SectionId[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setOpenSection(id)}
            className={cn(
              'rounded-md px-2 py-1 text-[11px] font-medium transition-colors',
              openSection === id
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:surface-interactive'
            )}
          >
            {SECTION_LABELS[id]}
          </button>
        ))}
      </div>
      <div className="max-h-[70vh] overflow-y-auto px-1">
        <Section id="time">
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
            <NumberInput value={settings.time.durationMinutes} min={1} onChange={(v) => update({ time: { ...settings.time, durationMinutes: v } })} disabled={isLoading} />
            <Select value={settings.time.timerMode} onValueChange={(v) => update({ time: { ...settings.time, timerMode: v as any } })} disabled={isLoading}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="deadline">Deadline</SelectItem>
                <SelectItem value="per_student">Per student timer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between"><Label className="text-xs">Auto submit on timeout</Label><Switch checked={settings.time.autoSubmitOnTimeout} onCheckedChange={(v) => update({ time: { ...settings.time, autoSubmitOnTimeout: v } })} disabled={isLoading} /></div>
          <div className="flex items-center justify-between"><Label className="text-xs">Show timer</Label><Switch checked={settings.time.showTimer} onCheckedChange={(v) => update({ time: { ...settings.time, showTimer: v } })} disabled={isLoading} /></div>
        </Section>

        <Section id="attempts">
          <Label className="text-xs text-muted-foreground">Attempts</Label>
          <NumberInput value={settings.attempts.maxAttempts} min={1} onChange={(v) => update({ attempts: { ...settings.attempts, maxAttempts: v } })} disabled={isLoading} />
          <div className="grid grid-cols-2 gap-2">
            <Select value={settings.attempts.scoreMode} onValueChange={(v) => update({ attempts: { ...settings.attempts, scoreMode: v as any } })} disabled={isLoading}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="best">Best score</SelectItem>
                <SelectItem value="latest">Latest score</SelectItem>
              </SelectContent>
            </Select>
            <NumberInput value={settings.attempts.cooldownMinutes} min={0} onChange={(v) => update({ attempts: { ...settings.attempts, cooldownMinutes: v ?? 0 } })} disabled={isLoading} />
          </div>
        </Section>

        <Section id="access">
          <Input value={settings.access.accessCode || ''} onChange={(e) => update({ access: { ...settings.access, accessCode: e.target.value || null } })} placeholder="Access code" disabled={isLoading} className="h-8" />
          <Input value={settings.access.allowedClassIds.join(',')} onChange={(e) => update({ access: { ...settings.access, allowedClassIds: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) } })} placeholder="Allowed class IDs (comma separated)" disabled={isLoading} className="h-8" />
          <div className="flex items-center justify-between"><Label className="text-xs">Shuffle questions</Label><Switch checked={settings.access.shuffleQuestions} onCheckedChange={(v) => update({ access: { ...settings.access, shuffleQuestions: v } })} disabled={isLoading} /></div>
          <div className="flex items-center justify-between"><Label className="text-xs">Shuffle answers</Label><Switch checked={settings.access.shuffleAnswers} onCheckedChange={(v) => update({ access: { ...settings.access, shuffleAnswers: v } })} disabled={isLoading} /></div>
          <div className="flex items-center justify-between"><Label className="text-xs">Per-student shuffle</Label><Switch checked={settings.access.shuffleQuestionsPerStudent} onCheckedChange={(v) => update({ access: { ...settings.access, shuffleQuestionsPerStudent: v } })} disabled={isLoading} /></div>
        </Section>

        <Section id="grading">
          <div className="flex items-center justify-between"><Label className="text-xs">Auto grade</Label><Switch checked={settings.grading.autoGrade} onCheckedChange={(v) => update({ grading: { ...settings.grading, autoGrade: v } })} disabled={isLoading} /></div>
          <div className="flex items-center justify-between"><Label className="text-xs">Manual review open questions</Label><Switch checked={settings.grading.manualReviewOpenQuestions} onCheckedChange={(v) => update({ grading: { ...settings.grading, manualReviewOpenQuestions: v } })} disabled={isLoading} /></div>
          <Select value={settings.grading.feedbackReleaseMode} onValueChange={(v) => update({ grading: { ...settings.grading, feedbackReleaseMode: v as any } })} disabled={isLoading}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="per_question">Feedback per question</SelectItem>
              <SelectItem value="after_submit">Feedback after submit</SelectItem>
              <SelectItem value="after_deadline">Feedback after deadline</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center justify-between"><Label className="text-xs">Show correct answers</Label><Switch checked={settings.grading.showCorrectAnswers} onCheckedChange={(v) => update({ grading: { ...settings.grading, showCorrectAnswers: v } })} disabled={isLoading} /></div>
          <div className="flex items-center justify-between"><Label className="text-xs">Show points</Label><Switch checked={settings.grading.showPoints} onCheckedChange={(v) => update({ grading: { ...settings.grading, showPoints: v } })} disabled={isLoading} /></div>
          <div className="grid grid-cols-2 gap-2">
            <NumberInput value={settings.grading.totalPoints} min={1} onChange={(v) => update({ grading: { ...settings.grading, totalPoints: v ?? 100 } })} disabled={isLoading} />
            <NumberInput value={settings.grading.weight} min={0} step={0.1} onChange={(v) => update({ grading: { ...settings.grading, weight: v ?? 1 } })} disabled={isLoading} />
          </div>
        </Section>

        <Section id="antiCheat">
          <div className="flex items-center justify-between"><Label className="text-xs">Require fullscreen</Label><Switch checked={settings.antiCheat.requireFullscreen} onCheckedChange={(v) => update({ antiCheat: { ...settings.antiCheat, requireFullscreen: v } })} disabled={isLoading} /></div>
          <div className="flex items-center justify-between"><Label className="text-xs">Detect tab switches</Label><Switch checked={settings.antiCheat.detectTabSwitch} onCheckedChange={(v) => update({ antiCheat: { ...settings.antiCheat, detectTabSwitch: v } })} disabled={isLoading} /></div>
          <div className="flex items-center justify-between"><Label className="text-xs">Restrict IP/device</Label><Switch checked={settings.antiCheat.restrictIpOrDevice} onCheckedChange={(v) => update({ antiCheat: { ...settings.antiCheat, restrictIpOrDevice: v } })} disabled={isLoading} /></div>
          <NumberInput value={settings.antiCheat.perQuestionTimeLimitSeconds} min={1} onChange={(v) => update({ antiCheat: { ...settings.antiCheat, perQuestionTimeLimitSeconds: v } })} disabled={isLoading} />
        </Section>

        <Section id="delivery">
          <div className="flex items-center justify-between"><Label className="text-xs">Autosave</Label><Switch checked={settings.delivery.autosave} onCheckedChange={(v) => update({ delivery: { ...settings.delivery, autosave: v } })} disabled={isLoading} /></div>
          <div className="flex items-center justify-between"><Label className="text-xs">Allow resume</Label><Switch checked={settings.delivery.allowResume} onCheckedChange={(v) => update({ delivery: { ...settings.delivery, allowResume: v } })} disabled={isLoading} /></div>
          <Textarea value={settings.delivery.instructionText} onChange={(e) => update({ delivery: { ...settings.delivery, instructionText: e.target.value } })} rows={3} disabled={isLoading} className="text-sm" />
        </Section>

        <Section id="advanced">
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
        </Section>
      </div>
    </div>
  );
}
