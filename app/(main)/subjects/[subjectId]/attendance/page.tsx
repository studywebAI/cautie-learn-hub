'use client';

import { useContext } from 'react';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { SubjectGroupTab } from '@/components/subjects/subject-group-tab';

export default function SubjectAttendancePage() {
  const params = useParams();
  const subjectId = params.subjectId as string;
  const context = useContext(AppContext) as AppContextType | null;
  const subject = (context?.subjects || []).find((s: any) => s.id === subjectId);

  return (
    <div className="page-content">
      <PageHeader title={subject?.title || 'Attendance'} subtitle="Attendance" />
      <SubjectGroupTab subjectId={subjectId} />
    </div>
  );
}
