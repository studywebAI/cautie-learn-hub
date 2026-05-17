'use client';

import { useState, useContext } from 'react';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type StepOneProps = {
  onNext: (data: { title: string; description: string }) => void;
  data?: any;
};

export default function StepOneNameInfo({ onNext, data }: StepOneProps) {
  const context = useContext(AppContext) as AppContextType;
  const isDutch = context?.language === 'nl';

  const [formData, setFormData] = useState({
    title: data?.title || '',
    description: data?.description || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = isDutch ? 'Titel is verplicht' : 'Title is required';
    } else if (formData.title.length > 100) {
      newErrors.title = isDutch ? 'Max 100 karakters' : 'Max 100 characters';
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
      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border">
        <Button onClick={handleNext}>
          {isDutch ? 'Volgende' : 'Next'} →
        </Button>
      </div>
    </div>
  );
}
