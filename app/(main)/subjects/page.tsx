'use client';

import { Suspense, useContext, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { SubjectsGrid } from '@/components/subjects-grid';
import { TodaysAgenda } from '@/components/dashboard/todays-agenda';

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
      <div className="page-content flex flex-col gap-5">
        <h1 className="page-title">Subjects</h1>
        <div className="rounded-xl border border-border surface-panel p-8 text-[13px] text-muted-foreground">
          No Active Class Selected. Select or create a class first.
        </div>
      </div>
    );
  }

  if (isTeacher) {
    const teacherAssignments = Array.isArray(context?.assignments)
      ? context.assignments.filter((item) => !teacherClassId || item.class_id === teacherClassId)
      : [];
    const teacherTasks = Array.isArray(context?.personalTasks) ? context.personalTasks : [];
    const teacherSubjects = Array.isArray(context?.subjects)
      ? context.subjects.filter((subject) => {
          if (!teacherClassId) return true;
          const classIds = Array.isArray(subject?.classes) ? subject.classes.map((classItem: any) => classItem?.id) : [];
          return classIds.includes(teacherClassId);
        })
      : [];

    return (
      <div className="page-content flex flex-col gap-5">
        <h1 className="page-title">Subjects</h1>
        <TodaysAgenda
          assignments={teacherAssignments}
          personalTasks={teacherTasks}
          classes={Array.isArray(context?.classes) ? context.classes : []}
        />
        <SubjectsGrid isTeacher={true} classId={teacherClassId} />
      </div>
    );
  }

  return (
    <div className="page-content flex flex-col gap-5">
      <h1 className="page-title">Subjects</h1>
      <SubjectsGrid isTeacher={isTeacher} classId={isTeacher ? teacherClassId : undefined} />
    </div>
  );
}
