

'use client';

import React, { useState, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, ArrowLeft, Play, Undo2, BookCheck, Wand2, Plus, Edit } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AnimatePresence, motion } from 'framer-motion';
// import { generateSingleQuestion } from '@/ai/flows/generate-single-question';
// import { suggestAnswers } from '@/ai/flows/suggest-answers';
import type { Quiz, QuizQuestion, QuizOption } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '../ui/form';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Separator } from '../ui/separator';
import { AppContext, AppContextType } from '@/contexts/app-context';


const manualQuestionSchema = z.object({
  question: z.string().min(5, { message: "Question must be at least 5 characters long." }),
  options: z.array(z.object({
    text: z.string().min(1, { message: "Option text cannot be empty." }),
  })).min(2, "You must provide at least two options."),
  correctOptionIndex: z.string().refine(val => val !== undefined, { message: "You must select a correct answer." }),
});

type ManualQuestionFormValues = z.infer<typeof manualQuestionSchema>;

type QuizEditorProps = {
  quiz: Quiz;
  sourceText: string;
  onStartQuiz: (finalQuiz: Quiz) => void;
  onBack: () => void;
  isAssignmentContext?: boolean;
  onCreateForAssignment: (finalQuiz: Quiz) => void; // Added this line
};

export function QuizEditor({ quiz, sourceText, onStartQuiz, onBack, isAssignmentContext = false, onCreateForAssignment }: QuizEditorProps) {
  const [currentQuiz, setCurrentQuiz] = useState<Quiz>(quiz);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [lastDeleted, setLastDeleted] = useState<{ question: QuizQuestion; index: number } | null>(null);
  const [aiSuggestedOptions, setAiSuggestedOptions] = useState<QuizOption[] | null>(null); // New state for AI suggestions
  const [showAnswers, setShowAnswers] = useState(false); // New state to toggle answer visibility, default to false
  const { toast } = useToast();
  const router = useRouter();
  const appContext = useContext(AppContext);
  const { createAssignment } = appContext as AppContextType;

  const form = useForm<ManualQuestionFormValues>({
    resolver: zodResolver(manualQuestionSchema),
    defaultValues: {
      question: "",
      options: [{ text: "" }, { text: "" }, { text: "" }, { text: "" }],
      correctOptionIndex: undefined,
    },
  });

  const { fields, update, replace } = useFieldArray({
    control: form.control,
    name: "options"
  });

  const handleAddQuestionWithAI = async () => {
    setIsAddingQuestion(true);
    setAiSuggestedOptions(null); // Clear previous suggestions
    try {
      const questionText = form.getValues("question");

      if (questionText.trim()) {
        // If question text is provided, suggest answers
        const response = await fetch('/api/ai/handle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                flowName: 'suggestAnswers',
                input: {
                    question: questionText,
                    sourceText: sourceText,
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
        const result = await response.json();
        setAiSuggestedOptions(result.suggestedOptions);
      } else {
        // If no question text, generate a full question
        const response = await fetch('/api/ai/handle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                flowName: 'generateSingleQuestion',
                input: {
                    sourceText: sourceText,
                    difficulty: 5,
                    existingQuestionIds: currentQuiz.questions.map(q => q.id),
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
        const newQuestion = await response.json();
        setCurrentQuiz(prevQuiz => ({
          ...prevQuiz,
          questions: [...prevQuiz.questions, newQuestion],
        }));
      }
    } catch (error) {
      console.error("Failed to add question or suggest answers:", error);
      toast({
        variant: "destructive",
        title: "AI Suggestion Failed",
        description: "The AI could not generate a suggestion. Please try again.",
      });
    } finally {
      setIsAddingQuestion(false);
    }
  };

  const handleAcceptSuggestedOption = (acceptedOption: QuizOption, index: number) => {
    const currentOptions = form.getValues("options");
    const newOptions = [...currentOptions];
    
    // Find the first empty option slot or replace the one at the index if it exists
    let targetIndex = newOptions.findIndex(opt => opt.text.trim() === '');
    if (targetIndex === -1 || targetIndex > 3) { // Ensure we don't go beyond default 4 options if no empty slot found
      targetIndex = index; // Fallback to replacing by suggestion index
    }

    if (newOptions[targetIndex]) {
      update(targetIndex, { text: acceptedOption.text });
    } else {
      // If there are less than 4 options, append
      if (newOptions.length < 4) {
        replace([...newOptions, { text: acceptedOption.text }]);
      } else {
        // If all 4 options are filled and no empty slot, replace the one at targetIndex
        update(targetIndex, { text: acceptedOption.text });
      }
    }

    // Set correct answer if this is the correct option
    if (acceptedOption.isCorrect) {
      form.setValue("correctOptionIndex", String(targetIndex));
    }

    // Remove accepted option from suggested list
    setAiSuggestedOptions(prev => prev ? prev.filter(opt => opt.id !== acceptedOption.id) : null);
  };

  const handleRejectSuggestedOption = (indexToRemove: number) => {
    setAiSuggestedOptions(prev => prev ? prev.filter((_, index) => index !== indexToRemove) : null);
  };

  const handleAddManualQuestion = (data: ManualQuestionFormValues) => {
    const newOptions: QuizOption[] = data.options.map((opt, index) => ({
      id: String.fromCharCode(97 + index), // a, b, c, d
      text: opt.text,
      isCorrect: index === parseInt(data.correctOptionIndex),
    })).filter(opt => opt.text.trim() !== '');

    if (newOptions.length < 2) {
      toast({ variant: 'destructive', title: 'Not enough options', description: 'Please provide at least two answer options.'});
      return;
    }

    const newQuestion: QuizQuestion = {
      id: `manual-${Date.now()}`,
      question: data.question,
      options: newOptions,
    };

    setCurrentQuiz(prev => ({ ...prev, questions: [...prev.questions, newQuestion] }));
    form.reset();
     toast({
      title: 'Question Added',
      description: 'The new question has been added to the quiz.',
    });
  };

  const handleDeleteQuestion = (questionId: string) => {
    const questionIndex = currentQuiz.questions.findIndex(q => q.id === questionId);
    if (questionIndex === -1) return;

    const questionToDelete = currentQuiz.questions[questionIndex];
    setLastDeleted({ question: questionToDelete, index: questionIndex });

    const newQuestions = currentQuiz.questions.filter(q => q.id !== questionId);
    setCurrentQuiz(prevQuiz => ({
      ...prevQuiz,
      questions: newQuestions,
    }));
    
    toast({
      title: 'Question Deleted',
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

    const newQuestions = [...currentQuiz.questions];
    newQuestions.splice(lastDeleted.index, 0, lastDeleted.question);
    setCurrentQuiz(prevQuiz => ({
      ...prevQuiz,
      questions: newQuestions,
    }));
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
        const materialResponse = await fetch('/api/materials', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: currentQuiz.title,
                class_id: classId,
                type: 'QUIZ',
                content: currentQuiz,
                source_text_for_concepts: sourceText,
            }),
        });
        if (!materialResponse.ok) throw new Error('Failed to save quiz as material.');
        const newMaterial = await materialResponse.json();

        // 2. Create the assignment linked to the material
        await createAssignment({
            title: currentQuiz.title,
            class_id: classId,
            due_date: null,
            material_id: newMaterial.id,
        });

        toast({
            title: 'Assignment Created!',
            description: `"${currentQuiz.title}" has been saved and assigned to the class.`, 
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
        onStartQuiz(currentQuiz);
    }
  }

  const primaryButtonText = isAssignmentContext 
    ? `Create for Assignment (${currentQuiz.questions.length} questions)`
    : `Start Quiz (${currentQuiz.questions.length} questions)`;
    
  const PrimaryButtonIcon = isAssignmentContext ? BookCheck : Play;


  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="font-headline text-2xl">Review & Edit Quiz</CardTitle>
            <CardDescription>Add, remove, or edit questions before you start.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 max-h-[50vh] overflow-y-auto pr-4">
        {currentQuiz.questions.length === 0 ? (
          <Alert>
            <AlertTitle>Empty Quiz</AlertTitle>
            <AlertDescription>
              There are no questions in this quiz. Add some questions to get started.
            </AlertDescription>
          </Alert>
        ) : (
          <AnimatePresence>
            {currentQuiz.questions.map((q, index) => (
              <motion.div
                key={q.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="p-4 border rounded-lg bg-muted/50"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-semibold">{index + 1}. {q.question}</p>
                    <ul className="mt-2 space-y-1 text-sm text-muted-foreground list-disc pl-5">
                      {q.options.map(opt => (
                        <li key={opt.id} className={opt.isCorrect && showAnswers ? 'font-medium text-primary' : ''}>
                          {opt.text} 
                          {showAnswers && opt.isCorrect && (
                            <span className="ml-2 text-green-600 dark:text-green-400">✓</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteQuestion(q.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </CardContent>
      
      <div className="p-6 pt-2">
        <Separator className="my-4" />
        <Accordion type="single" collapsible>
          <AccordionItem value="add-question">
            <AccordionTrigger className="text-lg font-semibold">Add New Question</AccordionTrigger>
            <AccordionContent className="pt-4">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleAddManualQuestion)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="question"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Question Text</FormLabel>
                          <FormControl>
                            <Textarea placeholder="What is the powerhouse of the cell?" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="correctOptionIndex"
                      render={({ field }) => (
                        <FormItem>
                           <FormLabel>Options</FormLabel>
                           <FormDescription>Fill in at least two options and select the correct one.</FormDescription>
                           <FormControl>
                               <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  {fields.map((item, index) => (
                                      <FormField
                                          key={item.id}
                                          control={form.control}
                                          name={`options.${index}.text`}
                                          render={({ field: optionField }) => (
                                                <FormItem className="flex items-center gap-2 space-y-0">
                                                    <FormControl>
                                                        <RadioGroupItem value={String(index)} />
                                                    </FormControl>
                                                    <Input placeholder={`Option ${index + 1}`} {...optionField} />
                                                </FormItem>
                                          )}
                                      />
                                  ))}
                               </RadioGroup>
                           </FormControl>
                           <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {aiSuggestedOptions && aiSuggestedOptions.length > 0 && (
                      <div className="space-y-4 rounded-md border p-4 bg-blue-50/50 dark:bg-blue-950/20">
                        <h4 className="font-semibold text-blue-700 dark:text-blue-300">AI Suggested Options:</h4>
                        <ul className="space-y-2">
                          {aiSuggestedOptions.map((opt, index) => (
                            <li key={opt.id} className="flex items-center justify-between p-2 rounded-md bg-white dark:bg-gray-800 shadow-sm">
                              <span className={`flex-1 ${opt.isCorrect ? 'font-medium text-green-700 dark:text-green-300' : ''}`}>
                                {opt.text} {opt.isCorrect && <span className="text-xs text-green-600 dark:text-green-400">(Correct)</span>}
                              </span>
                              <div className="flex gap-2 ml-4">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
                                  onClick={() => handleAcceptSuggestedOption(opt, index)}
                                >
                                  ✓
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                                  onClick={() => handleRejectSuggestedOption(index)}
                                >
                                  ✕
                                </Button>
                              </div>
                            </li>
                          ))}
                        </ul>
                        <p className="text-sm text-muted-foreground">Review AI suggestions and accept or reject them. Accepted options will fill the form fields.</p>
                      </div>
                    )}

                    <div className="flex justify-end gap-2">
                        <Button type="button" onClick={handleAddQuestionWithAI} variant="outline" disabled={isAddingQuestion}>
                            {isAddingQuestion ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                            {form.getValues("question").trim() ? "Suggest Answers with AI" : "Suggest Full Question with AI"}
                        </Button>
                        <Button type="submit">
                            <Plus className="mr-2 h-4 w-4" />
                            Add Manual Question
                        </Button>
                    </div>

                  </form>
                </Form>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      <CardFooter className="flex justify-between bg-muted/50 py-3 border-t">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Setup
          </Button>
          <Button variant="secondary" onClick={() => setShowAnswers(prev => !prev)}>
            {showAnswers ? "Hide Answers" : "Show Answers"}
          </Button>
        </div>
        <Button onClick={handlePrimaryAction} disabled={currentQuiz.questions.length === 0 || isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PrimaryButtonIcon className="mr-2 h-4 w-4" />}
            {isLoading ? 'Creating...' : primaryButtonText}
        </Button>
      </CardFooter>
    </Card>
  );
}
