'use client';

import React from 'react';
import { ChevronLeft, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { Spinner } from '@/components/ui/spinner';
import type { ContentClassification } from '@/lib/tools/content-classifier';
import type { StudyMode } from '@/components/tools/flashcard-viewer';
import type { AppContextType } from '@/contexts/app-context';
import type { AdvancedToolSettings } from '@/lib/tools/advanced-settings-schema';

interface FlashcardTypeDefinition {
  value: string;
  label: string;
  description: string;
  requiresResearchMode?: boolean;
}

interface ModeOption {
  readonly value: StudyMode;
  readonly label: string;
  readonly description: string;
  readonly comingSoon: boolean;
}

interface StartSideOption {
  readonly value: 'term' | 'explanation';
  readonly label: string;
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
  cardStartSide: 'term' | 'explanation';
  setCardStartSide: (side: 'term' | 'explanation') => void;
  flashcardCount: number;
  setFlashcardCount: (count: number) => void;
  saveToRecents: boolean;
  setSaveToRecents: (save: boolean) => void;
  visibleCardTypes: FlashcardTypeDefinition[];
  enabledCardTypes: string[];
  toggleCardType: (value: string) => void;
  contentClass: ContentClassification | null;
  showCitations: boolean;
  setShowCitations: (value: boolean) => void;
  mnemonicHints: boolean;
  setMnemonicHints: (value: boolean) => void;
  activeRecallOnly: boolean;
  setActiveRecallOnly: (value: boolean) => void;
  interleavingMode: boolean;
  setInterleavingMode: (value: boolean) => void;
  semanticLinking: boolean;
  setSemanticLinking: (value: boolean) => void;
  errorTagging: boolean;
  setErrorTagging: (value: boolean) => void;
  memoryStrengthMeter: boolean;
  setMemoryStrengthMeter: (value: boolean) => void;
  isLoading: boolean;
  sourceText: string;
  modeOptions: readonly any[];
  startSideOptions: readonly any[];
  saveAdvancedSettingsPatch: (patch: Partial<AdvancedToolSettings>, context?: { tool?: string; isLiveGeneratedQuiz?: boolean }) => Promise<{ ok: boolean; conflicts?: any; error?: any }>;
  handleGenerate: (text: string) => Promise<void>;
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
  cardStartSide,
  setCardStartSide,
  flashcardCount,
  setFlashcardCount,
  saveToRecents,
  setSaveToRecents,
  visibleCardTypes,
  enabledCardTypes,
  toggleCardType,
  contentClass,
  showCitations,
  setShowCitations,
  mnemonicHints,
  setMnemonicHints,
  activeRecallOnly,
  setActiveRecallOnly,
  interleavingMode,
  setInterleavingMode,
  semanticLinking,
  setSemanticLinking,
  errorTagging,
  setErrorTagging,
  memoryStrengthMeter,
  setMemoryStrengthMeter,
  isLoading,
  sourceText,
  modeOptions,
  startSideOptions,
  saveAdvancedSettingsPatch,
  handleGenerate,
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

        {/* ── Left: Card Types accordion ── */}
        <div className="flex-1 overflow-y-auto bg-background m-3 rounded-lg">
          <div className="p-4 pb-2">
            <div className="flex items-center justify-between mb-2.5">
              <p className={S}>Card Types</p>
              <span className="text-[11px] text-muted-foreground">{enabledCardTypes.length} selected</span>
            </div>
          </div>

          <div className="mx-4 mb-4 rounded-lg border border-border/60 overflow-visible bg-card">
            {visibleCardTypes.map((typeDef, idx, arr) => {
              const isSelected = enabledCardTypes.includes(typeDef.value);
              const isFirst = idx === 0;
              const isLast = idx === arr.length - 1;
              return (
                <div
                  key={typeDef.value}
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleCardType(typeDef.value)}
                  onKeyDown={(e) => e.key === 'Enter' && toggleCardType(typeDef.value)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 cursor-pointer border-b border-border/40 last:border-b-0 transition-all ${isFirst ? 'rounded-t-lg' : ''} ${isLast ? 'rounded-b-lg' : ''} ${isSelected ? 'bg-[var(--accent-brand)]/10' : 'hover:bg-muted/40'}`}
                >
                  <div
                    className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                      isSelected
                        ? 'border-[var(--accent-brand)] bg-[var(--accent-brand)]'
                        : 'border-muted-foreground/25 hover:border-[var(--accent-brand)]/50'
                    }`}
                  >
                    {isSelected && <span className="block h-[6px] w-[6px] rounded-full bg-white" />}
                  </div>
                  <span className={`text-[13px] flex-1 ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {typeDef.label}
                  </span>
                  <InfoTooltip contentClassName="max-w-[224px]">
                    {typeDef.description}
                  </InfoTooltip>
                </div>
              );
            })}
          </div>
          <p className="mx-4 mb-4 text-[11px] text-muted-foreground/70">The AI picks the best-fitting type per card from your selection — cards stay as term/cue fragments, never phrased as quiz questions.</p>

          {/* Content classification tags */}
          {contentClass && (
            <div className="mx-4 mb-4 flex flex-wrap gap-1.5">
              {contentClass.vocabulary === 'y' && (
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-muted text-muted-foreground">Vocabulary</span>
              )}
              {contentClass.code === 'y' && (
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-muted text-muted-foreground">Code</span>
              )}
              {contentClass.processes === 'y' && (
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-muted text-muted-foreground">Processes</span>
              )}
              {contentClass.people === 'y' && (
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-muted text-muted-foreground">People</span>
              )}
              {contentClass.dates === 'y' && (
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-muted text-muted-foreground">Dates</span>
              )}
            </div>
          )}

          {/* Card extras: citations, hints */}
          <div className="mx-4 mb-4 rounded-lg border border-border/60 bg-card px-3 py-3 space-y-3">
            <p className={S}>Card Extras</p>

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-foreground">Source citations</p>
                <p className="text-[11px] text-muted-foreground">Show a small "i" on each card that reveals where its info came from</p>
              </div>
              <Switch
                checked={showCitations}
                onCheckedChange={(checked) => {
                  setShowCitations(checked);
                  void saveAdvancedSettingsPatch({ flashcards: { show_citations: checked } as any }, { tool: 'flashcards' });
                }}
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-foreground">Mnemonic hints</p>
                <p className="text-[11px] text-muted-foreground">Add a "Reveal hint" button with a simple memory aid (ezelsbruggetje) per card</p>
              </div>
              <Switch
                checked={mnemonicHints}
                onCheckedChange={(checked) => {
                  setMnemonicHints(checked);
                  void saveAdvancedSettingsPatch({ flashcards: { mnemonic_hints: checked } as any }, { tool: 'flashcards' });
                }}
              />
            </div>
          </div>

          {/* Advanced settings */}
          <div className="mx-4 mb-4 rounded-lg border border-border/60 bg-card px-3 py-3 space-y-2.5">
            <p className={S}>Advanced Options</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Active Recall Only</p>
                <Switch
                  checked={activeRecallOnly}
                  onCheckedChange={(checked) => {
                    setActiveRecallOnly(checked);
                    void saveAdvancedSettingsPatch({ flashcards: { active_recall_only: checked } as any }, { tool: 'flashcards' });
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Interleaving Mode</p>
                <Switch checked={interleavingMode} onCheckedChange={(checked) => {
                  setInterleavingMode(checked);
                  void saveAdvancedSettingsPatch({ flashcards: { interleaving_mode: checked } as any }, { tool: 'flashcards' });
                }} />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Semantic Linking</p>
                <Switch checked={semanticLinking} onCheckedChange={(checked) => {
                  setSemanticLinking(checked);
                  void saveAdvancedSettingsPatch({ flashcards: { semantic_linking: checked } as any }, { tool: 'flashcards' });
                }} />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Error Tagging</p>
                <Switch checked={errorTagging} onCheckedChange={(checked) => {
                  setErrorTagging(checked);
                  void saveAdvancedSettingsPatch({ flashcards: { error_tagging: checked } as any }, { tool: 'flashcards' });
                }} />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Memory Strength Meter</p>
                <Switch checked={memoryStrengthMeter} onCheckedChange={(checked) => {
                  setMemoryStrengthMeter(checked);
                  void saveAdvancedSettingsPatch({ flashcards: { memory_strength_meter: checked } as any }, { tool: 'flashcards' });
                }} />
              </div>
            </div>
          </div>
        </div>

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

            {/* Card Side */}
            <div className="rounded-lg border border-border/60 bg-card px-3 py-3 space-y-2.5">
              <div className="flex items-center justify-between gap-1">
                <p className={S}>Which side comes first?</p>
              </div>
              <div className="flex gap-1.5">
                {startSideOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setCardStartSide(option.value === 'explanation' ? 'explanation' : 'term')}
                    disabled={isLoading}
                    className={`flex-1 rounded-lg border px-2 py-1.5 text-[12px] transition-colors ${
                      cardStartSide === option.value
                        ? 'border-[var(--accent-brand)]/40 bg-[var(--accent-brand)]/10 text-[var(--accent-brand)]'
                        : 'border-border/30 bg-transparent text-muted-foreground hover:bg-muted/40'
                    }`}
                  >
                    {option.label}
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

            {/* Save to recents */}
            <div className="rounded-lg border border-border/60 bg-card px-3 py-3 flex items-center justify-between gap-3">
              <p className={S}>Save to Recents</p>
              <Switch
                checked={saveToRecents}
                onCheckedChange={setSaveToRecents}
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
