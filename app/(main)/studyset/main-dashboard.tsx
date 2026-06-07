'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  BarChart3,
  Eye,
  Archive,
  Settings,
  Share2,
  Trash2,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Studyset, TodayTask } from './types';

// Mock data
const MOCK_STUDYSETS: Studyset[] = [
  {
    id: '1',
    userId: 'user1',
    name: 'Biologie H4-H6',
    subject: 'Biologie',
    status: 'active',
    color: '#9d7eb8',
    createdAt: new Date('2026-05-15'),
    updatedAt: new Date('2026-06-07'),
    examDate: new Date('2026-06-19'),
    studyDays: ['ma', 'di', 'do', 'za'],
    uploadType: 'agenda',
    sources: [],
    settings: {
      groundingOnly: true,
      showCitations: true,
      confidenceIndicator: false,
      outputDepth: 'gemiddeld',
      difficulty: 'examen',
      outputLanguage: 'nl',
      tone: 'tutor',
      doelgroep: 'middelbaar',
      voorbeelden: true,
      formaliteit: 'standaard',
      newCardsPerDay: 15,
      srsAlgorithm: 'sm2',
      dailyLimit: 30,
      folder: 'School',
      tags: ['SO', 'Biologie'],
      isPinned: true,
      darkMode: false,
      textSize: 'normaal',
      offlineMode: false,
      exportFormats: [],
      allowCollaboration: false,
      autoSync: true,
      autoBackup: true,
    },
    totalCards: 86,
    completedCards: 54,
    currentStreak: 12,
    longestStreak: 12,
    avgRetention: 82,
    lastStudiedAt: new Date(),
    shareType: 'privé',
  },
  {
    id: '2',
    userId: 'user1',
    name: 'Frans Woordjes',
    subject: 'Frans',
    status: 'active',
    color: '#87ceeb',
    createdAt: new Date('2026-05-20'),
    updatedAt: new Date('2026-06-07'),
    studyDays: ['ma', 'wo', 'vr'],
    uploadType: 'subject',
    sources: [],
    settings: {
      groundingOnly: true,
      showCitations: false,
      confidenceIndicator: false,
      outputDepth: 'kort',
      difficulty: 'gemiddeld',
      outputLanguage: 'nl',
      tone: 'samenvatting',
      doelgroep: 'middelbaar',
      voorbeelden: false,
      formaliteit: 'beknopt',
      newCardsPerDay: 20,
      srsAlgorithm: 'sm2',
      dailyLimit: 40,
      folder: 'School',
      tags: ['Frans', 'Vocabulaire'],
      isPinned: false,
      darkMode: false,
      textSize: 'normaal',
      offlineMode: false,
      exportFormats: [],
      allowCollaboration: false,
      autoSync: true,
      autoBackup: true,
    },
    totalCards: 42,
    completedCards: 38,
    currentStreak: 8,
    longestStreak: 14,
    avgRetention: 71,
    lastStudiedAt: new Date(),
    shareType: 'privé',
  },
  {
    id: '3',
    userId: 'user1',
    name: 'Wiskunde Integralen',
    subject: 'Wiskunde',
    status: 'active',
    color: '#f7b731',
    createdAt: new Date('2026-04-10'),
    updatedAt: new Date('2026-06-05'),
    studyDays: ['di', 'do', 'za'],
    uploadType: 'custom',
    sources: [],
    settings: {
      groundingOnly: true,
      showCitations: true,
      confidenceIndicator: true,
      outputDepth: 'uitgebreid',
      difficulty: 'examen',
      outputLanguage: 'nl',
      tone: 'tutor',
      doelgroep: 'middelbaar',
      voorbeelden: true,
      formaliteit: 'standaard',
      newCardsPerDay: 10,
      srsAlgorithm: 'sm2',
      dailyLimit: 25,
      folder: 'School',
      tags: ['Wiskunde', 'Examen'],
      isPinned: false,
      darkMode: false,
      textSize: 'normaal',
      offlineMode: false,
      exportFormats: [],
      allowCollaboration: false,
      autoSync: true,
      autoBackup: true,
    },
    totalCards: 156,
    completedCards: 92,
    currentStreak: 5,
    longestStreak: 18,
    avgRetention: 68,
    lastStudiedAt: new Date(),
    shareType: 'privé',
  },
];

