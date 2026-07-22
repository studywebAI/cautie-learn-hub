'use client';

import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Wand2, Sparkles, Plus, Trash2 } from 'lucide-react';

type Bin = { min: number; max: number; label: string; numeric: number | null };
type Preset = { id: string; name: string; is_default?: boolean; config: { templateType?: string; system?: string; bins?: Bin[] } };

const QUICK_PRESETS: Array<{ key: string; name: string; bins: Bin[] }> = [
  {
    key: 'nl_1_10', name: 'Nederland (1-10)', bins: [
      { min: 90, max: 100, label: '9-10', numeric: 9.5 },
      { min: 80, max: 89.99, label: '8', numeric: 8 },
      { min: 70, max: 79.99, label: '7', numeric: 7 },
      { min: 60, max: 69.99, label: '6', numeric: 6 },
      { min: 55, max: 59.99, label: '5,5', numeric: 5.5 },
      { min: 0, max: 54.99, label: 'onvoldoende', numeric: 4 },
    ],
  },
  {
    key: 'us_a_f', name: 'VS (A-F)', bins: [
      { min: 90, max: 100, label: 'A', numeric: null },
      { min: 80, max: 89.99, label: 'B', numeric: null },
      { min: 70, max: 79.99, label: 'C', numeric: null },
      { min: 60, max: 69.99, label: 'D', numeric: null },
      { min: 0, max: 59.99, label: 'F', numeric: null },
    ],
  },
  {
    key: 'de_1_6', name: 'Duitsland (1-6)', bins: [
      { min: 92, max: 100, label: '1', numeric: 1 },
      { min: 81, max: 91.99, label: '2', numeric: 2 },
      { min: 67, max: 80.99, label: '3', numeric: 3 },
      { min: 50, max: 66.99, label: '4', numeric: 4 },
      { min: 30, max: 49.99, label: '5', numeric: 5 },
      { min: 0, max: 29.99, label: '6', numeric: 6 },
    ],
  },
];

