'use client';

import { useState, useEffect, useContext } from 'react';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type StepTwoProps = {
  onBack: () => void;
  onNext: (data: any) => void;
  data: any;
};

type Subject = {
  id: string;
  title: string;
};

export default function StepTwoSettings({ onBack, onNext, data }: StepTwoProps) {
  const context = useContext(AppContext) as AppContextType;
  const isDutch = context?.language === 'nl';

  const [formData, setFormData] = useState({
    title: data.title || '',
    subjectId: data.subjectId || '',
    weight: data.weight || 5,
    frequency: data.frequency || 'once',
    description: data.description || '',
  });

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!data.classId) return;

    const loadSubjects = async () => {
      try {
        const res = await fetch(`/api/classes/${data.classId}/subjects`);
        if (!res.ok) {
          setSubjects([]);
          return;
        }
        const responseData = await res.json();
        setSubjects(responseData.subjects || []);
      } catch {
        setSubjects([]);
      } finally {
        setLoading(false);
      }
    };

    loadSubjects();
  }, [data.classId]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = isDutch ? 'Titel is verplicht' : 'Title is required';
    } else if (formData.title.length > 100) {
      newErrors.title = isDutch ? 'Max 100 karakters' : 'Max 100 characters';
    }

    if (formData.weight < 0.1 || formData.weight > 10) {
      newErrors.weight = isDutch ? 'Gewicht tussen 0.1 en 10' : 'Weight must be between 0.1 and 10';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      onNext(formData);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {isDutch ? 'Configureer de instellingen van uw cijferlijst' : 'Configure your grade settings'}
      </p>

      {/* Class info */}
      <div className="p-3 bg-muted rounded-lg">
        <p className="text-xs text-muted-foreground">{isDutch ? 'Klas' : 'Class'}</p>
        <p className="font-semibold text-sm">{data.className}</p>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <label className="text-sm font-semibold flex items-center gap-2">
          📝 {isDutch ? 'Titel' : 'Title'}
          <span className="text-destructive">*</span>
        </label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder={isDutch ? 'bijv. Biologie Test 1' : 'e.g., Biology Test 1'}
          maxLength={100}
          className="h-9"
        />
        {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
      </div>

      {/* Subject */}
      <div className="space-y-2">
        <label className="text-sm font-semibold flex items-center gap-2">
          🏷️ {isDutch ? 'Onderwerp' : 'Subject'}
        </label>
        {loading ? (
          <div className="h-9 bg-muted rounded animate-pulse" />
        ) : (
          <Select value={formData.subjectId} onValueChange={(v) => setFormData({ ...formData, subjectId: v })}>
            <SelectTrigger>
              <SelectValue placeholder={isDutch ? 'Selecteer onderwerp' : 'Select subject'} />
            </SelectTrigger>
            <SelectContent>
              {subjects.map(subject => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Weight */}
      <div className="space-y-2">
        <label className="text-sm font-semibold flex items-center gap-2">
          ⚖️ {isDutch ? 'Gewicht/Punten' : 'Weight/Points'}
          <span className="text-destructive">*</span>
        </label>
        <div className="flex gap-2 items-center">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setFormData({ ...formData, weight: Math.max(0.1, formData.weight - 0.5) })}
          >
            −
          </Button>
          <Input
            type="number"
            value={formData.weight}
            onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })}
            step={0.5}
            min={0.1}
            max={10}
            className="text-center h-9 flex-1"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => setFormData({ ...formData, weight: Math.min(10, formData.weight + 0.5) })}
          >
            +
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">(0.1 - 10)</p>
        {errors.weight && <p className="text-xs text-destructive">{errors.weight}</p>}
      </div>

      {/* Frequency */}
      <div className="space-y-2">
        <label className="text-sm font-semibold flex items-center gap-2">
          📅 {isDutch ? 'Frequentie' : 'Frequency'}
        </label>
        <Select value={formData.frequency} onValueChange={(v) => setFormData({ ...formData, frequency: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="once">
              {isDutch ? 'Eenmalig' : 'One-time'}
            </SelectItem>
            <SelectItem value="weekly">
              {isDutch ? 'Wekelijks' : 'Every Week'}
            </SelectItem>
            <SelectItem value="biweekly">
              {isDutch ? 'Om de twee weken' : 'Every 2 Weeks'}
            </SelectItem>
            <SelectItem value="monthly">
              {isDutch ? 'Maandelijks' : 'Monthly'}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label className="text-sm font-semibold flex items-center gap-2">
          📋 {isDutch ? 'Beschrijving' : 'Description'} ({isDutch ? 'optioneel' : 'optional'})
        </label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          placeholder={isDutch ? 'Voeg instructies toe voor studenten...' : 'Add instructions for students...'}
          className="text-sm"
        />
      </div>

      {/* Navigation */}
      <div className="flex justify-between gap-2 mt-6 pt-4 border-t border-border">
        <Button variant="outline" onClick={onBack}>
          ← {isDutch ? 'Terug' : 'Back'}
        </Button>
        <Button onClick={handleNext}>
          {isDutch ? 'Volgende' : 'Next'} →
        </Button>
      </div>
    </div>
  );
}
