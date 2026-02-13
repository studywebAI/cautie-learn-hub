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
import { InputWithTypingPlaceholder } from '@/components/ui/input-with-typing-placeholder';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Loader2, FileText, BookOpen, X, Link as LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { HierarchicalLinkPickerV2 } from './hierarchical-link-picker-v2';
import type { ClassInfo } from '@/contexts/app-context';

type DeadlineType = 'homework' | 'small_test' | 'big_test';

type LinkedContent = {
  type: 'material' | 'subject' | 'chapter' | 'paragraph' | 'assignment';
  url: string;
  title: string;
  path?: string; // Display path for hierarchical content
};

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
    linked_content?: LinkedContent[];
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
  const [deadlineType, setDeadlineType] = useState<DeadlineType>('homework');
  const [linkedContent, setLinkedContent] = useState<LinkedContent[]>([]);
  const [isLinkPickerOpen, setIsLinkPickerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setDate(initialDate);
  }, [initialDate]);

  const handleAddLink = (link: {
    type: 'subject' | 'chapter' | 'paragraph' | 'assignment';
    url: string;
    title: string;
    path?: string
  }) => {
    // Convert to LinkedContent format
    const linkedLink: LinkedContent = {
      type: link.type as any,
      url: link.url,
      title: link.title,
      path: link.path,
    };
    // Avoid duplicates
    if (!linkedContent.find(l => l.url === linkedLink.url)) {
      setLinkedContent([...linkedContent, linkedLink]);
    }
  };

  const handleRemoveLink = (url: string) => {
    setLinkedContent(linkedContent.filter(l => l.url !== url));
  };

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
        linked_content: linkedContent.length > 0 ? linkedContent : undefined,
      });

      toast({
        title: deadlineType === 'homework' ? 'Homework Created' : 'Test Scheduled',
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
    setDeadlineType('homework');
    setLinkedContent([]);
    setIsOpen(false);
  };

  return (
    <>
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
          <div className="grid gap-6 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid gap-2">
              <Label htmlFor="type">Type</Label>
              <Select value={deadlineType} onValueChange={(v) => setDeadlineType(v as DeadlineType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="homework">Homework (Huiswerk)</SelectItem>
                  <SelectItem value="small_test">Small Test (Kleine Toets)</SelectItem>
                  <SelectItem value="big_test">Big Test (Grote Toets)</SelectItem>
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
              <InputWithTypingPlaceholder 
                id="title" 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                placeholders={
                  deadlineType === 'big_test' 
                    ? ['Chapter 5 Final Exam', 'Midterm Test', 'Unit Assessment']
                    : deadlineType === 'small_test'
                    ? ['Quiz Week 3', 'Pop Quiz', 'Practice Test']
                    : ['Read pages 50-75', 'Complete worksheet', 'Watch lecture video']
                }
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

            {/* Linked Content Section */}
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Linked Content</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Students can click these links to go directly to the content
                  </p>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsLinkPickerOpen(true)}
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Add Link
                </Button>
              </div>

              {linkedContent.length > 0 && (
                <div className="space-y-2">
                  {linkedContent.map((link) => (
                    <div 
                      key={link.url}
                      className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border"
                    >
                      {link.type === 'material' ? (
                        <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                      ) : (
                        <BookOpen className="h-4 w-4 text-primary flex-shrink-0" />
                      )}
                      <span className="text-sm truncate flex-1">{link.title}</span>
                      <Badge variant="outline" className="text-xs">
                        {link.type}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleRemoveLink(link.url)}
                      >
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
            <Button onClick={handleCreate} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {deadlineType === 'homework' ? 'Create Homework' : 'Schedule Test'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <HierarchicalLinkPickerV2
        isOpen={isLinkPickerOpen}
        onClose={() => setIsLinkPickerOpen(false)}
        onSelect={handleAddLink}
        classId={selectedClassId}
      />
    </>
  );
}
