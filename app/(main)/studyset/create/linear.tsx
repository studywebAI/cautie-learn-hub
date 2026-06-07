'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

type Step = 1 | 2 | 3 | 4 | 5 | 6;

interface FormData {
  // Step 1: Naam + Calendar
  name: string;
  subject: string;
  studyDays: string[];
  examDate?: string;

  // Step 2: Upload (3 opties)
  uploadType: 'agenda' | 'subject' | 'custom';
  files: string[];

  // Step 3: Grounding + Output + Bewerken
  groundingOnly: boolean;
  showCitations: boolean;
  confidenceIndicator: boolean;
  outputDepth: 'kort' | 'gemiddeld' | 'uitgebreid';
  difficulty: 'basis' | 'gemiddeld' | 'examen';
  outputLanguage: string;
  tone: 'tutor' | 'samenvatting' | 'trainer';
  doelgroep: string;
  voorbeelden: boolean;
  formaliteit: 'beknopt' | 'standaard' | 'uitleggerig';

  // Step 4: SRS + Organisatie + Accessibility
  newCardsPerDay: number;
  srsAlgorithm: 'sm2' | 'lightweight';
  daglimit: number;
  folder: string;
  tags: string[];
  pinned: boolean;
  darkMode: boolean;
  textSize: 'klein' | 'normaal' | 'groot';
  offlineMode: boolean;

  // Step 5: Export + Delen + Account + Analytics
  exportFormats: string[];
  shareType: 'privé' | 'publiek';
  allowCollaboration: boolean;
  autoSync: boolean;
  autoBackup: boolean;

  // Step 6: Review
}

const INITIAL_DATA: FormData = {
  name: '',
  subject: '',
  studyDays: ['ma', 'di', 'do', 'za'],
  uploadType: 'agenda',
  files: [],
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
  daglimit: 30,
  folder: 'Algemeen',
  tags: [],
  pinned: false,
  darkMode: false,
  textSize: 'normaal',
  offlineMode: false,
  exportFormats: [],
  shareType: 'privé',
  allowCollaboration: false,
  autoSync: true,
  autoBackup: true,
};

