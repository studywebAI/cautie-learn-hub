'use client';

import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppContext, AppContextType, ThemeType } from '@/contexts/app-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';

type SetupMode = 'new' | 'account';
type SetupRole = 'student' | 'teacher';
type SetupStep = 'entry' | 'language' | 'role' | 'teacherCode' | 'appearance' | 'displayName';
type LanguageOption = 'en' | 'nl' | 'de' | 'fr' | 'es' | 'pt' | 'pl' | 'ru' | 'ar' | 'ur' | 'hi' | 'bn' | 'zh';

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
  const { session, setLanguage, setTheme, theme: currentTheme } = useContext(AppContext) as AppContextType;
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
  const [savingFinal, setSavingFinal] = useState(false);

  useEffect(() => {
    let alive = true;
    const init = async () => {
      const browserLanguage = resolveBrowserLanguage();
      setLanguageChoice(browserLanguage);
      setThemeChoice(currentTheme || 'light');
      setStep('entry');
      setMode(null);
      setRole('student');
      setDisplayName('');
      setTeacherCode('');

      if (!session?.user?.id) {
        if (!alive) return;
        setVisible(true);
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
        if (hasCompletedSetup) {
          setVisible(false);
          setHydrated(true);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name,language,theme')
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
          setTheme(profileTheme as ThemeType);
        }
        if (typeof profile?.full_name === 'string' && profile.full_name.trim()) {
          setDisplayName(profile.full_name.trim());
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
  }, [currentTheme, session?.user?.id, setLanguage, setTheme, supabase]);

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

  const persistAndRedirectToLogin = useCallback(() => {
    window.location.href = '/login?message=Sign in to continue setup&type=info';
  }, []);

  const finishSetup = useCallback(async () => {
    setLanguage(language);
    setTheme(theme);

    if (session?.user?.id) {
      setSavingFinal(true);
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
        // Keep UX moving even if backend save fails.
      } finally {
        setSavingFinal(false);
      }
    }

    setVisible(false);
  }, [displayName, language, mode, role, session?.user?.id, setLanguage, setTheme, supabase, teacherCode, theme]);

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
    <div className="fixed inset-0 z-[260] bg-background">
      <div className="flex h-full w-full flex-col p-6 md:p-10">
        <div className="mx-auto flex h-full w-full max-w-6xl flex-col rounded-3xl border bg-card p-6 shadow-xl md:p-8">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h2 className="text-3xl font-semibold">{typedPrompt}<span className={cursorVisible ? 'opacity-100' : 'opacity-0'}>|</span></h2>
              <p className="mt-1 text-sm text-muted-foreground">Step {stepIndexMap[step]} of 6</p>
            </div>
            {savingFinal && <p className="text-xs text-muted-foreground">Saving...</p>}
          </div>

          <div className="flex-1 overflow-auto">
            {step === 'entry' && (
              <div className="mx-auto flex max-w-md flex-col gap-3">
                <Button className="h-11" onClick={() => { setMode('new'); setStep('language'); }}>I'm new</Button>
                <Button className="h-11" variant="outline" onClick={() => {
                  setMode('account');
                  if (!session) {
                    persistAndRedirectToLogin();
                    return;
                  }
                  setStep('language');
                }}>
                  I have an account
                </Button>
              </div>
            )}

            {step === 'language' && (
              <div className="mx-auto max-w-4xl space-y-4">
                <Label>Select language</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {LANGUAGE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setLanguageChoice(option.value);
                        setLanguage(option.value);
                      }}
                      className={`rounded-full border px-3 py-2 text-sm ${language === option.value ? 'border-primary bg-primary/10' : 'border-border'}`}
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
              <div className="mx-auto max-w-md space-y-4">
                <Label>Select role</Label>
                <div className="flex gap-2">
                  <Button className="h-10 flex-1" variant={role === 'student' ? 'default' : 'outline'} onClick={() => setRole('student')}>Student</Button>
                  <Button className="h-10 flex-1" variant={role === 'teacher' ? 'default' : 'outline'} onClick={() => setRole('teacher')}>Teacher</Button>
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => setStep(role === 'teacher' ? 'teacherCode' : 'appearance')}>Next</Button>
                </div>
              </div>
            )}

            {step === 'teacherCode' && (
              <div className="mx-auto max-w-md space-y-4">
                <Label htmlFor="teacher-code">Teacher code</Label>
                <Input id="teacher-code" value={teacherCode} onChange={(event) => setTeacherCode(event.target.value)} placeholder="Enter teacher code" />
                <div className="flex justify-end">
                  <Button
                    disabled={!teacherCode.trim()}
                    onClick={() => {
                      if (!session) {
                        persistAndRedirectToLogin();
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
              <div className="mx-auto max-w-4xl space-y-4">
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
                      className={`rounded-full border px-3 py-2 text-sm ${theme === option.value ? 'border-primary bg-primary/10' : 'border-border'}`}
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
              <div className="mx-auto max-w-md space-y-4">
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
                    <Button onClick={() => persistAndRedirectToLogin()}>Create account</Button>
                  </div>
                ) : !session ? (
                  <div className="flex justify-end">
                    <Button onClick={() => persistAndRedirectToLogin()}>Create account</Button>
                  </div>
                ) : (
                  <div className="flex justify-end">
                    <Button onClick={() => void finishSetup()} disabled={savingFinal}>Finish</Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