const MOCK_ARCHIVED: Studyset[] = [
  {
    id: '4',
    userId: 'user1',
    name: 'Nederlands Oudheid',
    subject: 'Nederlands',
    status: 'archived',
    color: '#5ed4b8',
    createdAt: new Date('2026-02-01'),
    updatedAt: new Date('2026-05-15'),
    studyDays: [],
    uploadType: 'custom',
    sources: [],
    settings: {
      groundingOnly: true,
      showCitations: false,
      confidenceIndicator: false,
      outputDepth: 'gemiddeld',
      difficulty: 'gemiddeld',
      outputLanguage: 'nl',
      tone: 'samenvatting',
      doelgroep: 'middelbaar',
      voorbeelden: false,
      formaliteit: 'beknopt',
      newCardsPerDay: 5,
      srsAlgorithm: 'sm2',
      dailyLimit: 15,
      folder: 'School',
      tags: ['Nederlands'],
      isPinned: false,
      darkMode: false,
      textSize: 'normaal',
      offlineMode: false,
      exportFormats: [],
      allowCollaboration: false,
      autoSync: true,
      autoBackup: true,
    },
    totalCards: 28,
    completedCards: 28,
    currentStreak: 0,
    longestStreak: 7,
    avgRetention: 95,
    lastStudiedAt: new Date('2026-05-15'),
    shareType: 'privé',
  },
];

type ViewType = 'dashboard' | 'today' | 'all';

