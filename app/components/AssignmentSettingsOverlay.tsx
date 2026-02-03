'use client';

import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Check, X } from 'lucide-react';

interface AssignmentSettingsOverlayProps {
  isVisible: boolean;
  answersEnabled: boolean;
  onVisibilityChange: (visible: boolean) => void;
  onAnswersEnabledChange: (enabled: boolean) => void;
  isLoading?: boolean;
}

export function AssignmentSettingsOverlay({
  isVisible,
  answersEnabled,
  onVisibilityChange,
  onAnswersEnabledChange,
  isLoading = false,
}: AssignmentSettingsOverlayProps) {
  return (
    <div className="bg-popover border rounded-lg shadow-lg p-4 min-w-[200px] space-y-4">
      <div className="text-sm font-medium text-foreground mb-3">Assignment Settings</div>
      
      {/* Visibility toggle */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {isVisible ? (
            <Eye className="h-4 w-4 text-muted-foreground" />
          ) : (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          )}
          <Label htmlFor="visibility" className="text-sm font-normal">
            Visible to students
          </Label>
        </div>
        <Switch
          id="visibility"
          checked={isVisible}
          onCheckedChange={onVisibilityChange}
          disabled={isLoading}
        />
      </div>
      
      {/* Answers toggle */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {answersEnabled ? (
            <Check className="h-4 w-4 text-muted-foreground" />
          ) : (
            <X className="h-4 w-4 text-muted-foreground" />
          )}
          <Label htmlFor="answers" className="text-sm font-normal">
            Answers enabled
          </Label>
        </div>
        <Switch
          id="answers"
          checked={answersEnabled}
          onCheckedChange={onAnswersEnabledChange}
          disabled={isLoading}
        />
      </div>
      
      <p className="text-xs text-muted-foreground pt-2 border-t">
        {!isVisible && "Students cannot see this assignment. "}
        {answersEnabled ? "Students can check their answers." : "Self-check is disabled."}
      </p>
    </div>
  );
}
