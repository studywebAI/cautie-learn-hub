'use client';

import { useContext } from 'react';
import { AppContext } from '@/contexts/app-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';

export default function SubjectsPage() {
  const context = useContext(AppContext);
  return (
    <div className="h-full p-4 md:p-6">
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Select a subject
          </CardTitle>
          <CardDescription>
            Use Subjects in the sidebar to open the subject list, then pick one.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          The full subject overview page is disabled for cleaner navigation and faster loading.
        </CardContent>
      </Card>
    </div>
  );
}
