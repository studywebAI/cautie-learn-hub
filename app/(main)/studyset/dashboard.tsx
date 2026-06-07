'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  BookOpen, Plus, TrendingUp, Zap, BarChart3, ChevronDown,
  Archive, Eye, Edit, Trash2, Share2, Clock
} from 'lucide-react';
import { Studyset, DashboardData, TodayTask } from './types';

// Mock data — replace with real API
const MOCK_DATA: DashboardData = {
  totalCards: 351,
  avgRetention: 74,
  activeSetCount: 4,
  archivedSetCount: 2,
  activeStudysets: [
    {
      id: '1',
      userId: 'user1',
      name: 'Biologie H4-H6 Celbiologie',
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
      name: 'Wiskunde B Integralen',
      subject: 'Wiskunde',
      status: 'active',
      color: '#f7b731',
      createdAt: new Date('2026-05-10'),
      updatedAt: new Date('2026-06-06'),
      examDate: new Date('2026-06-25'),
      studyDays: ['di', 'do', 'za'],
      uploadType: 'custom',
      sources: [],
      settings: {
        groundingOnly: false,
        showCitations: true,
        confidenceIndicator: true,
        outputDepth: 'uitgebreid',
        difficulty: 'examen',
        outputLanguage: 'nl',
        tone: 'trainer',
        doelgroep: 'middelbaar',
        voorbeelden: true,
        formaliteit: 'standaard',
        newCardsPerDay: 10,
        srsAlgorithm: 'sm2',
        dailyLimit: 25,
        folder: 'School',
        tags: ['Wiskunde', 'Calculus'],
        isPinned: false,
        darkMode: false,
        textSize: 'normaal',
        offlineMode: false,
        exportFormats: ['anki', 'csv'],
        allowCollaboration: false,
        autoSync: true,
        autoBackup: true,
      },
      totalCards: 156,
      completedCards: 98,
      currentStreak: 5,
      longestStreak: 9,
      avgRetention: 65,
      lastStudiedAt: new Date('2026-06-06'),
      shareType: 'privé',
    },
    {
      id: '4',
      userId: 'user1',
      name: 'Geschiedenis Koude Oorlog',
      subject: 'Geschiedenis',
      status: 'active',
      color: '#5ed4b8',
      createdAt: new Date('2026-05-25'),
      updatedAt: new Date('2026-06-05'),
      studyDays: ['ma', 'vr'],
      uploadType: 'agenda',
      sources: [],
      settings: {
        groundingOnly: true,
        showCitations: true,
        confidenceIndicator: false,
        outputDepth: 'gemiddeld',
        difficulty: 'gemiddeld',
        outputLanguage: 'nl',
        tone: 'tutor',
        doelgroep: 'middelbaar',
        voorbeelden: true,
        formaliteit: 'standaard',
        newCardsPerDay: 12,
        srsAlgorithm: 'sm2',
        dailyLimit: 28,
        folder: 'School',
        tags: ['Geschiedenis', 'Werkstuk'],
        isPinned: false,
        darkMode: false,
        textSize: 'normaal',
        offlineMode: false,
        exportFormats: [],
        allowCollaboration: false,
        autoSync: true,
        autoBackup: true,
      },
      totalCards: 67,
      completedCards: 21,
      currentStreak: 3,
      longestStreak: 7,
      avgRetention: 53,
      lastStudiedAt: new Date('2026-06-04'),
      shareType: 'privé',
    },
  ],
  todayTasks: [
    {
      studyset: {
        id: '1',
        userId: 'user1',
        name: 'Biologie H4-H6',
        subject: 'Biologie',
        status: 'active',
        color: '#9d7eb8',
        createdAt: new Date(),
        updatedAt: new Date(),
        studyDays: [],
        uploadType: 'agenda',
        sources: [],
        settings: {} as any,
        totalCards: 86,
        completedCards: 54,
        currentStreak: 12,
        longestStreak: 12,
        avgRetention: 82,
        shareType: 'privé',
      },
      cardsToReview: 12,
      totalCards: 86,
      percentComplete: 65,
      color: '#9d7eb8',
    },
    {
      studyset: {
        id: '2',
        userId: 'user1',
        name: 'Frans Woordjes',
        subject: 'Frans',
        status: 'active',
        color: '#87ceeb',
        createdAt: new Date(),
        updatedAt: new Date(),
        studyDays: [],
        uploadType: 'subject',
        sources: [],
        settings: {} as any,
        totalCards: 42,
        completedCards: 38,
        currentStreak: 8,
        longestStreak: 14,
        avgRetention: 71,
        shareType: 'privé',
      },
      cardsToReview: 8,
      totalCards: 42,
      percentComplete: 100,
      color: '#87ceeb',
    },
    {
      studyset: {
        id: '3',
        userId: 'user1',
        name: 'Wiskunde B',
        subject: 'Wiskunde',
        status: 'active',
        color: '#f7b731',
        createdAt: new Date(),
        updatedAt: new Date(),
        studyDays: [],
        uploadType: 'custom',
        sources: [],
        settings: {} as any,
        totalCards: 156,
        completedCards: 98,
        currentStreak: 5,
        longestStreak: 9,
        avgRetention: 65,
        shareType: 'privé',
      },
      cardsToReview: 17,
      totalCards: 156,
      percentComplete: 30,
      color: '#f7b731',
    },
  ],
  analytics: [],
};

