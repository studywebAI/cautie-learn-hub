'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, Save, RotateCcw } from 'lucide-react';
import { Studyset, StudysetSettings } from '../../types';

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
};

export default function EditStudysetPage({ params }: { params: { id: string } }) {
  const [studyset, setStudyset] = useState<Studyset>(MOCK_STUDYSET);
  const [settings, setSettings] = useState<StudysetSettings>(MOCK_STUDYSET.settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    // TODO: API call to save settings
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      {/* HEADER */}
      <div className="border-b border-[#e4e4e7] bg-white px-8 py-6">
        <Link href={`/studyset/${params.id}`} className="inline-flex items-center gap-2 text-[#6b7c4e] hover:text-[#4f5d3a] mb-4">
          <ChevronLeft className="h-4 w-4" />
          Terug
        </Link>
        <h1 className="text-3xl font-bold">Bewerk Instellingen</h1>
        <p className="mt-1 text-sm text-[#71717a]">{studyset.name}</p>
      </div>

      {/* CONTENT */}
      <div className="mx-auto max-w-2xl px-8 py-8 space-y-8">
        {/* SUCCESS MESSAGE */}
        {saved && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-700">
            ✓ Instellingen opgeslagen!
          </div>
        )}

        {/* GROUNDING SECTION */}
        <div className="bg-white border border-[#e4e4e7] rounded-lg p-6">
          <h2 className="text-lg font-bold text-[#18181b] mb-4">🔒 Grounding / Accuraatheid</h2>
          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.groundingOnly}
                onChange={(e) => setSettings({ ...settings, groundingOnly: e.target.checked })}
                className="w-4 h-4 rounded cursor-pointer"
              />
              <span className="text-sm font-medium text-[#18181b]">Alleen mijn eigen bronnen gebruiken</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.showCitations}
                onChange={(e) => setSettings({ ...settings, showCitations: e.target.checked })}
                className="w-4 h-4 rounded cursor-pointer"
              />
              <span className="text-sm font-medium text-[#18181b]">Citaties tonen</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.confidenceIndicator}
                onChange={(e) => setSettings({ ...settings, confidenceIndicator: e.target.checked })}
                className="w-4 h-4 rounded cursor-pointer"
              />
              <span className="text-sm font-medium text-[#18181b]">Confidence-indicator</span>
            </label>
          </div>
        </div>

        {/* OUTPUT CONTROL SECTION */}
        <div className="bg-white border border-[#e4e4e7] rounded-lg p-6">
          <h2 className="text-lg font-bold text-[#18181b] mb-4">🎛️ Output-Controle</h2>
          <div className="space-y-5">
            <div>
              <Label>Diepte / Lengte</Label>
              <select
                value={settings.outputDepth}
                onChange={(e) => setSettings({ ...settings, outputDepth: e.target.value as any })}
                className="mt-2 w-full rounded-lg border border-[#e4e4e7] px-4 py-2 text-sm"
              >
                <option value="kort">Kort overzicht</option>
                <option value="gemiddeld">Gemiddeld</option>
                <option value="uitgebreid">Uitgebreid</option>
              </select>
            </div>

            <div>
              <Label>Moeilijkheidsgraad</Label>
              <select
                value={settings.difficulty}
                onChange={(e) => setSettings({ ...settings, difficulty: e.target.value as any })}
                className="mt-2 w-full rounded-lg border border-[#e4e4e7] px-4 py-2 text-sm"
              >
                <option value="basis">Basis / Begrip</option>
                <option value="gemiddeld">Gemiddeld</option>
                <option value="examen">Examenniveau</option>
              </select>
            </div>

            <div>
              <Label>Toon / Modus</Label>
              <select
                value={settings.tone}
                onChange={(e) => setSettings({ ...settings, tone: e.target.value as any })}
                className="mt-2 w-full rounded-lg border border-[#e4e4e7] px-4 py-2 text-sm"
              >
                <option value="tutor">Tutor-stijl (uitleggerig)</option>
                <option value="samenvatting">Samenvatting (bondig)</option>
                <option value="trainer">Trainer (examen-voorbereiding)</option>
              </select>
            </div>

            <div>
              <Label>Outputtaal</Label>
              <select
                value={settings.outputLanguage}
                onChange={(e) => setSettings({ ...settings, outputLanguage: e.target.value })}
                className="mt-2 w-full rounded-lg border border-[#e4e4e7] px-4 py-2 text-sm"
              >
                <option value="nl">Nederlands</option>
                <option value="en">English</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
              </select>
            </div>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.voorbeelden}
                onChange={(e) => setSettings({ ...settings, voorbeelden: e.target.checked })}
                className="w-4 h-4 rounded cursor-pointer"
              />
              <span className="text-sm font-medium text-[#18181b]">Voorbeelden opnemen</span>
            </label>
          </div>
        </div>

        {/* SRS SETTINGS */}
        <div className="bg-white border border-[#e4e4e7] rounded-lg p-6">
          <h2 className="text-lg font-bold text-[#18181b] mb-4">🔄 Spaced Repetition</h2>
          <div className="space-y-4">
            <div>
              <Label>Nieuwe kaarten per dag</Label>
              <Input
                type="number"
                value={settings.newCardsPerDay}
                onChange={(e) => setSettings({ ...settings, newCardsPerDay: parseInt(e.target.value) })}
                min="5"
                max="50"
                className="mt-2"
              />
            </div>

            <div>
              <Label>Daglimiet (alle kaarten)</Label>
              <Input
                type="number"
                value={settings.dailyLimit}
                onChange={(e) => setSettings({ ...settings, dailyLimit: parseInt(e.target.value) })}
                min="10"
                max="200"
                className="mt-2"
              />
            </div>

            <div>
              <Label>SRS-algoritme</Label>
              <select
                value={settings.srsAlgorithm}
                onChange={(e) => setSettings({ ...settings, srsAlgorithm: e.target.value as any })}
                className="mt-2 w-full rounded-lg border border-[#e4e4e7] px-4 py-2 text-sm"
              >
                <option value="sm2">SM-2 (standaard)</option>
                <option value="lightweight">Lightweight</option>
              </select>
            </div>
          </div>
        </div>

        {/* ACCESSIBILITY */}
        <div className="bg-white border border-[#e4e4e7] rounded-lg p-6">
          <h2 className="text-lg font-bold text-[#18181b] mb-4">♿ Accessibility</h2>
          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.darkMode}
                onChange={(e) => setSettings({ ...settings, darkMode: e.target.checked })}
                className="w-4 h-4 rounded cursor-pointer"
              />
              <span className="text-sm font-medium text-[#18181b]">Dark Mode</span>
            </label>

            <div>
              <Label>Lettergrootte</Label>
              <select
                value={settings.textSize}
                onChange={(e) => setSettings({ ...settings, textSize: e.target.value as any })}
                className="mt-2 w-full rounded-lg border border-[#e4e4e7] px-4 py-2 text-sm"
              >
                <option value="klein">Klein</option>
                <option value="normaal">Normaal</option>
                <option value="groot">Groot</option>
              </select>
            </div>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.offlineMode}
                onChange={(e) => setSettings({ ...settings, offlineMode: e.target.checked })}
                className="w-4 h-4 rounded cursor-pointer"
              />
              <span className="text-sm font-medium text-[#18181b]">Offline Mode</span>
            </label>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-6 py-3 bg-[#6b7c4e] text-white rounded-lg font-bold hover:bg-[#4f5d3a] transition flex items-center justify-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Opslaan...' : 'Opslaan'}
          </button>

          <Link
            href={`/studyset/${params.id}`}
            className="flex-1 px-6 py-3 border border-[#e4e4e7] rounded-lg font-bold hover:bg-[#f5f3f0] transition flex items-center justify-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Annuleren
          </Link>
        </div>
      </div>
    </div>
  );
}
