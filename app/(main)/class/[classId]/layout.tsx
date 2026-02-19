'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  BookOpen, Users, FileText, Settings, GraduationCap, Bell, 
  BarChart3, Library, Calendar, UserPlus, ChevronLeft, Layers
} from 'lucide-react';
import Link from 'next/link';

const tabs = [
  { id: 'invite', label: 'Invite', icon: UserPlus, href: '?tab=invite' },
  { id: 'group', label: 'Group', icon: Users, href: '?tab=group' },
  { id: 'assignments', label: 'Assignments', icon: FileText, href: '?tab=assignments' },
  { id: 'materials', label: 'Materials', icon: BookOpen, href: '?tab=materials' },
  { id: 'announcements', label: 'Announcements', icon: Bell, href: '?tab=announcements' },
  { id: 'progress', label: 'Progress', icon: BarChart3, href: '?tab=progress' },
  { id: 'subjects', label: 'Subjects', icon: Library, href: '?tab=subjects' },
  { id: 'analytics', label: 'Analytics', icon: Layers, href: '?tab=analytics' },
  { id: 'attendance', label: 'Attendance', icon: Calendar, href: '?tab=attendance' },
  { id: 'settings', label: 'Settings', icon: Settings, href: '?tab=settings' },
];

export default function ClassLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const classId = params.classId as string;
  const [className, setClassName] = useState<string>('');

  useEffect(() => {
    const fetchClass = async () => {
      try {
        const res = await fetch(`/api/classes/${classId}`);
        if (res.ok) {
          const data = await res.json();
          setClassName(data.class?.name || 'Class');
        }
      } catch (e) { console.error(e); }
    };
    if (classId) fetchClass();
  }, [classId]);

  // Get current tab from URL
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const currentTab = searchParams?.get('tab') || 'invite';

  // Filter tabs for different roles (simplified - show all for now)
  const visibleTabs = tabs;

  return (
    <div className="flex h-full">
      {/* Class Sidebar */}
      <aside className="w-56 border-r bg-card flex flex-col shrink-0">
        {/* Back to Classes */}
        <div className="p-3 border-b">
          <Link href="/classes" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-4 w-4" />
            Back to Classes
          </Link>
        </div>

        {/* Class Title */}
        <div className="p-4 border-b">
          <h2 className="font-semibold truncate">{className || 'Loading...'}</h2>
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
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm mb-1 transition-colors",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
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
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  );
}
