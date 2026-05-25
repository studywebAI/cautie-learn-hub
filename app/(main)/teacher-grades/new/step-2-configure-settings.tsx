'use client';

import { useState, useEffect, useContext } from 'react';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ChevronRight } from 'lucide-react';

type StepTwoProps = {
  onBack: () => void;
  onNext: (data: any) => void;
  data: any;
};

type Subject = {
  id: string;
  title: string;
};

type Class = {
  id: string;
  name: string;
  student_count?: number;
};

export default function StepTwoClassAndSubject({ onBack, onNext, data }: StepTwoProps) {
  const context = useContext(AppContext) as AppContextType;
  const isDutch = context?.language === 'nl';
  const classes = (context?.classes || []) as Class[];

  const [selectedClassId, setSelectedClassId] = useState(data.classId || '');
  const [selectedSubjectId, setSelectedSubjectId] = useState(data.subjectId || '');
  const [weight, setWeight] = useState<number | null>(data.weight || null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load subjects when class changes
  useEffect(() => {
    if (!selectedClassId) {
      setSubjects([]);
      setSelectedSubjectId('');
      return;
    }

    const loadSubjects = async () => {
      setLoadingSubjects(true);
      try {
        const res = await fetch(`/api/classes/${selectedClassId}/subjects`);
        if (!res.ok) {
          setSubjects([]);
          return;
        }
        const responseData = await res.json();
        setSubjects(responseData.subjects || []);
      } catch {
        setSubjects([]);
      } finally {
        setLoadingSubjects(false);
      }
    };

    loadSubjects();
  }, [selectedClassId]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!selectedClassId) {
      newErrors.classId = isDutch ? 'Selecteer een klas' : 'Select a class';
    }

    if (weight !== null && (weight < 0.1 || weight > 10)) {
      newErrors.weight = isDutch ? 'Gewicht tussen 0.1 en 10' : 'Weight must be between 0.1 and 10';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      const selectedClass = classes.find(c => c.id === selectedClassId);
      onNext({
        classId: selectedClassId,
        className: selectedClass?.name || '',
        subjectId: selectedSubjectId || null,
        weight: weight !== null ? weight : undefined,
      });
    }
  };

  const selectedClass = classes.find(c => c.id === selectedClassId);

  return (
    <div className="space-y-4">
      {/* Class Selection */}
      <div className="space-y-3">
        {!selectedClassId ? (
          <>
            <p className="text-sm font-semibold">
              {isDutch ? 'Selecteer Klas' : 'Select Class'}
            </p>

            <div className="space-y-2">
              {classes.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => setSelectedClassId(cls.id)}
                  className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                    selectedClassId === cls.id
                      ? 'border-[var(--accent-brand)] bg-[var(--accent-brand)]/5'
                      : 'border-border hover:border-[var(--accent-brand)]/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{cls.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {cls.student_count || 0} {isDutch ? 'studenten' : 'students'}
                      </p>
                    </div>
                    {selectedClassId === cls.id && <ChevronRight className="h-4 w-4" />}
                  </div>
                </button>
              ))}
            </div>
            {errors.classId && <p className="text-xs text-destructive">{errors.classId}</p>}
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedClassId('')}
              >
                ← {isDutch ? 'Terug' : 'Back'}
              </Button>
            </div>
            <div className="p-3 rounded-lg border border-[var(--accent-brand)] bg-[var(--accent-brand)]/5">
              <p className="text-sm font-semibold">{selectedClass?.name}</p>
              <p className="text-xs text-muted-foreground">
                {selectedClass?.student_count || 0} {isDutch ? 'studenten' : 'students'}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Subject Pills */}
      {selectedClassId && (
        <div className="space-y-3 pt-3 border-t border-border">
          <p className="text-sm font-semibold">
            {isDutch ? 'Vak' : 'Subject'}
          </p>

          {loadingSubjects ? (
            <div className="h-10 bg-muted rounded animate-pulse" />
          ) : subjects.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {subjects.map((subject) => (
                <button
                  key={subject.id}
                  onClick={() => setSelectedSubjectId(selectedSubjectId === subject.id ? '' : subject.id)}
                  className={`px-3 py-1.5 rounded-lg border transition-all text-sm ${
                    selectedSubjectId === subject.id
                      ? 'bg-[var(--accent-brand)] border-[var(--accent-brand)] text-white'
                      : 'border-border hover:border-[var(--accent-brand)] text-foreground'
                  }`}
                >
                  {subject.title}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {isDutch ? 'Geen vakken voor deze klas' : 'No subjects for this class'}
            </p>
          )}
        </div>
      )}

      {/* Weight */}
      {selectedClassId && (
        <div className="space-y-3 pt-3 border-t border-border">
          <label className="text-sm font-semibold">
            {isDutch ? 'Gewicht/Punten' : 'Weight/Points'}
          </label>
          <Input
            type="number"
            value={weight || ''}
            onChange={(e) => setWeight(e.target.value ? parseFloat(e.target.value) : null)}
            step={0.5}
            min={0.1}
            max={10}
            placeholder=""
            className="h-9"
          />
          <p className="text-xs text-muted-foreground">{isDutch ? 'optioneel (0.1 - 10)' : 'optional (0.1 - 10)'}</p>
          {errors.weight && <p className="text-xs text-destructive">{errors.weight}</p>}
        </div>
      )}


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
