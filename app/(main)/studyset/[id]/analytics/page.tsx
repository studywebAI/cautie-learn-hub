'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft, TrendingUp, Activity, Target, AlertCircle } from 'lucide-react';
import { StudysetAnalytics } from '../../types';

const MOCK_ANALYTICS: StudysetAnalytics = {
  id: '1',
  studysetId: '1',
  retentionPercentage: 82,
  weakPoints: ['Celdeling', 'Meiose', 'Chromosomen'],
  studyStreak: 12,
  totalMinutesSpent: 450,
  sessionsCompleted: 34,
  lastSessionDate: new Date(),
  averageResponseTime: 8.5,
  accuracyPercentage: 78,
  dailyGoal: 15,
  weeklyProgress: 87,
  heatmapData: [
    { date: '2026-06-01', count: 5 },
    { date: '2026-06-02', count: 12 },
    { date: '2026-06-03', count: 0 },
    { date: '2026-06-04', count: 18 },
    { date: '2026-06-05', count: 14 },
    { date: '2026-06-06', count: 16 },
    { date: '2026-06-07', count: 12 },
  ],
};

export default function AnalyticsPage({ params }: { params: { id: string } }) {
  const [analytics] = useState<StudysetAnalytics>(MOCK_ANALYTICS);

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      {/* HEADER */}
      <div className="border-b border-[#e4e4e7] bg-white px-8 py-6">
        <Link href={`/studyset/${params.id}`} className="inline-flex items-center gap-2 text-[#6b7c4e] hover:text-[#4f5d3a] mb-4">
          <ChevronLeft className="h-4 w-4" />
          Terug
        </Link>
        <h1 className="text-3xl font-bold">📊 Analytics</h1>
        <p className="mt-1 text-sm text-[#71717a]">Jouw voortgang en prestaties</p>
      </div>

      {/* CONTENT */}
      <div className="mx-auto max-w-4xl px-8 py-8 space-y-8">
        {/* STATS GRID */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white border border-[#e4e4e7] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-[#6b7c4e]" />
              <p className="text-xs font-bold uppercase text-[#71717a]">Retentie</p>
            </div>
            <p className="text-2xl font-bold text-[#6b7c4e]">{analytics.retentionPercentage}%</p>
          </div>

          <div className="bg-white border border-[#e4e4e7] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-[#6b7c4e]" />
              <p className="text-xs font-bold uppercase text-[#71717a]">Streak</p>
            </div>
            <p className="text-2xl font-bold text-[#6b7c4e]">🔥 {analytics.studyStreak}</p>
          </div>

          <div className="bg-white border border-[#e4e4e7] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-[#6b7c4e]" />
              <p className="text-xs font-bold uppercase text-[#71717a]">Sessies</p>
            </div>
            <p className="text-2xl font-bold text-[#6b7c4e]">{analytics.sessionsCompleted}</p>
          </div>

          <div className="bg-white border border-[#e4e4e7] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-[#6b7c4e]" />
              <p className="text-xs font-bold uppercase text-[#71717a]">Accuraatheid</p>
            </div>
            <p className="text-2xl font-bold text-[#6b7c4e]">{analytics.accuracyPercentage}%</p>
          </div>
        </div>

        {/* WEAK POINTS */}
        {analytics.weakPoints.length > 0 && (
          <div className="bg-[#fff3cd] border border-[#ffc107] rounded-lg p-6">
            <h2 className="text-lg font-bold text-[#856404] mb-3">⚠️ Zwakke Punten</h2>
            <p className="text-sm text-[#856404] mb-3">
              AI heeft vastgesteld dat je deze onderwerpen meer aandacht moet geven:
            </p>
            <div className="space-y-2">
              {analytics.weakPoints.map((topic) => (
                <div key={topic} className="bg-white p-3 rounded-lg text-sm text-[#18181b] flex justify-between items-center">
                  <span>{topic}</span>
                  <span className="text-xs text-[#71717a] font-mono">&lt; 60%</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-[#856404] mt-4">
              💡 Tip: Filter je studyset op deze onderwerpen en bestudeer ze met extra aandacht.
            </p>
          </div>
        )}

        {/* WEEKLY HEATMAP */}
        <div className="bg-white border border-[#e4e4e7] rounded-lg p-6">
          <h2 className="text-lg font-bold mb-4">📅 Deze week</h2>
          <div className="grid grid-cols-7 gap-2">
            {analytics.heatmapData.map((data) => {
              const date = new Date(data.date);
              const dayName = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'][date.getDay()];
              const intensity = Math.min(data.count / 20, 1);
              const bgColor =
                data.count === 0
                  ? '#f5f3f0'
                  : `rgba(107, 124, 78, ${0.2 + intensity * 0.8})`;

              return (
                <div key={data.date} className="text-center">
                  <div
                    className="w-10 h-10 rounded-lg mb-1 flex items-center justify-center font-mono text-xs font-bold"
                    style={{ backgroundColor: bgColor }}
                    title={`${data.count} kaarten`}
                  >
                    {data.count > 0 ? data.count : ''}
                  </div>
                  <p className="text-xs text-[#71717a]">{dayName}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* TIME STATS */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-[#e4e4e7] rounded-lg p-6">
            <h3 className="font-bold text-[#18181b] mb-2">Totale studietijd</h3>
            <p className="text-3xl font-bold text-[#6b7c4e]">{analytics.totalMinutesSpent} min</p>
            <p className="text-xs text-[#71717a] mt-2">≈ {Math.round(analytics.totalMinutesSpent / 60)} uur</p>
          </div>

          <div className="bg-white border border-[#e4e4e7] rounded-lg p-6">
            <h3 className="font-bold text-[#18181b] mb-2">Gemiddelde responstijd</h3>
            <p className="text-3xl font-bold text-[#6b7c4e]">{analytics.averageResponseTime}s</p>
            <p className="text-xs text-[#71717a] mt-2">Per kaart</p>
          </div>
        </div>

        {/* WEEKLY GOAL */}
        <div className="bg-white border border-[#e4e4e7] rounded-lg p-6">
          <h3 className="font-bold text-[#18181b] mb-4">📍 Wekelijks Doel</h3>
          <p className="text-sm text-[#71717a] mb-3">Je hebt {analytics.weeklyProgress}% van je doelstelling bereikt</p>
          <div className="w-full h-3 bg-[#e4e4e7] rounded-full overflow-hidden">
            <div className="h-full bg-[#6b7c4e]" style={{ width: `${analytics.weeklyProgress}%` }} />
          </div>
          <p className="text-xs text-[#71717a] mt-3">Nog {Math.round(analytics.dailyGoal * (100 - analytics.weeklyProgress) / 100)} kaarten voor je streefcijfer</p>
        </div>

        {/* AI RECOMMENDATIONS */}
        <div className="bg-[#e8f5e9] border border-[#4caf50] rounded-lg p-6">
          <h3 className="font-bold text-[#2e7d32] mb-3">🤖 AI Aanbevelingen</h3>
          <ul className="space-y-2 text-sm text-[#558b2f]">
            <li>✓ Je zwakke punten hebben minder dan 60% retentie. Plan extra sessies in.</li>
            <li>✓ Je streak van 12 dagen is goed! Hou vol!</li>
            <li>✓ Verhoog je dagelijks doel van 15 naar 18 kaarten voor sneller progres.</li>
            <li>✓ Je responstijd is langzaam (8.5s) — probeer sneller antwoord te geven.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
