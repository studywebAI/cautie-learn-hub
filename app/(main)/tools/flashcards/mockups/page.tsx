'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  Lightbulb,
  ChevronsLeftRight,
  ArrowLeftRight,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Quote,
  Sparkles,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN-REVIEW GALLERY — not the live tool. Pure layout/interaction comparisons
// for the "card style" and "type the answer" concepts discussed for flashcards.
// Same content repeated across variants on purpose, so only the LAYOUT differs —
// theme/colors/tokens are the existing design system throughout (surface-panel,
// surface-interactive, surface-chip, border-border, text-foreground/muted-foreground).
// ─────────────────────────────────────────────────────────────────────────────

const SAMPLE = {
  term: 'Mitochondria',
  explanation: 'The organelle that converts nutrients into usable energy (ATP) for the cell.',
  source: 'In eukaryotic cells, the mitochondria acts as the powerhouse, converting nutrients into ATP through cellular respiration.',
  mnemonic: '"Mighty-condria" — the MIGHTY powerhouse that keeps the cell running.',
  clozeBefore: 'In eukaryotic cells, the ',
  clozeBlank: 'mitochondria',
  clozeAfter: ' acts as the powerhouse, converting nutrients into usable energy.',
  bankOptions: ['mitochondria', 'nucleus', 'ribosome', 'cytoplasm'],
  pair: { kind: 'Date → Event', a: '1969', b: 'Apollo 11 moon landing' },
};

function VariantCard({ name, hint, children }: { name: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 surface-panel p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-foreground">{name}</p>
        <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full surface-chip text-muted-foreground">{hint}</span>
      </div>
      <div className="rounded-xl border border-border/50 surface-interactive p-5 min-h-[208px] flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

function VariantGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{children}</div>;
}

function CategoryIntro({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground max-w-2xl">{children}</p>;
}

// ─── STANDARD (term ⇄ explanation) ──────────────────────────────────────────

function StandardCenteredFlip() {
  const [flipped, setFlipped] = useState(false);
  return (
    <div className="w-full flex flex-col items-center gap-3 cursor-pointer" onClick={() => setFlipped((v) => !v)}>
      <div className="w-full rounded-xl border border-border/70 surface-panel px-6 py-8 text-center">
        <p className="text-lg font-medium text-foreground">{flipped ? SAMPLE.explanation : SAMPLE.term}</p>
      </div>
      <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <ChevronsLeftRight className="h-3 w-3" /> Tap card to flip
      </span>
    </div>
  );
}

function StandardStackedReveal() {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="w-full space-y-3">
      <div className="rounded-xl border border-border/70 surface-panel px-5 py-4">
        <p className="text-[10px] uppercase tracking-[0.5px] text-muted-foreground mb-1">Term</p>
        <p className="text-base font-medium text-foreground">{SAMPLE.term}</p>
      </div>
      <div className="border-t border-dashed border-border/60" />
      {revealed ? (
        <div className="rounded-xl surface-chip px-5 py-4">
          <p className="text-[10px] uppercase tracking-[0.5px] text-muted-foreground mb-1">Explanation</p>
          <p className="text-sm text-foreground">{SAMPLE.explanation}</p>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="rounded-full w-full" onClick={() => setRevealed(true)}>
          Reveal answer
        </Button>
      )}
    </div>
  );
}

function StandardFieldPairBadge() {
  const [pairKind, setPairKind] = useState<'Term → Explanation' | 'Explanation → Term'>('Term → Explanation');
  const [revealed, setRevealed] = useState(false);
  const lead = pairKind === 'Term → Explanation' ? SAMPLE.term : SAMPLE.explanation;
  const trail = pairKind === 'Term → Explanation' ? SAMPLE.explanation : SAMPLE.term;
  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] px-2.5 py-1 rounded-full surface-chip text-muted-foreground">{pairKind}</span>
        <button
          type="button"
          onClick={() => { setPairKind((p) => (p === 'Term → Explanation' ? 'Explanation → Term' : 'Term → Explanation')); setRevealed(false); }}
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeftRight className="h-3 w-3" /> Swap sides
        </button>
      </div>
      <div className="rounded-xl border border-border/70 surface-panel px-5 py-4 text-center cursor-pointer" onClick={() => setRevealed((v) => !v)}>
        <p className={cn('leading-snug', revealed ? 'text-sm text-muted-foreground' : 'text-base font-medium text-foreground')}>{lead}</p>
        {revealed && <p className="text-base font-medium text-foreground mt-2">{trail}</p>}
      </div>
      <p className="text-[11px] text-muted-foreground text-center">AI tags each card's field pair (term/explanation, date/event…) — you choose which side leads.</p>
    </div>
  );
}

