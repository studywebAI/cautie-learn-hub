'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function StudysetLayout({ children }: { children: ReactNode }) {
  return (
    <div className="page-content">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Study Sets</h1>
          <p className="page-subtitle mt-1">Create and manage your personalized study materials</p>
        </div>
        <Button asChild className="flex items-center gap-2">
          <Link href="/studyset/create">
            <Plus className="h-4 w-4" />
            New StudySet
          </Link>
        </Button>
      </div>
      {children}
    </div>
  );
}
