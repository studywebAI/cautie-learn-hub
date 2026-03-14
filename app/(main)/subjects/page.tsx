'use client';

import { useContext, useEffect, useMemo, useState } from 'react';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { SubjectsGrid } from '@/components/subjects-grid';

export default function SubjectsPage() {
  const context = useContext(AppContext) as AppContextType | null;
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

  if (isTeacher && !teacherClassId) {
    return (
      <div className="h-full p-4 md:p-6">
        <div className="rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
          No active class selected. Select or create a class first.
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-4 md:p-6">
      <SubjectsGrid isTeacher={isTeacher} classId={isTeacher ? teacherClassId : undefined} />
    </div>
  );
}