export function GradingTemplatePicker({
  classId,
  subjectId,
  isDutch,
  selectedPresetId,
  onSelect,
  onApply,
  applying,
}: {
  classId?: string | null;
  subjectId?: string | null;
  isDutch: boolean;
  selectedPresetId: string | null;
  onSelect: (presetId: string) => void;
  onApply: () => void;
  applying?: boolean;
}) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [open, setOpen] = useState(false);
  const [customBins, setCustomBins] = useState<Bin[]>([{ min: 0, max: 100, label: '', numeric: null }]);
  const [customName, setCustomName] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [makeDefault, setMakeDefault] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const base = classId ? `/api/classes/${classId}` : `/api/subjects/${subjectId}`;

  useEffect(() => { void loadPresets(); }, [classId, subjectId]);

  const loadPresets = async () => {
    const res = await fetch(`${base}/grading-presets`);
    if (!res.ok) return;
    const data = await res.json();
    const scaleTemplates: Preset[] = (data.presets || []).filter((p: any) => p.config?.templateType === 'scale_template');
    setPresets(scaleTemplates);
    if (!selectedPresetId) {
      const defaultPreset = scaleTemplates.find(p => p.is_default);
      if (defaultPreset) onSelect(defaultPreset.id);
    }
  };

  const saveTemplate = async (name: string, system: string, bins: Bin[], isDefault?: boolean) => {
    setSaving(true);
    try {
      const res = await fetch(`${base}/grading-presets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, kind: 'freeform', config: { templateType: 'scale_template', system, bins }, is_default: !!isDefault }),
      });
      if (res.ok) {
        const data = await res.json();
        await loadPresets();
        onSelect(data.preset.id);
        setOpen(false);
        setMakeDefault(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleFile = async (file: File) => {
    const text = await file.text();
    setPasteText(prev => (prev ? prev + '\n' + text : text));
  };

  const parseWithAI = async () => {
    if (!pasteText.trim()) return;
    setParsing(true);
    try {
      const res = await fetch(`${base}/grading-presets/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: pasteText }),
      });
      if (res.ok) {
        const data = await res.json();
        setCustomBins(data.bins || []);
      }
    } finally {
      setParsing(false);
    }
  };

  const updateBin = (i: number, patch: Partial<Bin>) => {
    setCustomBins(prev => prev.map((b, idx) => idx === i ? { ...b, ...patch } : b));
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedPresetId || undefined} onValueChange={onSelect}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder={isDutch ? 'Kies een cijfer-template...' : 'Choose a grading template...'} />
        </SelectTrigger>
        <SelectContent>
          {presets.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
        </SelectContent>
      </Select>

      <Button size="sm" variant="outline" onClick={onApply} disabled={!selectedPresetId || applying}>
        {applying ? (isDutch ? 'Bezig...' : 'Working...') : (isDutch ? 'Toepassen' : 'Apply')}
      </Button>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button size="sm" variant="ghost" title={isDutch ? 'Nieuwe template' : 'New template'}>
            <Plus className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-96 space-y-4 max-h-[70vh] overflow-y-auto">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input type="checkbox" checked={makeDefault} onChange={(e) => setMakeDefault(e.target.checked)} className="h-3.5 w-3.5" />
            {classId
              ? (isDutch ? 'Maak dit de standaard-template voor deze klas' : 'Make this the default template for this class')
              : (isDutch ? 'Maak dit de standaard-template voor dit vak' : 'Make this the default template for this subject')}
          </label>

          <div>
            <p className="text-xs text-muted-foreground mb-1.5">{isDutch ? 'Kant-en-klaar' : 'Ready-made'}</p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PRESETS.map(q => (
                <Button key={q.key} size="sm" variant="outline" disabled={saving} onClick={() => saveTemplate(q.name, q.key, q.bins, makeDefault)}>
                  {q.name}
                </Button>
              ))}
            </div>
          </div>

          <div className="border-t border-border pt-3 space-y-2">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Wand2 className="h-3.5 w-3.5" />
              {isDutch ? 'Eigen systeem — plak tekst of upload een bestand met tabel' : 'Custom system — paste text or upload a file with a table'}
            </p>
            <Textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={isDutch ? 'bv. "27-30 van 30 = A, 24-26 = B, ..." of plak een tabel' : 'e.g. "27-30 out of 30 = A, 24-26 = B, ..." or paste a table'}
              rows={3}
            />
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.csv,.md"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                {isDutch ? 'Bestand uploaden' : 'Upload file'}
              </Button>
              <Button size="sm" onClick={parseWithAI} disabled={parsing || !pasteText.trim()}>
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                {parsing ? (isDutch ? 'Bezig...' : 'Working...') : (isDutch ? 'Genereer bins' : 'Generate bins')}
              </Button>
            </div>
          </div>

          <div className="border-t border-border pt-3 space-y-2">
            <p className="text-xs text-muted-foreground">{isDutch ? 'Bins (percentage → label)' : 'Bins (percentage → label)'}</p>
            <div className="space-y-1.5">
              {customBins.map((bin, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <Input type="number" value={bin.min} onChange={(e) => updateBin(i, { min: Number(e.target.value) })} className="w-14 h-7 text-xs" />
                  <span className="text-xs text-muted-foreground">–</span>
                  <Input type="number" value={bin.max} onChange={(e) => updateBin(i, { max: Number(e.target.value) })} className="w-14 h-7 text-xs" />
                  <span className="text-xs text-muted-foreground">%</span>
                  <Input value={bin.label} onChange={(e) => updateBin(i, { label: e.target.value })} placeholder={isDutch ? 'label' : 'label'} className="flex-1 h-7 text-xs" />
                  <button onClick={() => setCustomBins(prev => prev.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <Button size="sm" variant="ghost" onClick={() => setCustomBins(prev => [...prev, { min: 0, max: 0, label: '', numeric: null }])}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              {isDutch ? 'Bin toevoegen' : 'Add bin'}
            </Button>
          </div>

          <div className="flex items-center gap-2 border-t border-border pt-3">
            <Input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder={isDutch ? 'Naam voor deze template' : 'Name for this template'} className="h-8 text-xs" />
            <Button size="sm" disabled={saving || !customName.trim() || customBins.length === 0} onClick={() => saveTemplate(customName.trim(), 'custom', customBins, makeDefault)}>
              {isDutch ? 'Opslaan' : 'Save'}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
