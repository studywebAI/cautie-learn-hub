'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Quiz, QuizQuestion } from '@/lib/types';

// ─── Variant selection ────────────────────────────────────────────────────────
// Deterministic: same question always gets same variant (seeded from question ID).
// Weighted: lower knowledgeScore → more likely to get the easier variant.
function selectVariant(questionId: string, knowledgeScore: number, numVariants: number): number {
  // Simple hash of question ID → 0..99
  let hash = 0;
  for (let i = 0; i < questionId.length; i++) {
    hash = (hash * 31 + questionId.charCodeAt(i)) >>> 0;
  }
  const roll = hash % 100;
  // Build cumulative probability buckets: variant 0 = easiest, variant N-1 = hardest
  // knowledgeScore 0 → weights heavily towards easy; 100 → weights heavily towards hard
  if (numVariants === 1) return 0;
  if (numVariants === 2) {
    // Easy gets (100 - knowledgeScore)%, Hard gets knowledgeScore%
    return roll < (100 - knowledgeScore) ? 0 : 1;
  }
  if (numVariants === 3) {
    const easy = Math.round(50 - knowledgeScore * 0.4);   // 50→10 as knowledge 0→100
    const medium = 35;
    return roll < easy ? 0 : roll < easy + medium ? 1 : 2;
  }
  return 0;
}

// ─── MCQ Variants ─────────────────────────────────────────────────────────────

// Variant A: Card Grid (2×2 for 4 options)
function MCQCardGrid({ question, answer, disabled, onChange, reveal, correctOptionId }: {
  question: QuizQuestion; answer?: AnswerValue; disabled: boolean;
  onChange: (v: AnswerValue) => void; reveal: boolean; correctOptionId: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {question.options.map((option) => {
        const selected = answer?.kind === 'option' && answer.value === option.id;
        const isCorrect = option.id === correctOptionId;
        let cls = 'border border-border bg-muted/40 hover:bg-muted/70 text-foreground';
        if (reveal && isCorrect && selected) cls = 'border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200';
        else if (reveal && isCorrect) cls = 'border-2 border-emerald-400 bg-emerald-50/60 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300';
        else if (reveal && selected) cls = 'border-2 border-red-400 bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200';
        else if (selected) cls = 'border-2 border-[var(--accent-brand)] bg-[var(--accent-brand)]/10 text-foreground';
        return (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange({ kind: 'option', value: option.id })}
            className={`flex min-h-[80px] items-center justify-center rounded-xl px-4 py-4 text-center text-[13px] font-medium transition-all ${cls}`}
          >
            {cleanOptionText(option.text)}
          </button>
        );
      })}
    </div>
  );
}

// Variant B: Radio List (standard, clean)
function MCQRadioList({ question, answer, disabled, onChange, reveal, correctOptionId }: {
  question: QuizQuestion; answer?: AnswerValue; disabled: boolean;
  onChange: (v: AnswerValue) => void; reveal: boolean; correctOptionId: string;
}) {
  return (
    <div className="space-y-2.5">
      {question.options.map((option) => {
        const selected = answer?.kind === 'option' && answer.value === option.id;
        const isCorrect = option.id === correctOptionId;
        let cls = 'border border-border bg-background hover:border-[var(--accent-brand)]/50 hover:bg-muted/30';
        if (reveal && isCorrect && selected) cls = 'border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30';
        else if (reveal && isCorrect) cls = 'border-2 border-emerald-400 bg-emerald-50/60 dark:bg-emerald-900/20';
        else if (reveal && selected) cls = 'border-2 border-red-400 bg-red-50 dark:bg-red-900/30';
        else if (selected) cls = 'border-2 border-[var(--accent-brand)] bg-[var(--accent-brand)]/5';
        return (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange({ kind: 'option', value: option.id })}
            className={`flex w-full items-center gap-3 rounded-lg px-4 py-3.5 text-left transition-all ${cls}`}
          >
            <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${selected ? 'border-[var(--accent-brand)] bg-[var(--accent-brand)]' : 'border-muted-foreground/40'}`}>
              {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
            </span>
            <span className="text-[13px] text-foreground">{cleanOptionText(option.text)}</span>
          </button>
        );
      })}
    </div>
  );
}

// Variant C: Color Blocks — uses brand color in different tones (no rainbow)
const BRAND_TONES = [
  'bg-[var(--accent-brand)] text-white',
  'bg-[var(--accent-brand)]/75 text-white',
  'bg-[var(--accent-brand)]/50 text-foreground',
  'bg-[var(--accent-brand)]/30 text-foreground',
];

function MCQColorBlocks({ question, answer, disabled, onChange, reveal, correctOptionId }: {
  question: QuizQuestion; answer?: AnswerValue; disabled: boolean;
  onChange: (v: AnswerValue) => void; reveal: boolean; correctOptionId: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {question.options.map((option, idx) => {
        const selected = answer?.kind === 'option' && answer.value === option.id;
        const isCorrect = option.id === correctOptionId;
        let cls = BRAND_TONES[idx % BRAND_TONES.length];
        if (reveal && isCorrect && selected) cls = 'bg-emerald-500 text-white ring-4 ring-emerald-300';
        else if (reveal && isCorrect) cls = 'bg-emerald-400 text-white';
        else if (reveal && selected) cls = 'bg-red-400 text-white';
        else if (selected) cls = `${BRAND_TONES[idx % BRAND_TONES.length]} ring-4 ring-white/40`;
        return (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange({ kind: 'option', value: option.id })}
            className={`flex min-h-[80px] items-center justify-center rounded-xl px-4 py-4 text-center text-[13px] font-semibold transition-all ${cls} opacity-${disabled && !selected ? '70' : '100'}`}
          >
            {cleanOptionText(option.text)}
          </button>
        );
      })}
    </div>
  );
}

// ─── True/False Variants ──────────────────────────────────────────────────────

// Variant A: Big buttons
function TFBigButtons({ answer, disabled, onChange, reveal, correctOptionId, options }: {
  answer?: AnswerValue; disabled: boolean; onChange: (v: AnswerValue) => void;
  reveal: boolean; correctOptionId: string; options: QuizQuestion['options'];
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {options.map((option) => {
        const selected = answer?.kind === 'option' && answer.value === option.id;
        const isCorrect = option.id === correctOptionId;
        const isTrue = /^true$/i.test(cleanOptionText(option.text));
        let cls = isTrue
          ? 'border-2 border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
          : 'border-2 border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200 hover:bg-red-100 dark:hover:bg-red-900/40';
        if (selected) cls += ' ring-4 ring-[var(--accent-brand)]/40';
        if (reveal && isCorrect) cls = 'border-2 border-emerald-500 bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100';
        if (reveal && selected && !isCorrect) cls = 'border-2 border-red-500 bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100';
        return (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange({ kind: 'option', value: option.id })}
            className={`flex min-h-[100px] flex-col items-center justify-center gap-2 rounded-xl text-[22px] font-bold transition-all ${cls}`}
          >
            <span className="text-3xl">{isTrue ? '○' : '✕'}</span>
            <span className="text-[15px]">{cleanOptionText(option.text)}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Ordering Variants ────────────────────────────────────────────────────────

// Variant A: Drag handles (sortable list)
function OrderingDragHandles({ question, answer, disabled, onChange }: {
  question: QuizQuestion; answer?: AnswerValue; disabled: boolean; onChange: (v: AnswerValue) => void;
}) {
  const items = question.orderingItems || [];
  const current: string[] = answer?.kind === 'ordering' && answer.value.length === items.length
    ? answer.value
    : [...items].sort(() => 0); // keep original order as initial display

  const dragIdx = useRef<number | null>(null);

  const handleDragStart = (idx: number) => { dragIdx.current = idx; };
  const handleDrop = (dropIdx: number) => {
    if (dragIdx.current === null || dragIdx.current === dropIdx) return;
    const next = [...current];
    const [moved] = next.splice(dragIdx.current, 1);
    next.splice(dropIdx, 0, moved);
    onChange({ kind: 'ordering', value: next });
    dragIdx.current = null;
  };

  return (
    <div className="space-y-2">
      {current.map((item, idx) => (
        <div
          key={item}
          draggable={!disabled}
          onDragStart={() => handleDragStart(idx)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(idx)}
          className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-3 cursor-grab active:cursor-grabbing select-none"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-brand)]/15 text-[11px] font-semibold text-[var(--accent-brand)]">
            {idx + 1}
          </span>
          <svg className="h-4 w-4 shrink-0 text-muted-foreground/50" viewBox="0 0 16 16" fill="currentColor">
            <path d="M5 4a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm6 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm6 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM5 16a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm6 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/>
          </svg>
          <span className="text-[13px] text-foreground">{item}</span>
        </div>
      ))}
    </div>
  );
}

// Variant B: Click to number
function OrderingClickNumber({ question, answer, disabled, onChange }: {
  question: QuizQuestion; answer?: AnswerValue; disabled: boolean; onChange: (v: AnswerValue) => void;
}) {
  const items = question.orderingItems || [];
  const assignedOrder: (string | null)[] = answer?.kind === 'ordering' ? answer.value : [];
  const positionMap: Record<string, number> = {};
  assignedOrder.forEach((item, idx) => { if (item) positionMap[item] = idx + 1; });

  const [selected, setSelected] = useState<string | null>(null);

  const handleClick = (item: string) => {
    if (disabled) return;
    if (selected === item) { setSelected(null); return; }
    if (selected === null) { setSelected(item); return; }
    // Swap selected and clicked
    const nextMap = { ...positionMap };
    const a = nextMap[selected], b = nextMap[item];
    if (a) nextMap[item] = a; else delete nextMap[item];
    if (b) nextMap[selected] = b; else delete nextMap[selected];
    const next = items.map((i) => (positionMap[i] ? i : '')).sort((a2, b2) => (positionMap[a2] || 99) - (positionMap[b2] || 99));
    onChange({ kind: 'ordering', value: next });
    setSelected(null);
  };

  const nextPosition = Object.keys(positionMap).length + 1;
  const assign = (item: string) => {
    if (disabled || positionMap[item]) return;
    const next: string[] = [];
    for (let i = 1; i <= items.length; i++) {
      const found = items.find((it) => positionMap[it] === i);
      next.push(found || (i === nextPosition ? item : ''));
    }
    onChange({ kind: 'ordering', value: next });
  };

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const pos = positionMap[item];
        return (
          <button
            key={item}
            type="button"
            disabled={disabled}
            onClick={() => pos ? undefined : assign(item)}
            className={`flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition-all ${
              pos ? 'border-[var(--accent-brand)]/40 bg-[var(--accent-brand)]/8' : 'border-border bg-background hover:border-[var(--accent-brand)]/30'
            }`}
          >
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold transition-all ${
              pos ? 'bg-[var(--accent-brand)] text-white' : 'border-2 border-dashed border-muted-foreground/30 text-muted-foreground'
            }`}>
              {pos || '?'}
            </span>
            <span className="text-[13px] text-foreground">{item}</span>
          </button>
        );
      })}
      {Object.keys(positionMap).length > 0 && (
        <button
          type="button"
          onClick={() => onChange({ kind: 'ordering', value: [] })}
          className="mt-1 text-[11px] text-muted-foreground underline underline-offset-2"
        >
          Reset
        </button>
      )}
    </div>
  );
}

