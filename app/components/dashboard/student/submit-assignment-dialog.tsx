'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

type SubmitAssignmentDialogProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  assignmentId: string;
  assignmentTitle: string;
  onSubmitted?: () => void;
};

export function SubmitAssignmentDialog({
  isOpen,
  setIsOpen,
  assignmentId,
  assignmentTitle,
  onSubmitted
}: SubmitAssignmentDialogProps) {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!content.trim() && files.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Missing content',
        description: 'Please provide some text content or upload files.',
      });
      return;
    }

    setIsLoading(true);
    try {
      // For now, we'll just upload text content
      // File upload would need additional implementation
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId,
          content: content.trim(),
          files: [], // Placeholder for file handling
          status: 'submitted'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit assignment');
      }

      toast({
        title: 'Assignment Submitted',
        description: `"${assignmentTitle}" has been submitted successfully.`,
      });

      resetAndClose();
      onSubmitted?.();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetAndClose = () => {
    setContent('');
    setFiles([]);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Submit Assignment</DialogTitle>
          <DialogDescription>
            Submit your work for "{assignmentTitle}"
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="submission-content">Your Work</Label>
            <Textarea
              id="submission-content"
              placeholder="Write your assignment submission here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[200px]"
            />
          </div>

          {/* File upload placeholder - would need implementation */}
          <div className="space-y-2">
            <Label htmlFor="submission-files">Attachments (Coming Soon)</Label>
            <Input
              id="submission-files"
              type="file"
              multiple
              disabled
              placeholder="File upload coming soon..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={resetAndClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isLoading || (!content.trim() && files.length === 0)}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Assignment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}