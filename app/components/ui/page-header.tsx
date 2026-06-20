'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Breadcrumb, BreadcrumbItem } from './breadcrumb';

interface PageHeaderProps {
  title?: string;
  subtitle?: string;
  breadcrumb?: BreadcrumbItem[];
  children?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  hideBreadcrumb?: boolean;
}

export function PageHeader({
  title,
  subtitle,
  breadcrumb,
  children,
  icon,
  className,
  hideBreadcrumb,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'border-b border-border/40 bg-gradient-to-br from-background to-background/95',
        'px-4 md:px-6 py-3 md:py-4',
        'flex flex-col gap-2.5',
        'rounded-b-2xl',
        className
      )}
    >
      {/* Breadcrumb */}
      {!hideBreadcrumb && (
        <Breadcrumb items={breadcrumb} className="text-xs" />
      )}

      {/* Title and subtitle */}
      {title && (
        <div className="flex items-start gap-3">
          {icon && (
            <div className="flex-shrink-0 mt-0.5 text-muted-foreground">
              {icon}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1
              className={cn(
                'text-xl md:text-2xl tracking-tight leading-tight',
                'text-foreground'
              )}
            >
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs md:text-sm text-muted-foreground mt-1">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Custom children */}
      {children}
    </div>
  );
}
