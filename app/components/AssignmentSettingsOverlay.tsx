'use client';

import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AssignmentSettings } from '@/lib/assignments/settings';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

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

// Small (i) button next to a label that explains what a setting actually
// does -- most of this panel's fields (Start/End, timer modes, score mode,
// feedback release, etc.) were unlabeled or had no explanation of their
// effect, which is what made this panel confusing to use.
function InfoHint({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="inline-flex h-3.5 w-3.5 items-center justify-center text-muted-foreground/70 hover:text-foreground" tabIndex={-1}>
          <Info className="h-3 w-3" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[240px] text-xs">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

function Field({ label, hint, children, stacked = false }: { label: string; hint?: string; children: React.ReactNode; stacked?: boolean }) {
  return (
    <div className={stacked ? 'space-y-1' : 'flex items-center justify-between gap-3'}>
      <span className="flex items-center gap-1 text-xs text-foreground">
        {label}
        {hint && <InfoHint text={hint} />}
      </span>
      {children}
    </div>
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
    return <div className="space-y-2.5 pt-3">{children}</div>;
  };

  return (
    <TooltipProvider delayDuration={200}>
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
          <Field label="Start" hint="Students can't open this assignment before this time. Leave blank for no start restriction.">
            <Input
              type="datetime-local"
              value={settings.time.startAt ? settings.time.startAt.slice(0, 16) : ''}
              onChange={(e) => update({ time: { ...settings.time, startAt: e.target.value ? new Date(e.target.value).toISOString() : null } })}
              disabled={isLoading}
              className="h-8 w-auto"
            />
          </Field>
          <Field label="End" hint="The deadline. In 'Deadline' timer mode, submissions stop being accepted after this time regardless of when each student started.">
            <Input
              type="datetime-local"
              value={settings.time.endAt ? settings.time.endAt.slice(0, 16) : ''}
              onChange={(e) => update({ time: { ...settings.time, endAt: e.target.value ? new Date(e.target.value).toISOString() : null } })}
              disabled={isLoading}
              className="h-8 w-auto"
            />
          </Field>
          <Field
            label="Duration"
            stacked
            hint="How long a student gets, in minutes, once they start. 'Deadline' mode counts down to the shared End time above; 'Per student timer' starts the countdown fresh for each student the moment they open it, independent of the End time."
          >
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
          </Field>
          <Field label="Auto submit on timeout" hint="When the timer runs out, automatically submit whatever the student has answered so far instead of leaving it open.">
            <Switch checked={settings.time.autoSubmitOnTimeout} onCheckedChange={(v) => update({ time: { ...settings.time, autoSubmitOnTimeout: v } })} disabled={isLoading} />
          </Field>
          <Field label="Show timer" hint="Display a visible countdown to the student while they work. Turn off to hide the pressure of a visible clock.">
            <Switch checked={settings.time.showTimer} onCheckedChange={(v) => update({ time: { ...settings.time, showTimer: v } })} disabled={isLoading} />
          </Field>
        </Section>

        <Section id="attempts">
          <Field label="Max attempts" hint="How many times a student can submit. Leave blank for unlimited attempts." stacked>
            <NumberInput value={settings.attempts.maxAttempts} min={1} onChange={(v) => update({ attempts: { ...settings.attempts, maxAttempts: v } })} disabled={isLoading} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Score to keep" stacked hint="If multiple attempts are allowed, which score counts toward grades: the highest one, or whichever attempt was submitted most recently.">
              <Select value={settings.attempts.scoreMode} onValueChange={(v) => update({ attempts: { ...settings.attempts, scoreMode: v as any } })} disabled={isLoading}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="best">Best score</SelectItem>
                  <SelectItem value="latest">Latest score</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Cooldown (min)" stacked hint="Minutes a student must wait after one attempt before starting the next one. 0 means they can retry immediately.">
              <NumberInput value={settings.attempts.cooldownMinutes} min={0} onChange={(v) => update({ attempts: { ...settings.attempts, cooldownMinutes: v ?? 0 } })} disabled={isLoading} />
            </Field>
          </div>
        </Section>

        <Section id="access">
          <Field label="Access code" stacked hint="Optional extra code students must enter before they can open this assignment, on top of normal class access.">
            <Input value={settings.access.accessCode || ''} onChange={(e) => update({ access: { ...settings.access, accessCode: e.target.value || null } })} placeholder="e.g. EXAM24" disabled={isLoading} className="h-8" />
          </Field>
          <Field label="Allowed classes" stacked hint="Restrict this assignment to specific classes only, by ID, comma separated. Leave blank to allow every class it's linked to.">
            <Input value={settings.access.allowedClassIds.join(',')} onChange={(e) => update({ access: { ...settings.access, allowedClassIds: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) } })} placeholder="Allowed class IDs (comma separated)" disabled={isLoading} className="h-8" />
          </Field>
          <Field label="Shuffle questions" hint="Show questions in a random order per student, so neighbors don't see the same question at the same time.">
            <Switch checked={settings.access.shuffleQuestions} onCheckedChange={(v) => update({ access: { ...settings.access, shuffleQuestions: v } })} disabled={isLoading} />
          </Field>
          <Field label="Shuffle answers" hint="Randomize the order of multiple-choice options per student.">
            <Switch checked={settings.access.shuffleAnswers} onCheckedChange={(v) => update({ access: { ...settings.access, shuffleAnswers: v } })} disabled={isLoading} />
          </Field>
          <Field label="Per-student shuffle" hint="Give every student their own random order, instead of one shuffled order shared by the whole class.">
            <Switch checked={settings.access.shuffleQuestionsPerStudent} onCheckedChange={(v) => update({ access: { ...settings.access, shuffleQuestionsPerStudent: v } })} disabled={isLoading} />
          </Field>
        </Section>

        <Section id="grading">
          <Field label="Auto grade" hint="Automatically score questions with a clear right answer (multiple choice, etc.) as soon as they're submitted, without you reviewing each one.">
            <Switch checked={settings.grading.autoGrade} onCheckedChange={(v) => update({ grading: { ...settings.grading, autoGrade: v } })} disabled={isLoading} />
          </Field>
          <Field label="Manual review open questions" hint="Even with auto grade on, hold open/written answers for you to review by hand instead of scoring them automatically.">
            <Switch checked={settings.grading.manualReviewOpenQuestions} onCheckedChange={(v) => update({ grading: { ...settings.grading, manualReviewOpenQuestions: v } })} disabled={isLoading} />
          </Field>
          <Field label="Feedback release" stacked hint="When a student gets to see whether they were right: immediately per question, right after they submit the whole assignment, or only once the deadline has passed for everyone.">
            <Select value={settings.grading.feedbackReleaseMode} onValueChange={(v) => update({ grading: { ...settings.grading, feedbackReleaseMode: v as any } })} disabled={isLoading}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="per_question">Feedback per question</SelectItem>
                <SelectItem value="after_submit">Feedback after submit</SelectItem>
                <SelectItem value="after_deadline">Feedback after deadline</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Show correct answers" hint="Reveal the correct answer alongside the student's own, once feedback is released.">
            <Switch checked={settings.grading.showCorrectAnswers} onCheckedChange={(v) => update({ grading: { ...settings.grading, showCorrectAnswers: v } })} disabled={isLoading} />
          </Field>
          <Field label="Show points" hint="Show the point value earned per question, not just right/wrong.">
            <Switch checked={settings.grading.showPoints} onCheckedChange={(v) => update({ grading: { ...settings.grading, showPoints: v } })} disabled={isLoading} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Total points" stacked hint="The maximum score this assignment is worth.">
              <NumberInput value={settings.grading.totalPoints} min={1} onChange={(v) => update({ grading: { ...settings.grading, totalPoints: v ?? 100 } })} disabled={isLoading} />
            </Field>
            <Field label="Weight" stacked hint="How much this assignment counts toward a student's overall grade relative to other assignments -- 1 is normal weight, 2 counts double, 0.5 counts half.">
              <NumberInput value={settings.grading.weight} min={0} step={0.1} onChange={(v) => update({ grading: { ...settings.grading, weight: v ?? 1 } })} disabled={isLoading} />
            </Field>
          </div>
        </Section>

        <Section id="antiCheat">
          <Field label="Require fullscreen" hint="Force the student's browser into fullscreen mode while taking this assignment; exiting fullscreen gets logged.">
            <Switch checked={settings.antiCheat.requireFullscreen} onCheckedChange={(v) => update({ antiCheat: { ...settings.antiCheat, requireFullscreen: v } })} disabled={isLoading} />
          </Field>
          <Field label="Detect tab switches" hint="Log when a student switches to another browser tab or app while taking this assignment.">
            <Switch checked={settings.antiCheat.detectTabSwitch} onCheckedChange={(v) => update({ antiCheat: { ...settings.antiCheat, detectTabSwitch: v } })} disabled={isLoading} />
          </Field>
          <Field label="Restrict IP/device" hint="Only allow this assignment to be opened from the same IP address/device the student first started it on.">
            <Switch checked={settings.antiCheat.restrictIpOrDevice} onCheckedChange={(v) => update({ antiCheat: { ...settings.antiCheat, restrictIpOrDevice: v } })} disabled={isLoading} />
          </Field>
          <Field label="Per-question time limit (sec)" stacked hint="Force students to move on after this many seconds per question -- they can't go back once time runs out on one. Leave blank for no per-question limit.">
            <NumberInput value={settings.antiCheat.perQuestionTimeLimitSeconds} min={1} onChange={(v) => update({ antiCheat: { ...settings.antiCheat, perQuestionTimeLimitSeconds: v } })} disabled={isLoading} />
          </Field>
        </Section>

        <Section id="delivery">
          <Field label="Autosave" hint="Save the student's answers automatically as they work, not just when they submit.">
            <Switch checked={settings.delivery.autosave} onCheckedChange={(v) => update({ delivery: { ...settings.delivery, autosave: v } })} disabled={isLoading} />
          </Field>
          <Field label="Allow resume" hint="Let a student close the assignment and come back to finish it later, instead of losing progress if they leave.">
            <Switch checked={settings.delivery.allowResume} onCheckedChange={(v) => update({ delivery: { ...settings.delivery, allowResume: v } })} disabled={isLoading} />
          </Field>
          <Field label="Instructions shown to students" stacked hint="Extra text shown to students before they start, e.g. what materials they're allowed to use.">
            <Textarea value={settings.delivery.instructionText} onChange={(e) => update({ delivery: { ...settings.delivery, instructionText: e.target.value } })} rows={3} disabled={isLoading} className="text-sm" />
          </Field>
        </Section>

        <Section id="advanced">
          <Field label="Question pool size" stacked hint="If this assignment draws from a larger pool of questions, how many to actually give each student.">
            <NumberInput value={settings.advanced.questionPoolSize} min={1} onChange={(v) => update({ advanced: { ...settings.advanced, questionPoolSize: v } })} disabled={isLoading} />
          </Field>
          <Field label="Adaptive logic" hint="Let the rules below change what a student sees next based on how they answered previous questions.">
            <Switch checked={settings.advanced.adaptiveEnabled} onCheckedChange={(v) => update({ advanced: { ...settings.advanced, adaptiveEnabled: v } })} disabled={isLoading} />
          </Field>
          <Field label="Adaptive rules" stacked hint="One rule per line, formatted as 'when=>then' -- e.g. 'wrong_q3=>show_hint_q3'. Only used when Adaptive logic is on.">
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
          </Field>
          <Field label="Review mode" hint="Let students revisit and review their own answers after grading, question by question.">
            <Switch checked={settings.advanced.reviewModeEnabled} onCheckedChange={(v) => update({ advanced: { ...settings.advanced, reviewModeEnabled: v } })} disabled={isLoading} />
          </Field>
          <Field label="Reflection enabled" hint="After submitting, prompt the student to briefly reflect on how it went.">
            <Switch checked={settings.advanced.reflectionEnabled} onCheckedChange={(v) => update({ advanced: { ...settings.advanced, reflectionEnabled: v } })} disabled={isLoading} />
          </Field>
          <Field label="Improvement attempt" hint="Allow a follow-up attempt focused only on the questions the student got wrong, instead of redoing the whole thing.">
            <Switch checked={settings.advanced.improvementAttemptEnabled} onCheckedChange={(v) => update({ advanced: { ...settings.advanced, improvementAttemptEnabled: v } })} disabled={isLoading} />
          </Field>
        </Section>
      </div>
    </div>
    </TooltipProvider>
  );
}