function StandardCompactRow() {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="w-full space-y-2">
      <div
        className="flex items-center gap-3 rounded-xl border border-border/70 surface-panel px-4 py-3 cursor-pointer"
        onClick={() => setRevealed((v) => !v)}
      >
        <span className="shrink-0 text-sm font-medium text-foreground px-3 py-1.5 rounded-lg surface-chip">{SAMPLE.term}</span>
        <span className="flex-1 text-sm text-muted-foreground truncate">
          {revealed ? SAMPLE.explanation : '••••••••••••••••••••••••••••'}
        </span>
        <ChevronRight className={cn('h-4 w-4 text-muted-foreground transition-transform', revealed && 'rotate-90')} />
      </div>
      <p className="text-[11px] text-muted-foreground">Dense row layout — built for fast scan-through of long decks.</p>
    </div>
  );
}

// ─── CLOZE (fill the blank) ──────────────────────────────────────────────────

function ClozeInlineBlank() {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="w-full text-center space-y-3">
      <p className="text-base leading-relaxed text-foreground">
        {SAMPLE.clozeBefore}
        <span
          onClick={() => setRevealed((v) => !v)}
          className={cn(
            'inline-block px-2 mx-0.5 rounded-md cursor-pointer border-b-2 border-dashed transition-colors',
            revealed ? 'border-transparent surface-chip text-foreground font-medium' : 'border-muted-foreground/50 text-transparent surface-interactive select-none'
          )}
        >
          {revealed ? SAMPLE.clozeBlank : '••••••••••••'}
        </span>
        {SAMPLE.clozeAfter}
      </p>
      <p className="text-[11px] text-muted-foreground">Click the blank to reveal the word in place — keeps full sentence context.</p>
    </div>
  );
}

