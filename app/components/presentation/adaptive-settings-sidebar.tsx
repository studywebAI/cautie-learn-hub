import { useMemo, useState } from 'react';
import { Lock, LockOpen } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PillSelector } from '@/components/tools/pill-selector';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ControlTier, PresentationUiConfig, RelevantControlKey, SourceAnalysis } from '@/lib/presentation/types';

type AdaptiveSettingsSidebarProps = {
  analysis: SourceAnalysis | null;
  autoMode: boolean;
  onAutoModeChange: (next: boolean) => void;
  customTitle: string;
  onTitleChange: (next: string) => void;
  platform: 'powerpoint' | 'google-slides' | 'keynote';
  onPlatformChange: (next: 'powerpoint' | 'google-slides' | 'keynote') => void;
  uiConfig: Partial<PresentationUiConfig>;
  onPatch: (patch: Partial<PresentationUiConfig>) => void;
  controlTiers?: {
    primary: RelevantControlKey[];
    secondary: RelevantControlKey[];
    advanced: RelevantControlKey[];
  } | null;
  lockedControls?: RelevantControlKey[];
  onToggleLock?: (key: RelevantControlKey) => void;
  disabled?: boolean;
};

const platformOptions = [
  { value: 'powerpoint', label: 'PowerPoint' },
  { value: 'google-slides', label: 'Google Slides' },
  { value: 'keynote', label: 'Keynote' },
];
const toneOptions = [
  { value: 'academic', label: 'Academic' },
  { value: 'professional', label: 'Professional' },
  { value: 'simple', label: 'Simple' },
  { value: 'persuasive', label: 'Persuasive' },
];
const densityOptions = [
  { value: 'light', label: 'Light' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'dense', label: 'Dense' },
];
const audienceOptions = [
  { value: 'middle_school', label: 'Middle school' },
  { value: 'high_school', label: 'High school' },
  { value: 'university', label: 'University' },
  { value: 'professional', label: 'Professional' },
  { value: 'general', label: 'General' },
];
const goalOptions = [
  { value: 'teach', label: 'Teach' },
  { value: 'study', label: 'Study' },
  { value: 'report', label: 'Report' },
  { value: 'pitch', label: 'Pitch' },
  { value: 'summarize', label: 'Summarize' },
  { value: 'training', label: 'Training' },
  { value: 'demo', label: 'Demo' },
];
const imageOptions = [
  { value: 'none', label: 'None' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'source_only', label: 'Source only' },
  { value: 'internet_allowed', label: 'Internet allowed' },
];
const citationOptions = [
  { value: 'off', label: 'Off' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'strict', label: 'Strict' },
];
const chartOptions = [
  { value: 'auto', label: 'Auto' },
  { value: 'chart_first', label: 'Chart first' },
  { value: 'table_first', label: 'Table first' },
];
const captionOptions = [
  { value: 'short', label: 'Short' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'detailed', label: 'Detailed' },
];
const layoutOptions = [
  { value: 'mixed', label: 'Mixed' },
  { value: 'visual_first', label: 'Visual first' },
  { value: 'text_first', label: 'Text first' },
];

