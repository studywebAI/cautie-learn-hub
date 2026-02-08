'use client';

import { useContext } from 'react';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { useSidebar } from '@/components/ui/sidebar';
import { ArrowUpRight } from 'lucide-react';
import { Button } from './ui/button';

export function SidebarProfile() {
  const { session, role } = useContext(AppContext) as AppContextType;
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  if (!session || isCollapsed) return null;

  // Extract email prefix (before @)
  const email = session.user?.email || '';
  const emailPrefix = email.split('@')[0] || 'User';

  // Role/tier display
  const tierLabel = role === 'teacher' ? 'Teacher' : 'Student';

  return (
    <div className="px-2 py-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{emailPrefix}</p>
          <p className="text-xs text-muted-foreground">{tierLabel}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs rounded-full shrink-0"
          onClick={() => {/* placeholder */}}
        >
          <ArrowUpRight className="h-3 w-3 mr-1" />
          Upgrade
        </Button>
      </div>
    </div>
  );
}
