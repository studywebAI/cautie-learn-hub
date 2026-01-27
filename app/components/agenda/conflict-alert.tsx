'use client';

import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Lightbulb } from 'lucide-react';
import type { ScheduleConflict } from '@/lib/schedule-utils';

interface ConflictAlertProps {
  conflicts: ScheduleConflict[];
  onResolveConflict?: (conflict: ScheduleConflict, action: string) => void;
}

export function ConflictAlert({ conflicts, onResolveConflict }: ConflictAlertProps) {
  const [dismissedConflicts, setDismissedConflicts] = useState<Set<string>>(new Set());

  if (conflicts.length === 0) return null;

  const visibleConflicts = conflicts.filter(c => !dismissedConflicts.has(`${c.taskId1}-${c.taskId2}`));

  if (visibleConflicts.length === 0) return null;

  return (
    <div className="space-y-2">
      {visibleConflicts.map((conflict, index) => (
        <Alert key={index} className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-800">Schedule Conflict Detected</AlertTitle>
          <AlertDescription className="text-orange-700">
            <div className="space-y-2">
              <p>{conflict.description}</p>
              <div className="flex items-start gap-2">
                <Lightbulb className="h-4 w-4 mt-0.5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Suggestion:</p>
                  <p className="text-sm text-blue-700">{conflict.suggestion}</p>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                {onResolveConflict && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onResolveConflict(conflict, 'reschedule_first')}
                    >
                      Reschedule Task 1
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onResolveConflict(conflict, 'reschedule_second')}
                    >
                      Reschedule Task 2
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onResolveConflict(conflict, 'extend_duration')}
                    >
                      Extend Duration
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDismissedConflicts(prev => new Set([...prev, `${conflict.taskId1}-${conflict.taskId2}`]))}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}