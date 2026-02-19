'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Plus, ChevronRight, FolderOpen } from 'lucide-react';
import Link from 'next/link';

type Subject = {
  id: string;
  name: string;
  description?: string;
  chapters_count?: number;
  assignments_count?: number;
  progress?: number;
};

type SubjectOverviewProps = {
  classId: string;
  cachedSubjects?: Subject[]; // Accept cached data from parent
};

export function SubjectOverview({ classId, cachedSubjects }: SubjectOverviewProps) {
  const [subjects, setSubjects] = useState<Subject[]>(cachedSubjects || []);
  const [loading, setLoading] = useState(!cachedSubjects);

  useEffect(() => {
    // Use cached data if available
    if (cachedSubjects && cachedSubjects.length > 0) {
      setSubjects(cachedSubjects);
      setLoading(false);
      return;
    }
    
    fetchSubjects();
  }, [classId, cachedSubjects]);

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/classes/${classId}/subjects`);
      if (response.ok) {
        const data = await response.json();
        setSubjects(data.subjects || []);
      }
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="font-headline flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Subjects
          </CardTitle>
        </div>
        <Button size="sm" asChild>
          <Link href={`/class/${classId}/subjects/new`}>
            <Plus className="mr-2 h-4 w-4" />
            Add Subject
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : subjects.length === 0 ? (
          <div className="text-center py-8">
            <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No subjects yet.</p>
            <p className="text-sm text-muted-foreground">Add subjects to organize your class content.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Sort alphabetically for consistent ordering */}
            {([...subjects] as Subject[]).sort((a, b) => a.name.localeCompare(b.name)).map(subject => (
              <Link 
                key={subject.id} 
                href={`/subjects/${subject.id}`}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{subject.name}</p>
                  <div className="flex gap-4 mt-1">
                    <span className="text-sm text-muted-foreground">
                      {subject.chapters_count || 0} chapters
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {subject.assignments_count || 0} assignments
                    </span>
                  </div>
                  {subject.progress !== undefined && (
                    <Progress value={subject.progress} className="h-1.5 mt-2" />
                  )}
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
