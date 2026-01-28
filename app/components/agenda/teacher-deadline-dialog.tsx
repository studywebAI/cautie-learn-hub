'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Loader2, FileText, Link as LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { ClassInfo } from '@/contexts/app-context';

type DeadlineType = 'assignment' | 'test';

type TeacherDeadlineDialogProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  classes: ClassInfo[];
  onDeadlineCreated: (deadline: {
    title: string;
    description: string;
    due_date: string;
    class_id: string;
    type: DeadlineType;
    material_link?: string;
    subject_link?: string;
  }) => Promise<void>;
  initialDate?: Date;
};

export function TeacherDeadlineDialog({ 
  isOpen, 
  setIsOpen, 
  classes,
  onDeadlineCreated,
  initialDate 
}: TeacherDeadlineDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date | undefined>(initialDate);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [deadlineType, setDeadlineType] = useState<DeadlineType>('assignment');
  const [materialLink, setMaterialLink] = useState('');
  const [subjectLink, setSubjectLink] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setDate(initialDate);
  }, [initialDate]);

  const handleCreate = async () => {
    if (!title || !date || !selectedClassId) {
      toast({
        title: 'Missing Information',
        description: 'Please provide a title, date, and select a class.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);

    try {
      await onDeadlineCreated({
        title,
        description,
        due_date: format(date, 'yyyy-MM-dd'),
        class_id: selectedClassId,
        type: deadlineType,
        material_link: materialLink || undefined,
        subject_link: subjectLink || undefined,
      });

      toast({
        title: deadlineType === 'test' ? 'Test Scheduled' : 'Assignment Created',
        description: `"${title}" has been added to the class.`,
      });

      resetAndClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create deadline. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const resetAndClose = () => {
    setTitle('');
    setDescription('');
    setDate(initialDate);
    setSelectedClassId('');
    setDeadlineType('assignment');
    setMaterialLink('');
    setSubjectLink('');
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) resetAndClose();
        else setIsOpen(true);
    }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Deadline</DialogTitle>
          <DialogDescription>
            Add an assignment or schedule a test for your students.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="type">Type</Label>
            <Select value={deadlineType} onValueChange={(v) => setDeadlineType(v as DeadlineType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="assignment">Assignment (Homework)</SelectItem>
                <SelectItem value="test">Test / Exam</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="class">Class</Label>
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger>
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input 
              id="title" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              placeholder={deadlineType === 'test' ? 'e.g., Chapter 5 Test' : 'e.g., Read pages 50-75'}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="date">Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "justify-start text-left",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea 
              id="description" 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              placeholder="Add instructions or details for students"
              rows={3}
            />
          </div>

          <div className="space-y-4 border-t pt-4">
            <p className="text-sm text-muted-foreground">Optional links for students</p>
            
            <div className="grid gap-2">
              <Label htmlFor="material-link" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Link to Material
              </Label>
              <Input 
                id="material-link" 
                value={materialLink} 
                onChange={e => setMaterialLink(e.target.value)} 
                placeholder="e.g., /material/abc123"
              />
              <p className="text-xs text-muted-foreground">
                Paste a link to materials students should use
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="subject-link" className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                Link to Subject
              </Label>
              <Input 
                id="subject-link" 
                value={subjectLink} 
                onChange={e => setSubjectLink(e.target.value)} 
                placeholder="e.g., /subjects/xyz/chapters/1/paragraphs/2"
              />
              <p className="text-xs text-muted-foreground">
                Link directly to a paragraph or assignment in subjects
              </p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={resetAndClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {deadlineType === 'test' ? 'Schedule Test' : 'Create Assignment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
