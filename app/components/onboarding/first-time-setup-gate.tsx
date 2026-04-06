'use client';

import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppContext, AppContextType, ThemeType } from '@/contexts/app-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';

const SETUP_STORAGE_KEY = 'studyweb-first-time-setup-v2';
const SETUP_SEEN_KEY = 'studyweb-first-time-setup-seen-v1';
const DISPLAY_NAME_KEY = 'studyweb-display-name';

type SetupMode = 'new' | 'account';
type SetupRole = 'student' | 'teacher';
type SetupStep = 'entry' | 'language' | 'role' | 'teacherCode' | 'appearance' | 'displayName';
type LanguageOption = 'en' | 'nl' | 'de' | 'fr' | 'es' | 'pt' | 'pl' | 'ru' | 'ar' | 'ur' | 'hi' | 'bn' | 'zh';

type PersistedSetup = {
  completed?: boolean;
  mode?: SetupMode;
  step?: SetupStep;
  role?: SetupRole;
  language?: LanguageOption;
  theme?: ThemeType;
  displayName?: string;
  teacherCode?: string;
};

const LANGUAGE_OPTIONS: Array<{ value: LanguageOption; label: string }> = [
  { value: 'en', label: 'English' },
  { value: 'nl', label: 'Nederlands' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Francais' },
  { value: 'es', label: 'Espanol' },
  { value: 'pt', label: 'Portugues' },
  { value: 'pl', label: 'Polski' },
  { value: 'ru', label: 'Russian' },
  { value: 'ar', label: 'Arabic' },
  { value: 'ur', label: 'Urdu' },
  { value: 'hi', label: 'Hindi' },
  { value: 'bn', label: 'Bangla' },
  { value: 'zh', label: 'Chinese' },
];

const THEME_OPTIONS: Array<{ value: ThemeType; label: string }> = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'ocean', label: 'Ocean' },
  { value: 'forest', label: 'Forest' },
  { value: 'sunset', label: 'Sunset' },
  { value: 'rose', label: 'Rose' },
];

function resolveBrowserLanguage(): LanguageOption {
  if (typeof window === 'undefined') return 'en';
  const raw = window.navigator.language.split('-')[0].toLowerCase();
  if (LANGUAGE_OPTIONS.some((item) => item.value === raw)) return raw as LanguageOption;
  return 'en';
}

function firstTimePromptForLanguage(language: LanguageOption): string {
  const map: Record<LanguageOption, string> = {
    en: 'First time here?',
    nl: 'Eerste keer hier?',
    de: 'Zum ersten Mal hier?',
    fr: 'Premiere fois ici?',
    es: 'Primera vez aqui?',
    pt: 'Primeira vez aqui?',
    pl: 'Pierwszy raz tutaj?',
    ru: 'First time here?',
    ar: 'First time here?',
    ur: 'First time here?',
    hi: 'First time here?',
    bn: 'First time here?',
    zh: 'First time here?',
  };
  return map[language] || map.en;
}

