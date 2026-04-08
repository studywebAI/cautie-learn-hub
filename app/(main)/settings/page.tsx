'use client';

import { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppContext, AppContextType, useDictionary } from '@/contexts/app-context';
import { ThemePicker } from '@/components/settings/theme-picker';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';

const SUBSCRIPTION_CACHE_KEY = 'studyweb-subscription-cache-v1';
const SUBSCRIPTION_CACHE_TTL_MS = 300_000;

export default function SettingsPage() {
  const router = useRouter();
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem('studyweb-display-name') || '';
    if (saved.trim()) {
      setDisplayName(saved.trim());
      return;
    }
    const fallback = session?.user?.email?.split('@')[0] || '';
    setDisplayName(fallback);
  }, [session?.user?.email]);

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
      window.localStorage.setItem('studyweb-display-name', next || 'guest');
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
            Return
          </Button>
          <h1 className="text-sm font-medium md:text-base">Settings</h1>
        </div>

        <div className="rounded-2xl border border-border bg-card p-3 md:p-5">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
            <TabsList className="flex w-full flex-wrap justify-start gap-2 bg-transparent p-0">
              <TabsTrigger value="personalization" className="rounded-xl border border-border px-3 py-2 text-[13px] data-[state=active]:bg-muted">
                personalization
              </TabsTrigger>
              <TabsTrigger value="general" className="rounded-xl border border-border px-3 py-2 text-[13px] data-[state=active]:bg-muted">
                general
              </TabsTrigger>
              <TabsTrigger value="subscription" className="rounded-xl border border-border px-3 py-2 text-[13px] data-[state=active]:bg-muted">
                subscription
              </TabsTrigger>
            </TabsList>

            <TabsContent value="personalization" className="mt-0">
              <Card className="border-border shadow-none">
                <CardHeader>
                  <CardTitle>{dictionary.settings.personalization.title}</CardTitle>
                  <CardDescription>{dictionary.settings.personalization.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-2 max-w-md">
                    <Label htmlFor="language">Language</Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger id="language">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="nl">Nederlands</SelectItem>
                        <SelectItem value="de">Deutsch</SelectItem>
                        <SelectItem value="fr">Francais</SelectItem>
                        <SelectItem value="es">Espanol</SelectItem>
                        <SelectItem value="pt">Portugues</SelectItem>
                        <SelectItem value="pl">Polski</SelectItem>
                        <SelectItem value="ru">Russkiy</SelectItem>
                        <SelectItem value="ar">Arabic</SelectItem>
                        <SelectItem value="ur">Urdu</SelectItem>
                        <SelectItem value="hi">Hindi</SelectItem>
                        <SelectItem value="bn">Bangla</SelectItem>
                        <SelectItem value="zh">Chinese</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2 max-w-md">
                    <Label htmlFor="display-name">Display name</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="display-name"
                        value={displayName}
                        onChange={(event) => setDisplayName(event.target.value)}
                        placeholder="Your display name"
                      />
                      <Button onClick={() => void saveDisplayName()} disabled={displayNameSaving}>
                        {displayNameSaving ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  </div>

                  <ThemePicker theme={theme} setTheme={setTheme} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="general" className="mt-0">
              <Card className="border-border shadow-none">
                <CardHeader>
                  <CardTitle>{dictionary.settings.general.title}</CardTitle>
                  <CardDescription>{dictionary.settings.general.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-2 max-w-md">
                    <Label htmlFor="region">Region</Label>
                    <Select value={region} onValueChange={(value) => setRegion(value as any)}>
                      <SelectTrigger id="region">
                        <SelectValue placeholder="Select region" />
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
                    <Label htmlFor="schooling-level">Degree of schooling</Label>
                    <Select value={String(schoolingLevel)} onValueChange={(value) => setSchoolingLevel(Number(value) as any)}>
                      <SelectTrigger id="schooling-level">
                        <SelectValue placeholder="Select schooling level" />
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
                    <Label htmlFor="provider">AI provider</Label>
                    <Select
                      value={aiProvider}
                      onValueChange={(value) => {
                        const next = (value as 'gemini' | 'openai' | 'auto');
                        setAiProvider(next);
                      }}
                    >
                      <SelectTrigger id="provider">
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto (Recommended)</SelectItem>
                        <SelectItem value="gemini">Gemini</SelectItem>
                        <SelectItem value="openai">OpenAI</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Auto uses Gemini first and switches to OpenAI on token/context-limit failures.</p>
                  </div>

                  <div className="grid gap-2 max-w-md">
                    <Label htmlFor="openai-user-key">OpenAI API key (optional)</Label>
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
                      {hasOpenAIKey ? 'Custom OpenAI key saved for your account.' : usesDefaultOpenAIKey ? 'Using platform default OpenAI key.' : 'No OpenAI key available yet.'}
                    </p>
                    <p className="text-xs text-muted-foreground">Your key is encrypted server-side and never returned to the client after saving.</p>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void saveAiSettings()}
                        disabled={aiSettingsSaving || aiSettingsLoading}
                      >
                        {aiSettingsSaving ? 'Saving...' : 'Save AI settings'}
                      </Button>
                      {aiSettingsStatus ? <span className="text-xs text-muted-foreground">{aiSettingsStatus}</span> : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="subscription" className="mt-0">
              <Card className="border-border shadow-none">
                <CardHeader>
                  <CardTitle>Subscription</CardTitle>
                  <CardDescription>
                    Current: {subscriptionTier} {subscriptionType === 'teacher' ? 'Teacher' : 'Student'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="rounded-xl">
                    <a href="/upgrade">
                      Upgrade subscription here
                      <ArrowUpRight className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
