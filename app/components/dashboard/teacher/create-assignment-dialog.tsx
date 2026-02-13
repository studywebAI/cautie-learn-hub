
'use client';

import { useState, useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { InputWithTypingPlaceholder } from '@/components/ui/input-with-typing-placeholder';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, BrainCircuit, Copy, Loader2, Link as LinkIcon, Paperclip, X, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { SelectMaterialDialog } from './select-material-dialog';
import { Badge } from '@/components/ui/badge';
import type { MaterialReference } from '@/lib/teacher-types';


type CreateAssignmentDialogProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  classId: string;
};

export function CreateAssignmentDialog({ isOpen, setIsOpen, classId }: CreateAssignmentDialogProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('homework');
  const [dueDate, setDueDate] = useState<Date>();
  const [selectedMaterial, setSelectedMaterial] = useState<Pick<MaterialReference, 'id' | 'title'> | null>(null);
  const [isSelectMaterialOpen, setIsSelectMaterialOpen] = useState(false);
  const [studyReferences, setStudyReferences] = useState<Array<{id: string, type: string, title: string, description: string}>>([]);
  const [isSelectReferenceOpen, setIsSelectReferenceOpen] = useState(false);
  const [chapters, setChapters] = useState<Array<{id: string, title: string}>>([]);
  const [selectedChapter, setSelectedChapter] = useState<string>('');
  const [blocks, setBlocks] = useState<Array<{id: string, type: string, content: any}>>([]);
  const [selectedBlock, setSelectedBlock] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(false);
  const { toast } = useToast();
  const { createAssignment } = useContext(AppContext) as AppContextType;

  // Fetch chapters when dialog opens
  useEffect(() => {
    if (isOpen && classId) {
      const fetchChapters = async () => {
        setIsLoadingChapters(true);
        try {
          const response = await fetch(`/api/classes/${classId}/chapters`);
          if (response.ok) {
            const data = await response.json();
            setChapters(data.chapters || []);
          }
        } catch (error) {
          console.error('Failed to fetch chapters:', error);
        } finally {
          setIsLoadingChapters(false);
        }
      };
      fetchChapters();
    }
  }, [isOpen, classId]);

  // Fetch blocks when chapter is selected
  useEffect(() => {
    if (selectedChapter) {
      const fetchBlocks = async () => {
        setIsLoadingBlocks(true);
        setBlocks([]);
        setSelectedBlock('');
        try {
          const response = await fetch(`/api/classes/${classId}/chapters/${selectedChapter}/blocks`);
          if (response.ok) {
            const data = await response.json();
            setBlocks(data.blocks || []);
          }
        } catch (error) {
          console.error('Failed to fetch blocks:', error);
        } finally {
          setIsLoadingBlocks(false);
        }
      };
      fetchBlocks();
    } else {
      setBlocks([]);
      setSelectedBlock('');
    }
  }, [selectedChapter, classId]);

  const handleCreateAssignment = async () => {
    if (!title || !dueDate) {
      toast({
        title: 'Missing Information',
        description: 'Please fill out at least the title and due date.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    try {
        await createAssignment({
            title,
            scheduled_start_at: format(dueDate, "yyyy-MM-dd'T'HH:mm:ss'Z'"),
            scheduled_end_at: format(dueDate, "yyyy-MM-dd'T'HH:mm:ss'Z'"),
            scheduled_answer_release_at: format(dueDate, "yyyy-MM-dd'T'HH:mm:ss'Z'"),
            class_id: classId,
            material_id: selectedMaterial?.id || null,
            chapter_id: selectedChapter || null,
            block_id: selectedBlock || null,
        } as any);
        
        toast({
            title: 'Assignment Created',
            description: `"${title}" has been assigned.`,
        });

        resetAndClose();

    } catch (error: any) {
        toast({
            title: 'Error creating assignment',
            description: error.message || 'An unexpected error occurred.',
            variant: 'destructive',
        });
    } finally {
        setIsLoading(false);
    }
  };

  const navigateToTool = (tool: 'quiz' | 'flashcards') => {
    setIsOpen(false);
    const params = new URLSearchParams({
      context: 'assignment',
      classId: classId,
    });
    router.push(`/tools/${tool}?${params.toString()}`);
  }
  
  const resetAndClose = () => {
    setTitle('');
    setDescription('');
    setDueDate(undefined);
    setSelectedMaterial(null);
    setSelectedChapter('');
    setSelectedBlock('');
    setIsOpen(false);
  }

  const handleMaterialSelected = (material: Pick<MaterialReference, 'id' | 'title'>) => {
    setSelectedMaterial(material);
    setIsSelectMaterialOpen(false);
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => {
          if (!open) resetAndClose();
          else setIsOpen(true);
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Assignment</DialogTitle>
            <DialogDescription>
              Assign new work to your class. You can create an assignment with or without attached materials.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Assignment Title</Label>
              <InputWithTypingPlaceholder 
                id="title" 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                placeholders={["Chapter 5 Reading", "Weekly Quiz", "Research Project", "Lab Report"]}
              />
            </div>
            
             <div className="grid gap-2">
              <Label htmlFor="description">Content (Optional)</Label>
              <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Add any extra instructions or context for your students." />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="due-date">Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Separator />
            
             <div className="grid gap-2">
              <Label>Material</Label>
              <p className="text-sm text-muted-foreground">Optionally, create or attach learning material to this assignment.</p>

              {selectedMaterial ? (
                 <div className="flex items-center gap-2 p-2.5 rounded-md bg-muted/50 border text-sm">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium truncate flex-1">Attached: {selectedMaterial.title}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedMaterial(null)}>
                        <X className="h-4 w-4" />
                        <span className="sr-only">Remove attached material</span>
                    </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                    <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="secondary">Create New Material...</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => navigateToTool('quiz')}>
                        <BrainCircuit className="mr-2 h-4 w-4" />
                        Create New Quiz
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigateToTool('flashcards')}>
                        <Copy className="mr-2 h-4 w-4" />
                        Create New Flashcards
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                    </DropdownMenu>

                    <Button variant="secondary" onClick={() => setIsSelectMaterialOpen(true)}>
                      <LinkIcon className="mr-2 h-4 w-4" />
                      Attach Existing
                    </Button>
                </div>
              )}
            </div>
            

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetAndClose}>Cancel</Button>
            <Button onClick={handleCreateAssignment} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <SelectMaterialDialog 
        isOpen={isSelectMaterialOpen}
        setIsOpen={setIsSelectMaterialOpen}
        classId={classId}
        onMaterialSelected={handleMaterialSelected}
      />
    </>
  );
}
