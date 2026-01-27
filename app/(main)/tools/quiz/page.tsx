'use client';

import React, { useState, useEffect, Suspense, useCallback, useContext } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, Swords, BookCheck, Shield, Sparkles } from 'lucide-react';
import { QuizTaker, QuizMode } from '@/components/tools/quiz-taker';
import { AppContext } from '@/contexts/app-context';

import type { Quiz } from '@/lib/types';
import { QuizDuel } from '@/components/tools/quiz-duel';
import { QuizEditor } from '@/components/tools/quiz-editor';
import { ToolLayout } from '@/components/tools/tool-layout';


function QuizPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sourceTextFromParams = searchParams.get('sourceText');
  const context = searchParams.get('context');
  const classId = searchParams.get('classId');
  const isAssignmentContext = context === 'assignment';
  const appContext = useContext(AppContext);
  if (!appContext) return null;
  const { language } = appContext;

  const [sourceText, setSourceText] = useState(sourceTextFromParams || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [generatedQuiz, setGeneratedQuiz] = useState<Quiz | null>(null);
  const [quizMode, setQuizMode] = useState<QuizMode>('practice');
  const [questionCount, setQuestionCount] = useState(7);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentView, setCurrentView] = useState<'setup' | 'edit' | 'take' | 'duel'>('setup');

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'image' | 'file' | null>(null);

  const handleGenerate = useCallback(async (text: string) => {
    if (!text.trim()) {
      return;
    }
    setIsLoading(true);
    setGeneratedQuiz(null);
    try {
      if (quizMode === 'duel') {
        setCurrentView('duel');
      } else {
        const count = (quizMode === 'survival' || quizMode === 'adaptive' || quizMode === 'boss-fight') ? 1 : questionCount;
        const apiResponse = await fetch('/api/ai/handle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            flowName: 'generateQuiz',
            input: { sourceText: text, questionCount: count, language },
          }),
        });
        if (!apiResponse.ok) {
          let errorMessage = apiResponse.statusText;
          try {
              const errorData = await apiResponse.json();
              if (errorData.detail) errorMessage = errorData.detail;
          } catch (e) { /* ignore */ }
          throw new Error(errorMessage);
        }
        const response = await apiResponse.json();
        setGeneratedQuiz(response);
        if (isEditMode) {
          setCurrentView('edit');
        } else {
          setCurrentView('take');
        }
      }
    } catch (error) {
      console.error('Error generating quiz:', error);
      setCurrentView('setup');
    } finally {
      setIsLoading(false);
    }
  }, [quizMode, questionCount, isEditMode]);

  useEffect(() => {
    if (sourceTextFromParams && !isAssignmentContext) {
      handleGenerate(sourceTextFromParams);
    }
  }, [sourceTextFromParams, handleGenerate]);

  // Add to recents when quiz is generated
  useEffect(() => {
    if (generatedQuiz && !isAssignmentContext) {
      const title = uploadedFile
        ? `${uploadedFile.name.split('.')[0]} Quiz`
        : `Quiz from "${sourceText.slice(0, 30)}${sourceText.length > 30 ? '...' : ''}"`;

      if ((window as any).recentsManager) {
        (window as any).recentsManager.addRecent({
          title,
          type: 'quiz'
        });
      }
    }
  }, [generatedQuiz, uploadedFile, sourceText, isAssignmentContext]);

  const handleFormSubmit = () => {
    handleGenerate(sourceText);
  }

  const handleStartQuiz = (finalQuiz: Quiz) => {
    setGeneratedQuiz(finalQuiz);
    setCurrentView('take');
  }

  const handleCreateForAssignment = (finalQuiz: Quiz) => {
    console.log("Creating quiz for assignment in class:", classId, finalQuiz);
    if (classId) {
        router.push(`/class/${classId}`);
    } else {
        router.push('/classes');
    }
  };

  const handleRestart = () => {
    setGeneratedQuiz(null);
    setCurrentView('setup');
    if (isAssignmentContext) {
        if (classId) {
            router.push(`/class/${classId}`);
        } else {
            router.push('/classes');
        }
    }
  }

  const totalLoading = isLoading || isProcessingFile;
  const mainButtonAction = isAssignmentContext ? () => handleGenerate(sourceText) : handleFormSubmit;

  const mainButtonText = isAssignmentContext
    ? 'Create & Attach to Assignment'
    : 'Generate with AI';

  let mainButtonIcon;
    switch(quizMode) {
        case 'duel':
            mainButtonIcon = <Swords className="mr-2 h-4 w-4" />;
            break;
        case 'boss-fight':
            mainButtonIcon = <Shield className="mr-2 h-4 w-4" />;
            break;
        default:
            mainButtonIcon = isAssignmentContext ? <BookCheck className="mr-2 h-4 w-4" /> : <Sparkles className="mr-2 h-4 w-4" />;
    }

  const finalButtonText = quizMode === 'duel'
    ? 'Start Duel'
    : (quizMode === 'boss-fight' ? 'Start Boss Fight' : (isAssignmentContext ? 'Create & Attach' : 'Generate with AI'));

  const quizModeOptions = [
    { value: 'practice', label: 'Practice' },
    { value: 'normal', label: 'Normal' },
    { value: 'exam', label: 'Exam' },
    { value: 'survival', label: 'Survival' },
    { value: 'speedrun', label: 'Speedrun' },
    { value: 'adaptive', label: 'Adaptive' },
    { value: 'boss-fight', label: 'Boss Fight' },
    { value: 'duel', label: 'Duel (1v1)' },
  ];

  // Generate subject cards based on uploaded content
  const subjectCards = uploadedFile ? [
    { title: `${uploadedFile.name.split('.')[0]} Quiz`, type: 'Quiz' },
    { title: `${uploadedFile.name.split('.')[0]} Test`, type: 'Test' },
    { title: `${uploadedFile.name.split('.')[0]} Review`, type: 'Review' },
  ] : [];

  const additionalSettings = [
    {
      label: 'Edit Mode',
      value: isEditMode,
      onChange: setIsEditMode,
      options: [
        { value: false, label: 'Direct Start' },
        { value: true, label: 'Review & Edit' },
      ]
    }
  ];

  if (isLoading) {
     return (
       <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm p-8">
        <div className="flex flex-col items-center gap-2 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <h3 className="text-2xl font-bold tracking-tight mt-4">
                Generating Your Quiz
            </h3>
            <p className="text-sm text-muted-foreground">
                The AI is working its magic. Please wait a moment...
            </p>
        </div>
      </div>
    )
  }

  if (generatedQuiz && currentView === 'edit') {
    return <QuizEditor quiz={generatedQuiz} sourceText={sourceText} onStartQuiz={handleStartQuiz} onBack={() => setCurrentView('setup')} isAssignmentContext={isAssignmentContext} onCreateForAssignment={handleCreateForAssignment} />;
  }
  if (generatedQuiz && currentView === 'take') {
    return <QuizTaker quiz={generatedQuiz} mode={quizMode} sourceText={sourceText} onRestart={handleRestart} />;
  }
  if (currentView === 'duel') {
    return <QuizDuel sourceText={sourceText} onRestart={handleRestart} />
  }

  return (
    <ToolLayout
      title={isAssignmentContext ? 'Create New Quiz' : 'Quiz'}
      description={isAssignmentContext ? `Create a new quiz from text or a file to attach to your assignment.` : `Create quizzes from text, files, or previous projects.`}
      sourceText={sourceText}
      setSourceText={setSourceText}
      onGenerate={handleFormSubmit}
      isLoading={totalLoading}
      isProcessingFile={isProcessingFile}
      uploadedFile={uploadedFile}
      setUploadedFile={setUploadedFile}
      fileType={fileType}
      setFileType={setFileType}
      modeOptions={quizModeOptions}
      selectedMode={quizMode}
      onModeChange={(mode) => setQuizMode(mode as QuizMode)}
      modeButtonText="Quiz Mode"
      countValue={questionCount}
      onCountChange={setQuestionCount}
      countLabel="Questions"
      additionalSettings={additionalSettings}
      subjectCards={subjectCards}
      isAssignmentContext={isAssignmentContext}
    />
  );
}

export default function QuizPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <QuizPageContent />
        </Suspense>
    )
}
