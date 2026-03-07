'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { StandaloneBlockEditor } from '@/components/blocks/StandaloneBlockEditor';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Save, FileText } from 'lucide-react';
import type { BaseBlock } from '@/components/blocks/types';
import { ArtifactCollabPanel } from '@/components/tools/artifact-collab-panel';

export default function BlockEditorPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [blocks, setBlocks] = useState<BaseBlock[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [latestArtifactId, setLatestArtifactId] = useState<string | null>(null);
  const [plan, setPlan] = useState<string>('free');
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetch('/api/billing/v1/usage-summary')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.plan) setPlan(data.plan);
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }

    if (blocks.length === 0) {
      toast({ title: 'Add at least one block', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      // Create the material first
      const materialResponse = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          type: 'blocks',
          content: { blocks },
        }),
      });

      if (!materialResponse.ok) {
        throw new Error('Failed to create material');
      }

      const material = await materialResponse.json();

      // Create blocks
      await Promise.all(
        blocks.map((block, index) =>
          fetch(`/api/materials/${material.id}/blocks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: block.type,
              data: block.data,
              position: index
            }),
          })
        )
      );

      // Persist into toolbox artifact system (create or version bump)
      const artifactRes = await fetch('/api/tools/v2/artifacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artifactId: latestArtifactId || undefined,
          toolId: 'blocks',
          artifactType: 'blocks',
          title: title.trim(),
          content: {
            title: title.trim(),
            description: description.trim(),
            blocks,
            materialId: material.id,
          },
          metadata: {
            materialId: material.id,
          },
        }),
      });

      if (artifactRes.ok) {
        const artifactData = await artifactRes.json();
        const artifactId = artifactData?.id || artifactData?.artifact?.id || latestArtifactId;
        if (artifactId) setLatestArtifactId(artifactId);
      }

      toast({ title: 'Block material created successfully!' });
      router.push(`/material/${material.id}`);
    } catch (error) {
      console.error('Save error:', error);
      toast({ title: 'Failed to save material', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Block Editor</h1>
          <p className="text-muted-foreground">Create rich, structured study materials with blocks</p>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Material Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Enter material title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Describe what this material covers"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Content Blocks</CardTitle>
          </CardHeader>
          <CardContent>
            <StandaloneBlockEditor
              blocks={blocks}
              onBlocksChange={setBlocks}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving} size="lg">
            {isSaving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Material
              </>
            )}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Artifact Collaboration</CardTitle>
          </CardHeader>
          <CardContent>
            <ArtifactCollabPanel
              latestArtifactId={latestArtifactId}
              isLoading={isSaving}
              plan={plan}
              history={[]}
              transformActions={[
                {
                  label: 'Transform to Notes',
                  successMessage: 'Notes artifact created',
                  request: {
                    targetToolId: 'notes',
                    targetFlowName: 'generateNotes',
                    transformInput: {
                      sourceText: `${title}\n${description}\n${blocks.map((b: any) => JSON.stringify(b)).join('\n')}`,
                      style: 'structured',
                      length: 'medium',
                    },
                    title: 'Notes from Blocks',
                  },
                },
              ]}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