export default function LinearWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [data, setData] = useState<FormData>(INITIAL_DATA);

  const handleNext = () => {
    // Validate current step
    if (step === 1 && !data.name.trim()) {
      alert('Voer alstublieft een naam in');
      return;
    }
    if (step === 2 && data.files.length === 0) {
      alert('Voeg alstublieft minstens één bestand toe');
      return;
    }
    if (step < 6) {
      setStep((step + 1) as Step);
    } else {
      // Finish
      router.push(`/studyset`);
    }
  };

  const handlePrev = () => {
    if (step > 1) {
      setStep((step - 1) as Step);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      {/* HEADER */}
      <div className="border-b border-[#e4e4e7] bg-white px-6 py-6">
        <h1 className="text-2xl font-bold">Lineaire Wizard</h1>
        <p className="mt-1 text-sm text-[#71717a]">Stap {step}/6 · {getStepTitle(step)}</p>
        <div className="mt-4 flex gap-1">
          {[1, 2, 3, 4, 5, 6].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full ${
                s <= step ? 'bg-[#6b7c4e]' : 'bg-[#e4e4e7]'
              }`}
            />
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div className="mx-auto max-w-2xl px-6 py-8">
        {/* STEP 1: Naam + Calendar */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <Label htmlFor="name">Naam van de studyset</Label>
              <Input
                id="name"
                placeholder="Bijv. Biologie H4-H6 Celbiologie"
                value={data.name}
                onChange={(e) => setData({ ...data, name: e.target.value })}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="subject">Vak</Label>
              <select
                id="subject"
                value={data.subject}
                onChange={(e) => setData({ ...data, subject: e.target.value })}
                className="mt-2 w-full rounded-lg border border-[#e4e4e7] px-3 py-2"
              >
                <option value="">Selecteer een vak</option>
                <option value="Biologie">Biologie</option>
                <option value="Frans">Frans</option>
                <option value="Wiskunde">Wiskunde</option>
                <option value="Geschiedenis">Geschiedenis</option>
              </select>
            </div>

            <div>
              <Label>Op welke dagen mag Cautie je leren inplannen?</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'].map((day) => (
                  <button
                    key={day}
                    onClick={() =>
                      setData({
                        ...data,
                        studyDays: data.studyDays.includes(day)
                          ? data.studyDays.filter((d) => d !== day)
                          : [...data.studyDays, day],
                      })
                    }
                    className={`rounded-full px-3 py-1 text-sm font-semibold ${
                      data.studyDays.includes(day)
                        ? 'bg-[#6b7c4e] text-white'
                        : 'bg-[#e4e4e7] text-[#18181b]'
                    }`}
                  >
                    {day.charAt(0).toUpperCase() + day.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="examDate">Examendatum (optioneel)</Label>
              <Input
                id="examDate"
                type="date"
                value={data.examDate || ''}
                onChange={(e) => setData({ ...data, examDate: e.target.value })}
                className="mt-2"
              />
            </div>
          </div>
        )}

        {/* STEP 2: Upload (3 opties) */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <Label>Kies upload-optie</Label>
              <div className="mt-3 grid grid-cols-1 gap-3">
                {(['agenda', 'subject', 'custom'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setData({ ...data, uploadType: type })}
                    className={`rounded-lg border-2 p-4 text-left transition ${
                      data.uploadType === type
                        ? 'border-[#6b7c4e] bg-[#f5f3f0]'
                        : 'border-[#e4e4e7] bg-white'
                    }`}
                  >
                    {type === 'agenda' && <h3 className="font-bold">📅 Agenda-toets</h3>}
                    {type === 'subject' && <h3 className="font-bold">📚 Vak → Hoofdstuk → Paragrafen</h3>}
                    {type === 'custom' && <h3 className="font-bold">📎 Eigen Materiaal</h3>}
                    <p className="mt-1 text-sm text-[#71717a]">
                      {type === 'agenda' && 'Gekoppeld aan je agenda-toets'}
                      {type === 'subject' && 'Zelf bladeren door je vakkenstructuur'}
                      {type === 'custom' && 'Bestand, foto, link, audio, video, YouTube'}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Voeg bestanden toe</Label>
              <div className="mt-2 rounded-lg border-2 border-dashed border-[#e4e4e7] p-4 text-center">
                <p className="text-sm text-[#71717a]">Sleep bestanden hierheen of klik om te uploaden</p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Grounding + Output */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="rounded-lg bg-[#f5f3f0] p-4">
              <h3 className="font-bold">🔒 Grounding / Accuraatheid</h3>
              <div className="mt-3 space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={data.groundingOnly}
                    onChange={(e) => setData({ ...data, groundingOnly: e.target.checked })}
                  />
                  <span className="text-sm">Alleen mijn eigen bronnen gebruiken</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={data.showCitations}
                    onChange={(e) => setData({ ...data, showCitations: e.target.checked })}
                  />
                  <span className="text-sm">Citaties &amp; paginanummers tonen</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={data.confidenceIndicator}
                    onChange={(e) => setData({ ...data, confidenceIndicator: e.target.checked })}
                  />
                  <span className="text-sm">Confidence-indicator (% zekerheid)</span>
                </label>
              </div>
            </div>

            <div className="rounded-lg bg-[#f5f3f0] p-4">
              <h3 className="font-bold">🎛️ Output-controle</h3>
              <div className="mt-3 space-y-3">
                <div>
                  <Label>Diepte/lengte</Label>
                  <select
                    value={data.outputDepth}
                    onChange={(e) => setData({ ...data, outputDepth: e.target.value as any })}
                    className="mt-1 w-full rounded-lg border border-[#e4e4e7] px-3 py-2 text-sm"
                  >
                    <option value="kort">Kort overzicht</option>
                    <option value="gemiddeld">Gemiddeld</option>
                    <option value="uitgebreid">Uitgebreid</option>
                  </select>
                </div>
                <div>
                  <Label>Moeilijkheidsgraad</Label>
                  <select
                    value={data.difficulty}
                    onChange={(e) => setData({ ...data, difficulty: e.target.value as any })}
                    className="mt-1 w-full rounded-lg border border-[#e4e4e7] px-3 py-2 text-sm"
                  >
                    <option value="basis">Basis / Begrip</option>
                    <option value="gemiddeld">Gemiddeld</option>
                    <option value="examen">Examenniveau</option>
                  </select>
                </div>
                <div>
                  <Label>Toon / Modus</Label>
                  <select
                    value={data.tone}
                    onChange={(e) => setData({ ...data, tone: e.target.value as any })}
                    className="mt-1 w-full rounded-lg border border-[#e4e4e7] px-3 py-2 text-sm"
                  >
                    <option value="tutor">Tutor-stijl (uitleggerig)</option>
                    <option value="samenvatting">Samenvatting (bondig)</option>
                    <option value="trainer">Trainer (examen-voorbereiding)</option>
                  </select>
                </div>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={data.voorbeelden}
                    onChange={(e) => setData({ ...data, voorbeelden: e.target.checked })}
                  />
                  <span className="text-sm">Voorbeelden opnemen</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: SRS + Organisatie + Accessibility */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="rounded-lg bg-[#f5f3f0] p-4">
              <h3 className="font-bold">🔄 Spaced Repetition (SRS)</h3>
              <div className="mt-3 space-y-3">
                <div>
                  <Label>Nieuwe kaarten per sessie</Label>
                  <Input
                    type="number"
                    value={data.newCardsPerDay}
                    onChange={(e) => setData({ ...data, newCardsPerDay: parseInt(e.target.value) })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>SRS-algoritme</Label>
                  <select
                    value={data.srsAlgorithm}
                    onChange={(e) => setData({ ...data, srsAlgorithm: e.target.value as any })}
                    className="mt-1 w-full rounded-lg border border-[#e4e4e7] px-3 py-2 text-sm"
                  >
                    <option value="sm2">SM-2 (standaard)</option>
                    <option value="lightweight">Lightweight</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-[#f5f3f0] p-4">
              <h3 className="font-bold">📂 Organisatie</h3>
              <div className="mt-3 space-y-3">
                <div>
                  <Label>Map</Label>
                  <select
                    value={data.folder}
                    onChange={(e) => setData({ ...data, folder: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-[#e4e4e7] px-3 py-2 text-sm"
                  >
                    <option value="Algemeen">Algemeen</option>
                    <option value="School">School</option>
                    <option value="Zelf">Zelf</option>
                  </select>
                </div>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={data.pinned}
                    onChange={(e) => setData({ ...data, pinned: e.target.checked })}
                  />
                  <span className="text-sm">Vastpinnen aan dashboard</span>
                </label>
              </div>
            </div>

            <div className="rounded-lg bg-[#f5f3f0] p-4">
              <h3 className="font-bold">♿ Accessibility</h3>
              <div className="mt-3 space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={data.darkMode}
                    onChange={(e) => setData({ ...data, darkMode: e.target.checked })}
                  />
                  <span className="text-sm">Dark mode</span>
                </label>
                <div>
                  <Label>Lettergrootte</Label>
                  <select
                    value={data.textSize}
                    onChange={(e) => setData({ ...data, textSize: e.target.value as any })}
                    className="mt-1 w-full rounded-lg border border-[#e4e4e7] px-3 py-2 text-sm"
                  >
                    <option value="klein">Klein</option>
                    <option value="normaal">Normaal</option>
                    <option value="groot">Groot</option>
                  </select>
                </div>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={data.offlineMode}
                    onChange={(e) => setData({ ...data, offlineMode: e.target.checked })}
                  />
                  <span className="text-sm">Offline mode beschikbaar</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Export + Delen + Account */}
        {step === 5 && (
          <div className="space-y-6">
            <div className="rounded-lg bg-[#f5f3f0] p-4">
              <h3 className="font-bold">📤 Export-formaten</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {['Anki', 'CSV', 'PDF', 'Notion', 'Markdown'].map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() =>
                      setData({
                        ...data,
                        exportFormats: data.exportFormats.includes(fmt)
                          ? data.exportFormats.filter((f) => f !== fmt)
                          : [...data.exportFormats, fmt],
                      })
                    }
                    className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                      data.exportFormats.includes(fmt)
                        ? 'bg-[#6b7c4e] text-white'
                        : 'bg-white text-[#18181b]'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-[#f5f3f0] p-4">
              <h3 className="font-bold">🤝 Delen &amp; Samenwerken</h3>
              <div className="mt-3 space-y-3">
                <div>
                  <Label>Zichtbaarheid</Label>
                  <select
                    value={data.shareType}
                    onChange={(e) => setData({ ...data, shareType: e.target.value as any })}
                    className="mt-1 w-full rounded-lg border border-[#e4e4e7] px-3 py-2 text-sm"
                  >
                    <option value="privé">Privé (alleen voor mij)</option>
                    <option value="publiek">Publiek (iedereen mag zien)</option>
                  </select>
                </div>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={data.allowCollaboration}
                    onChange={(e) => setData({ ...data, allowCollaboration: e.target.checked })}
                  />
                  <span className="text-sm">Real-time samenwerken toestaan</span>
                </label>
              </div>
            </div>

            <div className="rounded-lg bg-[#f5f3f0] p-4">
              <h3 className="font-bold">👤 Account &amp; Systeem</h3>
              <div className="mt-3 space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={data.autoSync}
                    onChange={(e) => setData({ ...data, autoSync: e.target.checked })}
                  />
                  <span className="text-sm">Auto-sync (desktop/web/mobiel)</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={data.autoBackup}
                    onChange={(e) => setData({ ...data, autoBackup: e.target.checked })}
                  />
                  <span className="text-sm">Auto-backup naar cloud</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: Review */}
        {step === 6 && (
          <div className="space-y-4">
            <div className="rounded-lg bg-[#e8f5e9] p-4">
              <h3 className="font-bold text-[#2e7d32]">✓ Klaar!</h3>
              <p className="mt-2 text-sm text-[#558b2f]">Je studyset is ingesteld met:</p>
              <ul className="mt-2 space-y-1 text-sm text-[#558b2f]">
                <li>📚 {data.name || 'Naamloze set'}</li>
                <li>📅 {data.studyDays.length} studiedagen per week</li>
                <li>📎 {data.files.length || 'Meerdere'} bron(nen)</li>
                <li>🔒 Grounding: {data.groundingOnly ? 'Aan' : 'Uit'}</li>
                <li>🎛️ Output-controle: {data.outputDepth}</li>
              </ul>
            </div>

            <div>
              <p className="text-sm text-[#71717a]">
                Je kan alle instellingen later nog aanpassen in je studyset-dashboard.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="border-t border-[#e4e4e7] bg-white px-6 py-4">
        <div className="mx-auto max-w-2xl flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={step === 1}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Vorige
          </Button>

          <Button
            onClick={handleNext}
            className="flex items-center gap-2 bg-[#6b7c4e] text-white hover:bg-[#4f5d3a]"
          >
            {step === 6 ? (
              <>
                <Check className="h-4 w-4" />
                Klaar
              </>
            ) : (
              <>
                Volgende
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function getStepTitle(step: Step): string {
  const titles = {
    1: 'Naam &amp; Kalender',
    2: 'Upload (3 opties)',
    3: 'Grounding &amp; Output',
    4: 'SRS, Organisatie &amp; Accessibility',
    5: 'Export, Delen &amp; Account',
    6: 'Review &amp; Klaar',
  };
  return titles[step];
}
