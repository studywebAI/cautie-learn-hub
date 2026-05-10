import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type PageSectionProps = {
  children: ReactNode;
  variant?: 'page' | 'tool';
  className?: string;
};

export function PageSection({ children, variant = 'page', className }: PageSectionProps) {
  if (variant === 'tool') {
    return (
      <div className={cn('h-full min-h-0 overflow-auto', className)}>
        <div className="tool-page-content">{children}</div>
      </div>
    );
  }

  return <div className={cn('page-content', className)}>{children}</div>;
}

