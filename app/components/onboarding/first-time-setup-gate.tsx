'use client';

import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppContext, AppContextType, ThemeType } from '@/contexts/app-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';

type SetupMode = 'new' | 'account';
type SetupRole = 'student' | 'teacher';
type SetupStep = 'language' | 'role' | 'auth' | 'appearance' | 'displayName';
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
  { value: 'sand', label: 'Sand' },
  { value: 'dark', label: 'Dark' },
  { value: 'ocean', label: 'Ocean' },
  { value: 'forest', label: 'Forest' },
  { value: 'rose', label: 'Rose' },
];

const GUEST_SETUP_DONE_KEY = 'studyweb-first-time-setup-guest-final-v1';

function normalizeDisplayName(value: unknown): string {
  if (typeof value !== 'string') return '';
  const normalized = value.trim();
  if (!normalized) return '';
  const lowered = normalized.toLowerCase();
  if (lowered === 'guest' || normalized === '...') return '';
  return normalized;
}

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
  const { session, isLoading, setLanguage, setTheme, theme: currentTheme } = useContext(AppContext) as AppContextType;
  const supabase = useMemo(() => createClient(), []);

  const [hydrated, setHydrated] = useState(false);
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<SetupStep>('language');
  const [mode, setMode] = useState<SetupMode>('new');
  const [role, setRole] = useState<SetupRole>('student');
  const [language, setLanguageChoice] = useState<LanguageOption>('en');
  const [theme, setThemeChoice] = useState<ThemeType>('light');
  const [displayName, setDisplayName] = useState('');
  const [typedPrompt, setTypedPrompt] = useState('');
  const [cursorVisible, setCursorVisible] = useState(true);
  const [savingFinal, setSavingFinal] = useState(false);
  const [optionTypeTick, setOptionTypeTick] = useState(0);

  const uiText = useMemo(() => {
    const byLang: Record<LanguageOption, Record<string, string>> = {
      en: {
        firstTime: 'First time here?',
        iAmNew: "I'm new",
        iHaveAccount: 'I have an account',
        step: 'Step',
        of: 'of',
        selectLanguage: 'Select language',
        selectRole: 'Select role',
        selectAuth: 'Sign in or create your account',
        selectAppearance: 'Select appearance',
        teacherCode: 'Teacher code',
        enterTeacherCode: 'Enter teacher code',
        enterDisplayName: 'Enter display name',
        yourDisplayName: 'Your display name',
        student: 'Student',
        teacher: 'Teacher',
        next: 'Next',
        finish: 'Finish',
        createAccount: 'Create account',
        signIn: 'Sign in',
        continueGuest: 'Continue as guest',
        saving: 'Saving...',
      },
      nl: {
        firstTime: 'Eerste keer hier?',
        iAmNew: 'Ik ben nieuw',
        iHaveAccount: 'Ik heb een account',
        step: 'Stap',
        of: 'van',
        selectLanguage: 'Kies taal',
        selectRole: 'Kies rol',
        selectAuth: 'Inloggen of account maken',
        selectAppearance: 'Kies uiterlijk',
        teacherCode: 'Docentcode',
        enterTeacherCode: 'Voer docentcode in',
        enterDisplayName: 'Voer weergavenaam in',
        yourDisplayName: 'Jouw weergavenaam',
        student: 'Leerling',
        teacher: 'Docent',
        next: 'Volgende',
        finish: 'Afronden',
        createAccount: 'Account maken',
        signIn: 'Inloggen',
        continueGuest: 'Doorgaan als gast',
        saving: 'Opslaan...',
      },
      de: {
        firstTime: 'Zum ersten Mal hier?',
        iAmNew: 'Ich bin neu',
        iHaveAccount: 'Ich habe ein Konto',
        step: 'Schritt',
        of: 'von',
        selectLanguage: 'Sprache wählen',
        selectRole: 'Rolle wählen',
        selectAppearance: 'Design wählen',
        teacherCode: 'Lehrercode',
        enterTeacherCode: 'Lehrercode eingeben',
        enterDisplayName: 'Anzeigename eingeben',
        yourDisplayName: 'Dein Anzeigename',
        student: 'Schüler',
        teacher: 'Lehrer',
        next: 'Weiter',
        finish: 'Fertig',
        createAccount: 'Konto erstellen',
        continueGuest: 'Als Gast fortfahren',
        saving: 'Speichern...',
      },
      fr: {
        firstTime: 'Premiere fois ici?',
        iAmNew: 'Je suis nouveau',
        iHaveAccount: "J'ai un compte",
        step: 'Etape',
        of: 'sur',
        selectLanguage: 'Choisir la langue',
        selectRole: 'Choisir le role',
        selectAppearance: "Choisir l'apparence",
        teacherCode: 'Code enseignant',
        enterTeacherCode: 'Entrer le code enseignant',
        enterDisplayName: "Entrer le nom d'affichage",
        yourDisplayName: "Votre nom d'affichage",
        student: 'Etudiant',
        teacher: 'Enseignant',
        next: 'Suivant',
        finish: 'Terminer',
        createAccount: 'Creer un compte',
        continueGuest: 'Continuer en invite',
        saving: 'Enregistrement...',
      },
      es: {
        firstTime: 'Primera vez aqui?',
        iAmNew: 'Soy nuevo',
        iHaveAccount: 'Tengo una cuenta',
        step: 'Paso',
        of: 'de',
        selectLanguage: 'Seleccionar idioma',
        selectRole: 'Seleccionar rol',
        selectAppearance: 'Seleccionar apariencia',
        teacherCode: 'Codigo docente',
        enterTeacherCode: 'Ingresa el codigo docente',
        enterDisplayName: 'Ingresa nombre visible',
        yourDisplayName: 'Tu nombre visible',
        student: 'Estudiante',
        teacher: 'Docente',
        next: 'Siguiente',
        finish: 'Finalizar',
        createAccount: 'Crear cuenta',
        continueGuest: 'Continuar como invitado',
        saving: 'Guardando...',
      },
      pt: { firstTime: 'Primeira vez aqui?', iAmNew: 'Sou novo', iHaveAccount: 'Tenho conta', step: 'Passo', of: 'de', selectLanguage: 'Selecionar idioma', selectRole: 'Selecionar papel', selectAppearance: 'Selecionar aparencia', teacherCode: 'Codigo do professor', enterTeacherCode: 'Digite o codigo do professor', enterDisplayName: 'Digite nome de exibicao', yourDisplayName: 'Seu nome de exibicao', student: 'Aluno', teacher: 'Professor', next: 'Proximo', finish: 'Concluir', createAccount: 'Criar conta', continueGuest: 'Continuar como convidado', saving: 'Salvando...' },
      pl: { firstTime: 'Pierwszy raz tutaj?', iAmNew: 'Jestem nowy', iHaveAccount: 'Mam konto', step: 'Krok', of: 'z', selectLanguage: 'Wybierz jezyk', selectRole: 'Wybierz role', selectAppearance: 'Wybierz wyglad', teacherCode: 'Kod nauczyciela', enterTeacherCode: 'Wpisz kod nauczyciela', enterDisplayName: 'Wpisz nazwe wyswietlana', yourDisplayName: 'Twoja nazwa wyswietlana', student: 'Uczen', teacher: 'Nauczyciel', next: 'Dalej', finish: 'Zakoncz', createAccount: 'Utworz konto', continueGuest: 'Kontynuuj jako gosc', saving: 'Zapisywanie...' },
      ru: { firstTime: 'Первый раз здесь?', iAmNew: 'Я новый', iHaveAccount: 'У меня есть аккаунт', step: 'Шаг', of: 'из', selectLanguage: 'Выберите язык', selectRole: 'Выберите роль', selectAppearance: 'Выберите тему', teacherCode: 'Код учителя', enterTeacherCode: 'Введите код учителя', enterDisplayName: 'Введите отображаемое имя', yourDisplayName: 'Ваше отображаемое имя', student: 'Ученик', teacher: 'Учитель', next: 'Далее', finish: 'Завершить', createAccount: 'Создать аккаунт', continueGuest: 'Продолжить как гость', saving: 'Сохранение...' },
      ar: { firstTime: 'اول مرة هنا؟', iAmNew: 'انا جديد', iHaveAccount: 'لدي حساب', step: 'الخطوة', of: 'من', selectLanguage: 'اختر اللغة', selectRole: 'اختر الدور', selectAppearance: 'اختر المظهر', teacherCode: 'رمز المعلم', enterTeacherCode: 'ادخل رمز المعلم', enterDisplayName: 'ادخل اسم العرض', yourDisplayName: 'اسم العرض', student: 'طالب', teacher: 'معلم', next: 'التالي', finish: 'انهاء', createAccount: 'انشاء حساب', continueGuest: 'المتابعة كضيف', saving: 'جار الحفظ...' },
      ur: { firstTime: 'پہلی بار یہاں؟', iAmNew: 'میں نیا ہوں', iHaveAccount: 'میرے پاس اکاؤنٹ ہے', step: 'مرحلہ', of: 'میں سے', selectLanguage: 'زبان منتخب کریں', selectRole: 'کردار منتخب کریں', selectAppearance: 'ظاہری شکل منتخب کریں', teacherCode: 'استاد کوڈ', enterTeacherCode: 'استاد کوڈ درج کریں', enterDisplayName: 'ڈسپلے نام درج کریں', yourDisplayName: 'آپ کا ڈسپلے نام', student: 'طالب علم', teacher: 'استاد', next: 'اگلا', finish: 'مکمل کریں', createAccount: 'اکاؤنٹ بنائیں', continueGuest: 'بطور مہمان جاری رکھیں', saving: 'محفوظ ہو رہا ہے...' },
      hi: { firstTime: 'पहली बार यहां?', iAmNew: 'मैं नया हूं', iHaveAccount: 'मेरे पास अकाउंट है', step: 'चरण', of: 'का', selectLanguage: 'भाषा चुनें', selectRole: 'भूमिका चुनें', selectAppearance: 'रूप चुनें', teacherCode: 'शिक्षक कोड', enterTeacherCode: 'शिक्षक कोड दर्ज करें', enterDisplayName: 'डिस्प्ले नाम दर्ज करें', yourDisplayName: 'आपका डिस्प्ले नाम', student: 'छात्र', teacher: 'शिक्षक', next: 'अगला', finish: 'पूरा करें', createAccount: 'अकाउंट बनाएं', continueGuest: 'मेहमान के रूप में जारी रखें', saving: 'सहेजा जा रहा है...' },
      bn: { firstTime: 'প্রথমবার এখানে?', iAmNew: 'আমি নতুন', iHaveAccount: 'আমার অ্যাকাউন্ট আছে', step: 'ধাপ', of: 'এর', selectLanguage: 'ভাষা বাছুন', selectRole: 'ভূমিকা বাছুন', selectAppearance: 'থিম বাছুন', teacherCode: 'শিক্ষক কোড', enterTeacherCode: 'শিক্ষক কোড লিখুন', enterDisplayName: 'ডিসপ্লে নাম লিখুন', yourDisplayName: 'আপনার ডিসপ্লে নাম', student: 'শিক্ষার্থী', teacher: 'শিক্ষক', next: 'পরবর্তী', finish: 'শেষ করুন', createAccount: 'অ্যাকাউন্ট তৈরি করুন', continueGuest: 'অতিথি হিসেবে চালিয়ে যান', saving: 'সংরক্ষণ হচ্ছে...' },
      zh: { firstTime: '第一次来这里？', iAmNew: '我是新用户', iHaveAccount: '我有账号', step: '步骤', of: '共', selectLanguage: '选择语言', selectRole: '选择身份', selectAppearance: '选择外观', teacherCode: '教师代码', enterTeacherCode: '输入教师代码', enterDisplayName: '输入显示名称', yourDisplayName: '你的显示名称', student: '学生', teacher: '老师', next: '下一步', finish: '完成', createAccount: '创建账号', continueGuest: '以访客继续', saving: '正在保存...' },
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
      setMode(session?.user?.id ? 'account' : 'new');
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

        if (hasCompletedSetup) {
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
  }, [isLoading, session?.user?.id, supabase]);

  useEffect(() => {
    if (!visible) return;
    const prompt = uiText.firstTime || firstTimePromptForLanguage(language);
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
  }, [language, uiText.firstTime, visible]);

  const persistAndRedirectToLogin = useCallback(() => {
    window.location.href = '/login?message=Sign in to continue setup&type=info';
  }, []);

  const redirectToCreateAccount = useCallback(async () => {
    try {
      if (session?.user?.id) {
        await supabase.auth.signOut();
      }
    } catch {
      // Continue to auth page even if sign-out fails.
    }
    window.location.href = '/login?message=Create your account&type=info';
  }, [session?.user?.id, supabase.auth]);

  const finishSetup = useCallback(async () => {
    setLanguage(language);
    setTheme(theme);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('studyweb-display-name', displayName.trim());
      window.localStorage.setItem(GUEST_SETUP_DONE_KEY, 'true');
    }

    if (session?.user?.id) {
      setSavingFinal(true);
      try {
        await supabase.from('profiles').upsert({
          id: session.user.id,
          full_name: displayName.trim() || null,
          display_name: displayName.trim() || null,
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
  }, [displayName, language, mode, role, session?.user?.id, setLanguage, setTheme, supabase, theme]);

  const flowSteps: SetupStep[] = mode === 'account'
    ? ['language', 'role', 'appearance', 'displayName']
    : ['language', 'role', 'auth', 'appearance', 'displayName'];
  const currentStepIndex = Math.max(0, flowSteps.indexOf(step));
  const totalSteps = flowSteps.length;

  const optionLabels: string[] =
    step === 'language'
      ? LANGUAGE_OPTIONS.map((item) => item.label)
      : step === 'appearance'
        ? THEME_OPTIONS.map((item) => item.label)
        : step === 'role'
          ? [uiText.student, uiText.teacher]
          : [];
  const maxOptionLength = optionLabels.reduce((max, label) => Math.max(max, label.length), 0);

  useEffect(() => {
    setOptionTypeTick(0);
    if (maxOptionLength === 0) return;
    const timer = window.setInterval(() => {
      setOptionTypeTick((prev) => {
        if (prev >= maxOptionLength) {
          window.clearInterval(timer);
          return prev;
        }
        return prev + 1;
      });
    }, 16);
    return () => window.clearInterval(timer);
  }, [maxOptionLength, step]);

  const typedOptionLabel = (label: string) => label.slice(0, Math.max(1, optionTypeTick));

  const goNext = () => {
    if (currentStepIndex >= totalSteps - 1) return;
    setStep(flowSteps[currentStepIndex + 1]);
  };

  const goBack = () => {
    if (currentStepIndex <= 0) return;
    setStep(flowSteps[currentStepIndex - 1]);
  };

  if (!hydrated || !visible) return null;

  return (
    <div className="fixed inset-0 z-[260] bg-[hsl(var(--background))]">
      <div className="grid h-full w-full grid-cols-1 lg:grid-cols-[minmax(320px,38vw)_1fr]">
        <aside className="border-b border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-background))] p-6 lg:border-b-0 lg:border-r lg:p-10">
          <div className="mx-auto flex h-full w-full max-w-xl flex-col justify-between gap-8">
            <div className="space-y-3">
              <h2 className="text-4xl font-semibold tracking-tight">{typedPrompt}<span className={cursorVisible ? 'opacity-100' : 'opacity-0'}>|</span></h2>
              <p className="text-sm text-muted-foreground">{uiText.step} {currentStepIndex + 1} {uiText.of} {totalSteps}</p>
              <div className="flex flex-wrap gap-2">
                {flowSteps.map((stepKey, index) => (
                  <span
                    key={stepKey}
                    className={`h-2.5 w-14 rounded-full border transition-colors ${index <= currentStepIndex ? 'border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-accent))]' : 'border-[hsl(var(--border))] bg-[hsl(var(--surface-3))]'}`}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={goBack} disabled={currentStepIndex === 0 || savingFinal}>Back</Button>
              {savingFinal && <p className="text-xs text-muted-foreground">{uiText.saving}</p>}
            </div>
          </div>
        </aside>

        <main className="overflow-auto bg-[hsl(var(--surface-1))] p-6 md:p-10">
          <div key={step} className="setup-step-anim mx-auto w-full max-w-5xl space-y-5">
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
                      className={`setup-option rounded-2xl border px-4 py-3 text-left text-sm transition ${language === option.value ? 'border-[hsl(var(--sidebar-ring))] bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-active-foreground))] shadow-sm' : 'border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] hover:bg-[hsl(var(--surface-2))]'}`}
                      style={{ animationDelay: `${index * 28}ms` }}
                    >
                      {typedOptionLabel(option.label)}
                    </button>
                  ))}
                </div>
                <div className="flex justify-end">
                  <Button onClick={goNext}>{uiText.next}</Button>
                </div>
              </div>
            )}

            {step === 'role' && (
              <div className="max-w-xl space-y-5">
                <Label>{uiText.selectRole}</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button className="h-12" variant={role === 'student' ? 'default' : 'outline'} onClick={() => setRole('student')}>
                    {typedOptionLabel(uiText.student)}
                  </Button>
                  <Button className="h-12" variant={role === 'teacher' ? 'default' : 'outline'} onClick={() => setRole('teacher')}>
                    {typedOptionLabel(uiText.teacher)}
                  </Button>
                </div>
                <div className="flex justify-end">
                  <Button onClick={goNext}>{uiText.next}</Button>
                </div>
              </div>
            )}

            {step === 'auth' && (
              <div className="max-w-xl space-y-5">
                <Label>{uiText.selectAuth || 'Sign in or create your account'}</Label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Button className="h-12" onClick={() => void redirectToCreateAccount()}>
                    {uiText.createAccount}
                  </Button>
                  <Button className="h-12" variant="outline" onClick={() => persistAndRedirectToLogin()}>
                    {uiText.signIn || 'Sign in'}
                  </Button>
                </div>
                {role === 'student' && (
                  <div className="flex justify-end">
                    <Button variant="ghost" className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground" onClick={goNext}>
                      {uiText.continueGuest}
                    </Button>
                  </div>
                )}
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
                      className={`setup-option rounded-2xl border px-4 py-3 text-left text-sm transition ${theme === option.value ? 'border-[hsl(var(--sidebar-ring))] bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-active-foreground))] shadow-sm' : 'border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] hover:bg-[hsl(var(--surface-2))]'}`}
                      style={{ animationDelay: `${index * 28}ms` }}
                    >
                      {typedOptionLabel(option.label)}
                    </button>
                  ))}
                </div>
                <div className="flex justify-end">
                  <Button onClick={goNext}>{uiText.next}</Button>
                </div>
              </div>
            )}

            {step === 'displayName' && (
              <div className="max-w-xl space-y-5">
                <p className="text-sm text-muted-foreground">
                  {`Welcome, ${(displayName || uiText.yourDisplayName || 'there').trim()}.`}
                </p>
                <Label htmlFor="display-name">{uiText.enterDisplayName}</Label>
                <Input
                  id="display-name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder={uiText.yourDisplayName}
                />

                {mode === 'new' && role === 'student' ? (
                  <div className="space-y-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <Button className="min-w-[11rem]" onClick={() => void redirectToCreateAccount()}>{uiText.createAccount}</Button>
                      <Button variant="outline" onClick={() => persistAndRedirectToLogin()}>{uiText.signIn || 'Sign in'}</Button>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => void finishSetup()}
                      >
                        {uiText.continueGuest}
                      </Button>
                    </div>
                  </div>
                ) : mode === 'new' && role === 'teacher' ? (
                  <div className="flex justify-end gap-2">
                    <Button onClick={() => void redirectToCreateAccount()}>{uiText.createAccount}</Button>
                  </div>
                ) : !session ? (
                  <div className="flex justify-end">
                    <Button onClick={() => persistAndRedirectToLogin()}>{uiText.createAccount}</Button>
                  </div>
                ) : (
                  <div className="flex justify-end">
                    <Button onClick={() => void finishSetup()} disabled={savingFinal}>{uiText.finish}</Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
      <style jsx>{`
        .setup-step-anim {
          animation: setupStepIn 240ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .setup-option {
          animation: setupOptionIn 260ms ease-out both;
        }
        @keyframes setupStepIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes setupOptionIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
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
