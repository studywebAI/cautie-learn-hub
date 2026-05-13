'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Step1NameInfo } from '@/components/studyset/steps/step-1-name-info';
import { Step2Upload } from '@/components/studyset/steps/step-2-upload';
import { Step3Settings } from '@/components/studyset/steps/step-3-settings';
import { Step4Review } from '@/components/studyset/steps/step-4-review';
import { WorkflowSelector } from '@/components/studyset/workflow-selector';

type WorkflowType = 'balanced' | 'test_prep' | 'visual' | 'deep_diver' | 'quick_learner';

type WorkflowData = {
  step: 1 | 2 | 3 | 4;
  workflowType?: WorkflowType;
  name: string;
  description: string;
  subject: string;
  materials: Array<{ type: string; content: string }>;
  agenda: Record<string, any>;
  preferences: Record<string, any>;
  studysetId?: string;
  settings?: {
    knowledgeLevel: 'nothing' | 'some' | 'medium' | 'advanced';
    studyDays: string[];
    workflowSetting: string;
  };
  generatedPlan?: {
    days: Array<{
      date: string;
      dayName: string;
      tasks: Array<{ task: string; tool: string }>;
    }>;
  };
};

const INITIAL_DATA: WorkflowData = {
  step: 1,
  name: '',
  description: '',
  subject: '',
  materials: [],
  agenda: {},
  preferences: {},
};

export default function StudysetCreatePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = useState<WorkflowData>(INITIAL_DATA);
  const [loading, setLoading] = useState(false);
  const [studysetId, setStudysetId] = useState<string | null>(null);

  // Load from localStorage or create new
  useEffect(() => {
    const saved = localStorage.getItem('studyset-workflow-draft-v2');
    if (saved) {
      try {
        setData(JSON.parse(saved));
      } catch {}
    }
  }, []);

  // Auto-save to localStorage
  useEffect(() => {
    localStorage.setItem('studyset-workflow-draft-v2', JSON.stringify(data));
  }, [data]);

  const handleNext = async () => {
    // Validate current step
    if (data.step === 1) {
      if (!data.name.trim()) {
        toast({ title: 'Error', description: 'Please enter a name', variant: 'destructive' });
        return;
      }
      // Create studyset in DB if not exists
      if (!studysetId) {
        setLoading(true);
        try {
          const res = await fetch('/api/studysets/workflow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: data.name,
              description: data.description,
              subject: data.subject,
            }),
          });
          if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to create studyset');
          }
          const created = await res.json();
          setStudysetId(created.id);
          setData(prev => ({ ...prev, studysetId: created.id }));
          toast({ title: 'Success', description: 'StudySet created!' });
        } catch (e) {
          toast({ title: 'Error', description: String(e), variant: 'destructive' });
          setLoading(false);
          return;
        }
        setLoading(false);
      }
      // Don't move to next step yet - show workflow selector
      return;
    }

    if (data.step === 2) {
      if (data.materials.length === 0) {
        toast({ title: 'Error', description: 'Please add at least one material', variant: 'destructive' });
        return;
      }
      // Save materials
      setLoading(true);
      try {
        const res = await fetch(`/api/studysets/${studysetId}/materials`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ materials: data.materials }),
        });
        if (!res.ok) throw new Error('Failed to save materials');
        toast({ title: 'Success', description: `${data.materials.length} materials saved` });
      } catch (e) {
        toast({ title: 'Error', description: String(e), variant: 'destructive' });
        setLoading(false);
        return;
      }
      setLoading(false);
    }

    if (data.step === 3) {
      // Validate settings
      if (!data.settings?.knowledgeLevel || data.settings.studyDays.length === 0 || !data.settings.workflowSetting) {
        toast({ title: 'Error', description: 'Please complete all settings', variant: 'destructive' });
        return;
      }
      // Save settings
      setLoading(true);
      try {
        const res = await fetch(`/api/studysets/${studysetId}/settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...data.settings,
            workflowType: data.workflowType,
          }),
        });
        if (!res.ok) throw new Error('Failed to save settings');
        toast({ title: 'Success', description: 'Settings saved!' });
      } catch (e) {
        toast({ title: 'Error', description: String(e), variant: 'destructive' });
        setLoading(false);
        return;
      }
      setLoading(false);
    }

    if (data.step < 4) {
      setData(prev => ({ ...prev, step: (prev.step + 1) as 1 | 2 | 3 | 4 }));
    } else if (data.step === 4) {
      // Finish and cleanup
      localStorage.removeItem('studyset-workflow-draft-v2');
      toast({ title: 'Success', description: 'StudySet created successfully!' });
      router.push(`/studyset/${studysetId}`);
    }
  };

  const handleWorkflowSelect = (workflowType: WorkflowType) => {
    setData(prev => ({
      ...prev,
      workflowType,
      step: 2,
    }));
  };

  const handlePrev = () => {
    if (data.step === 2 && data.workflowType) {
      // Go back from STEP 2 to workflow selector (still step 1 but show selector)
      setData(prev => ({ ...prev, workflowType: undefined }));
    } else if (data.step > 1) {
      setData(prev => ({ ...prev, step: (prev.step - 1) as 1 | 2 | 3 | 4 }));
    }
  };

  const stepComponents = {
    1: <Step1NameInfo data={data} setData={setData} />,
    2: <Step2Upload data={data} setData={setData} />,
    3: <Step3Settings data={data} setData={setData} />,
    4: <Step4Review data={data} setData={setData} onSubmit={handleNext} />,
  };

  // Determine what to show
  const isShowingWorkflowSelector = data.step === 1 && studysetId && !data.workflowType;
  const displayStep = isShowingWorkflowSelector ? 'workflow' : data.step;
  const stepProgress = isShowingWorkflowSelector ? 1 : data.step;

  return (
    <div className="page-content max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="page-title">Create StudySet</h1>
        <p className="page-subtitle mt-1">Step {stepProgress} of 4</p>
        <div className="mt-4 flex gap-1">
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full transition-all ${
                i <= stepProgress ? 'bg-[var(--accent-brand)]' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="mb-8">
        {isShowingWorkflowSelector ? (
          <WorkflowSelector onSelectWorkflow={handleWorkflowSelect} />
        ) : (
          stepComponents[displayStep as 1 | 2 | 3 | 4]
        )}
      </div>

      {/* Navigation */}
      {!isShowingWorkflowSelector && (
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={data.step === 1 || loading}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            onClick={handleNext}
            disabled={loading}
            className="ml-auto flex items-center gap-2"
          >
            {data.step === 4 ? 'Finish' : 'Next'}
            {data.step < 4 && <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      )}
    </div>
  );
}
