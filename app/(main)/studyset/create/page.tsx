'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Step1NameInfo } from '@/components/studyset/steps/step-1-name-info';
import { Step2Upload } from '@/components/studyset/steps/step-2-upload';
import { Step3AIGeneration } from '@/components/studyset/steps/step-3-ai-generation';
import { Step4Agenda } from '@/components/studyset/steps/step-4-agenda';
import { Step5Review } from '@/components/studyset/steps/step-5-review';

type WorkflowData = {
  step: 1 | 2 | 3 | 4 | 5;
  name: string;
  description: string;
  subject: string;
  materials: Array<{ type: string; content: string }>;
  aiGenOptions: string;
  agenda: Record<string, any>;
  preferences: Record<string, any>;
  studysetId?: string;
};

const INITIAL_DATA: WorkflowData = {
  step: 1,
  name: '',
  description: '',
  subject: '',
  materials: [],
  aiGenOptions: 'linear-progress',
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
    const saved = localStorage.getItem('studyset-workflow-draft');
    if (saved) {
      try {
        setData(JSON.parse(saved));
      } catch {}
    }
  }, []);

  // Auto-save to localStorage
  useEffect(() => {
    localStorage.setItem('studyset-workflow-draft', JSON.stringify(data));
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
      // Trigger AI generation
      setLoading(true);
      try {
        const res = await fetch(`/api/studysets/${studysetId}/generate-workflow`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            option: data.aiGenOptions,
            materials: data.materials,
            agenda: data.agenda,
          }),
        });
        if (!res.ok) throw new Error('Failed to generate content');
        toast({ title: 'Success', description: 'AI generation started!' });
      } catch (e) {
        toast({ title: 'Error', description: String(e), variant: 'destructive' });
        setLoading(false);
        return;
      }
      setLoading(false);
    }

    if (data.step === 4) {
      // Save agenda
      setLoading(true);
      try {
        const res = await fetch(`/api/studysets/${studysetId}/agenda`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data.agenda),
        });
        if (!res.ok) throw new Error('Failed to save agenda');
        toast({ title: 'Success', description: 'Schedule saved!' });
      } catch (e) {
        toast({ title: 'Error', description: String(e), variant: 'destructive' });
        setLoading(false);
        return;
      }
      setLoading(false);
    }

    if (data.step < 5) {
      setData(prev => ({ ...prev, step: (prev.step + 1) as 1 | 2 | 3 | 4 | 5 }));
    } else {
      // Save preferences and finish
      setLoading(true);
      try {
        const res = await fetch(`/api/studysets/${studysetId}/preferences`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data.preferences),
        });
        if (!res.ok) throw new Error('Failed to save preferences');
        localStorage.removeItem('studyset-workflow-draft');
        toast({ title: 'Success', description: 'StudySet created successfully!' });
        router.push(`/studyset/${studysetId}`);
      } catch (e) {
        toast({ title: 'Error', description: String(e), variant: 'destructive' });
        setLoading(false);
      }
    }
  };

  const handlePrev = () => {
    if (data.step > 1) {
      setData(prev => ({ ...prev, step: (prev.step - 1) as 1 | 2 | 3 | 4 | 5 }));
    }
  };

  const stepComponents = {
    1: <Step1NameInfo data={data} setData={setData} />,
    2: <Step2Upload data={data} setData={setData} />,
    3: <Step3AIGeneration data={data} setData={setData} />,
    4: <Step4Agenda data={data} setData={setData} />,
    5: <Step5Review data={data} setData={setData} />,
  };

  return (
    <div className="page-content max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="page-title">Create StudySet</h1>
        <p className="page-subtitle mt-1">Step {data.step} of 5</p>
        <div className="mt-4 flex gap-1">
          {[1, 2, 3, 4, 5].map(i => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full transition-all ${
                i <= data.step ? 'bg-[var(--accent-brand)]' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="mb-8">
        {stepComponents[data.step]}
      </div>

      {/* Navigation */}
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
          {data.step === 5 ? 'Finish' : 'Next'}
          {data.step < 5 && <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
