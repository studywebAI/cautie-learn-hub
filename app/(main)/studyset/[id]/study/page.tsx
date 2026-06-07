'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Volume2, RotateCcw } from 'lucide-react';
import { StudyCard } from '../../types';

const MOCK_CARDS: StudyCard[] = [
  {
    id: '1',
    studysetId: '1',
    type: 'flashcard',
    front: 'Wat is de primaire functie van de celplasma?',
    back: 'De celplasma is het vloeibare deel van de cel waarin organellen zijn opgehangen. Het bevat alle chemicaliën nodig voor de celprocessen.',
    difficulty: 2,
    tags: ['Celstructuur', 'Belangrijkste'],
    createdAt: new Date(),
    updatedAt: new Date(),
    interval: 3,
    easeFactor: 2.0,
    repetitions: 5,
    nextReviewDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    views: 8,
    correctCount: 6,
    incorrectCount: 2,
    lastReviewedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
  {
    id: '2',
    studysetId: '1',
    type: 'flashcard',
    front: 'Verschil tussen mitose en meiose',
    back: 'Mitose: 1 cel → 2 identieke dochter-cellen (somatisch). Meiose: 1 cel → 4 geslachtscellen met halve chromosomen (geslachtsvoortplanting).',
    difficulty: 4,
    tags: ['Celdeling', 'Zwak'],
    createdAt: new Date(),
    updatedAt: new Date(),
    interval: 1,
    easeFactor: 1.8,
    repetitions: 2,
    nextReviewDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    views: 5,
    correctCount: 1,
    incorrectCount: 4,
  },
];

type SRSResponse = 'again' | 'hard' | 'good' | 'easy';

export default function StudyPage({ params }: { params: { id: string } }) {
  const [cards, setCards] = useState<StudyCard[]>(MOCK_CARDS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0 });

  const currentCard = cards[currentIndex];
  const totalCards = cards.length;
  const progress = Math.round(((currentIndex + 1) / totalCards) * 100);

  const handleResponse = (response: SRSResponse) => {
    // Update card based on SRS algorithm
    console.log(`Card ${currentCard.id}: ${response}`);

    if (response === 'again' || response === 'hard') {
      setSessionStats({ ...sessionStats, total: sessionStats.total + 1 });
    } else {
      setSessionStats({ ...sessionStats, correct: sessionStats.total + 1, total: sessionStats.total + 1 });
    }

    // Move to next card
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setFlipped(false);
    } else {
      // Session finished
      console.log('Session finished!');
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      {/* HEADER */}
      <div className="border-b border-[#e4e4e7] bg-white px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <Link href={`/studyset/${params.id}`} className="inline-flex items-center gap-2 text-[#6b7c4e] hover:text-[#4f5d3a]">
          <ChevronLeft className="h-4 w-4" />
          Terug
        </Link>

        <div className="flex-1 mx-8">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold uppercase text-[#71717a]">Voortgang</p>
            <p className="text-xs font-bold text-[#6b7c4e]">{currentIndex + 1} / {totalCards}</p>
          </div>
          <div className="h-2 bg-[#e4e4e7] rounded-full overflow-hidden">
            <div className="h-full bg-[#6b7c4e]" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="text-right">
          <p className="text-xs font-bold uppercase text-[#71717a]">Goed</p>
          <p className="text-sm font-bold text-[#6b7c4e]">{sessionStats.correct}/{sessionStats.total}</p>
        </div>
      </div>

      {/* STUDY AREA */}
      <div className="mx-auto max-w-2xl px-8 py-12 min-h-[calc(100vh-200px)] flex flex-col items-center justify-center">
        {/* CARD */}
        <div
          onClick={() => setFlipped(!flipped)}
          className="w-full max-w-md h-80 bg-white border-2 border-[#e4e4e7] rounded-xl p-8 cursor-pointer transition-all hover:shadow-lg flex items-center justify-center text-center"
        >
          <div>
            <p className="text-xs font-bold uppercase text-[#71717a] mb-4">
              {flipped ? 'Antwoord' : 'Vraag'}
            </p>
            <p className="text-xl font-semibold text-[#18181b] leading-relaxed">
              {flipped ? currentCard.back : currentCard.front}
            </p>
            <p className="text-xs text-[#71717a] mt-8">Klik om om te slaan</p>
          </div>
        </div>

        {/* TAGS */}
        <div className="mt-8 flex gap-2 flex-wrap justify-center">
          {currentCard.tags.map((tag) => (
            <span key={tag} className="px-2 py-1 rounded-full bg-[#e4e4e7] text-xs text-[#71717a]">
              #{tag}
            </span>
          ))}
        </div>

        {/* SRS BUTTONS */}
        {flipped && (
          <div className="mt-12 flex gap-3 flex-wrap justify-center w-full">
            <button
              onClick={() => handleResponse('again')}
              className="px-6 py-3 bg-red-100 text-red-700 rounded-lg font-bold hover:bg-red-200 transition flex items-center gap-2"
            >
              ❌ Again
              <span className="text-xs font-normal">(1d)</span>
            </button>

            <button
              onClick={() => handleResponse('hard')}
              className="px-6 py-3 bg-orange-100 text-orange-700 rounded-lg font-bold hover:bg-orange-200 transition flex items-center gap-2"
            >
              🔴 Hard
              <span className="text-xs font-normal">(3d)</span>
            </button>

            <button
              onClick={() => handleResponse('good')}
              className="px-6 py-3 bg-blue-100 text-blue-700 rounded-lg font-bold hover:bg-blue-200 transition flex items-center gap-2"
            >
              🟡 Good
              <span className="text-xs font-normal">(10d)</span>
            </button>

            <button
              onClick={() => handleResponse('easy')}
              className="px-6 py-3 bg-green-100 text-green-700 rounded-lg font-bold hover:bg-green-200 transition flex items-center gap-2"
            >
              ✅ Easy
              <span className="text-xs font-normal">(20d)</span>
            </button>
          </div>
        )}

        {/* INFO */}
        <div className="mt-12 text-center">
          <p className="text-xs text-[#71717a]">
            Moeilijkheid: <span className="font-bold text-[#18181b]">{currentCard.difficulty}/5</span>
          </p>
          <p className="text-xs text-[#71717a] mt-1">
            Deze sessie telt 1/2 kaarten per dag
          </p>
        </div>
      </div>

      {/* FOOTER */}
      <div className="border-t border-[#e4e4e7] bg-white px-8 py-4 flex justify-between">
        <button className="px-4 py-2 border border-[#e4e4e7] rounded-lg hover:bg-[#f5f3f0] flex items-center gap-2">
          <Volume2 className="h-4 w-4" />
          Luister
        </button>
        <button className="px-4 py-2 border border-[#e4e4e7] rounded-lg hover:bg-[#f5f3f0] flex items-center gap-2">
          <RotateCcw className="h-4 w-4" />
          Reset Sessie
        </button>
      </div>
    </div>
  );
}
