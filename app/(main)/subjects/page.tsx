'use client';

import { Suspense, useContext } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { SubjectsGrid } from '@/components/subjects-grid';
import { TodaysAgenda } from '@/components/dashboard/todays-agenda';
import { PageHeader } from '@/components/page-header';

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
  // Subjects defaults to showing everything the teacher has access to --
  // class or no class -- unlike the class-switcher elsewhere in the app.
  // A class filter only applies when explicitly requested via ?classId=,
  // e.g. from the sidebar's per-class navigation. Teachers with zero
  // classes (fully standalone subjects) are a valid state now, not an
  // error state.
  const teacherClassId = searchParams?.get('classId') || undefined;

  if (isTeacher && context?.isLoading) {
    return null;
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
        <PageHeader title="Subjects" />
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
      <PageHeader title="Subjects" />
      <SubjectsGrid isTeacher={isTeacher} classId={isTeacher ? teacherClassId : undefined} />
    </div>
  );
}
