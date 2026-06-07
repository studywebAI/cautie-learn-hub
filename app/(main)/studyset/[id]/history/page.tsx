'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Check, X } from 'lucide-react';
import { ChangeLog, AIRecommendation } from '../../types';

const MOCK_CHANGES: ChangeLog[] = [
  {
    id: '1',
    studysetId: '1',
    timestamp: new Date('2026-06-07T14:30:00'),
    userId: 'user1',
    field: 'difficulty',
    before: 'basis',
    after: 'examen',
    changeType: 'edit',
  },
  {
    id: '2',
    studysetId: '1',
    timestamp: new Date('2026-06-06T10:15:00'),
    userId: 'user1',
    field: 'newCardsPerDay',
    before: 10,
    after: 15,
    changeType: 'edit',
  },
  {
    id: '3',
    studysetId: '1',
    timestamp: new Date('2026-06-05T09:00:00'),
    userId: 'system',
    field: 'outputDepth',
    before: 'kort',
    after: 'gemiddeld',
    changeType: 'ai-suggestion',
  },
];

const MOCK_RECOMMENDATIONS: AIRecommendation[] = [
  {
    id: '1',
    studysetId: '1',
    type: 'difficulty',
    title: 'Verhoog moeilijkheid',
    description:
      'Je retentie is hoger dan 85%. Probeer het niveau te verhogen naar Examen-niveau.',
    suggestedAction: 'Difficulty → Examen',
    priority: 'high',
    createdAt: new Date(),
    applied: false,
  },
  {
    id: '2',
    studysetId: '1',
    type: 'focus',
    title: 'Focus op zwakke punten',
    description:
      'Je scoort laag op: Celstructuur, Mitose. Focus hier eerst.',
    suggestedAction: 'Filter → Celstructuur, Mitose',
    priority: 'high',
    createdAt: new Date(),
    applied: false,
  },
  {
    id: '3',
    studysetId: '1',
    type: 'schedule',
    title: 'Optimale studiedag',
    description:
      'Op basis van je activiteitspatroon: 20-min sessies werken beter voor jou.',
    suggestedAction: 'Sessie-limiet → 20 minuten',
    priority: 'medium',
    createdAt: new Date(),
    applied: false,
  },
];

export default function HistoryPage({ params }: { params: { id: string } }) {
  const [recommendations, setRecommendations] =
    useState<AIRecommendation[]>(MOCK_RECOMMENDATIONS);

  const handleApply = (id: string) => {
    setRecommendations((prev) =>
      prev.map((rec) => (rec.id === id ? { ...rec, applied: true } : rec))
    );
  };

  const handleReject = (id: string) => {
    setRecommendations((prev) => prev.filter((rec) => rec.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      {/* HEADER */}
      <div className="border-b border-[#e4e4e7] bg-white px-8 py-6">
        <Link
          href={`/studyset/${params.id}`}
          className="inline-flex items-center gap-2 text-[#6b7c4e] hover:text-[#4f5d3a] mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          Terug
        </Link>
        <h1 className="text-3xl font-bold text-[#18181b]">
          Wijzigingsgeschiedenis
        </h1>
        <p className="text-sm text-[#71717a] mt-2">
          Alle wijzigingen en AI-suggesties
        </p>
      </div>

      {/* CONTENT */}
      <div className="mx-auto max-w-3xl px-8 py-8 space-y-12">
        {/* AI RECOMMENDATIONS */}
        <div>
          <h2 className="text-2xl font-bold text-[#18181b] mb-6">
            🤖 AI Suggesties
          </h2>

          {recommendations.length === 0 ? (
            <p className="text-sm text-[#71717a]">
              Geen openstaande suggesties
            </p>
          ) : (
            <div className="space-y-4">
              {recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className={`rounded-lg border p-6 ${
                    rec.applied
                      ? 'bg-[#e8f5e9] border-[#4caf50]'
                      : 'bg-white border-[#e4e4e7]'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-[#18181b]">
                          {rec.title}
                        </h3>
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${
                            rec.priority === 'high'
                              ? 'bg-[#ffebee] text-[#c62828]'
                              : 'bg-[#fff3e0] text-[#e65100]'
                          }`}
                        >
                          {rec.priority === 'high' ? 'URGENT' : 'Suggestie'}
                        </span>
                      </div>
                      <p className="text-sm text-[#71717a] mt-2">
                        {rec.description}
                      </p>
                      <code className="text-xs bg-[#f5f3f0] text-[#6b7c4e] mt-3 inline-block px-3 py-1 rounded-lg">
                        {rec.suggestedAction}
                      </code>
                    </div>

                    {!rec.applied && (
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          onClick={() => handleApply(rec.id)}
                          className="bg-[#4caf50] hover:bg-[#388e3c] text-white flex items-center gap-1"
                        >
                          <Check className="h-4 w-4" />
                          Toepassen
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(rec.id)}
                          className="flex items-center gap-1"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    {rec.applied && (
                      <div className="flex items-center gap-2 text-[#4caf50] font-medium text-sm">
                        <Check className="h-4 w-4" />
                        Toegepast
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CHANGE LOG */}
        <div>
          <h2 className="text-2xl font-bold text-[#18181b] mb-6">
            📜 Wijzigingslog
          </h2>

          <div className="space-y-4">
            {MOCK_CHANGES.map((change) => (
              <div
                key={change.id}
                className="bg-white rounded-lg border border-[#e4e4e7] p-6"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm text-[#71717a]">
                      {change.timestamp.toLocaleDateString('nl-NL', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <h3 className="font-bold text-[#18181b] mt-1">
                      {change.field}
                    </h3>
                  </div>

                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      change.changeType === 'edit'
                        ? 'bg-[#e3f2fd] text-[#1565c0]'
                        : 'bg-[#f3e5f5] text-[#6a1b9a]'
                    }`}
                  >
                    {change.changeType === 'edit' ? 'Handmatig' : 'AI-suggestie'}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-4 text-sm">
                  <div>
                    <p className="text-xs text-[#71717a]">Voor:</p>
                    <code className="bg-[#ffebee] text-[#c62828] px-2 py-1 rounded text-xs">
                      {String(change.before)}
                    </code>
                  </div>

                  <div className="text-[#71717a]">→</div>

                  <div>
                    <p className="text-xs text-[#71717a]">Na:</p>
                    <code className="bg-[#e8f5e9] text-[#2e7d32] px-2 py-1 rounded text-xs">
                      {String(change.after)}
                    </code>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ROLLBACK SECTION */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-bold text-blue-900 mb-2">
            Naar vorige versie terugkeren?
          </h3>
          <p className="text-sm text-blue-800 mb-4">
            Je kunt teruggaan naar een eerdere versie van deze studyset. Alle
            wijzigingen daarna worden ongedaan gemaakt.
          </p>
          <Button variant="outline" className="border-blue-300 text-blue-900">
            Kies versie
          </Button>
        </div>
      </div>
    </div>
  );
}
