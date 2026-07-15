'use client';

import { useState, useContext, useEffect } from 'react';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Check } from 'lucide-react';
import StepOneNameInfo from './step-1-select-class';
import StepTwoClassAndSubject from './step-2-configure-settings';
import StepThreeGrading from './step-3-grading-interface';
import { PageHeader } from '@/components/page-header';

type GradeSetData = {
  title: string;
  description: string;
  classId: string;
  className: string;
  subjectId: string | null;
  weight: number;
};

type Step = 1 | 2 | 3;

export default function NewGradesWizard() {
  const context = useContext(AppContext) as AppContextType;
  const isDutch = context?.language === 'nl';
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [gradeData, setGradeData] = useState<Partial<GradeSetData>>({
    weight: 5,
    description: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const stepLabels = {
    1: isDutch ? 'Titel & Beschrijving' : 'Title & Description',
    2: isDutch ? 'Klas, Vak & Gewicht' : 'Class, Subject & Weight',
    3: isDutch ? 'Beoordelen' : 'Grading Interface',
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as Step);
    } else {
      router.back();
    }
  };

  const handleNext = (data: Partial<GradeSetData>) => {
    setGradeData(prev => ({ ...prev, ...data }));
    if (step < 3) {
      setStep((step + 1) as Step);
    }
  };

  const handleSaveGrades = async () => {
    if (!gradeData.classId || !gradeData.title) return;

    setIsSaving(true);
    try {
      // Create the grade set
      const response = await fetch(`/api/classes/${gradeData.classId}/grades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: gradeData.title,
          subject_id: gradeData.subjectId || null,
          weight: gradeData.weight,
          description: gradeData.description,
          category: 'test',
          status: 'in_progress',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create grade set');
      }

      const { grade_set } = await response.json();

      // Redirect to the grade details page
      router.push(`/teacher-grades/${grade_set.id}`);
    } catch (error: any) {
      console.error('Error saving grades:', error);
      // Show error toast or similar
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <button
          onClick={handleBack}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          {isDutch ? 'Terug' : 'Back'}
        </button>
        <span className="text-xs text-muted-foreground">
          {isDutch ? 'Stap' : 'Step'} {step} {isDutch ? 'van' : 'of'} 3
        </span>
      </div>

      {/* Step progress bar */}
      <div className="flex gap-2">
        {([1, 2, 3] as const).map((s) => (
          <div key={s} className="flex-1">
            <div className={`h-1.5 rounded-full transition-colors ${
              s === step ? 'bg-[var(--accent-brand)]' : s < step ? 'bg-[var(--accent-brand)]/40' : 'bg-muted'
            }`} />
            <p className="text-xs text-muted-foreground mt-1">{stepLabels[s]}</p>
          </div>
        ))}
      </div>

      <PageHeader title={stepLabels[step]} />

      {/* Step content */}
      <div className="class-panel-lg">
        {step === 1 && <StepOneNameInfo onNext={handleNext} data={gradeData} />}
        {step === 2 && <StepTwoClassAndSubject onBack={handleBack} onNext={handleNext} data={gradeData} />}
        {step === 3 && <StepThreeGrading onBack={handleBack} onSave={handleSaveGrades} data={gradeData} isSaving={isSaving} />}
      </div>
    </div>
  );
}
