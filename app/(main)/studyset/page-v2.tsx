'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { BookOpen, Plus, TrendingUp, Zap, BarChart3 } from 'lucide-react';
import Link from 'next/link';

// Mock data — replace with real API
const MOCK_STUDYSETS = [
  {
    id: '1',
    name: 'Biologie H4-H6',
    subject: 'Biologie',
    status: 'active',
    cards: 86,
    retention: 82,
    streak: 12,
    dueToday: 12,
    nextDueDate: '2026-06-19',
    color: '#9d7eb8', // lila paars
  },
  {
    id: '2',
    name: 'Frans Woordjes',
    subject: 'Frans',
    status: 'active',
    cards: 42,
    retention: 71,
    streak: 8,
    dueToday: 8,
    nextDueDate: '2026-06-18',
    color: '#87ceeb', // lichtblauw
  },
  {
    id: '3',
    name: 'Wiskunde B Integralen',
    subject: 'Wiskunde',
    status: 'active',
    cards: 156,
    retention: 65,
    streak: 5,
    dueToday: 17,
    nextDueDate: '2026-06-20',
    color: '#f7b731', // geel
  },
  {
    id: '4',
    name: 'Geschiedenis Koude Oorlog',
    subject: 'Geschiedenis',
    status: 'active',
    cards: 67,
    retention: 53,
    streak: 3,
    dueToday: 0,
    nextDueDate: '2026-06-22',
    color: '#5ed4b8', // groen-turquoise
  },
];

