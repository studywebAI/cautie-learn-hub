'use client';

import { useState } from 'react';
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

export default function BlockEditorPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [blocks, setBlocks] = useState<BaseBlock[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

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
              content: block.content,
              order_index: index
            }),
          })
        )
      );

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
      </div>
    </div>
  );
}