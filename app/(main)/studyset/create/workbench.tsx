'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreateWizardState } from '../types';
import { Menu, X, CheckCircle2, FileUp, Settings, Zap } from 'lucide-react';

const INITIAL_STATE: CreateWizardState = {
  step: 1,
  name: '',
  subject: '',
  studyDays: ['ma', 'di', 'do', 'za'],
  uploadType: 'custom',
  sources: [],
  settings: {
    groundingOnly: true,
    showCitations: true,
    outputDepth: 'gemiddeld',
    difficulty: 'gemiddeld',
    tone: 'tutor',
    doelgroep: 'middelbaar',
    voorbeelden: true,
    newCardsPerDay: 15,
    srsAlgorithm: 'sm2',
    dailyLimit: 30,
  },
  selectedTools: [],
};

type Section = 'basics' | 'upload' | 'settings' | 'tools' | 'review';

export default function WorkbenchFlow() {
  const router = useRouter();
  const [state, setState] = useState<CreateWizardState>(INITIAL_STATE);
  const [activeSection, setActiveSection] = useState<Section>('basics');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const sections: { id: Section; label: string; icon: string; completed: boolean }[] = [
    { id: 'basics', label: 'Basis Info', icon: '📝', completed: !!state.name && !!state.subject },
    { id: 'upload', label: 'Bronnen', icon: '📤', completed: state.sources.length > 0 },
    { id: 'settings', label: 'Instellingen', icon: '⚙️', completed: false },
    { id: 'tools', label: 'Tools', icon: '🔧', completed: state.selectedTools.length > 0 },
    { id: 'review', label: 'Review', icon: '✓', completed: false },
  ];

  const handleCreate = async () => {
    // TODO: Create studyset
    console.log('Creating studyset:', state);
    alert('Studyset aangemaakt! (Mock)');
    router.push('/studyset');
  };

  return (
    <div className="h-screen flex bg-[#faf9f7] overflow-hidden">
      {/* SIDEBAR */}
      <div
        className={`transition-all border-r border-[#e4e4e7] bg-white flex flex-col ${
          sidebarOpen ? 'w-64' : 'w-0'
        }`}
      >
        <div className="p-6 border-b border-[#e4e4e7]">
          <h1 className="text-lg font-bold text-[#18181b]">Werkbank</h1>
          <p className="text-xs text-[#71717a] mt-1">Bouw in jouw tempo</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {sections.map((sec) => (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              className={`w-full text-left px-4 py-3 rounded-lg transition flex items-center gap-3 ${
                activeSection === sec.id
                  ? 'bg-[#6b7c4e] text-white'
                  : 'text-[#18181b] hover:bg-[#f5f3f0]'
              }`}
            >
              <span className="text-lg">{sec.icon}</span>
              <span className="font-medium text-sm flex-1">{sec.label}</span>
              {sec.completed && <CheckCircle2 className="h-4 w-4" />}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-[#e4e4e7]">
          <button
            onClick={handleCreate}
            disabled={!sections.every((s) => s.completed || s.id !== 'review')}
            className="w-full px-4 py-2 bg-[#6b7c4e] text-white rounded-lg font-bold hover:bg-[#4f5d3a] text-sm"
          >
            Aanmaken
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TOP BAR */}
        <div className="border-b border-[#e4e4e7] bg-white px-8 py-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-[#6b7c4e] hover:bg-[#f5f3f0] p-2 rounded-lg"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <h2 className="text-xl font-bold text-[#18181b]">
            {sections.find((s) => s.id === activeSection)?.label}
          </h2>

          <div className="text-sm text-[#71717a]">
            {sections.filter((s) => s.completed).length}/{sections.length} voltooid
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-2xl mx-auto">
            {activeSection === 'basics' && (
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-bold uppercase text-[#71717a]">Naam</label>
                  <input
                    value={state.name}
                    onChange={(e) => setState({ ...state, name: e.target.value })}
                    placeholder="bijv. Biologie H4-H6"
                    className="mt-2 w-full px-4 py-2 border border-[#e4e4e7] rounded-lg"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold uppercase text-[#71717a]">Vak</label>
                  <select
                    value={state.subject}
                    onChange={(e) => setState({ ...state, subject: e.target.value })}
                    className="mt-2 w-full px-4 py-2 border border-[#e4e4e7] rounded-lg"
                  >
                    <option>Selecteer...</option>
                    <option>Biologie</option>
                    <option>Frans</option>
                    <option>Wiskunde</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-bold uppercase text-[#71717a]">Studiedagen</label>
                  <div className="mt-2 grid grid-cols-7 gap-2">
                    {['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'].map((day) => (
                      <button
                        key={day}
                        onClick={() => {
                          setState({
                            ...state,
                            studyDays: state.studyDays.includes(day)
                              ? state.studyDays.filter((d) => d !== day)
                              : [...state.studyDays, day],
                          });
                        }}
                        className={`py-2 rounded-lg font-bold text-sm ${
                          state.studyDays.includes(day)
                            ? 'bg-[#6b7c4e] text-white'
                            : 'bg-[#e4e4e7] text-[#18181b]'
                        }`}
                      >
                        {day.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'upload' && (
              <div className="space-y-6">
                <div className="border-2 border-dashed border-[#e4e4e7] rounded-lg p-8 text-center">
                  <FileUp className="h-12 w-12 text-[#6b7c4e] mx-auto mb-4" />
                  <p className="font-bold text-[#18181b]">Sleep bestanden hierheen</p>
                  <p className="text-sm text-[#71717a] mt-2">of klik om te selecteren</p>
                </div>

                {state.sources.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-[#18181b]">Uploads ({state.sources.length}):</p>
                    {state.sources.map((src, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-lg border border-[#e4e4e7]">
                        <span className="text-sm">{src.name}</span>
                        <button
                          onClick={() => setState({ ...state, sources: state.sources.filter((_, i) => i !== idx) })}
                          className="text-red-600 text-sm font-bold"
                        >
                          Verwijder
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeSection === 'settings' && (
              <div className="space-y-6 bg-white p-6 rounded-lg border border-[#e4e4e7]">
                <div>
                  <label className="text-sm font-bold uppercase text-[#71717a]">Output Diepte</label>
                  <select
                    value={state.settings?.outputDepth || 'gemiddeld'}
                    onChange={(e) =>
                      setState({
                        ...state,
                        settings: { ...state.settings, outputDepth: e.target.value as any },
                      })
                    }
                    className="mt-2 w-full px-4 py-2 border border-[#e4e4e7] rounded-lg"
                  >
                    <option value="kort">Kort</option>
                    <option value="gemiddeld">Gemiddeld</option>
                    <option value="uitgebreid">Uitgebreid</option>
                  </select>
                </div>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={state.settings?.groundingOnly || false}
                    onChange={(e) =>
                      setState({
                        ...state,
                        settings: { ...state.settings, groundingOnly: e.target.checked },
                      })
                    }
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm text-[#18181b]">🔒 Alleen mijn bronnen</span>
                </label>
              </div>
            )}

            {activeSection === 'tools' && (
              <div className="grid grid-cols-3 gap-3">
                {['Quiz', 'Flashcards', 'Notes', 'Video', 'Mind Map', 'Whiteboard'].map((tool) => (
                  <button
                    key={tool}
                    onClick={() => {
                      setState({
                        ...state,
                        selectedTools: state.selectedTools.includes(tool)
                          ? state.selectedTools.filter((t) => t !== tool)
                          : [...state.selectedTools, tool],
                      });
                    }}
                    className={`py-3 rounded-lg font-bold text-sm border-2 ${
                      state.selectedTools.includes(tool)
                        ? 'border-[#6b7c4e] bg-[#6b7c4e] text-white'
                        : 'border-[#e4e4e7] bg-white text-[#18181b]'
                    }`}
                  >
                    {tool}
                  </button>
                ))}
              </div>
            )}

            {activeSection === 'review' && (
              <div className="bg-[#e8f5e9] border border-[#4caf50] rounded-lg p-6 space-y-4">
                <h3 className="font-bold text-[#2e7d32]">✓ Klaar?</h3>
                <div className="space-y-2 text-sm text-[#558b2f]">
                  <p>📝 Naam: {state.name}</p>
                  <p>📚 Vak: {state.subject}</p>
                  <p>📤 Bronnen: {state.sources.length}</p>
                  <p>🔧 Tools: {state.selectedTools.join(', ')}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
