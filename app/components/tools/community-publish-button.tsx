'use client';

import { useMemo, useState } from 'react';
import { Loader2, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

type CommunityPublishButtonProps = {
  artifactId: string | null;
  toolId: 'quiz' | 'flashcards' | 'notes';
  defaultTitle?: string;
  defaultDescription?: string;
  defaultLanguage?: string;
};

const smartTagSeed = (text: string) =>
  Array.from(
    new Set(
      String(text || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .split(/\s+/)
        .filter((token) => token.length >= 4)
    )
  ).slice(0, 6);

export function CommunityPublishButton({
  artifactId,
  toolId,
  defaultTitle = '',
  defaultDescription = '',
  defaultLanguage = 'en',
}: CommunityPublishButtonProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState(defaultDescription);
  const [subject, setSubject] = useState('');
  const [language, setLanguage] = useState(defaultLanguage || 'en');
  const [tagsRaw, setTagsRaw] = useState('');

  const tagsPreview = useMemo(
    () =>
      tagsRaw
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 12),
    [tagsRaw]
  );

  const hydrateSmartSuggestions = () => {
    if (!title.trim()) {
      setTitle(defaultTitle || `${toolId[0].toUpperCase()}${toolId.slice(1)} set`);
    }
    if (!description.trim()) {
      setDescription(defaultDescription || `Community-shared ${toolId} set.`);
    }
    if (!tagsRaw.trim()) {
      const tags = smartTagSeed(`${title} ${description} ${subject}`) || [];
      setTagsRaw(tags.join(', '));
    }
  };

  const publish = async () => {
    if (!artifactId) return;
    setPublishing(true);
    try {
      const response = await fetch('/api/community/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artifactId,
          title: title.trim(),
          description: description.trim(),
          subject: subject.trim(),
          language: language.trim() || defaultLanguage || 'en',
          tags: tagsPreview,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(String(payload?.error || 'Failed to publish to community'));
      }

      toast({ title: 'Published to Community', description: 'Your content is now visible in the Community feed.' });
      setOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Publish failed', description: String(error?.message || 'Try again.') });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-8 w-full rounded-md border-sidebar-border bg-sidebar-accent/35 text-xs"
        disabled={!artifactId}
        onClick={() => {
          hydrateSmartSuggestions();
          setOpen(true);
        }}
      >
        <Share2 className="mr-1.5 h-3.5 w-3.5" />
        Publish to Community
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Publish to Community</DialogTitle>
            <DialogDescription>
              This is opt-in. Nothing is auto-uploaded. You control what gets shared.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Title</p>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={180} />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Description</p>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1200} />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Subject</p>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="history" />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Language</p>
                <Input value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="en" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Tags (comma separated)</p>
              <Input
                value={tagsRaw}
                onChange={(e) => setTagsRaw(e.target.value)}
                placeholder="industrial revolution, timeline, europe"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={hydrateSmartSuggestions}>
              Smart Suggest
            </Button>
            <Button type="button" onClick={publish} disabled={!artifactId || publishing || title.trim().length < 3}>
              {publishing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
