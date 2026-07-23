'use client';

import { useContext, useState } from 'react';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { SubjectGroupTab } from '@/components/subjects/subject-group-tab';
import { SubjectRosterTab } from '@/components/subjects/subject-roster-tab';
import { cn } from '@/lib/utils';

const TABS = ['attendance', 'group'] as const;
type Tab = (typeof TABS)[number];

export default function SubjectAttendancePage() {
  const params = useParams();
  const subjectId = params.subjectId as string;
  const context = useContext(AppContext) as AppContextType | null;
  const subject = (context?.subjects || []).find((s: any) => s.id === subjectId);
  const isDutch = context?.language === 'nl';
  const [tab, setTab] = useState<Tab>('attendance');

  const labels: Record<Tab, string> = {
    attendance: isDutch ? 'Aanwezigheid' : 'Attendance',
    group: isDutch ? 'Groep' : 'Group',
  };

  return (
    <div className="page-content">
      <PageHeader title={subject?.title || 'Attendance'} subtitle={labels[tab]} />

      <div className="mb-4 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-3 py-2 text-[13px] border-b-2 -mb-px transition-colors',
              tab === t
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {labels[t]}
          </button>
        ))}
      </div>

      {tab === 'attendance' ? (
        <SubjectGroupTab subjectId={subjectId} />
      ) : (
        <SubjectRosterTab subjectId={subjectId} />
      )}
    </div>
  );
}
