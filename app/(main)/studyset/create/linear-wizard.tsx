'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, ChevronRight, Upload, Calendar as CalendarIcon } from 'lucide-react';
import { CreateWizardState, Source, StudysetSettings } from '../types';

type WizardStep = 1 | 2 | 3 | 4 | 5;

const INITIAL_STATE: CreateWizardState = {
  step: 1,
  name: '',
  subject: '',
  studyDays: ['ma', 'di', 'do', 'za'],
  examDate: undefined,
  uploadType: 'custom',
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
    newCardsPerDay: 15,
    srsAlgorithm: 'sm2',
    dailyLimit: 30,
    folder: 'Algemeen',
    tags: [],
    isPinned: false,
    darkMode: false,
    textSize: 'normaal',
    offlineMode: false,
    exportFormats: [],
    allowCollaboration: false,
    autoSync: true,
    autoBackup: true,
  },
  selectedTools: [],
};

export default function LinearWizard() {
  const router = useRouter();
  const [state, setState] = useState<CreateWizardState>(INITIAL_STATE);
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    // Validate current step
    if (state.step === 1) {
      if (!state.name.trim()) {
        alert('Voer alstublieft een naam in');
        return;
      }
      if (!state.subject) {
        alert('Selecteer een vak');
        return;
      }
    }

    if (state.step === 2) {
      if (state.sources.length === 0) {
        alert('Voeg alstublieft minstens één bron toe');
        return;
      }
    }

    if (state.step < 5) {
      setState((s) => ({ ...s, step: (s.step + 1) as WizardStep }));
    } else {
      // Final step - create studyset
      setLoading(true);
      try {
        // TODO: API call to create studyset
        // const response = await fetch('/api/studysets', { method: 'POST', body: JSON.stringify(state) });
        // if (!response.ok) throw new Error('Failed to create studyset');
        // const result = await response.json();
        // router.push(`/studyset/${result.id}`);

        console.log('Creating studyset:', state);
        alert('Studyset gemaakt! (Mock)');
        router.push('/studyset');
      } catch (error) {
        alert('Fout bij aanmaken: ' + (error instanceof Error ? error.message : 'Unknown error'));
      } finally {
        setLoading(false);
      }
    }
  };

  const handlePrev = () => {
    if (state.step > 1) {
      setState((s) => ({ ...s, step: (s.step - 1) as WizardStep }));
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      {/* HEADER */}
      <div className="border-b border-[#e4e4e7] bg-white px-8 py-6">
        <h1 className="text-2xl font-bold">Lineaire Wizard</h1>
        <p className="mt-1 text-sm text-[#71717a]">Stap {state.step}/5</p>
        <div className="mt-4 flex gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition ${
                s <= state.step ? 'bg-[#6b7c4e]' : 'bg-[#e4e4e7]'
              }`}
            />
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div className="mx-auto max-w-2xl px-8 py-12">
        {state.step === 1 && <Step1 state={state} setState={setState} />}
        {state.step === 2 && <Step2 state={state} setState={setState} />}
        {state.step === 3 && <Step3 state={state} setState={setState} />}
        {state.step === 4 && <Step4 state={state} setState={setState} />}
        {state.step === 5 && <Step5 state={state} />}
      </div>

      {/* FOOTER */}
      <div className="border-t border-[#e4e4e7] bg-white px-8 py-6">
        <div className="mx-auto max-w-2xl flex justify-between gap-4">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={state.step === 1}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Vorige
          </Button>

          <Button
            onClick={handleNext}
            disabled={loading}
            className="flex items-center gap-2 bg-[#6b7c4e] text-white hover:bg-[#4f5d3a]"
          >
            {state.step === 5 ? 'Studyset Aanmaken' : 'Volgende'}
            {state.step < 5 && <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

// STEP 1: Naam + Calendar
function Step1({
  state,
  setState,
}: {
  state: CreateWizardState;
  setState: (s: CreateWizardState) => void;
}) {
  const days = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];
  const dayNames = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];

  return (
    <div className="space-y-8">
      <div>
        <Label className="text-sm font-bold uppercase">Naam van je studyset</Label>
        <Input
          value={state.name}
          onChange={(e) => setState({ ...state, name: e.target.value })}
          placeholder="bijv. Biologie H4-H6 Celbiologie"
          className="mt-2"
        />
      </div>

      <div>
        <Label className="text-sm font-bold uppercase">Vak</Label>
        <select
          value={state.subject}
          onChange={(e) => setState({ ...state, subject: e.target.value })}
          className="mt-2 w-full rounded-lg border border-[#e4e4e7] px-4 py-2"
        >
          <option value="">Selecteer een vak...</option>
          <option value="Biologie">Biologie</option>
          <option value="Frans">Frans</option>
          <option value="Wiskunde">Wiskunde</option>
          <option value="Geschiedenis">Geschiedenis</option>
          <option value="Nederlands">Nederlands</option>
          <option value="Engels">Engels</option>
          <option value="Scheikunde">Scheikunde</option>
          <option value="Natuurkunde">Natuurkunde</option>
        </select>
      </div>

      <div>
        <Label className="text-sm font-bold uppercase">Op welke dagen kan je studeren?</Label>
        <p className="mt-1 text-xs text-[#71717a]">Geen vaste tijden - je bepaalt je eigen tempo</p>
        <div className="mt-3 grid grid-cols-7 gap-2">
          {days.map((day, idx) => (
            <button
              key={day}
              onClick={() => {
                const updated = state.studyDays.includes(day)
                  ? state.studyDays.filter((d) => d !== day)
                  : [...state.studyDays, day];
                setState({ ...state, studyDays: updated });
              }}
              className={`py-2 px-1 rounded-lg text-sm font-semibold transition ${
                state.studyDays.includes(day)
                  ? 'bg-[#6b7c4e] text-white'
                  : 'bg-[#e4e4e7] text-[#18181b] hover:bg-[#d4d4d8]'
              }`}
              title={dayNames[idx]}
            >
              {day.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-sm font-bold uppercase">Examendatum (optioneel)</Label>
        <Input
          type="date"
          value={state.examDate || ''}
          onChange={(e) => setState({ ...state, examDate: e.target.value })}
          className="mt-2"
        />
        {state.examDate && (
          <p className="mt-2 text-xs text-[#71717a]">
            Je hebt {Math.ceil((new Date(state.examDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} dagen
          </p>
        )}
      </div>
    </div>
  );
}

// STEP 2: Upload (3 Opties)
function Step2({
  state,
  setState,
}: {
  state: CreateWizardState;
  setState: (s: CreateWizardState) => void;
}) {
  const [dragActive, setDragActive] = useState(false);

  return (
    <div className="space-y-8">
      <div>
        <Label className="text-sm font-bold uppercase mb-3 block">Kies upload-optie</Label>
        <div className="grid grid-cols-1 gap-3">
          {[
            { id: 'agenda', name: '📅 Agenda-Toets', desc: 'Gekoppeld aan je agenda toets' },
            { id: 'subject', name: '📚 Vak / Hoofdstuk / Paragrafen', desc: 'Kies uit je vak structuur' },
            { id: 'custom', name: '📎 Zelf Upload', desc: 'Files, links, fotos, audio, YouTube' },
          ].map((opt) => (
            <button
              key={opt.id}
              onClick={() => setState({ ...state, uploadType: opt.id as any })}
              className={`p-4 rounded-lg border-2 text-left transition ${
                state.uploadType === opt.id
                  ? 'border-[#6b7c4e] bg-[#f5f3f0]'
                  : 'border-[#e4e4e7] bg-white hover:border-[#6b7c4e]'
              }`}
            >
              <div className="font-bold text-[#18181b]">{opt.name}</div>
              <div className="text-sm text-[#71717a] mt-1">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* CUSTOM UPLOAD AREA */}
      {state.uploadType === 'custom' && (
        <div>
          <Label className="text-sm font-bold uppercase">Voeg bestanden toe</Label>
          <div
            className={`mt-3 border-2 border-dashed rounded-lg p-8 text-center transition cursor-pointer ${
              dragActive ? 'border-[#6b7c4e] bg-[#f5f3f0]' : 'border-[#e4e4e7] hover:border-[#6b7c4e]'
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              // Handle file drop
              console.log('Files dropped:', e.dataTransfer.files);
              // TODO: Add file handling
            }}
          >
            <Upload className="h-8 w-8 mx-auto text-[#6b7c4e] mb-2" />
            <p className="font-semibold text-[#18181b]">Sleep bestanden hierheen</p>
            <p className="text-sm text-[#71717a] mt-1">of klik om te selecteren</p>
            <p className="text-xs text-[#71717a] mt-3">PDF, Word, PPT, fotos, YouTube links, MP3 audio, etc.</p>
          </div>

          {state.sources.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-bold text-[#18181b]">Toegevoegd ({state.sources.length}):</p>
              {state.sources.map((src, idx) => (
                <div key={idx} className="flex items-center justify-between bg-[#f5f3f0] p-3 rounded-lg text-sm">
                  <div>{src.name}</div>
                  <button
                    onClick={() => setState({ ...state, sources: state.sources.filter((_, i) => i !== idx) })}
                    className="text-red-600 hover:text-red-700 font-semibold"
                  >
                    Verwijder
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AGENDA OPTION */}
      {state.uploadType === 'agenda' && (
        <div>
          <Label className="text-sm font-bold uppercase">Selecteer toets</Label>
          <select className="mt-2 w-full rounded-lg border border-[#e4e4e7] px-4 py-2">
            <option>SO Biologie - 19 juni</option>
            <option>PW Frans - 12 juni</option>
            <option>Proefwerk Wiskunde - 25 juni</option>
          </select>
          <p className="mt-3 text-xs text-[#71717a]">
            Gekoppelde materiaal zal automatisch worden gebruikt
          </p>
        </div>
      )}

      {/* SUBJECT OPTION */}
      {state.uploadType === 'subject' && (
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-bold uppercase">Selecteer hoofdstuk</Label>
            <select className="mt-2 w-full rounded-lg border border-[#e4e4e7] px-4 py-2">
              <option>Hfdstk 4: Celmembraan</option>
              <option>Hfdstk 5: Celdeling</option>
              <option>Hfdstk 6: Erfelijkheid</option>
            </select>
          </div>
          <div>
            <Label className="text-sm font-bold uppercase">Selecteer paragrafen</Label>
            <div className="mt-2 space-y-2">
              {['4.1 Opbouw', '4.2 Functies', '4.3 Transportmechanismen'].map((para) => (
                <label key={para} className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm">{para}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// STEP 3: Settings (Grounding + Output)
function Step3({
  state,
  setState,
}: {
  state: CreateWizardState;
  setState: (s: CreateWizardState) => void;
}) {
  return (
    <div className="space-y-8">
      {/* GROUNDING SECTION */}
      <div className="bg-[#f5f3f0] p-6 rounded-lg">
        <h2 className="text-lg font-bold text-[#18181b] mb-4">🔒 Grounding / Accuraatheid</h2>
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={state.settings?.groundingOnly}
              onChange={(e) =>
                setState({
                  ...state,
                  settings: { ...state.settings, groundingOnly: e.target.checked },
                })
              }
              className="w-4 h-4 rounded cursor-pointer"
            />
            <span className="text-sm font-medium text-[#18181b]">
              Alleen mijn eigen bronnen gebruiken
            </span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={state.settings?.showCitations}
              onChange={(e) =>
                setState({
                  ...state,
                  settings: { ...state.settings, showCitations: e.target.checked },
                })
              }
              className="w-4 h-4 rounded cursor-pointer"
            />
            <span className="text-sm font-medium text-[#18181b]">
              Citaties & paginanummers tonen
            </span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={state.settings?.confidenceIndicator}
              onChange={(e) =>
                setState({
                  ...state,
                  settings: { ...state.settings, confidenceIndicator: e.target.checked },
                })
              }
              className="w-4 h-4 rounded cursor-pointer"
            />
            <span className="text-sm font-medium text-[#18181b]">
              Confidence-indicator (% zekerheid)
            </span>
          </label>
        </div>
      </div>

      {/* OUTPUT CONTROL SECTION */}
      <div className="bg-[#f5f3f0] p-6 rounded-lg">
        <h2 className="text-lg font-bold text-[#18181b] mb-4">🎛️ Output-Controle</h2>
        <div className="space-y-5">
          <div>
            <Label className="text-sm font-bold uppercase">Diepte / Lengte</Label>
            <select
              value={state.settings?.outputDepth}
              onChange={(e) =>
                setState({
                  ...state,
                  settings: { ...state.settings, outputDepth: e.target.value as any },
                })
              }
              className="mt-2 w-full rounded-lg border border-[#e4e4e7] px-4 py-2 text-sm"
            >
              <option value="kort">Kort overzicht</option>
              <option value="gemiddeld">Gemiddeld</option>
              <option value="uitgebreid">Uitgebreid</option>
            </select>
          </div>

          <div>
            <Label className="text-sm font-bold uppercase">Moeilijkheidsgraad</Label>
            <select
              value={state.settings?.difficulty}
              onChange={(e) =>
                setState({
                  ...state,
                  settings: { ...state.settings, difficulty: e.target.value as any },
                })
              }
              className="mt-2 w-full rounded-lg border border-[#e4e4e7] px-4 py-2 text-sm"
            >
              <option value="basis">Basis / Begrip</option>
              <option value="gemiddeld">Gemiddeld</option>
              <option value="examen">Examenniveau</option>
            </select>
          </div>

          <div>
            <Label className="text-sm font-bold uppercase">Toon / Modus</Label>
            <select
              value={state.settings?.tone}
              onChange={(e) =>
                setState({
                  ...state,
                  settings: { ...state.settings, tone: e.target.value as any },
                })
              }
              className="mt-2 w-full rounded-lg border border-[#e4e4e7] px-4 py-2 text-sm"
            >
              <option value="tutor">Tutor-stijl (uitleggerig)</option>
              <option value="samenvatting">Samenvatting (bondig)</option>
              <option value="trainer">Trainer (examen-voorbereiding)</option>
            </select>
          </div>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={state.settings?.voorbeelden}
              onChange={(e) =>
                setState({
                  ...state,
                  settings: { ...state.settings, voorbeelden: e.target.checked },
                })
              }
              className="w-4 h-4 rounded cursor-pointer"
            />
            <span className="text-sm font-medium text-[#18181b]">
              Voorbeelden opnemen
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}

// STEP 4: Tool Mindmap + Settings
function Step4({
  state,
  setState,
}: {
  state: CreateWizardState;
  setState: (s: CreateWizardState) => void;
}) {
  const tools = ['Quiz', 'Flashcards', 'Notes', 'Video', 'Mind Map', 'Whiteboard'];

  return (
    <div className="space-y-8">
      <div>
        <Label className="text-sm font-bold uppercase block mb-4">Welke tools wil je gebruiken?</Label>
        <div className="grid grid-cols-3 gap-3">
          {tools.map((tool) => (
            <button
              key={tool}
              onClick={() => {
                const updated = state.selectedTools.includes(tool)
                  ? state.selectedTools.filter((t) => t !== tool)
                  : [...state.selectedTools, tool];
                setState({ ...state, selectedTools: updated });
              }}
              className={`py-3 rounded-lg border-2 font-semibold transition ${
                state.selectedTools.includes(tool)
                  ? 'border-[#6b7c4e] bg-[#6b7c4e] text-white'
                  : 'border-[#e4e4e7] bg-white text-[#18181b] hover:border-[#6b7c4e]'
              }`}
            >
              {tool}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-[#71717a]">
          Geselecteerd: {state.selectedTools.length > 0 ? state.selectedTools.join(', ') : 'geen'}
        </p>
      </div>

      <div className="bg-[#f5f3f0] p-6 rounded-lg">
        <h2 className="text-lg font-bold text-[#18181b] mb-4">⚙️ SRS Instellingen</h2>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-bold uppercase">Nieuwe kaarten per dag</Label>
            <Input
              type="number"
              value={state.settings?.newCardsPerDay}
              onChange={(e) =>
                setState({
                  ...state,
                  settings: { ...state.settings, newCardsPerDay: parseInt(e.target.value) },
                })
              }
              min="5"
              max="50"
              className="mt-2"
            />
          </div>
          <div>
            <Label className="text-sm font-bold uppercase">Daglimiet kaarten</Label>
            <Input
              type="number"
              value={state.settings?.dailyLimit}
              onChange={(e) =>
                setState({
                  ...state,
                  settings: { ...state.settings, dailyLimit: parseInt(e.target.value) },
                })
              }
              min="10"
              max="100"
              className="mt-2"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// STEP 5: Review
function Step5({ state }: { state: CreateWizardState }) {
  return (
    <div className="space-y-6">
      <div className="bg-[#e8f5e9] border-l-4 border-[#4caf50] p-6 rounded-lg">
        <h2 className="text-lg font-bold text-[#2e7d32] mb-4">✓ Alles ingesteld!</h2>
        <div className="space-y-3 text-sm text-[#558b2f]">
          <p>
            <strong>Naam:</strong> {state.name}
          </p>
          <p>
            <strong>Vak:</strong> {state.subject}
          </p>
          <p>
            <strong>Studiedagen:</strong> {state.studyDays.join(', ')}
          </p>
          <p>
            <strong>Bronnen:</strong> {state.sources.length}
          </p>
          <p>
            <strong>Tools:</strong> {state.selectedTools.join(', ') || 'Nog selecteren'}
          </p>
          <p>
            <strong>Grounding:</strong> {state.settings?.groundingOnly ? 'Alleen bronnen' : 'Met externe kennis'}
          </p>
          <p>
            <strong>Output:</strong> {state.settings?.outputDepth} / {state.settings?.difficulty}
          </p>
        </div>
      </div>

      <div className="bg-[#f5f3f0] p-6 rounded-lg">
        <p className="text-sm text-[#71717a]">
          Na aanmaken kun je alle instellingen nog aanpassen in je studyset-dashboard. AI zal automatisch je set
          genereren op basis van deze instellingen.
        </p>
      </div>
    </div>
  );
}
