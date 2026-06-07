'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CreateWizardState } from '../types';

const INITIAL_STATE: CreateWizardState = {
  step: 1,
  name: '',
  subject: '',
  studyDays: [],
  uploadType: 'custom',
  sources: [],
  settings: {},
  selectedTools: [],
};

type QuestionState = {
  examDays?: number;
  hoursPerDay?: 'light' | 'medium' | 'heavy';
  learningStyle?: 'visual' | 'kinesthetic' | 'read-write' | 'auditory';
  knowledge?: 'none' | 'some' | 'medium';
};

export default function ConditionalFlow() {
  const router = useRouter();
  const [state, setState] = useState<CreateWizardState>(INITIAL_STATE);
  const [questions, setQuestions] = useState<QuestionState>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [generatedPlan, setGeneratedPlan] = useState(false);

  const questionSequence = [
    {
      title: 'Wanneer is je examen?',
      key: 'examDays',
      options: [
        { label: '< 1 week', value: 7 },
        { label: '1-2 weken', value: 14 },
        { label: '2-4 weken', value: 28 },
        { label: '> 1 maand', value: 60 },
      ],
    },
    {
      title: 'Hoeveel tijd per dag?',
      key: 'hoursPerDay',
      options: [
        { label: '< 30 min', value: 'light' },
        { label: '30-60 min', value: 'medium' },
        { label: '1-2 uur', value: 'heavy' },
      ],
    },
    {
      title: 'Hoe leer je het beste?',
      key: 'learningStyle',
      options: [
        { label: 'Visueel (plaatjes)', value: 'visual' },
        { label: 'Kinesthetisch (doen)', value: 'kinesthetic' },
        { label: 'Lezen/schrijven', value: 'read-write' },
        { label: 'Auditief (horen)', value: 'auditory' },
      ],
    },
    {
      title: 'Jouw huidge kennis?',
      key: 'knowledge',
      options: [
        { label: 'Compleet nieuw', value: 'none' },
        { label: 'Wat kennis', value: 'some' },
        { label: 'Goed inzicht', value: 'medium' },
      ],
    },
  ];

  const question = questionSequence[currentQuestion];

  const handleAnswer = (value: any) => {
    setQuestions({ ...questions, [question.key]: value });
    if (currentQuestion < questionSequence.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // All questions answered - generate plan
      generatePlan();
    }
  };

  const generatePlan = () => {
    // AI would generate personalized plan based on answers
    console.log('Generated plan based on:', questions);
    setGeneratedPlan(true);
  };

  const handleCreate = () => {
    router.push('/studyset');
  };

  if (generatedPlan) {
    return (
      <div className="min-h-screen bg-[#faf9f7] flex flex-col items-center justify-center px-8">
        <div className="max-w-2xl">
          <div className="bg-[#e8f5e9] border border-[#4caf50] rounded-lg p-8 text-center">
            <h1 className="text-3xl font-bold text-[#2e7d32] mb-4">🤖 Plan Gegenereerd</h1>
            <p className="text-[#558b2f] mb-6">
              Op basis van jouw antwoorden heeft AI je persoonlijke studieplan gemaakt.
            </p>

            <div className="bg-white rounded-lg p-6 text-left space-y-4 mb-6">
              <div>
                <p className="text-xs font-bold uppercase text-[#71717a]">Tempo</p>
                <p className="text-sm text-[#18181b] mt-1">Intensief (totaal: 12 uur)</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-[#71717a]">Leerstijl</p>
                <p className="text-sm text-[#18181b] mt-1">Visueel: 50% afbeeldingen + mind maps</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-[#71717a]">Aanbevolen tools</p>
                <p className="text-sm text-[#18181b] mt-1">Quiz (40%) • Flashcards (35%) • Mind Map (25%)</p>
              </div>
            </div>

            <Button
              onClick={handleCreate}
              className="w-full bg-[#6b7c4e] hover:bg-[#4f5d3a] text-white py-3"
            >
              Maak mijn studyset
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      {/* HEADER */}
      <div className="border-b border-[#e4e4e7] bg-white px-8 py-6">
        <h1 className="text-2xl font-bold">Vragenflow</h1>
        <p className="mt-1 text-sm text-[#71717a]">Vraag {currentQuestion + 1} / {questionSequence.length}</p>
        <div className="mt-4 h-1 bg-[#e4e4e7] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#6b7c4e]"
            style={{ width: `${((currentQuestion + 1) / questionSequence.length) * 100}%` }}
          />
        </div>
      </div>

      {/* CONTENT */}
      <div className="mx-auto max-w-2xl px-8 py-12 flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="w-full">
          <h2 className="text-3xl font-bold text-[#18181b] mb-8 text-center">{question.title}</h2>

          <div className="space-y-3">
            {question.options.map((option: any) => (
              <button
                key={option.value}
                onClick={() => handleAnswer(option.value)}
                className="w-full px-6 py-4 bg-white border-2 border-[#e4e4e7] rounded-lg hover:border-[#6b7c4e] hover:shadow-md transition text-left font-medium text-[#18181b]"
              >
                {option.label}
              </button>
            ))}
          </div>

          {currentQuestion > 0 && (
            <button
              onClick={() => setCurrentQuestion(currentQuestion - 1)}
              className="mt-8 inline-flex items-center gap-2 text-[#6b7c4e] hover:text-[#4f5d3a]"
            >
              <ChevronLeft className="h-4 w-4" />
              Vorige vraag
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
