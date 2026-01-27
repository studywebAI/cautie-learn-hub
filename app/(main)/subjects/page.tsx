'use client';

import { useContext } from 'react';
import { AppContext } from '@/contexts/app-context';
import { SubjectsGrid } from '@/components/subjects-grid';

export default function SubjectsPage() {
  const context = useContext(AppContext);
  const role = context?.role || 'student';

  return (
    <SubjectsGrid isTeacher={role === 'teacher'} />
  );
}
