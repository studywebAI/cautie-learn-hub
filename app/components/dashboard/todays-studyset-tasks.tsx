'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Route, ArrowRight } from 'lucide-react';

type StudysetAgendaTask = {
  id: string;
  type: string;
  title: string;
  estimated_minutes: number;
  completed: boolean;
};

type StudysetAgendaItem = {
  id: string;
  studyset_id: string;
  title: string;
  plan_date: string;
  estimated_minutes: number;
  tasks: StudysetAgendaTask[];
};

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

export function TodaysStudysetTasks() {
  const [items, setItems] = useState<StudysetAgendaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        const today = isoToday();
        const response = await fetch(`/api/studysets/agenda?from=${today}&to=${today}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          setItems([]);
          return;
        }
        const data = await response.json();
        setItems(Array.isArray(data?.items) ? data.items : []);
      } catch (error: any) {
        if (error?.name === 'AbortError') return;
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
    return () => controller.abort();
  }, []);

  const summary = useMemo(() => {
    const allTasks = items.flatMap((item) => item.tasks || []);
    const completed = allTasks.filter((task) => task.completed).length;
    const total = allTasks.length;
    return { completed, total };
  }, [items]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Today&apos;s Studyset</CardTitle>
          <CardDescription>Loading tasks...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Route className="h-4 w-4" />
          Today&apos;s Studyset
        </CardTitle>
        <CardDescription>
          {summary.completed}/{summary.total} tasks completed today
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.slice(0, 2).map((item) => {
          const completed = (item.tasks || []).filter((task) => task.completed).length;
          const total = (item.tasks || []).length;
          return (
            <div key={item.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium truncate">{item.title}</p>
                <Badge variant="outline">
                  {completed}/{total}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.estimated_minutes} min planned
              </p>
              <div className="mt-3">
                <Button asChild size="sm" variant="outline">
                  <Link prefetch={false} href={`/tools/studyset/${item.studyset_id}`}>
                    Open Studyset
                    <ArrowRight className="ml-2 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