function ClozeWordBank() {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <div className="w-full text-center space-y-4">
      <p className="text-base leading-relaxed text-foreground">
        {SAMPLE.clozeBefore}
        <span className="inline-block px-3 mx-0.5 rounded-md surface-chip text-muted-foreground border-b-2 border-dashed border-muted-foreground/50">
          {picked ?? '_____'}
        </span>
        {SAMPLE.clozeAfter}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {SAMPLE.bankOptions.map((opt) => {
          const isPicked = picked === opt;
          const isCorrect = opt === SAMPLE.clozeBlank;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => setPicked(opt)}
              className={cn(
                'px-3 py-1.5 text-xs rounded-lg border transition-colors',
                isPicked
                  ? isCorrect
                    ? 'border-foreground/30 surface-chip text-foreground'
                    : 'border-foreground/30 surface-chip text-muted-foreground line-through'
                  : 'border-transparent bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ClozeTypeIn() {
  const [value, setValue] = useState('');
  const [checked, setChecked] = useState(false);
  const correct = value.trim().toLowerCase() === SAMPLE.clozeBlank;
  return (
    <div className="w-full text-center space-y-3">
      <p className="text-base leading-relaxed text-foreground">
        {SAMPLE.clozeBefore}
        <span className="inline-flex items-baseline mx-1 align-baseline">
          <input
            value={value}
            onChange={(e) => { setValue(e.target.value); setChecked(false); }}
            placeholder="type the word"
            className="w-32 bg-transparent border-b-2 border-muted-foreground/50 focus:border-foreground/60 outline-none text-center text-sm placeholder:text-muted-foreground/50 px-1 py-0.5 transition-colors"
          />
        </span>
        {SAMPLE.clozeAfter}
      </p>
      <div className="flex items-center justify-center gap-2">
        <Button size="sm" variant="outline" className="rounded-full h-7 text-xs" onClick={() => setChecked(true)} disabled={!value.trim()}>
          Check
        </Button>
        {checked && (
          <span className={cn('inline-flex items-center gap-1 text-xs', correct ? 'text-foreground' : 'text-muted-foreground')}>
            {correct ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
            {correct ? 'Correct' : `Answer: ${SAMPLE.clozeBlank}`}
          </span>
        )}
      </div>
    </div>
  );
}

function ClozeProgressive() {
  const blanks = ['eukaryotic', 'mitochondria', 'ATP'];
  const [revealedCount, setRevealedCount] = useState(0);
  return (
    <div className="w-full text-center space-y-3">
      <p className="text-sm leading-relaxed text-foreground text-left">
        In <Blank word={blanks[0]} show={revealedCount > 0} /> cells, the <Blank word={blanks[1]} show={revealedCount > 1} /> acts
        as the powerhouse, converting nutrients into <Blank word={blanks[2]} show={revealedCount > 2} />.
      </p>
      <div className="flex items-center justify-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="rounded-full h-7 text-xs"
          onClick={() => setRevealedCount((c) => Math.min(blanks.length, c + 1))}
          disabled={revealedCount >= blanks.length}
        >
          Reveal next blank
        </Button>
        <span className="text-[11px] text-muted-foreground">{revealedCount} / {blanks.length} revealed</span>
      </div>
    </div>
  );
}

function Blank({ word, show }: { word: string; show: boolean }) {
  return (
    <span className={cn('inline-block px-1.5 mx-0.5 rounded surface-chip', show ? 'text-foreground font-medium' : 'text-transparent select-none')}>
      {show ? word : '•'.repeat(word.length)}
    </span>
  );
}

// ─── CONTEXT (surrounding source shown) ─────────────────────────────────────

function ContextStrip() {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="w-full space-y-3">
      <div className="flex items-start gap-2 rounded-lg surface-chip px-3 py-2">
        <Quote className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground italic leading-relaxed">{SAMPLE.source}</p>
      </div>
      <div
        className="rounded-xl border border-border/70 surface-panel px-5 py-4 text-center cursor-pointer"
        onClick={() => setRevealed((v) => !v)}
      >
        <p className="text-base font-medium text-foreground">{SAMPLE.term}</p>
        {revealed && <p className="text-sm text-muted-foreground mt-2">{SAMPLE.explanation}</p>}
      </div>
    </div>
  );
}

function ContextHighlightedPassage() {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="w-full text-center space-y-3 cursor-pointer" onClick={() => setRevealed((v) => !v)}>
      <p className="text-sm leading-relaxed text-foreground">
        {SAMPLE.clozeBefore}
        <span className={cn('inline-block px-1.5 mx-0.5 rounded font-medium transition-colors', revealed ? 'surface-chip text-foreground' : 'border-b-2 border-dashed border-muted-foreground/50 text-transparent select-none')}>
          {revealed ? SAMPLE.clozeBlank : '••••••••••••'}
        </span>
        {SAMPLE.clozeAfter}
      </p>
      <p className="text-[11px] text-muted-foreground">The whole original sentence IS the card — the term is highlighted where it lives.</p>
    </div>
  );
}

function ContextExpandableFootnote() {
  const [open, setOpen] = useState(false);
  return (
    <div className="w-full space-y-3">
      <div className="rounded-xl border border-border/70 surface-panel px-5 py-4 text-center">
        <p className="text-base font-medium text-foreground">{SAMPLE.term}</p>
        <p className="text-sm text-muted-foreground mt-2">{SAMPLE.explanation}</p>
      </div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-[11px] text-muted-foreground hover:text-foreground transition-colors underline decoration-dotted underline-offset-4"
      >
        {open ? 'Hide source context' : 'ⓘ Show source context'}
      </button>
      {open && (
        <div className="rounded-lg surface-chip px-3 py-2">
          <p className="text-[11px] text-muted-foreground italic leading-relaxed">{SAMPLE.source}</p>
        </div>
      )}
    </div>
  );
}

function ContextSideBySide() {
  return (
    <div className="w-full grid grid-cols-[1fr_1.2fr] gap-3 items-stretch">
      <div className="rounded-lg surface-chip px-3 py-3 flex items-center">
        <p className="text-[11px] text-muted-foreground italic leading-relaxed">{SAMPLE.source}</p>
      </div>
      <div className="rounded-xl border border-border/70 surface-panel px-4 py-3 flex flex-col justify-center">
        <p className="text-[10px] uppercase tracking-[0.5px] text-muted-foreground mb-1">Focus term</p>
        <p className="text-base font-medium text-foreground">{SAMPLE.term}</p>
        <p className="text-xs text-muted-foreground mt-1.5">{SAMPLE.explanation}</p>
      </div>
    </div>
  );
}

// ─── MNEMONIC (memory aid) ───────────────────────────────────────────────────

function MnemonicFootnote() {
  return (
    <div className="w-full space-y-2.5 text-center">
      <div className="rounded-xl border border-border/70 surface-panel px-5 py-4">
        <p className="text-base font-medium text-foreground">{SAMPLE.term}</p>
        <p className="text-sm text-muted-foreground mt-2">{SAMPLE.explanation}</p>
      </div>
      <p className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground italic">
        <Lightbulb className="h-3 w-3 shrink-0" /> {SAMPLE.mnemonic}
      </p>
    </div>
  );
}

function MnemonicRevealButton() {
  const [open, setOpen] = useState(false);
  return (
    <div className="w-full space-y-2.5 text-center">
      <div className="rounded-xl border border-border/70 surface-panel px-5 py-4">
        <p className="text-base font-medium text-foreground">{SAMPLE.term}</p>
        <p className="text-sm text-muted-foreground mt-2">{SAMPLE.explanation}</p>
      </div>
      {open ? (
        <div className="rounded-lg surface-chip px-3 py-2 inline-flex items-center gap-1.5">
          <Lightbulb className="h-3 w-3 text-muted-foreground shrink-0" />
          <p className="text-[11px] text-foreground">{SAMPLE.mnemonic}</p>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="rounded-full h-7 text-xs gap-1.5" onClick={() => setOpen(true)}>
          <Lightbulb className="h-3 w-3" /> Show memory trick
        </Button>
      )}
    </div>
  );
}

function MnemonicCompanionChip() {
  return (
    <div className="w-full flex flex-col sm:flex-row items-stretch gap-3">
      <div className="flex-1 rounded-xl border border-border/70 surface-panel px-5 py-4 text-center">
        <p className="text-base font-medium text-foreground">{SAMPLE.term}</p>
        <p className="text-sm text-muted-foreground mt-2">{SAMPLE.explanation}</p>
      </div>
      <div className="sm:w-[150px] rounded-xl surface-chip px-3 py-3 flex flex-col items-center justify-center text-center gap-1">
        <Lightbulb className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-[10px] uppercase tracking-[0.5px] text-muted-foreground">Memory trick</p>
        <p className="text-[11px] text-foreground leading-snug">{SAMPLE.mnemonic}</p>
      </div>
    </div>
  );
}

function MnemonicVisualAnchor() {
  return (
    <div className="w-full flex items-center gap-4 rounded-xl border border-border/70 surface-panel px-5 py-4">
      <div className="shrink-0 h-12 w-12 rounded-full surface-chip flex items-center justify-center">
        <Sparkles className="h-5 w-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-base font-medium text-foreground">{SAMPLE.term}</p>
        <p className="text-[11px] text-muted-foreground italic mt-1">{SAMPLE.mnemonic}</p>
        <p className="text-xs text-muted-foreground mt-1.5">{SAMPLE.explanation}</p>
      </div>
    </div>
  );
}

// ─── TYPE THE ANSWER mode ────────────────────────────────────────────────────

function TypeExactMatch() {
  const [value, setValue] = useState('');
  const [checked, setChecked] = useState(false);
  const correct = value.trim().toLowerCase() === SAMPLE.term.toLowerCase();
  return (
    <div className="w-full text-center space-y-3">
      <p className="text-sm text-muted-foreground">{SAMPLE.explanation}</p>
      <Input
        value={value}
        onChange={(e) => { setValue(e.target.value); setChecked(false); }}
        placeholder="Type the term…"
        className="h-9 text-sm text-center"
      />
      <div className="flex items-center justify-center gap-2">
        <Button size="sm" className="rounded-full h-7 text-xs" onClick={() => setChecked(true)} disabled={!value.trim()}>
          Check answer
        </Button>
        {checked && (
          <span className={cn('inline-flex items-center gap-1 text-xs', correct ? 'text-foreground' : 'text-muted-foreground')}>
            {correct ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
            {correct ? 'Correct!' : `Answer: ${SAMPLE.term}`}
          </span>
        )}
      </div>
    </div>
  );
}

function TypeFuzzyTolerant() {
  // Static demo of the feedback state (typo "Mitokondria" vs "Mitochondria")
  const typed = 'Mitokondria';
  return (
    <div className="w-full text-center space-y-3">
      <p className="text-sm text-muted-foreground">{SAMPLE.explanation}</p>
      <div className="rounded-lg border border-border/60 surface-panel px-3 py-2 inline-block">
        <p className="text-sm font-mono">
          <span className="text-foreground">Mito</span>
          <span className="surface-chip text-foreground rounded px-0.5">k</span>
          <span className="text-foreground">ondria</span>
        </p>
      </div>
      <p className="text-[11px] text-muted-foreground">
        "{typed}" — close enough! One letter off is highlighted, not marked wrong outright.
      </p>
      <span className="inline-flex items-center gap-1 text-xs text-foreground">
        <CheckCircle2 className="h-3.5 w-3.5" /> Counted as correct (typo-tolerant)
      </span>
    </div>
  );
}

function TypeGuidedHint() {
  const word = SAMPLE.term;
  const [revealedLetters, setRevealedLetters] = useState(1);
  return (
    <div className="w-full text-center space-y-3">
      <p className="text-sm text-muted-foreground">{SAMPLE.explanation}</p>
      <p className="text-lg font-mono tracking-[0.25em] text-foreground">
        {word.split('').map((ch, i) => (i < revealedLetters ? ch : '_')).join(' ')}
      </p>
      <Button
        size="sm"
        variant="outline"
        className="rounded-full h-7 text-xs"
        onClick={() => setRevealedLetters((n) => Math.min(word.length, n + 1))}
        disabled={revealedLetters >= word.length}
      >
        Reveal next letter ({revealedLetters}/{word.length})
      </Button>
    </div>
  );
}

function TypeTwoFieldPair() {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [checked, setChecked] = useState(false);
  return (
    <div className="w-full space-y-3">
      <p className="text-[10px] px-2.5 py-1 rounded-full surface-chip text-muted-foreground inline-block">{SAMPLE.pair.kind} pair — both fields graded together</p>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="space-y-1 text-left">
          <p className="text-[10px] uppercase tracking-[0.5px] text-muted-foreground">When?</p>
          <Input value={a} onChange={(e) => { setA(e.target.value); setChecked(false); }} placeholder="Year…" className="h-9 text-sm" />
        </div>
        <div className="space-y-1 text-left">
          <p className="text-[10px] uppercase tracking-[0.5px] text-muted-foreground">What happened?</p>
          <Input value={b} onChange={(e) => { setB(e.target.value); setChecked(false); }} placeholder="Event…" className="h-9 text-sm" />
        </div>
      </div>
      <div className="flex items-center justify-center gap-2">
        <Button size="sm" className="rounded-full h-7 text-xs" onClick={() => setChecked(true)} disabled={!a.trim() || !b.trim()}>
          Check both
        </Button>
        {checked && (
          <span className="text-xs text-muted-foreground">Answer: {SAMPLE.pair.a} — {SAMPLE.pair.b}</span>
        )}
      </div>
    </div>
  );
}

// ─── Page shell ─────────────────────────────────────────────────────────────

const CARD_STYLE_TABS: Array<{ value: string; label: string; intro: string; variants: Array<{ name: string; hint: string; render: () => React.ReactNode }> }> = [
  {
    value: 'standard',
    label: 'Standard',
    intro: 'The classic front/back card — four takes on how the two sides relate and reveal.',
    variants: [
      { name: 'Centered Flip', hint: 'baseline', render: () => <StandardCenteredFlip /> },
      { name: 'Stacked Reveal', hint: 'no animation', render: () => <StandardStackedReveal /> },
      { name: 'Field-Pair Badge', hint: 'swap sides', render: () => <StandardFieldPairBadge /> },
      { name: 'Compact Row', hint: 'dense scan', render: () => <StandardCompactRow /> },
    ],
  },
  {
    value: 'cloze',
    label: 'Cloze',
    intro: 'Fill-in-the-blank within a full sentence — keeps real context attached to the term.',
    variants: [
      { name: 'Inline Blank', hint: 'click to reveal', render: () => <ClozeInlineBlank /> },
      { name: 'Word Bank', hint: 'pick from chips', render: () => <ClozeWordBank /> },
      { name: 'Type-in Underline', hint: 'type the word', render: () => <ClozeTypeIn /> },
      { name: 'Progressive Multi-Blank', hint: 'reveal one by one', render: () => <ClozeProgressive /> },
    ],
  },
  {
    value: 'context',
    label: 'Context',
    intro: 'Shows the surrounding source material, not just the isolated term.',
    variants: [
      { name: 'Context Strip', hint: 'quote above card', render: () => <ContextStrip /> },
      { name: 'Highlighted-in-Passage', hint: 'sentence is the card', render: () => <ContextHighlightedPassage /> },
      { name: 'Expandable Footnote', hint: 'context on demand', render: () => <ContextExpandableFootnote /> },
      { name: 'Side-by-Side Split', hint: 'context + focus', render: () => <ContextSideBySide /> },
    ],
  },
  {
    value: 'mnemonic',
    label: 'Mnemonic',
    intro: 'Bundles a memory trick with the card — four takes on how prominent it should be.',
    variants: [
      { name: 'Footnote Trick', hint: 'always visible, subtle', render: () => <MnemonicFootnote /> },
      { name: 'Reveal Button', hint: 'opt-in', render: () => <MnemonicRevealButton /> },
      { name: 'Companion Chip', hint: 'side-by-side', render: () => <MnemonicCompanionChip /> },
      { name: 'Visual Anchor', hint: 'front and center', render: () => <MnemonicVisualAnchor /> },
    ],
  },
];

const TYPE_MODE_VARIANTS: Array<{ name: string; hint: string; render: () => React.ReactNode }> = [
  { name: 'Exact Match', hint: 'classic grading', render: () => <TypeExactMatch /> },
  { name: 'Fuzzy / Typo-Tolerant', hint: 'forgiving grading', render: () => <TypeFuzzyTolerant /> },
  { name: 'Guided Hint', hint: 'reveal letters', render: () => <TypeGuidedHint /> },
  { name: 'Two-Field Pair', hint: 'date ⇄ event style', render: () => <TypeTwoFieldPair /> },
];

export default function FlashcardMockupsPage() {
  return (
    <div className="h-full flex flex-col">
      <PageHeader title="Flashcard design mockups" subtitle="Layout & interaction comparisons — pick what feels right, theme stays as-is" hideBreadcrumb />
      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-6 space-y-10">
          <div className="rounded-xl surface-chip px-4 py-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              This is a side-by-side comparison gallery, not the live tool — every variant below renders the exact same
              sample content so only the <span className="text-foreground font-medium">layout and interaction</span> differs.
              Colors, surfaces and type all reuse the existing design tokens. Pick your favorites per group and I'll wire the
              chosen ones into the real Customize-Flashcards options panel.
            </p>
          </div>

          {/* Card style groups */}
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-medium text-foreground mb-1">Card styles</h2>
              <CategoryIntro>Four families, four layout takes each — these become the "Card Style" picker on the options screen.</CategoryIntro>
            </div>
            <Tabs defaultValue="standard">
              <TabsList>
                {CARD_STYLE_TABS.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
                ))}
              </TabsList>
              {CARD_STYLE_TABS.map((tab) => (
                <TabsContent key={tab.value} value={tab.value} className="space-y-4 pt-4">
                  <CategoryIntro>{tab.intro}</CategoryIntro>
                  <VariantGrid>
                    {tab.variants.map((variant) => (
                      <VariantCard key={variant.name} name={variant.name} hint={variant.hint}>
                        {variant.render()}
                      </VariantCard>
                    ))}
                  </VariantGrid>
                </TabsContent>
              ))}
            </Tabs>
          </div>

          {/* Type-the-answer mode */}
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-medium text-foreground mb-1">"Type the Answer" study mode</h2>
              <CategoryIntro>
                Four interaction takes on active recall by typing — these become the variant options once "Type" is real
                (it currently silently falls back to Multiple Choice).
              </CategoryIntro>
            </div>
            <VariantGrid>
              {TYPE_MODE_VARIANTS.map((variant) => (
                <VariantCard key={variant.name} name={variant.name} hint={variant.hint}>
                  {variant.render()}
                </VariantCard>
              ))}
            </VariantGrid>
          </div>
        </div>
      </div>
    </div>
  );
}