function LockButton(props: {
  control: RelevantControlKey;
  locked: boolean;
  onToggle?: (key: RelevantControlKey) => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-6 w-6"
      onClick={() => props.onToggle?.(props.control)}
      title={props.locked ? 'Unlock setting for AI tuning' : 'Lock setting so AI cannot override'}
    >
      {props.locked ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5 text-muted-foreground" />}
    </Button>
  );
}

export function AdaptiveSettingsSidebar({
  analysis,
  autoMode,
  onAutoModeChange,
  customTitle,
  onTitleChange,
  platform,
  onPlatformChange,
  uiConfig,
  onPatch,
  controlTiers,
  lockedControls = [],
  onToggleLock,
  disabled = false,
}: AdaptiveSettingsSidebarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const locked = useMemo(() => new Set(lockedControls), [lockedControls]);
  const hasAnalysis = Boolean(analysis);
  const tiers = controlTiers || {
    primary: analysis?.relevantControls || [],
    secondary: [],
    advanced: [],
  };

  const inTier = (key: RelevantControlKey, tier: ControlTier) =>
    tiers[tier]?.includes(key) || (!hasAnalysis && tier === 'primary');

  return (
    <>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Title</p>
        <input
          type="text"
          value={customTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="e.g. Biology Chapter 3"
          className="h-8 w-full rounded-md border border-sidebar-border bg-sidebar-accent/70 px-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          disabled={disabled}
        />
      </div>

      <PillSelector
        label="Platform"
        options={platformOptions}
        value={platform}
        onChange={(v) => onPlatformChange(v as 'powerpoint' | 'google-slides' | 'keynote')}
        disabled={disabled}
      />

      <div className="flex items-center justify-between rounded-xl bg-sidebar-accent/40 p-2.5">
        <div>
          <p className="text-xs">Auto mode</p>
          <p className="text-[11px] text-muted-foreground">Request 1 preselects relevant settings</p>
        </div>
        <Switch checked={autoMode} onCheckedChange={onAutoModeChange} />
      </div>

      {analysis && (
        <Card className="border border-sidebar-border/60 bg-sidebar-accent/45">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">AI analysis</CardTitle>
            <CardDescription>
              {analysis.dominantArchetype.replace(/_/g, ' ')} • {analysis.contentMode.replace(/_/g, ' ')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5 text-xs">
            <p>Audience: {analysis.audienceGuess || 'general'}</p>
            <p>Recommended slides: {analysis.recommendedSlideCountMin}-{analysis.recommendedSlideCountMax}</p>
            <p>Visual potential: {analysis.visualPotential}</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2 rounded-xl border border-sidebar-border/50 bg-sidebar-accent/30 p-2.5">
        <p className="text-xs font-medium">Important settings</p>

        {inTier('audience', 'primary') && (
          <div className="space-y-1">
            <div className="flex items-center justify-end">
              <LockButton control="audience" locked={locked.has('audience')} onToggle={onToggleLock} />
            </div>
            <PillSelector
              label="Audience"
              options={audienceOptions}
              value={String(uiConfig.audience || 'general')}
              onChange={(v) => onPatch({ audience: v as PresentationUiConfig['audience'] })}
              disabled={disabled}
            />
          </div>
        )}
        {inTier('goal', 'primary') && (
          <div className="space-y-1">
            <div className="flex items-center justify-end">
              <LockButton control="goal" locked={locked.has('goal')} onToggle={onToggleLock} />
            </div>
            <PillSelector
              label="Goal"
              options={goalOptions}
              value={String(uiConfig.goal || 'teach')}
              onChange={(v) => onPatch({ goal: v as PresentationUiConfig['goal'] })}
              disabled={disabled}
            />
          </div>
        )}
        {inTier('tone', 'primary') && (
          <PillSelector
            label="Tone"
            options={toneOptions}
            value={String(uiConfig.tone || 'professional')}
            onChange={(v) => onPatch({ tone: v as PresentationUiConfig['tone'] })}
            disabled={disabled}
          />
        )}
        {inTier('density', 'primary') && (
          <PillSelector
            label="Content density"
            options={densityOptions}
            value={String(uiConfig.density || 'balanced')}
            onChange={(v) => onPatch({ density: v as PresentationUiConfig['density'] })}
            disabled={disabled}
          />
        )}
        {inTier('imageRichness', 'primary') && (
          <PillSelector
            label="Image richness"
            options={imageOptions}
            value={String(uiConfig.imageRichness || 'medium')}
            onChange={(v) => onPatch({ imageRichness: v as PresentationUiConfig['imageRichness'] })}
            disabled={disabled}
          />
        )}
        {inTier('slideCount', 'primary') && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Slides</p>
              <span className="text-xs font-mono tabular-nums">{uiConfig.slideCount || 10}</span>
            </div>
            <Slider
              value={[uiConfig.slideCount || 10]}
              onValueChange={([v]) => onPatch({ slideCount: v })}
              min={3}
              max={30}
              step={1}
              disabled={disabled}
            />
          </div>
        )}
      </div>

      <div className="space-y-2 rounded-xl border border-sidebar-border/50 bg-sidebar-accent/25 p-2.5">
        <p className="text-xs font-medium">Also relevant</p>
        {inTier('speakerNotes', 'secondary') && (
          <div className="flex items-center justify-between">
            <p className="text-xs">Include speaker notes</p>
            <Switch checked={Boolean(uiConfig.includeSpeakerNotes)} onCheckedChange={(v) => onPatch({ includeSpeakerNotes: v })} />
          </div>
        )}
        {inTier('summary', 'secondary') && (
          <div className="flex items-center justify-between">
            <p className="text-xs">Include summary</p>
            <Switch checked={Boolean(uiConfig.includeSummary)} onCheckedChange={(v) => onPatch({ includeSummary: v })} />
          </div>
        )}
        {inTier('quiz', 'secondary') && (
          <div className="flex items-center justify-between">
            <p className="text-xs">Include quiz</p>
            <Switch checked={Boolean(uiConfig.includeQuiz)} onCheckedChange={(v) => onPatch({ includeQuiz: v })} />
          </div>
        )}
        {inTier('qa', 'secondary') && (
          <div className="flex items-center justify-between">
            <p className="text-xs">Include Q&A</p>
            <Switch checked={Boolean(uiConfig.includeQA)} onCheckedChange={(v) => onPatch({ includeQA: v })} />
          </div>
        )}
        {inTier('agenda', 'secondary') && (
          <div className="flex items-center justify-between">
            <p className="text-xs">Include agenda</p>
            <Switch checked={Boolean(uiConfig.includeAgenda)} onCheckedChange={(v) => onPatch({ includeAgenda: v })} />
          </div>
        )}
      </div>

      <div className="space-y-2 rounded-xl bg-sidebar-accent/20 p-2.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium">Advanced</p>
          <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setShowAdvanced((v) => !v)}>
            {showAdvanced ? 'Hide' : 'Show'}
          </Button>
        </div>
        {showAdvanced && (
          <div className="space-y-2">
            <PillSelector
              label="Citations"
              options={citationOptions}
              value={String(uiConfig.citations || 'minimal')}
              onChange={(v) => onPatch({ citations: v as PresentationUiConfig['citations'] })}
              disabled={disabled}
            />
            <PillSelector
              label="Chart preference"
              options={chartOptions}
              value={String(uiConfig.chartPreference || 'auto')}
              onChange={(v) => onPatch({ chartPreference: v as PresentationUiConfig['chartPreference'] })}
              disabled={disabled}
            />
            <PillSelector
              label="Caption style"
              options={captionOptions}
              value={String(uiConfig.captionStyle || 'balanced')}
              onChange={(v) => onPatch({ captionStyle: v as PresentationUiConfig['captionStyle'] })}
              disabled={disabled}
            />
            <PillSelector
              label="Layout style"
              options={layoutOptions}
              value={String(uiConfig.layoutStyle || 'mixed')}
              onChange={(v) => onPatch({ layoutStyle: v as PresentationUiConfig['layoutStyle'] })}
              disabled={disabled}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs">Include references</p>
              <Switch checked={Boolean(uiConfig.includeReferences)} onCheckedChange={(v) => onPatch({ includeReferences: v })} />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs">Include appendix</p>
              <Switch checked={Boolean(uiConfig.includeAppendix)} onCheckedChange={(v) => onPatch({ includeAppendix: v })} />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs">Step-by-step mode</p>
              <Switch checked={Boolean(uiConfig.stepByStep)} onCheckedChange={(v) => onPatch({ stepByStep: v })} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
