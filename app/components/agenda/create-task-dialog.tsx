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
import { CalendarIcon, Loader2, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { PersonalTask } from '@/contexts/app-context';
import { Switch } from '../ui/switch';
import { Separator } from '../ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

type TaskType = 'homework' | 'small_test' | 'big_test';

type CreateTaskDialogProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onTaskCreated: (newTask: Omit<PersonalTask, 'id' | 'created_at' | 'user_id'>) => Promise<void>;
  initialDate?: Date;
};

export function CreateTaskDialog({ isOpen, setIsOpen, onTaskCreated, initialDate }: CreateTaskDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date | undefined>(initialDate);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('homework');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [estimatedDuration, setEstimatedDuration] = useState(60);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [useAiHelper, setUseAiHelper] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Only show AI helper for tests, not homework
  const showAiHelper = taskType === 'small_test' || taskType === 'big_test';

  useEffect(() => {
    setDate(initialDate);
  }, [initialDate]);

  // Reset AI helper when task type changes to homework
  useEffect(() => {
    if (taskType === 'homework') {
      setUseAiHelper(false);
    }
  }, [taskType]);

  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    setCalendarOpen(false); // Auto-close calendar
  };

  const handleCreateTask = async () => {
    if (!title || !date) {
      toast({
        title: 'Missing Information',
        description: 'Please provide a title and a date for your task.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);

    try {
      if (useAiHelper && showAiHelper) {
        try {
          const response = await fetch('/api/ai/handle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              flowName: 'generateStudyPlanFromTask',
              input: {
                taskTitle: title,
                taskDueDate: format(date, 'yyyy-MM-dd'),
                todayDate: format(new Date(), 'yyyy-MM-dd'),
              },
            }),
          });
          if (!response.ok) {
            throw new Error(`API call failed: ${response.statusText}`);
          }
          const plan = await response.json();

          for (const subTask of plan.subTasks) {
            await onTaskCreated({
              title: subTask.title,
              description: `AI-generated step for "${title}"`,
              date: subTask.date,
              subject: subject,
              priority: priority,
              estimated_duration: estimatedDuration,
              tags: tags,
            });
          }

          toast({
            title: 'Study Plan Created!',
            description: `AI has added ${plan.subTasks.length} tasks to your agenda.`,
          });
        } catch (error) {
          console.error('AI study plan generation failed:', error);
          toast({
            variant: 'destructive',
            title: 'Study Plan Failed',
            description: 'Could not generate a study plan. The main task was added instead.',
          });
          // Fallback to creating the single main task
          await onTaskCreated({
            title,
            description,
            date: format(date, 'yyyy-MM-dd'),
            subject,
            priority,
            estimated_duration: estimatedDuration,
            tags,
          });
        }
      } else {
        // Non-AI task creation
        await onTaskCreated({
          title,
          description,
          date: format(date, 'yyyy-MM-dd'),
          subject,
          priority,
          estimated_duration: estimatedDuration,
          tags,
        });
        toast({
          title: 'Task Created',
          description: `"${title}" has been added to your agenda.`,
        });
      }

      resetAndClose();
    } catch (error) {
      console.error('Task creation failed:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create task. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const resetAndClose = () => {
    setTitle('');
    setDescription('');
    setDate(initialDate);
    setSubject('');
    setTaskType('homework');
    setPriority('medium');
    setEstimatedDuration(60);
    setTags([]);
    setTagInput('');
    setUseAiHelper(false);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) resetAndClose();
        else setIsOpen(true);
    }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Personal Task</DialogTitle>
          <DialogDescription>
            Add a new task or event to your personal agenda.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          {/* Title */}
          <div className="grid gap-2">
            <Label htmlFor="title">Task Title</Label>
            <Input 
              id="title" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              placeholder="e.g., Prepare for History Exam" 
            />
          </div>

          {/* Description - now after title */}
          <div className="grid gap-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea 
              id="description" 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              placeholder="Add any extra details or notes." 
            />
          </div>

          {/* Date - now after description */}
          <div className="grid gap-2">
            <Label htmlFor="date">Date / Deadline</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "justify-start text-left font-normal",
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
                  onSelect={handleDateSelect}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Task Type */}
          <div className="grid gap-2">
            <Label htmlFor="task-type">Type</Label>
            <Select value={taskType} onValueChange={(v) => setTaskType(v as TaskType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="homework">Huiswerk</SelectItem>
                <SelectItem value="small_test">Kleine Toets</SelectItem>
                <SelectItem value="big_test">Grote Toets</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* AI Study Plan - only show for tests */}
          {showAiHelper && (
            <>
              <Separator />
              <div className="flex items-center justify-between space-x-2 rounded-lg border p-4 bg-muted/30">
                <div className="space-y-0.5">
                  <Label htmlFor="ai-helper" className="text-base flex items-center gap-2">
                    <Wand2 className="h-5 w-5 text-primary" />
                    Create a study plan
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically break this task into a study plan.
                  </p>
                </div>
                <Switch
                  id="ai-helper"
                  checked={useAiHelper}
                  onCheckedChange={setUseAiHelper}
                />
              </div>
            </>
          )}

          <Separator />

          {/* Subject */}
          <div className="grid gap-2">
            <Label htmlFor="subject">Subject (Optional)</Label>
            <InputWithTypingPlaceholder 
              id="subject" 
              value={subject} 
              onChange={e => setSubject(e.target.value)} 
              placeholders={["Biology", "Mathematics", "Nederlands", "History", "Physics"]}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={resetAndClose}>Cancel</Button>
          <Button onClick={handleCreateTask} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
