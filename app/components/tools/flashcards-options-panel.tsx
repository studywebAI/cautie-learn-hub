'use client';

import React from 'react';
import { ChevronLeft, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { Spinner } from '@/components/ui/spinner';
import type { StudyMode } from '@/components/tools/flashcard-viewer';
import type { AppContextType } from '@/contexts/app-context';
import type { AdvancedToolSettings } from '@/lib/tools/advanced-settings-schema';

interface ModeOption {
  readonly value: StudyMode;
  readonly label: string;
  readonly description: string;
  readonly comingSoon: boolean;
}

interface FlashcardsOptionsPanelProps {
  appContext: AppContextType | null;
  profileName: string;
  phase: 'input' | 'options' | 'study';
  setPhase: (phase: 'input' | 'options' | 'study') => void;
  setSourceText: (text: string) => void;
  customTitle: string;
  setCustomTitle: (title: string) => void;
  knowledgeScore: number;
  setKnowledgeScore: (value: number) => void;
  practiceMode: 'classic' | 'assisted' | 'adaptive';
  setPracticeMode: (mode: 'classic' | 'assisted' | 'adaptive') => void;
  studyMode: StudyMode;
  setStudyMode: (mode: StudyMode) => void;
  flashcardCount: number;
  setFlashcardCount: (count: number) => void;
  isLoading: boolean;
  sourceText: string;
  modeOptions: readonly any[];
  saveAdvancedSettingsPatch: (patch: Partial<AdvancedToolSettings>, context?: { tool?: string; isLiveGeneratedQuiz?: boolean }) => Promise<{ ok: boolean; conflicts?: any; error?: any }>;
  handleGenerate: (text: string) => Promise<void>;
  autoGenerateTitle: (text: string) => string;
}

export function FlashcardsOptionsPanel({
  appContext,
  profileName,
  phase,
  setPhase,
  setSourceText,
  customTitle,
  setCustomTitle,
  knowledgeScore,
  setKnowledgeScore,
  practiceMode,
  setPracticeMode,
  studyMode,
  setStudyMode,
  flashcardCount,
  setFlashcardCount,
  isLoading,
  sourceText,
  modeOptions,
  saveAdvancedSettingsPatch,
  handleGenerate,
  autoGenerateTitle,
}: FlashcardsOptionsPanelProps) {
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
            <Copy className="h-3.5 w-3.5 text-sidebar-foreground/55" />
            Flashcards
          </span>
        </div>
      </div>

      {/* Body: card types (left) + settings rail (right) */}
      <div className="flex flex-1 overflow-hidden bg-background">

        {/* ── Left: Empty (reserved for future use) ── */}
        <div className="flex-1 overflow-y-auto bg-background m-3 rounded-lg" />

        {/* ── Right rail: Settings ── */}
        <div className="w-[280px] shrink-0 bg-background m-3 ml-0 rounded-lg overflow-y-auto">
          <div className="p-3 space-y-3">

            {/* Title */}
            <div className="rounded-lg border border-border/60 bg-card px-3 py-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className={S}>Flashcards title (optional)</p>
                <InfoTooltip contentClassName="max-w-[224px]">
                  Give your flashcard set a name. This appears in your results.
                </InfoTooltip>
              </div>
              <Input
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="h-8 text-[13px] border-border/30"
                placeholder="e.g. Chapter 4 — Photosynthesis"
                disabled={isLoading}
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
                disabled={isLoading}
              />
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Nothing</span><span>A lot</span>
              </div>
            </div>

            {/* Practice Mode — mirrors quiz's classic/assisted/adaptive triad */}
            <div className="rounded-lg border border-border/60 bg-card px-3 py-3 space-y-2.5">
              <div className="flex items-center justify-between gap-1">
                <p className={S}>Welke modus wil je?</p>
                <InfoTooltip contentClassName="max-w-[200px]">
                  <p><span className="text-foreground">Classic</span> — studeer de set eenmaal, geen extra hulp.</p>
                  <p><span className="text-foreground">Assisted</span> — hints en ezelsbruggetjes onderweg.</p>
                  <p><span className="text-foreground">Adaptive</span> — AI mengt vraagtypen, onbeperkt.</p>
                </InfoTooltip>
              </div>
              <div className="space-y-1">
                {([
                  { value: 'classic', label: 'Classic' },
                  { value: 'assisted', label: 'Assisted' },
                  { value: 'adaptive', label: 'Adaptive' },
                ] as const).map((e) => (
                  <button
                    key={e.value}
                    type="button"
                    onClick={() => setPracticeMode(e.value)}
                    disabled={isLoading}
                    className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors text-[13px] border ${
                      practiceMode === e.value
                        ? 'border-[var(--accent-brand)]/30 bg-[var(--accent-brand)]/10 text-foreground'
                        : 'border-transparent text-muted-foreground hover:bg-muted/40'
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${practiceMode === e.value ? 'bg-[var(--accent-brand)]' : 'bg-muted-foreground/30'}`} />
                    <span>{e.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Question Type — Quizlet-native interaction formats */}
            <div className="rounded-lg border border-border/60 bg-card px-3 py-3 space-y-2.5">
              <div className="flex items-center justify-between gap-1">
                <p className={S}>Welk vraagtype wil je?</p>
                <InfoTooltip contentClassName="max-w-[200px]">
                  {modeOptions.map((option) => (
                    <p key={option.value}><span className="text-foreground">{option.label}</span> — {option.description}</p>
                  ))}
                </InfoTooltip>
              </div>
              <div className="space-y-1">
                {modeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => !option.comingSoon && setStudyMode(option.value)}
                    disabled={isLoading || option.comingSoon}
                    className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors text-[13px] border ${
                      option.comingSoon
                        ? 'border-transparent text-muted-foreground/40 cursor-not-allowed'
                        : studyMode === option.value
                          ? 'border-[var(--accent-brand)]/30 bg-[var(--accent-brand)]/10 text-foreground'
                          : 'border-transparent text-muted-foreground hover:bg-muted/40'
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${!option.comingSoon && studyMode === option.value ? 'bg-[var(--accent-brand)]' : 'bg-muted-foreground/30'}`} />
                    <span className="flex-1">{option.label}</span>
                    {option.comingSoon && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground/70">Soon</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Card Count */}
            <div className="rounded-lg border border-border/60 bg-card px-3 py-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className={S}>How many cards?</p>
                <span className="text-[13px] font-medium text-[var(--accent-brand)]">{flashcardCount}</span>
              </div>
              <Slider
                value={[flashcardCount]}
                onValueChange={([v]) => setFlashcardCount(v)}
                min={1} max={50} step={1}
                disabled={isLoading}
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
            setCustomTitle('');
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
            if (!customTitle.trim()) {
              setCustomTitle(autoGenerateTitle(sourceText));
            }
            setPhase('study');
            void handleGenerate(sourceText);
          }}
          disabled={isLoading || !sourceText.trim()}
        >
          {isLoading ? (
            <><Spinner size={14} className="mr-2" />Generating...</>
          ) : (
            <><Copy className="mr-2 h-3.5 w-3.5" />Generate Flashcards</>
          )}
        </Button>
      </div>
    </div>
  );
}
