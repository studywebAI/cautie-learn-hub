'use client';

import { useContext, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppContext, AppContextType, useDictionary } from '@/contexts/app-context';
import { ThemePicker } from '@/components/settings/theme-picker';
import { NotificationPreferences } from '@/components/notifications/notification-preferences';
import { TwoFASetup } from '@/components/settings/2fa-setup';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ArrowLeft, ArrowUpRight, Eye, EyeOff, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OPENROUTER_LOCKED_MODEL } from '@/lib/ai/openrouter-policy';

const SUBSCRIPTION_CACHE_KEY = 'studyweb-subscription-cache-v1';
const SUBSCRIPTION_CACHE_TTL_MS = 300_000;

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    role,
    language,
    setLanguage,
    region,
    setRegion,
    schoolingLevel,
    setSchoolingLevel,
    theme,
    setTheme,
    session,
  } = useContext(AppContext) as AppContextType;

  const { dictionary } = useDictionary();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState('personalization');
  const [subscriptionTier, setSubscriptionTier] = useState<string>('free');
  const [subscriptionType, setSubscriptionType] = useState<string>(role === 'teacher' ? 'teacher' : 'student');
  const [displayName, setDisplayName] = useState('');
  const [displayNameSaving, setDisplayNameSaving] = useState(false);
  const [nameLockedByTeacher, setNameLockedByTeacher] = useState(false);
  const [supportCode, setSupportCode] = useState('');
  const [supportCodeVisible, setSupportCodeVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [aiProvider, setAiProvider] = useState<'openai'>('openai');
  const [openaiApiKeyDraft, setOpenaiApiKeyDraft] = useState('');
  const [openaiModel, setOpenaiModel] = useState<string>(OPENROUTER_LOCKED_MODEL);
  const [sttProviderStrategy, setSttProviderStrategy] = useState<'groq_with_openai_fallback' | 'openai_only'>('groq_with_openai_fallback');
  const [effectiveSttProvider, setEffectiveSttProvider] = useState<'groq' | 'openai' | 'unavailable'>('unavailable');
  const [aiSettingsLoading, setAiSettingsLoading] = useState(true);
  const [aiSettingsSaving, setAiSettingsSaving] = useState(false);
  const [aiSettingsStatus, setAiSettingsStatus] = useState('');
  const [hasOpenAIKey, setHasOpenAIKey] = useState(false);
  const [usesDefaultOpenAIKey, setUsesDefaultOpenAIKey] = useState(false);
  const [logCodeQuery, setLogCodeQuery] = useState('');
  const [adaptiveSensitivity, setAdaptiveSensitivity] = useState<'conservative' | 'balanced' | 'aggressive'>('balanced');
  const [oauthProvider, setOauthProvider] = useState<string | null>(null);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedSensitivity = window.localStorage.getItem('studyweb-adaptive-sensitivity');
    if (savedSensitivity === 'conservative' || savedSensitivity === 'balanced' || savedSensitivity === 'aggressive') {
      setAdaptiveSensitivity(savedSensitivity);
    }
  }, []);

  // Check OAuth provider and linked account
  useEffect(() => {
    if (!session?.user) return;
    const provider = session.user.user_metadata?.provider;
    const providerEmail = session.user.user_metadata?.email || session.user.email;
    if (provider) {
      setOauthProvider(provider);
      setGoogleEmail(providerEmail);
    }
  }, [session?.user]);

  const updateAdaptiveSensitivity = (value: 'conservative' | 'balanced' | 'aggressive') => {
    setAdaptiveSensitivity(value);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('studyweb-adaptive-sensitivity', value);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem('studyweb-display-name') || '';
    if (saved.trim()) {
      setDisplayName(saved.trim());
      return;
    }
    const fallback = session?.user?.email?.split('@')[0] || 'Guest';
    setDisplayName(fallback);
  }, [session?.user?.email]);

  useEffect(() => {
    if (!session?.user?.id) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('display_name, name_locked_by_teacher, support_code')
        .eq('id', session.user.id)
        .maybeSingle();
      if (data?.name_locked_by_teacher) {
        setNameLockedByTeacher(true);
        if (data.display_name) setDisplayName(data.display_name);
      }
      if (data?.support_code) setSupportCode(data.support_code);
    })();
  }, [session?.user?.id]);

  const savePassword = async () => {
    setPasswordStatus(null);
    if (newPassword.length < 8) {
      setPasswordStatus({ type: 'error', message: tr({ en: 'Password must be at least 8 characters.', nl: 'Wachtwoord moet minstens 8 tekens zijn.' }) });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', message: tr({ en: 'Passwords do not match.', nl: 'Wachtwoorden komen niet overeen.' }) });
      return;
    }
    setPasswordSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordStatus({ type: 'success', message: tr({ en: 'Password updated.', nl: 'Wachtwoord bijgewerkt.' }) });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordStatus({ type: 'error', message: err instanceof Error ? err.message : tr({ en: 'Could not update password.', nl: 'Kon wachtwoord niet bijwerken.' }) });
    } finally {
      setPasswordSaving(false);
    }
  };

  useEffect(() => {
    const tabParam = (searchParams?.get('tab') || '').toLowerCase();
    const validTabs = new Set(['personalization', 'account', 'general', 'studysets', 'subscription', 'help', 'log-codes', '2fa']);
    if (validTabs.has(tabParam)) {
      setActiveTab(tabParam);
      return;
    }
    setActiveTab('personalization');
  }, [searchParams]);

  useEffect(() => {
    const loadAiSettings = async () => {
      setAiSettingsLoading(true);
      try {
        const response = await fetch('/api/user/ai-settings', { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json();
        setAiProvider('openai');
        if (typeof data?.openaiModel === 'string' && data.openaiModel.trim()) {
          setOpenaiModel(data.openaiModel.trim());
        }
        if (data?.sttProviderStrategy === 'openai_only' || data?.sttProviderStrategy === 'groq_with_openai_fallback') {
          setSttProviderStrategy(data.sttProviderStrategy);
        }
        if (data?.effectiveSttProvider === 'groq' || data?.effectiveSttProvider === 'openai' || data?.effectiveSttProvider === 'unavailable') {
          setEffectiveSttProvider(data.effectiveSttProvider);
        }
        setHasOpenAIKey(Boolean(data?.hasOpenAIKey));
        setUsesDefaultOpenAIKey(Boolean(data?.usesDefaultOpenAIKey));
      } catch {
        // silent fallback
      } finally {
        setAiSettingsLoading(false);
      }
    };
    void loadAiSettings();
  }, []);

  const saveAiSettings = async () => {
    setAiSettingsSaving(true);
    setAiSettingsStatus('');
    try {
      const response = await fetch('/api/user/ai-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerPreference: aiProvider,
          openaiApiKey: openaiApiKeyDraft.trim(),
          openaiModel,
          sttProviderStrategy,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Could not save AI settings');
      setHasOpenAIKey(Boolean(data?.hasOpenAIKey));
      setUsesDefaultOpenAIKey(Boolean(data?.usesDefaultOpenAIKey));
      if (data?.effectiveSttProvider === 'groq' || data?.effectiveSttProvider === 'openai' || data?.effectiveSttProvider === 'unavailable') {
        setEffectiveSttProvider(data.effectiveSttProvider);
      }
      setOpenaiApiKeyDraft('');
      setAiSettingsStatus('Saved');
    } catch (error: any) {
      setAiSettingsStatus(error?.message || 'Save failed');
    } finally {
      setAiSettingsSaving(false);
    }
  };

  const saveDisplayName = async () => {
    const next = displayName.trim();
    if (typeof window !== 'undefined') {
      if (next) {
        window.localStorage.setItem('studyweb-display-name', next);
      } else {
        window.localStorage.removeItem('studyweb-display-name');
      }
    }
    if (!session?.user?.id) return;
    setDisplayNameSaving(true);
    try {
      await supabase.from('profiles').upsert({ id: session.user.id, display_name: next || null });
    } catch {
      // Keep local state as source of truth even when profile sync fails.
    }
    setDisplayNameSaving(false);
  };

  useEffect(() => {
    if (role === 'teacher') {
      setSubscriptionType('teacher');
    }
  }, [role]);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!session?.user?.id) return;
      try {
        if (typeof window !== 'undefined') {
          const raw = window.sessionStorage.getItem(SUBSCRIPTION_CACHE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.updatedAt && Date.now() - parsed.updatedAt < SUBSCRIPTION_CACHE_TTL_MS) {
              setSubscriptionTier(parsed.tier || 'free');
              setSubscriptionType(parsed.type || 'student');
              return;
            }
          }
        }

        const response = await fetch('/api/subscription/upgrade');
        if (!response.ok) return;
        const data = await response.json();
        const nextTier = data.tier || 'free';
        const nextType = data.type || (role === 'teacher' ? 'teacher' : 'student');
        setSubscriptionTier(nextTier);
        setSubscriptionType(nextType);
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem(
            SUBSCRIPTION_CACHE_KEY,
            JSON.stringify({
              updatedAt: Date.now(),
              tier: nextTier,
              type: nextType,
            })
          );
        }
      } catch {
        // best effort
      }
    };

    void fetchSubscription();
  }, [session?.user?.id, role]);

  const isDutch = language === 'nl';
  const locale = (language || 'en').toLowerCase();
  const tr = (values: Partial<Record<string, string>>) => values[locale] || values.en || '';
  const tabItems = [
    { id: 'personalization', label: tr({ en: 'Personalization', nl: 'Personalisatie' }) },
    { id: 'account', label: tr({ en: 'Account', nl: 'Account' }) },
    { id: '2fa', label: tr({ en: 'Two-Factor Auth', nl: 'Twee-factor auth' }) },
    { id: 'general', label: tr({ en: 'General', nl: 'Algemeen' }) },
    { id: 'studysets', label: tr({ en: 'Studysets', nl: 'Studiesets' }) },
    { id: 'subscription', label: tr({ en: 'Subscription', nl: 'Abonnement' }) },
    { id: 'help', label: tr({ en: 'Help & FAQ', nl: 'Help & FAQ' }) },
    { id: 'log-codes', label: tr({ en: 'Log codes', nl: 'Logcodes' }) },
  ] as const;

  const logCodeDocs: Record<string, { title: string; descriptionEn: string; descriptionNl: string }> = {
    'EVT-ATT-001': {
      title: 'Attendance state changed',
      descriptionEn: 'Attendance check/X was changed for a student. Includes teacher, class, and timestamp.',
      descriptionNl: 'Aanwezigheid check/X is aangepast voor een leerling. Bevat docent, klas en tijdstip.',
    },
    'EVT-ATT-002': {
      title: 'Attendance homework flag',
      descriptionEn: 'Homework incomplete flag was enabled or disabled.',
      descriptionNl: 'Huiswerk-onvolledig vlag is aan of uit gezet.',
    },
    'EVT-ATT-003': {
      title: 'Attendance late flag',
      descriptionEn: 'Late flag was enabled or disabled.',
      descriptionNl: 'Te-laat vlag is aan of uit gezet.',
    },
    'EVT-CUS-001': {
      title: 'Custom event',
      descriptionEn: 'Teacher posted a custom attendance event message.',
      descriptionNl: 'Docent heeft een aangepast eventbericht geplaatst.',
    },
    'ROS-MEM-001': {
      title: 'Class member rename',
      descriptionEn: 'A class-scoped student alias was changed by a teacher.',
      descriptionNl: 'Een klasgebonden leerling-naam is aangepast door een docent.',
    },
    'ACD-EDT-001': {
      title: 'Academic content changed',
      descriptionEn: 'Subject/chapter/paragraph/assignment content was created or edited.',
      descriptionNl: 'Vak/hoofdstuk/paragraaf/opdracht is aangemaakt of bewerkt.',
    },
  };
  const normalizedCodeQuery = logCodeQuery.trim().toUpperCase();
  const selectedLogCodeDoc = normalizedCodeQuery ? logCodeDocs[normalizedCodeQuery] : null;
  const ui = {
    settings: tr({ en: 'Settings', nl: 'Instellingen' }),
    back: tr({ en: 'Return', nl: 'Terug' }),
    language: tr({ en: 'Language', nl: 'Taal' }),
    languagePlaceholder: tr({ en: 'Select language', nl: 'Selecteer taal' }),
    displayName: tr({ en: 'Display name', nl: 'Weergavenaam' }),
    displayNamePlaceholder: tr({ en: 'Your display name', nl: 'Jouw weergavenaam' }),
    saving: tr({ en: 'Saving...', nl: 'Opslaan...' }),
    save: tr({ en: 'Save', nl: 'Opslaan' }),
    region: tr({ en: 'Region', nl: 'Regio' }),
    regionPlaceholder: tr({ en: 'Select region', nl: 'Selecteer regio' }),
    schoolingLevel: tr({ en: 'Degree of schooling', nl: 'Onderwijsniveau' }),
    schoolingPlaceholder: tr({ en: 'Select schooling level', nl: 'Selecteer onderwijsniveau' }),
    aiProvider: tr({ en: 'AI provider', nl: 'AI-provider' }),
    aiProviderPlaceholder: tr({ en: 'Select provider', nl: 'Selecteer provider' }),
    autoRecommended: tr({ en: 'Auto (Recommended)', nl: 'Auto (Aanbevolen)' }),
    openAIKeyOptional: tr({ en: 'OpenAI API key (optional)', nl: 'OpenAI API-sleutel (optioneel)' }),
    noOpenAIKey: tr({ en: 'No OpenAI key available yet.', nl: 'Nog geen OpenAI-sleutel beschikbaar.' }),
    customOpenAIKeySaved: tr({ en: 'Custom OpenAI key saved for your account.', nl: 'Aangepaste OpenAI-sleutel is opgeslagen voor je account.' }),
    usingDefaultOpenAIKey: tr({ en: 'Using platform default OpenAI key.', nl: 'Standaard OpenAI-sleutel van het platform wordt gebruikt.' }),
    keyEncrypted: tr({ en: 'Your key is encrypted server-side and never returned to the client after saving.', nl: 'Je sleutel wordt server-side versleuteld en na opslaan niet teruggestuurd naar de client.' }),
    saveAiSettings: tr({ en: 'Save AI settings', nl: 'AI-instellingen opslaan' }),
    openAIModel: tr({ en: 'OpenAI model', nl: 'OpenAI-model' }),
    sttStrategy: tr({ en: 'STT strategy', nl: 'STT-strategie' }),
    subscription: tr({ en: 'Subscription', nl: 'Abonnement' }),
    current: tr({ en: 'Current', nl: 'Huidig' }),
    teacher: tr({ en: 'Teacher', nl: 'Docent' }),
    student: tr({ en: 'Student', nl: 'Leerling' }),
    upgradeSubscriptionHere: tr({ en: 'Upgrade subscription here', nl: 'Upgrade abonnement hier' }),
  };

  return (
    <div className="page-content">
      <div className="flex w-full flex-col gap-4">
        <div className="flex items-center justify-between rounded-xl surface-panel px-1 py-1">
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-xl"
            onClick={() => {
              if (typeof window !== 'undefined' && window.history.length > 1) {
                router.back();
                return;
              }
              router.push('/');
            }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {ui.back}
          </Button>
        </div>
        <PageHeader title={ui.settings} />

        <div className="rounded-xl surface-panel p-1">
          <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
            <aside className="rounded-xl surface-interactive p-2">
              <nav className="space-y-1">
                {tabItems.map((tabItem) => (
                  <button
                    key={tabItem.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tabItem.id);
                      router.replace(`/settings?tab=${tabItem.id}`);
                    }}
                    className={cn(
                      'w-full rounded-lg px-3 py-2 text-left text-sm transition-colors',
                      activeTab === tabItem.id ? 'surface-interactive text-foreground' : 'text-foreground/85 hover:surface-interactive hover:text-foreground'
                    )}
                  >
                    {tabItem.label}
                  </button>
                ))}
              </nav>
            </aside>

            <div className="space-y-5">
              {activeTab === 'personalization' && (
              <Card className="border-0 surface-panel shadow-none">
                <CardHeader>
                  <CardTitle>{dictionary.settings.personalization.title}</CardTitle>
                  <CardDescription>{dictionary.settings.personalization.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-2 max-w-md">
                    <Label htmlFor="language">{ui.language}</Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger id="language">
                        <SelectValue placeholder={ui.languagePlaceholder} />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="zh">Chinese</SelectItem>
                          <SelectItem value="hi">Hindi</SelectItem>
                          <SelectItem value="es">Spanish</SelectItem>
                          <SelectItem value="fr">French</SelectItem>
                          <SelectItem value="ar">Arabic</SelectItem>
                          <SelectItem value="bn">Bangla</SelectItem>
                          <SelectItem value="pt">Portuguese</SelectItem>
                          <SelectItem value="ru">Russian</SelectItem>
                          <SelectItem value="ur">Urdu</SelectItem>
                          <SelectItem value="de">Deutsch (German)</SelectItem>
                          <SelectItem value="id">Bahasa Indonesia</SelectItem>
                          <SelectItem value="tr">Turkish</SelectItem>
                          <SelectItem value="it">Italiano (Italian)</SelectItem>
                          <SelectItem value="nl">Nederlands (Dutch)</SelectItem>
                          <SelectItem value="pl">Polski (Polish)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2 max-w-md">
                    <Label htmlFor="display-name">{ui.displayName}</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="display-name"
                        value={displayName}
                        onChange={(event) => setDisplayName(event.target.value)}
                        placeholder={ui.displayNamePlaceholder}
                        disabled={nameLockedByTeacher}
                      />
                      <Button onClick={() => void saveDisplayName()} disabled={displayNameSaving || nameLockedByTeacher}>
                        {displayNameSaving ? ui.saving : ui.save}
                      </Button>
                    </div>
                    {nameLockedByTeacher && (
                      <p className="text-xs text-muted-foreground">
                        {tr({
                          en: 'A teacher set your name. You can no longer change it yourself.',
                          nl: 'Een docent heeft je naam ingesteld. Je kunt deze zelf niet meer wijzigen.',
                        })}
                      </p>
                    )}
                  </div>

                  <ThemePicker theme={theme} setTheme={setTheme} />
                </CardContent>
              </Card>
              )}

              {activeTab === 'account' && (
              <Card className="border-0 surface-panel shadow-none">
                <CardHeader>
                  <CardTitle>{tr({ en: 'Account', nl: 'Account' })}</CardTitle>
                  <CardDescription>
                    {tr({ en: 'Your name, email, password, support code, and linked accounts.', nl: 'Je naam, e-mail, wachtwoord, supportcode en gekoppelde accounts.' })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-2 max-w-md">
                    <Label>{ui.displayName}</Label>
                    <Input value={displayName} disabled />
                    {nameLockedByTeacher ? (
                      <p className="text-xs text-muted-foreground">
                        {tr({
                          en: 'A teacher set your name. You can no longer change it yourself.',
                          nl: 'Een docent heeft je naam ingesteld. Je kunt deze zelf niet meer wijzigen.',
                        })}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {tr({ en: 'Edit this under the Personalization tab.', nl: 'Wijzig dit onder het tabblad Personalisatie.' })}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-2 max-w-md">
                    <Label>{tr({ en: 'Email', nl: 'E-mail' })}</Label>
                    <Input value={session?.user?.email || ''} disabled />
                  </div>

                  <div className="grid gap-2 max-w-md">
                    <Label htmlFor="support-code">{tr({ en: 'Student/teacher code', nl: 'Leerling-/docentcode' })}</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="support-code"
                        value={supportCodeVisible ? supportCode : '••••••'}
                        readOnly
                        className="font-mono tracking-widest"
                      />
                      <Button type="button" variant="outline" size="icon" onClick={() => setSupportCodeVisible((v) => !v)}>
                        {supportCodeVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => { if (supportCode) void navigator.clipboard.writeText(supportCode); }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {tr({
                        en: 'Give this code to support so they can identify your account.',
                        nl: 'Geef deze code aan support zodat ze je account kunnen identificeren.',
                      })}
                    </p>
                  </div>

                  <div className="grid gap-2 max-w-md">
                    <Label htmlFor="new-password">{tr({ en: 'New password', nl: 'Nieuw wachtwoord' })}</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      placeholder={tr({ en: 'At least 8 characters', nl: 'Minstens 8 tekens' })}
                    />
                    <Label htmlFor="confirm-password">{tr({ en: 'Confirm new password', nl: 'Bevestig nieuw wachtwoord' })}</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                    />
                    <Button onClick={() => void savePassword()} disabled={passwordSaving || !newPassword || !confirmPassword} className="w-fit">
                      {passwordSaving ? ui.saving : tr({ en: 'Update password', nl: 'Wachtwoord bijwerken' })}
                    </Button>
                    {passwordStatus && (
                      <p className={cn('text-xs', passwordStatus.type === 'error' ? 'text-destructive' : 'text-muted-foreground')}>
                        {passwordStatus.message}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-2 max-w-md">
                    <Label>{tr({ en: 'Linked accounts', nl: 'Gekoppelde accounts' })}</Label>
                    {oauthProvider === 'google' ? (
                      <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-muted/20">
                        <div>
                          <p className="text-sm font-medium">{tr({ en: 'Google', nl: 'Google' })}</p>
                          <p className="text-xs text-muted-foreground">{googleEmail}</p>
                        </div>
                        <span className="text-xs font-medium text-success">{tr({ en: 'Connected', nl: 'Verbonden' })}</span>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {tr({
                          en: 'No OAuth providers linked. Sign in with Google from the login page to link your account.',
                          nl: 'Geen OAuth-providers gekoppeld. Meld je aan met Google op de login-pagina om je account te koppelen.',
                        })}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
              )}

              {activeTab === '2fa' && (
              <TwoFASetup isDutch={isDutch} />
              )}

              {activeTab === 'general' && (
              <Card className="border-0 surface-panel shadow-none">
                <CardHeader>
                  <CardTitle>{dictionary.settings.general.title}</CardTitle>
                  <CardDescription>{dictionary.settings.general.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-2 max-w-md">
                    <Label htmlFor="region">{ui.region}</Label>
                    <Select value={region} onValueChange={(value) => setRegion(value as any)}>
                      <SelectTrigger id="region">
                        <SelectValue placeholder={ui.regionPlaceholder} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="global">Global</SelectItem>
                        <SelectItem value="us">United States</SelectItem>
                        <SelectItem value="ca">Canada</SelectItem>
                        <SelectItem value="uk">United Kingdom</SelectItem>
                        <SelectItem value="eu">Europe</SelectItem>
                        <SelectItem value="nl">Netherlands</SelectItem>
                        <SelectItem value="de">Germany</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="pl">Poland</SelectItem>
                        <SelectItem value="it">Italy</SelectItem>
                        <SelectItem value="au">Australia</SelectItem>
                        <SelectItem value="nz">New Zealand</SelectItem>
                        <SelectItem value="in">India</SelectItem>
                        <SelectItem value="sg">Singapore</SelectItem>
                        <SelectItem value="jp">Japan</SelectItem>
                        <SelectItem value="kr">South Korea</SelectItem>
                        <SelectItem value="br">Brazil</SelectItem>
                        <SelectItem value="mx">Mexico</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Influences localized wording and defaults.</p>
                  </div>

                  <div className="grid gap-2 max-w-md">
                    <Label htmlFor="schooling-level">{ui.schoolingLevel}</Label>
                    <Select value={String(schoolingLevel)} onValueChange={(value) => setSchoolingLevel(Number(value) as any)}>
                      <SelectTrigger id="schooling-level">
                        <SelectValue placeholder={ui.schoolingPlaceholder} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Primary / Foundation</SelectItem>
                        <SelectItem value="2">Middle / High School</SelectItem>
                        <SelectItem value="3">College / University</SelectItem>
                        <SelectItem value="4">Advanced / Professional</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Adjusts baseline tool difficulty.</p>
                  </div>

                  <div className="grid gap-2 max-w-md">
                    <Label htmlFor="provider">{ui.aiProvider}</Label>
                    <Select
                      value={aiProvider}
                      onValueChange={() => setAiProvider('openai')}
                      disabled
                    >
                      <SelectTrigger id="provider">
                        <SelectValue placeholder={ui.aiProviderPlaceholder} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">OpenRouter</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Locked: OpenRouter route only.</p>
                  </div>

                  <div className="grid gap-2 max-w-md">
                    <Label htmlFor="openai-user-key">{ui.openAIKeyOptional}</Label>
                    <Input
                      id="openai-user-key"
                      type="password"
                      autoComplete="off"
                      spellCheck={false}
                      value={openaiApiKeyDraft}
                      onChange={(event) => setOpenaiApiKeyDraft(event.target.value)}
                      placeholder="sk-..."
                    />
                    <p className="text-xs text-muted-foreground">
                      {hasOpenAIKey ? ui.customOpenAIKeySaved : usesDefaultOpenAIKey ? ui.usingDefaultOpenAIKey : ui.noOpenAIKey}
                    </p>
                    <p className="text-xs text-muted-foreground">{ui.keyEncrypted}</p>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void saveAiSettings()}
                        disabled={aiSettingsSaving || aiSettingsLoading}
                      >
                        {aiSettingsSaving ? ui.saving : ui.saveAiSettings}
                      </Button>
                      {aiSettingsStatus ? <span className="text-xs text-muted-foreground">{aiSettingsStatus}</span> : null}
                    </div>
                  </div>

                  <div className="grid gap-2 max-w-md">
                    <Label htmlFor="openai-model">{ui.openAIModel}</Label>
                    <Select value={openaiModel} onValueChange={setOpenaiModel} disabled>
                      <SelectTrigger id="openai-model">
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="google/gemini-2.5-flash-lite">google/gemini-2.5-flash-lite</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Locked model for tool runs via OpenRouter.</p>
                  </div>

                  <div className="grid gap-2 max-w-md">
                    <Label htmlFor="stt-strategy">{ui.sttStrategy}</Label>
                    <Select
                      value={sttProviderStrategy}
                      onValueChange={(value) => {
                        if (value === 'openai_only' || value === 'groq_with_openai_fallback') {
                          setSttProviderStrategy(value);
                        }
                      }}
                    >
                      <SelectTrigger id="stt-strategy">
                        <SelectValue placeholder="Select STT strategy" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="groq_with_openai_fallback">Groq Whisper primary + OpenAI fallback</SelectItem>
                        <SelectItem value="openai_only">OpenAI only</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Controls microphone transcription provider order.</p>
                  </div>

                  <div className="grid gap-1 max-w-md">
                    <p className="text-xs text-muted-foreground">STT strategy: {sttProviderStrategy}</p>
                    <p className="text-xs text-muted-foreground">Effective STT provider: {effectiveSttProvider}</p>
                  </div>
                </CardContent>
              </Card>
              )}

              {activeTab === 'studysets' && (
              <div className="space-y-5">
                <Card className="border-0 surface-panel shadow-none">
                  <CardHeader>
                    <CardTitle>Adaptive sensitivity</CardTitle>
                    <CardDescription>How aggressively your study plan adapts to your performance.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      {([
                        { id: 'conservative', label: 'Conservative', description: 'Small adjustments, stable plan' },
                        { id: 'balanced', label: 'Balanced', description: 'Moderate adaptation' },
                        { id: 'aggressive', label: 'Aggressive', description: 'Fast and intensive adaptations' },
                      ] as Array<{ id: 'conservative' | 'balanced' | 'aggressive'; label: string; description: string }>).map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => updateAdaptiveSensitivity(option.id)}
                          className={cn(
                            'flex flex-col gap-1 rounded-xl border-2 p-4 text-left transition-colors',
                            adaptiveSensitivity === option.id
                              ? 'border-primary surface-interactive'
                              : 'border-border hover:border-muted-foreground/30'
                          )}
                        >
                          <span className="text-sm font-medium text-foreground">
                            {option.label}
                            {option.id === 'balanced' ? <span className="ml-1 text-xs text-muted-foreground">(Recommended)</span> : null}
                          </span>
                          <span className="text-xs text-muted-foreground">{option.description}</span>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">This setting will be applied to all new study plans.</p>
                  </CardContent>
                </Card>

                <NotificationPreferences className="border-0 surface-panel shadow-none" />
              </div>
              )}

              {activeTab === 'subscription' && (
              <Card className="border-0 surface-panel shadow-none">
                <CardHeader>
                  <CardTitle>{ui.subscription}</CardTitle>
                  <CardDescription>
                    {ui.current}: {subscriptionTier} {subscriptionType === 'teacher' ? ui.teacher : ui.student}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="rounded-xl">
                    <a href="/upgrade">
                      {ui.upgradeSubscriptionHere}
                      <ArrowUpRight className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
              )}

              {activeTab === 'help' && (
                <Card className="border-0 surface-panel shadow-none">
                  <CardHeader>
                    <CardTitle>{tr({ en: 'Help & FAQ', nl: 'Help & FAQ' })}</CardTitle>
                    <CardDescription>
                      {tr({
                        en: 'Answers to common questions about cautie.',
                        nl: 'Antwoorden op veelgestelde vragen over cautie.',
                      })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {([
                      {
                        section: tr({ en: 'Getting started', nl: 'Aan de slag' }),
                        items: [
                          {
                            q: tr({ en: 'How do I join a class as a student?', nl: 'Hoe neem ik deel aan een klas als leerling?' }),
                            a: tr({ en: 'Go to Classes in the sidebar and click "Join a Class". Enter the code from your teacher. You\'ll see the class immediately after joining.', nl: 'Ga naar Klassen in de zijbalk en klik op "Klasse deelnemen". Voer de code van je docent in. Je ziet de klas direct na deelname.' }),
                          },
                          {
                            q: tr({ en: 'How do I create a class as a teacher?', nl: 'Hoe maak ik een klas aan als docent?' }),
                            a: tr({ en: 'Use the "+ New class" button in the left sidebar or the class switcher at the top. You\'ll be asked for a class name, optional description, and first subject.', nl: 'Gebruik de knop "+ Nieuwe klas" in de linker zijbalk of de klassenwisselaar bovenin. Je voert een naam, optionele beschrijving en het eerste vak in.' }),
                          },
                          {
                            q: tr({ en: 'Where is my dashboard?', nl: 'Waar is mijn dashboard?' }),
                            a: tr({ en: 'Click the home icon or cautie logo in the sidebar. Students see their agenda, upcoming deadlines, and study tasks. Teachers see a class overview.', nl: 'Klik op het huis-icoon of het cautie-logo in de zijbalk. Leerlingen zien hun agenda, aankomende deadlines en studietaken. Docenten zien een klasoverzicht.' }),
                          },
                        ],
                      },
                      {
                        section: tr({ en: 'Classes & subjects', nl: 'Klassen & vakken' }),
                        items: [
                          {
                            q: tr({ en: 'What is the difference between a class and a subject?', nl: 'Wat is het verschil tussen een klas en een vak?' }),
                            a: tr({ en: 'A class is a group of students (e.g. "3A"). A subject is the content area (e.g. "Biology"). One class can have multiple subjects.', nl: 'Een klas is een groep leerlingen (bv. "3A"). Een vak is het inhoudsgebied (bv. "Biologie"). Een klas kan meerdere vakken hebben.' }),
                          },
                          {
                            q: tr({ en: 'Why do I see a different name in one class?', nl: 'Waarom zie ik een andere naam in een klas?' }),
                            a: tr({ en: 'Teachers can set a class-scoped alias for you. It only applies to that class and doesn\'t affect your account name.', nl: 'Docenten kunnen een klasgebonden naam voor je instellen. Dit geldt alleen voor die klas en heeft geen invloed op je accountnaam.' }),
                          },
                          {
                            q: tr({ en: 'How do I leave a class?', nl: 'Hoe verlaat ik een klas?' }),
                            a: tr({ en: 'Go to Classes in the sidebar, find the class, and click "Leave class" below the class card.', nl: 'Ga naar Klassen in de zijbalk, vind de klas en klik op "Klasse verlaten" onder de klaskaart.' }),
                          },
                        ],
                      },
                      {
                        section: tr({ en: 'Attendance', nl: 'Aanwezigheid' }),
                        items: [
                          {
                            q: tr({ en: 'What do the attendance symbols mean?', nl: 'Wat betekenen de aanwezigheidssymbolen?' }),
                            a: tr({ en: 'Check (✓) = present, X = absent, HW = homework incomplete, Late = arrived late. Each change is logged with the teacher\'s name and a timestamp.', nl: 'Check (✓) = aanwezig, X = afwezig, HW = huiswerk onvolledig, Laat = te laat. Elke wijziging wordt gelogd met de naam van de docent en een tijdstip.' }),
                          },
                          {
                            q: tr({ en: 'Can I see my attendance history?', nl: 'Kan ik mijn aanwezigheidshistorie bekijken?' }),
                            a: tr({ en: 'Teachers can view per-student attendance in the class Attendance tab. Students can see their summary in the class Group tab.', nl: 'Docenten kunnen de aanwezigheid per leerling bekijken in het tabblad Aanwezigheid. Leerlingen zien een overzicht in het tabblad Groep.' }),
                          },
                        ],
                      },
                      {
                        section: tr({ en: 'Tools & studying', nl: 'Tools & studeren' }),
                        items: [
                          {
                            q: tr({ en: 'What tools are available?', nl: 'Welke tools zijn beschikbaar?' }),
                            a: tr({ en: 'Quiz generator, Flashcard maker, Notes, Mindmap, Timeline, and Studyset. Find them under "Tools" in the sidebar.', nl: 'Quizgenerator, Flashcard maker, Notities, Mindmap, Tijdlijn en Studieset. Vind ze onder "Tools" in de zijbalk.' }),
                          },
                          {
                            q: tr({ en: 'Where do my tool results go?', nl: 'Waar gaan mijn toolresultaten naartoe?' }),
                            a: tr({ en: 'All tool runs are saved automatically. Find recent results in the "Recents" panel at the bottom of the sidebar.', nl: 'Alle toolresultaten worden automatisch opgeslagen. Vind recente resultaten in het "Recent"-paneel onderaan de zijbalk.' }),
                          },
                          {
                            q: tr({ en: 'What is a Studyset?', nl: 'Wat is een Studieset?' }),
                            a: tr({ en: 'A Studyset bundles a subject\'s content into a focused study plan with tasks for each day. Create one from the Studyset tool page.', nl: 'Een Studieset bundelt de inhoud van een vak in een gefocust studieplan met taken per dag. Maak er een via de Studieset-pagina.' }),
                          },
                        ],
                      },
                      {
                        section: tr({ en: 'Assignments & grades', nl: 'Opdrachten & cijfers' }),
                        items: [
                          {
                            q: tr({ en: 'How do I submit an assignment?', nl: 'Hoe lever ik een opdracht in?' }),
                            a: tr({ en: 'Open the assignment from your agenda or the subject page and use the submit button at the bottom.', nl: 'Open de opdracht vanuit je agenda of de vakpagina en gebruik de knop Inleveren onderaan.' }),
                          },
                          {
                            q: tr({ en: 'Where can I see my grades?', nl: 'Waar kan ik mijn cijfers zien?' }),
                            a: tr({ en: 'Grades are visible in the class Grades tab (teachers) or on the assignment detail page after grading.', nl: 'Cijfers zijn zichtbaar in het tabblad Cijfers (docenten) of op de opdrachtdetailpagina na nakijken.' }),
                          },
                        ],
                      },
                      {
                        section: tr({ en: 'Account & settings', nl: 'Account & instellingen' }),
                        items: [
                          {
                            q: tr({ en: 'How do I change my display name?', nl: 'Hoe verander ik mijn weergavenaam?' }),
                            a: tr({ en: 'Go to Settings → Personalization. Enter your preferred name and click Save.', nl: 'Ga naar Instellingen → Personalisatie. Voer je gewenste naam in en klik op Opslaan.' }),
                          },
                          {
                            q: tr({ en: 'How do I switch the language to Dutch?', nl: 'Hoe zet ik de taal op Nederlands?' }),
                            a: tr({ en: 'Go to Settings → Personalization and select "Nederlands (Dutch)" from the Language dropdown.', nl: 'Ga naar Instellingen → Personalisatie en kies "Nederlands (Dutch)" in de Taal-keuzelijst.' }),
                          },
                          {
                            q: tr({ en: 'Where do I find log codes?', nl: 'Waar vind ik logcodes?' }),
                            a: tr({ en: 'Open the "Log codes" tab in Settings and type in the code (e.g. EVT-ATT-001) for a full explanation.', nl: 'Open het tabblad "Logcodes" in Instellingen en typ de code in (bv. EVT-ATT-001) voor een volledige uitleg.' }),
                          },
                        ],
                      },
                    ] as Array<{ section: string; items: Array<{ q: string; a: string }> }>).map(({ section, items }) => (
                      <div key={section} className="space-y-3">
                        <p className="text-sm text-muted-foreground">{section}</p>
                        <div className="space-y-2">
                          {items.map(({ q, a }) => (
                            <div key={q} className="rounded-xl surface-interactive p-4">
                              <p className="text-sm font-medium text-foreground">{q}</p>
                              <p className="mt-1 text-sm text-muted-foreground">{a}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {activeTab === 'log-codes' && (
                <Card className="border-0 surface-panel shadow-none">
                  <CardHeader>
                    <CardTitle>{tr({ en: 'Log codes', nl: 'Logcodes' })}</CardTitle>
                    <CardDescription>
                      {tr({ en: 'Enter a code, for example EVT-ATT-001 or ROS-MEM-001.', nl: 'Voer een code in, bijvoorbeeld EVT-ATT-001 of ROS-MEM-001.' })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Input
                      value={logCodeQuery}
                      onChange={(event) => setLogCodeQuery(event.target.value)}
                      placeholder={tr({ en: 'Enter log code...', nl: 'Voer logcode in...' })}
                    />
                    {selectedLogCodeDoc ? (
                      <div className="rounded-xl border border-border surface-interactive p-4">
                        <p className="text-sm">{selectedLogCodeDoc.title}</p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {isDutch ? selectedLogCodeDoc.descriptionNl : selectedLogCodeDoc.descriptionEn}
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-border surface-interactive p-4 text-sm text-muted-foreground">
                        {normalizedCodeQuery
                          ? (isDutch
                            ? `Geen uitleg gevonden voor ${normalizedCodeQuery}.`
                            : `No explanation found for ${normalizedCodeQuery}.`)
                          : tr({
                              en: 'Available codes: EVT-ATT-001, EVT-ATT-002, EVT-ATT-003, EVT-CUS-001, ROS-MEM-001, ACD-EDT-001.',
                              nl: 'Beschikbare codes: EVT-ATT-001, EVT-ATT-002, EVT-ATT-003, EVT-CUS-001, ROS-MEM-001, ACD-EDT-001.',
                            })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
