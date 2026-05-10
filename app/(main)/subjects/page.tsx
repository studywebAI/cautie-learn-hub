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
      <div className="page-content">
        <div className="rounded-xl border border-sidebar-border/80 bg-sidebar-accent/40 p-8 text-[13px] text-sidebar-foreground">
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
      <div className="page-content">
        <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div className="rounded-xl border border-sidebar-border/80 bg-sidebar-accent/35 p-4">
            <p className="text-[11px] uppercase tracking-wide text-sidebar-foreground/80">Subjects</p>
            <p className="mt-1 text-2xl leading-none text-sidebar-foreground">{teacherSubjects.length}</p>
          </div>
          <div className="rounded-xl border border-sidebar-border/80 bg-sidebar-accent/35 p-4">
            <p className="text-[11px] uppercase tracking-wide text-sidebar-foreground/80">Assignments</p>
            <p className="mt-1 text-2xl leading-none text-sidebar-foreground">{teacherAssignments.length}</p>
          </div>
          <div className="rounded-xl border border-sidebar-border/80 bg-sidebar-accent/35 p-4">
            <p className="text-[11px] uppercase tracking-wide text-sidebar-foreground/80">Today</p>
            <p className="mt-1 text-2xl leading-none text-sidebar-foreground">{teacherTasks.length}</p>
          </div>
        </div>
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
    <div className="page-content">
      <SubjectsGrid isTeacher={isTeacher} classId={isTeacher ? teacherClassId : undefined} />
    </div>
  );
}
