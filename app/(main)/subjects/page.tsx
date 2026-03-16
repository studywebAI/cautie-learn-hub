'use client';

import { useContext, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { SubjectsGrid } from '@/components/subjects-grid';
import { Button } from '@/components/ui/button';
import { ArrowUpRight } from 'lucide-react';

export default function SubjectsPage() {
  const context = useContext(AppContext) as AppContextType | null;
  const router = useRouter();
  const isTeacher = context?.role === 'teacher';
  const [teacherClassId, setTeacherClassId] = useState<string | undefined>(undefined);

  const teacherActiveClasses = useMemo(
    () => (context?.classes || []).filter((classItem) => classItem.status !== 'archived'),
    [context?.classes]
  );

  useEffect(() => {
    if (!isTeacher) return;
    const savedClassId = typeof window !== 'undefined' ? window.localStorage.getItem('studyweb-last-class-id') : null;
    const preferredClass =
      teacherActiveClasses.find((classItem) => classItem.id === savedClassId) || teacherActiveClasses[0];
    setTeacherClassId(preferredClass?.id);
  }, [isTeacher, teacherActiveClasses]);

  useEffect(() => {
    if (!isTeacher || !teacherClassId) return;
    router.replace(`/class/${teacherClassId}?tab=subjects`);
  }, [isTeacher, teacherClassId, router]);

  const selectedClass = useMemo(
    () => teacherActiveClasses.find((classItem) => classItem.id === teacherClassId),
    [teacherActiveClasses, teacherClassId]
  );

  const handleTeacherClassChange = (nextClassId: string) => {
    setTeacherClassId(nextClassId);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('studyweb-last-class-id', nextClassId);
    }
  };

  if (isTeacher && !teacherClassId) {
    return (
      <div className="h-full p-5 md:p-7">
        <div className="rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
          No active class selected. Select or create a class first.
        </div>
      </div>
    );
  }

  if (isTeacher) {
    return (
      <div className="h-full p-5 md:p-7">
        <div className="rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
          Redirecting to the selected class subjects...
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-5 md:p-7">
      {isTeacher && (
        <div className="mb-4 rounded-xl border border-border/70 bg-[hsl(var(--surface-1))] p-3 md:p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <p className="text-xs tracking-[0.08em] text-muted-foreground uppercase">class context</p>
              <p className="truncate text-sm font-medium lowercase">
                showing subjects for {selectedClass?.name || 'selected class'}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                value={teacherClassId}
                onChange={(event) => handleTeacherClassChange(event.target.value)}
                className="h-9 min-w-[190px] rounded-md border border-border bg-background px-2 text-sm"
              >
                {teacherActiveClasses.map((classItem) => (
                  <option key={classItem.id} value={classItem.id}>
                    {classItem.name}
                  </option>
                ))}
              </select>
              <Button asChild size="sm" variant="outline" className="h-9">
                <Link href={`/class/${teacherClassId}?tab=subjects`}>
                  open class
                  <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
      <SubjectsGrid isTeacher={isTeacher} classId={isTeacher ? teacherClassId : undefined} />
    </div>
  );
}
