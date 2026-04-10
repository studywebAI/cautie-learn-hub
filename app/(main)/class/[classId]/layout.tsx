'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useContext } from 'react';
import { cn } from '@/lib/utils';
import { 
  Users, FileText, Library, Calendar, UserPlus
} from 'lucide-react';
import Link from 'next/link';
import { AppContext } from '@/contexts/app-context';

const teacherTabs = [
  { id: 'subjects', label: 'Subjects', icon: Library, href: '?tab=subjects' },
  { id: 'assignments', label: 'Assignments', icon: FileText, href: '?tab=assignments' },
  { id: 'materials', label: 'Materials', icon: Calendar, href: '?tab=materials' },
  { id: 'group', label: 'Group', icon: Users, href: '?tab=group' },
  { id: 'invite', label: 'Invite', icon: UserPlus, href: '?tab=invite' },
];

const studentTabs = [
  { id: 'invite', label: 'Invite', icon: UserPlus, href: '?tab=invite' },
  { id: 'assignments', label: 'Assignments', icon: FileText, href: '?tab=assignments' },
  { id: 'materials', label: 'Materials', icon: Calendar, href: '?tab=materials' },
  { id: 'group', label: 'Group', icon: Users, href: '?tab=group' },
];

export default function ClassLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const searchParams = useSearchParams();
  const { role } = useContext(AppContext) as any;
  const classId = params.classId as string;

  // Use useSearchParams properly - this will re-render when URL changes
  const currentTab = searchParams?.get('tab') || (role === 'teacher' ? 'subjects' : 'invite');

  const visibleTabs = role === 'teacher' ? teacherTabs : studentTabs;

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
