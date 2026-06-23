'use client';

import { BrainCircuit, ChevronDown, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { Spinner } from '@/components/ui/spinner';
import type { AppContextType } from '@/contexts/app-context';
import { isQuizTypeAvailable } from '@/lib/tools/content-classifier';
import type { ContentClassification } from '@/lib/tools/content-classifier';
import {
  QUIZ_TYPE_DEFINITIONS,
  DIFFICULTY_LABEL,
  DIFFICULTY_COLOR,
  type QuizMode,
  type AnswerFeedback,
  type Phase,
} from '@/lib/tools/quiz-shared';

interface QuizOptionsPanelProps {
  appContext: AppContextType | null;
  questionTypes: string[];
  mergedContentClass: ContentClassification | null;
  expandedTypes: Set<string>;
  toggleExpanded: (value: string) => void;
  toggleQuestionType: (value: string) => void;
  selectedVariants: Record<string, string[]>;
  toggleVariant: (typeValue: string, variantId: string) => void;
  title: string;
  setTitle: (value: string) => void;
  loading: boolean;
  knowledgeScore: number;
  setKnowledgeScore: (value: number) => void;
  mode: QuizMode;
  setMode: (value: QuizMode) => void;
  answerFeedback: AnswerFeedback;
  setAnswerFeedback: (value: AnswerFeedback) => void;
  questionCount: number;
  setQuestionCount: (value: number) => void;
  setPhase: (phase: Phase) => void;
  setSourceText: (value: string) => void;
  setImageDescription: (value: string | null) => void;
  setImageDataUri: (value: string | null) => void;
  sourceText: string;
  setLoading: (value: boolean) => void;
  handleGenerate: (compiledText: string) => void | Promise<void>;
}

export function QuizOptionsPanel({
  appContext,
  questionTypes,
  mergedContentClass,
  expandedTypes,
  toggleExpanded,
  toggleQuestionType,
  selectedVariants,
  toggleVariant,
  title,
  setTitle,
  loading,
  knowledgeScore,
  setKnowledgeScore,
  mode,
  setMode,
  answerFeedback,
  setAnswerFeedback,
  questionCount,
  setQuestionCount,
  setPhase,
  setSourceText,
  setImageDescription,
  setImageDataUri,
  sourceText,
  setLoading,
  handleGenerate,
}: QuizOptionsPanelProps) {
  // Profile name — same logic as WorkbenchShell breadcrumb
  const profileName = (() => {
    if (typeof window !== 'undefined') {
      const saved = String(window.localStorage.getItem('studyweb-display-name') || '').trim();
      if (saved) return saved;
    }
    const meta = appContext?.session?.user?.user_metadata as any;
    return String(meta?.display_name || meta?.full_name || appContext?.session?.user?.email?.split('@')[0] || 'User');
  })();

  const modeEntries = [
    { value: 'classic', label: 'Classic', desc: 'Answers revealed at the end' },
    { value: 'assisted', label: 'Assisted', desc: 'Feedback after each question' },
    { value: 'adaptive', label: 'Adaptive', desc: 'Automatically adjust difficulty' },
  ] as const;

  // shared section header style — slightly larger than body text, no bold/caps
  const S = 'text-[14px] text-foreground/90';

  return (
    <div className="h-full flex flex-col">

      {/* Breadcrumb — full-width, height = collapsed sidebar width (3.5rem), rounded-b-2xl */}
      <div className="shrink-0 w-full bg-sidebar rounded-b-2xl">
        <div className="flex min-h-[3.5rem] items-center gap-0 px-3 text-[13px] font-medium leading-none text-sidebar-foreground">
          <button
            type="button"
            className="text-sidebar-foreground/55 hover:text-[var(--accent-brand)] transition-colors"
            onClick={() => window.dispatchEvent(new Event('cautie:open-profile-menu'))}
          >
            {profileName}
          </button>
          <span className="mx-2 text-sidebar-foreground/25 select-none">/</span>
          <span className="inline-flex items-center gap-1.5 text-sidebar-foreground">
            <BrainCircuit className="h-3.5 w-3.5 text-sidebar-foreground/55" />
            Quiz
          </span>
        </div>
      </div>

      {/* Body: question types (left) + settings rail (right) */}
      <div className="flex flex-1 overflow-hidden bg-background">

        {/* ── Left: Question Types accordion ── */}
        <div className="flex-1 overflow-y-auto bg-background m-3 rounded-lg">
          <div className="p-4 pb-2">
            <div className="flex items-center justify-between mb-2.5">
              <p className={S}>Question Types</p>
              <span className="text-[11px] text-muted-foreground">{questionTypes.length} selected</span>
            </div>
          </div>

          <div className="mx-4 mb-4 rounded-lg border border-border/60 overflow-visible bg-card">
            {QUIZ_TYPE_DEFINITIONS.filter((t) => isQuizTypeAvailable(t.value, mergedContentClass)).map((typeDef, idx, arr) => {
              const isSelected = questionTypes.includes(typeDef.value);
              const isExpanded = expandedTypes.has(typeDef.value);
              const isFirst = idx === 0;
              const isLast = idx === arr.length - 1;

              return (
                <div key={typeDef.value} className={`${isFirst ? 'rounded-t-lg' : ''} ${isLast && !isExpanded ? 'rounded-b-lg' : ''}`}>
                  {/* Full-row click toggles the type */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleQuestionType(typeDef.value)}
                    onKeyDown={(e) => e.key === 'Enter' && toggleQuestionType(typeDef.value)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 cursor-pointer border-b border-border/40 last:border-b-0 transition-all ${isSelected ? 'bg-[var(--accent-brand)]/10' : 'hover:bg-muted/40'}`}
                  >
                    {/* Circle — visual indicator only, clicking row handles toggle */}
                    <div
                      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                        isSelected
                          ? 'border-[var(--accent-brand)] bg-[var(--accent-brand)]'
                          : 'border-muted-foreground/25 hover:border-[var(--accent-brand)]/50'
                      }`}
                    >
                      {isSelected && <span className="block h-[6px] w-[6px] rounded-full bg-white" />}
                    </div>

                    {/* Label only (description in info circle) */}
                    <span className={`text-[13px] flex-1 ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {typeDef.label}
                    </span>

                    {/* Info circle — shows description on click */}
                    <InfoTooltip contentClassName="max-w-[224px]">
                      {typeDef.description}
                    </InfoTooltip>

                    {/* Expand chevron — for variants, not description */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleExpanded(typeDef.value); }}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                    >
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {isExpanded && (
                    <div className={`border-t border-border/40 ${isLast ? 'rounded-b-lg overflow-hidden' : ''}`}>
                      {typeDef.variants.map((v) => {
                        const isVariantSelected = isSelected && (selectedVariants[typeDef.value] || []).includes(v.id);
                        return (
                          <div
                            key={v.id}
                            role="button"
                            tabIndex={isSelected ? 0 : -1}
                            onClick={(e) => { e.stopPropagation(); if (isSelected) toggleVariant(typeDef.value, v.id); }}
                            onKeyDown={(e) => e.key === 'Enter' && isSelected && toggleVariant(typeDef.value, v.id)}
                            className={`flex items-center gap-2.5 pl-9 pr-3 py-2 border-b last:border-b-0 border-border/30 transition-all ${isSelected ? 'cursor-pointer' : 'opacity-40'} ${isVariantSelected ? 'bg-[var(--accent-brand)]/[0.06]' : isSelected ? 'hover:bg-muted/40' : ''}`}
                          >
                            <div className={`flex h-[14px] w-[14px] shrink-0 rounded border-2 transition-all ${isVariantSelected ? 'border-[var(--accent-brand)] bg-[var(--accent-brand)]' : 'border-muted-foreground/30'}`}>
                              {isVariantSelected && <span className="m-auto block h-[5px] w-[5px] rounded-sm bg-white" />}
                            </div>
                            <span className={`text-[12px] flex-1 ${isVariantSelected ? 'text-foreground' : 'text-muted-foreground'}`}>{v.label}</span>
                            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${DIFFICULTY_COLOR[v.difficulty]}`}>
                              {DIFFICULTY_LABEL[v.difficulty]}
                            </span>
                          </div>
                        );
                      })}
                      <p className="px-3 py-2 text-[10px] text-muted-foreground/50">
                        Variant is chosen per question based on your knowledge level.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right rail: Settings ── */}
        <div className="w-[280px] shrink-0 bg-background m-3 ml-0 rounded-lg overflow-y-auto">
          <div className="p-3 space-y-3">

            {/* Title */}
            <div className="rounded-lg border border-border/60 bg-card px-3 py-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className={S}>Quiz title (optional)</p>
                <InfoTooltip contentClassName="max-w-[224px]">
                  Give your quiz a name. This appears in your results.
                </InfoTooltip>
              </div>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-8 text-[13px] border-border/30"
                placeholder="e.g. Chapter 4 — Photosynthesis"
                disabled={loading}
              />
            </div>

            {/* Knowledge Level */}
            <div className="rounded-lg border border-border/60 bg-card px-3 py-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className={S}>How much do you already know?</p>
              </div>
              <Slider
                value={[knowledgeScore]}
                onValueChange={([v]) => setKnowledgeScore(v)}
                min={0} max={100} step={1}
                disabled={loading}
              />
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Nothing</span><span>A lot</span>
              </div>
            </div>

            {/* Mode */}
            <div className="rounded-lg border border-border/60 bg-card px-3 py-3 space-y-2.5">
              <div className="flex items-center justify-between gap-1">
                <p className={S}>What mode do you want?</p>
                <InfoTooltip contentClassName="max-w-[200px]">
                  <p><span className="text-foreground">Classic</span> — all answers shown at the end.</p>
                  <p><span className="text-foreground">Assisted</span> — feedback after each question.</p>
                  <p><span className="text-foreground">Adaptive</span> — difficulty adjusts automatically.</p>
                </InfoTooltip>
              </div>
              <div className="space-y-1">
                {modeEntries.map((e) => (
                  <button
                    key={e.value}
                    type="button"
                    onClick={() => setMode(e.value)}
                    disabled={loading}
                    className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors text-[13px] border ${
                      mode === e.value
                        ? 'border-[var(--accent-brand)]/30 bg-[var(--accent-brand)]/10 text-foreground'
                        : 'border-transparent text-muted-foreground hover:bg-muted/40'
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${mode === e.value ? 'bg-[var(--accent-brand)]' : 'bg-muted-foreground/30'}`} />
                    <span>{e.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Answer Feedback */}
            <div className="rounded-lg border border-border/60 bg-card px-3 py-3 space-y-2.5">
              <div className="flex items-center justify-between gap-1">
                <p className={S}>When do you want feedback?</p>
                <InfoTooltip contentClassName="max-w-[200px]">
                  <p><span className="text-foreground">At the end</span> — see all answers after finishing.</p>
                  <p><span className="text-foreground">Immediately</span> — know if you're right after each question.</p>
                </InfoTooltip>
              </div>
              <div className="flex gap-1.5">
                {([
                  { value: 'end', label: 'At the end' },
                  { value: 'immediate', label: 'Immediately' },
                ] as const).map((e) => (
                  <button
                    key={e.value}
                    type="button"
                    onClick={() => setAnswerFeedback(e.value)}
                    disabled={loading}
                    className={`flex-1 rounded-lg border px-2 py-1.5 text-[12px] transition-colors ${
                      answerFeedback === e.value
                        ? 'border-[var(--accent-brand)]/40 bg-[var(--accent-brand)]/10 text-[var(--accent-brand)]'
                        : 'border-border/30 bg-transparent text-muted-foreground hover:bg-muted/40'
                    }`}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Questions */}
            <div className="rounded-lg border border-border/60 bg-card px-3 py-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className={S}>How many questions?</p>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-[var(--accent-brand)]">
                    {mode === 'adaptive' ? '∞' : questionCount}
                  </span>
                  <InfoTooltip contentClassName="max-w-[224px]">
                    {mode === 'adaptive' ? 'Unlimited in adaptive mode.' : 'Minimum 3, maximum 25. Adaptive mode overrides this to unlimited.'}
                  </InfoTooltip>
                </div>
              </div>
              <Slider
                value={[mode === 'adaptive' ? 12 : questionCount]}
                onValueChange={([v]) => mode !== 'adaptive' && setQuestionCount(v)}
                min={3} max={25} step={1}
                disabled={loading || mode === 'adaptive'}
              />
            </div>

          </div>
        </div>

      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-border/60 bg-background px-5 py-3.5 flex justify-between items-center gap-3">
        <Button
          variant="outline"
          className="relative h-9 ps-10 pe-4 text-[13px]"
          onClick={() => {
            setPhase('input');
            setSourceText('');
            setTitle('');
            setImageDescription(null);
            setImageDataUri(null);
          }}
        >
          Back
          <span className="pointer-events-none absolute inset-y-0 start-0 flex w-8 items-center justify-center rounded-l-lg bg-foreground/[0.06]">
            <ChevronLeft size={14} strokeWidth={2} className="opacity-50" aria-hidden="true" />
          </span>
        </Button>
        <Button
          className="h-9 bg-[var(--accent-brand)] px-5 text-[13px] text-white hover:opacity-90"
          onClick={() => {
            setLoading(true);
            handleGenerate(sourceText);
            setPhase('study');
          }}
          disabled={loading || !sourceText.trim()}
        >
          {loading ? (
            <><Spinner size={14} className="mr-2" />Generating...</>
          ) : (
            <><BrainCircuit className="mr-2 h-3.5 w-3.5" />Generate Quiz</>
          )}
        </Button>
      </div>
    </div>
  );
}