// ─── Click-Pair Matching (Variant C — color-coded pairing) ────────────────────
function MatchingClickPairs({ question, answer, disabled, onChange }: {
  question: QuizQuestion; answer?: AnswerValue; disabled: boolean; onChange: (v: AnswerValue) => void;
}) {
  const pairs = question.matchingPairs || [];
  const mapping: Record<string, string> = answer?.kind === 'matching' ? answer.value : {};
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);

  // Color palette for pairs (using muted tones)
  const pairColors = [
    'bg-[var(--accent-brand)]/25 border-[var(--accent-brand)]/50 text-[var(--accent-brand)]',
    'bg-blue-500/15 border-blue-400/50 text-blue-700 dark:text-blue-300',
    'bg-purple-500/15 border-purple-400/50 text-purple-700 dark:text-purple-300',
    'bg-orange-500/15 border-orange-400/50 text-orange-700 dark:text-orange-300',
    'bg-teal-500/15 border-teal-400/50 text-teal-700 dark:text-teal-300',
  ];

  // Build reverse mapping: right value → left key → color index
  const leftOrder = pairs.map((p) => p.left);
  const rightValues = pairs.map((p) => p.right);
  const getColorForLeft = (left: string) => {
    const idx = leftOrder.indexOf(left);
    return pairColors[idx % pairColors.length];
  };
  const getColorForRight = (right: string) => {
    const leftKey = Object.entries(mapping).find(([, v]) => v === right)?.[0];
    if (!leftKey) return '';
    return getColorForLeft(leftKey);
  };

  const handleLeftClick = (left: string) => {
    if (disabled) return;
    setSelectedLeft((prev) => (prev === left ? null : left));
  };
  const handleRightClick = (right: string) => {
    if (disabled) return;
    if (!selectedLeft) return;
    const next = { ...mapping };
    // Clear old assignment of this right value
    for (const k of Object.keys(next)) if (next[k] === right) delete next[k];
    // Assign
    next[selectedLeft] = right;
    onChange({ kind: 'matching', value: next });
    setSelectedLeft(null);
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-2">
        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Match from</p>
        {leftOrder.map((left) => {
          const isMatched = !!mapping[left];
          const isSelected = selectedLeft === left;
          const colorCls = isMatched ? getColorForLeft(left) : '';
          return (
            <button
              key={left}
              type="button"
              onClick={() => handleLeftClick(left)}
              className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-[13px] transition-all ${
                isSelected
                  ? 'border-[var(--accent-brand)] ring-2 ring-[var(--accent-brand)]/30 bg-[var(--accent-brand)]/10 text-[var(--accent-brand)]'
                  : isMatched
                  ? `border ${colorCls}`
                  : 'border-border bg-background hover:border-[var(--accent-brand)]/30'
              }`}
            >
              {left}
            </button>
          );
        })}
      </div>
      <div className="space-y-2">
        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Match to</p>
        {rightValues.map((right) => {
          const isMatched = !!getColorForRight(right);
          const colorCls = getColorForRight(right);
          return (
            <button
              key={right}
              type="button"
              onClick={() => handleRightClick(right)}
              className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-[13px] transition-all ${
                selectedLeft
                  ? 'border-[var(--accent-brand)]/40 hover:bg-[var(--accent-brand)]/10 cursor-pointer'
                  : isMatched
                  ? `border ${colorCls}`
                  : 'border-border bg-background'
              }`}
            >
              {right}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export type QuizMode = 'classic' | 'assisted' | 'adaptive' | 'practice';
type QuizRuntimeSettings = {
  answerFeedback: 'immediate' | 'end';
  gradingModes: Array<'accuracy' | 'speed' | 'progression'>;
  adaptiveCap: number;
  questionTypes: string[];
  knowledgeScore: number;
};
type AnswerValue =
  | { kind: 'option'; value: string }
  | { kind: 'text'; value: string }
  | { kind: 'matching'; value: Record<string, string> }
  | { kind: 'ordering'; value: string[] }
  | { kind: 'cloze'; value: string[] }
  | { kind: 'comparison'; value: Record<string, string[]> };
type AnswerMap = Record<string, AnswerValue>;
type AdaptivePerformanceSignal = { category: string; isCorrect: boolean; difficulty?: number; responseMs?: number };

const normalizeText = (value: string) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,!?;:]/g, '');
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const getAdaptiveStorageKey = (sourceText: string, questionTypes: string[]) =>
  `quiz.adaptive.profile.v1::${normalizeText(sourceText).slice(0, 180)}::${[...questionTypes].sort().join(',')}`;
const getSessionStorageKey = (sourceText: string, mode: string) =>
  `quiz.session.v2::${mode}::${normalizeText(sourceText).slice(0, 220)}`;

function scoreProgression(signals: AdaptivePerformanceSignal[]) {
  if (signals.length < 6) return 50;
  const recent = signals.slice(-12);
  const midpoint = Math.floor(recent.length / 2);
  const head = recent.slice(0, midpoint);
  const tail = recent.slice(midpoint);
  const headAcc = head.length ? head.filter((s) => s.isCorrect).length / head.length : 0;
  const tailAcc = tail.length ? tail.filter((s) => s.isCorrect).length / tail.length : 0;
  return Math.round(clamp(50 + (tailAcc - headAcc) * 100, 0, 100));
}

function scoreSpeed(signals: AdaptivePerformanceSignal[]) {
  const valid = signals.map((s) => Number(s.responseMs || 0)).filter((n) => n > 0);
  if (valid.length === 0) return 50;
  const avgMs = valid.reduce((acc, n) => acc + n, 0) / valid.length;
  return Math.round(clamp(100 - ((avgMs - 30000) / 30000) * 40, 0, 100));
}

function getCorrectAnswerText(question: QuizQuestion) {
  const type = question.type || 'multiple-choice';
  if (type === 'fill-blank' || type === 'short-answer') return (question.acceptableAnswers || []).join(' / ') || '-';
  if (type === 'cloze') return (question.acceptableAnswers || []).join(', ') || '-';
  if (type === 'ranking') return (question.orderingItems || []).map((item, i) => `${i + 1}. ${item}`).join(' → ') || '-';
  if (type === 'drag-drop') {
    const items = (question as any).dragDropItems as Array<{ id: string; text: string; correctCategory: string }> || [];
    return items.map((item) => `${item.text} → ${item.correctCategory}`).join(' | ') || '-';
  }
  if (type === 'venn') {
    const items = (question as any).vennItems as Array<{ id: string; text: string; correctZone: string }> || [];
    return items.map((item) => `${item.text} → ${item.correctZone}`).join(' | ') || '-';
  }
  if (type === 'spot-error') {
    const segs = (question as any).spotErrorSegments as Array<{ id: string; text: string; isError: boolean }> || [];
    return segs.find((s) => s.isError)?.text || '-';
  }
  if (type === 'matching') return (question.matchingPairs || []).map((pair) => `${pair.left} → ${pair.right}`).join(' | ') || '-';
  if (type === 'argument-analysis') {
    return Object.entries(question.argumentCorrect || {}).map(([id, tag]) => {
      const stmt = (question.argumentStatements || []).find((s) => s.id === id);
      return `"${(stmt?.text || id).slice(0, 40)}…" → ${tag}`;
    }).join(' | ') || '-';
  }
  if (type === 'ordering') return (question.orderingItems || []).join(' → ') || '-';
  if (type === 'comparison-matrix') {
    return Object.entries(question.comparisonCorrect || {}).map(([r, cs]) => `${r}: ${cs.join(', ')}`).join(' | ') || '-';
  }
  if (type === 'hotspot') return question.hotspotZones?.find((z) => z.isCorrect)?.label || '-';
  if (type === 'scenario') {
    return question.options?.find((o) => o.isCorrect)?.text || question.options?.find((o) => o.id === question.correctOptionId)?.text || '-';
  }
  return (
    question.options?.find((option) => option.isCorrect)?.text ||
    question.options?.find((option) => option.id === question.correctOptionId)?.text ||
    '-'
  );
}

function evaluateQuestionAnswer(question: QuizQuestion, answer?: AnswerValue | null): boolean {
  if (!question || !answer) return false;
  const type = question.type || 'multiple-choice';
  if (type === 'ranking') {
    if (answer.kind !== 'ordering') return false;
    const expected = (question.orderingItems || []).map(normalizeText);
    const actual = answer.value.map(normalizeText);
    return expected.length > 0 && expected.length === actual.length && expected.every((e, i) => e === actual[i]);
  }
  if (type === 'drag-drop') {
    if (answer.kind !== 'matching') return false;
    const items = (question as any).dragDropItems as Array<{ id: string; text: string; correctCategory: string }> || [];
    return items.length > 0 && items.every((item) => normalizeText(answer.value[item.id] || '') === normalizeText(item.correctCategory));
  }
  if (type === 'venn') {
    if (answer.kind !== 'matching') return false;
    const items = (question as any).vennItems as Array<{ id: string; text: string; correctZone: string }> || [];
    return items.length > 0 && items.every((item) => normalizeText(answer.value[item.id] || '') === normalizeText(item.correctZone));
  }
  if (type === 'spot-error') {
    if (answer.kind !== 'option') return false;
    const segs = (question as any).spotErrorSegments as Array<{ id: string; text: string; isError: boolean }> || [];
    return Boolean(segs.find((s) => s.id === answer.value && s.isError));
  }
  if (['multiple-choice', 'true-false', 'image-analysis', 'video-analysis', 'drawing-analysis', 'internet-photo', 'video-fragment', 'timeline', 'scenario', 'hotspot'].includes(type)) {
    if (answer.kind !== 'option') return false;
    if (type === 'hotspot') return Boolean(question.hotspotZones?.find((z) => z.id === answer.value && z.isCorrect));
    const correctOption =
      question.options?.find((option) => option.isCorrect) ||
      (question.correctOptionId ? question.options?.find((option) => option.id === question.correctOptionId) : undefined);
    return Boolean(correctOption && correctOption.id === answer.value);
  }
  if (type === 'fill-blank' || type === 'short-answer' || type === 'numeric') {
    if (answer.kind !== 'text') return false;
    const targetAnswers = (question.acceptableAnswers || []).map(normalizeText).filter(Boolean);
    return targetAnswers.includes(normalizeText(answer.value));
  }
  if (type === 'cloze') {
    if (answer.kind !== 'cloze') return false;
    const correct = question.acceptableAnswers || [];
    return correct.length > 0 && correct.every((c, i) => normalizeText(answer.value[i] || '') === normalizeText(c));
  }
  if (type === 'matching') {
    if (answer.kind !== 'matching') return false;
    const pairs = question.matchingPairs || [];
    return pairs.length > 0 && pairs.every((pair) => normalizeText(answer.value[pair.left] || '') === normalizeText(pair.right));
  }
  if (type === 'argument-analysis') {
    if (answer.kind !== 'matching') return false;
    const correct = question.argumentCorrect || {};
    const stmts = question.argumentStatements || [];
    return stmts.length > 0 && stmts.every((s) => normalizeText(answer.value[s.id] || '') === normalizeText(correct[s.id] || ''));
  }
  if (type === 'ordering') {
    if (answer.kind !== 'ordering') return false;
    const expected = (question.orderingItems || []).map(normalizeText);
    const actual = answer.value.map(normalizeText);
    return expected.length > 0 && expected.length === actual.length && expected.every((entry, index) => entry === actual[index]);
  }
  if (type === 'comparison-matrix') {
    if (answer.kind !== 'comparison') return false;
    const correct = question.comparisonCorrect || {};
    const rows = question.comparisonRows || [];
    return rows.length > 0 && rows.every((row) => {
      const correctCols = (correct[row] || []).map(normalizeText).sort().join(',');
      const userCols = (answer.value[row] || []).map(normalizeText).sort().join(',');
      return correctCols === userCols;
    });
  }
  return false;
}

function getQuestionAccuracy(question: QuizQuestion, answer?: AnswerValue | null) {
  const type = question.type || 'multiple-choice';
  if (!answer) return { accuracy: 0, partsCorrect: 0, partsTotal: 1, correct: false };
  if (type === 'ranking') {
    const expected = (question.orderingItems || []).map(normalizeText);
    const actual = answer.kind === 'ordering' ? answer.value.map(normalizeText) : [];
    const total = Math.max(1, expected.length);
    const ok = expected.reduce((acc, e, i) => acc + (actual[i] === e ? 1 : 0), 0);
    return { accuracy: Math.round((ok / total) * 100), partsCorrect: ok, partsTotal: total, correct: ok === total && expected.length === actual.length };
  }
  if (type === 'drag-drop') {
    const items = (question as any).dragDropItems as Array<{ id: string; text: string; correctCategory: string }> || [];
    const total = Math.max(1, items.length);
    const mapping = answer.kind === 'matching' ? answer.value : {};
    const ok = items.reduce((acc, item) => acc + (normalizeText(mapping[item.id] || '') === normalizeText(item.correctCategory) ? 1 : 0), 0);
    return { accuracy: Math.round((ok / total) * 100), partsCorrect: ok, partsTotal: total, correct: ok === total };
  }
  if (type === 'venn') {
    const items = (question as any).vennItems as Array<{ id: string; text: string; correctZone: string }> || [];
    const total = Math.max(1, items.length);
    const mapping = answer.kind === 'matching' ? answer.value : {};
    const ok = items.reduce((acc, item) => acc + (normalizeText(mapping[item.id] || '') === normalizeText(item.correctZone) ? 1 : 0), 0);
    return { accuracy: Math.round((ok / total) * 100), partsCorrect: ok, partsTotal: total, correct: ok === total };
  }
  if (type === 'matching') {
    const pairs = question.matchingPairs || [];
    const total = Math.max(1, pairs.length);
    const mapping = answer.kind === 'matching' ? answer.value : {};
    const ok = pairs.reduce(
      (acc, pair) => acc + (normalizeText(mapping[pair.left] || '') === normalizeText(pair.right) ? 1 : 0),
      0
    );
    return { accuracy: Math.round((ok / total) * 100), partsCorrect: ok, partsTotal: total, correct: ok === total };
  }
  if (type === 'argument-analysis') {
    const stmts = question.argumentStatements || [];
    const correct = question.argumentCorrect || {};
    const total = Math.max(1, stmts.length);
    const mapping = answer.kind === 'matching' ? answer.value : {};
    const ok = stmts.reduce((acc, s) => acc + (normalizeText(mapping[s.id] || '') === normalizeText(correct[s.id] || '') ? 1 : 0), 0);
    return { accuracy: Math.round((ok / total) * 100), partsCorrect: ok, partsTotal: total, correct: ok === total };
  }
  if (type === 'cloze') {
    const correct = question.acceptableAnswers || [];
    const total = Math.max(1, correct.length);
    const vals = answer.kind === 'cloze' ? answer.value : [];
    const ok = correct.reduce((acc, c, i) => acc + (normalizeText(vals[i] || '') === normalizeText(c) ? 1 : 0), 0);
    return { accuracy: Math.round((ok / total) * 100), partsCorrect: ok, partsTotal: total, correct: ok === total };
  }
  if (type === 'comparison-matrix') {
    const rows = question.comparisonRows || [];
    const correct = question.comparisonCorrect || {};
    const total = Math.max(1, rows.length);
    const userMap = answer.kind === 'comparison' ? answer.value : {};
    const ok = rows.reduce((acc, row) => {
      const cCols = (correct[row] || []).map(normalizeText).sort().join(',');
      const uCols = (userMap[row] || []).map(normalizeText).sort().join(',');
      return acc + (cCols === uCols ? 1 : 0);
    }, 0);
    return { accuracy: Math.round((ok / total) * 100), partsCorrect: ok, partsTotal: total, correct: ok === total };
  }
  if (type === 'ordering') {
    const expected = (question.orderingItems || []).map(normalizeText);
    const actual = answer.kind === 'ordering' ? answer.value.map(normalizeText) : [];
    const total = Math.max(1, expected.length);
    const ok = expected.reduce((acc, entry, idx) => acc + (actual[idx] === entry ? 1 : 0), 0);
    return {
      accuracy: Math.round((ok / total) * 100),
      partsCorrect: ok,
      partsTotal: total,
      correct: ok === total && expected.length === actual.length,
    };
  }
  const correct = evaluateQuestionAnswer(question, answer);
  return { accuracy: correct ? 100 : 0, partsCorrect: correct ? 1 : 0, partsTotal: 1, correct };
}

function formatAnswer(question: QuizQuestion, answer?: AnswerValue) {
  if (!answer) return '-';
  if (answer.kind === 'text') return answer.value || '-';
  if (answer.kind === 'option') {
    if (question.type === 'hotspot') return question.hotspotZones?.find((z) => z.id === answer.value)?.label || answer.value;
    if (question.type === 'spot-error') {
      const segs = (question as any).spotErrorSegments as Array<{ id: string; text: string }> || [];
      return segs.find((s) => s.id === answer.value)?.text || answer.value;
    }
    return question.options?.find((opt) => opt.id === answer.value)?.text || '-';
  }
  if (answer.kind === 'ordering') return answer.value.join(' → ');
  if (answer.kind === 'matching') {
    if (question.type === 'drag-drop') {
      const items = (question as any).dragDropItems as Array<{ id: string; text: string }> || [];
      return Object.entries(answer.value).map(([id, cat]) => {
        const item = items.find((i) => i.id === id);
        return `${item?.text ?? id} → ${cat}`;
      }).join(' | ') || '-';
    }
    if (question.type === 'venn') {
      const items = (question as any).vennItems as Array<{ id: string; text: string }> || [];
      return Object.entries(answer.value).map(([id, zone]) => {
        const item = items.find((i) => i.id === id);
        return `${item?.text ?? id} → ${zone}`;
      }).join(' | ') || '-';
    }
    return Object.entries(answer.value).map(([k, v]) => `${k} → ${v}`).join(' | ');
  }
  if (answer.kind === 'cloze') return answer.value.join(', ');
  if (answer.kind === 'comparison') return Object.entries(answer.value).map(([r, cs]) => `${r}: ${cs.join(', ')}`).join(' | ');
  return '-';
}

function cleanOptionText(text: string) {
  return String(text || '').replace(/^\s*[A-Da-d][\)\.\:\-]\s*/, '').trim();
}

function buildLearningNotes(rows: Array<{ category: string; accuracy: number }>, overallAccuracy: number, speedPct: number) {
  const category = rows.reduce<Record<string, { count: number; total: number }>>((acc, row) => {
    acc[row.category] = acc[row.category] || { count: 0, total: 0 };
    acc[row.category].count += 1;
    acc[row.category].total += row.accuracy;
    return acc;
  }, {});
  const sorted = Object.entries(category)
    .map(([name, stat]) => ({ name, score: Math.round(stat.total / Math.max(1, stat.count)) }))
    .sort((a, b) => a.score - b.score);

  const notes: string[] = [];
  if (sorted[0]) notes.push(`Problem: lower accuracy in ${sorted[0].name}. Action: do a focused retry in ${sorted[0].name} and verify each option before submit.`);
  if (sorted[1] && sorted[1].score < 70) notes.push(`Problem: inconsistent results in ${sorted[1].name}. Action: use flashcards for ${sorted[1].name} first, then rerun quiz practice.`);
  if (speedPct > 80 && overallAccuracy < 70) notes.push('Problem: answering too fast reduces precision. Action: add a 5-second check before each submit.');
  if (overallAccuracy < 55) notes.push('Problem: core understanding is unstable. Action: review notes on weakest categories, then retry mistakes only.');
  return notes.slice(0, 4);
}

function MatchingComparison({ question, answer }: { question: QuizQuestion; answer?: AnswerValue }) {
  const pairs = question.matchingPairs || [];
  const mapping = answer?.kind === 'matching' ? answer.value : {};
  return (
    <div className="space-y-1.5">
      {pairs.map((pair) => {
        const user = String(mapping[pair.left] || '');
        const ok = normalizeText(user) === normalizeText(pair.right);
        return (
          <div key={pair.left} className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-2 rounded-md bg-muted/30 px-2 py-1.5 text-xs">
            <span className="font-medium">{pair.left}</span>
            <span>{user || '-'}</span>
            <span>{pair.right}</span>
            <span className={ok ? 'text-emerald-700' : 'text-red-700'}>{ok ? 'OK' : 'X'}</span>
          </div>
        );
      })}
    </div>
  );
}

function MatchingBoard({ question, answer, disabled, onChange }: { question: QuizQuestion; answer?: AnswerValue; disabled: boolean; onChange: (next: AnswerValue) => void }) {
  const pairs = question.matchingPairs || [];
  const mapping = answer?.kind === 'matching' ? answer.value : {};
  const pool = Array.from(new Set(pairs.map((pair) => pair.right)));
  const canReuse = /multiple times|more than once|reuse/i.test(String(question.hint || ''));
  const onDrop = (left: string, right: string) => {
    if (disabled) return;
    const next = { ...mapping };
    if (!canReuse) for (const key of Object.keys(next)) if (next[key] === right) delete next[key];
    next[left] = right;
    onChange({ kind: 'matching', value: next });
  };
  return (
    <div className="space-y-3">
      <div className="grid gap-2 md:grid-cols-2">
        {pairs.map((pair) => (
          <div key={pair.left} className="rounded-lg border border-border bg-background p-2.5">
            <p className="mb-2 text-sm font-medium">{pair.left}</p>
            <div
              className="min-h-10 rounded-md border border-dashed border-border px-2 py-2 text-sm"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const right = e.dataTransfer.getData('text/plain');
                if (right) onDrop(pair.left, right);
              }}
            >
              {mapping[pair.left] || <span className="text-muted-foreground">Drop match here</span>}
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-lg surface-interactive p-2.5">
        <p className="mb-2 text-xs text-muted-foreground">Drag options</p>
        <div className="flex flex-wrap gap-2">
          {pool.map((right) => (
            <button
              key={right}
              type="button"
              draggable={!disabled}
              onDragStart={(e) => e.dataTransfer.setData('text/plain', right)}
              onClick={() => {
                const unassigned = pairs.find((pair) => !mapping[pair.left]);
                if (unassigned) onDrop(unassigned.left, right);
              }}
              className="rounded-full border border-border bg-background px-3 py-1.5 text-xs"
            >
              {right}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Cloze Test ───────────────────────────────────────────────────────────────
// Extracts blank positions from question text (___) and renders them inline.
function parseCloze(text: string): Array<{ type: 'text' | 'blank'; content: string; index: number }> {
  const parts: Array<{ type: 'text' | 'blank'; content: string; index: number }> = [];
  const regex = /_{3,}/g;
  let lastEnd = 0;
  let blankIdx = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastEnd) parts.push({ type: 'text', content: text.slice(lastEnd, match.index), index: -1 });
    parts.push({ type: 'blank', content: '', index: blankIdx++ });
    lastEnd = match.index + match[0].length;
  }
  if (lastEnd < text.length) parts.push({ type: 'text', content: text.slice(lastEnd), index: -1 });
  return parts;
}

function ClozeOpen({ question, answer, disabled, onChange }: {
  question: QuizQuestion; answer?: AnswerValue; disabled: boolean; onChange: (v: AnswerValue) => void;
}) {
  const parts = parseCloze(question.question);
  const values: string[] = answer?.kind === 'cloze' ? answer.value : [];
  const blankCount = parts.filter((p) => p.type === 'blank').length;

  const update = (idx: number, val: string) => {
    const next = Array.from({ length: blankCount }, (_, i) => values[i] ?? '');
    next[idx] = val;
    onChange({ kind: 'cloze', value: next });
  };

  return (
    <div className="rounded-xl border border-border bg-muted/30 px-4 py-4 text-[14px] leading-[2.2] text-foreground">
      {parts.map((part, i) =>
        part.type === 'text' ? (
          <span key={i}>{part.content}</span>
        ) : (
          <input
            key={i}
            type="text"
            value={values[part.index] ?? ''}
            onChange={(e) => update(part.index, e.target.value)}
            disabled={disabled}
            className="mx-1.5 inline-block h-8 w-32 rounded-md border border-border bg-background px-2 text-[13px] text-foreground align-middle focus:outline-none focus:ring-2 focus:ring-[var(--accent-brand)]/40"
            placeholder={`(${part.index + 1})`}
          />
        )
      )}
    </div>
  );
}

function ClozeWordBank({ question, answer, disabled, onChange }: {
  question: QuizQuestion; answer?: AnswerValue; disabled: boolean; onChange: (v: AnswerValue) => void;
}) {
  const parts = parseCloze(question.question);
  const values: string[] = answer?.kind === 'cloze' ? answer.value : [];
  const wordBank: string[] = question.clozeWordBank || question.acceptableAnswers || [];
  const blankCount = parts.filter((p) => p.type === 'blank').length;

  const update = (idx: number, val: string) => {
    const next = Array.from({ length: blankCount }, (_, i) => values[i] ?? '');
    next[idx] = val;
    onChange({ kind: 'cloze', value: next });
  };

  // Track which words are used and in which slot
  const usedSlotMap: Record<string, number> = {};
  values.forEach((v, i) => { if (v) usedSlotMap[v] = i; });

  const [dragWord, setDragWord] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      {/* Text with drop targets */}
      <div className="rounded-xl border border-border bg-muted/30 px-4 py-4 text-[14px] leading-[2.4] text-foreground">
        {parts.map((part, i) =>
          part.type === 'text' ? (
            <span key={i}>{part.content}</span>
          ) : (
            <span
              key={i}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const word = e.dataTransfer.getData('text/plain') || dragWord;
                if (word) update(part.index, word);
                setDragWord(null);
              }}
              onClick={() => {
                // Clear this slot
                if (values[part.index]) update(part.index, '');
              }}
              className={[
                'mx-1.5 inline-flex min-w-[80px] items-center justify-center rounded-md border px-2 py-0.5 align-middle text-[13px] transition-all cursor-pointer',
                values[part.index]
                  ? 'border-[var(--accent-brand)]/50 bg-[var(--accent-brand)]/10 text-[var(--accent-brand)] font-medium'
                  : 'border-dashed border-muted-foreground/40 bg-background text-muted-foreground',
              ].join(' ')}
            >
              {values[part.index] || `(${part.index + 1})`}
            </span>
          )
        )}
      </div>

      {/* Word bank */}
      <div className="space-y-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Word bank — drag or click to place</p>
        <div className="flex flex-wrap gap-2">
          {wordBank.map((word) => {
            const usedInSlot = usedSlotMap[word] !== undefined;
            return (
              <button
                key={word}
                type="button"
                draggable={!disabled && !usedInSlot}
                onDragStart={(e) => { e.dataTransfer.setData('text/plain', word); setDragWord(word); }}
                onClick={() => {
                  if (disabled || usedInSlot) return;
                  // Fill the first empty slot
                  const emptyIdx = Array.from({ length: blankCount }, (_, i) => i).find((i) => !values[i]);
                  if (emptyIdx !== undefined) update(emptyIdx, word);
                }}
                disabled={disabled}
                className={[
                  'rounded-lg border px-3 py-1.5 text-[13px] transition-all',
                  usedInSlot
                    ? 'border-border bg-muted/40 text-muted-foreground/40 line-through cursor-default'
                    : 'border-border bg-background text-foreground hover:border-[var(--accent-brand)]/50 cursor-grab active:cursor-grabbing',
                ].join(' ')}
              >
                {word}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Hotspot ──────────────────────────────────────────────────────────────────
function HotspotQuestion({ question, answer, disabled, onChange }: {
  question: QuizQuestion; answer?: AnswerValue; disabled: boolean; onChange: (v: AnswerValue) => void;
}) {
  const imageUrl = question.media?.url || '';
  const zones = question.hotspotZones || [];
  const selected = answer?.kind === 'option' ? answer.value : '';
  const [revealed, setRevealed] = useState(false);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    const update = () => setImgSize({ w: img.clientWidth, h: img.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(img);
    return () => ro.disconnect();
  }, [imageUrl]);

  if (!imageUrl) {
    return <p className="text-sm text-muted-foreground">No image provided for this hotspot question.</p>;
  }

  const correctZone = zones.find((z) => z.isCorrect);

  return (
    <div className="space-y-3">
      <p className="text-[12px] text-muted-foreground">Click on the correct area in the image.</p>
      <div className="relative inline-block w-full overflow-hidden rounded-xl border border-border bg-muted/20">
        <img
          ref={imgRef}
          src={imageUrl}
          alt={question.media?.title || 'Hotspot image'}
          className="w-full rounded-xl object-contain"
          style={{ maxHeight: 420 }}
          draggable={false}
        />
        {/* Clickable zones — invisible until answered */}
        {zones.map((zone) => {
          const isSelected = selected === zone.id;
          const showCorrect = revealed && zone.isCorrect;
          const showWrong = revealed && isSelected && !zone.isCorrect;
          return (
            <button
              key={zone.id}
              type="button"
              disabled={disabled}
              onClick={() => {
                if (disabled) return;
                onChange({ kind: 'option', value: zone.id });
                setRevealed(true);
              }}
              style={{
                position: 'absolute',
                left: `${zone.x}%`,
                top: `${zone.y}%`,
                width: `${zone.width}%`,
                height: `${zone.height}%`,
              }}
              className={[
                'rounded transition-all duration-200',
                isSelected && !revealed ? 'ring-2 ring-[var(--accent-brand)] bg-[var(--accent-brand)]/20' : '',
                showCorrect ? 'ring-2 ring-emerald-500 bg-emerald-400/25' : '',
                showWrong ? 'ring-2 ring-red-500 bg-red-400/25' : '',
                !isSelected && !revealed ? 'hover:bg-white/10' : '',
              ].join(' ')}
              title={revealed ? zone.label : ''}
            />
          );
        })}
        {/* Label overlay after reveal */}
        {revealed && correctZone && (
          <div
            style={{
              position: 'absolute',
              left: `${correctZone.x + correctZone.width / 2}%`,
              top: `${correctZone.y}%`,
              transform: 'translateX(-50%) translateY(-110%)',
            }}
            className="rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-semibold text-white shadow"
          >
            {correctZone.label}
          </div>
        )}
      </div>
      {revealed && selected && (
        <p className={`text-[13px] font-medium ${zones.find((z) => z.id === selected)?.isCorrect ? 'text-emerald-600' : 'text-red-500'}`}>
          {zones.find((z) => z.id === selected)?.isCorrect ? `Correct — ${zones.find((z) => z.id === selected)?.label}` : `Incorrect — correct answer: ${correctZone?.label}`}
        </p>
      )}
    </div>
  );
}

// ─── Comparison Matrix ────────────────────────────────────────────────────────
function ComparisonMatrix({ question, answer, disabled, onChange }: {
  question: QuizQuestion; answer?: AnswerValue; disabled: boolean; onChange: (v: AnswerValue) => void;
}) {
  const rows = question.comparisonRows || [];
  const cols = question.comparisonColumns || [];
  const correct = question.comparisonCorrect || {};
  const userMap: Record<string, string[]> = answer?.kind === 'comparison' ? answer.value : {};

  const toggle = (row: string, col: string) => {
    if (disabled) return;
    const current = userMap[row] || [];
    const next = current.includes(col) ? current.filter((c) => c !== col) : [...current, col];
    onChange({ kind: 'comparison', value: { ...userMap, [row]: next } });
  };

  if (!rows.length || !cols.length) {
    return <p className="text-sm text-muted-foreground">Comparison data not available.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="px-3 py-2.5 text-left font-medium text-muted-foreground" />
            {cols.map((col) => (
              <th key={col} className="px-3 py-2.5 text-center text-[12px] font-semibold text-foreground">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr key={row} className={rowIdx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
              <td className="px-3 py-2.5 font-medium text-foreground">{row}</td>
              {cols.map((col) => {
                const checked = (userMap[row] || []).includes(col);
                const isCorrect = (correct[row] || []).includes(col);
                return (
                  <td key={col} className="px-3 py-2.5 text-center">
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => toggle(row, col)}
                      className={[
                        'mx-auto flex h-6 w-6 items-center justify-center rounded border-2 transition-all',
                        checked
                          ? 'border-[var(--accent-brand)] bg-[var(--accent-brand)] text-white'
                          : 'border-muted-foreground/30 bg-background hover:border-[var(--accent-brand)]/60',
                      ].join(' ')}
                    >
                      {checked && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Argument Analysis ────────────────────────────────────────────────────────
function ArgumentAnalysis({ question, answer, disabled, onChange }: {
  question: QuizQuestion; answer?: AnswerValue; disabled: boolean; onChange: (v: AnswerValue) => void;
}) {
  const statements = question.argumentStatements || [];
  const tags = question.argumentTags || ['Claim', 'Evidence', 'Counterargument', 'Conclusion'];
  const userMap: Record<string, string> = answer?.kind === 'matching' ? answer.value : {};

  const assign = (statementId: string, tag: string) => {
    if (disabled) return;
    const next = { ...userMap };
    next[statementId] = next[statementId] === tag ? '' : tag;
    onChange({ kind: 'matching', value: next });
  };

  if (!statements.length) {
    return <p className="text-sm text-muted-foreground">No statements provided for analysis.</p>;
  }

  // Gentle tag colors — rotated, no harsh colors
  const tagColors: Record<string, string> = {};
  const palette = [
    'bg-[var(--accent-brand)]/15 text-[var(--accent-brand)] border-[var(--accent-brand)]/40',
    'bg-blue-500/12 text-blue-700 dark:text-blue-300 border-blue-400/40',
    'bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-400/40',
    'bg-purple-500/12 text-purple-700 dark:text-purple-300 border-purple-400/40',
    'bg-teal-500/12 text-teal-700 dark:text-teal-300 border-teal-400/40',
  ];
  tags.forEach((tag, i) => { tagColors[tag] = palette[i % palette.length]; });

  return (
    <div className="space-y-3">
      {statements.map((stmt) => {
        const assigned = userMap[stmt.id] || '';
        return (
          <div key={stmt.id} className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2.5">
            <p className="text-[13px] text-foreground leading-relaxed">{stmt.text}</p>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => {
                const active = assigned === tag;
                return (
                  <button
                    key={tag}
                    type="button"
                    disabled={disabled}
                    onClick={() => assign(stmt.id, tag)}
                    className={[
                      'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all',
                      active ? tagColors[tag] : 'border-border bg-background text-muted-foreground hover:bg-muted/60',
                    ].join(' ')}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Ranking ─────────────────────────────────────────────────────────────────
// Like ordering but shows rank criterion and uses #1 / #2 badges.
function RankingQuestion({ question, answer, disabled, onChange }: {
  question: QuizQuestion; answer?: AnswerValue; disabled: boolean; onChange: (v: AnswerValue) => void;
}) {
  const items = question.orderingItems || [];
  const criteria = (question as any).rankingCriteria as string | undefined;
  const current: string[] = answer?.kind === 'ordering' && answer.value.length === items.length
    ? answer.value
    : [...items];

  const dragIdx = useRef<number | null>(null);

  const handleDragStart = (idx: number) => { dragIdx.current = idx; };
  const handleDrop = (dropIdx: number) => {
    if (dragIdx.current === null || dragIdx.current === dropIdx) return;
    const next = [...current];
    const [moved] = next.splice(dragIdx.current, 1);
    next.splice(dropIdx, 0, moved);
    onChange({ kind: 'ordering', value: next });
    dragIdx.current = null;
  };

  return (
    <div className="space-y-3">
      {criteria ? (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-[12px] text-muted-foreground">
          <span className="font-semibold text-foreground">Rank by: </span>{criteria}
        </div>
      ) : null}
      <p className="text-[11px] text-muted-foreground">Drag to reorder from #1 (top) to last (bottom).</p>
      <div className="space-y-2">
        {current.map((item, idx) => (
          <div
            key={item}
            draggable={!disabled}
            onDragStart={() => handleDragStart(idx)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(idx)}
            className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-3 cursor-grab active:cursor-grabbing select-none"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent-brand)]/15 text-[11px] font-bold text-[var(--accent-brand)]">
              #{idx + 1}
            </span>
            <svg className="h-4 w-4 shrink-0 text-muted-foreground/50" viewBox="0 0 16 16" fill="currentColor">
              <path d="M5 4a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm6 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm6 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM5 16a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm6 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/>
            </svg>
            <span className="text-[13px] text-foreground">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Drag & Drop Categorize ───────────────────────────────────────────────────
// Click-based categorization (or cause→effect variant).
function DragDropCategorize({ question, answer, disabled, onChange }: {
  question: QuizQuestion; answer?: AnswerValue; disabled: boolean; onChange: (v: AnswerValue) => void;
}) {
  const categories = (question as any).dragDropCategories as string[] || [];
  const items = (question as any).dragDropItems as Array<{ id: string; text: string; correctCategory: string }> || [];
  const isCauseEffect = (question as any).dragDropVariant === 'cause-effect';
  const userMap: Record<string, string> = answer?.kind === 'matching' ? answer.value : {};

  const catColors = [
    'border-[var(--accent-brand)]/50 bg-[var(--accent-brand)]/10 text-[var(--accent-brand)]',
    'border-blue-400/50 bg-blue-500/10 text-blue-700 dark:text-blue-300',
    'border-amber-400/50 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    'border-purple-400/50 bg-purple-500/10 text-purple-700 dark:text-purple-300',
  ];
  const catColorMap: Record<string, string> = {};
  categories.forEach((cat, i) => { catColorMap[cat] = catColors[i % catColors.length]; });

  const assign = (itemId: string, cat: string) => {
    if (disabled) return;
    const next = { ...userMap };
    if (next[itemId] === cat) { delete next[itemId]; }
    else { next[itemId] = cat; }
    onChange({ kind: 'matching', value: next });
  };

  if (!items.length || !categories.length) {
    return <p className="text-sm text-muted-foreground">Categorization data not available.</p>;
  }

  return (
    <div className="space-y-2.5">
      {isCauseEffect ? (
        <p className="text-[12px] text-muted-foreground">Classify each item as a Cause or an Effect in this chain.</p>
      ) : (
        <p className="text-[12px] text-muted-foreground">Assign each item to the correct category.</p>
      )}
      {items.map((item) => {
        const assigned = userMap[item.id];
        return (
          <div
            key={item.id}
            className={`rounded-xl border px-3 py-2.5 transition-all ${
              assigned ? `${catColorMap[assigned] ?? 'border-border bg-muted/20'} border` : 'border-border bg-muted/20'
            }`}
          >
            <p className="mb-2 text-[13px] text-foreground leading-snug">{item.text}</p>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat, catIdx) => {
                const label = isCauseEffect
                  ? (catIdx === 0 ? `⟶ ${cat}` : `${cat} ⟶`)
                  : cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    disabled={disabled}
                    onClick={() => assign(item.id, cat)}
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-all ${
                      assigned === cat
                        ? catColorMap[cat] ?? 'border-[var(--accent-brand)] bg-[var(--accent-brand)]/10 text-[var(--accent-brand)]'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted/60'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Venn Diagram ─────────────────────────────────────────────────────────────
// Click-to-assign items to Venn zones.
function VennQuestion({ question, answer, disabled, onChange }: {
  question: QuizQuestion; answer?: AnswerValue; disabled: boolean; onChange: (v: AnswerValue) => void;
}) {
  const circles = (question as any).vennCircles as Array<{ id: string; label: string }> || [];
  const items = (question as any).vennItems as Array<{ id: string; text: string; correctZone: string }> || [];
  const userMap: Record<string, string> = answer?.kind === 'matching' ? answer.value : {};

  // Build zone list from circles
  const zones: { id: string; label: string }[] = [];
  if (circles.length === 2) {
    const [A, B] = circles;
    zones.push(
      { id: A.id, label: `Only ${A.label}` },
      { id: B.id, label: `Only ${B.label}` },
      { id: `${A.id}${B.id}`, label: `${A.label} & ${B.label}` },
      { id: 'outside', label: 'Neither' },
    );
  } else if (circles.length >= 3) {
    const [A, B, C] = circles;
    zones.push(
      { id: A.id, label: `Only ${A.label}` },
      { id: B.id, label: `Only ${B.label}` },
      { id: C.id, label: `Only ${C.label}` },
      { id: `${A.id}${B.id}`, label: `${A.label} & ${B.label}` },
      { id: `${B.id}${C.id}`, label: `${B.label} & ${C.label}` },
      { id: `${A.id}${C.id}`, label: `${A.label} & ${C.label}` },
      { id: `${A.id}${B.id}${C.id}`, label: 'All three' },
      { id: 'outside', label: 'Outside all' },
    );
  }

  const circleStyle = [
    'border-[var(--accent-brand)]/50 bg-[var(--accent-brand)]/8 text-[var(--accent-brand)]',
    'border-blue-400/50 bg-blue-500/8 text-blue-700 dark:text-blue-300',
    'border-amber-400/50 bg-amber-500/8 text-amber-700 dark:text-amber-300',
  ];
  const zoneColors = [
    'border-[var(--accent-brand)]/50 bg-[var(--accent-brand)]/10 text-[var(--accent-brand)]',
    'border-blue-400/50 bg-blue-500/10 text-blue-700 dark:text-blue-300',
    'border-amber-400/50 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    'border-purple-400/40 bg-purple-500/8 text-purple-700 dark:text-purple-300',
    'border-teal-400/40 bg-teal-500/8 text-teal-700 dark:text-teal-300',
    'border-rose-400/40 bg-rose-500/8 text-rose-700 dark:text-rose-300',
    'border-indigo-400/40 bg-indigo-500/8 text-indigo-700 dark:text-indigo-300',
    'border-border bg-muted/30 text-muted-foreground',
  ];
  const zoneColorMap: Record<string, string> = {};
  zones.forEach((z, i) => { zoneColorMap[z.id] = zoneColors[i % zoneColors.length]; });

  const assign = (itemId: string, zoneId: string) => {
    if (disabled) return;
    const next = { ...userMap };
    if (next[itemId] === zoneId) { delete next[itemId]; } else { next[itemId] = zoneId; }
    onChange({ kind: 'matching', value: next });
  };

  if (!circles.length || !items.length) {
    return <p className="text-sm text-muted-foreground">Venn diagram data not available.</p>;
  }

  return (
    <div className="space-y-4">
      {/* Decorative Venn visual */}
      <div className="flex items-center justify-center py-1">
        {circles.slice(0, 3).map((circle, i) => (
          <div
            key={circle.id}
            className={`flex h-20 w-20 items-center justify-center rounded-full border-2 text-center ${
              i > 0 ? '-ml-5' : ''
            } ${circleStyle[i % circleStyle.length]}`}
          >
            <span className="px-1 text-[10px] font-semibold leading-tight">
              {circle.label.length > 8 ? circle.label.slice(0, 7) + '…' : circle.label}
            </span>
          </div>
        ))}
      </div>

      {/* Item assignment */}
      <div className="space-y-2.5">
        {items.map((item) => {
          const assignedZone = userMap[item.id];
          return (
            <div
              key={item.id}
              className={`rounded-xl border px-3 py-2.5 transition-all ${
                assignedZone ? `${zoneColorMap[assignedZone] ?? 'border-border bg-muted/20'} border` : 'border-border bg-muted/20'
              }`}
            >
              <p className="mb-2 text-[13px] text-foreground">{item.text}</p>
              <div className="flex flex-wrap gap-1.5">
                {zones.map((zone) => (
                  <button
                    key={zone.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => assign(item.id, zone.id)}
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition-all ${
                      assignedZone === zone.id
                        ? zoneColorMap[zone.id] ?? 'border-border bg-muted text-foreground'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted/60'
                    }`}
                  >
                    {zone.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Spot the Error ───────────────────────────────────────────────────────────
// Clickable text segments — user clicks on the incorrect one.
function SpotErrorQuestion({ question, answer, disabled, onChange, reveal }: {
  question: QuizQuestion; answer?: AnswerValue; disabled: boolean; onChange: (v: AnswerValue) => void; reveal: boolean;
}) {
  const segments = (question as any).spotErrorSegments as Array<{ id: string; text: string; isError: boolean }> || [];
  const selected = answer?.kind === 'option' ? answer.value : '';

  if (!segments.length) {
    return <p className="text-sm text-muted-foreground">No segments provided for this question.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-[12px] text-muted-foreground">Click on the part of the statement that contains an error.</p>
      <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-muted/20 px-4 py-4">
        {segments.map((seg) => {
          const isSelected = selected === seg.id;
          let cls = 'rounded-lg border px-3 py-2 text-[13.5px] leading-snug cursor-pointer transition-all ';
          if (reveal) {
            if (seg.isError) cls += 'border-red-400 bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-200 font-medium ring-2 ring-red-300/50';
            else if (isSelected && !seg.isError) cls += 'border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 opacity-70';
            else cls += 'border-transparent bg-transparent text-foreground opacity-50';
          } else if (isSelected) {
            cls += 'border-[var(--accent-brand)] bg-[var(--accent-brand)]/10 text-foreground ring-2 ring-[var(--accent-brand)]/30';
          } else {
            cls += 'border-border bg-background text-foreground hover:border-[var(--accent-brand)]/40 hover:bg-[var(--accent-brand)]/5';
          }
          return (
            <button
              key={seg.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange({ kind: 'option', value: seg.id })}
              className={cls}
            >
              {seg.text}
            </button>
          );
        })}
      </div>
      {reveal && selected && (
        <p className={`text-[13px] font-medium ${segments.find((s) => s.id === selected)?.isError ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
          {segments.find((s) => s.id === selected)?.isError
            ? 'Correct — you found the error!'
            : `Incorrect. The error was: "${segments.find((s) => s.isError)?.text}"`}
        </p>
      )}
    </div>
  );
}

// ─── Scenario / Case Study ────────────────────────────────────────────────────
// Renders a scenario context block, then MCQ below it.
function ScenarioQuestion({ question, answer, disabled, onChange, reveal, correctOptionId }: {
  question: QuizQuestion; answer?: AnswerValue; disabled: boolean;
  onChange: (v: AnswerValue) => void; reveal: boolean; correctOptionId: string;
}) {
  const [showFull, setShowFull] = useState(false);
  const context = question.scenarioContext || '';
  const truncated = context.length > 320 && !showFull;

  return (
    <div className="space-y-4">
      {/* Scenario context */}
      {context ? (
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3.5 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Scenario</p>
          <p className="text-[13px] leading-relaxed text-foreground">
            {truncated ? `${context.slice(0, 320)}…` : context}
          </p>
          {context.length > 320 && (
            <button
              type="button"
              onClick={() => setShowFull((p) => !p)}
              className="text-[11px] text-[var(--accent-brand)] underline underline-offset-2"
            >
              {showFull ? 'Show less' : 'Read full scenario'}
            </button>
          )}
        </div>
      ) : null}
      {/* MCQ options */}
      <MCQRadioList
        question={question}
        answer={answer}
        disabled={disabled}
        onChange={onChange}
        reveal={reveal}
        correctOptionId={correctOptionId}
      />
    </div>
  );
}

function QuestionView({
  question,
  answer,
  disabled,
  onChange,
  reveal,
  knowledgeScore,
}: {
  question: QuizQuestion;
  answer: AnswerValue | undefined;
  disabled: boolean;
  onChange: (next: AnswerValue) => void;
  reveal: boolean;
  knowledgeScore?: number;
}) {
  const type = question.type || 'multiple-choice';
  const ks = knowledgeScore ?? 50;

  const correctOptionId =
    question.options.find((option) => option.isCorrect)?.id ||
    question.correctOptionId ||
    '';

  // ─── Timeline (ordering sort variant when orderingItems present) ─────────────
  if (type === 'timeline' && (question.orderingItems?.length ?? 0) >= 2) {
    const variant = selectVariant(question.id, ks, 2);
    if (variant === 0) return <OrderingClickNumber question={question} answer={answer} disabled={disabled} onChange={onChange} />;
    return <OrderingDragHandles question={question} answer={answer} disabled={disabled} onChange={onChange} />;
  }

  // ─── MCQ / True-False / timeline / media types (option-based) ───────────────
  if (['multiple-choice', 'image-analysis', 'video-analysis', 'drawing-analysis', 'internet-photo', 'video-fragment', 'timeline'].includes(type)) {
    const variant = selectVariant(question.id, ks, 3);
    if (variant === 2) return <MCQColorBlocks question={question} answer={answer} disabled={disabled} onChange={onChange} reveal={reveal} correctOptionId={correctOptionId} />;
    if (variant === 1) return <MCQRadioList question={question} answer={answer} disabled={disabled} onChange={onChange} reveal={reveal} correctOptionId={correctOptionId} />;
    return <MCQCardGrid question={question} answer={answer} disabled={disabled} onChange={onChange} reveal={reveal} correctOptionId={correctOptionId} />;
  }

  // ─── True/False ──────────────────────────────────────────────────────────────
  if (type === 'true-false') {
    return <TFBigButtons answer={answer} disabled={disabled} onChange={onChange} reveal={reveal} correctOptionId={correctOptionId} options={question.options} />;
  }

  // ─── Fill in the Blank ───────────────────────────────────────────────────────
  if (type === 'fill-blank') {
    const blank = question.question.match(/_{3,}/);
    if (blank) {
      const [before, after] = question.question.split(blank[0], 2);
      return (
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-4 text-[14px] leading-loose text-foreground">
          {before}
          <Input
            autoFocus
            value={answer?.kind === 'text' ? answer.value : ''}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => onChange({ kind: 'text', value: e.target.value })}
            disabled={disabled}
            className="mx-2 inline-flex h-9 w-48 rounded-md border border-border bg-background px-3 align-middle text-[13px]"
            placeholder="..."
          />
          {after}
        </div>
      );
    }
    return (
      <Input
        autoFocus
        value={answer?.kind === 'text' ? answer.value : ''}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => onChange({ kind: 'text', value: e.target.value })}
        disabled={disabled}
        className="h-11 rounded-lg border border-border bg-background px-4 text-[14px] text-foreground"
        placeholder="Fill in the blank..."
      />
    );
  }

  // ─── Short Answer ────────────────────────────────────────────────────────────
  if (type === 'short-answer') {
    const hint = question.hint?.trim();
    return (
      <div className="space-y-3">
        {hint ? (
          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-[12px] text-muted-foreground">
            <span className="font-medium text-foreground">Include: </span>{hint}
          </div>
        ) : null}
        <textarea
          autoFocus
          value={answer?.kind === 'text' ? answer.value : ''}
          onChange={(e) => onChange({ kind: 'text', value: e.target.value })}
          disabled={disabled}
          rows={3}
          className="w-full rounded-lg border border-border bg-background px-4 py-3 text-[13px] text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent-brand)]/40"
          placeholder="Type your answer..."
        />
      </div>
    );
  }

  // ─── Matching ────────────────────────────────────────────────────────────────
  if (type === 'matching') {
    const variant = selectVariant(question.id, ks, 2);
    if (variant === 0) return <MatchingClickPairs question={question} answer={answer} disabled={disabled} onChange={onChange} />;
    return <MatchingBoard question={question} answer={answer} disabled={disabled} onChange={onChange} />;
  }

  // ─── Ordering ────────────────────────────────────────────────────────────────
  if (type === 'ordering') {
    const variant = selectVariant(question.id, ks, 2);
    if (variant === 0) return <OrderingClickNumber question={question} answer={answer} disabled={disabled} onChange={onChange} />;
    return <OrderingDragHandles question={question} answer={answer} disabled={disabled} onChange={onChange} />;
  }

  // ─── Numeric input ───────────────────────────────────────────────────────────
  if (type === 'numeric') {
    return (
      <Input
        autoFocus
        type="number"
        value={answer?.kind === 'text' ? answer.value : ''}
        onChange={(e) => onChange({ kind: 'text', value: e.target.value })}
        disabled={disabled}
        className="h-11 w-40 rounded-lg border border-border bg-background px-4 text-[14px] text-foreground"
        placeholder="0"
      />
    );
  }

  // ─── Cloze test ──────────────────────────────────────────────────────────────
  if (type === 'cloze') {
    const hasWordBank = (question.clozeWordBank?.length ?? 0) > 0 || (question.acceptableAnswers?.length ?? 0) > 0;
    if (hasWordBank) return <ClozeWordBank question={question} answer={answer} disabled={disabled} onChange={onChange} />;
    return <ClozeOpen question={question} answer={answer} disabled={disabled} onChange={onChange} />;
  }

  // ─── Hotspot ─────────────────────────────────────────────────────────────────
  if (type === 'hotspot') {
    return <HotspotQuestion question={question} answer={answer} disabled={disabled} onChange={onChange} />;
  }

  // ─── Comparison Matrix ────────────────────────────────────────────────────────
  if (type === 'comparison-matrix') {
    return <ComparisonMatrix question={question} answer={answer} disabled={disabled} onChange={onChange} />;
  }

  // ─── Argument Analysis ────────────────────────────────────────────────────────
  if (type === 'argument-analysis') {
    return <ArgumentAnalysis question={question} answer={answer} disabled={disabled} onChange={onChange} />;
  }

  // ─── Scenario / Case Study ────────────────────────────────────────────────────
  if (type === 'scenario') {
    return <ScenarioQuestion question={question} answer={answer} disabled={disabled} onChange={onChange} reveal={reveal} correctOptionId={correctOptionId} />;
  }

  // ─── Ranking ──────────────────────────────────────────────────────────────────
  if (type === 'ranking') {
    return <RankingQuestion question={question} answer={answer} disabled={disabled} onChange={onChange} />;
  }

  // ─── Drag & Drop ──────────────────────────────────────────────────────────────
  if (type === 'drag-drop') {
    return <DragDropCategorize question={question} answer={answer} disabled={disabled} onChange={onChange} />;
  }

  // ─── Venn Diagram ─────────────────────────────────────────────────────────────
  if (type === 'venn') {
    return <VennQuestion question={question} answer={answer} disabled={disabled} onChange={onChange} />;
  }

  // ─── Spot the Error ───────────────────────────────────────────────────────────
  if (type === 'spot-error') {
    return <SpotErrorQuestion question={question} answer={answer} disabled={disabled} onChange={onChange} reveal={reveal} />;
  }

  // ─── Fallback: MCQ Radio List ─────────────────────────────────────────────────
  return <MCQRadioList question={question} answer={answer} disabled={disabled} onChange={onChange} reveal={reveal} correctOptionId={correctOptionId} />;
}
function MediaPrompt({ question }: { question: QuizQuestion }) {
  const media = question.media;
  const type = question.type || 'multiple-choice';
  if (!media || !media.url || !['image-analysis', 'video-analysis', 'drawing-analysis', 'internet-photo', 'video-fragment'].includes(type)) return null;
  const normalizeVideoUrl = (rawUrl: string, startSec?: number, endSec?: number) => {
    try {
      const parsed = new URL(rawUrl);
      const host = parsed.hostname.toLowerCase();
      const start = Number.isFinite(Number(startSec)) ? Math.max(0, Math.floor(Number(startSec))) : undefined;
      const end = Number.isFinite(Number(endSec)) ? Math.max(1, Math.floor(Number(endSec))) : undefined;
      if (host.includes('youtube.com') || host.includes('youtu.be')) {
        const videoId = host.includes('youtu.be')
          ? parsed.pathname.split('/').filter(Boolean)[0]
          : (parsed.searchParams.get('v') || parsed.pathname.match(/\/embed\/([^/?#]+)/)?.[1] || parsed.pathname.match(/\/shorts\/([^/?#]+)/)?.[1] || '');
        if (videoId) {
          const embed = new URL(`https://www.youtube.com/embed/${videoId}`);
          if (start !== undefined) embed.searchParams.set('start', String(start));
          if (end !== undefined) embed.searchParams.set('end', String(end));
          return embed.toString();
        }
      }
      if (start !== undefined) parsed.searchParams.set('start', String(start));
      if (end !== undefined) parsed.searchParams.set('end', String(end));
      return parsed.toString();
    } catch {
      return rawUrl;
    }
  };
  if (media.kind === 'video') {
    const withClip = normalizeVideoUrl(media.url, media.startSec, media.endSec);
    return (
      <div className="rounded-lg border border-border bg-background p-2.5">
        <div className="aspect-video w-full overflow-hidden rounded-md bg-muted">
          <iframe
            src={withClip}
            title={media.title || 'Video context'}
            className="h-full w-full border-0"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        {media.source ? (
          <p className="mt-1.5 text-xs text-muted-foreground">
            <a href={media.source} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
              {media.source}
            </a>
          </p>
        ) : null}
        {(Number.isFinite(Number(media.startSec)) || Number.isFinite(Number(media.endSec))) ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Clip: {Number.isFinite(Number(media.startSec)) ? `${Number(media.startSec)}s` : '0s'} - {Number.isFinite(Number(media.endSec)) ? `${Number(media.endSec)}s` : 'end'}
          </p>
        ) : null}
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-border bg-background p-2.5">
      <img src={media.url} alt={media.title || 'Question context'} className="max-h-[280px] w-full rounded-md object-contain bg-muted" />
      {media.source ? (
        <p className="mt-1.5 text-xs text-muted-foreground">
          <a href={media.source} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
            {media.source}
          </a>
        </p>
      ) : null}
    </div>
  );
}

function QuizResults({ quiz, answers, signals, sourceText, notRelevantIds }: { quiz: Quiz; answers: AnswerMap; signals: AdaptivePerformanceSignal[]; runtimeSettings?: QuizRuntimeSettings; sourceText: string; notRelevantIds?: Set<string> }) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [practiceCategory, setPracticeCategory] = useState<string | null>(null);
  const gradeStorageKey = `quiz.grade.format::${normalizeText(sourceText).slice(0, 96)}`;
  const analyticsSelectionKey = `quiz.analytics.selection.v1::${normalizeText(sourceText).slice(0, 160)}`;
  const [gradeFormat, setGradeFormat] = useState<'percent' | 'eu10' | 'usAF'>('percent');
  useEffect(() => {
    try {
      const raw = localStorage.getItem(gradeStorageKey);
      if (raw === 'percent' || raw === 'eu10' || raw === 'usAF') setGradeFormat(raw);
    } catch {}
  }, [gradeStorageKey]);
  useEffect(() => {
    try {
      localStorage.setItem(gradeStorageKey, gradeFormat);
    } catch {}
  }, [gradeFormat, gradeStorageKey]);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(analyticsSelectionKey);
      if (raw && Number.isFinite(Number(raw))) setSelectedIdx(Math.max(0, Number(raw)));
    } catch {}
  }, [analyticsSelectionKey]);
  useEffect(() => {
    try {
      sessionStorage.setItem(analyticsSelectionKey, String(selectedIdx));
    } catch {}
  }, [analyticsSelectionKey, selectedIdx]);

  const rows = useMemo(
    () =>
      quiz.questions.map((question, index) => {
        const answer = answers[question.id];
        const acc = getQuestionAccuracy(question, answer);
        const isNotRelevant = notRelevantIds?.has(question.id) ?? false;
        return {
          idx: index,
          id: question.id,
          question,
          answer,
          category: question.category || 'general',
          type: question.type || 'multiple-choice',
          difficulty: question.difficulty || 5,
          given: formatAnswer(question, answer),
          correctValue: getCorrectAnswerText(question),
          accuracy: acc.accuracy,
          partsCorrect: acc.partsCorrect,
          partsTotal: acc.partsTotal,
          correct: acc.correct,
          responseMs: Number(signals[index]?.responseMs || 0),
          isNotRelevant,
        };
      }),
    [answers, notRelevantIds, quiz.questions, signals]
  );

  // Exclude not-relevant questions from scoring
  const scoredRows = rows.filter((row) => !row.isNotRelevant);

  const selected = rows[Math.min(selectedIdx, Math.max(0, rows.length - 1))] || rows[0];
  const grouped = scoredRows.reduce<Record<string, { total: number; scoreSum: number }>>((acc, row) => {
    acc[row.category] = acc[row.category] || { total: 0, scoreSum: 0 };
    acc[row.category].total += 1;
    acc[row.category].scoreSum += row.accuracy;
    return acc;
  }, {});
  const categoryScores = Object.entries(grouped).map(([category, stat]) => ({ category, score: Math.round(stat.scoreSum / Math.max(1, stat.total)) }));
  const weak = [...categoryScores].sort((a, b) => a.score - b.score).slice(0, 3);
  const strong = [...categoryScores].sort((a, b) => b.score - a.score).slice(0, 3);
  const accuracyPct = scoredRows.length ? Math.round(scoredRows.reduce((acc, row) => acc + row.accuracy, 0) / scoredRows.length) : 0;
  const speedPct = scoreSpeed(signals);
  const progressionPct = scoreProgression(signals);
  const avgMs = signals.length ? Math.round(signals.reduce((acc, signal) => acc + Number(signal.responseMs || 0), 0) / signals.length) : 0;
  const notes = buildLearningNotes(scoredRows.map((row) => ({ category: row.category, accuracy: row.accuracy })), accuracyPct, speedPct);
  const notRelevantCount = rows.length - scoredRows.length;
  const gradeLabel = gradeFormat === 'percent' ? `${accuracyPct}%` : gradeFormat === 'eu10' ? (accuracyPct / 10).toFixed(1) : accuracyPct >= 90 ? 'A' : accuracyPct >= 80 ? 'B' : accuracyPct >= 70 ? 'C' : accuracyPct >= 60 ? 'D' : accuracyPct >= 50 ? 'E' : 'F';

  const openPracticeTool = (tool: 'quiz' | 'flashcards' | 'notes' | 'mindmap', category: string) => {
    const scoped = `${sourceText}\n\nFocus category: ${category}`;
    const path = tool === 'mindmap' ? '/tools/wordweb' : `/tools/${tool}`;
    window.location.href = `${path}?sourceText=${encodeURIComponent(scoped)}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quiz Analytics</CardTitle>
        <CardDescription>Interactive review of your answers</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-2.5">
            {notRelevantCount > 0 && (
              <p className="text-[12px] text-muted-foreground rounded-lg border border-border bg-muted/30 px-3 py-2">
                {notRelevantCount} question{notRelevantCount > 1 ? 's were' : ' was'} marked as Not Relevant and excluded from scoring.
              </p>
            )}
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-xs text-muted-foreground">Grade</p>
                <p className="text-lg font-semibold">{gradeLabel}</p>
                <select value={gradeFormat} onChange={(e) => setGradeFormat(e.target.value as 'percent' | 'eu10' | 'usAF')} className="mt-1 h-7 rounded border border-border bg-background px-2 text-[11px]">
                  <option value="percent">Percent</option>
                  <option value="eu10">EU 1-10</option>
                  <option value="usAF">US A-F</option>
                </select>
              </div>
              <div className="rounded-lg border border-border bg-background p-3"><p className="text-xs text-muted-foreground">Accuracy</p><p className="text-lg font-semibold">{accuracyPct}%</p></div>
              <div className="rounded-lg border border-border bg-background p-3"><p className="text-xs text-muted-foreground">Speed</p><p className="text-lg font-semibold">{speedPct}%</p><p className="text-[11px] text-muted-foreground">{avgMs > 0 ? `${(avgMs / 1000).toFixed(1)}s avg` : '-'}</p></div>
              <div className="rounded-lg border border-border bg-background p-3"><p className="text-xs text-muted-foreground">Progression</p><p className="text-lg font-semibold">{progressionPct}%</p></div>
            </div>

            <div className="rounded-lg border border-border bg-background p-2.5">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {rows.map((row) => (
                  <button key={row.id} type="button" onClick={() => setSelectedIdx(row.idx)} className={`rounded-full px-3 py-1 text-xs ${selected?.id === row.id ? 'bg-foreground text-background' : row.accuracy >= 100 ? 'border border-emerald-200 bg-emerald-50 text-emerald-700' : row.accuracy <= 0 ? 'border border-rose-200 bg-rose-50 text-rose-700' : 'border border-border bg-muted text-foreground'}`}>
                    Q{row.idx + 1}
                  </button>
                ))}
              </div>
              {selected ? (
                <div className="rounded-lg border border-border p-2.5">
                  <p className="mb-1 text-sm font-medium">{selected.question.question}</p>
                  <p className="mb-2 text-xs text-muted-foreground">Category: {selected.category} | Type: {selected.type} | Difficulty: {selected.difficulty} | Accuracy on this question: {selected.accuracy}%</p>
                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="rounded-md bg-muted/30 p-2"><p className="text-xs text-muted-foreground">Your answer</p><p className="text-sm">{selected.given}</p></div>
                    <div className="rounded-md bg-muted/30 p-2"><p className="text-xs text-muted-foreground">Correct answer</p><p className="text-sm">{selected.correctValue}</p></div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">Question parts: {selected.partsCorrect}/{selected.partsTotal} | Question speed: {selected.responseMs > 0 ? `${(selected.responseMs / 1000).toFixed(1)}s` : '-'}</div>
                  {selected.question.type === 'matching' ? (
                    <div className="mt-2 rounded-md bg-muted/20 p-2">
                      <p className="mb-1 text-xs text-muted-foreground">Matching breakdown</p>
                      <MatchingComparison question={selected.question} answer={selected.answer} />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-sm font-medium">Strong points</p>
                <div className="mt-2 space-y-1.5">{strong.map((entry) => <p key={entry.category} className="text-xs">{entry.category} <span className="text-muted-foreground">{entry.score}%</span></p>)}</div>
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-sm font-medium">Weak points</p>
                <div className="mt-2 space-y-1.5">{weak.map((entry) => <p key={entry.category} className="text-xs">{entry.category} <span className="text-muted-foreground">{entry.score}%</span></p>)}</div>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="mb-2 text-sm font-medium">Practice weak points</p>
              <div className="grid gap-2">{weak.map((entry) => <button key={entry.category} type="button" className="rounded-md border border-border bg-muted/40 px-3 py-2 text-left text-sm" onClick={() => setPracticeCategory(entry.category)}>{entry.category} ({entry.score}%)</button>)}</div>
            </div>
            {notes.length > 0 ? (
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-sm font-medium">Notes</p>
                <ul className="mt-2 list-disc pl-4 text-xs text-muted-foreground">{notes.map((note) => <li key={note}>{note}</li>)}</ul>
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>
      {practiceCategory ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-background p-4">
            <div className="mb-3 flex items-center justify-between"><p className="text-sm font-medium">Practice {practiceCategory}</p><Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setPracticeCategory(null)}>Close</Button></div>
            <div className="grid gap-2">
              <Button variant="outline" className="justify-start" onClick={() => openPracticeTool('quiz', practiceCategory)}>Quiz</Button>
              <Button variant="outline" className="justify-start" onClick={() => openPracticeTool('flashcards', practiceCategory)}>Flashcards</Button>
              <Button variant="outline" className="justify-start" onClick={() => openPracticeTool('notes', practiceCategory)}>Notes</Button>
              <Button variant="outline" className="justify-start" onClick={() => openPracticeTool('mindmap', practiceCategory)}>Mindmap</Button>
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

// ─── Question type helpers ────────────────────────────────────────────────────
function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'multiple-choice': 'Multiple Choice', 'true-false': 'True / False',
    'fill-blank': 'Fill in the Blank', 'short-answer': 'Short Answer',
    'matching': 'Matching', 'ordering': 'Ordering', 'cloze': 'Cloze Test',
    'comparison-matrix': 'Comparison', 'argument-analysis': 'Analysis',
    'scenario': 'Scenario', 'timeline': 'Timeline', 'ranking': 'Ranking',
    'drag-drop': 'Drag & Drop', 'venn': 'Venn Diagram', 'spot-error': 'Spot the Error',
  };
  return labels[type] || type.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function getTypePrompt(type: string): string {
  const prompts: Record<string, string> = {
    'multiple-choice': 'Select the correct answer.',
    'true-false': 'Is this statement true or false?',
    'fill-blank': 'Fill in the missing word or phrase.',
    'short-answer': 'Write your answer in your own words.',
    'matching': 'Match each item on the left with its correct pair on the right.',
    'ordering': 'Arrange the items in the correct order.',
    'cloze': 'Fill in the blanks in the passage below.',
    'comparison-matrix': 'Check which attributes apply to each item.',
    'argument-analysis': 'Tag each statement with its role in the argument.',
    'scenario': 'Read the scenario, then select the best answer.',
    'timeline': 'Place the events in chronological order.',
    'ranking': 'Rank the items from first to last based on the given criterion.',
    'drag-drop': 'Drag each item into the correct category.',
    'venn': 'Assign each item to the correct region of the diagram.',
    'spot-error': 'Click on the segment that contains the error.',
  };
  return prompts[type] || 'Answer the question below.';
}

export function QuizTaker({ quiz, mode, sourceText, onRestart, runtimeSettings, quizTitle, inputMode }: { quiz: Quiz; mode: QuizMode; sourceText: string; onRestart: () => void; runtimeSettings?: QuizRuntimeSettings; quizTitle?: string; inputMode?: 'literal' | 'research' }) {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<QuizQuestion[]>(quiz.questions || []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCurrentCorrect, setIsCurrentCorrect] = useState<boolean | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [adaptiveBuffer, setAdaptiveBuffer] = useState<QuizQuestion[]>([]);
  const [isAdaptiveLoading, setIsAdaptiveLoading] = useState(false);
  const [adaptiveSignals, setAdaptiveSignals] = useState<AdaptivePerformanceSignal[]>([]);
  const [questionStartedAt, setQuestionStartedAt] = useState<number>(() => Date.now());
  const [showWhy, setShowWhy] = useState(false);
  const [whyIncorrect, setWhyIncorrect] = useState('');
  const [whyIncorrectLoading, setWhyIncorrectLoading] = useState(false);
  const [finalizedMap, setFinalizedMap] = useState<Record<string, boolean>>({});
  const [lastAnsweredQuestionId, setLastAnsweredQuestionId] = useState<string | null>(null);
  const [navMode, setNavMode] = useState<'circles' | 'progress'>('circles');
  const [notRelevantIds, setNotRelevantIds] = useState<Set<string>>(new Set());

  const effectiveMode: 'classic' | 'assisted' | 'adaptive' = mode === 'practice' ? 'classic' : mode;
  const adaptiveCap = Math.max(1, Math.min(50, Number(runtimeSettings?.adaptiveCap || 50)));
  const selectedTypes = runtimeSettings?.questionTypes?.length ? runtimeSettings.questionTypes : ['multiple-choice'];
  const adaptiveStorageKey = getAdaptiveStorageKey(sourceText, selectedTypes);
  const sessionStorageKey = getSessionStorageKey(sourceText, effectiveMode);
  const shouldHideCorrectnessUntilEnd = runtimeSettings?.answerFeedback === 'end';

  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const canAdvance = Boolean(currentQuestion && currentAnswer);

  useEffect(() => {
    setQuestionStartedAt(Date.now());
    setShowWhy(false);
    setWhyIncorrect('');
  }, [currentIndex, currentQuestion?.id]);

  useEffect(() => {
    if (effectiveMode !== 'adaptive') return;
    try {
      const raw = localStorage.getItem(adaptiveStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed?.signals)) return;
      const restored = parsed.signals.filter((entry: unknown) => {
        if (typeof entry !== 'object' || entry === null) return false;
        const next = entry as Record<string, unknown>;
        return typeof next.category === 'string' && typeof next.isCorrect === 'boolean';
      }).slice(-40) as AdaptivePerformanceSignal[];
      if (restored.length > 0) setAdaptiveSignals((prev) => (prev.length > 0 ? prev : restored));
    } catch {}
  }, [adaptiveStorageKey, effectiveMode]);

  useEffect(() => {
    if (effectiveMode !== 'adaptive') return;
    try {
      localStorage.setItem(adaptiveStorageKey, JSON.stringify({ updatedAt: Date.now(), signals: adaptiveSignals.slice(-40) }));
    } catch {}
  }, [adaptiveSignals, adaptiveStorageKey, effectiveMode]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(sessionStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.questions) && parsed.questions.length > 0) setQuestions(parsed.questions);
      if (parsed?.answers && typeof parsed.answers === 'object') setAnswers(parsed.answers);
      if (parsed?.finalizedMap && typeof parsed.finalizedMap === 'object') setFinalizedMap(parsed.finalizedMap);
      if (Number.isFinite(parsed?.currentIndex)) setCurrentIndex(Math.max(0, Number(parsed.currentIndex)));
      if (typeof parsed?.isFinished === 'boolean') setIsFinished(parsed.isFinished);
      if (Array.isArray(parsed?.adaptiveSignals)) setAdaptiveSignals(parsed.adaptiveSignals.slice(-40));
      if (typeof parsed?.isAnswered === 'boolean') setIsAnswered(parsed.isAnswered);
      if (typeof parsed?.isCurrentCorrect === 'boolean' || parsed?.isCurrentCorrect === null) setIsCurrentCorrect(parsed.isCurrentCorrect ?? null);
      if (typeof parsed?.lastAnsweredQuestionId === 'string' || parsed?.lastAnsweredQuestionId === null) setLastAnsweredQuestionId(parsed.lastAnsweredQuestionId ?? null);
    } catch {}
  }, [sessionStorageKey]);

  useEffect(() => {
    try {
      sessionStorage.setItem(sessionStorageKey, JSON.stringify({ currentIndex, answers, finalizedMap, isFinished, questions, adaptiveSignals, isAnswered, isCurrentCorrect, lastAnsweredQuestionId }));
    } catch {}
  }, [sessionStorageKey, currentIndex, answers, finalizedMap, isFinished, questions, adaptiveSignals, isAnswered, isCurrentCorrect, lastAnsweredQuestionId]);

  const ensureAdaptiveBuffer = useCallback(async () => {
    if (effectiveMode !== 'adaptive' || isAdaptiveLoading) return;
    const knownIds = new Set<string>([...questions.map((q) => q.id), ...adaptiveBuffer.map((q) => q.id)]);
    if (knownIds.size >= adaptiveCap || adaptiveBuffer.length >= 6) return;
    setIsAdaptiveLoading(true);
    try {
      const requested = Math.min(10, Math.max(4, adaptiveCap - knownIds.size));
      const categoryWeights = adaptiveSignals.reduce<Record<string, number>>((acc, signal) => {
        acc[signal.category] = Number((acc[signal.category] || 0) + (signal.isCorrect ? -0.2 : 0.8));
        return acc;
      }, {});
      const response = await fetch('/api/ai/handle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flowName: 'generateQuiz',
          input: {
            sourceText,
            questionCount: requested,
            quizMode: 'adaptive',
            questionTypes: selectedTypes,
            feedbackTiming: runtimeSettings?.answerFeedback || 'immediate',
            gradingModes: runtimeSettings?.gradingModes || ['accuracy'],
            knowledgeScore: runtimeSettings?.knowledgeScore || 50,
            adaptiveProfile: { cap: adaptiveCap, recentAnswers: adaptiveSignals.slice(-18), categoryWeights },
            existingQuestionIds: Array.from(knownIds),
          },
        }),
      });
      if (!response.ok) throw new Error('Adaptive generation request failed');
      const payload = await response.json();
      const nextQuestions = Array.isArray(payload?.questions) ? payload.questions : [];
      const cleaned = nextQuestions.filter((q: QuizQuestion) => q?.id && !knownIds.has(q.id));
      if (cleaned.length > 0) setAdaptiveBuffer((prev) => [...prev, ...cleaned].slice(0, 20));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not load next questions.';
      toast({ variant: 'destructive', title: 'Adaptive update failed', description: message });
    } finally {
      setIsAdaptiveLoading(false);
    }
  }, [adaptiveBuffer, adaptiveCap, adaptiveSignals, effectiveMode, isAdaptiveLoading, questions, runtimeSettings?.answerFeedback, runtimeSettings?.gradingModes, runtimeSettings?.knowledgeScore, selectedTypes, sourceText, toast]);

  useEffect(() => { if (effectiveMode === 'adaptive') void ensureAdaptiveBuffer(); }, [effectiveMode, ensureAdaptiveBuffer]);

  const handleSetAnswer = (next: AnswerValue) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: next }));
    if (effectiveMode === 'assisted') {
      setIsAnswered(false);
      setIsCurrentCorrect(null);
    }
  };

  const handleAnswerPress = () => {
    if (!currentQuestion || !currentAnswer) return;
    const acc = getQuestionAccuracy(currentQuestion, currentAnswer);
    setIsAnswered(true);
    setIsCurrentCorrect(acc.correct);
    setLastAnsweredQuestionId(currentQuestion.id);
    setFinalizedMap((prev) => ({ ...prev, [currentQuestion.id]: true }));
    setAdaptiveSignals((prev) => [...prev, { category: currentQuestion.category || 'general', isCorrect: acc.correct, difficulty: currentQuestion.difficulty, responseMs: Math.max(0, Date.now() - questionStartedAt) }].slice(-40));
    if (effectiveMode === 'adaptive') void ensureAdaptiveBuffer();
  };

  const loadWhyIncorrect = async () => {
    if (!currentQuestion || !currentAnswer || isCurrentCorrect !== false || whyIncorrectLoading || whyIncorrect) return;
    setWhyIncorrectLoading(true);
    try {
      const response = await fetch('/api/ai/handle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flowName: 'explainAnswer',
          model: 'gpt-5.4-mini',
          input: {
            question: currentQuestion.question,
            userAnswer: formatAnswer(currentQuestion, currentAnswer),
            correctAnswer: getCorrectAnswerText(currentQuestion),
            isCorrect: false,
            sourceText,
          },
        }),
      });
      if (!response.ok) throw new Error('Could not generate explanation');
      const payload = await response.json();
      setWhyIncorrect(String(payload?.explanation || payload?.output?.explanation || 'Your answer does not match the source-backed answer.').trim());
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not generate explanation now.';
      setWhyIncorrect(message);
    } finally {
      setWhyIncorrectLoading(false);
    }
  };

  const advanceQuestion = () => {
    if (!currentQuestion) return;
    if (effectiveMode === 'adaptive') {
      if (currentIndex >= questions.length - 1) {
        if (adaptiveBuffer.length > 0) {
          const [next, ...rest] = adaptiveBuffer;
          setQuestions((prev) => [...prev, next].slice(0, adaptiveCap));
          setAdaptiveBuffer(rest);
          setCurrentIndex((prev) => prev + 1);
          setIsAnswered(false);
          setIsCurrentCorrect(null);
          void ensureAdaptiveBuffer();
          return;
        }
        void ensureAdaptiveBuffer();
        return;
      }
      setCurrentIndex((prev) => prev + 1);
      setIsAnswered(false);
      setIsCurrentCorrect(null);
      if (questions.length - (currentIndex + 1) <= 3) void ensureAdaptiveBuffer();
      return;
    }
    if (currentIndex >= questions.length - 1) { setIsFinished(true); return; }
    setCurrentIndex((prev) => prev + 1);
    setIsAnswered(false);
    setIsCurrentCorrect(null);
  };

  if (isFinished) return <QuizResults quiz={{ ...quiz, questions }} answers={answers} signals={adaptiveSignals} runtimeSettings={runtimeSettings} sourceText={sourceText} notRelevantIds={notRelevantIds} />;
  if (!currentQuestion) return <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const revealCurrent = !shouldHideCorrectnessUntilEnd && finalizedMap[currentQuestion.id] === true;
  const progressPct = Math.round(((currentIndex + 1) / Math.max(1, questions.length)) * 100);
  const isLastQuestion = effectiveMode !== 'adaptive' && currentIndex >= questions.length - 1;

  const handleNext = () => {
    if (effectiveMode === 'assisted' && !isAnswered) {
      if (canAdvance) handleAnswerPress();
      else advanceQuestion();
      return;
    }
    if (!isAnswered && canAdvance) {
      handleAnswerPress();
      if (shouldHideCorrectnessUntilEnd) advanceQuestion();
      return;
    }
    advanceQuestion();
  };

  const handlePrevious = () => {
    if (currentIndex <= 0) return;
    const prevIdx = currentIndex - 1;
    setCurrentIndex(prevIdx);
    setIsAnswered(Boolean(finalizedMap[questions[prevIdx]?.id || '']));
    setIsCurrentCorrect(null);
  };

  const handleJumpTo = (idx: number) => {
    setCurrentIndex(idx);
    setIsAnswered(Boolean(finalizedMap[questions[idx]?.id || '']));
    setIsCurrentCorrect(null);
  };

  // Circle state per question
  const getCircleState = (idx: number): 'current' | 'answered' | 'not-relevant' | 'unanswered' => {
    if (idx === currentIndex) return 'current';
    const q = questions[idx];
    if (q && notRelevantIds.has(q.id)) return 'not-relevant';
    if (q && finalizedMap[q.id]) return 'answered';
    return 'unanswered';
  };

  const handleNotRelevant = () => {
    if (!currentQuestion) return;
    setNotRelevantIds((prev) => { const next = new Set(prev); next.add(currentQuestion.id); return next; });
    advanceQuestion();
  };

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Top bar: breadcrumb left | nav right */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-3">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <span className="font-medium text-foreground">Quiz</span>
          {quizTitle ? (
            <>
              <span>/</span>
              <span className="max-w-[200px] truncate">{quizTitle}</span>
            </>
          ) : null}
        </div>

        {/* Right: circles or progress bar + toggle */}
        <div className="flex items-center gap-3">
          {navMode === 'circles' ? (
            <div className="flex items-center gap-1 flex-wrap justify-end max-w-[360px]">
              {questions.map((_, idx) => {
                const state = getCircleState(idx);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleJumpTo(idx)}
                    title={`Question ${idx + 1}`}
                    className={[
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-medium transition-all',
                      state === 'current'
                        ? 'bg-[var(--accent-brand)] text-white ring-2 ring-[var(--accent-brand)] ring-offset-1 ring-offset-background'
                        : state === 'answered'
                        ? 'bg-[var(--accent-brand)]/20 text-[var(--accent-brand)] border border-[var(--accent-brand)]/40'
                        : state === 'not-relevant'
                        ? 'border border-border bg-muted text-muted-foreground/30 line-through'
                        : 'border border-border bg-muted text-muted-foreground hover:border-[var(--accent-brand)]/50',
                    ].join(' ')}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          ) : (
            <span className="text-[13px] text-muted-foreground">
              Question <span className="font-semibold text-foreground">{currentIndex + 1}</span> of {questions.length}
            </span>
          )}

          {/* Toggle button */}
          <button
            type="button"
            onClick={() => setNavMode((prev) => (prev === 'circles' ? 'progress' : 'circles'))}
            title={navMode === 'circles' ? 'Switch to progress view' : 'Switch to circle view'}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
          >
            {navMode === 'circles' ? (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="6" width="12" height="2" rx="1" fill="currentColor" />
                <rect x="1" y="2" width="8" height="2" rx="1" fill="currentColor" opacity="0.5" />
                <rect x="1" y="10" width="5" height="2" rx="1" fill="currentColor" opacity="0.3" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="3" cy="7" r="2" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="11" cy="7" r="2" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Progress bar (slim, always visible) */}
      <div className="h-[2px] w-full shrink-0 bg-muted">
        <div
          className="h-full bg-[var(--accent-brand)] transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Scrollable question area */}
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-[680px] px-8 pt-8 pb-24">

          {/* Question header: number + type badge */}
          <div className="mb-3 flex items-center gap-2">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
              Question {currentIndex + 1}
            </span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
            <span className="rounded-full bg-[var(--accent-brand)]/12 px-2 py-0.5 text-[10px] font-semibold text-[var(--accent-brand)]">
              {getTypeLabel(currentQuestion.type)}
            </span>
          </div>

          {/* Question text */}
          <p className="mb-3 text-[15.5px] font-semibold leading-[1.7] text-foreground">
            {currentQuestion.question.replace(/_{3,}/g, '____')}
          </p>

          {/* Sub-prompt */}
          <p className="mb-6 text-[12px] text-muted-foreground">
            {getTypePrompt(currentQuestion.type)}
          </p>

          {/* Media */}
          <MediaPrompt question={currentQuestion} />

          {/* Answer area */}
          <div className="mb-6">
            <QuestionView
              question={currentQuestion}
              answer={currentAnswer}
              disabled={effectiveMode !== 'classic' && isAnswered}
              onChange={handleSetAnswer}
              reveal={revealCurrent}
              knowledgeScore={runtimeSettings?.knowledgeScore ?? 50}
            />
          </div>

          {/* ── Feedback panel ── */}
          {effectiveMode !== 'classic' && isAnswered && revealCurrent && lastAnsweredQuestionId === currentQuestion.id ? (
            <div className={`rounded-xl border overflow-hidden ${isCurrentCorrect ? 'border-emerald-200 dark:border-emerald-800' : 'border-red-200 dark:border-red-800'}`}>
              {/* Header strip */}
              <div className={`flex items-center gap-2 px-4 py-2 ${isCurrentCorrect ? 'bg-emerald-50 dark:bg-emerald-900/25' : 'bg-red-50 dark:bg-red-900/25'}`}>
                <span className={`text-[12.5px] font-semibold ${isCurrentCorrect ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-600 dark:text-red-400'}`}>
                  {isCurrentCorrect ? '✓ Correct' : '✗ Incorrect'}
                </span>
              </div>

              {/* Answer comparison */}
              <div className="px-4 py-3 bg-background/50">
                <div className={`grid gap-3 ${isCurrentCorrect ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Your answer</p>
                    <p className={`text-[13px] font-medium ${isCurrentCorrect ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-600 dark:text-red-400'}`}>
                      {formatAnswer(currentQuestion, currentAnswer)}
                    </p>
                  </div>
                  {!isCurrentCorrect && (
                    <div>
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Correct answer</p>
                      <p className="text-[13px] font-medium text-emerald-700 dark:text-emerald-300">
                        {getCorrectAnswerText(currentQuestion)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Explanation body */}
                {showWhy ? (
                  <div className="mt-3 rounded-lg border border-border/50 bg-muted/30 px-3 py-2.5">
                    {whyIncorrectLoading && !whyIncorrect && !currentQuestion.explanation?.trim() ? (
                      <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Generating explanation…
                      </div>
                    ) : (
                      <p className="text-[12.5px] leading-relaxed text-foreground/80">
                        {currentQuestion.explanation?.trim() || whyIncorrect || ''}
                      </p>
                    )}
                  </div>
                ) : null}

                {/* Explain button */}
                <button
                  type="button"
                  className="mt-3 text-[11.5px] font-medium text-[var(--accent-brand)] hover:underline underline-offset-2 transition-colors"
                  onClick={() => {
                    const next = !showWhy;
                    setShowWhy(next);
                    if (next && !currentQuestion.explanation?.trim() && !whyIncorrect && !whyIncorrectLoading) {
                      void loadWhyIncorrect();
                    }
                  }}
                >
                  {showWhy ? 'Hide explanation' : 'Show explanation'}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* ── Bottom nav ── full width, buttons at edges */}
      <div className="shrink-0 border-t border-border bg-background px-5 py-3.5">
        <div className="flex items-center justify-between gap-3">

          {/* Previous */}
          <Button
            type="button"
            variant="outline"
            className="relative h-10 ps-11 pe-5 text-[13px]"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
          >
            Previous
            <span className="pointer-events-none absolute inset-y-0 start-0 flex w-9 items-center justify-center rounded-l-lg bg-foreground/[0.06]">
              <ChevronLeft size={16} strokeWidth={2} className="opacity-50" aria-hidden="true" />
            </span>
          </Button>

          {/* Center: not-relevant */}
          <div className="flex items-center gap-2">
            {inputMode === 'research' && !notRelevantIds.has(currentQuestion.id) && (
              <Button
                type="button"
                variant="ghost"
                className="h-9 px-3 text-[12px] text-muted-foreground hover:text-foreground"
                onClick={handleNotRelevant}
                title="Mark as not relevant to your research"
              >
                Not relevant
              </Button>
            )}
          </div>

          {/* Next / Finish */}
          <Button
            type="button"
            onClick={handleNext}
            className="relative h-10 ps-5 pe-11 text-[13px] font-medium bg-[var(--accent-brand)] text-white hover:opacity-90"
          >
            {isLastQuestion ? 'Finish Quiz' : 'Next'}
            <span className="pointer-events-none absolute inset-y-0 end-0 flex w-9 items-center justify-center rounded-r-lg bg-primary-foreground/15">
              <ChevronRight size={16} strokeWidth={2} className="opacity-70" aria-hidden="true" />
            </span>
          </Button>

        </div>
      </div>
    </div>
  );
}


