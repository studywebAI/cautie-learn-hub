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
import { Loader2, UploadCloud, FileText, X } from 'lucide-react';

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected) return;

    const newFiles: File[] = [];
    for (let i = 0; i < selected.length; i++) {
      const file = selected[i];
      if (file.size > 10 * 1024 * 1024) {
        toast({ variant: 'destructive', title: 'File too large', description: `${file.name} exceeds 10MB limit.` });
        continue;
      }
      newFiles.push(file);
    }
    setFiles(prev => [...prev, ...newFiles]);
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

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
      // Upload files first if any
      const uploadedFileUrls: string[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('assignmentId', assignmentId);

        const uploadRes = await fetch('/api/submissions/upload', {
          method: 'POST',
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          uploadedFileUrls.push(uploadData.url || uploadData.path);
        } else {
          toast({
            variant: 'destructive',
            title: 'Upload failed',
            description: `Failed to upload ${file.name}`,
          });
        }
      }

      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId,
          content: content.trim(),
          files: uploadedFileUrls,
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

          <div className="space-y-2">
            <Label>Attachments</Label>
            <div
              className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => document.getElementById('submission-file-input')?.click()}
            >
              <UploadCloud className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Click to upload files (max 10MB each)</p>
              <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, TXT, JPG, PNG</p>
            </div>
            <Input
              id="submission-file-input"
              type="file"
              multiple
              className="sr-only"
              accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp"
              onChange={handleFileChange}
            />

            {files.length > 0 && (
              <div className="space-y-1.5 mt-2">
                {files.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate flex-1">{file.name}</span>
                    <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)}KB</span>
                    <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => removeFile(idx)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
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
