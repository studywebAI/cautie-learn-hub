'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState, useContext } from 'react';
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
  { id: 'progress', label: 'Progress', icon: BarChart3, href: '?tab=progress' },
  { id: 'subjects', label: 'Subjects', icon: Library, href: '?tab=subjects' },
  { id: 'analytics', label: 'Analytics', icon: Layers, href: '?tab=analytics' },
  { id: 'logs', label: 'Logs', icon: History, href: '?tab=logs' },
  { id: 'settings', label: 'Settings', icon: Settings, href: '?tab=settings' },
];

export default function ClassLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const searchParams = useSearchParams();
  const { classes, role } = useContext(AppContext) as any;
  const classId = params.classId as string;
  
  // Get class name from context first (instant), fallback to API only if needed
  const contextClass = classes?.find((c: any) => c.id === classId);
  const [className, setClassName] = useState<string>(contextClass?.name || '');

  // Use useSearchParams properly - this will re-render when URL changes
  const currentTab = searchParams?.get('tab') || (role === 'teacher' ? 'subjects' : 'invite');

  // Only fetch from API if not in context
  useEffect(() => {
    if (contextClass?.name) {
      setClassName(contextClass.name);
      return;
    }
    
    const fetchClass = async () => {
      try {
        const res = await fetch(`/api/classes/${classId}`);
        if (res.ok) {
          const data = await res.json();
          setClassName(data.class?.name || 'Class');
        }
      } catch (e) { console.error(e); }
    };
    if (classId && !contextClass) fetchClass();
  }, [classId, contextClass]);

  const visibleTabs = tabs;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border/60 bg-[hsl(var(--surface-1))] px-4 py-3 md:px-5 lg:px-7">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="truncate text-[18px]">{className || 'Loading...'}</h2>
          <button
            type="button"
            className="inline-flex h-9 items-center rounded-lg bg-[hsl(var(--surface-2))] px-3 text-[13px] text-muted-foreground hover:text-foreground"
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
                  "inline-flex h-10 items-center gap-2 rounded-lg px-3 text-[13px] transition-colors",
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

      <main className="flex-1 overflow-auto p-4 md:p-5 lg:p-7">
        {children}
      </main>
    </div>
  );
}
