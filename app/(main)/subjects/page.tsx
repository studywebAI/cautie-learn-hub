'use client';

import { useContext } from 'react';
import { AppContext } from '@/contexts/app-context';
import { SubjectsGrid } from '@/components/subjects-grid';

export default function SubjectsPage() {
  const context = useContext(AppContext);
  const isTeacher = context?.role === 'teacher';

  return (
    <div className="h-full p-4 md:p-6">
      <SubjectsGrid isTeacher={isTeacher} />
    </div>
  );
}
