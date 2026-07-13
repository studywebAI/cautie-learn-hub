'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  BookOpen,
  ClipboardList,
  Lightbulb,
  Settings,
  Users,
  Megaphone,
  UserCheck,
  FileText,
} from 'lucide-react';

interface DashboardSidebarProps {
  userRole: 'student' | 'teacher' | null;
}

const studentNavItems = [
  { id: 'overview', label: 'Overview', href: '/', icon: BarChart3 },
  { id: 'assignments', label: 'All Assignments', href: '/agenda', icon: ClipboardList },
  { id: 'schedule', label: 'Schedule', href: '/agenda', icon: BookOpen },
  { id: 'subjects', label: 'My Subjects', href: '/subjects', icon: BookOpen },
  { id: 'ideas', label: 'Ideas Board', href: '/ideas-board', icon: Lightbulb },
  { id: 'materials', label: 'Materials', href: '/material', icon: FileText },
  { id: 'settings', label: 'Settings', href: '/settings', icon: Settings },
];

const teacherNavItems = [
  { id: 'overview', label: 'Overview', href: '/', icon: BarChart3 },
  { id: 'grades', label: 'Grades', href: '/teacher-grades', icon: ClipboardList },
  { id: 'submissions', label: 'Submissions', href: '/agenda', icon: FileText },
  { id: 'roster', label: 'Class Roster', href: '/classes', icon: Users },
  { id: 'announcements', label: 'Announcements', href: '/agenda', icon: Megaphone },
  { id: 'attendance', label: 'Attendance', href: '/agenda', icon: UserCheck },
  { id: 'settings', label: 'Settings', href: '/settings', icon: Settings },
];

export function DashboardSidebar({ userRole }: DashboardSidebarProps) {
  if (!userRole) return null;

  const navItems = userRole === 'student' ? studentNavItems : teacherNavItems;

  return (
    <aside className="hidden lg:flex flex-col w-[300px] gap-3">
      <nav className="rounded-lg surface-panel border border-border p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === 'overview';

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-[hsl(var(--interactive-hover))]'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
