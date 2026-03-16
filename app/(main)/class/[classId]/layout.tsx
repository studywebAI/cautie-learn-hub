'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState, useContext } from 'react';
import { cn } from '@/lib/utils';
import { 
  BookOpen, Users, FileText, Settings, GraduationCap, Bell, 
  BarChart3, Library, Calendar, UserPlus, Layers,
  ClipboardCheck
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
    <div className="flex h-full flex-col lg:flex-row">
      {/* Class Sidebar */}
      <aside className="w-full border-b bg-card flex flex-col shrink-0 lg:w-56 lg:border-b-0 lg:border-r">
        {/* Class Switch Action */}
        <div className="p-3 border-b">
          <button
            type="button"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => {
              window.dispatchEvent(new Event('cautie:open-class-dropdown'));
            }}
          >
            Select different class
          </button>
        </div>

        {/* Class Title */}
        <div className="p-4 border-b">
          <h2 className="truncate">{className || 'Loading...'}</h2>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex-1 overflow-auto p-2">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                replace
                prefetch={true}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-xs mb-1 transition-colors",
                  isActive 
                    ? "border border-border/70 bg-[hsl(var(--surface-2))] text-foreground" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-5 lg:p-7">
        {children}
      </main>
    </div>
  );
}
