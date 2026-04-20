'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import type { MaterialReference } from '@/lib/teacher-types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, ArrowLeft, Edit } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import type { BaseBlock } from '@/components/blocks/types';

const FlashcardViewer = dynamic(
  () => import('@/components/tools/flashcard-viewer').then((m) => m.FlashcardViewer),
  { ssr: false }
);
const QuizTaker = dynamic(
  () => import('@/components/tools/quiz-taker').then((m) => m.QuizTaker),
  { ssr: false }
);
const NoteViewer = dynamic(
  () => import('@/components/material-viewers/note-viewer').then((m) => m.NoteViewer),
  { ssr: false }
);
const BlockRenderer = dynamic(
  () => import('@/components/blocks/BlockRenderer').then((m) => m.BlockRenderer)
);
const BlockEditor = dynamic(
  () => import('@/components/blocks/BlockEditor').then((m) => m.BlockEditor),
  { ssr: false }
);

type ArtifactRecord = {
  id: string;
  title: string;
  tool_id: string;
  artifact_type: string;
  updated_at: string;
};

type ArtifactVersion = {
  version_number: number;
  content: any;
  created_at: string;
};

function MaterialPageContent() {
  const params = useParams();
  const { materialId } = params as { materialId: string };
  const [material, setMaterial] = useState<MaterialReference | null>(null);
  const [blocks, setBlocks] = useState<BaseBlock[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [artifact, setArtifact] = useState<ArtifactRecord | null>(null);
  const [artifactVersions, setArtifactVersions] = useState<ArtifactVersion[]>([]);

  useEffect(() => {
    if (!materialId) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch material
        const materialResponse = await fetch(`/api/materials/${materialId}`);
        if (materialResponse.ok) {
          const materialData: MaterialReference = await materialResponse.json();
          setMaterial(materialData);
          setArtifact(null);
          setArtifactVersions([]);

          // Fetch blocks
          const blocksResponse = await fetch(`/api/materials/${materialId}/blocks`);
          if (blocksResponse.ok) {
            const blocksData = await blocksResponse.json();
            setBlocks(blocksData.blocks || []);
          }
        } else {
          // Fallback: resolve toolbox artifact by id
          const artifactsResponse = await fetch('/api/tools/v2/artifacts');
          if (!artifactsResponse.ok) {
            const errorData = await materialResponse.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to fetch material/artifact');
          }

          const artifacts: ArtifactRecord[] = await artifactsResponse.json();
          const matchedArtifact = artifacts.find((a) => a.id === materialId) || null;
          if (!matchedArtifact) {
            const errorData = await materialResponse.json().catch(() => ({}));
            throw new Error(errorData.error || 'Material or artifact not found');
          }

          setArtifact(matchedArtifact);
          setMaterial(null);
          setBlocks([]);

          const artifactHistoryRes = await fetch(`/api/tools/v2/artifacts/${materialId}/history`);
          if (artifactHistoryRes.ok) {
            const artifactHistory = await artifactHistoryRes.json();
            setArtifactVersions(artifactHistory.versions || []);
          }
        }

        // Fetch user role
        const roleResponse = await fetch('/api/user/role');
        if (roleResponse.ok) {
          const roleData = await roleResponse.json();
          setUserRole(roleData.role);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [materialId]);

  const renderContent = () => {
    if (artifact) {
      const latestContent = artifactVersions?.[0]?.content;
      const artifactType = artifact.artifact_type?.toLowerCase();
      if (!latestContent) {
        return <p>No artifact content found.</p>;
      }

      if (artifactType === 'notes' || artifactType === 'note') {
        return <NoteViewer notes={latestContent.notes || latestContent} />;
      }
      if (artifactType === 'quiz') {
        return <QuizTaker quiz={latestContent} mode="practice" sourceText="" onRestart={() => {}} />;
      }
      if (artifactType === 'flashcards' || artifactType === 'flashcard') {
        return <FlashcardViewer cards={latestContent.flashcards || latestContent} mode="flip" onRestart={() => {}} />;
      }
      if (artifactType === 'blocks') {
        const artifactBlocks = latestContent.blocks || [];
        return (
          <div className="space-y-4">
            {artifactBlocks.map((block: any) => (
              <BlockRenderer key={block.id} block={block} isEditing={false} />
            ))}
          </div>
        );
      }

      return (
        <pre className="rounded-md border bg-muted/30 p-3 text-xs overflow-auto">
          {JSON.stringify(latestContent, null, 2)}
        </pre>
      );
    }

    // If blocks exist, render them
    if (blocks.length > 0) {
      if (isEditing && userRole === 'teacher') {
        return <BlockEditor materialId={materialId} />;
      } else {
        return (
          <div className="space-y-4">
            {blocks
              .sort((a, b) => (a.position || 0) - (b.position || 0))
              .map((block) => (
                <BlockRenderer key={block.id} block={block} isEditing={false} />
              ))}
          </div>
        );
      }
    }

    // Fallback to existing viewers
    if (!material?.content) {
      return (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Content Missing</AlertTitle>
          <AlertDescription>The content for this material could not be loaded.</AlertDescription>
        </Alert>
      );
    }

    switch (material.type) {
      case 'NOTE':
        return <NoteViewer notes={material.content} />;
      case 'QUIZ':
        return <QuizTaker quiz={material.content} mode="practice" sourceText="" onRestart={() => {}} />;
      case 'FLASHCARDS':
        return <FlashcardViewer cards={material.content} mode="flip" onRestart={() => {}} />;
      default:
        return <p>Unsupported material type.</p>;
    }
  };


  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error Loading Material</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!material && !artifact) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild className="-ml-4">
          <Link href={material ? `/class/${material.class_id}` : '/other/materials'}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {material ? 'Back to Class' : 'Back to Materials'}
          </Link>
        </Button>
        {material && userRole === 'teacher' && (material?.type === 'BLOCK' || blocks.length > 0) && (
          <Button
            variant="outline"
            onClick={() => setIsEditing(!isEditing)}
          >
            <Edit className="mr-2 h-4 w-4" />
            {isEditing ? 'View Mode' : 'Edit Mode'}
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Badge variant="outline">{material ? material.type : artifact?.artifact_type?.toUpperCase()}</Badge>
        <h1 className="text-3xl font-bold font-headline">{material ? material.title : artifact?.title}</h1>
        <p className="text-sm text-muted-foreground">
          {material
            ? `Created on ${format(new Date(material.created_at), 'MMMM d, yyyy')}`
            : `Updated on ${format(new Date(artifact!.updated_at), 'MMMM d, yyyy')}`}
        </p>
      </div>

      {material && (
        <div className="flex flex-wrap gap-2">
          {material.concepts?.map(concept => (
            <Badge key={concept.id} variant="secondary">{concept.name}</Badge>
          ))}
        </div>
      )}

      {renderContent()}
    </div>
  );
}

export default function MaterialPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">Loading material...</div>}>
      <MaterialPageContent />
    </Suspense>
  );
}
