'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';

const ASSESSMENT_QUESTIONS = [
  { q: 'Wat is een celmembraan?', correct: 'A' },
  { q: 'Mitose gebeurt in welke celfase?', correct: 'B' },
  { q: 'Wat is het verschil tussen procarioont en eucarioot?', correct: 'C' },
  { q: 'Welk organeel is verantwoordelijk voor energieproductie?', correct: 'D' },
  { q: 'DNA bevindt zich vooral in...?', correct: 'A' },
];

export default function AssessmentFlow() {
  const router = useRouter();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [completed, setCompleted] = useState(false);
  const [score, setScore] = useState(0);

  const question = ASSESSMENT_QUESTIONS[currentQuestion];
  const options = ['A', 'B', 'C', 'D'];

  const handleAnswer = (answer: string) => {
    const correct = answer === question.correct;
    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);

    if (correct) {
      setScore(score + 1);
    }

    if (currentQuestion < ASSESSMENT_QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setCompleted(true);
    }
  };

  if (completed) {
    const percentage = Math.round((score / ASSESSMENT_QUESTIONS.length) * 100);
    const level = percentage >= 80 ? 'Advanced' : percentage >= 60 ? 'Intermediate' : 'Beginner';

    return (
      <div className="min-h-screen bg-[#faf9f7] flex flex-col items-center justify-center px-8">
        <div className="max-w-2xl w-full">
          <div className="bg-[#e8f5e9] border border-[#4caf50] rounded-lg p-8 text-center">
            <h1 className="text-3xl font-bold text-[#2e7d32] mb-2">Test voltooid!</h1>
            <p className="text-[#558b2f] mb-6">Je niveau is bepaald</p>

            <div className="bg-white rounded-lg p-8 mb-6">
              <div className="text-6xl font-bold text-[#6b7c4e] mb-2">{percentage}%</div>
              <p className="text-xl font-bold text-[#18181b]">
                {score}/{ASSESSMENT_QUESTIONS.length} correct
              </p>
              <p className="text-lg text-[#71717a] mt-4">Niveau: <strong>{level}</strong></p>
            </div>

            <div className="bg-[#f5f3f0] rounded-lg p-6 text-left text-sm text-[#71717a] mb-6">
              <p className="font-bold text-[#18181b] mb-2">Aanbevelingen:</p>
              {level === 'Beginner' && (
                <ul className="space-y-1">
                  <li>• Start met de basis - veel review nodig</li>
                  <li>• 20 nieuwe kaarten per dag</li>
                  <li>• 40% quiz, 35% flashcards, 25% notes</li>
                </ul>
              )}
              {level === 'Intermediate' && (
                <ul className="space-y-1">
                  <li>• Mix van herhaling en nieuw leren</li>
                  <li>• 15 nieuwe kaarten per dag</li>
                  <li>• Balanced mix van tools</li>
                </ul>
              )}
              {level === 'Advanced' && (
                <ul className="space-y-1">
                  <li>• Focus op dieping en applicatie</li>
                  <li>• 10 nieuwe kaarten per dag</li>
                  <li>• 30% quiz, 20% flashcards, 50% intensive notes</li>
                </ul>
              )}
            </div>

            <Button
              onClick={() => router.push('/studyset')}
              className="w-full bg-[#6b7c4e] hover:bg-[#4f5d3a] text-white py-3 font-bold flex items-center justify-center gap-2"
            >
              Maak mijn AI-gegenereerde studyset
              <ChevronRight className="h-4 w-4" />
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
        <h1 className="text-2xl font-bold">AI Assessment</h1>
        <p className="mt-1 text-sm text-[#71717a]">Vraag {currentQuestion + 1} / {ASSESSMENT_QUESTIONS.length}</p>
        <div className="mt-4 h-1 bg-[#e4e4e7] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#6b7c4e]"
            style={{ width: `${((currentQuestion + 1) / ASSESSMENT_QUESTIONS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* CONTENT */}
      <div className="mx-auto max-w-2xl px-8 py-12 flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="w-full">
          <h2 className="text-2xl font-bold text-[#18181b] mb-8">{question.q}</h2>

          <div className="space-y-3">
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => handleAnswer(opt)}
                className="w-full px-6 py-4 bg-white border-2 border-[#e4e4e7] rounded-lg hover:border-[#6b7c4e] hover:shadow-md transition text-left font-medium text-[#18181b]"
              >
                {opt}. [antwoord]
              </button>
            ))}
          </div>

          <p className="mt-8 text-xs text-[#71717a] text-center">
            Score: {answers.length > 0 ? `${score}/${answers.length}` : '0/0'}
          </p>
        </div>
      </div>
    </div>
  );
}
