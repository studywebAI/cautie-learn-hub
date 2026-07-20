'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ScheduleTabRedesigned } from '@/components/class/schedule-tab-redesigned';
import { CalendarTab } from '@/components/class/calendar-tab';

type ClassOption = { id: string; name: string };

type ScheduleConfigureDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classes: ClassOption[];
  classId: string | null;
  onClassIdChange: (classId: string) => void;
  onSaved?: () => void;
};

export function ScheduleConfigureDialog({
  open,
  onOpenChange,
  classes,
  classId,
  onClassIdChange,
  onSaved,
}: ScheduleConfigureDialogProps) {
  const [tab, setTab] = useState<'schedule' | 'calendar'>('schedule');

  return (
    <Dialog open={open} onOpenChange={(next) => {
      onOpenChange(next);
      if (!next) onSaved?.();
    }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure schedule & calendar</DialogTitle>
        </DialogHeader>

        {classes.length > 1 && (
          <div className="space-y-1.5">
            <Label>Class</Label>
            <Select value={classId ?? undefined} onValueChange={onClassIdChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((classItem) => (
                  <SelectItem key={classItem.id} value={classItem.id}>{classItem.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
          <button
            type="button"
            onClick={() => setTab('schedule')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${tab === 'schedule' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Weekly schedule
          </button>
          <button
            type="button"
            onClick={() => setTab('calendar')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${tab === 'calendar' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Calendar events
          </button>
        </div>

        {classId ? (
          <div className="pt-2">
            {tab === 'schedule' ? (
              <ScheduleTabRedesigned classId={classId} />
            ) : (
              <CalendarTab classId={classId} />
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-6 text-center">No class selected.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
