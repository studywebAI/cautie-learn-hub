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
  const [teacherClassId, setTeacherClassId] = useState<string | undefined>(() => {
    if (typeof window === 'undefined') return undefined;
    return window.localStorage.getItem('studyweb-last-class-id') || undefined;
  });

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
    if (!preferredClass?.id) return;
    setTeacherClassId(preferredClass.id);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('studyweb-last-class-id', preferredClass.id);
    }
  }, [isTeacher, teacherActiveClasses, searchParams]);

  if (isTeacher && context?.isLoading) {
    return null;
  }

  if (isTeacher && !teacherClassId && teacherActiveClasses.length > 0) {
    return null;
  }

  if (isTeacher && !teacherClassId) {
    return (
      <div className="h-full px-2 py-3 md:px-3 md:py-4">
        <div className="rounded-xl border border-sidebar-border/80 bg-sidebar-accent/40 p-8 text-[13px] text-sidebar-foreground">
          No Active Class Selected. Select or create a class first.
        </div>
      </div>
    );
  }

  if (isTeacher) {
    return (
      <div className="h-full w-full px-2 py-3 md:px-3 md:py-4">
        <SubjectsGrid isTeacher={true} classId={teacherClassId} />
      </div>
    );
  }

  return (
    <div className="h-full w-full px-2 py-3 md:px-3 md:py-4">
      <SubjectsGrid isTeacher={isTeacher} classId={isTeacher ? teacherClassId : undefined} />
    </div>
  );
}