export default function StudysetPage() {
  const router = useRouter();
  const [view, setView] = useState<'dashboard' | 'today' | 'all'>('dashboard');

  const activeStudysets = MOCK_STUDYSETS.filter(s => s.status === 'active');
  const archivedCount = MOCK_STUDYSETS.filter(s => s.status === 'archived').length;
  const totalCards = MOCK_STUDYSETS.reduce((sum, s) => sum + s.cards, 0);
  const avgRetention = Math.round(
    MOCK_STUDYSETS.reduce((sum, s) => sum + s.retention, 0) / MOCK_STUDYSETS.length
  );

  // Today's tasks
  const todayTasks = activeStudysets
    .filter(s => s.dueToday > 0)
    .sort((a, b) => b.dueToday - a.dueToday);

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      {/* TOP BAR */}
      <div className="sticky top-0 z-40 border-b border-[#e4e4e7] bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Studysets</h1>
            <p className="mt-1 text-sm text-[#71717a]">Je leeroverzicht en voortgang</p>
          </div>
          <Button
            onClick={() => router.push('/studyset/create')}
            className="bg-[#6b7c4e] hover:bg-[#4f5d3a] text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nieuwe Studyset
          </Button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* QUICK STATS */}
        <div className="mb-8 grid grid-cols-4 gap-4">
          <div className="rounded-lg border border-[#e4e4e7] bg-white p-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[#6b7c4e]" />
              <p className="text-xs font-semibold uppercase text-[#71717a]">Totale kaarten</p>
            </div>
            <p className="mt-2 text-2xl font-bold">{totalCards}</p>
          </div>
          <div className="rounded-lg border border-[#e4e4e7] bg-white p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#6b7c4e]" />
              <p className="text-xs font-semibold uppercase text-[#71717a]">Gem. retentie</p>
            </div>
            <p className="mt-2 text-2xl font-bold">{avgRetention}%</p>
          </div>
          <div className="rounded-lg border border-[#e4e4e7] bg-white p-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-[#6b7c4e]" />
              <p className="text-xs font-semibold uppercase text-[#71717a]">Actieve sets</p>
            </div>
            <p className="mt-2 text-2xl font-bold">{activeStudysets.length}</p>
          </div>
          <div className="rounded-lg border border-[#e4e4e7] bg-white p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[#6b7c4e]" />
              <p className="text-xs font-semibold uppercase text-[#71717a]">Gearchiveerd</p>
            </div>
            <p className="mt-2 text-2xl font-bold">{archivedCount}</p>
          </div>
        </div>

        {/* VIEW TABS */}
        <div className="mb-6 flex gap-2 border-b border-[#e4e4e7]">
          {(['dashboard', 'today', 'all'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-2 text-sm font-semibold transition ${
                view === v
                  ? 'border-b-2 border-[#6b7c4e] text-[#6b7c4e]'
                  : 'text-[#71717a] hover:text-[#18181b]'
              }`}
            >
              {v === 'dashboard' && '📊 Dashboard'}
              {v === 'today' && '📅 Voor vandaag'}
              {v === 'all' && '📂 Alle sets'}
            </button>
          ))}
        </div>

        {/* DASHBOARD VIEW */}
        {view === 'dashboard' && (
          <div className="space-y-6">
            {/* TODAY SECTION */}
            <div>
              <h2 className="mb-4 text-lg font-bold">📅 Voor vandaag</h2>
              <div className="space-y-3">
                {todayTasks.length > 0 ? (
                  todayTasks.map((set) => (
                    <div
                      key={set.id}
                      className="rounded-lg border border-[#e4e4e7] bg-white p-4"
                      style={{ borderLeft: `4px solid ${set.color}` }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold">{set.name}</h3>
                          <div className="mt-2 flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-24 rounded-full bg-[#e4e4e7]">
                                <div
                                  className="h-1.5 rounded-full bg-[#6b7c4e]"
                                  style={{ width: `${Math.min(100, (set.dueToday / set.cards) * 100)}%` }}
                                />
                              </div>
                              <span className="text-[#71717a]">{set.dueToday} kaarten</span>
                            </div>
                          </div>
                        </div>
                        <Link
                          href={`/studyset/${set.id}/study`}
                          className="ml-4 rounded-lg bg-[#6b7c4e] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#4f5d3a]"
                        >
                          Start
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[#71717a]">Niets gepland voor vandaag 🎉</p>
                )}
              </div>
            </div>

            {/* ACTIVE SETS SECTION */}
            <div>
              <h2 className="mb-4 text-lg font-bold">🟢 Actieve Sets ({activeStudysets.length})</h2>
              <div className="grid grid-cols-2 gap-4">
                {activeStudysets.map((set) => (
                  <Link
                    key={set.id}
                    href={`/studyset/${set.id}`}
                    className="group rounded-lg border border-[#e4e4e7] bg-white p-4 transition hover:border-[#6b7c4e] hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-xs font-semibold uppercase text-[#6b7c4e]">{set.subject}</p>
                        <h3 className="mt-1 font-semibold group-hover:text-[#6b7c4e]">{set.name}</h3>
                      </div>
                      <span className="rounded-full bg-[#6b7c4e] px-2 py-1 text-xs font-bold text-white">
                        {set.retention}%
                      </span>
                    </div>

                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#71717a]">{set.cards} kaarten</span>
                        <span className="text-[#6b7c4e]">🔥 {set.streak}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#e4e4e7]">
                        <div
                          className="h-1.5 rounded-full bg-[#6b7c4e]"
                          style={{ width: `${set.retention}%` }}
                        />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TODAY VIEW */}
        {view === 'today' && (
          <div>
            <div className="space-y-3">
              {todayTasks.length > 0 ? (
                todayTasks.map((set) => (
                  <div
                    key={set.id}
                    className="rounded-lg border border-[#e4e4e7] bg-white p-4"
                    style={{ borderLeft: `6px solid ${set.color}` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-bold text-[#18181b]">{set.name}</h3>
                        <div className="mt-2 flex items-center gap-4">
                          <div className="flex flex-1 items-center gap-2">
                            <div className="h-1 flex-1 rounded-full bg-[#e4e4e7]">
                              <div
                                className="h-1 rounded-full bg-[#6b7c4e]"
                                style={{ width: `${Math.min(100, (set.dueToday / set.cards) * 100)}%` }}
                              />
                            </div>
                            <span className="text-sm text-[#71717a]">{set.dueToday}/{set.cards}</span>
                          </div>
                          <Link
                            href={`/studyset/${set.id}/analytics`}
                            className="text-xs font-semibold text-[#6b7c4e] hover:underline"
                          >
                            Analytics →
                          </Link>
                        </div>
                      </div>
                      <Link
                        href={`/studyset/${set.id}/study`}
                        className="ml-4 rounded-lg bg-[#6b7c4e] px-4 py-2 font-semibold text-white hover:bg-[#4f5d3a]"
                      >
                        Start
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-lg bg-[#e8f5e9] p-6 text-center">
                  <p className="text-lg font-semibold text-[#18181b]">Niets gepland voor vandaag!</p>
                  <p className="mt-2 text-sm text-[#71717a]">Je bent all caught up 🎉</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ALL VIEW */}
        {view === 'all' && (
          <div className="space-y-6">
            {/* Active */}
            <div>
              <h2 className="mb-4 text-lg font-bold">🟢 Actieve Sets</h2>
              <div className="grid grid-cols-3 gap-4">
                {activeStudysets.map((set) => (
                  <Link
                    key={set.id}
                    href={`/studyset/${set.id}`}
                    className="rounded-lg border border-[#e4e4e7] bg-white p-4 transition hover:border-[#6b7c4e] hover:shadow-md"
                  >
                    <p className="text-xs font-semibold uppercase text-[#6b7c4e]">{set.subject}</p>
                    <h3 className="mt-2 font-bold">{set.name}</h3>
                    <div className="mt-3 text-sm text-[#71717a]">
                      <p>{set.cards} kaarten • {set.retention}% retentie</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Archived */}
            {archivedCount > 0 && (
              <div>
                <h2 className="mb-4 text-lg font-bold">🔵 Gearchiveerd ({archivedCount})</h2>
                <p className="text-sm text-[#71717a]">Je gearchiveerde sets zijn hier beschikbaar</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
