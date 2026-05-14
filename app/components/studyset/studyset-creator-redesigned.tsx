'use client';

import { useState, useContext } from 'react';
import { cn } from '@/lib/utils';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';

type Step = 1 | 2 | 3 | 4;
type LayoutType = 'flashcards' | 'quiz' | 'guide' | 'mixed';

type Flashcard = {
  id: string;
  front: string;
  back: string;
};

type StudysetForm = {
  name: string;
  description: string;
  subject: string;
  layout: LayoutType;
  cards: Flashcard[];
  sequential: boolean;
  randomized: boolean;
  targetPercent: number;
  showProgress: boolean;
  feedbackType: 'immediate' | 'after' | 'none';
  trackProgress: boolean;
  notifyOnStruggles: boolean;
  autoGrade: boolean;
  passingGrade: number;
  assignToClass: boolean;
};

const SUBJECTS = ['Biology', 'Chemistry', 'Physics', 'Mathematics', 'English', 'History'];

export function StudysetCreatorRedesigned({
  classId,
  onClose,
}: {
  classId: string;
  onClose: () => void;
}) {
  const ctx = useContext(AppContext) as AppContextType | null;
  const isDutch = ctx?.language === 'nl';

  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<StudysetForm>({
    name: '',
    description: '',
    subject: '',
    layout: 'flashcards',
    cards: [],
    sequential: false,
    randomized: false,
    targetPercent: 80,
    showProgress: true,
    feedbackType: 'immediate',
    trackProgress: true,
    notifyOnStruggles: false,
    autoGrade: false,
    passingGrade: 75,
    assignToClass: true,
  });

  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!form.name.trim() || form.cards.length === 0) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/classes/${classId}/studysets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.name.trim(),
          description: form.description.trim(),
          subject: form.subject,
          layout: form.layout,
          cards: form.cards,
          settings: {
            sequential: form.sequential,
            randomized: form.randomized,
            target_percent: form.targetPercent,
            show_progress: form.showProgress,
            feedback_type: form.feedbackType,
            track_progress: form.trackProgress,
            notify_struggles: form.notifyOnStruggles,
            auto_grade: form.autoGrade,
            passing_grade: form.passingGrade,
          },
          assign_to_class: form.assignToClass,
        }),
      });
      if (res.ok) {
        onClose();
      }
    } catch (e) {
    } finally {
      setCreating(false);
    }
  }

  const steps = [
    { num: 1, label: isDutch ? 'Naam' : 'Name' },
    { num: 2, label: isDutch ? 'Inhoud' : 'Content' },
    { num: 3, label: isDutch ? 'Instellingen' : 'Settings' },
    { num: 4, label: isDutch ? 'Controleren' : 'Review' },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[hsl(var(--surface-1))] rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 bg-white dark:bg-[hsl(var(--surface-1))]">
          <div>
            <h2 className="text-[18px] font-semibold text-foreground">
              {isDutch ? 'Nieuw Studieset' : 'New Studyset'}
            </h2>
            <p className="text-[12px] text-muted-foreground mt-1">
              {isDutch ? `Stap ${step} van 4` : `Step ${step} of 4`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-[#7f8962] transition-all"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-500 text-foreground mb-2">
                  {isDutch ? 'Naam' : 'Name'}
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder={isDutch ? 'bijv. Hoofstuk 5: Fotosynthese' : 'e.g. Chapter 5: Photosynthesis'}
                  className="w-full px-3 py-2 text-[13px] border border-border rounded-md bg-background focus:outline-none focus:border-[#7f8962]"
                  autoFocus
                />
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  💡 {isDutch ? 'Dit is wat students zien als tabblad. Maak het duidelijk en spannend.' : 'This is what students see as a tab name. Make it clear and engaging.'}
                </p>
              </div>

              <div>
                <label className="block text-[13px] font-500 text-foreground mb-2">
                  {isDutch ? 'Beschrijving' : 'Description'}
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder={isDutch ? 'Leer de stappen van fotosynthese...' : 'Learn the steps of photosynthesis...'}
                  className="w-full px-3 py-2 text-[13px] border border-border rounded-md bg-background focus:outline-none focus:border-[#7f8962] resize-none"
                  rows={3}
                />
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  💡 {isDutch ? 'Zichtbaar in kaartweergave. Vertel students waarom dit belangrijk is.' : 'Visible in card view. Tell students why this matters.'}
                </p>
              </div>

              <div>
                <label className="block text-[13px] font-500 text-foreground mb-2">
                  {isDutch ? 'Onderwerp' : 'Subject'}
                </label>
                <select
                  value={form.subject}
                  onChange={e => setForm({ ...form, subject: e.target.value })}
                  className="w-full px-3 py-2 text-[13px] border border-border rounded-md bg-background focus:outline-none focus:border-[#7f8962]"
                >
                  <option value="">— {isDutch ? 'Selecteer' : 'Select'} —</option>
                  {SUBJECTS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  💡 {isDutch ? 'Gebruikt in cijfers en analytische rapporten.' : 'Used in grades and analytics reports.'}
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-500 text-foreground mb-2">
                  {isDutch ? 'Layout stijl' : 'Layout Style'}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'flashcards' as const, label: isDutch ? 'Flashcards' : 'Flashcards', icon: '📝' },
                    { value: 'quiz' as const, label: isDutch ? 'Quiz' : 'Quiz', icon: '✍️' },
                    { value: 'guide' as const, label: isDutch ? 'Gids' : 'Guide', icon: '📚' },
                    { value: 'mixed' as const, label: isDutch ? 'Gemengd' : 'Mixed', icon: '🎥' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setForm({ ...form, layout: opt.value })}
                      className={cn(
                        'p-3 rounded-lg border-2 transition-colors text-center',
                        form.layout === opt.value
                          ? 'border-[#7f8962] bg-[#7f8962]/10'
                          : 'border-border hover:border-[#7f8962]'
                      )}
                    >
                      <div className="text-2xl mb-2">{opt.icon}</div>
                      <p className="text-[12px] font-500 text-foreground">{opt.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-500 text-foreground mb-3">
                  {isDutch ? 'Inhoud toevoegen' : 'Add Content'}
                </label>

                {/* Cards list */}
                <div className="space-y-2 mb-3">
                  {form.cards.map((card, idx) => (
                    <div key={card.id} className="flex gap-2 items-start">
                      <div className="flex-1 p-3 rounded-lg border border-border bg-muted/40">
                        <p className="text-[10px] text-muted-foreground font-600 uppercase mb-1">
                          {isDutch ? 'Card' : 'Card'} {idx + 1}
                        </p>
                        <p className="text-[12px] font-500 text-foreground mb-1">{card.front}</p>
                        <p className="text-[11px] text-muted-foreground">{card.back}</p>
                      </div>
                      <button
                        onClick={() => setForm({
                          ...form,
                          cards: form.cards.filter(c => c.id !== card.id)
                        })}
                        className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 transition-colors mt-1"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setForm({
                    ...form,
                    cards: [...form.cards, {
                      id: Math.random().toString(),
                      front: '',
                      back: '',
                    }]
                  })}
                  className="w-full px-3 py-2 text-[12px] font-500 border border-border rounded-md hover:bg-muted transition-colors flex items-center justify-center gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  {isDutch ? 'Voeg card toe' : 'Add Card'}
                </button>

                {form.cards.length > 0 && (
                  <div className="mt-3 p-3 rounded-lg bg-muted/40 border border-border">
                    {form.cards.map((card, idx) => (
                      <div key={idx} className="mb-2 last:mb-0">
                        <input
                          type="text"
                          placeholder={isDutch ? 'Voorkant (vraag)' : 'Front (question)'}
                          value={card.front}
                          onChange={e => {
                            const updated = [...form.cards];
                            updated[idx].front = e.target.value;
                            setForm({ ...form, cards: updated });
                          }}
                          className="w-full px-2 py-1 text-[11px] border border-border rounded mb-1 bg-background"
                        />
                        <input
                          type="text"
                          placeholder={isDutch ? 'Achterkant (antwoord)' : 'Back (answer)'}
                          value={card.back}
                          onChange={e => {
                            const updated = [...form.cards];
                            updated[idx].back = e.target.value;
                            setForm({ ...form, cards: updated });
                          }}
                          className="w-full px-2 py-1 text-[11px] border border-border rounded bg-background"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-[13px] font-600 text-foreground mb-3">
                  {isDutch ? 'Leerpad' : 'Learning Path'}
                </h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!form.sequential}
                      onChange={e => setForm({ ...form, sequential: !e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-[12px] text-foreground">
                      {isDutch ? 'Vrij (students kunnen in willekeurige volgorde gaan)' : 'Free (students can go in any order)'}
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.sequential}
                      onChange={e => setForm({ ...form, sequential: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-[12px] text-foreground">
                      {isDutch ? 'Opeenvolgend (volgende → alleen beschikbaar na vorige voltooid)' : 'Sequential (next only after previous completed)'}
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.randomized}
                      onChange={e => setForm({ ...form, randomized: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-[12px] text-foreground">
                      {isDutch ? 'Gerandomiseerd (items in willekeurige volgorde tonen)' : 'Randomized (items in random order)'}
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <h3 className="text-[13px] font-600 text-foreground mb-3">
                  {isDutch ? 'Feedback' : 'Feedback'}
                </h3>
                <select
                  value={form.feedbackType}
                  onChange={e => setForm({ ...form, feedbackType: e.target.value as any })}
                  className="w-full px-3 py-2 text-[12px] border border-border rounded-md bg-background"
                >
                  <option value="immediate">{isDutch ? 'Direct na poging' : 'Direct after attempt'}</option>
                  <option value="after">{isDutch ? 'Na einde' : 'After finish'}</option>
                  <option value="none">{isDutch ? 'Geen feedback' : 'No feedback'}</option>
                </select>
              </div>

              <div>
                <h3 className="text-[13px] font-600 text-foreground mb-3">
                  {isDutch ? 'Monitoring' : 'Monitoring'}
                </h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.trackProgress}
                      onChange={e => setForm({ ...form, trackProgress: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-[12px] text-foreground">
                      {isDutch ? 'Track student voortgang & tijd besteed' : 'Track student progress & time spent'}
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.notifyOnStruggles}
                      onChange={e => setForm({ ...form, notifyOnStruggles: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-[12px] text-foreground">
                      {isDutch ? 'Notify mij als students worstelen' : 'Notify me if students struggle'}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="bg-muted/40 border border-border rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-[12px]">
                  <div>
                    <p className="text-muted-foreground font-500">{isDutch ? 'Naam' : 'Name'}</p>
                    <p className="text-foreground font-500 mt-1">{form.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-500">{isDutch ? 'Onderwerp' : 'Subject'}</p>
                    <p className="text-foreground font-500 mt-1">{form.subject || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-500">{isDutch ? 'Type' : 'Type'}</p>
                    <p className="text-foreground font-500 mt-1">{form.layout}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-500">{isDutch ? 'Inhoud' : 'Content'}</p>
                    <p className="text-foreground font-500 mt-1">{form.cards.length} {isDutch ? 'Cards' : 'Cards'}</p>
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg bg-muted/40 border border-border">
                <input
                  type="checkbox"
                  checked={form.assignToClass}
                  onChange={e => setForm({ ...form, assignToClass: e.target.checked })}
                  className="rounded"
                />
                <span className="text-[12px] text-foreground">
                  {isDutch ? 'Toewijzen aan mijn hele klas' : 'Assign to my entire class'}
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => step > 1 && setStep((step - 1) as Step)}
            disabled={step === 1}
            className="px-4 py-2 text-[12px] font-500 rounded-md border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isDutch ? '← Terug' : '← Back'}
          </button>

          <div className="flex gap-2">
            {step < 4 && (
              <button
                onClick={() => setStep((step + 1) as Step)}
                className="px-4 py-2 text-[12px] font-500 rounded-md bg-[#7f8962] text-white hover:bg-[#6f7851] transition-colors flex items-center gap-1"
              >
                {isDutch ? 'Volgende →' : 'Next →'}
              </button>
            )}
            {step === 4 && (
              <button
                onClick={handleCreate}
                disabled={creating || !form.name.trim() || form.cards.length === 0}
                className="px-4 py-2 text-[12px] font-500 rounded-md bg-[#7f8962] text-white hover:bg-[#6f7851] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
              >
                {creating ? '...' : `${isDutch ? '✓ Publiceren' : '✓ Publish'}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
