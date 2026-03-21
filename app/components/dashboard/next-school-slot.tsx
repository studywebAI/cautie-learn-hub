'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type SchoolSlot = {
  id: string;
  class_id: string;
  class_name: string;
  day_of_week: number;
  period_index: number;
  title: string;
  start_time: string;
  end_time: string;
  is_break: boolean;
  notes?: string | null;
};

export function NextSchoolSlot({ slots }: { slots: SchoolSlot[] }) {
  const nextSlot = useMemo(() => {
    const now = new Date();
    const jsDay = now.getDay(); // 0-6, Sunday=0
    const day = jsDay === 0 ? 7 : jsDay; // 1-7, Monday=1
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const todays = (slots || [])
      .filter((slot) => slot.day_of_week === day)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));

    for (const slot of todays) {
      const [h, m] = slot.start_time.split(':').map(Number);
      const startMinutes = (h || 0) * 60 + (m || 0);
      if (startMinutes >= nowMinutes) return slot;
    }
    return null;
  }, [slots]);

  if (!nextSlot) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Next School Slot</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-medium">
          {nextSlot.title} ({nextSlot.class_name})
        </p>
        <p className="text-sm text-muted-foreground">
          {nextSlot.start_time} - {nextSlot.end_time} · Period {nextSlot.period_index}
          {nextSlot.is_break ? ' · Break' : ''}
        </p>
      </CardContent>
    </Card>
  );
}