export default function StudysetDashboard() {
  const router = useRouter();
  const [view, setView] = useState<'dashboard' | 'today' | 'all'>('dashboard');
  const [data, setData] = useState<DashboardData>(MOCK_DATA);
  const [expandedArchived, setExpandedArchived] = useState(false);

  return (
    <div className="min-h-screen bg-[#faf9f7] flex">
      {/* SIDEBAR ANALYTICS */}
      <aside className="w-64 bg-white border-r border-[#e4e4e7] p-6 flex flex-col gap-6 sticky top-0 h-screen overflow-y-auto">
        <div>
          <h2 className="text-xs font-bold uppercase text-[#71717a] mb-4">Analytics</h2>
          <div className="space-y-3">
            <div className="bg-[#f5f3f0] p-3 rounded-lg">
              <div className="text-2xl font-bold text-[#6b7c4e]">{data.totalCards}</div>
              <div className="text-xs text-[#71717a] mt-1">Totale kaarten</div>
            </div>
            <div className="bg-[#f5f3f0] p-3 rounded-lg">
              <div className="text-2xl font-bold text-[#6b7c4e]">{data.avgRetention}%</div>
              <div className="text-xs text-[#71717a] mt-1">Gemiddelde retentie</div>
            </div>
            <div className="bg-[#f5f3f0] p-3 rounded-lg">
              <div className="text-2xl font-bold text-[#6b7c4e]">{data.activeSetCount}</div>
              <div className="text-xs text-[#71717a] mt-1">Actieve sets</div>
            </div>
          </div>
        </div>

        <div className="border-t border-[#e4e4e7] pt-4">
          <h2 className="text-xs font-bold uppercase text-[#71717a] mb-3">Navigation</h2>
          <div className="space-y-2">
            <button
              onClick={() => setView('dashboard')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition ${
                view === 'dashboard'
                  ? 'bg-[#6b7c4e] text-white'
                  : 'text-[#71717a] hover:bg-[#f5f3f0]'
              }`}
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => setView('today')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition ${
                view === 'today'
                  ? 'bg-[#6b7c4e] text-white'
                  : 'text-[#71717a] hover:bg-[#f5f3f0]'
              }`}
            >
              📅 Voor vandaag
            </button>
            <button
              onClick={() => setView('all')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition ${
                view === 'all'
                  ? 'bg-[#6b7c4e] text-white'
                  : 'text-[#71717a] hover:bg-[#f5f3f0]'
              }`}
            >
              📂 Alle sets
            </button>
          </div>
        </div>

        <div className="border-t border-[#e4e4e7] pt-4 mt-auto">
          <Button
            onClick={() => router.push('/studyset/create')}
            className="w-full bg-[#6b7c4e] hover:bg-[#4f5d3a] text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nieuwe Studyset
          </Button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto">
        {/* TOP BAR */}
        <div className="sticky top-0 z-30 border-b border-[#e4e4e7] bg-white px-8 py-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {view === 'dashboard' && '📊 Dashboard'}
                {view === 'today' && '📅 Voor vandaag'}
                {view === 'all' && '📂 Alle Studysets'}
              </h1>
              <p className="mt-1 text-sm text-[#71717a]">Je studeerprogress overzicht</p>
            </div>
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="p-8">
          {view === 'dashboard' && <DashboardView data={data} />}
          {view === 'today' && <TodayView tasks={data.todayTasks} />}
          {view === 'all' && <AllView studysets={data.activeStudysets} archivedCount={data.archivedSetCount} />}
        </div>
      </main>
    </div>
  );
}

function DashboardView({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-8 max-w-6xl">
      {/* TODAY SECTION */}
      <div>
        <h2 className="text-lg font-bold mb-4">📅 Voor vandaag ({data.todayTasks.length} sets)</h2>
        <div className="space-y-3">
          {data.todayTasks.length > 0 ? (
            data.todayTasks.map((task) => (
              <div
                key={task.studyset.id}
                className="bg-white border rounded-lg p-4 flex items-center justify-between"
                style={{ borderLeft: `6px solid ${task.color}` }}
              >
                <div className="flex-1">
                  <h3 className="font-bold text-[#18181b]">{task.studyset.name}</h3>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex-1 h-2 bg-[#e4e4e7] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#6b7c4e]"
                        style={{ width: `${task.percentComplete}%` }}
                      />
                    </div>
                    <span className="text-sm text-[#71717a] whitespace-nowrap">
                      {task.cardsToReview}/{task.totalCards}
                    </span>
                  </div>
                </div>
                <Link
                  href={`/studyset/${task.studyset.id}/study`}
                  className="ml-4 px-4 py-2 bg-[#6b7c4e] text-white text-sm font-semibold rounded-lg hover:bg-[#4f5d3a]"
                >
                  Start
                </Link>
              </div>
            ))
          ) : (
            <div className="bg-[#e8f5e9] p-6 rounded-lg text-center">
              <p className="font-semibold text-[#2e7d32]">Niets gepland voor vandaag 🎉</p>
            </div>
          )}
        </div>
      </div>

      {/* ACTIVE SETS */}
      <div>
        <h2 className="text-lg font-bold mb-4">🟢 Actieve Sets ({data.activeSetCount})</h2>
        <div className="grid grid-cols-2 gap-4">
          {data.activeStudysets.map((set) => (
            <Link
              key={set.id}
              href={`/studyset/${set.id}`}
              className="bg-white border border-[#e4e4e7] rounded-lg p-5 hover:border-[#6b7c4e] hover:shadow-md transition"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs font-bold uppercase text-[#6b7c4e]">{set.subject}</p>
                  <h3 className="font-bold text-[#18181b] mt-1">{set.name}</h3>
                </div>
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-[#6b7c4e] text-white">
                  {set.avgRetention}%
                </span>
              </div>

              <div className="flex items-center justify-between text-sm text-[#71717a] mb-3">
                <span>{set.totalCards} kaarten</span>
                <span>🔥 {set.currentStreak}</span>
              </div>

              <div className="h-1.5 bg-[#e4e4e7] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#6b7c4e]"
                  style={{ width: `${set.avgRetention}%` }}
                />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function TodayView({ tasks }: { tasks: TodayTask[] }) {
  return (
    <div className="space-y-3 max-w-2xl">
      {tasks.length > 0 ? (
        tasks.map((task) => (
          <div
            key={task.studyset.id}
            className="bg-white border rounded-lg p-5"
            style={{ borderLeft: `6px solid ${task.color}` }}
          >
            <h3 className="font-bold text-[#18181b] mb-3">{task.studyset.name}</h3>
            <div className="flex items-center gap-4 mb-3">
              <div className="flex-1">
                <div className="h-2 bg-[#e4e4e7] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#6b7c4e]"
                    style={{ width: `${task.percentComplete}%` }}
                  />
                </div>
              </div>
              <span className="text-sm text-[#71717a] whitespace-nowrap font-mono">
                {task.cardsToReview}/{task.totalCards}
              </span>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/studyset/${task.studyset.id}/study`}
                className="flex-1 px-4 py-2 bg-[#6b7c4e] text-white text-sm font-semibold rounded-lg hover:bg-[#4f5d3a]"
              >
                Start Studeren
              </Link>
              <Link
                href={`/studyset/${task.studyset.id}/analytics`}
                className="px-4 py-2 border border-[#e4e4e7] text-[#6b7c4e] text-sm font-semibold rounded-lg hover:bg-[#f5f3f0]"
              >
                Analytics
              </Link>
            </div>
          </div>
        ))
      ) : (
        <div className="bg-[#e8f5e9] p-8 rounded-lg text-center">
          <p className="font-bold text-[#2e7d32]">Je hebt alles vandaag al gedaan! 🎉</p>
          <p className="text-sm text-[#558b2f] mt-2">Goed gedaan met je studieplanning!</p>
        </div>
      )}
    </div>
  );
}

function AllView({ studysets, archivedCount }: { studysets: Studyset[]; archivedCount: number }) {
  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h2 className="text-lg font-bold mb-4">🟢 Actieve Sets</h2>
        <div className="grid grid-cols-3 gap-4">
          {studysets.map((set) => (
            <Link
              key={set.id}
              href={`/studyset/${set.id}`}
              className="bg-white border border-[#e4e4e7] rounded-lg p-4 hover:border-[#6b7c4e] hover:shadow-md transition"
            >
              <p className="text-xs font-bold uppercase text-[#6b7c4e]">{set.subject}</p>
              <h3 className="font-bold text-[#18181b] mt-1 line-clamp-2">{set.name}</h3>
              <p className="text-xs text-[#71717a] mt-2">{set.totalCards} kaarten • {set.avgRetention}% retentie</p>
            </Link>
          ))}
        </div>
      </div>

      {archivedCount > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-4">🔵 Gearchiveerd ({archivedCount})</h2>
          <p className="text-sm text-[#71717a]">Bekijk je gearchiveerde sets in het archief.</p>
        </div>
      )}
    </div>
  );
}
