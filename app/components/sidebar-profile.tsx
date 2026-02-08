'use client';

import { useContext } from 'react';
import { useRouter } from 'next/navigation';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { useSidebar } from '@/components/ui/sidebar';
import {
  ArrowUpRight,
  Settings,
  HelpCircle,
  LogOut,
  ChevronUp,
  User,
} from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function SidebarProfile() {
  const { session, role, signOut } = useContext(AppContext) as AppContextType & { signOut?: () => void };
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';
  const router = useRouter();

  if (!session || isCollapsed) return null;

  // Extract email prefix (before @)
  const email = session.user?.email || '';
  const emailPrefix = email.split('@')[0] || 'User';

  // Role/tier display
  const tierLabel = role === 'teacher' ? 'Teacher' : 'Student Free';

  const handleLogout = async () => {
    if (signOut) {
      await signOut();
    }
    router.push('/auth');
  };

  return (
    <div className="px-2 py-2 space-y-2">
      {/* Upgrade button - prominent placement */}
      <Button
        variant="outline"
        size="sm"
        className="w-full h-8 text-xs rounded-full border-primary/30 hover:bg-primary/10"
        onClick={() => {/* placeholder */}}
      >
        <ArrowUpRight className="h-3 w-3 mr-1.5" />
        Upgrade
      </Button>

      {/* Username dropdown - ChatGPT style */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-left hover:bg-sidebar-accent transition-colors group">
            <div className="flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary shrink-0">
              <User className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{emailPrefix}</p>
              <p className="text-[11px] text-muted-foreground leading-tight">{tierLabel}</p>
            </div>
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          side="top"
          className="w-[--radix-dropdown-menu-trigger-width] min-w-[200px]"
        >
          <div className="px-3 py-2">
            <p className="text-sm font-medium">{emailPrefix}</p>
            <p className="text-xs text-muted-foreground">{email}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push('/settings')}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => {/* placeholder */}}>
            <HelpCircle className="h-4 w-4 mr-2" />
            Help & FAQ
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
            <LogOut className="h-4 w-4 mr-2" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
