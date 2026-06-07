'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft, Settings, Share2, Archive, Edit, Trash2, BarChart3,
  Lock, BookOpen, Zap, Tag, Folder, Clock, Download
} from 'lucide-react';
import { Studyset } from '../types';

const MOCK_STUDYSET: Studyset = {
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
  sources: [
    { id: '1', type: 'file', name: 'H4-Celmembraan.pdf', isActive: true, uploadedAt: new Date() },
    { id: '2', type: 'file', name: 'H5-Celdeling.pdf', isActive: true, uploadedAt: new Date() },
    { id: '3', type: 'audio', name: 'College-opname-28mei.mp3', url: '', fileUrl: '', isActive: true, uploadedAt: new Date() },
  ],
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
    tags: ['SO', 'Biologie', 'Examen'],
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
};

export default function StudysetDetailPage({ params }: { params: { id: string } }) {
  const [studyset] = useState<Studyset>(MOCK_STUDYSET);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const percentComplete = Math.round((studyset.completedCards / studyset.totalCards) * 100);

  const tabs = [
    { id: 'overview', label: '📋 Overzicht', href: `/studyset/${studyset.id}` },
    { id: 'analytics', label: '📊 Analytics', href: `/studyset/${studyset.id}/analytics` },
    { id: 'settings', label: '⚙️ Instellingen', href: `/studyset/${studyset.id}/edit` },
    { id: 'history', label: '📜 Wijzigingen', href: `/studyset/${studyset.id}/history` },
    { id: 'study', label: '🎓 Studeren', href: `/studyset/${studyset.id}/study` },
  ];
  const currentTab = 'overview';

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      {/* HEADER */}
      <div className="border-b border-[#e4e4e7] bg-white px-8 py-6">
        <Link href="/studyset" className="inline-flex items-center gap-2 text-[#6b7c4e] hover:text-[#4f5d3a] mb-4">
          <ChevronLeft className="h-4 w-4" />
          Terug naar studysets
        </Link>

        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-xs font-bold uppercase text-[#6b7c4e] mb-1">{studyset.subject}</p>
            <h1 className="text-3xl font-bold text-[#18181b]">{studyset.name}</h1>
            <p className="text-sm text-[#71717a] mt-2">
              {studyset.totalCards} kaarten • {studyset.avgRetention}% retentie • 🔥 {studyset.currentStreak} streak
            </p>
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-2 border-b border-[#e4e4e7]">
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              href={tab.href}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition ${
                currentTab === tab.id
                  ? 'border-[#6b7c4e] text-[#6b7c4e]'
                  : 'border-transparent text-[#71717a] hover:text-[#18181b]'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="mx-auto max-w-4xl px-8 py-8 space-y-8">
        {/* PROGRESS */}
        <div className="bg-white border border-[#e4e4e7] rounded-lg p-6">
          <h2 className="font-bold text-[#18181b] mb-4">Voortgang</h2>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="h-3 bg-[#e4e4e7] rounded-full overflow-hidden">
                <div className="h-full bg-[#6b7c4e]" style={{ width: `${percentComplete}%` }} />
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-[#6b7c4e]">{percentComplete}%</p>
              <p className="text-xs text-[#71717a]">{studyset.completedCards}/{studyset.totalCards}</p>
            </div>
          </div>
        </div>

        {/* SOURCES */}
        <div className="bg-white border border-[#e4e4e7] rounded-lg p-6">
          <h2 className="font-bold text-[#18181b] mb-4 flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Bronnen
          </h2>
          <div className="space-y-2">
            {studyset.sources.map((src) => (
              <div
                key={src.id}
                className={`p-3 rounded-lg border transition ${
                  src.isActive
                    ? 'bg-[#f5f3f0] border-[#6b7c4e]'
                    : 'bg-[#f5f5f5] border-[#d4d4d8] opacity-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {src.type === 'file' && <BookOpen className="h-4 w-4 text-[#6b7c4e]" />}
                    {src.type === 'audio' && <span>🎙️</span>}
                    {src.type === 'url' && <span>🔗</span>}
                    <span className="text-sm font-medium text-[#18181b]">{src.name}</span>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-[#71717a]">
                    <input type="checkbox" checked={src.isActive} readOnly className="rounded" />
                    Actief
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SETTINGS */}
        <div className="bg-white border border-[#e4e4e7] rounded-lg p-6">
          <h2 className="font-bold text-[#18181b] mb-4 flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Instellingen
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-bold uppercase text-[#71717a]">Grounding</p>
              <p className="text-sm text-[#18181b] mt-1">
                {studyset.settings.groundingOnly ? '🔒 Alleen mijn bronnen' : '🌐 Met externe kennis'}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-[#71717a]">Output</p>
              <p className="text-sm text-[#18181b] mt-1">
                {studyset.settings.outputDepth} • {studyset.settings.difficulty}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-[#71717a]">SRS</p>
              <p className="text-sm text-[#18181b] mt-1">
                {studyset.settings.newCardsPerDay}/dag • Limiet: {studyset.settings.dailyLimit}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-[#71717a]">Toon</p>
              <p className="text-sm text-[#18181b] mt-1">{studyset.settings.tone}</p>
            </div>
          </div>
          <Link
            href={`/studyset/${studyset.id}/edit`}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 border border-[#e4e4e7] rounded-lg hover:bg-[#f5f3f0]"
          >
            <Edit className="h-4 w-4" />
            Bewerk Instellingen
          </Link>
        </div>

        {/* ORGANIZATION */}
        <div className="bg-white border border-[#e4e4e7] rounded-lg p-6">
          <h2 className="font-bold text-[#18181b] mb-4 flex items-center gap-2">
            <Folder className="h-4 w-4" />
            Organisatie
          </h2>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="px-3 py-1 rounded-full bg-[#6b7c4e] text-white text-sm font-medium">
              📂 {studyset.settings.folder}
            </div>
            {studyset.settings.tags.map((tag) => (
              <div key={tag} className="px-3 py-1 rounded-full bg-[#e4e4e7] text-[#18181b] text-sm font-medium">
                #{tag}
              </div>
            ))}
            {studyset.settings.isPinned && <div className="px-3 py-1 rounded-full bg-[#fff3cd] text-[#856404] text-sm font-medium">📌 Vastgezet</div>}
          </div>
        </div>

        {/* ACTIONS */}
        <div className="grid grid-cols-3 gap-4">
          <button className="p-4 bg-white border border-[#e4e4e7] rounded-lg hover:bg-[#f5f3f0] transition flex items-center justify-center gap-2">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
          <button className="p-4 bg-white border border-[#e4e4e7] rounded-lg hover:bg-[#f5f3f0] transition flex items-center justify-center gap-2">
            <Share2 className="h-4 w-4" />
            <span>Delen</span>
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-4 bg-white border border-[#e4e4e7] rounded-lg hover:bg-red-50 transition flex items-center justify-center gap-2 text-red-600"
          >
            <Trash2 className="h-4 w-4" />
            <span>Verwijder</span>
          </button>
        </div>

        {/* DELETE CONFIRM */}
        {showDeleteConfirm && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="font-bold text-red-700 mb-2">Weet je het zeker?</h3>
            <p className="text-sm text-red-600 mb-4">Dit kan niet ongedaan gemaakt worden.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-red-200 rounded-lg hover:bg-red-100"
              >
                Annuleren
              </button>
              <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                Verwijder Studyset
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
