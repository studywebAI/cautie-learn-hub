'use client';

import { useContext } from 'react';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronRight } from 'lucide-react';

type StepOneProps = {
  onNext: (data: { classId: string; className: string }) => void;
  selectedClass?: string;
};

export default function StepOneClassSelector({ onNext, selectedClass }: StepOneProps) {
  const context = useContext(AppContext) as AppContextType;
  const isDutch = context?.language === 'nl';
  const classes = context?.classes || [];

  if (!classes.length) {
    return (
      <div className="text-center space-y-3 py-8">
        <p className="text-muted-foreground text-sm">
          {isDutch ? 'Geen klassen beschikbaar' : 'No classes available'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {isDutch ? 'Voor welke klas is deze cijferlijst?' : 'Which class is this grade for?'}
      </p>

      <div className="space-y-2">
        {classes.map((cls: any) => (
          <button
            key={cls.id}
            onClick={() => onNext({ classId: cls.id, className: cls.name || '' })}
            className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
              selectedClass === cls.id
                ? 'border-[var(--accent-brand)] bg-[var(--accent-brand)]/5'
                : 'border-border hover:border-[var(--accent-brand)]/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{cls.name || 'Untitled Class'}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  📚 {cls.student_count || 0} {isDutch ? 'studenten' : 'students'}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          </button>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border">
        <Button
          variant="outline"
          disabled={!selectedClass}
          onClick={() => selectedClass && onNext({ classId: selectedClass, className: classes.find((c: any) => c.id === selectedClass)?.name || '' })}
        >
          {isDutch ? 'Volgende' : 'Next'} →
        </Button>
      </div>
    </div>
  );
}
