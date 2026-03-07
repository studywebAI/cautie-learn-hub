'use client';

import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

type WorkbenchShellProps = {
  title: string;
  description: string;
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
  plan?: string;
};

export function WorkbenchShell({ title, description, left, center, right, plan }: WorkbenchShellProps) {
  return (
    <div className="h-full overflow-hidden px-3 pb-3 pt-2 md:px-4">
      <div className="mx-auto flex h-full max-w-[1700px] flex-col gap-3">
        <Card>
          <CardHeader className="py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="font-headline text-lg">{title}</CardTitle>
                <CardDescription className="text-xs">{description}</CardDescription>
              </div>
              {plan && <Badge variant="outline">{plan.toUpperCase()}</Badge>}
            </div>
          </CardHeader>
        </Card>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-12">
          <Card className="min-h-0 lg:col-span-5">
            <CardContent className="h-full p-0">
              <ScrollArea className="h-full px-3 pb-3">{left}</ScrollArea>
            </CardContent>
          </Card>

          <Card className="min-h-0 lg:col-span-4">
            <CardContent className="h-full p-0">
              <ScrollArea className="h-full px-3 pb-3">{center}</ScrollArea>
            </CardContent>
          </Card>

          <Card className="min-h-0 lg:col-span-3">
            <CardContent className="h-full p-0">
              <ScrollArea className="h-full px-3 pb-3">{right}</ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
