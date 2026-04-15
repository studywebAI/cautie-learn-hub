'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useContext } from 'react';
import { cn } from '@/lib/utils';
import { 
  Users, Settings, Calendar, UserPlus, Layers, ClipboardCheck, History
} from 'lucide-react';
import Link from 'next/link';
import { AppContext } from '@/contexts/app-context';

const teacherTabs = [
  { id: 'invite', label: 'Invite', icon: UserPlus, href: '?tab=invite' },
  { id: 'group', label: 'Group', icon: Users, href: '?tab=group' },
  { id: 'attendance', label: 'Attendance', icon: Calendar, href: '?tab=attendance' },
  { id: 'grades', label: 'Grades', icon: ClipboardCheck, href: '?tab=grades' },
  { id: 'analytics', label: 'Analytics', icon: Layers, href: '?tab=analytics' },
  { id: 'logs', label: 'Logs', icon: History, href: '?tab=logs' },
  { id: 'settings', label: 'Settings', icon: Settings, href: '?tab=settings' },
];

const studentTabs = [
  { id: 'invite', label: 'Invite', icon: UserPlus, href: '?tab=invite' },
  { id: 'group', label: 'Group', icon: Users, href: '?tab=group' },
];

export default function ClassLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const searchParams = useSearchParams();
  const { role, isLoading } = useContext(AppContext) as any;
  const classId = params.classId as string;

  const isTeacherRole = role === 'teacher' || role === 'owner' || role === 'admin' || role === 'creator';
  const requestedTabRaw = searchParams?.get('tab') || '';
  const requestedTab = requestedTabRaw.trim().toLowerCase();
  const requestedTeacherTab = teacherTabs.some((tab) => tab.id === requestedTab);
  const visibleTabs = (isTeacherRole || (isLoading && requestedTeacherTab)) ? teacherTabs : studentTabs;
  const tabIds = new Set(visibleTabs.map((tab) => tab.id));
  const defaultTab = isTeacherRole ? 'group' : 'invite';
  const currentTab = tabIds.has(requestedTab) ? requestedTab : defaultTab;

  return (
    <div className="flex h-full flex-col gap-2.5">
      <div className="rounded-2xl bg-[hsl(var(--surface-1))] p-3">
        <nav className="flex flex-wrap items-center gap-2">
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
                  "inline-flex h-11 items-center gap-2 rounded-xl px-4 text-[13px] transition-colors",
                  isActive
                    ? "bg-[hsl(var(--surface-3))] text-foreground"
                    : "bg-[hsl(var(--surface-2))] text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          })}
          <button
            type="button"
            className="ml-auto inline-flex h-9 items-center rounded-xl bg-[hsl(var(--surface-2))] px-3 text-[12px] text-muted-foreground hover:text-foreground"
            onClick={() => {
              window.dispatchEvent(new Event('cautie:open-class-dropdown'));
            }}
          >
            Select different class
          </button>
        </nav>
      </div>

      <main className="flex-1 overflow-auto p-0">
        {children}
      </main>
    </div>
  );
}