export default function MainDashboard() {
  const router = useRouter();
  const [view, setView] = useState<ViewType>('dashboard');
  const [search, setSearch] = useState('');

  const allStudysets = [...MOCK_STUDYSETS, ...MOCK_ARCHIVED];
  const activeStudysets = MOCK_STUDYSETS;
  const archivedStudysets = MOCK_ARCHIVED;

  const filteredStudysets = allStudysets.filter((set) =>
    set.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-[#faf9f7]">
      {/* SIDEBAR - Analytics */}
      <div className="w-72 border-r border-[#e4e4e7] bg-white p-6 flex flex-col">
        <h2 className="text-lg font-bold text-[#18181b] mb-6">Analytics</h2>

        {/* Summary stats */}
        <div className="space-y-4 mb-8 pb-8 border-b border-[#e4e4e7]">
          <div>
            <p className="text-xs text-[#71717a] font-medium">TOTAAL KAARTEN</p>
            <p className="text-3xl font-bold text-[#6b7c4e]">
              {MOCK_STUDYSETS.reduce((sum, set) => sum + set.totalCards, 0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#71717a] font-medium">GEM. RETENTIE</p>
            <p className="text-3xl font-bold text-[#6b7c4e]">
              {Math.round(
                MOCK_STUDYSETS.reduce((sum, set) => sum + set.avgRetention, 0) /
                  MOCK_STUDYSETS.length
              )}
              %
            </p>
          </div>
          <div>
            <p className="text-xs text-[#71717a] font-medium">ACTIEVE SETS</p>
            <p className="text-3xl font-bold text-[#6b7c4e]">
              {activeStudysets.length}
            </p>
          </div>
        </div>

        {/* Studysets in sidebar */}
        <div>
          <h3 className="text-sm font-bold text-[#18181b] mb-4">Jouw Sets</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {activeStudysets.map((set) => (
              <button
                key={set.id}
                onClick={() => router.push(`/studyset/${set.id}`)}
                className="w-full text-left p-3 rounded-lg bg-[#f5f3f0] hover:bg-[#e4e4e7] transition"
              >
                <div
                  className="h-2 w-full rounded-full mb-2"
                  style={{ backgroundColor: set.color }}
                />
                <p className="text-xs font-bold text-[#18181b]">{set.name}</p>
                <p className="text-xs text-[#71717a] mt-1">
                  {set.avgRetention}% retentie
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col">
        {/* HEADER */}
        <div className="border-b border-[#e4e4e7] bg-white px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-[#18181b]">Studysets</h1>
            <Button
              onClick={() => router.push('/studyset/create/primary')}
              className="bg-[#6b7c4e] hover:bg-[#4f5d3a] text-white flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Nieuw
            </Button>
          </div>

          {/* TABS */}
          <div className="flex gap-4 border-b border-[#e4e4e7]">
            {(['dashboard', 'today', 'all'] as ViewType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setView(tab)}
                className={`px-4 py-3 font-medium text-sm transition border-b-2 ${
                  view === tab
                    ? 'border-[#6b7c4e] text-[#6b7c4e]'
                    : 'border-transparent text-[#71717a] hover:text-[#18181b]'
                }`}
              >
                {tab === 'dashboard' && '📊 Dashboard'}
                {tab === 'today' && '📅 Vandaag'}
                {tab === 'all' && '📚 Alles'}
              </button>
            ))}
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 px-8 py-8 overflow-y-auto">
          {/* DASHBOARD VIEW */}
          {view === 'dashboard' && (
            <div className="space-y-12">
              {/* Planned for Today */}
              <div>
                <h2 className="text-2xl font-bold text-[#18181b] mb-6">
                  📅 Gepland voor vandaag
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeStudysets.slice(0, 2).map((set) => (
                    <div
                      key={set.id}
                      className="bg-white rounded-lg border border-[#e4e4e7] p-6"
                    >
                      <div
                        className="h-1 w-16 rounded-full mb-4"
                        style={{ backgroundColor: set.color }}
                      />
                      <h3 className="font-bold text-[#18181b]">{set.name}</h3>
                      <div className="mt-4 space-y-2 text-sm text-[#71717a]">
                        <p>
                          {set.totalCards - set.completedCards} kaarten nog te doen
                        </p>
                        <p>Voortgang: {Math.round((set.completedCards / set.totalCards) * 100)}%</p>
                      </div>
                      <Link
                        href={`/studyset/${set.id}/analytics`}
                        className="text-sm text-[#6b7c4e] hover:underline mt-4 inline-block"
                      >
                        → Analytics bekijken
                      </Link>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Studysets */}
              <div>
                <h2 className="text-2xl font-bold text-[#18181b] mb-6">
                  ✅ Actieve Studysets
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeStudysets.map((set) => (
                    <div
                      key={set.id}
                      className="bg-white rounded-lg border border-[#e4e4e7] p-6 hover:shadow-md transition"
                    >
                      <div
                        className="h-3 w-full rounded-full mb-4 bg-[#e4e4e7] overflow-hidden"
                        style={{
                          backgroundColor: `${set.color}22`,
                          border: `1px solid ${set.color}`,
                        }}
                      >
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${(set.completedCards / set.totalCards) * 100}%`,
                            backgroundColor: set.color,
                          }}
                        />
                      </div>

                      <h3 className="font-bold text-[#18181b] mb-2">{set.name}</h3>
                      <div className="text-xs text-[#71717a] space-y-1 mb-4">
                        <p>
                          {set.completedCards}/{set.totalCards} kaarten
                        </p>
                        <p>Streak: {set.currentStreak} dagen</p>
                        <p>Retentie: {set.avgRetention}%</p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/studyset/${set.id}/study`)}
                          className="flex-1 text-xs h-8"
                        >
                          Study
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                        >
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Archived */}
              {archivedStudysets.length > 0 && (
                <div>
                  <h2 className="text-lg font-bold text-[#18181b] mb-4 opacity-50">
                    🗂️ Gearchiveerde Sets
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 opacity-50">
                    {archivedStudysets.map((set) => (
                      <div
                        key={set.id}
                        className="bg-white rounded-lg border border-[#e4e4e7] p-4"
                      >
                        <p className="text-sm font-medium text-[#18181b]">
                          {set.name}
                        </p>
                        <p className="text-xs text-[#71717a] mt-1">
                          {set.totalCards} kaarten
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TODAY VIEW */}
          {view === 'today' && (
            <div>
              <h2 className="text-2xl font-bold text-[#18181b] mb-6">
                Alles voor vandaag
              </h2>
              <div className="space-y-3">
                {activeStudysets.map((set) => (
                  <div
                    key={set.id}
                    className="bg-white rounded-lg border border-[#e4e4e7] p-4 flex items-center gap-4 hover:shadow-md transition"
                  >
                    <div
                      className="h-12 w-12 rounded-lg flex items-center justify-center text-lg font-bold"
                      style={{ backgroundColor: `${set.color}33`, color: set.color }}
                    >
                      {set.name.substring(0, 1)}
                    </div>

                    <div className="flex-1">
                      <h3 className="font-bold text-[#18181b]">{set.name}</h3>
                      <p className="text-sm text-[#71717a]">
                        {set.totalCards - set.completedCards} kaarten voor vandaag
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-bold text-[#18181b]">
                        {Math.round((set.completedCards / set.totalCards) * 100)}%
                      </p>
                      <p className="text-xs text-[#71717a]">klaar</p>
                    </div>

                    <Link
                      href={`/studyset/${set.id}/analytics`}
                      className="text-[#6b7c4e] hover:text-[#4f5d3a]"
                    >
                      <BarChart3 className="h-5 w-5" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ALL VIEW */}
          {view === 'all' && (
            <div>
              <div className="mb-6 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-[#71717a]" />
                <input
                  type="text"
                  placeholder="Zoeken..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-[#e4e4e7] focus:outline-none focus:border-[#6b7c4e]"
                />
              </div>

              <div className="space-y-2">
                {filteredStudysets.map((set) => (
                  <div
                    key={set.id}
                    className="bg-white rounded-lg border border-[#e4e4e7] p-4 flex items-center justify-between hover:shadow-md transition"
                  >
                    <div>
                      <h3 className="font-bold text-[#18181b]">{set.name}</h3>
                      <p className="text-sm text-[#71717a]">
                        {set.totalCards} kaarten •{' '}
                        {set.status === 'active' ? '✅ Actief' : '🗂️ Gearchiveerd'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => router.push(`/studyset/${set.id}`)}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
