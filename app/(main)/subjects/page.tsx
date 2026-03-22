'use client';

import { Suspense, useContext, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { SubjectsGrid } from '@/components/subjects-grid';

export default function SubjectsPage() {
  return (
    <Suspense fallback={null}>
      <SubjectsPageContent />
    </Suspense>
  );
}

function SubjectsPageContent() {
  const context = useContext(AppContext) as AppContextType | null;
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

  if (isTeacher && !teacherClassId) {
    return (
      <div className="h-full px-4 py-4 md:px-6 md:py-5">
        <div className="rounded-xl border border-sidebar-border/80 bg-sidebar-accent/40 p-8 text-[13px] text-sidebar-foreground">
          No active class selected. Select or create a class first.
        </div>
      </div>
    );
  }

  if (isTeacher) {
    return (
      <div className="h-full px-4 py-4 md:px-6 md:py-5">
        <SubjectsGrid isTeacher={true} classId={teacherClassId} />
      </div>
    );
  }

  return (
    <div className="h-full px-4 py-4 md:px-6 md:py-5">
      <SubjectsGrid isTeacher={isTeacher} classId={isTeacher ? teacherClassId : undefined} />
    </div>
  );
}

