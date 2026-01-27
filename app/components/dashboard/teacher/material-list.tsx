
'use client';

import { useState, useContext } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, FileSignature, BrainCircuit, Copy, File, MoreHorizontal, Trash2, Wand2, Loader2, Blocks } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AppContext, AppContextType } from '@/contexts/app-context';
import type { MaterialReference } from '@/lib/teacher-types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
// Removed direct import - using API route instead
import Link from 'next/link';

const iconMap = {
  NOTE: FileSignature,
  QUIZ: BrainCircuit,
  FLASHCARDS: Copy,
  FILE: File,
  BLOCK: Blocks,
};

type CreateNoteDialogProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  classId: string;
};

function CreateNoteDialog({ isOpen, setIsOpen, classId }: CreateNoteDialogProps) {
  const [sourceText, setSourceText] = useState('');
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { refetchMaterials } = useContext(AppContext) as AppContextType;
  const { toast } = useToast();

  const handleCreateNote = async () => {
    if (!title.trim() || !sourceText.trim()) {
      toast({
        variant: 'destructive',
        title: 'Missing content',
        description: 'Please provide a title and some source text to create a note.',
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const apiResponse = await fetch('/api/ai/handle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flowName: 'generateNotes',
          input: { sourceText },
        }),
      });
      if (!apiResponse.ok) {
        let errorMessage = apiResponse.statusText;
        try {
            const errorData = await apiResponse.json();
            if (errorData.detail) errorMessage = errorData.detail;
            if (errorData.code === "MISSING_API_KEY") {
                errorMessage = "AI is not configured (Missing API Key). Please check server logs.";
            }
        } catch (e) { /* ignore */ }
        throw new Error(errorMessage);
      }
      const aiNotes = await apiResponse.json();
      
      const response = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: classId,
          title,
          type: 'NOTE',
          notes_content: aiNotes.notes,
          source_text_for_concepts: sourceText,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create note material.');
      }
      
      toast({
        title: 'Note Created',
        description: `"${title}" has been added to your materials.`,
      });

      await refetchMaterials(classId);
      resetAndClose();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error Creating Note',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const resetAndClose = () => {
    setTitle('');
    setSourceText('');
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create AI-Generated Notes</DialogTitle>
          <DialogDescription>
            Provide some source text, and the AI will generate structured notes from it.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="note-title">Note Title</Label>
                <Input id="note-title" placeholder="e.g., Chapter 1: The Renaissance" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="source-text">Source Text</Label>
                <Textarea 
                    id="source-text"
                    placeholder="Paste the text from your textbook, article, or other source material here..."
                    value={sourceText}
                    onChange={(e) => setSourceText(e.target.value)}
                    className="min-h-[200px]"
                />
            </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={resetAndClose}>Cancel</Button>
          <Button onClick={handleCreateNote} disabled={isLoading || !title || !sourceText}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Note with AI
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


type CreateBlockMaterialDialogProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  classId: string;
};

function CreateBlockMaterialDialog({ isOpen, setIsOpen, classId }: CreateBlockMaterialDialogProps) {
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { refetchMaterials } = useContext(AppContext) as AppContextType;
  const { toast } = useToast();

  const handleCreateBlockMaterial = async () => {
    if (!title.trim()) {
      toast({
        variant: 'destructive',
        title: 'Missing title',
        description: 'Please provide a title for the block material.',
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: classId,
          title,
          type: 'BLOCK',
          content: {}, // Empty content for block materials
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create block material.');
      }

      const data = await response.json();

      toast({
        title: 'Block Material Created',
        description: `${title} has been created. You can now add blocks to it.`,
      });

      await refetchMaterials(classId);
      resetAndClose();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error Creating Block Material',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetAndClose = () => {
    setTitle('');
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Block Material</DialogTitle>
          <DialogDescription>
            Create a new material that you can build using blocks. You'll be able to add text, images, code, and more.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="block-title">Material Title</Label>
            <Input
              id="block-title"
              placeholder="e.g., Introduction to Algebra"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={resetAndClose}>Cancel</Button>
          <Button onClick={handleCreateBlockMaterial} disabled={isLoading || !title}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Block Material
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type MaterialListProps = {
  materials: MaterialReference[];
  classId: string;
  isLoading: boolean;
  isTeacher?: boolean;
};

export function MaterialList({ materials, classId, isLoading, isTeacher = true }: MaterialListProps) {
  const [isCreateNoteOpen, setIsCreateNoteOpen] = useState(false);
  const [isCreateBlockOpen, setIsCreateBlockOpen] = useState(false);
  const { refetchMaterials } = useContext(AppContext) as AppContextType;
  const { toast } = useToast();

  const handleDelete = async (materialId: string) => {
    try {
      const response = await fetch(`/api/materials/${materialId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete material.');
      }
      toast({
        title: 'Material Deleted',
      });
      await refetchMaterials(classId);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error Deleting Material',
        description: error.message,
      });
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-headline">Materials</CardTitle>
            <CardDescription>
              {isTeacher
                ? "All learning resources available for this class."
                : "Learning materials available for this class."
              }
            </CardDescription>
          </div>
          {isTeacher && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Material
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsCreateNoteOpen(true)}>
                  <FileSignature className="mr-2 h-4 w-4" />
                  <span>Create AI Notes</span>
                </DropdownMenuItem>
                <DropdownMenuItem disabled>
                  <BrainCircuit className="mr-2 h-4 w-4" />
                  <span>Create Quiz (soon)</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsCreateBlockOpen(true)}>
                  <Blocks className="mr-2 h-4 w-4" />
                  <span>Create Block Material</span>
                </DropdownMenuItem>
                 <DropdownMenuItem disabled>
                  <Copy className="mr-2 h-4 w-4" />
                  <span>Create Flashcards (soon)</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {materials.map((material) => {
            const Icon = iconMap[material.type] || File;
            return (
              <div key={material.id} className="flex items-start justify-between p-4 rounded-lg bg-muted/50 border">
                <Link href={`/material/${material.id}`} className="flex items-start gap-4 flex-1 group">
                  <Icon className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                  <div className="space-y-2">
                    <p className="font-semibold group-hover:underline">{material.title}</p>
                    <div className="flex flex-wrap gap-1.5">
                       {material.concepts?.slice(0, 5).map(concept => (
                         <Badge key={concept.id} variant="secondary">{concept.name}</Badge>
                       ))}
                    </div>
                  </div>
                </Link>
                {isTeacher ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">More actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild><Link href={`/material/${material.id}`}>View Material</Link></DropdownMenuItem>
                      <DropdownMenuItem>Attach to Assignment</DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDelete(material.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/material/${material.id}`}>View Material</Link>
                  </Button>
                )}
              </div>
            );
          })}
          {materials.length === 0 && !isLoading && (
            <div className="text-center h-24 flex flex-col justify-center items-center text-muted-foreground">
              <p>No materials have been created for this class yet.</p>
              <Button variant="link" onClick={() => setIsCreateNoteOpen(true)}>Create one now</Button>
            </div>
          )}
           {isLoading && (
            <div className="text-center h-24 flex justify-center items-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </CardContent>
      </Card>
      <CreateNoteDialog isOpen={isCreateNoteOpen} setIsOpen={setIsCreateNoteOpen} classId={classId} />`n      <CreateBlockMaterialDialog isOpen={isCreateBlockOpen} setIsOpen={setIsCreateBlockOpen} classId={classId} />
    </>
  );
}
