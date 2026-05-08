'use client';

import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppContext, AppContextType, ThemeType } from '@/contexts/app-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';

type SetupRole = 'student' | 'teacher';
type SetupStep = 'language' | 'role' | 'appearance' | 'displayName';
type LanguageOption = 'en' | 'nl' | 'de' | 'fr' | 'es' | 'pt' | 'pl' | 'ru' | 'ar' | 'ur' | 'hi' | 'bn' | 'zh' | 'it' | 'tr' | 'id';

const LANGUAGE_OPTIONS: Array<{ value: LanguageOption; label: string }> = [
  { value: 'en', label: 'English' },
  { value: 'zh', label: 'Chinese' },
  { value: 'hi', label: 'Hindi' },
  { value: 'es', label: 'Espanol' },
  { value: 'fr', label: 'Francais' },
  { value: 'ar', label: 'Arabic' },
  { value: 'bn', label: 'Bangla' },
  { value: 'pt', label: 'Portugues' },
  { value: 'ru', label: 'Russian' },
  { value: 'ur', label: 'Urdu' },
  { value: 'id', label: 'Bahasa Indonesia' },
  { value: 'de', label: 'Deutsch' },
  { value: 'tr', label: 'Turkce' },
  { value: 'it', label: 'Italiano' },
  { value: 'nl', label: 'Nederlands' },
  { value: 'pl', label: 'Polski' },
];

const THEME_OPTIONS: Array<{ value: ThemeType; label: string }> = [
  { value: 'light', label: 'Light' },
  { value: 'sand', label: 'Sand' },
  { value: 'dark', label: 'Dark' },
  { value: 'ocean', label: 'Ocean' },
  { value: 'forest', label: 'Forest' },
  { value: 'rose', label: 'Rose' },
];

const GUEST_SETUP_DONE_KEY = 'studyweb-first-time-setup-guest-final-v1';
const ACCOUNT_SETUP_DONE_KEY_PREFIX = 'studyweb-first-time-setup-account-final-v1';
const RTL_LANGUAGES = new Set<LanguageOption>(['ar', 'ur']);

function accountSetupDoneKey(userId: string): string {
  return `${ACCOUNT_SETUP_DONE_KEY_PREFIX}:${userId}`;
}

function normalizeDisplayName(value: unknown): string {
  if (typeof value !== 'string') return '';
  const normalized = value.trim();
  if (!normalized) return '';
  const lowered = normalized.toLowerCase();
  if (lowered === 'guest') return '';
  if (!/[\p{L}\p{N}]/u.test(normalized)) return '';
  return normalized;
}

function resolveBrowserLanguage(): LanguageOption {
  if (typeof window === 'undefined') return 'en';
  const raw = window.navigator.language.split('-')[0].toLowerCase();
  if (LANGUAGE_OPTIONS.some((item) => item.value === raw)) return raw as LanguageOption;
  return 'en';
}

