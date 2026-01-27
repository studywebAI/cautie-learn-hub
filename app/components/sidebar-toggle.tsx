'use client';

import { useSidebar } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function SidebarToggle() {
  const { state, toggleSidebar } = useSidebar();

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleSidebar}
      className={`fixed top-1/2 -translate-y-1/2 z-50 h-10 w-10 rounded-full bg-background shadow-lg hover:bg-accent border-2 ${
        state === 'expanded' ? 'left-[236px]' : 'left-[44px]'
      }`}
    >
      {state === 'expanded' ? (
        <ChevronLeft className="h-5 w-5" />
      ) : (
        <ChevronRight className="h-5 w-5" />
      )}
    </Button>
  );
}