'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useContext } from 'react';
import { cn } from '@/lib/utils';
import { 
  BookOpen, Users, FileText, Settings, GraduationCap, Bell, 
  BarChart3, Library, Calendar, UserPlus, Layers,
  ClipboardCheck, History
} from 'lucide-react';
import Link from 'next/link';
import { AppContext } from '@/contexts/app-context';

const tabs = [
  { id: 'invite', label: 'Invite', icon: UserPlus, href: '?tab=invite' },
  { id: 'group', label: 'Group', icon: Users, href: '?tab=group' },
  { id: 'attendance', label: 'Attendance', icon: Calendar, href: '?tab=attendance' },
  { id: 'grades', label: 'Grades', icon: ClipboardCheck, href: '?tab=grades' },
  { id: 'analytics', label: 'Analytics', icon: Layers, href: '?tab=analytics' },
  { id: 'logs', label: 'Logs', icon: History, href: '?tab=logs' },
  { id: 'settings', label: 'Settings', icon: Settings, href: '?tab=settings' },
];

export default function ClassLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const searchParams = useSearchParams();
  const { role } = useContext(AppContext) as any;
  const classId = params.classId as string;

  // Use useSearchParams properly - this will re-render when URL changes
  const currentTab = searchParams?.get('tab') || (role === 'teacher' ? 'subjects' : 'invite');

  const visibleTabs = tabs;

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="rounded-2xl bg-[hsl(var(--surface-1))] p-4">
        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
          <button
            type="button"
            className="inline-flex h-11 items-center rounded-xl bg-[hsl(var(--surface-2))] px-4 text-[13px] text-muted-foreground hover:text-foreground"
            onClick={() => {
              window.dispatchEvent(new Event('cautie:open-class-dropdown'));
            }}
          >
            Select different class
          </button>
        </div>
        <nav className="flex flex-wrap gap-2">
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
        </nav>
        </div>
      </div>

      <main className="flex-1 overflow-auto p-4">
        {children}
      </main>
    </div>
  );
}