export function FirstTimeSetupGate() {
  const {
    session,
    setLanguage,
    setTheme,
    language: currentLanguage,
    theme: currentTheme,
  } = useContext(AppContext) as AppContextType;
  const supabase = useMemo(() => createClient(), []);

  const [hydrated, setHydrated] = useState(false);
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<SetupStep>('entry');
  const [mode, setMode] = useState<SetupMode | null>(null);
  const [role, setRole] = useState<SetupRole>('student');
  const [language, setLanguageChoice] = useState<LanguageOption>('en');
  const [theme, setThemeChoice] = useState<ThemeType>('light');
  const [displayName, setDisplayName] = useState('');
  const [teacherCode, setTeacherCode] = useState('');
  const [typedPrompt, setTypedPrompt] = useState('');
  const [cursorVisible, setCursorVisible] = useState(true);
  const [draftSaving, setDraftSaving] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const seen = window.localStorage.getItem(SETUP_SEEN_KEY) === '1';
      if (seen) {
        setHydrated(true);
        setVisible(false);
        return;
      }
      window.localStorage.setItem(SETUP_SEEN_KEY, '1');

      const browserLanguage = resolveBrowserLanguage();
      const raw = window.localStorage.getItem(SETUP_STORAGE_KEY);
      const parsed: PersistedSetup = raw ? JSON.parse(raw) : {};
      if (parsed?.completed) {
        setHydrated(true);
        setVisible(false);
        return;
      }

      const safeStep: SetupStep = (
        ['entry', 'language', 'role', 'teacherCode', 'appearance', 'displayName'].includes(String(parsed.step))
          ? (parsed.step as SetupStep)
          : 'entry'
      );
      const safeMode: SetupMode | null =
        parsed.mode === 'new' || parsed.mode === 'account' ? parsed.mode : null;
      const safeRole: SetupRole = parsed.role === 'teacher' ? 'teacher' : 'student';
      const safeTheme: ThemeType = THEME_OPTIONS.some((item) => item.value === parsed.theme)
        ? (parsed.theme as ThemeType)
        : (currentTheme || 'light');
      const safeLanguage: LanguageOption = LANGUAGE_OPTIONS.some((item) => item.value === parsed.language)
        ? (parsed.language as LanguageOption)
        : browserLanguage;

      setMode(safeMode);
      setStep(safeStep);
      setRole(safeRole);
      setLanguageChoice(safeLanguage);
      setThemeChoice(safeTheme);
      setDisplayName(parsed.displayName || window.localStorage.getItem(DISPLAY_NAME_KEY) || '');
      setTeacherCode(parsed.teacherCode || '');
      setVisible(true);
      setHydrated(true);
    } catch {
      window.localStorage.removeItem(SETUP_STORAGE_KEY);
      setMode(null);
      setStep('entry');
      setRole('student');
      setLanguageChoice(resolveBrowserLanguage());
      setThemeChoice(currentTheme || 'light');
      setDisplayName(window.localStorage.getItem(DISPLAY_NAME_KEY) || '');
      setTeacherCode('');
      setVisible(true);
      setHydrated(true);
    }
  }, [currentTheme]);

  useEffect(() => {
    if (!hydrated || !visible || typeof window === 'undefined') return;
    try {
      const payload: PersistedSetup = {
        completed: false,
        mode: mode || undefined,
        step,
        role,
        language,
        theme,
        displayName,
        teacherCode,
      };
      window.localStorage.setItem(SETUP_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage issues and keep flow usable in-memory.
    }
  }, [displayName, hydrated, language, mode, role, step, teacherCode, theme, visible]);

  useEffect(() => {
    if (!visible) return;
    const prompt = firstTimePromptForLanguage(language);
    let active = true;
    const run = async () => {
      setTypedPrompt('');
      for (let i = 1; i <= prompt.length && active; i += 1) {
        setTypedPrompt(prompt.slice(0, i));
        await new Promise((resolve) => window.setTimeout(resolve, 32));
      }
    };
    void run();

    const blink = window.setInterval(() => setCursorVisible((prev) => !prev), 420);
    return () => {
      active = false;
      window.clearInterval(blink);
    };
  }, [language, visible]);

  const persistSetupDraft = useCallback(async () => {
    if (!session?.user?.id) return;
    setDraftSaving(true);
    try {
      const draft = {
        mode,
        step,
        role,
        language,
        theme,
        displayName: displayName.trim() || null,
        teacherCode: teacherCode.trim() || null,
        updatedAt: new Date().toISOString(),
      };

      await supabase.from('profiles').upsert({
        id: session.user.id,
        language,
        theme,
        full_name: displayName.trim() || null,
      });

      await supabase.from('user_preferences').upsert(
        {
          user_id: session.user.id,
          preference_key: 'first_time_setup_draft',
          preference_value: draft,
        },
        { onConflict: 'user_id,preference_key' }
      );
    } catch {
      // Draft backup is best-effort.
    } finally {
      setDraftSaving(false);
    }
  }, [displayName, language, mode, role, session?.user?.id, step, supabase, teacherCode, theme]);

  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => {
      void persistSetupDraft();
    }, 350);
    return () => window.clearTimeout(timer);
  }, [displayName, language, mode, persistSetupDraft, role, step, teacherCode, theme, visible]);

  const persistAndRedirectToLogin = useCallback((nextStep: SetupStep) => {
    if (typeof window === 'undefined') return;
    try {
      const payload: PersistedSetup = {
        completed: false,
        mode: mode || undefined,
        step: nextStep,
        role,
        language,
        theme,
        displayName,
        teacherCode,
      };
      window.localStorage.setItem(SETUP_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Redirect still works without persisted state.
    }
    window.location.href = '/login?message=Sign in to continue setup&type=info';
  }, [displayName, language, mode, role, teacherCode, theme]);

  const finishSetup = useCallback(async () => {
    setLanguage(language);
    setTheme(theme);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SETUP_SEEN_KEY, '1');
      window.localStorage.setItem(DISPLAY_NAME_KEY, displayName.trim() || 'guest');
      const payload: PersistedSetup = {
        completed: true,
        mode: mode || undefined,
        role,
        language,
        theme,
        displayName,
      };
      window.localStorage.setItem(SETUP_STORAGE_KEY, JSON.stringify(payload));
    }

    if (session?.user?.id) {
      try {
        await supabase.from('profiles').upsert({
          id: session.user.id,
          full_name: displayName.trim() || null,
          language,
          theme,
        });
        await supabase.from('user_preferences').upsert(
          {
            user_id: session.user.id,
            preference_key: 'first_time_setup_final',
            preference_value: {
              mode,
              role,
              language,
              theme,
              displayName: displayName.trim() || null,
              teacherCode: teacherCode.trim() || null,
              completedAt: new Date().toISOString(),
            },
          },
          { onConflict: 'user_id,preference_key' }
        );
      } catch {
        // Best-effort profile sync; local setup completion still succeeds.
      }
    }

    setVisible(false);
  }, [displayName, language, mode, role, session?.user?.id, setLanguage, setTheme, supabase, theme]);

  if (!hydrated || !visible) return null;

  const stepIndexMap: Record<SetupStep, number> = {
    entry: 1,
    language: 2,
    role: 3,
    teacherCode: 4,
    appearance: 5,
    displayName: 6,
  };

  return (
    <div className="fixed inset-0 z-[240] flex items-center justify-center bg-black/45 p-5 backdrop-blur-[2px]">
      <div className="w-full max-w-4xl rounded-3xl border bg-card p-7 shadow-2xl">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-semibold">{typedPrompt}<span className={cursorVisible ? 'opacity-100' : 'opacity-0'}>|</span></h2>
            <p className="mt-1 text-sm text-muted-foreground">Step {stepIndexMap[step]} of 6</p>
          </div>
          {session?.user?.id ? (
            <p className="text-xs text-muted-foreground">{draftSaving ? 'Saving setup draft...' : 'Draft saved'}</p>
          ) : (
            <p className="text-xs text-muted-foreground">Draft saved locally</p>
          )}
        </div>

        {step === 'entry' && (
          <div className="flex flex-col gap-2">
            <Button onClick={() => { setMode('new'); setStep('language'); }}>I&apos;m new</Button>
            <Button variant="outline" onClick={() => {
              setMode('account');
              if (!session) {
                persistAndRedirectToLogin('language');
                return;
              }
              setStep('language');
            }}>
              I have an account
            </Button>
          </div>
        )}

        {step === 'language' && (
          <div className="space-y-3">
            <Label>Select language</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {LANGUAGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setLanguageChoice(option.value);
                    setLanguage(option.value);
                  }}
                  className={`rounded-full border px-3 py-1.5 text-xs ${language === option.value ? 'border-primary bg-primary/10' : 'border-border'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep(mode === 'new' ? 'role' : 'appearance')}>Next</Button>
            </div>
          </div>
        )}

        {step === 'role' && (
          <div className="space-y-3">
            <Label>Select role</Label>
            <div className="flex gap-2">
              <Button variant={role === 'student' ? 'default' : 'outline'} onClick={() => setRole('student')}>Student</Button>
              <Button variant={role === 'teacher' ? 'default' : 'outline'} onClick={() => setRole('teacher')}>Teacher</Button>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep(role === 'teacher' ? 'teacherCode' : 'appearance')}>Next</Button>
            </div>
          </div>
        )}

        {step === 'teacherCode' && (
          <div className="space-y-3">
            <Label htmlFor="teacher-code">Teacher code</Label>
            <Input id="teacher-code" value={teacherCode} onChange={(event) => setTeacherCode(event.target.value)} placeholder="Enter teacher code" />
            <div className="flex justify-end">
              <Button
                disabled={!teacherCode.trim()}
                onClick={() => {
                  if (!session) {
                    persistAndRedirectToLogin('appearance');
                    return;
                  }
                  setStep('appearance');
                }}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {step === 'appearance' && (
          <div className="space-y-3">
            <Label>Select appearance</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {THEME_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setThemeChoice(option.value);
                    setTheme(option.value);
                  }}
                  className={`rounded-full border px-3 py-1.5 text-xs ${theme === option.value ? 'border-primary bg-primary/10' : 'border-border'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep('displayName')}>Next</Button>
            </div>
          </div>
        )}

        {step === 'displayName' && (
          <div className="space-y-3">
            <Label htmlFor="display-name">Enter display name</Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Your display name"
            />

            {mode === 'new' && role === 'student' && !session ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => void finishSetup()}>Continue as guest</Button>
                <Button onClick={() => persistAndRedirectToLogin('displayName')}>Create account</Button>
              </div>
            ) : !session ? (
              <div className="flex justify-end">
                <Button onClick={() => persistAndRedirectToLogin('displayName')}>Create account</Button>
              </div>
            ) : (
              <div className="flex justify-end">
                <Button onClick={() => void finishSetup()}>Finish</Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