export function FirstTimeSetupGate() {
  const { session, isLoading, setLanguage, setTheme, theme: currentTheme } = useContext(AppContext) as AppContextType;
  const supabase = useMemo(() => createClient(), []);

  const [hydrated, setHydrated] = useState(false);
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<SetupStep>('language');
  const [role, setRole] = useState<SetupRole>('student');
  const [language, setLanguageChoice] = useState<LanguageOption>('en');
  const [theme, setThemeChoice] = useState<ThemeType>('light');
  const [displayName, setDisplayName] = useState('');
  const [savingFinal, setSavingFinal] = useState(false);

  const uiText = useMemo(() => {
    const byLang: Record<LanguageOption, Record<string, string>> = {
      en: { step: 'Step', of: 'of', selectLanguage: 'Select language', selectRole: 'Select role', selectAppearance: 'Select appearance', enterDisplayName: 'Enter display name', yourDisplayName: 'Your display name', student: 'Student', teacher: 'Teacher', next: 'Next', back: 'Back', finish: 'Finish', saving: 'Saving...', welcomePrefix: 'Welcome' },
      nl: { step: 'Stap', of: 'van', selectLanguage: 'Kies taal', selectRole: 'Kies rol', selectAppearance: 'Kies uiterlijk', enterDisplayName: 'Voer weergavenaam in', yourDisplayName: 'Jouw weergavenaam', student: 'Leerling', teacher: 'Docent', next: 'Volgende', back: 'Terug', finish: 'Afronden', saving: 'Opslaan...', welcomePrefix: 'Welkom' },
      de: { step: 'Schritt', of: 'von', selectLanguage: 'Sprache', selectRole: 'Rolle', selectAppearance: 'Aussehen', enterDisplayName: 'Anzeigename', yourDisplayName: 'Dein Anzeigename', student: 'Schuler', teacher: 'Lehrer', next: 'Weiter', back: 'Zuruck', finish: 'Fertig', saving: 'Speichern...', welcomePrefix: 'Willkommen' },
      fr: { step: 'Etape', of: 'sur', selectLanguage: 'Langue', selectRole: 'Role', selectAppearance: 'Apparence', enterDisplayName: 'Nom affiche', yourDisplayName: 'Votre nom affiche', student: 'Etudiant', teacher: 'Enseignant', next: 'Suivant', back: 'Retour', finish: 'Terminer', saving: 'Enregistrement...', welcomePrefix: 'Bienvenue' },
      es: { step: 'Paso', of: 'de', selectLanguage: 'Idioma', selectRole: 'Rol', selectAppearance: 'Apariencia', enterDisplayName: 'Nombre visible', yourDisplayName: 'Tu nombre visible', student: 'Estudiante', teacher: 'Docente', next: 'Siguiente', back: 'Atras', finish: 'Finalizar', saving: 'Guardando...', welcomePrefix: 'Bienvenido' },
      pt: { step: 'Passo', of: 'de', selectLanguage: 'Idioma', selectRole: 'Papel', selectAppearance: 'Aparencia', enterDisplayName: 'Nome de exibicao', yourDisplayName: 'Seu nome de exibicao', student: 'Aluno', teacher: 'Professor', next: 'Proximo', back: 'Voltar', finish: 'Concluir', saving: 'Salvando...', welcomePrefix: 'Bem-vindo' },
      pl: { step: 'Krok', of: 'z', selectLanguage: 'Jezyk', selectRole: 'Rola', selectAppearance: 'Wyglad', enterDisplayName: 'Nazwa wyswietlana', yourDisplayName: 'Twoja nazwa wyswietlana', student: 'Uczen', teacher: 'Nauczyciel', next: 'Dalej', back: 'Wstecz', finish: 'Zakoncz', saving: 'Zapisywanie...', welcomePrefix: 'Witamy' },
      ru: { step: 'Step', of: 'of', selectLanguage: 'Select language', selectRole: 'Select role', selectAppearance: 'Select appearance', enterDisplayName: 'Enter display name', yourDisplayName: 'Your display name', student: 'Student', teacher: 'Teacher', next: 'Next', back: 'Back', finish: 'Finish', saving: 'Saving...', welcomePrefix: 'Welcome' },
      ar: { step: 'Step', of: 'of', selectLanguage: 'Select language', selectRole: 'Select role', selectAppearance: 'Select appearance', enterDisplayName: 'Enter display name', yourDisplayName: 'Your display name', student: 'Student', teacher: 'Teacher', next: 'Next', back: 'Back', finish: 'Finish', saving: 'Saving...', welcomePrefix: 'Welcome' },
      ur: { step: 'Step', of: 'of', selectLanguage: 'Select language', selectRole: 'Select role', selectAppearance: 'Select appearance', enterDisplayName: 'Enter display name', yourDisplayName: 'Your display name', student: 'Student', teacher: 'Teacher', next: 'Next', back: 'Back', finish: 'Finish', saving: 'Saving...', welcomePrefix: 'Welcome' },
      hi: { step: 'Step', of: 'of', selectLanguage: 'Select language', selectRole: 'Select role', selectAppearance: 'Select appearance', enterDisplayName: 'Enter display name', yourDisplayName: 'Your display name', student: 'Student', teacher: 'Teacher', next: 'Next', back: 'Back', finish: 'Finish', saving: 'Saving...', welcomePrefix: 'Welcome' },
      bn: { step: 'Step', of: 'of', selectLanguage: 'Select language', selectRole: 'Select role', selectAppearance: 'Select appearance', enterDisplayName: 'Enter display name', yourDisplayName: 'Your display name', student: 'Student', teacher: 'Teacher', next: 'Next', back: 'Back', finish: 'Finish', saving: 'Saving...', welcomePrefix: 'Welcome' },
      zh: { step: 'Step', of: 'of', selectLanguage: 'Select language', selectRole: 'Select role', selectAppearance: 'Select appearance', enterDisplayName: 'Enter display name', yourDisplayName: 'Your display name', student: 'Student', teacher: 'Teacher', next: 'Next', back: 'Back', finish: 'Finish', saving: 'Saving...', welcomePrefix: 'Welcome' },
      it: { step: 'Step', of: 'of', selectLanguage: 'Select language', selectRole: 'Select role', selectAppearance: 'Select appearance', enterDisplayName: 'Enter display name', yourDisplayName: 'Your display name', student: 'Student', teacher: 'Teacher', next: 'Next', back: 'Back', finish: 'Finish', saving: 'Saving...', welcomePrefix: 'Welcome' },
      tr: { step: 'Step', of: 'of', selectLanguage: 'Select language', selectRole: 'Select role', selectAppearance: 'Select appearance', enterDisplayName: 'Enter display name', yourDisplayName: 'Your display name', student: 'Student', teacher: 'Teacher', next: 'Next', back: 'Back', finish: 'Finish', saving: 'Saving...', welcomePrefix: 'Welcome' },
      id: { step: 'Step', of: 'of', selectLanguage: 'Select language', selectRole: 'Select role', selectAppearance: 'Select appearance', enterDisplayName: 'Enter display name', yourDisplayName: 'Your display name', student: 'Student', teacher: 'Teacher', next: 'Next', back: 'Back', finish: 'Finish', saving: 'Saving...', welcomePrefix: 'Welcome' },
    };
    return byLang[language] || byLang.en;
  }, [language]);

  useEffect(() => {
    if (isLoading) return;
    let alive = true;

    const init = async () => {
      const browserLanguage = resolveBrowserLanguage();
      setLanguageChoice(browserLanguage);
      setThemeChoice(currentTheme || 'light');
      setStep('language');
      setRole('student');
      setDisplayName('');

      if (!session?.user?.id) {
        if (typeof window !== 'undefined' && window.localStorage.getItem(GUEST_SETUP_DONE_KEY) === 'true') {
          if (!alive) return;
          setVisible(false);
          setHydrated(true);
          return;
        }
        if (!alive) return;
        setVisible(true);
        setHydrated(true);
        return;
      }

      if (typeof window !== 'undefined' && window.localStorage.getItem(accountSetupDoneKey(session.user.id)) === 'true') {
        if (!alive) return;
        setVisible(false);
        setHydrated(true);
        return;
      }

      try {
        const { data: prefRows } = await supabase
          .from('user_preferences')
          .select('preference_key')
          .eq('user_id', session.user.id)
          .eq('preference_key', 'first_time_setup_final')
          .limit(1);

        if (!alive) return;
        const hasCompletedSetup = Array.isArray(prefRows) && prefRows.length > 0;

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name,display_name,language,theme')
          .eq('id', session.user.id)
          .maybeSingle();

        if (!alive) return;

        const profileLanguage = String(profile?.language || '').toLowerCase();
        if (LANGUAGE_OPTIONS.some((option) => option.value === profileLanguage)) {
          setLanguageChoice(profileLanguage as LanguageOption);
          setLanguage(profileLanguage as LanguageOption);
        }

        const profileTheme = String(profile?.theme || '').toLowerCase();
        if (THEME_OPTIONS.some((option) => option.value === profileTheme)) {
          setThemeChoice(profileTheme as ThemeType);
        }

        const profileDisplayName = normalizeDisplayName(profile?.display_name);
        const profileFullName = normalizeDisplayName(profile?.full_name);
        const localDisplayName = typeof window !== 'undefined' ? normalizeDisplayName(window.localStorage.getItem('studyweb-display-name')) : '';
        const resolvedDisplayName = profileDisplayName || profileFullName || localDisplayName;
        if (resolvedDisplayName) {
          setDisplayName(resolvedDisplayName);
        }

        const looksAlreadyConfigured = Boolean(profileLanguage) && Boolean(profileTheme) && Boolean(resolvedDisplayName);

        if (hasCompletedSetup || looksAlreadyConfigured) {
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(accountSetupDoneKey(session.user.id), 'true');
          }
          setVisible(false);
          setHydrated(true);
          return;
        }

        setVisible(true);
        setHydrated(true);
      } catch {
        if (!alive) return;
        setVisible(true);
        setHydrated(true);
      }
    };

    void init();
    return () => {
      alive = false;
    };
  }, [currentTheme, isLoading, session?.user?.id, setLanguage, supabase]);

  const flowSteps: SetupStep[] = ['language', 'role', 'appearance', 'displayName'];
  const currentStepIndex = Math.max(0, flowSteps.indexOf(step));
  const totalSteps = flowSteps.length;
  const isRTL = RTL_LANGUAGES.has(language);

  const stepPrompt = useMemo(() => {
    if (step === 'language') return uiText.selectLanguage || 'Select language';
    if (step === 'role') return uiText.selectRole || 'Select role';
    if (step === 'appearance') return uiText.selectAppearance || 'Select appearance';
    if (step === 'displayName') return uiText.enterDisplayName || 'Enter display name';
    return 'Select language';
  }, [step, uiText.enterDisplayName, uiText.selectAppearance, uiText.selectLanguage, uiText.selectRole]);

  const getOptionClasses = (active: boolean) => {
    if (active) {
      return 'border-[hsl(var(--foreground)/0.28)] bg-[hsl(var(--foreground)/0.10)] text-foreground shadow-sm';
    }
    return 'border-[hsl(var(--border))] bg-[hsl(var(--card))] text-foreground hover:border-[hsl(var(--foreground)/0.20)] hover:bg-[hsl(var(--accent))]';
  };

  const goNext = () => {
    if (currentStepIndex >= totalSteps - 1) return;
    setStep(flowSteps[currentStepIndex + 1]);
  };

  const goBack = () => {
    if (currentStepIndex <= 0) return;
    setStep(flowSteps[currentStepIndex - 1]);
  };

  const finishSetup = useCallback(async () => {
    const normalizedDisplayName = displayName.trim();
    const persistedDisplayName = normalizedDisplayName || (typeof window !== 'undefined' ? (window.localStorage.getItem('studyweb-display-name') || '').trim() : '');

    setLanguage(language);
    setTheme(theme);

    if (typeof window !== 'undefined') {
      if (persistedDisplayName) {
        window.localStorage.setItem('studyweb-display-name', persistedDisplayName);
      } else {
        window.localStorage.removeItem('studyweb-display-name');
      }
      window.localStorage.setItem(GUEST_SETUP_DONE_KEY, 'true');
      if (session?.user?.id) {
        window.localStorage.setItem(accountSetupDoneKey(session.user.id), 'true');
      }
    }

    if (session?.user?.id) {
      setSavingFinal(true);
      try {
        await supabase.from('profiles').upsert({
          id: session.user.id,
          full_name: persistedDisplayName || null,
          display_name: persistedDisplayName || null,
          subscription_type: role,
          language,
          theme,
        });
        await supabase.from('user_preferences').upsert(
          {
            user_id: session.user.id,
            preference_key: 'first_time_setup_final',
            preference_value: {
              role,
              language,
              theme,
              displayName: persistedDisplayName || null,
              completedAt: new Date().toISOString(),
            },
          },
          { onConflict: 'user_id,preference_key' }
        );
      } catch {
        // keep UX moving
      } finally {
        setSavingFinal(false);
      }
    }

    setVisible(false);
  }, [displayName, language, role, session?.user?.id, setLanguage, setTheme, supabase, theme]);

  if (!hydrated || !visible) return null;

  return (
    <div className="fixed inset-0 z-[260] bg-[hsl(var(--background))]" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="grid h-full w-full grid-cols-1 lg:grid-cols-[minmax(320px,38vw)_1fr]">
        <aside className="border-b border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-background))] p-5 lg:border-b-0 lg:border-r lg:p-10">
          <div className="mx-auto flex h-full w-full max-w-xl flex-col justify-between gap-8">
            <div className="space-y-3">
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">{stepPrompt}</h2>
              <p className="text-sm text-muted-foreground">{uiText.step} {currentStepIndex + 1} {uiText.of} {totalSteps}</p>
              <div className="flex flex-wrap gap-2">
                {flowSteps.map((stepKey, index) => (
                  <span
                    key={stepKey}
                    className={`h-2.5 w-14 rounded-full border transition-colors ${index <= currentStepIndex ? 'border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-accent))]' : 'border-[hsl(var(--border))] surface-chip'}`}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={goBack} disabled={currentStepIndex === 0 || savingFinal}>{uiText.back || 'Back'}</Button>
              <div className="flex items-center gap-3">
                {savingFinal && <p className="text-xs text-muted-foreground">{uiText.saving}</p>}
              </div>
            </div>
          </div>
        </aside>

        <main className="overflow-auto surface-panel p-4 md:p-10">
          <div key={step} className={`setup-step-anim mx-auto w-full max-w-5xl space-y-5 rounded-2xl border border-border/70 p-4 md:p-6 ${isRTL ? 'setup-rtl' : ''}`}>
            {step === 'language' && (
              <div className="space-y-5">
                <Label>{uiText.selectLanguage}</Label>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {LANGUAGE_OPTIONS.map((option, index) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setLanguageChoice(option.value);
                        setLanguage(option.value);
                      }}
                      className={`setup-option ${isRTL ? 'setup-option-rtl' : ''} rounded-2xl border px-4 py-3 text-left text-sm transition ${getOptionClasses(language === option.value)}`}
                      style={{ animationDelay: `${index * 16}ms` }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 'role' && (
              <div className="max-w-xl space-y-5">
                <Label>{uiText.selectRole}</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button className="h-12" variant={role === 'student' ? 'default' : 'outline'} onClick={() => setRole('student')}>
                    {uiText.student}
                  </Button>
                  <Button className="h-12" variant={role === 'teacher' ? 'default' : 'outline'} onClick={() => setRole('teacher')}>
                    {uiText.teacher}
                  </Button>
                </div>
              </div>
            )}

            {step === 'appearance' && (
              <div className="space-y-5">
                <Label>{uiText.selectAppearance}</Label>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {THEME_OPTIONS.map((option, index) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setThemeChoice(option.value);
                        setTheme(option.value);
                      }}
                      className={`setup-option ${isRTL ? 'setup-option-rtl' : ''} rounded-2xl border px-4 py-3 text-left text-sm transition ${getOptionClasses(theme === option.value)}`}
                      style={{ animationDelay: `${index * 16}ms` }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step !== 'displayName' && (
              <div className="flex justify-end">
                <Button onClick={goNext}>{uiText.next || 'Next'}</Button>
              </div>
            )}

            {step === 'displayName' && (
              <div className="max-w-xl space-y-5">
                <p className="text-sm text-muted-foreground">{displayName.trim() ? `${uiText.welcomePrefix || 'Welcome'}, ${displayName.trim()}.` : ''}</p>
                <Label htmlFor="display-name">{uiText.enterDisplayName}</Label>
                <Input
                  id="display-name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder={uiText.yourDisplayName || ''}
                />
                <div className="flex justify-end">
                  <Button onClick={() => void finishSetup()} disabled={savingFinal}>{uiText.finish}</Button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <style jsx>{`
        .setup-step-anim {
          animation: setupStepIn 220ms ease-out;
        }
        .setup-option {
          animation: setupOptionIn 220ms ease-out both;
        }
        @keyframes setupStepIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes setupOptionIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .setup-step-anim,
          .setup-option {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
