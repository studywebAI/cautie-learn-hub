'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Route, CalendarDays, Clock3, BookOpen } from 'lucide-react';

export default function StudysetPage() {
  const [name, setName] = useState('');
  const [days, setDays] = useState('7');
  const [minutesPerDay, setMinutesPerDay] = useState('45');
  const [confidence, setConfidence] = useState('beginner');
  const [sourceBundle, setSourceBundle] = useState('');
  const [saving, setSaving] = useState(false);
  const [studysets, setStudysets] = useState<any[]>([]);

  const loadStudysets = async () => {
    try {
      const response = await fetch('/api/studysets');
      if (!response.ok) return;
      const data = await response.json();
      setStudysets(data.studysets || []);
    } catch {
      setStudysets([]);
    }
  };

  const createStudyset = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const response = await fetch('/api/studysets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          confidence_level: confidence,
          target_days: Number(days),
          minutes_per_day: Number(minutesPerDay),
          source_bundle: sourceBundle,
        }),
      });
      if (!response.ok) return;
      setName('');
      setSourceBundle('');
      await loadStudysets();
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    void loadStudysets();
  }, []);

  return (
    <div className="h-full overflow-auto p-5 md:p-7">
      <div className="mx-auto max-w-5xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Route className="h-5 w-5" />
              Studyset
            </CardTitle>
            <CardDescription>
              Long-term study planning workspace. This is the first implementation and will expand with day-by-day AI tasks.
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Create Studyset</CardTitle>
              <CardDescription>Collect all context once, then generate a multi-day plan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label>Studyset name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Biology Exam - Chapter 3 to 7" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Days to spread</Label>
                  <Input value={days} onChange={(e) => setDays(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Minutes per day</Label>
                  <Input value={minutesPerDay} onChange={(e) => setMinutesPerDay(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Current level</Label>
                  <select
                    value={confidence}
                    onChange={(e) => setConfidence(e.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Context bundle (notes, files, links, pasted text)</Label>
                <Textarea
                  value={sourceBundle}
                  onChange={(e) => setSourceBundle(e.target.value)}
                  placeholder="Paste or describe everything related to this exam/topic..."
                  className="min-h-[160px]"
                />
              </div>

              <Button disabled={!name.trim() || saving} onClick={() => void createStudyset()}>
                {saving ? 'Saving...' : 'Save studyset'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Target Structure</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Day-by-day plan</p>
              <p className="flex items-center gap-2"><Clock3 className="h-4 w-4" /> Daily time budget</p>
              <p className="flex items-center gap-2"><BookOpen className="h-4 w-4" /> Linked quizzes, notes, flashcards</p>
              <p>Next implementation will save plans in database and sync with agenda.</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>My Studysets</CardTitle>
            <CardDescription>Saved long-term plans.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {studysets.length === 0 ? (
              <p className="text-sm text-muted-foreground">No studysets yet.</p>
            ) : (
              studysets.map((item) => (
                <div key={item.id} className="rounded-md border p-3">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.target_days} days · {item.minutes_per_day} min/day · {item.confidence_level}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
