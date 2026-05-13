'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type WorkflowType = 'balanced' | 'test_prep' | 'visual' | 'deep_diver' | 'quick_learner';

type WorkflowData = {
  step: 1 | 2 | 3 | 4;
  name: string;
  description: string;
  subject: string;
  materials: Array<{ type: string; content: string }>;
  agenda: Record<string, any>;
  preferences: Record<string, any>;
  studysetId?: string;
  workflowType?: WorkflowType;
  settings?: {
    knowledgeLevel: 'nothing' | 'some' | 'medium' | 'advanced';
    studyDays: string[];
    workflowSetting: string;
  };
};

interface Step3SettingsProps {
  data: WorkflowData;
  setData: (data: WorkflowData) => void;
}

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const workflowSettings: Record<WorkflowType, { label: string; options: string[] }> = {
  balanced: {
    label: 'Tool mix preference:',
    options: ['Balanced (all tools equally)', 'Quiz-heavy (more practice)', 'Visual (timelines, mindmaps)', 'Theory-first (notes, summaries)'],
  },
  test_prep: {
    label: 'Question variety:',
    options: ['Mixed (MC, short answer, essays)', 'Exam format matching', 'Pattern recognition'],
  },
  visual: {
    label: 'Content organization:',
    options: ['Chronological first', 'Thematic grouping', 'Cause-effect relationships'],
  },
  deep_diver: {
    label: 'Connection depth:',
    options: ['Foundational concepts only', 'Cross-topic relationships', 'Advanced synthesis (connect everything)'],
  },
  quick_learner: {
    label: 'Review frequency:',
    options: ['Intensive spaced (short intervals)', 'Standard spaced (daily)', 'Relaxed (every other day)'],
  },
};

export function Step3Settings({ data, setData }: Step3SettingsProps) {
  const workflowType = data.workflowType || 'balanced';
  const currentSettings = data.settings || {
    knowledgeLevel: 'nothing',
    studyDays: ['Monday', 'Wednesday', 'Friday'],
    workflowSetting: '',
  };

  const handleKnowledgeChange = (level: 'nothing' | 'some' | 'medium' | 'advanced') => {
    setData({
      ...data,
      settings: {
        ...currentSettings,
        knowledgeLevel: level,
      },
    });
  };

  const handleDayToggle = (day: string) => {
    const updatedDays = currentSettings.studyDays.includes(day)
      ? currentSettings.studyDays.filter((d) => d !== day)
      : [...currentSettings.studyDays, day];

    setData({
      ...data,
      settings: {
        ...currentSettings,
        studyDays: updatedDays,
      },
    });
  };

  const handleWorkflowSetting = (setting: string) => {
    setData({
      ...data,
      settings: {
        ...currentSettings,
        workflowSetting: setting,
      },
    });
  };

  const workflowConfig = workflowSettings[workflowType];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customize Your Plan</CardTitle>
        <CardDescription>
          These settings personalize your study schedule and AI-generated plan
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Knowledge Level */}
        <div className="space-y-3">
          <label className="block text-sm font-medium">How much do you already know?</label>
          <select
            value={currentSettings.knowledgeLevel}
            onChange={(e) => handleKnowledgeChange(e.target.value as any)}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background"
          >
            <option value="nothing">Nothing - Start from basics</option>
            <option value="some">A little - Some background</option>
            <option value="medium">Medium - Comfortable with basics</option>
            <option value="advanced">Advanced - Deep understanding</option>
          </select>
        </div>

        {/* Study Days */}
        <div className="space-y-3">
          <label className="block text-sm font-medium">What days can you study?</label>
          <div className="grid grid-cols-2 gap-2">
            {days.map((day) => (
              <label key={day} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={currentSettings.studyDays.includes(day)}
                  onChange={() => handleDayToggle(day)}
                  className="rounded border-border"
                />
                <span>{day}</span>
              </label>
            ))}
          </div>
          {currentSettings.studyDays.length === 0 && (
            <p className="text-xs text-destructive">Please select at least one day</p>
          )}
        </div>

        {/* Workflow-Specific Setting */}
        <div className="space-y-3">
          <label className="block text-sm font-medium">{workflowConfig.label}</label>
          <select
            value={currentSettings.workflowSetting}
            onChange={(e) => handleWorkflowSetting(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background"
          >
            <option value="">Select an option</option>
            {workflowConfig.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        {/* Info Box */}
        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4 border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-900 dark:text-blue-200">
            <strong>💡 Tip:</strong> These settings help the AI generate a personalized schedule that matches your learning
            style and availability.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
