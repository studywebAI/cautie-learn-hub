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
    <div className="h-full overflow-hidden p-4">
      <div className="mx-auto flex h-full max-w-[1600px] flex-col gap-4">
        <Card>
          <CardHeader className="py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="font-headline text-xl">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </div>
              {plan && <Badge variant="outline">{plan.toUpperCase()}</Badge>}
            </div>
          </CardHeader>
        </Card>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-12">
          <Card className="min-h-0 lg:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Source & Context</CardTitle>
            </CardHeader>
            <CardContent className="h-[calc(100%-64px)] p-0">
              <ScrollArea className="h-full px-4 pb-4">{left}</ScrollArea>
            </CardContent>
          </Card>

          <Card className="min-h-0 lg:col-span-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Editor & Preview</CardTitle>
            </CardHeader>
            <CardContent className="h-[calc(100%-64px)] p-0">
              <ScrollArea className="h-full px-4 pb-4">{center}</ScrollArea>
            </CardContent>
          </Card>

          <Card className="min-h-0 lg:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Actions & History</CardTitle>
            </CardHeader>
            <CardContent className="h-[calc(100%-64px)] p-0">
              <ScrollArea className="h-full px-4 pb-4">{right}</ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
