'use client';

import React, { useState, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, ArrowLeft, Play, Undo2, BookCheck, Wand2, Plus } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AnimatePresence, motion } from 'framer-motion';
// import { generateSingleFlashcard } from '@/ai/flows/generate-single-flashcard'; // Removed direct import
import type { Flashcard } from '@/lib/types';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { AppContext, AppContextType } from '@/contexts/app-context';

type FlashcardEditorProps = {
  cards: Flashcard[];
  sourceText: string;
  onStartStudy: (finalCards: Flashcard[]) => void;
  onBack: () => void;
  isAssignmentContext?: boolean;
};

export function FlashcardEditor({ cards, sourceText, onStartStudy, onBack, isAssignmentContext = false }: FlashcardEditorProps) {
  const [currentCards, setCurrentCards] = useState<Flashcard[]>(cards);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [lastDeleted, setLastDeleted] = useState<{ card: Flashcard; index: number } | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const appContext = useContext(AppContext);
  const { createAssignment } = appContext as AppContextType;

  const [manualFront, setManualFront] = useState('');
  const [manualBack, setManualBack] = useState('');

  const handleAddCardWithAI = async () => {
    setIsAddingCard(true);
    try {
      const response = await fetch('/api/ai/handle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flowName: 'generateSingleFlashcard',
          input: {
            sourceText: sourceText,
            existingFlashcardIds: currentCards.map(c => c.front),
          },
        }),
      });
      if (!response.ok) {
        let errorMessage = response.statusText;
        try {
            const errorData = await response.json();
            if (errorData.detail) errorMessage = errorData.detail;
            if (errorData.code === "MISSING_API_KEY") {
                errorMessage = "AI is not configured (Missing API Key). Please check server logs.";
            }
        } catch (e) { /* ignore */ }
        throw new Error(errorMessage);
      }
      const newCard = await response.json();
      setCurrentCards(prevCards => [...prevCards, newCard]);
    } catch (error) {
      console.error("Failed to add flashcard:", error);
      toast({
        variant: 'destructive',
        title: 'Failed to Add Card',
        description: 'The AI could not generate a new card. Please try again.',
      });
    } finally {
      setIsAddingCard(false);
    }
  };

  const handleAddManualCard = () => {
    if (!manualFront.trim() || !manualBack.trim()) {
      toast({
        variant: 'destructive',
        title: 'Missing content',
        description: 'Please fill in both the front and back of the card.',
      });
      return;
    }
    const newCard: Flashcard = {
      id: `manual-${Date.now()}`,
      front: manualFront.trim(),
      back: manualBack.trim(),
      cloze: `____ is ${manualBack.trim()}.` // Simple default cloze
    };
    setCurrentCards(prev => [...prev, newCard]);
    setManualFront('');
    setManualBack('');
  }

  const handleDeleteCard = (cardId: string) => {
    const cardIndex = currentCards.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return;

    const cardToDelete = currentCards[cardIndex];
    setLastDeleted({ card: cardToDelete, index: cardIndex });

    const newCards = currentCards.filter(c => c.id !== cardId);
    setCurrentCards(newCards);
    
    toast({
      title: 'Card Deleted',
      action: (
        <Button variant="secondary" size="sm" onClick={() => handleUndoDelete()}>
          <Undo2 className="mr-2 h-4 w-4" />
          Undo
        </Button>
      ),
    });
  };

  const handleUndoDelete = () => {
    if (!lastDeleted) return;

    const newCards = [...currentCards];
    newCards.splice(lastDeleted.index, 0, lastDeleted.card);
    setCurrentCards(newCards);
    setLastDeleted(null);
  };
  
  const handleCreateForAssignment = async () => {
    const searchParams = new URLSearchParams(window.location.search);
    const classId = searchParams.get('classId');

    if (!classId) {
        toast({ variant: 'destructive', title: 'Error', description: 'Class ID is missing.' });
        return;
    }

    setIsLoading(true);
    try {
        // 1. Create the material
        const materialTitle = `Flashcards: ${sourceText.substring(0, 30)}...`;
        const materialResponse = await fetch('/api/materials', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: materialTitle,
                class_id: classId,
                type: 'FLASHCARDS',
                content: currentCards,
                source_text_for_concepts: sourceText,
            }),
        });
        if (!materialResponse.ok) throw new Error('Failed to save flashcards as material.');
        const newMaterial = await materialResponse.json();

        // 2. Create the assignment linked to the material
        await createAssignment({
            title: materialTitle,
            class_id: classId,
            paragraph_id: null,
            assignment_index: 0,
            content: null,
            due_date: null,
            answers_enabled: false,
            owner_type: 'user',
            guest_id: null,
            user_id: null,
            material_id: newMaterial.id,
        } as any);

        toast({
            title: 'Assignment Created!',
            description: `The flashcard set has been saved and assigned to the class.`,
        });

        router.push(`/class/${classId}`);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Failed to create assignment', description: error.message });
    } finally {
        setIsLoading(false);
    }
  };


  const handlePrimaryAction = () => {
    if (isAssignmentContext) {
      handleCreateForAssignment();
    } else {
      onStartStudy(currentCards);
    }
  };

  const primaryButtonText = isAssignmentContext
    ? `Create for Assignment (${currentCards.length} cards)`
    : `Start Studying (${currentCards.length} cards)`;

  const PrimaryButtonIcon = isAssignmentContext ? BookCheck : Play;


  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="font-headline text-2xl">Review & Edit Flashcards</CardTitle>
            <CardDescription>Add, remove, or edit cards before you start studying.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 max-h-[50vh] overflow-y-auto pr-3">
        {currentCards.length === 0 ? (
          <Alert>
            <AlertTitle>Empty Set</AlertTitle>
            <AlertDescription>
              There are no cards in this set. Add some cards to get started.
            </AlertDescription>
          </Alert>
        ) : (
          <AnimatePresence>
            {currentCards.map((card, index) => (
              <motion.div
                key={card.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="p-3 border rounded-lg bg-muted/50"
              >
                <div className="flex justify-between items-start">
                  <div className="grid grid-cols-2 gap-4 flex-1">
                    <div>
                        <p className="text-xs font-semibold text-muted-foreground">FRONT</p>
                        <p className="font-medium">{card.front}</p>
                    </div>
                     <div>
                        <p className="text-xs font-semibold text-muted-foreground">BACK</p>
                        <p className="">{card.back}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-8 w-8" onClick={() => handleDeleteCard(card.id)}>
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete card</span>
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </CardContent>
        <div className="p-6 pt-2">
            <Separator className="my-4" />
            <div className="space-y-4">
                <h3 className="text-lg font-semibold">Add New Card</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="manual-front">Front</Label>
                        <Textarea id="manual-front" placeholder="Term or question" value={manualFront} onChange={e => setManualFront(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="manual-back">Back</Label>
                        <Textarea id="manual-back" placeholder="Definition or answer" value={manualBack} onChange={e => setManualBack(e.target.value)} />
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                     <Button onClick={handleAddCardWithAI} variant="outline" disabled={isAddingCard}>
                        {isAddingCard ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                        Add with AI
                    </Button>
                    <Button onClick={handleAddManualCard} disabled={!manualFront || !manualBack}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Manual Card
                    </Button>
                </div>
            </div>
        </div>
      <CardFooter className="flex justify-between bg-muted/50 py-4 border-t">
        <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Setup
        </Button>
        <Button onClick={handlePrimaryAction} disabled={currentCards.length === 0 || isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PrimaryButtonIcon className="mr-2 h-4 w-4" />}
            {isLoading ? 'Creating...' : primaryButtonText}
        </Button>
      </CardFooter>
    </Card>
  );
}
