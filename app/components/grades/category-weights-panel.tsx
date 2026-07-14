'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Settings2 } from 'lucide-react';

const CATEGORIES = ['test', 'quiz', 'homework', 'project', 'exam', 'assignment', 'other'] as const;

const CATEGORY_LABELS: Record<string, { nl: string; en: string }> = {
  test: { nl: 'Toetsen', en: 'Tests' },
  quiz: { nl: 'Quizzes', en: 'Quizzes' },
  homework: { nl: 'Huiswerk', en: 'Homework' },
  project: { nl: 'Projecten', en: 'Projects' },
  exam: { nl: 'Examens', en: 'Exams' },
  assignment: { nl: 'Opdrachten', en: 'Assignments' },
  other: { nl: 'Overig', en: 'Other' },
};

// Category weights for computing a weighted eindcijfer across a class's
// grade sets. See docs/grades-feature-brainstorm.md section I point 13.
export function CategoryWeightsPanel({ classId, isDutch }: { classId: string; isDutch: boolean }) {
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { void load(); }, [classId]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/classes/${classId}/category-weights`);
      if (res.ok) {
        const data = await res.json();
        setWeights(data.weights || {});
      }
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const nonZero = Object.fromEntries(Object.entries(weights).filter(([, v]) => Number(v) > 0));
      const res = await fetch(`/api/classes/${classId}/category-weights`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weights: nonZero }),
      });
      if (res.ok) setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const total = Object.values(weights).reduce((sum, v) => sum + (Number(v) || 0), 0);

  if (loading) return null;

  return (
    <Card className="p-3 surface-panel border border-border space-y-2">
      <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full text-left">
        <span className="text-xs flex items-center gap-1.5">
          <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
          {isDutch ? 'Gewicht per categorie voor eindcijfer' : 'Category weights for final grade'}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {Object.keys(weights).length > 0
            ? (isDutch ? 'ingesteld' : 'configured')
            : (isDutch ? 'niet ingesteld (simpel gemiddelde)' : 'not set (simple average)')}
        </span>
      </button>

      {open && (
        <div className="space-y-2 pt-1 border-t border-border">
          <p className="text-[11px] text-muted-foreground">
            {isDutch
              ? 'Bepaal hoe zwaar elke categorie meetelt voor het eindcijfer (percentages, samen niet per se 100). Leeg = simpel gemiddelde per cijferlijst-gewicht.'
              : 'Set how heavily each category counts toward the final grade (percentages, need not sum to 100). Empty = simple average by grade-set weight.'}
          </p>
          {CATEGORIES.map(cat => (
            <div key={cat} className="flex items-center justify-between gap-2">
              <span className="text-xs">{isDutch ? CATEGORY_LABELS[cat].nl : CATEGORY_LABELS[cat].en}</span>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={weights[cat] ?? ''}
                  onChange={(e) => setWeights(prev => ({ ...prev, [cat]: e.target.value ? Number(e.target.value) : 0 }))}
                  className="w-16 h-7 text-xs text-center"
                  placeholder="0"
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-muted-foreground">
              {isDutch ? 'Totaal' : 'Total'}: {total}%
            </span>
            <Button size="sm" disabled={saving} onClick={save}>
              {saving ? (isDutch ? 'Opslaan...' : 'Saving...') : (isDutch ? 'Opslaan' : 'Save')}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
