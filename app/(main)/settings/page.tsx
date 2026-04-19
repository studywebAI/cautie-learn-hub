'use client';

import { useContext, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppContext, AppContextType, useDictionary } from '@/contexts/app-context';
import { ThemePicker } from '@/components/settings/theme-picker';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const SUBSCRIPTION_CACHE_KEY = 'studyweb-subscription-cache-v1';
const SUBSCRIPTION_CACHE_TTL_MS = 300_000;

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
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
  const [subscriptionType, setSubscriptionType] = useState<string>('student');
  const [displayName, setDisplayName] = useState('');
  const [displayNameSaving, setDisplayNameSaving] = useState(false);
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openai' | 'auto'>('auto');
  const [openaiApiKeyDraft, setOpenaiApiKeyDraft] = useState('');
  const [aiSettingsLoading, setAiSettingsLoading] = useState(true);
  const [aiSettingsSaving, setAiSettingsSaving] = useState(false);
  const [aiSettingsStatus, setAiSettingsStatus] = useState('');
  const [hasOpenAIKey, setHasOpenAIKey] = useState(false);
  const [usesDefaultOpenAIKey, setUsesDefaultOpenAIKey] = useState(false);
  const [logCodeQuery, setLogCodeQuery] = useState('');

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
    const tabParam = (searchParams?.get('tab') || '').toLowerCase();
    const validTabs = new Set(['personalization', 'general', 'subscription', 'help', 'log-codes']);
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
        if (data?.providerPreference === 'gemini' || data?.providerPreference === 'openai' || data?.providerPreference === 'auto') {
          setAiProvider(data.providerPreference);
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
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Could not save AI settings');
      setHasOpenAIKey(Boolean(data?.hasOpenAIKey));
      setUsesDefaultOpenAIKey(Boolean(data?.usesDefaultOpenAIKey));
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
        const nextType = data.type || 'student';
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
  }, [session?.user?.id]);

  const isDutch = language === 'nl';
  const locale = (language || 'en').toLowerCase();
  const tr = (values: Partial<Record<string, string>>) => values[locale] || values.en || '';
  const tabItems = [
    { id: 'personalization', label: tr({ en: 'Personalization', nl: 'Personalisatie' }) },
    { id: 'general', label: tr({ en: 'General', nl: 'Algemeen' }) },
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
    subscription: tr({ en: 'Subscription', nl: 'Abonnement' }),
    current: tr({ en: 'Current', nl: 'Huidig' }),
    teacher: tr({ en: 'Teacher', nl: 'Docent' }),
    student: tr({ en: 'Student', nl: 'Leerling' }),
    upgradeSubscriptionHere: tr({ en: 'Upgrade subscription here', nl: 'Upgrade abonnement hier' }),
  };

  return (
    <div className="h-full w-full overflow-auto bg-[hsl(var(--surface-1))] p-4 md:p-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-3 md:p-4">
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
          <h1 className="text-sm md:text-base">{ui.settings}</h1>
        </div>

        <div className="rounded-2xl border border-border bg-card p-3 md:p-5">
          <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
            <aside className="rounded-xl border border-border bg-muted/15 p-2">
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
                      activeTab === tabItem.id ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50'
                    )}
                  >
                    {tabItem.label}
                  </button>
                ))}
              </nav>
            </aside>

            <div className="space-y-5">
              {activeTab === 'personalization' && (
              <Card className="border-border shadow-none">
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
                          <SelectItem value="zh">中文 (Chinese)</SelectItem>
                          <SelectItem value="hi">हिन्दी (Hindi)</SelectItem>
                          <SelectItem value="es">Español (Spanish)</SelectItem>
                          <SelectItem value="fr">Français (French)</SelectItem>
                          <SelectItem value="ar">العربية (Arabic)</SelectItem>
                          <SelectItem value="bn">বাংলা (Bangla)</SelectItem>
                          <SelectItem value="pt">Português (Portuguese)</SelectItem>
                          <SelectItem value="ru">Русский (Russian)</SelectItem>
                          <SelectItem value="ur">اردو (Urdu)</SelectItem>
                          <SelectItem value="de">Deutsch (German)</SelectItem>
                          <SelectItem value="id">Bahasa Indonesia</SelectItem>
                          <SelectItem value="tr">Türkçe (Turkish)</SelectItem>
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
                      />
                      <Button onClick={() => void saveDisplayName()} disabled={displayNameSaving}>
                        {displayNameSaving ? ui.saving : ui.save}
                      </Button>
                    </div>
                  </div>

                  <ThemePicker theme={theme} setTheme={setTheme} />
                </CardContent>
              </Card>
              )}

              {activeTab === 'general' && (
              <Card className="border-border shadow-none">
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
                        <SelectItem value="fr">France</SelectItem>
                        <SelectItem value="es">Spain</SelectItem>
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
                    <p className="text-xs text-muted-foreground">Now: influences localized wording and defaults. Target: also drives curriculum and exam format defaults per region.</p>
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
                    <p className="text-xs text-muted-foreground">Now: adjusts tool difficulty baseline. Target: should also drive pace, vocabulary, and assessment complexity by default.</p>
                  </div>

                  <div className="grid gap-2 max-w-md">
                    <Label htmlFor="provider">{ui.aiProvider}</Label>
                    <Select
                      value={aiProvider}
                      onValueChange={(value) => {
                        const next = (value as 'gemini' | 'openai' | 'auto');
                        setAiProvider(next);
                      }}
                    >
                      <SelectTrigger id="provider">
                        <SelectValue placeholder={ui.aiProviderPlaceholder} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">{ui.autoRecommended}</SelectItem>
                        <SelectItem value="gemini">Gemini</SelectItem>
                        <SelectItem value="openai">OpenAI</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Auto uses Gemini first and switches to OpenAI on token/context-limit failures.</p>
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
                </CardContent>
              </Card>
              )}

              {activeTab === 'subscription' && (
              <Card className="border-border shadow-none">
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
                <Card className="border-border shadow-none">
                  <CardHeader>
                    <CardTitle>{tr({ en: 'Help & FAQ', nl: 'Help & FAQ' })}</CardTitle>
                    <CardDescription>
                      {tr({
                        en: 'Use this page for explanations about logs, attendance, and settings.',
                        nl: 'Gebruik deze pagina voor uitleg over logs, aanwezigheid en instellingen.',
                      })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm text-muted-foreground">
                    <div>
                      <p className="text-foreground">{tr({ en: 'Why do I see a different name in one class?', nl: 'Waarom zie ik een andere naam in een klas?' })}</p>
                      <p>{tr({ en: 'Teachers can set a class-scoped alias. It only changes that class.', nl: 'Docenten kunnen een klasgebonden alias instellen. Dit verandert alleen die klas.' })}</p>
                    </div>
                    <div>
                      <p className="text-foreground">{tr({ en: 'What do check, X, homework, and late mean?', nl: 'Wat betekenen check, X, huiswerk en laat?' })}</p>
                      <p>{tr({ en: 'Check = present, X = absent, homework = incomplete, late = late. Every action is logged with teacher and timestamp.', nl: 'Check = aanwezig, X = afwezig, huiswerk = onvolledig, laat = te laat. Alles wordt gelogd met docent en tijd.' })}</p>
                    </div>
                    <div>
                      <p className="text-foreground">{tr({ en: 'Where do I find log codes?', nl: 'Waar vind ik logcodes?' })}</p>
                      <p>{tr({ en: 'Open the "Log codes" tab and enter the code for full explanation.', nl: 'Open tab "Logcodes" en voer de code in voor een volledige uitleg.' })}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === 'log-codes' && (
                <Card className="border-border shadow-none">
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
                      <div className="rounded-xl border border-border bg-muted/20 p-4">
                        <p className="text-sm">{selectedLogCodeDoc.title}</p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {isDutch ? selectedLogCodeDoc.descriptionNl : selectedLogCodeDoc.descriptionEn}
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-border bg-muted/15 p-4 text-sm text-muted-foreground">
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
