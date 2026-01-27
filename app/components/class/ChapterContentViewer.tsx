'use client';

import { useState, useEffect, useContext } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BlockRenderer } from '@/components/blocks/BlockRenderer';
import { AppContext } from '@/contexts/app-context';
import { BaseBlock } from '@/components/blocks/types';
import { FileText, AlertCircle, BookOpen } from 'lucide-react';

interface Block extends BaseBlock {
  chapter_id: string;
}

interface ChapterContentViewerProps {
  classId: string;
  chapterId: string;
  isTeacher?: boolean;
  className?: string;
}

export function ChapterContentViewer({
  classId,
  chapterId,
  isTeacher = false,
  className
}: ChapterContentViewerProps) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [chapter, setChapter] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { assignments } = useContext(AppContext) || {};

  useEffect(() => {
    const fetchChapterAndBlocks = async () => {
      if (!chapterId) return;

      setIsLoading(true);
      setError(null);

      try {
        // Fetch chapter details
        const chapterResponse = await fetch(`/api/classes/${classId}/chapters/${chapterId}`);
        if (!chapterResponse.ok) {
          throw new Error('Failed to fetch chapter');
        }
        const chapterData = await chapterResponse.json();
        setChapter(chapterData);

        // Fetch blocks
        const blocksResponse = await fetch(`/api/classes/${classId}/chapters/${chapterId}/blocks`);
        if (!blocksResponse.ok) {
          throw new Error('Failed to fetch blocks');
        }
        const blocksData = await blocksResponse.json();
        setBlocks(blocksData.blocks || []);
      } catch (err) {
        console.error('Error fetching chapter content:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchChapterAndBlocks();
  }, [classId, chapterId]);

  const renderBlockWithAssignment = (block: Block) => {
    // Check if there's an assignment linked to this block
    const linkedAssignment = assignments?.find((a: any) => a.block_id === block.id);

    return (
      <div key={block.id} className="mb-6">
        <BlockRenderer
          block={block}
          onUpdate={() => {}} // Read-only for now
          onDelete={() => {}}
          isEditing={false}
        />
        {linkedAssignment && (
          <div className="mt-4 p-4 border border-blue-200 rounded-lg bg-blue-50">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-blue-900">{linkedAssignment.title}</h4>
                <div className="flex items-center gap-4 mt-3">
                  <span className="text-xs text-blue-600">
                    Due: {linkedAssignment.due_date ? new Date(linkedAssignment.due_date).toLocaleDateString() : 'No due date'}
                  </span>
                  <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100">
                    {isTeacher ? 'View Submissions' : 'Submit Work'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderChapterAssignments = () => {
    const chapterAssignments = assignments?.filter((a: any) => a.chapter_id === chapterId && !a.block_id) || [];
    if (chapterAssignments.length === 0) return null;

    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-medium text-blue-900">Chapter Assignments</h3>
        </div>
        <div className="space-y-3">
          {chapterAssignments.map((assignment: any) => (
            <div key={assignment.id} className="p-4 border border-blue-200 rounded-lg bg-blue-50">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-blue-900">{assignment.title}</h4>
                  <div className="flex items-center gap-4 mt-3">
                    <span className="text-xs text-blue-600">
                      Due: {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : 'No due date'}
                    </span>
                    <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100">
                      {isTeacher ? 'View Submissions' : 'Submit Work'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      {chapter && (
        <div className="mb-6">
          <h2 className="text-2xl font-bold font-headline">{chapter.title}</h2>
          {chapter.description && (
            <p className="text-muted-foreground mt-2">{chapter.description}</p>
          )}
        </div>
      )}

      {renderChapterAssignments()}

      {blocks.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No content yet</h3>
              <p className="text-sm text-muted-foreground">
                {isTeacher
                  ? "Add blocks to this chapter to create learning content."
                  : "This chapter doesn't have any content yet."
                }
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {blocks
            .sort((a, b) => a.order_index - b.order_index)
            .map(renderBlockWithAssignment)
          }
        </div>
      )}
    </div>
  );
}