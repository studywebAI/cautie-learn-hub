'use client';

import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, Lightbulb } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';
import type { Quiz, QuizQuestion } from '@/lib/types';
import { AppContext } from '@/contexts/app-context';
import { SourcesPill, SourcesSidebar } from '@/components/tools/sources-panel';

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
        let cls = 'border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-card hover:border-[var(--accent-brand)]/40 hover:bg-[var(--accent-brand)]/[0.04] text-foreground';
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
            className={`flex min-h-[110px] items-center justify-center rounded-xl px-6 py-6 text-center text-[15px] ${cls}`}
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
        let cls = 'border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-card hover:border-[var(--accent-brand)]/50 hover:bg-[var(--accent-brand)]/[0.04]';
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
            className={`flex w-full items-center gap-3 rounded-lg px-6 py-5 text-left ${cls}`}
          >
            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${selected ? 'border-[var(--accent-brand)] bg-[var(--accent-brand)]' : 'border-muted-foreground/40'}`}>
              {selected && <span className="h-2 w-2 rounded-full bg-white" />}
            </span>
            <span className="text-[15px] text-foreground">{cleanOptionText(option.text)}</span>
          </button>
        );
      })}
    </div>
  );
}

// Variant C: Color Blocks — neutral tones (no rainbow)
const BRAND_TONES = [
  'bg-zinc-700 text-white',
  'bg-zinc-500 text-white',
  'bg-zinc-300 text-foreground',
  'bg-zinc-200 text-foreground',
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
            className={`flex min-h-[110px] items-center justify-center rounded-xl px-6 py-6 text-center text-[15px] ${cls} ${disabled && !selected ? 'opacity-70' : 'opacity-100'}`}
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
            className={`flex min-h-[100px] flex-col items-center justify-center gap-2 rounded-xl text-[23px] ${cls}`}
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
  // Keyed by stable origin index rather than item text, so duplicate-text
  // items don't collide as React keys and cause rendering glitches.
  const itemsWithId = useMemo(() => items.map((text, id) => ({ id, text })), [items]);

  const idsFromTexts = (texts: string[]) => {
    const pool = itemsWithId.map((it) => it.id);
    return texts.map((text) => {
      const idx = pool.findIndex((id) => itemsWithId[id].text === text);
      if (idx === -1) return pool[0];
      return pool.splice(idx, 1)[0];
    });
  };

  const current: number[] = answer?.kind === 'ordering' && answer.value.length === itemsWithId.length
    ? idsFromTexts(answer.value)
    : itemsWithId.map((it) => it.id);

  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [overId, setOverId] = useState<number | null>(null);
  const [touchDragId, setTouchDragId] = useState<number | null>(null);

  // Live preview: reflects the in-progress drag before it's dropped, so siblings
  // visibly reflow while dragging instead of only updating on release.
  const reorder = (from: number, to: number) => {
    const next = current.filter((i) => i !== from);
    const pos = next.indexOf(to);
    next.splice(pos, 0, from);
    return next;
  };

  const displayIds = draggingId !== null && overId !== null && draggingId !== overId
    ? reorder(draggingId, overId)
    : current;

  const commitDrop = (target: number | null, from: number | null) => {
    if (from !== null && target !== null && from !== target) {
      onChange({ kind: 'ordering', value: reorder(from, target).map((id) => itemsWithId[id].text) });
    }
    setDraggingId(null);
    setOverId(null);
  };

  return (
    <div className="space-y-3">
      {displayIds.map((id, idx) => {
        const item = itemsWithId[id].text;
        return (
          <div
            key={id}
            data-order-item={id}
            draggable={!disabled}
            onDragStart={() => { setDraggingId(id); setOverId(id); }}
            onDragOver={(e) => { e.preventDefault(); if (draggingId !== null) setOverId(id); }}
            onDrop={() => commitDrop(overId ?? id, draggingId)}
            onDragEnd={() => { setDraggingId(null); setOverId(null); }}
            onTouchStart={(e) => {
              if (disabled) return;
              e.stopPropagation();
              setTouchDragId(id);
              setDraggingId(id);
              setOverId(id);
            }}
            onTouchMove={(e) => {
              if (touchDragId === null) return;
              const touch = e.touches[0];
              const el = document.elementFromPoint(touch.clientX, touch.clientY);
              const target = el?.closest('[data-order-item]');
              const overTouchId = target ? Number(target.getAttribute('data-order-item')) : null;
              if (overTouchId !== null && !Number.isNaN(overTouchId)) setOverId(overTouchId);
            }}
            onTouchEnd={() => {
              commitDrop(overId ?? touchDragId, touchDragId);
              setTouchDragId(null);
            }}
            className={[
              'flex items-center gap-4 rounded-lg border border-border bg-background px-4 py-4 select-none transition-all',
              disabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing',
              draggingId === id ? 'opacity-50 scale-[0.98]' : '',
              overId === id && draggingId !== null ? 'bg-[var(--accent-brand)]/5 border-[var(--accent-brand)]/30' : '',
            ].join(' ')}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[13px] leading-none text-foreground">
              {idx + 1}
            </span>
            <svg className="h-5 w-5 shrink-0 text-muted-foreground/50" viewBox="0 0 16 16" fill="currentColor">
              <path d="M5 4a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm6 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm6 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM5 16a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm6 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/>
            </svg>
            <span className="text-[15px] text-foreground">{item}</span>
          </div>
        );
      })}
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
            className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3.5 text-left transition-all ${
              pos ? 'border-[var(--accent-brand)]/40 bg-[var(--accent-brand)]/8' : 'border-border bg-background hover:border-[var(--accent-brand)]/30'
            }`}
          >
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] leading-none transition-all ${
              pos ? 'bg-[var(--accent-brand)] text-white' : 'border-2 border-dashed border-muted-foreground/30 text-muted-foreground'
            }`}>
              {pos || '?'}
            </span>
            <span className="text-[14px] text-foreground">{item}</span>
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
        <p className="mb-1 text-[11px] font-medium text-muted-foreground">Match from</p>
        {leftOrder.map((left) => {
          const isMatched = !!mapping[left];
          const isSelected = selectedLeft === left;
          const colorCls = isMatched ? getColorForLeft(left) : '';
          return (
            <button
              key={left}
              type="button"
              onClick={() => handleLeftClick(left)}
              className={`flex w-full items-center gap-2 rounded-lg border px-4 py-3 text-left text-[14px] transition-all ${
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
        <p className="mb-1 text-[11px] font-medium text-muted-foreground">Match to</p>
        {rightValues.map((right) => {
          const isMatched = !!getColorForRight(right);
          const colorCls = getColorForRight(right);
          return (
            <button
              key={right}
              type="button"
              onClick={() => handleRightClick(right)}
              className={`flex w-full items-center gap-2 rounded-lg border px-4 py-3 text-left text-[14px] transition-all ${
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

// ─── Localized quiz nav button labels ─────────────────────────────────────────
const QUIZ_NAV_LABELS: Record<string, { check: string; next: string; finish: string; hint: string; previous: string; stop: string }> = {
  en: { check: 'Check answer', next: 'Next', finish: 'Finish', hint: 'Hint', previous: 'Previous', stop: 'Stop' },
  nl: { check: 'Nakijken', next: 'Volgende', finish: 'Afronden', hint: 'Hint', previous: 'Vorige', stop: 'Stoppen' },
  es: { check: 'Comprobar', next: 'Siguiente', finish: 'Finalizar', hint: 'Pista', previous: 'Anterior', stop: 'Detener' },
  de: { check: 'Überprüfen', next: 'Weiter', finish: 'Beenden', hint: 'Tipp', previous: 'Zurück', stop: 'Stoppen' },
  fr: { check: 'Vérifier', next: 'Suivant', finish: 'Terminer', hint: 'Indice', previous: 'Précédent', stop: 'Arrêter' },
  pl: { check: 'Sprawdź', next: 'Dalej', finish: 'Zakończ', hint: 'Podpowiedź', previous: 'Wstecz', stop: 'Zatrzymaj' },
  ru: { check: 'Проверить', next: 'Далее', finish: 'Завершить', hint: 'Подсказка', previous: 'Назад', stop: 'Стоп' },
  zh: { check: '检查答案', next: '下一个', finish: '完成', hint: '提示', previous: '上一个', stop: '停止' },
  ar: { check: 'تحقق', next: 'التالي', finish: 'إنهاء', hint: 'تلميح', previous: 'السابق', stop: 'إيقاف' },
  hi: { check: 'जांचें', next: 'आगे', finish: 'समाप्त करें', hint: 'संकेत', previous: 'पिछला', stop: 'रोकें' },
};

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
  if (answer.kind === 'cloze') return answer.value.map((v) => v?.trim() || '—').join(', ');
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
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const assign = (left: string, right: string) => {
    if (disabled) return;
    const next = { ...mapping };
    if (!canReuse) for (const key of Object.keys(next)) if (next[key] === right) delete next[key];
    next[left] = right;
    onChange({ kind: 'matching', value: next });
    setSelectedOption(null);
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        {pairs.map((pair) => (
          <div key={pair.left} className="rounded-lg border border-border bg-background p-3.5">
            <p className="mb-2 text-[14px]">{pair.left}</p>
            <div
              className={[
                'min-h-11 rounded-md border border-dashed px-3 py-2.5 text-[14px] transition-colors',
                selectedOption ? 'border-[var(--accent-brand)]/40 bg-[var(--accent-brand)]/5 cursor-pointer' : 'border-border',
              ].join(' ')}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const right = e.dataTransfer.getData('text/plain');
                if (right) assign(pair.left, right);
              }}
              onClick={() => { if (selectedOption) assign(pair.left, selectedOption); }}
            >
              {mapping[pair.left] || <span className="text-muted-foreground">{selectedOption ? 'Tap to place here' : 'Drop match here'}</span>}
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-card p-2.5">
        <p className="mb-2 text-xs text-muted-foreground">Drag or tap an option, then tap a slot</p>
        <div className="flex flex-wrap gap-2">
          {pool.map((right) => (
            <button
              key={right}
              type="button"
              draggable={!disabled}
              onDragStart={(e) => { e.dataTransfer.setData('text/plain', right); setSelectedOption(null); }}
              onClick={() => {
                if (disabled) return;
                setSelectedOption((prev) => (prev === right ? null : right));
              }}
              className={[
                'rounded-full border px-3 py-1.5 text-xs transition-all',
                selectedOption === right
                  ? 'border-[var(--accent-brand)] bg-[var(--accent-brand)]/10 text-[var(--accent-brand)] font-medium ring-2 ring-[var(--accent-brand)]/30'
                  : 'border-black/[0.08] bg-background hover:border-[var(--accent-brand)]/50',
              ].join(' ')}
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
    <div className="rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-card px-4 py-4 text-[14px] leading-[2.2] text-foreground">
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
  const [selectedWord, setSelectedWord] = useState<string | null>(null);

  const handleBlankClick = (blankIdx: number) => {
    if (disabled) return;
    if (selectedWord) {
      // Place selected word into this blank (swap if already filled)
      const next = Array.from({ length: blankCount }, (_, i) => values[i] ?? '');
      const displaced = next[blankIdx];
      next[blankIdx] = selectedWord;
      // If the selected word came from another blank, clear that blank
      const fromBlankIdx = values.indexOf(selectedWord);
      if (fromBlankIdx !== -1 && fromBlankIdx !== blankIdx) next[fromBlankIdx] = displaced;
      onChange({ kind: 'cloze', value: next });
      setSelectedWord(null);
    } else if (values[blankIdx]) {
      // Select the word already in this blank for moving
      setSelectedWord(values[blankIdx]);
    }
  };

  return (
    <div className="space-y-5">
      {/* Text with drop targets */}
      <div className="rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-card px-4 py-4 text-[14px] leading-[2.4] text-foreground">
        {parts.map((part, i) =>
          part.type === 'text' ? (
            <span key={i}>{part.content}</span>
          ) : (
            <span
              key={i}
              draggable={!disabled && Boolean(values[part.index])}
              onDragStart={(e) => {
                if (values[part.index]) {
                  e.dataTransfer.setData('text/plain', `__RETURN__:${part.index}`);
                  setDragWord(values[part.index]);
                }
              }}
              onDragEnd={() => setDragWord(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const raw = e.dataTransfer.getData('text/plain') || dragWord || '';
                if (raw.startsWith('__RETURN__:')) {
                  const fromIdx = Number(raw.split(':')[1]);
                  if (!Number.isNaN(fromIdx) && fromIdx !== part.index) {
                    const next = Array.from({ length: blankCount }, (_, i) => values[i] ?? '');
                    const tmp = next[fromIdx];
                    next[fromIdx] = next[part.index] || '';
                    next[part.index] = tmp;
                    onChange({ kind: 'cloze', value: next });
                  }
                } else if (raw) {
                  update(part.index, raw);
                }
                setDragWord(null);
              }}
              onClick={() => handleBlankClick(part.index)}
              className={[
                'mx-1.5 inline-flex min-w-[80px] items-center justify-center rounded-md border px-2 py-0.5 align-middle text-[13px] cursor-pointer transition-all',
                selectedWord && selectedWord === values[part.index]
                  ? 'border-[var(--accent-brand)] bg-[var(--accent-brand)]/20 text-[var(--accent-brand)] font-medium ring-2 ring-[var(--accent-brand)]/30'
                  : values[part.index]
                    ? 'border-[var(--accent-brand)]/50 bg-[var(--accent-brand)]/10 text-[var(--accent-brand)] font-medium cursor-grab active:cursor-grabbing'
                    : selectedWord
                      ? 'border-dashed border-[var(--accent-brand)]/40 bg-[var(--accent-brand)]/5 text-muted-foreground'
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
        <div
          className="flex flex-wrap gap-2 min-h-[36px] rounded-lg p-1"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const raw = e.dataTransfer.getData('text/plain') || dragWord || '';
            if (raw.startsWith('__RETURN__:')) {
              const fromIdx = Number(raw.split(':')[1]);
              if (!Number.isNaN(fromIdx)) update(fromIdx, '');
            }
            setDragWord(null);
          }}
        >
          {wordBank.map((word) => {
            const usedInSlot = usedSlotMap[word] !== undefined;
            return (
              <button
                key={word}
                type="button"
                draggable={!disabled && !usedInSlot}
                onDragStart={(e) => { e.dataTransfer.setData('text/plain', word); setDragWord(word); setSelectedWord(null); }}
                onClick={() => {
                  if (disabled) return;
                  if (usedInSlot) {
                    // Select this word to move it from its slot
                    setSelectedWord((prev) => (prev === word ? null : word));
                    return;
                  }
                  if (selectedWord) {
                    // Place selected word into first empty blank
                    const emptyIdx = Array.from({ length: blankCount }, (_, i) => i).find((i) => !values[i]);
                    if (emptyIdx !== undefined) update(emptyIdx, selectedWord);
                    setSelectedWord(null);
                    return;
                  }
                  setSelectedWord((prev) => (prev === word ? null : word));
                }}
                disabled={disabled}
                className={[
                  'rounded-lg border px-3 py-1.5 text-[13px] transition-all',
                  usedInSlot && selectedWord !== word
                    ? 'border-black/[0.06] bg-muted/20 text-muted-foreground/40 line-through'
                    : selectedWord === word
                      ? 'border-[var(--accent-brand)] bg-[var(--accent-brand)]/10 text-[var(--accent-brand)] font-medium ring-2 ring-[var(--accent-brand)]/30'
                      : 'border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-card text-foreground hover:border-[var(--accent-brand)]/50 hover:bg-[var(--accent-brand)]/[0.04] cursor-grab active:cursor-grabbing',
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
            className="rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] text-white shadow"
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
  const singleSelect = question.comparisonSingleSelect ?? false;
  const userMap: Record<string, string[]> = answer?.kind === 'comparison' ? answer.value : {};

  const toggle = (row: string, col: string) => {
    if (disabled) return;
    if (singleSelect) {
      const current = userMap[row] || [];
      const already = current.includes(col);
      onChange({ kind: 'comparison', value: { ...userMap, [row]: already ? [] : [col] } });
    } else {
      const current = userMap[row] || [];
      const next = current.includes(col) ? current.filter((c) => c !== col) : [...current, col];
      onChange({ kind: 'comparison', value: { ...userMap, [row]: next } });
    }
  };

  if (!rows.length || !cols.length) {
    return <p className="text-sm text-muted-foreground">Comparison data not available.</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-muted-foreground">
        {singleSelect ? 'Select one column per row.' : 'Select all that apply per row.'}
      </p>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground" />
              {cols.map((col) => (
                <th key={col} className="px-3 py-2.5 text-center text-[12px] text-foreground">
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
                  return (
                    <td key={col} className="px-3 py-2.5 text-center">
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => toggle(row, col)}
                        className={[
                          'mx-auto flex h-6 w-6 items-center justify-center border-2',
                          singleSelect ? 'rounded-full' : 'rounded',
                          checked
                            ? 'border-[var(--accent-brand)] bg-[var(--accent-brand)] text-white'
                            : 'border-muted-foreground/30 bg-background hover:border-[var(--accent-brand)]/60',
                        ].join(' ')}
                      >
                        {checked && (
                          singleSelect
                            ? <span className="h-2 w-2 rounded-full bg-white" />
                            : <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
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
    'bg-slate-500/12 text-slate-700 dark:text-slate-300 border-slate-400/40',
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
          <div key={stmt.id} className="rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-card p-3.5 space-y-2.5">
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
  // Keyed by stable origin index, and hover-target read directly from the id
  // captured per rendered row, rather than re-deriving an index from item text
  // on every drag event — recomputing by text caused a feedback loop where the
  // live-reordered DOM moved a different item under the cursor mid-drag,
  // making the two rows flicker back and forth.
  const itemsWithId = useMemo(() => items.map((text, id) => ({ id, text })), [items]);

  const idsFromTexts = (texts: string[]) => {
    const pool = itemsWithId.map((it) => it.id);
    return texts.map((text) => {
      const idx = pool.findIndex((id) => itemsWithId[id].text === text);
      if (idx === -1) return pool[0];
      return pool.splice(idx, 1)[0];
    });
  };

  const current: number[] = answer?.kind === 'ordering' && answer.value.length === itemsWithId.length
    ? idsFromTexts(answer.value)
    : itemsWithId.map((it) => it.id);

  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [overId, setOverId] = useState<number | null>(null);

  const reorder = (from: number, to: number) => {
    const next = current.filter((i) => i !== from);
    const pos = next.indexOf(to);
    next.splice(pos, 0, from);
    return next;
  };

  const displayIds = draggingId !== null && overId !== null && draggingId !== overId
    ? reorder(draggingId, overId)
    : current;

  const handleDrop = (target: number) => {
    if (draggingId !== null && draggingId !== target) {
      onChange({ kind: 'ordering', value: reorder(draggingId, target).map((id) => itemsWithId[id].text) });
    }
    setDraggingId(null);
    setOverId(null);
  };

  return (
    <div className="space-y-3">
      {criteria ? (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-[12px] text-muted-foreground">
          <span className="font-medium text-foreground">Rank by: </span>{criteria}
        </div>
      ) : null}
      <p className="text-[11px] text-muted-foreground">Drag to reorder from #1 (top) to last (bottom).</p>
      <div className="space-y-3">
        {displayIds.map((id, idx) => {
          const item = itemsWithId[id].text;
          return (
            <div
              key={id}
              draggable={!disabled}
              onDragStart={() => setDraggingId(id)}
              onDragOver={(e) => { e.preventDefault(); if (draggingId !== null) setOverId(id); }}
              onDragLeave={() => setOverId((prev) => (prev === id ? null : prev))}
              onDrop={() => handleDrop(id)}
              onDragEnd={() => { setDraggingId(null); setOverId(null); }}
              className={`flex items-center gap-4 rounded-lg border px-4 py-4 cursor-grab active:cursor-grabbing select-none transition-all ${
                overId === id && draggingId !== null
                  ? 'border-[var(--accent-brand)] bg-[var(--accent-brand)]/5 ring-1 ring-[var(--accent-brand)]/20'
                  : 'border-border bg-background'
              }`}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[12px] leading-none text-foreground">
                #{idx + 1}
              </span>
              <svg className="h-5 w-5 shrink-0 text-muted-foreground/50" viewBox="0 0 16 16" fill="currentColor">
                <path d="M5 4a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm6 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm6 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM5 16a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm6 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/>
              </svg>
              <span className="text-[15px] text-foreground">{item}</span>
            </div>
          );
        })}
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
    'border-slate-400/50 bg-slate-500/10 text-slate-700 dark:text-slate-300',
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
                        ? catColorMap[cat] ?? 'border-slate-400 bg-slate-500/10 text-slate-700 dark:text-slate-300'
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
    'border-slate-400/50 bg-slate-500/8 text-slate-700 dark:text-slate-300',
    'border-blue-400/50 bg-blue-500/8 text-blue-700 dark:text-blue-300',
    'border-amber-400/50 bg-amber-500/8 text-amber-700 dark:text-amber-300',
  ];
  const zoneColors = [
    'border-slate-400/50 bg-slate-500/10 text-slate-700 dark:text-slate-300',
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
            <span className="px-1 text-[11px] leading-tight">
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
                assignedZone ? `${zoneColorMap[assignedZone] ?? 'border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-card'} border` : 'border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-card'
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
      <div className="flex flex-wrap gap-2 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-card px-4 py-4">
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
        <div className="rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-card px-4 py-3.5 space-y-2">
          <p className="text-[11px] text-muted-foreground">Scenario</p>
          <p className="text-[13px] leading-relaxed text-foreground">
            {truncated ? `${context.slice(0, 320)}…` : context}
          </p>
          {context.length > 320 && (
            <button
              type="button"
              onClick={() => setShowFull((p) => !p)}
              className="text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
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

// ─── Visual Timeline ─────────────────────────────────────────────────────────
function TimelineVisual({ question, answer, disabled, onChange }: {
  question: QuizQuestion; answer?: AnswerValue; disabled: boolean; onChange: (v: AnswerValue) => void;
}) {
  const events = question.timelineEvents || [];
  const start = question.timelineStart || '0';
  const end = question.timelineEnd || '100';
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // answer stores placed positions: { eventId: position (1-100) }
  const placed: Record<string, number> = answer?.kind === 'matching' ? (answer.value as any) : {};

  const placeEvent = (id: string, pct: number) => {
    const pos = Math.round(Math.max(1, Math.min(100, pct)));
    onChange({ kind: 'matching', value: { ...placed, [id]: pos } } as any);
  };

  const unplacedEvents = events.filter((e) => placed[e.id] === undefined);
  const placedEvents = events.filter((e) => placed[e.id] !== undefined);

  return (
    <div className="space-y-5">
      {/* Event pool */}
      {unplacedEvents.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {unplacedEvents.map((ev) => (
            <div
              key={ev.id}
              draggable={!disabled}
              onDragStart={() => setDraggingId(ev.id)}
              onDragEnd={() => setDraggingId(null)}
              onClick={() => {
                if (disabled) return;
                setDraggingId((prev) => (prev === ev.id ? null : ev.id));
              }}
              className={[
                'rounded-lg border px-3 py-1.5 text-[13px] text-foreground select-none shadow-sm transition-all',
                disabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing',
                draggingId === ev.id
                  ? 'border-[var(--accent-brand)] bg-[var(--accent-brand)]/10 text-[var(--accent-brand)] font-medium ring-2 ring-[var(--accent-brand)]/30'
                  : 'border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-card',
              ].join(' ')}
            >
              {ev.label}
            </div>
          ))}
        </div>
      )}
      {draggingId && !disabled && (
        <p className="text-[11px] text-[var(--accent-brand)]">Tap or drag to the timeline to place this event</p>
      )}

      {/* Timeline track */}
      <div className="relative pt-8 pb-6">
        {/* Drop zone line */}
        <div
          className="relative h-2 rounded-full bg-muted cursor-crosshair"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const id = draggingId;
            if (!id) return;
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const pct = ((e.clientX - rect.left) / rect.width) * 100;
            placeEvent(id, pct);
            setDraggingId(null);
          }}
          onTouchEnd={(e) => {
            if (disabled || !draggingId) return;
            const touch = e.changedTouches[0];
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const pct = ((touch.clientX - rect.left) / rect.width) * 100;
            placeEvent(draggingId, pct);
            setDraggingId(null);
          }}
          onClick={(e) => {
            if (disabled || !draggingId) return;
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const pct = ((e.clientX - rect.left) / rect.width) * 100;
            placeEvent(draggingId, pct);
            setDraggingId(null);
          }}
        >
          <div className="absolute inset-0 rounded-full bg-muted-foreground/20" />

          {/* Placed event markers */}
          {placedEvents.map((ev) => {
            const pos = placed[ev.id];
            const correctPos = ev.position;
            return (
              <div
                key={ev.id}
                style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}
                className="absolute top-1/2 -translate-y-1/2"
              >
                {/* Dot */}
                <div className="h-4 w-4 rounded-full border-2 border-white bg-foreground shadow-md" />
                {/* Label chip above */}
                <div
                  className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-card px-2 py-0.5 text-[11px] text-foreground shadow-sm cursor-pointer"
                  onClick={() => {
                    if (disabled) return;
                    const next = { ...placed };
                    delete next[ev.id];
                    onChange({ kind: 'matching', value: next } as any);
                  }}
                  title="Click to remove"
                >
                  {ev.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Start / end labels */}
        <div className="mt-2 flex justify-between text-[11px] font-medium text-muted-foreground">
          <span>{start}</span>
          <span>{end}</span>
        </div>
      </div>

      {placedEvents.length > 0 && !disabled && (
        <p className="text-[11px] text-muted-foreground">Click a placed label to remove it.</p>
      )}
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

  // ─── Timeline: visual track if timelineEvents present, otherwise ordering ─────
  if (type === 'timeline') {
    if ((question.timelineEvents?.length ?? 0) >= 1) {
      return <TimelineVisual question={question} answer={answer} disabled={disabled} onChange={onChange} />;
    }
    if ((question.orderingItems?.length ?? 0) >= 2) {
      const variant = selectVariant(question.id, ks, 2);
      if (variant === 0) return <OrderingClickNumber question={question} answer={answer} disabled={disabled} onChange={onChange} />;
      return <OrderingDragHandles question={question} answer={answer} disabled={disabled} onChange={onChange} />;
    }
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
        <div className="rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-card px-4 py-4 text-[14px] leading-loose text-foreground">
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
          <div className="rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-card px-3 py-2.5 text-[12px] text-muted-foreground">
            <span className="font-medium text-foreground">Include: </span>{hint}
          </div>
        ) : null}
        <textarea
          autoFocus
          value={answer?.kind === 'text' ? answer.value : ''}
          onChange={(e) => onChange({ kind: 'text', value: e.target.value })}
          disabled={disabled}
          rows={3}
          className="w-full rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-card px-4 py-3 text-[13px] text-foreground placeholder:text-muted-foreground placeholder:transition-opacity [&:focus::placeholder]:opacity-0 resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent-brand)]/40"
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

// ── Straight icon primitives (no curves, no Unicode) ─────────────────────────
function IconCheck({ size = 10, strokeWidth = 1.8 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size * 0.8} viewBox="0 0 10 8" fill="none" aria-hidden>
      <polyline points="1,4 3.5,7 9,1" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="square" strokeLinejoin="miter"/>
    </svg>
  );
}
function IconX({ size = 10, strokeWidth = 1.8 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none" aria-hidden>
      <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="square"/>
      <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="square"/>
    </svg>
  );
}

type SourceHighlightSpan = { start: number; end: number; correct: boolean };
type CitationChunk = { text: string; startIdx: number; endIdx: number; chunkId: string };

// Finds the citation in the source text and returns the full chunk context
function extractCitationChunk(sourceText: string, citation: string | undefined): CitationChunk | null {
  if (!citation || citation.length < 5) return null;
  const haystack = sourceText.toLowerCase();
  const needle = citation.toLowerCase();
  const startIdx = haystack.indexOf(needle);
  if (startIdx === -1) return null;

  // Return the exact citation match as a chunk
  const endIdx = startIdx + citation.length;
  return {
    text: sourceText.slice(startIdx, endIdx),
    startIdx,
    endIdx,
    chunkId: `chunk-${Math.abs(startIdx).toString(36)}-${Math.abs(endIdx).toString(36)}`,
  };
}

// Locates each scored question's citation inside the raw source text and groups
// matches into merged, non-overlapping spans so the passage can be painted by outcome.
function buildSourceHighlights(
  sourceText: string,
  rows: Array<{ correct: boolean; isNotRelevant: boolean; question: QuizQuestion }>
) {
  const haystack = sourceText.toLowerCase();
  const spans: SourceHighlightSpan[] = [];
  for (const row of rows) {
    if (row.isNotRelevant) continue;
    const citation = String(row.question.citation || '').trim();
    if (citation.length < 8) continue;
    const start = haystack.indexOf(citation.toLowerCase());
    if (start === -1) continue;
    spans.push({ start, end: start + citation.length, correct: row.correct });
  }
  if (spans.length === 0) return null;
  spans.sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: SourceHighlightSpan[] = [];
  for (const span of spans) {
    const last = merged[merged.length - 1];
    if (last && span.start < last.end) {
      last.end = Math.max(last.end, span.end);
      if (!span.correct) last.correct = false;
      continue;
    }
    merged.push({ ...span });
  }
  const segments: Array<{ text: string; correct?: boolean }> = [];
  let cursor = 0;
  for (const span of merged) {
    if (span.start > cursor) segments.push({ text: sourceText.slice(cursor, span.start) });
    segments.push({ text: sourceText.slice(span.start, span.end), correct: span.correct });
    cursor = span.end;
  }
  if (cursor < sourceText.length) segments.push({ text: sourceText.slice(cursor) });
  return {
    segments,
    weakCount: merged.filter((s) => !s.correct).length,
    okCount: merged.filter((s) => s.correct).length,
  };
}

function QuizResults({ quiz, answers, signals, sourceText, notRelevantIds, onRestart, studysetId, taskId }: { quiz: Quiz; answers: AnswerMap; signals: AdaptivePerformanceSignal[]; runtimeSettings?: QuizRuntimeSettings; sourceText: string; notRelevantIds?: Set<string>; onRestart?: () => void; studysetId?: string; taskId?: string }) {
  // Self-grade overrides: lets the learner approve/reject the auto-graded verdict
  // on short-answer questions, which are matched with strict normalized string
  // equality and can false-negative on a correct answer phrased differently.
  const [selfGradeOverrides, setSelfGradeOverrides] = useState<Record<string, boolean>>({});

  const rows = useMemo(
    () =>
      quiz.questions.map((question, index) => {
        const answer = answers[question.id];
        const acc = getQuestionAccuracy(question, answer);
        const isNotRelevant = notRelevantIds?.has(question.id) ?? false;
        const override = selfGradeOverrides[question.id];
        const correct = override !== undefined ? override : acc.correct;
        const accuracy = override !== undefined ? (override ? 100 : 0) : acc.accuracy;
        const partsCorrect = override !== undefined ? (override ? acc.partsTotal : 0) : acc.partsCorrect;
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
          accuracy,
          partsCorrect,
          partsTotal: acc.partsTotal,
          correct,
          autoCorrect: acc.correct,
          overridden: override !== undefined,
          responseMs: Number(signals[index]?.responseMs || 0),
          isNotRelevant,
        };
      }),
    [answers, notRelevantIds, quiz.questions, signals, selfGradeOverrides]
  );

  const scoredRows = rows.filter((r) => !r.isNotRelevant);
  const wrongRows = scoredRows.filter((r) => !r.correct);
  const notRelevantCount = rows.length - scoredRows.length;

  // ── Stats ────────────────────────────────────────────────────────────────────
  const accuracyPct = scoredRows.length
    ? Math.round(scoredRows.reduce((s, r) => s + r.accuracy, 0) / scoredRows.length)
    : 0;
  const completedPct = rows.length
    ? Math.round((scoredRows.filter((r) => r.answer !== undefined).length / rows.length) * 100)
    : 0;
  const avgMs = signals.length
    ? Math.round(signals.reduce((s, sig) => s + Number(sig.responseMs || 0), 0) / signals.length)
    : 0;
  const totalMs = signals.reduce((s, sig) => s + Number(sig.responseMs || 0), 0);

  // ── Record studyset performance (fires once on mount; results are final here) ──
  const performanceRecordedRef = useRef(false);
  useEffect(() => {
    if (performanceRecordedRef.current) return;
    if (!taskId || !studysetId) return;
    performanceRecordedRef.current = true;

    const correctCount = scoredRows.filter((r) => r.correct).length;
    const totalCount = scoredRows.length;
    const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
    const timeSpentSeconds = Math.round(totalMs / 1000);
    // Weak topics: categories of incorrectly answered (scored) questions, de-duplicated
    const weakTopics = scoredRows
      .filter((r) => !r.correct)
      .map((r) => r.category || r.question?.category || '')
      .filter(Boolean)
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .slice(0, 8);

    void fetch(`/api/studysets/plan-tasks/${taskId}/performance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studysetId,
        toolId: 'quiz',
        score,
        totalItems: totalCount,
        correctItems: correctCount,
        timeSpentSeconds,
        weakTopics,
        markCompleted: true,
      }),
    }).catch(() => { /* non-fatal — performance recording is best-effort */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Category breakdown ────────────────────────────────────────────────────────
  const catMap = scoredRows.reduce<Record<string, { total: number; scoreSum: number; wrongQs: string[] }>>((acc, r) => {
    acc[r.category] = acc[r.category] || { total: 0, scoreSum: 0, wrongQs: [] };
    acc[r.category].total += 1;
    acc[r.category].scoreSum += r.accuracy;
    if (!r.correct) acc[r.category].wrongQs.push(r.question.question);
    return acc;
  }, {});
  const categoryScores = Object.entries(catMap)
    .map(([cat, s]) => ({ cat, score: Math.round(s.scoreSum / Math.max(1, s.total)), total: s.total, wrongQs: s.wrongQs }))
    .sort((a, b) => a.score - b.score);

  // ── Type breakdown ────────────────────────────────────────────────────────────
  const typeMap = scoredRows.reduce<Record<string, { total: number; scoreSum: number }>>((acc, r) => {
    acc[r.type] = acc[r.type] || { total: 0, scoreSum: 0 };
    acc[r.type].total += 1;
    acc[r.type].scoreSum += r.accuracy;
    return acc;
  }, {});
  const typeScores = Object.entries(typeMap)
    .map(([type, s]) => ({ type, score: Math.round(s.scoreSum / Math.max(1, s.total)) }))
    .sort((a, b) => a.score - b.score);

  // ── One-click continue (all wrong questions together, generates immediately) ──
  const allWrongQTexts = wrongRows.map((r) => r.question.question);
  const weakestCategories = categoryScores.filter((c) => c.score < 80).map((c) => c.cat).slice(0, 2);
  // Flashcards already auto-generates from a bare ?sourceText= param; quiz and notes
  // need &autostart=1 to skip their settings screen and generate right away.
  const openTrainTool = (tool: 'quiz' | 'flashcards' | 'notes') => {
    const focusBlock = allWrongQTexts.length
      ? `\n\nFocus on these incorrectly answered questions — make sure to cover these specific concepts:\n${allWrongQTexts.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
      : '';
    const autostart = tool === 'flashcards' ? '' : '&autostart=1';
    window.location.href = `/tools/${tool}?sourceText=${encodeURIComponent(sourceText + focusBlock)}${autostart}`;
  };

  // ── Weak-spot source highlighting + one-click retest ──────────────────────────
  const sourceHighlights = useMemo(() => buildSourceHighlights(sourceText, rows), [sourceText, rows]);
  const weakCitations = scoredRows
    .filter((r) => !r.correct && r.question.citation)
    .map((r) => r.question.citation as string);
  const retestWeakSpots = () => {
    const focusBlock = weakCitations.length
      ? `\n\nRetest focus — write NEW questions specifically about these passages (do not repeat earlier questions):\n${weakCitations.map((c, i) => `${i + 1}. "${c}"`).join('\n')}`
      : (weakestCategories.length ? `\n\nRetest focus — write NEW questions specifically about these topics: ${weakestCategories.join(', ')}.` : '');
    window.location.href = `/tools/quiz?sourceText=${encodeURIComponent(sourceText + focusBlock)}&autostart=1`;
  };

  // ── Self-grade approve/reject for short-answer questions ──────────────────────
  const shortAnswerRows = scoredRows.filter((r) => r.type === 'short-answer' && r.answer !== undefined);

  // ── Modal question expand ─────────────────────────────────────────────────────
  const [modalIdx, setModalIdx] = useState<number | null>(null);
  const modalRow = modalIdx !== null ? rows[modalIdx] : null;

  const [showTotalTime, setShowTotalTime] = useState(false);

  const accentColor = (pct: number) =>
    pct >= 80 ? 'text-emerald-600 dark:text-emerald-400' : pct >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-500 dark:text-red-400';
  const accentBg = (pct: number) =>
    pct >= 80 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : pct >= 50 ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';

  const scoreColor = accuracyPct >= 80 ? 'text-emerald-600 dark:text-emerald-400' : accuracyPct >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-500 dark:text-red-400';

  return (
    <>
    {/* ── Fullscreen question modal ── */}
    {modalRow !== null && (
      <>
        <style>{`@keyframes qModalIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}`}</style>
        <div
          className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm"
          onClick={() => setModalIdx(null)}
          style={{ animation: 'qModalIn 0.18s cubic-bezier(0.16,1,0.3,1) both' }}
        />
        <div
          className="fixed inset-4 z-50 flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
          style={{ animation: 'qModalIn 0.18s cubic-bezier(0.16,1,0.3,1) both' }}
        >
          {/* Modal header */}
          <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted/20 px-5 py-3">
            <div className="flex items-center gap-2">
              <span className={[
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px]',
                modalRow.isNotRelevant ? 'bg-muted text-muted-foreground' :
                modalRow.correct ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' :
                'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
              ].join(' ')}>
                {modalRow.correct ? <IconCheck size={9} strokeWidth={2} /> : <IconX size={9} strokeWidth={2} />}
              </span>
              <span className="text-[12px] text-muted-foreground">Q{modalRow.idx + 1}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                {getTypeLabel(modalRow.type)}
              </span>
              {modalRow.responseMs > 0 && (
                <span className="text-[10px] text-muted-foreground">{(modalRow.responseMs / 1000).toFixed(1)}s</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setModalIdx(null)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground transition-colors"
            >
              <IconX size={10} strokeWidth={2} />
            </button>
          </div>

          {/* Modal body */}
          <div className="flex-1 overflow-auto px-6 py-5 space-y-4">
            <p className="text-[17px] leading-[1.65] text-foreground">
              {modalRow.question.question.replace(/_{3,}/g, '____')}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className={`rounded-xl border px-4 py-3 ${modalRow.correct ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-900/10' : 'border-red-200 dark:border-red-800 bg-red-50/40 dark:bg-red-900/10'}`}>
                <p className="mb-1.5 text-[11px] text-muted-foreground">Your answer</p>
                <p className={`text-[14px] font-medium ${modalRow.correct ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{modalRow.given || '—'}</p>
              </div>
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-900/10 px-4 py-3">
                <p className="mb-1.5 text-[11px] text-muted-foreground">Correct answer</p>
                <p className="text-[14px] font-medium text-emerald-700 dark:text-emerald-400">{modalRow.correctValue || '—'}</p>
              </div>
            </div>

            {modalRow.question.type === 'matching' && (
              <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
                <p className="mb-2 text-[11px] text-muted-foreground">Matching breakdown</p>
                <MatchingComparison question={modalRow.question} answer={modalRow.answer} />
              </div>
            )}

            {modalRow.question.explanation && (
              <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
                <p className="mb-1.5 text-[11px] text-muted-foreground">Explanation</p>
                <p className="text-[13.5px] leading-relaxed text-foreground/80">{modalRow.question.explanation}</p>
              </div>
            )}

            {modalRow.question.citation && (
              <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
                <p className="mb-1.5 text-[11px] text-muted-foreground">Source Citation</p>
                <p className="text-[13.5px] leading-relaxed text-foreground/80 italic">"{modalRow.question.citation}"</p>
              </div>
            )}

            {modalRow.question.suggestedAnswer && (
              <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
                <p className="mb-1.5 text-[11px] text-muted-foreground">Suggested Answer</p>
                <p className="text-[13.5px] leading-relaxed text-foreground/80">{modalRow.question.suggestedAnswer}</p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {[
                { label: `Parts: ${modalRow.partsCorrect}/${modalRow.partsTotal}` },
                ...(modalRow.responseMs > 0 ? [{ label: `${(modalRow.responseMs / 1000).toFixed(1)}s` }] : []),
                { label: `Difficulty ${modalRow.difficulty}/10` },
                { label: modalRow.category },
              ].map((c) => (
                <span key={c.label} className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-[11px] text-muted-foreground">{c.label}</span>
              ))}
            </div>
          </div>

          {/* Modal prev/next */}
          <div className="flex shrink-0 items-center justify-between border-t border-border bg-muted/10 px-5 py-3">
            <button
              type="button"
              disabled={(modalIdx ?? 0) <= 0}
              onClick={() => setModalIdx((prev) => Math.max(0, (prev ?? 0) - 1))}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={14} /> Prev
            </button>
            <span className="text-[11px] text-muted-foreground">
              {(modalIdx ?? 0) + 1} / {rows.length}
            </span>
            <button
              type="button"
              disabled={(modalIdx ?? 0) >= rows.length - 1}
              onClick={() => setModalIdx((prev) => Math.min(rows.length - 1, (prev ?? 0) + 1))}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </>
    )}

    <div className="flex h-full flex-col bg-muted/30">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-white dark:bg-card px-6 py-3">
        <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <span className="font-medium text-foreground">Quiz</span>
          {quiz.title ? <><span>/</span><span className="max-w-[200px] truncate">{quiz.title}</span></> : null}
          <span>/</span>
          <span className="font-medium text-foreground">Results</span>
        </div>
        {onRestart && (
          <Button size="sm" variant="outline" className="h-8 text-[12px]" onClick={onRestart}>
            Try again
          </Button>
        )}
      </div>

      {/* Full progress bar */}
      <div className="h-[3px] w-full shrink-0 bg-foreground/15" />

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-[1100px] px-5 py-5 space-y-4">

          {notRelevantCount > 0 && (
            <p className="rounded-lg border border-border bg-white dark:bg-card px-4 py-2 text-[12px] text-muted-foreground">
              {notRelevantCount} question{notRelevantCount > 1 ? 's were' : ' was'} marked as Not Relevant and excluded from scoring.
            </p>
          )}

          {/* ── Horizontal stats strip ─────────────────────────────────────── */}
          <div className="flex overflow-hidden rounded-2xl border border-border bg-white dark:bg-card shadow-sm">
            {/* Accuracy */}
            <div className={`flex-1 border-r border-border px-5 py-4 ${accentBg(accuracyPct)}`}>
              <p className="text-[11px] text-muted-foreground">Accuracy</p>
              <p className={`mt-1 text-[26px] tabular-nums leading-none ${scoreColor}`}>{accuracyPct}%</p>
              <p className="mt-1 text-[10px] text-muted-foreground">{scoredRows.filter((r) => r.correct).length} / {scoredRows.length} correct</p>
            </div>
            {/* Speed */}
            <div className="flex-1 border-r border-border px-5 py-4">
              <p className="text-[11px] text-muted-foreground">Speed</p>
              <button
                type="button"
                className="mt-1 text-[26px] tabular-nums leading-none text-foreground hover:text-[var(--accent-brand)] transition-colors"
                onClick={() => setShowTotalTime((v) => !v)}
              >
                {showTotalTime ? (totalMs > 0 ? `${Math.round(totalMs / 1000)}s` : '—') : (avgMs > 0 ? `${(avgMs / 1000).toFixed(1)}s` : '—')}
              </button>
              <p className="mt-1 text-[10px] text-muted-foreground">{showTotalTime ? 'total · click for avg' : 'avg / question · click for total'}</p>
            </div>
            {/* Completed */}
            <div className="flex-1 px-5 py-4">
              <p className="text-[11px] text-muted-foreground">Completed</p>
              <p className="mt-1 text-[26px] tabular-nums leading-none text-foreground">{completedPct}%</p>
              <p className="mt-1 text-[10px] text-muted-foreground">{scoredRows.length} questions answered</p>
            </div>
          </div>

          {/* ── Weak-spot source highlights + retest ─────────────────────────── */}
          {sourceHighlights && (
            <div className="rounded-2xl border border-border bg-white dark:bg-card shadow-sm overflow-hidden">
              <div className="border-b border-border/60 bg-muted/20 px-5 py-3">
                <p className="text-[12px] text-muted-foreground">Source passage — answered correctly vs. answered wrong</p>
              </div>
              <div className="px-5 py-4">
                <p className="max-h-[220px] overflow-auto whitespace-pre-wrap text-[13px] leading-[1.7] text-foreground/80">
                  {sourceHighlights.segments.map((seg, i) =>
                    seg.correct === undefined ? (
                      <span key={i}>{seg.text}</span>
                    ) : (
                      <span
                        key={i}
                        className={seg.correct
                          ? 'rounded bg-emerald-100 px-0.5 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : 'rounded bg-red-100 px-0.5 text-red-700 dark:bg-red-900/40 dark:text-red-300'}
                      >
                        {seg.text}
                      </span>
                    )
                  )}
                </p>
                <div className="mt-3 flex items-center gap-4 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> Answered correctly ({sourceHighlights.okCount})</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-400" /> Answered wrong — will be retested ({sourceHighlights.weakCount})</span>
                </div>
                {sourceHighlights.weakCount > 0 && (
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[var(--accent-brand)]/30 bg-[var(--accent-brand)]/[0.06] px-4 py-3">
                    <p className="text-[12px] text-foreground">
                      Retest <span className="text-[var(--accent-brand)]">{sourceHighlights.weakCount} weak passage{sourceHighlights.weakCount > 1 ? 's' : ''}</span> — new questions, full source context. Generates immediately, no settings shown.
                    </p>
                    <Button size="sm" className="h-8 shrink-0 text-[12px]" onClick={retestWeakSpots}>
                      Retest weak spots
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── 2-column body ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-[1fr_300px] gap-4 items-start">

            {/* LEFT: full question list */}
            <div className="rounded-2xl border border-border bg-white dark:bg-card overflow-hidden shadow-sm">
              <div className="border-b border-border/60 bg-muted/20 px-5 py-3 flex items-center justify-between">
                <p className="text-[12px] text-muted-foreground">All questions</p>
                <span className="text-[10px] text-muted-foreground">click to expand</span>
              </div>
              <div className="divide-y divide-border/50">
                {rows.filter((row) => !row.isNotRelevant).map((row) => {
                  const unanswered = row.answer === undefined;
                  return (
                    <button
                      key={row.id}
                      type="button"
                      className="w-full px-4 py-3 text-left hover:bg-muted/20 transition-colors"
                      onClick={() => setModalIdx(row.idx)}
                    >
                      <div className="flex items-center gap-3">
                        {/* Status icon */}
                        <span className={[
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                          unanswered ? 'bg-muted text-muted-foreground' :
                          row.correct ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                          'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
                        ].join(' ')}>
                          {unanswered
                            ? <span className="text-[9px]">—</span>
                            : row.correct
                              ? <IconCheck size={8} strokeWidth={2} />
                              : <IconX size={8} strokeWidth={2} />}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[10px] text-muted-foreground">Q{row.idx + 1}</span>
                            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">{getTypeLabel(row.type)}</span>
                          </div>
                          <p className="text-[12.5px] text-foreground line-clamp-1">
                            {row.question.question.replace(/_{3,}/g, '____')}
                          </p>
                        </div>

                        {/* Answer pills */}
                        {!unanswered && (
                          <div className="shrink-0 flex flex-col items-end gap-1">
                            <span className={`rounded-md px-2 py-0.5 text-[10px] border max-w-[140px] truncate ${row.correct ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300' : 'bg-red-50 border-red-200 text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'}`}>
                              {row.given.length > 22 ? row.given.slice(0, 20) + '…' : row.given}
                            </span>
                            {!row.correct && (
                              <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300 max-w-[140px] truncate">
                                {row.correctValue.length > 22 ? row.correctValue.slice(0, 20) + '…' : row.correctValue}
                              </span>
                            )}
                            {row.responseMs > 0 && (
                              <span className="text-[9px] text-muted-foreground">{(row.responseMs / 1000).toFixed(1)}s</span>
                            )}
                          </div>
                        )}
                        {unanswered && <span className="shrink-0 text-[10px] text-muted-foreground">skipped</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* RIGHT: insights */}
            <div className="space-y-3">

              {/* Topics overview */}
              <div className="rounded-2xl border border-border bg-white dark:bg-card shadow-sm overflow-hidden">
                <div className="border-b border-border/60 bg-muted/20 px-4 py-3">
                  <p className="text-[12px] text-muted-foreground">Topics</p>
                </div>
                {categoryScores.length === 0 ? (
                  <p className="px-4 py-3 text-[11px] text-muted-foreground">No data.</p>
                ) : (
                  <div className="divide-y divide-border/40">
                    {categoryScores.map((entry) => (
                      <div key={entry.cat} className="flex items-center justify-between px-4 py-2">
                        <span className="text-[12px] text-foreground capitalize truncate flex-1 mr-2">{entry.cat}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] border ${
                            entry.score >= 80 ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300' :
                            entry.score >= 50 ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300' :
                            'bg-red-50 border-red-200 text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
                          }`}>{entry.score}%</span>
                          <span className="text-[9px] text-muted-foreground">{entry.total}q</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Continue — one-click, no settings screen, biased toward weak topics */}
              <div className="rounded-2xl border border-border bg-white dark:bg-card shadow-sm overflow-hidden">
                <div className="border-b border-border/60 bg-muted/20 px-4 py-3">
                  <p className="text-[12px] text-muted-foreground">Continue</p>
                </div>
                {wrongRows.length === 0 ? (
                  <div className="px-4 py-4 text-center">
                    <p className="text-[13px] text-emerald-600 dark:text-emerald-400">Perfect score!</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">Nothing to retrain.</p>
                  </div>
                ) : (
                  <div className="px-4 py-3.5 space-y-2">
                    {([
                      { tool: 'quiz' as const, label: 'Continue with Quiz', sub: `${wrongRows.length} new question${wrongRows.length > 1 ? 's' : ''}${weakestCategories.length ? `, focused on ${weakestCategories.join(' & ')}` : ''}` },
                      { tool: 'flashcards' as const, label: 'Continue with Flashcards', sub: weakestCategories.length ? `Cards built from ${weakestCategories.join(' & ')}` : 'Cards built from your missed questions' },
                      { tool: 'notes' as const, label: 'Continue with Notes', sub: 'Summary notes on what you missed' },
                    ]).map((tile) => (
                      <button
                        key={tile.tool}
                        type="button"
                        onClick={() => openTrainTool(tile.tool)}
                        className="block w-full rounded-xl border border-border bg-muted/10 px-3 py-2.5 text-left hover:border-[var(--accent-brand)]/40 hover:bg-[var(--accent-brand)]/[0.06] transition-colors"
                      >
                        <p className="text-[12.5px] text-foreground">{tile.label}</p>
                        <p className="mt-0.5 text-[10.5px] text-muted-foreground">{tile.sub}</p>
                      </button>
                    ))}
                    <p className="pt-1 text-[10px] text-muted-foreground">No setup screen — generates immediately and opens when ready.</p>
                  </div>
                )}
              </div>

              {/* Open-answer review — self-grade approve/reject */}
              {shortAnswerRows.length > 0 && (
                <div className="rounded-2xl border border-border bg-white dark:bg-card shadow-sm overflow-hidden">
                  <div className="border-b border-border/60 bg-muted/20 px-4 py-3">
                    <p className="text-[12px] text-muted-foreground">Open-answer review</p>
                  </div>
                  <div className="divide-y divide-border/40">
                    {shortAnswerRows.map((row) => (
                      <div key={row.id} className="px-4 py-3">
                        <p className="text-[11.5px] text-foreground line-clamp-2">Q{row.idx + 1} — {row.question.question}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground line-clamp-1">Your answer: &ldquo;{row.given || '—'}&rdquo;</p>
                        <div className="mt-1.5 flex items-center justify-between gap-2">
                          <span className={`text-[10px] ${row.correct ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                            {row.overridden ? 'You marked: ' : 'Auto-graded: '}{row.correct ? 'Correct' : 'Incorrect'}{!row.overridden ? ' (exact match)' : ''}
                          </span>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <button
                              type="button"
                              aria-label="Approve as correct"
                              onClick={() => setSelfGradeOverrides((prev) => ({ ...prev, [row.id]: true }))}
                              className={`flex h-6 w-6 items-center justify-center rounded-full border transition-colors ${row.correct ? 'border-emerald-400 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'border-border bg-background text-muted-foreground hover:text-emerald-600'}`}
                            >
                              <IconCheck size={9} strokeWidth={2} />
                            </button>
                            <button
                              type="button"
                              aria-label="Reject as incorrect"
                              onClick={() => setSelfGradeOverrides((prev) => ({ ...prev, [row.id]: false }))}
                              className={`flex h-6 w-6 items-center justify-center rounded-full border transition-colors ${!row.correct ? 'border-red-400 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 'border-border bg-background text-muted-foreground hover:text-red-600'}`}
                            >
                              <IconX size={9} strokeWidth={2} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* By question type */}
              {typeScores.length > 1 && (
                <div className="rounded-2xl border border-border bg-white dark:bg-card shadow-sm overflow-hidden">
                  <div className="border-b border-border/60 bg-muted/20 px-4 py-3">
                    <p className="text-[12px] text-muted-foreground">By type</p>
                  </div>
                  <div className="px-4 py-2 space-y-1.5">
                    {typeScores.map((t) => (
                      <div key={t.type} className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-foreground truncate">{getTypeLabel(t.type)}</span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] border ${
                          t.score >= 80 ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300' :
                          t.score >= 50 ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300' :
                          'bg-red-50 border-red-200 text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
                        }`}>{t.score}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
    </>
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
    'comparison-matrix': 'Mark the correct cells in the table.',
    'argument-analysis': 'Tag each statement with its role in the argument.',
    'scenario': 'Read the scenario, then select the best answer.',
    'timeline': 'Drag events onto the timeline to place them at the correct position.',
    'ranking': 'Rank the items from first to last based on the given criterion.',
    'drag-drop': 'Drag each item into the correct category.',
    'venn': 'Assign each item to the correct region of the diagram.',
    'spot-error': 'Click on the segment that contains the error.',
  };
  return prompts[type] || 'Answer the question below.';
}

export function QuizTaker({ quiz, mode, sourceText, onRestart, runtimeSettings, quizTitle, inputMode, studysetId, taskId }: { quiz: Quiz; mode: QuizMode; sourceText: string; onRestart: () => void; runtimeSettings?: QuizRuntimeSettings; quizTitle?: string; inputMode?: 'literal' | 'research'; studysetId?: string; taskId?: string }) {
  const { toast } = useToast();
  const appContext = useContext(AppContext);
  const labels = QUIZ_NAV_LABELS[appContext?.language || 'en'] || QUIZ_NAV_LABELS.en;
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
  const [showSources, setShowSources] = useState(false);
  const [finalizedMap, setFinalizedMap] = useState<Record<string, boolean>>({});
  const [lastAnsweredQuestionId, setLastAnsweredQuestionId] = useState<string | null>(null);
  const [navMode, setNavMode] = useState<'circles' | 'progress'>('circles');
  const [notRelevantIds, setNotRelevantIds] = useState<Set<string>>(new Set());
  const [hintText, setHintText] = useState('');
  const [hintLoading, setHintLoading] = useState(false);
  const pendingAdvance = useRef(false);
  const circleRowRef = useRef<HTMLDivElement | null>(null);

  const effectiveMode: 'classic' | 'assisted' | 'adaptive' = mode === 'practice' ? 'classic' : mode;
  const adaptiveCap = Math.max(1, Math.min(50, Number(runtimeSettings?.adaptiveCap || 50)));
  const selectedTypes = runtimeSettings?.questionTypes?.length ? runtimeSettings.questionTypes : ['multiple-choice'];
  const adaptiveStorageKey = getAdaptiveStorageKey(sourceText, selectedTypes);
  const sessionStorageKey = getSessionStorageKey(sourceText, effectiveMode);
  // Feedback timing is independent of mode: 'immediate' locks the question and reveals
  // correctness right after checking; 'end' only reveals results on the summary screen.
  const feedbackImmediate = runtimeSettings?.answerFeedback === 'immediate';

  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const canAdvance = Boolean(currentQuestion && currentAnswer);

  useEffect(() => {
    setQuestionStartedAt(Date.now());
    setShowWhy(false);
    setWhyIncorrect('');
    setHintText('');
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

  // Auto-advance once buffer is ready (when user clicked Next while buffer was empty)
  useEffect(() => {
    if (!pendingAdvance.current || adaptiveBuffer.length === 0) return;
    pendingAdvance.current = false;
    const [next, ...rest] = adaptiveBuffer;
    setQuestions((prev) => [...prev, next]);
    setAdaptiveBuffer(rest);
    setCurrentIndex((prev) => prev + 1);
    setIsAnswered(false);
    setIsCurrentCorrect(null);
  }, [adaptiveBuffer]);

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

  useEffect(() => {
    const row = circleRowRef.current;
    if (!row) return;
    const active = row.querySelector<HTMLElement>(`[data-circle-idx="${currentIndex}"]`);
    active?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [currentIndex]);

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

  const loadHint = async () => {
    if (!currentQuestion || hintLoading || hintText) return;
    setHintLoading(true);
    try {
      const response = await fetch('/api/ai/handle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flowName: 'explainAnswer',
          model: 'gpt-5.4-mini',
          input: {
            question: currentQuestion.question,
            selectedAnswer: '',
            correctAnswer: getCorrectAnswerText(currentQuestion),
            isHint: true,
            sourceText,
          },
        }),
      });
      if (!response.ok) throw new Error('Could not generate hint');
      const payload = await response.json();
      setHintText(String(payload?.explanation || payload?.output?.explanation || '').trim() || 'No hint available for this question.');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not generate hint now.';
      setHintText(message);
    } finally {
      setHintLoading(false);
    }
  };

  const advanceQuestion = () => {
    if (!currentQuestion) return;
    if (effectiveMode === 'adaptive') {
      if (currentIndex >= questions.length - 1) {
        if (adaptiveBuffer.length > 0) {
          const [next, ...rest] = adaptiveBuffer;
          setQuestions((prev) => [...prev, next]);
          setAdaptiveBuffer(rest);
          setCurrentIndex((prev) => prev + 1);
          setIsAnswered(false);
          setIsCurrentCorrect(null);
          void ensureAdaptiveBuffer();
          return;
        }
        pendingAdvance.current = true;
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

  if (isFinished) return <QuizResults quiz={{ ...quiz, questions }} answers={answers} signals={adaptiveSignals} runtimeSettings={runtimeSettings} sourceText={sourceText} notRelevantIds={notRelevantIds} onRestart={onRestart} studysetId={studysetId} taskId={taskId} />;
  if (!currentQuestion) return <div className="flex h-full items-center justify-center"><Spinner /></div>;

  const revealCurrent = feedbackImmediate && finalizedMap[currentQuestion.id] === true;
  const progressPct = Math.round(((currentIndex + 1) / Math.max(1, questions.length)) * 100);
  const isLastQuestion = effectiveMode !== 'adaptive' && currentIndex >= questions.length - 1;

  const handleNext = () => {
    if (feedbackImmediate && !isAnswered) {
      if (canAdvance) {
        handleAnswerPress();
        // Don't advance yet — let user see feedback, they'll click Next/Check again
        return;
      }
      advanceQuestion();
      return;
    }
    if (!isAnswered && canAdvance) handleAnswerPress();
    advanceQuestion();
  };

  const showCheckLabel = feedbackImmediate && !isAnswered && canAdvance;
  const nextButtonLabel = showCheckLabel ? labels.check : isLastQuestion ? labels.finish : labels.next;

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
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-white dark:bg-card px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 sm:gap-1.5 text-[12px] sm:text-[13px] text-muted-foreground min-w-0">
          <span className="font-medium text-foreground shrink-0">Quiz</span>
          {quizTitle ? (
            <>
              <span className="shrink-0">/</span>
              <span className="max-w-[100px] sm:max-w-[160px] lg:max-w-[200px] truncate">{quizTitle}</span>
            </>
          ) : null}
        </div>

        {/* Right: circles or progress bar + toggle */}
        <div className="flex items-center gap-2 sm:gap-3 ml-2">
          {navMode === 'circles' ? (
            <div
              ref={circleRowRef}
              className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-[420px]"
            >
              {(effectiveMode === 'adaptive' ? questions.slice(0, currentIndex + 1) : questions)
                .map((q, idx) => ({ q, idx }))
                .filter(({ q }) => !notRelevantIds.has(q.id))
                .map(({ idx }) => {
                const state = getCircleState(idx);
                return (
                  <button
                    key={idx}
                    type="button"
                    data-circle-idx={idx}
                    onClick={() => handleJumpTo(idx)}
                    title={`Question ${idx + 1}`}
                    className={[
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] transition-all',
                      state === 'current'
                        ? 'bg-[var(--accent-brand)] text-white ring-2 ring-[var(--accent-brand)] ring-offset-1 ring-offset-background'
                        : state === 'answered'
                        ? 'bg-[var(--accent-brand)]/20 text-[var(--accent-brand)] border border-[var(--accent-brand)]/40'
                        : 'border border-border bg-muted text-muted-foreground hover:border-[var(--accent-brand)]/50',
                    ].join(' ')}
                  >
                    {idx + 1}
                  </button>
                );
              })}
              {effectiveMode === 'adaptive' && (
                <span
                  title="More questions to come"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-dashed border-[var(--accent-brand)]/50 text-[14px] text-[var(--accent-brand)]/70"
                >
                  ∞
                </span>
              )}
            </div>
          ) : (
            <span className="text-[13px] text-muted-foreground">
              Question <span className="text-foreground">{currentIndex + 1}</span> of {effectiveMode === 'adaptive' ? '∞' : questions.length}
            </span>
          )}

          {/* Toggle button */}
          <button
            type="button"
            onClick={() => setNavMode((prev) => (prev === 'circles' ? 'progress' : 'circles'))}
            title={navMode === 'circles' ? 'Switch to progress view' : 'Switch to circle view'}
            className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground shrink-0"
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
      <div className="flex-1 overflow-auto bg-muted/30">
        <div className="mx-auto max-w-[920px] px-5 sm:px-8 pt-8 sm:pt-10 pb-24">

          {/* Question card */}
          <div className="rounded-2xl border border-border bg-white dark:bg-card shadow-sm overflow-hidden">

            {/* Card header: number badge + type badge */}
            <div className="flex items-center gap-2 border-b border-border/60 bg-muted/20 px-6 sm:px-8 py-3.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-brand)] text-[11px] leading-none text-white">
                {currentIndex + 1}
              </span>
              <span className="flex items-center rounded-full bg-muted px-2 py-1 text-[10px] leading-none text-muted-foreground">
                {getTypeLabel(currentQuestion.type ?? 'multiple-choice')}
              </span>
            </div>

            <div className="px-7 sm:px-9 pt-8 pb-8">
              {/* Question text — skip for fill-blank/cloze with blanks to avoid duplicate */}
              {!(
                (currentQuestion.type === 'fill-blank' || currentQuestion.type === 'cloze') &&
                /_{3,}/.test(currentQuestion.question)
              ) && (
                <p className="mb-4 text-[19px] sm:text-[21px] leading-[1.6] text-foreground">
                  {currentQuestion.question.replace(/_{3,}/g, '____')}
                </p>
              )}

              {/* Sub-prompt */}
              <p className="mb-5 text-[13px] text-muted-foreground">
                {getTypePrompt(currentQuestion.type ?? 'multiple-choice')}
              </p>

              {/* Hint (assisted mode only, before answering) */}
              {effectiveMode === 'assisted' && !isAnswered && (
                <div className="mb-5">
                  {!hintText ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 px-3 text-[12px]"
                      onClick={loadHint}
                      disabled={hintLoading}
                    >
                      {hintLoading ? (
                        <Spinner size={14} />
                      ) : (
                        <Lightbulb className="h-3.5 w-3.5 opacity-70" strokeWidth={2} />
                      )}
                      {labels.hint}
                    </Button>
                  ) : (
                    <div className="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/30 px-3.5 py-2.5">
                      <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70" strokeWidth={2} />
                      <p className="text-[12.5px] leading-relaxed text-foreground/80">{hintText}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Media */}
              <MediaPrompt question={currentQuestion} />

              {/* Answer area */}
              <div className="mb-1">
                <QuestionView
                  question={currentQuestion}
                  answer={currentAnswer}
                  disabled={feedbackImmediate && isAnswered}
                  onChange={handleSetAnswer}
                  reveal={revealCurrent}
                  knowledgeScore={runtimeSettings?.knowledgeScore ?? 50}
                />
              </div>
            </div>
          </div>

          {/* ── Feedback overlay (cleaner, inside card bottom) ── */}
          {isAnswered && revealCurrent && lastAnsweredQuestionId === currentQuestion.id ? (
            <div className={`mt-3 rounded-2xl overflow-hidden shadow-sm border ${isCurrentCorrect ? 'border-emerald-200 dark:border-emerald-800' : 'border-red-200 dark:border-red-800'}`}>
              {/* Result bar */}
              <div className={`flex items-center gap-2.5 px-5 py-3 ${isCurrentCorrect ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${isCurrentCorrect ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                  {isCurrentCorrect ? <IconCheck size={9} strokeWidth={2.2} /> : <IconX size={9} strokeWidth={2.2} />}
                </span>
                <span className={`text-[14px] ${isCurrentCorrect ? 'text-emerald-800 dark:text-emerald-300' : 'text-red-700 dark:text-red-400'}`}>
                  {isCurrentCorrect ? 'Correct' : 'Incorrect'}
                </span>
              </div>

              {/* Answer comparison */}
              <div className={`px-5 py-4 bg-card`}>
                {!isCurrentCorrect && (
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="rounded-xl border border-red-100 dark:border-red-900/40 bg-red-50/30 dark:bg-red-900/10 px-4 py-3">
                      <p className="mb-1 text-[10px] text-muted-foreground">Your answer</p>
                      <p className="text-[13px] font-medium text-red-600 dark:text-red-400">{formatAnswer(currentQuestion, currentAnswer)}</p>
                    </div>
                    <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-900/10 px-4 py-3">
                      <p className="mb-1 text-[10px] text-muted-foreground">Correct answer</p>
                      <p className="text-[13px] font-medium text-emerald-700 dark:text-emerald-400">{getCorrectAnswerText(currentQuestion)}</p>
                    </div>
                  </div>
                )}

                {/* Explanation */}
                {showWhy && (
                  <div className="mb-3 rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
                    {whyIncorrectLoading && !whyIncorrect && !currentQuestion.explanation?.trim() ? (
                      <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                        <Spinner size={14} />
                        Generating explanation…
                      </div>
                    ) : (
                      <p className="text-[12.5px] leading-relaxed text-foreground/80">
                        {currentQuestion.explanation?.trim() || whyIncorrect || ''}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    className="text-[11.5px] font-medium text-muted-foreground hover:text-foreground hover:underline underline-offset-2"
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
                  <SourcesPill
                    data={{ citation: currentQuestion.citation, media: currentQuestion.media }}
                    onOpen={() => setShowSources(true)}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <SourcesSidebar
        open={showSources}
        onOpenChange={setShowSources}
        data={{ citation: currentQuestion?.citation, media: currentQuestion?.media }}
      />

      {/* ── Bottom nav ── full width, buttons at edges. flex-wrap + order so Previous/Next
          always share the first row and stay independently tappable on narrow screens;
          the optional Stop/Not-relevant buttons wrap to their own row instead of
          squeezing Previous/Next off-screen. */}
      <div className="shrink-0 border-t border-border bg-white dark:bg-card px-3 sm:px-5 py-3 sm:py-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">

          {/* Previous */}
          <Button
            type="button"
            variant="outline"
            className="relative order-1 h-10 shrink-0 ps-9 sm:ps-11 pe-3 sm:pe-5 text-[13px]"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
          >
            <span className="hidden sm:inline">{labels.previous}</span>
            <span className="pointer-events-none absolute inset-y-0 start-0 flex w-9 items-center justify-center rounded-l-lg bg-foreground/[0.06]">
              <ChevronLeft size={16} strokeWidth={2} className="opacity-50" aria-hidden="true" />
            </span>
          </Button>

          {/* Next / Finish */}
          <Button
            type="button"
            onClick={handleNext}
            className="relative order-2 h-10 shrink-0 ps-3 sm:ps-5 pe-9 sm:pe-11 text-[13px] font-medium bg-[var(--accent-brand)] text-white hover:opacity-90 sm:order-3"
          >
            {nextButtonLabel}
            <span className="pointer-events-none absolute inset-y-0 end-0 flex w-9 items-center justify-center rounded-r-lg bg-primary-foreground/15">
              <ChevronRight size={16} strokeWidth={2} className="opacity-70" aria-hidden="true" />
            </span>
          </Button>

          {/* Center: stop button (adaptive) or not-relevant — wraps to its own row on mobile */}
          {(effectiveMode === 'adaptive' || (inputMode === 'research' && !notRelevantIds.has(currentQuestion.id))) && (
          <div className="order-3 flex w-full shrink-0 basis-full items-center justify-center gap-2 sm:order-2 sm:w-auto sm:basis-auto sm:justify-start">
            {effectiveMode === 'adaptive' && (
              <Button
                type="button"
                variant="outline"
                className="h-10 px-4 sm:px-5 text-[13px] text-muted-foreground hover:text-foreground border-border"
                onClick={() => setIsFinished(true)}
                title="Stop and see results"
              >
                {labels.stop}
              </Button>
            )}
            {inputMode === 'research' && !notRelevantIds.has(currentQuestion.id) && (
              <Button
                type="button"
                variant="ghost"
                className="h-9 px-3 text-[12px] text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                onClick={handleNotRelevant}
                title="Mark as not relevant to your research"
              >
                <span className="hidden sm:inline">Not relevant</span>
                <span className="sm:hidden">Skip</span>
              </Button>
            )}
          </div>
          )}

        </div>
      </div>
    </div>
  );
}


