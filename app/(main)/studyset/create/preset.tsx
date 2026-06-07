'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

const PRESETS = [
  { id: 'balanced', name: 'Balanced', desc: 'Evenwichtige mix (40% Quiz, 35% Flashcards, 25% Notes)', icon: '⚖️' },
  { id: 'heavy-quiz', name: 'Heavy Quiz', desc: '60% Quiz voor veel oefening', icon: '📊' },
  { id: 'visual', name: 'Visual', desc: 'Veel afbeeldingen en mindmaps', icon: '🖼️' },
  { id: 'intensive', name: 'Intensive', desc: 'Alles tegelijk - maximum inzicht', icon: '🔥' },
];

export default function PresetFlow() {
  const router = useRouter();
  const [selected, setSelected] = useState('balanced');
  const [settings, setSettings] = useState({
    quiz: 40,
    flashcards: 35,
    notes: 25,
    newCardsPerDay: 15,
    intensity: 'medium',
  });

  const handleCreate = () => {
    console.log('Creating with preset:', selected, settings);
    alert('Studyset aangemaakt! (Mock)');
    router.push('/studyset');
  };

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      {/* HEADER */}
      <div className="border-b border-[#e4e4e7] bg-white px-8 py-6">
        <h1 className="text-3xl font-bold">Preset + Sliders</h1>
        <p className="mt-2 text-sm text-[#71717a]">Kies een voorbouwde set, dan versteel alles handmatig</p>
      </div>

      {/* CONTENT */}
      <div className="mx-auto max-w-2xl px-8 py-8 space-y-12">
        {/* PRESET SELECTION */}
        <div>
          <h2 className="text-lg font-bold mb-4">Kies een voorbouwde set</h2>
          <div className="grid grid-cols-2 gap-4">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => {
                  setSelected(preset.id);
                  if (preset.id === 'balanced') setSettings({ ...settings, quiz: 40, flashcards: 35, notes: 25 });
                  if (preset.id === 'heavy-quiz') setSettings({ ...settings, quiz: 60, flashcards: 30, notes: 10 });
                  if (preset.id === 'visual') setSettings({ ...settings, quiz: 20, flashcards: 30, notes: 50 });
                  if (preset.id === 'intensive') setSettings({ ...settings, quiz: 50, flashcards: 30, notes: 20 });
                }}
                className={`p-4 rounded-lg border-2 text-left transition ${
                  selected === preset.id
                    ? 'border-[#6b7c4e] bg-[#f5f3f0]'
                    : 'border-[#e4e4e7] bg-white hover:border-[#6b7c4e]'
                }`}
              >
                <div className="text-2xl mb-2">{preset.icon}</div>
                <div className="font-bold text-[#18181b]">{preset.name}</div>
                <div className="text-xs text-[#71717a] mt-2">{preset.desc}</div>
                {selected === preset.id && <Check className="h-4 w-4 text-[#6b7c4e] absolute top-4 right-4" />}
              </button>
            ))}
          </div>
        </div>

        {/* SLIDERS */}
        <div className="border-t border-[#e4e4e7] pt-8">
          <h2 className="text-lg font-bold mb-6">Versteel alles handmatig</h2>

          <div className="space-y-6">
            {/* TOOL MIX */}
            <div className="bg-white p-6 rounded-lg border border-[#e4e4e7]">
              <h3 className="font-bold text-[#18181b] mb-4">Tool-mix</h3>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-[#18181b]">Quiz</label>
                    <span className="text-sm font-mono text-[#6b7c4e]">{settings.quiz}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.quiz}
                    onChange={(e) => setSettings({ ...settings, quiz: parseInt(e.target.value) })}
                    className="w-full h-2 bg-[#e4e4e7] rounded-full appearance-none cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-[#18181b]">Flashcards</label>
                    <span className="text-sm font-mono text-[#6b7c4e]">{settings.flashcards}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.flashcards}
                    onChange={(e) => setSettings({ ...settings, flashcards: parseInt(e.target.value) })}
                    className="w-full h-2 bg-[#e4e4e7] rounded-full appearance-none cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-[#18181b]">Notes</label>
                    <span className="text-sm font-mono text-[#6b7c4e]">{settings.notes}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.notes}
                    onChange={(e) => setSettings({ ...settings, notes: parseInt(e.target.value) })}
                    className="w-full h-2 bg-[#e4e4e7] rounded-full appearance-none cursor-pointer"
                  />
                </div>
              </div>

              <div className="mt-4 p-3 bg-[#f5f3f0] rounded text-xs text-[#71717a]">
                Totaal: {settings.quiz + settings.flashcards + settings.notes}% (moet 100% zijn)
              </div>
            </div>

            {/* DAILY SETTINGS */}
            <div className="bg-white p-6 rounded-lg border border-[#e4e4e7]">
              <h3 className="font-bold text-[#18181b] mb-4">Dagelijkse instellingen</h3>

              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-[#18181b]">Nieuwe kaarten/dag</label>
                  <span className="text-sm font-mono text-[#6b7c4e]">{settings.newCardsPerDay}</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={settings.newCardsPerDay}
                  onChange={(e) => setSettings({ ...settings, newCardsPerDay: parseInt(e.target.value) })}
                  className="w-full h-2 bg-[#e4e4e7] rounded-full appearance-none cursor-pointer"
                />
              </div>

              <div className="mt-4">
                <label className="text-sm font-medium text-[#18181b]">Intensiteit</label>
                <div className="mt-2 flex gap-2">
                  {['light', 'medium', 'heavy'].map((int) => (
                    <button
                      key={int}
                      onClick={() => setSettings({ ...settings, intensity: int })}
                      className={`flex-1 py-2 rounded-lg font-bold text-sm transition ${
                        settings.intensity === int
                          ? 'bg-[#6b7c4e] text-white'
                          : 'bg-[#e4e4e7] text-[#18181b]'
                      }`}
                    >
                      {int === 'light' ? 'Licht' : int === 'medium' ? 'Gemiddeld' : 'Zwaar'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ACTION BUTTON */}
        <Button
          onClick={handleCreate}
          className="w-full bg-[#6b7c4e] hover:bg-[#4f5d3a] text-white py-3 font-bold"
        >
          Aanmaken
        </Button>
      </div>
    </div>
  );
}
