'use client';

import { Suspense, useContext, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { SubjectsGrid } from '@/components/subjects-grid';
import { Button } from '@/components/ui/button';
import { ArrowUpRight } from 'lucide-react';

export default function SubjectsPage() {
  return (
    <Suspense
      fallback={
        <div className="h-full p-6 md:p-8">
          <div className="rounded-lg border border-dashed p-8 text-sm text-muted-foreground">Loading subjects...</div>
        </div>
      }
    >
      <SubjectsPageContent />
    </Suspense>
  );
}

function SubjectsPageContent() {
  const context = useContext(AppContext) as AppContextType | null;
  const router = useRouter();
  const searchParams = useSearchParams();
  const isTeacher = context?.role === 'teacher';
  const [teacherClassId, setTeacherClassId] = useState<string | undefined>(undefined);

  const teacherActiveClasses = useMemo(
    () => (context?.classes || []).filter((classItem) => classItem.status !== 'archived'),
    [context?.classes]
  );

  useEffect(() => {
    if (!isTeacher) return;
    const classIdFromQuery = searchParams?.get('classId') || '';
    const savedClassId = typeof window !== 'undefined' ? window.localStorage.getItem('studyweb-last-class-id') : null;
    const preferredClass =
      teacherActiveClasses.find((classItem) => classItem.id === classIdFromQuery) ||
      teacherActiveClasses.find((classItem) => classItem.id === savedClassId) ||
      teacherActiveClasses[0];
    setTeacherClassId(preferredClass?.id);
  }, [isTeacher, teacherActiveClasses, searchParams]);

  const selectedClass = useMemo(
    () => teacherActiveClasses.find((classItem) => classItem.id === teacherClassId),
    [teacherActiveClasses, teacherClassId]
  );

  const handleTeacherClassChange = (nextClassId: string) => {
    setTeacherClassId(nextClassId);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('studyweb-last-class-id', nextClassId);
    }
    router.replace(`/subjects?classId=${nextClassId}`);
  };

  if (isTeacher && !teacherClassId) {
    return (
      <div className="h-full px-4 py-4 md:px-6 md:py-5">
        <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
          No active class selected. Select or create a class first.
        </div>
      </div>
    );
  }

  if (isTeacher) {
    return (
      <div className="h-full px-4 py-4 md:px-6 md:py-5">
        <div className="mb-4 rounded-2xl border border-border/70 bg-[hsl(var(--surface-1))] px-4 py-4 md:px-5 md:py-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-[18px] font-semibold lowercase">subjects</h1>
              <p className="mt-1 text-[13px] text-muted-foreground">Manage subjects within your active class.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                value={teacherClassId}
                onChange={(event) => handleTeacherClassChange(event.target.value)}
                className="h-9 min-w-[220px] rounded-xl border border-sidebar-border/80 bg-sidebar-accent px-3 text-[13px] text-[hsl(var(--sidebar-active-foreground))]"
              >
                {teacherActiveClasses.map((classItem) => (
                  <option key={classItem.id} value={classItem.id}>
                    {classItem.name}
                  </option>
                ))}
              </select>
              <Button asChild size="sm" variant="outline" className="h-9 rounded-xl border-sidebar-border/80 bg-sidebar-accent px-3 text-[hsl(var(--sidebar-active-foreground))] hover:bg-sidebar-accent/90">
                <Link href={`/class/${teacherClassId}?tab=subjects`}>
                  open in manage
                  <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
        <SubjectsGrid isTeacher={true} classId={teacherClassId} />
      </div>
    );
  }

  return (
    <div className="h-full px-4 py-4 md:px-6 md:py-5">
      <div className="mb-4 rounded-2xl border border-border/70 bg-[hsl(var(--surface-1))] px-4 py-4 md:px-5 md:py-5">
        <h1 className="text-[18px] font-semibold lowercase">subjects</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">Browse your subjects and continue where you left off.</p>
      </div>
      <SubjectsGrid isTeacher={isTeacher} classId={isTeacher ? teacherClassId : undefined} />
    </div>
  );
}
