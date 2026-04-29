'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useContext } from 'react';
import { cn } from '@/lib/utils';
import {
  UsersRound, Settings2, UserCheck, UserRoundPlus, ChartColumnIncreasing, ClipboardCheck, History, Share2
} from 'lucide-react';
import Link from 'next/link';
import { AppContext } from '@/contexts/app-context';
import { STUDENT_CLASS_TAB_IDS, TEACHER_CLASS_TAB_IDS } from '@/lib/class-tabs';

export default function ClassLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const searchParams = useSearchParams();
  const { role, isLoading, language } = useContext(AppContext) as any;
  const classId = params.classId as string;
  const isDutch = language === 'nl';

  const tabDefinitions = {
    invite: { label: isDutch ? 'Uitnodigen' : 'Invite', icon: UserRoundPlus, href: '?tab=invite' },
    group: { label: isDutch ? 'Groep' : 'Group', icon: UsersRound, href: '?tab=group' },
    share: { label: isDutch ? 'Delen' : 'Share', icon: Share2, href: '?tab=share' },
    attendance: { label: isDutch ? 'Aanwezigheid' : 'Attendance', icon: UserCheck, href: '?tab=attendance' },
    grades: { label: isDutch ? 'Cijfers' : 'Grades', icon: ClipboardCheck, href: '?tab=grades' },
    analytics: { label: isDutch ? 'Analyse' : 'Analytics', icon: ChartColumnIncreasing, href: '?tab=analytics' },
    logs: { label: isDutch ? 'Logs' : 'Logs', icon: History, href: '?tab=logs' },
    settings: { label: isDutch ? 'Instellingen' : 'Settings', icon: Settings2, href: '?tab=settings' },
  } as const;

  const teacherTabs = TEACHER_CLASS_TAB_IDS.map((id) => ({ id, ...tabDefinitions[id] }));
  const studentTabs = STUDENT_CLASS_TAB_IDS.map((id) => ({ id, ...tabDefinitions[id] }));

  const isTeacherRole = role === 'teacher' || role === 'owner' || role === 'admin' || role === 'creator';
  const requestedTabRaw = searchParams?.get('tab') || '';
  const requestedTab = requestedTabRaw.trim().toLowerCase();
  const requestedTeacherTab = teacherTabs.some((tab) => tab.id === requestedTab);
  const visibleTabs = (isTeacherRole || (isLoading && requestedTeacherTab)) ? teacherTabs : studentTabs;
  const tabIds = new Set<string>(visibleTabs.map((tab) => tab.id));
  const defaultTab = isTeacherRole ? 'group' : 'invite';
  const currentTab = tabIds.has(requestedTab) ? requestedTab : defaultTab;

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="px-1 py-1">
        <div className="rounded-md surface-panel p-2">
          <nav className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <Link
                  key={tab.id}
                  href={`/class/${classId}${tab.href}`}
                  replace
                  prefetch={false}
                  className={cn(
                    "inline-flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-[13px] transition-colors",
                    isActive
                      ? "surface-chip text-foreground shadow-[inset_0_0_0_1px_hsl(var(--border))]"
                      : "text-foreground/85 hover:surface-interactive hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-1 flex justify-end">
            <button
              type="button"
              className="inline-flex h-9 items-center rounded-md bg-white px-3 text-[12px] text-foreground/85 hover:surface-panel hover:text-foreground"
              onClick={() => {
                window.dispatchEvent(new Event('cautie:open-class-dropdown'));
              }}
            >
              {isDutch ? 'Selecteer andere klas' : 'Select different class'}
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-auto p-0">
        {children}
      </main>
    </div>
  );
}
