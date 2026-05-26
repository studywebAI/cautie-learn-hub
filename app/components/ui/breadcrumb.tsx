'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  className?: string;
}

// Helper to parse breadcrumbs from pathname
export function useBreadcrumbs(): BreadcrumbItem[] {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Map tool names to readable labels
  const toolLabels: Record<string, string> = {
    flashcards: 'Flashcards',
    quiz: 'Quiz',
    notes: 'Notes',
    studyset: 'Studyset',
    wordweb: 'Mindmap',
    timeline: 'Timeline',
  };

  const segments = pathname?.split('/').filter(Boolean) || [];

  if (segments.length === 0) {
    return [{ label: 'Dashboard', href: '/' }];
  }

  const breadcrumbs: BreadcrumbItem[] = [];

  // First segment
  const first = segments[0];
  if (first === 'tools') {
    breadcrumbs.push({ label: 'Tools', href: '/tools' });

    // Second segment (tool name)
    if (segments[1]) {
      const toolName = segments[1];
      const label = toolLabels[toolName] || toolName.charAt(0).toUpperCase() + toolName.slice(1);
      breadcrumbs.push({ label, href: `/tools/${toolName}` });

      // AI-generated title from search params
      const aiTitle = searchParams?.get('title');
      if (aiTitle) {
        breadcrumbs.push({ label: aiTitle });
      }
    }
  } else if (first === 'classes' || first === 'class') {
    breadcrumbs.push({ label: 'Classes', href: '/classes' });
    if (segments[1] && segments[1] !== 'class') {
      breadcrumbs.push({ label: segments[1] });
    }
  } else if (first === 'subjects') {
    breadcrumbs.push({ label: 'Subjects', href: '/subjects' });
    if (segments[1]) {
      breadcrumbs.push({ label: segments[1] });
    }
  } else {
    // Default: capitalize first segment
    breadcrumbs.push({
      label: first.charAt(0).toUpperCase() + first.slice(1),
      href: `/${first}`,
    });
  }

  return breadcrumbs;
}

export function Breadcrumb({
  items,
  className,
}: BreadcrumbProps) {
  const defaultItems = useBreadcrumbs();
  const displayItems = items || defaultItems;

  if (displayItems.length === 0) return null;

  return (
    <nav
      className={cn(
        'flex items-center gap-1 text-xs text-muted-foreground md:text-sm',
        className
      )}
      aria-label="Breadcrumb"
    >
      {displayItems.map((item, index) => (
        <div key={index} className="flex items-center gap-1">
          {index > 0 && (
            <ChevronRight className="h-3 w-3 md:h-4 md:w-4 mx-0.5 text-muted-foreground/40" />
          )}
          {item.href ? (
            <Link
              href={item.href}
              className="transition-colors hover:text-foreground hover:underline"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
