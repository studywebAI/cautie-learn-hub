'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, Upload, BookOpen } from 'lucide-react';
import { CreateWizardState, Source, UploadType } from '../types';

type Step = 1 | 2 | 3 | 4;

const INITIAL_STATE: CreateWizardState = {
  step: 1,
  name: '',
  subject: '',
  studyDays: [],
  uploadType: 'custom',
  sources: [],
  settings: {},
  selectedTools: [],
};

const DAYS = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];
const DAY_LABELS: Record<string, string> = {
  ma: 'Maandag',
  di: 'Dinsdag',
  wo: 'Woensdag',
  do: 'Donderdag',
  vr: 'Vrijdag',
  za: 'Zaterdag',
  zo: 'Zondag',
};

const TOOLS = [
  { id: 'quiz', name: 'Quiz', icon: '📝' },
  { id: 'flashcards', name: 'Flashcards', icon: '🗂️' },
  { id: 'notes', name: 'Notes', icon: '📄' },
  { id: 'mindmap', name: 'Mindmap', icon: '🧠' },
];

export default function PrimaryFlow() {
  const router = useRouter();
  const [state, setState] = useState<CreateWizardState>(INITIAL_STATE);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState({ ...state, name: e.target.value });
  };

  const handleDayToggle = (day: string) => {
    setState({
      ...state,
      studyDays: state.studyDays.includes(day)
        ? state.studyDays.filter((d) => d !== day)
        : [...state.studyDays, day],
    });
  };

  const handleUploadTypeChange = (type: UploadType) => {
    setState({ ...state, uploadType: type });
  };

  const handleToolToggle = (toolId: string) => {
    setState({
      ...state,
      selectedTools: state.selectedTools.includes(toolId)
        ? state.selectedTools.filter((t) => t !== toolId)
        : [...state.selectedTools, toolId],
    });
  };

  const handleNext = () => {
    if (state.step === 1 && !state.name) {
      alert('Geef alstublieft een naam in');
      return;
    }
    if (state.step === 1 && state.studyDays.length === 0) {
      alert('Kies alstublieft minstens één studiedag');
      return;
    }
    if (state.step === 2 && state.sources.length === 0) {
      alert('Upload alstublieft minstens één bron');
      return;
    }
    if (state.step < 4) {
      setState({ ...state, step: (state.step + 1) as Step });
    }
  };

  const handleBack = () => {
    if (state.step > 1) {
      setState({ ...state, step: (state.step - 1) as Step });
    }
  };

  const handleGenerate = () => {
    // Create studyset and redirect
    router.push('/studyset');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newSources: Source[] = Array.from(files).map((file) => ({
        id: Math.random().toString(36).substring(7),
        type: 'file',
        name: file.name,
        isActive: true,
        uploadedAt: new Date(),
      }));
      setState({ ...state, sources: [...state.sources, ...newSources] });
    }
  };

  const handleMockUpload = () => {
    const mockSources: Source[] = [
      {
        id: '1',
        type: 'file',
        name: 'Biologie_H4.pdf',
        isActive: true,
        uploadedAt: new Date(),
      },
    ];
    setState({ ...state, sources: mockSources });
  };

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      {/* HEADER */}
      <div className="border-b border-[#e4e4e7] bg-white px-8 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">Nieuwe Studyset</h1>
          <span className="text-sm text-[#71717a]">
            Stap {state.step} van 4
          </span>
        </div>
        <div className="h-2 bg-[#e4e4e7] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#6b7c4e] transition-all"
            style={{ width: `${(state.step / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* CONTENT */}
      <div className="mx-auto max-w-2xl px-8 py-12 min-h-[calc(100vh-200px)]">
        {/* STEP 1: Name + Calendar */}
        {state.step === 1 && (
          <div className="space-y-8">
            <div>
              <label className="block text-sm font-bold text-[#18181b] mb-2">
                Naam van je studyset
              </label>
              <Input
                value={state.name}
                onChange={handleNameChange}
                placeholder="bijv. Biologie H4-H6 Celbiologie"
                className="text-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-[#18181b] mb-4">
                Welke dagen kun je studeren?
              </label>
              <div className="grid grid-cols-2 gap-3">
                {DAYS.map((day) => (
                  <button
                    key={day}
                    onClick={() => handleDayToggle(day)}
                    className={`p-3 rounded-lg border-2 transition ${
                      state.studyDays.includes(day)
                        ? 'border-[#6b7c4e] bg-[#f5f3f0] text-[#6b7c4e] font-bold'
                        : 'border-[#e4e4e7] bg-white text-[#18181b] hover:border-[#6b7c4e]'
                    }`}
                  >
                    {DAY_LABELS[day]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Upload */}
        {state.step === 2 && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-[#18181b] mb-6">
                Hoe wil je je bronnen uploaden?
              </h2>

              {/* Option A: Agenda-Toets */}
              <button
                onClick={() => handleUploadTypeChange('agenda')}
                className={`w-full p-6 rounded-lg border-2 mb-4 text-left transition ${
                  state.uploadType === 'agenda'
                    ? 'border-[#6b7c4e] bg-[#f5f3f0]'
                    : 'border-[#e4e4e7] hover:border-[#6b7c4e]'
                }`}
              >
                <div className="font-bold text-[#18181b]">📅 Agenda-Toets</div>
                <p className="text-sm text-[#71717a] mt-1">
                  Sync met je agenda - selecteer een toets en gekoppelde hoofdstukken
                </p>
              </button>

              {/* Option B: Subjects */}
              <button
                onClick={() => handleUploadTypeChange('subject')}
                className={`w-full p-6 rounded-lg border-2 mb-4 text-left transition ${
                  state.uploadType === 'subject'
                    ? 'border-[#6b7c4e] bg-[#f5f3f0]'
                    : 'border-[#e4e4e7] hover:border-[#6b7c4e]'
                }`}
              >
                <div className="font-bold text-[#18181b]">📚 Vak/Hoofdstuk</div>
                <p className="text-sm text-[#71717a] mt-1">
                  Selecteer vak → hoofdstuk → paragrafen
                </p>
              </button>

              {/* Option C: Files/Links */}
              <button
                onClick={() => handleUploadTypeChange('custom')}
                className={`w-full p-6 rounded-lg border-2 text-left transition ${
                  state.uploadType === 'custom'
                    ? 'border-[#6b7c4e] bg-[#f5f3f0]'
                    : 'border-[#e4e4e7] hover:border-[#6b7c4e]'
                }`}
              >
                <div className="font-bold text-[#18181b]">📤 Bestanden/Links</div>
                <p className="text-sm text-[#71717a] mt-1">
                  Upload PDFs, afbeeldingen, links, audio, etc.
                </p>
              </button>
            </div>

            {/* Upload interface based on selection */}
            {state.uploadType === 'custom' && (
              <div className="border-t border-[#e4e4e7] pt-8">
                <div className="border-2 border-dashed border-[#e4e4e7] rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 text-[#71717a] mx-auto mb-4" />
                  <p className="font-bold text-[#18181b] mb-2">
                    Sleep bestanden hier heen
                  </p>
                  <p className="text-sm text-[#71717a] mb-4">
                    of klik om ze te selecteren
                  </p>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload">
                    <Button
                      asChild
                      className="bg-[#6b7c4e] hover:bg-[#4f5d3a] text-white"
                    >
                      <span>Bestanden selecteren</span>
                    </Button>
                  </label>
                  <Button
                    onClick={handleMockUpload}
                    variant="outline"
                    className="ml-2"
                  >
                    Demo-bestand
                  </Button>
                </div>

                {state.sources.length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-bold text-[#18181b] mb-3">
                      Geüploade bronnen:
                    </h3>
                    <div className="space-y-2">
                      {state.sources.map((source) => (
                        <div
                          key={source.id}
                          className="flex items-center justify-between p-3 bg-white rounded-lg border border-[#e4e4e7]"
                        >
                          <div className="flex items-center gap-2">
                            <div className="text-xl">📄</div>
                            <span className="text-sm text-[#18181b]">
                              {source.name}
                            </span>
                          </div>
                          <div className="h-2 w-16 bg-[#e4e4e7] rounded-full overflow-hidden">
                            <div className="h-full w-full bg-[#6b7c4e]" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Mindmap Tool Settings */}
        {state.step === 3 && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-[#18181b] mb-6">
                Welke tools wil je gebruiken?
              </h2>

              {/* Mindmap visualization */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                {TOOLS.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => {
                      handleToolToggle(tool.id);
                      setSelectedTool(tool.id);
                    }}
                    className={`p-6 rounded-lg border-2 transition ${
                      state.selectedTools.includes(tool.id)
                        ? 'border-[#6b7c4e] bg-[#f5f3f0]'
                        : 'border-[#e4e4e7] hover:border-[#6b7c4e]'
                    }`}
                  >
                    <div className="text-4xl mb-2">{tool.icon}</div>
                    <div className="font-bold text-[#18181b]">{tool.name}</div>
                  </button>
                ))}
              </div>

              {/* Tool settings */}
              {selectedTool && (
                <div className="bg-white border border-[#e4e4e7] rounded-lg p-6">
                  <h3 className="font-bold text-[#18181b] mb-4">
                    Instellingen voor{' '}
                    {TOOLS.find((t) => t.id === selectedTool)?.name}
                  </h3>

                  <div className="space-y-4">
                    {/* Diepte */}
                    <div>
                      <label className="text-sm font-medium text-[#18181b]">
                        Diepte
                      </label>
                      <select className="w-full mt-1 p-2 border border-[#e4e4e7] rounded-lg">
                        <option>Kort overzicht</option>
                        <option>Gemiddeld</option>
                        <option>Uitgebreid</option>
                      </select>
                    </div>

                    {/* Moeilijkheid */}
                    <div>
                      <label className="text-sm font-medium text-[#18181b]">
                        Moeilijkheid
                      </label>
                      <select className="w-full mt-1 p-2 border border-[#e4e4e7] rounded-lg">
                        <option>Begrip</option>
                        <option>Gemiddeld</option>
                        <option>Examen-niveau</option>
                      </select>
                    </div>

                    {/* Vraagtypen */}
                    <div>
                      <label className="text-sm font-medium text-[#18181b] mb-2 block">
                        Vraagtypen
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input type="checkbox" defaultChecked className="mr-2" />
                          <span className="text-sm text-[#18181b]">
                            Meerkeuze
                          </span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" defaultChecked className="mr-2" />
                          <span className="text-sm text-[#18181b]">
                            Open vraag
                          </span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" />
                          <span className="text-sm text-[#18181b]">
                            Essay
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* Voorbeelden */}
                    <div>
                      <label className="flex items-center">
                        <input type="checkbox" defaultChecked className="mr-2" />
                        <span className="text-sm font-medium text-[#18181b]">
                          Voorbeelden toevoegen
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: Review & Generate */}
        {state.step === 4 && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-[#18181b] mb-6">
                Samenvatting
              </h2>

              <div className="bg-white rounded-lg border border-[#e4e4e7] p-6 space-y-6">
                <div>
                  <h3 className="font-bold text-[#18181b] text-sm">
                    Studyset naam
                  </h3>
                  <p className="text-lg text-[#6b7c4e]">{state.name}</p>
                </div>

                <div>
                  <h3 className="font-bold text-[#18181b] text-sm">Studiodagen</h3>
                  <p className="text-lg text-[#6b7c4e]">
                    {state.studyDays
                      .map((day) => DAY_LABELS[day])
                      .join(', ')}
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-[#18181b] text-sm">
                    Upload methode
                  </h3>
                  <p className="text-lg text-[#6b7c4e]">
                    {state.uploadType === 'agenda'
                      ? 'Agenda-Toets'
                      : state.uploadType === 'subject'
                      ? 'Vak/Hoofdstuk'
                      : 'Bestanden/Links'}
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-[#18181b] text-sm">
                    Bronnen ({state.sources.length})
                  </h3>
                  {state.sources.map((source) => (
                    <p key={source.id} className="text-lg text-[#6b7c4e]">
                      {source.name}
                    </p>
                  ))}
                </div>

                <div>
                  <h3 className="font-bold text-[#18181b] text-sm">Tools</h3>
                  <p className="text-lg text-[#6b7c4e]">
                    {state.selectedTools
                      .map(
                        (toolId) => TOOLS.find((t) => t.id === toolId)?.name
                      )
                      .join(', ')}
                  </p>
                </div>
              </div>

              <p className="text-sm text-[#71717a] mt-6 p-4 bg-[#f5f3f0] rounded-lg">
                Klik "Genereren" om je studyset aan te maken. Je kunt alles later
                nog wijzigen.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER BUTTONS */}
      <div className="border-t border-[#e4e4e7] bg-white px-8 py-6">
        <div className="mx-auto max-w-2xl flex gap-4">
          <Button
            onClick={handleBack}
            variant="outline"
            disabled={state.step === 1}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Terug
          </Button>

          {state.step < 4 ? (
            <Button
              onClick={handleNext}
              className="flex-1 bg-[#6b7c4e] hover:bg-[#4f5d3a] text-white flex items-center justify-center gap-2"
            >
              Volgende
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleGenerate}
              className="flex-1 bg-[#6b7c4e] hover:bg-[#4f5d3a] text-white"
            >
              Studyset aanmaken
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
