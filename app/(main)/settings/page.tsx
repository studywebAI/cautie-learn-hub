'use client';

import { useContext, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ThemePicker } from '@/components/settings/theme-picker';
import { AppContext, AppContextType, useDictionary } from '@/contexts/app-context';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Crown, CreditCard, User, BookUser, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const {
    language,
    setLanguage,
    highContrast,
    setHighContrast,
    dyslexiaFont,
    setDyslexiaFont,
    reducedMotion,
    setReducedMotion,
    theme,
    setTheme,
    session
  } = useContext(AppContext) as AppContextType;

  const { dictionary } = useDictionary();
  const [activeTab, setActiveTab] = useState('general');
  const [subscriptionTier, setSubscriptionTier] = useState<string>('free');
  const [subscriptionType, setSubscriptionType] = useState<string>('student');

  // Fetch subscription status
  useEffect(() => {
    const fetchSubscription = async () => {
      if (!session) return;
      try {
        const res = await fetch('/api/subscription/upgrade');
        if (res.ok) {
          const data = await res.json();
          setSubscriptionTier(data.tier || 'free');
          setSubscriptionType(data.type || 'student');
        }
      } catch (e) {
        console.error('Failed to fetch subscription:', e);
      }
    };
    fetchSubscription();
  }, [session]);

  const isPremium = subscriptionTier === 'premium' || subscriptionTier === 'pro';

  return (
    <div className="flex flex-col gap-8 h-full">
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <div className="flex h-full">
            {/* Left sidebar with tabs */}
            <div className="w-64 border-r bg-muted/20">
              <TabsList className="flex flex-col h-full w-full bg-transparent p-2 gap-1">
                <TabsTrigger
                  value="general"
                  className="w-full justify-start lowercase text-[13px] data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  {dictionary.settings.general.title}
                </TabsTrigger>
                <TabsTrigger
                  value="subscription"
                  className="w-full justify-start lowercase text-[13px] data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  subscription
                </TabsTrigger>
                <TabsTrigger
                  value="personalization"
                  className="w-full justify-start lowercase text-[13px] data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  {dictionary.settings.personalization.title}
                </TabsTrigger>
                <TabsTrigger
                  value="accessibility"
                  className="w-full justify-start lowercase text-[13px] data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  {dictionary.settings.accessibility.title}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Main content area */}
            <div className="flex-1 overflow-y-auto p-6">
              <TabsContent value="general" className="mt-0">
                <Card className="border-0 shadow-none">
                  <CardHeader className="px-0">
                    <CardTitle>{dictionary.settings.general.title}</CardTitle>
                    <CardDescription>
                      {dictionary.settings.general.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-0 space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="language">{dictionary.settings.general.language}</Label>
                      <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger id="language" className="w-[320px]">
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">🇺🇸 English</SelectItem>
                          <SelectItem value="nl">🇳🇱 Nederlands (Dutch)</SelectItem>
                          <SelectItem value="de">🇩🇪 Deutsch (German)</SelectItem>
                          <SelectItem value="fr">🇫🇷 Français (French)</SelectItem>
                          <SelectItem value="es">🇪🇸 Español (Spanish)</SelectItem>
                          <SelectItem value="pt">🇧🇷 Português (Portuguese)</SelectItem>
                          <SelectItem value="pl">🇵🇱 Polski (Polish)</SelectItem>
                          <SelectItem value="ru">🇷🇺 Русский (Russian)</SelectItem>
                          <SelectItem value="ar">🇸🇦 العربية (Arabic)</SelectItem>
                          <SelectItem value="ur">🇵🇰 اردو (Urdu)</SelectItem>
                          <SelectItem value="hi">🇮🇳 हिंदी (Hindi)</SelectItem>
                          <SelectItem value="bn">🇧🇩 বাংলা (Bengali)</SelectItem>
                          <SelectItem value="zh">🇨🇳 中文 (Chinese)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="subscription" className="mt-0">
                <Card className="border-0 shadow-none">
                  <CardHeader className="px-0">
                    <CardTitle>Subscription</CardTitle>
                    <CardDescription>
                      View your current subscription plan
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-0 space-y-6">
                    {/* Current Plan Status */}
                    <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${isPremium ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-muted'}`}>
                          <Crown className={`h-5 w-5 ${isPremium ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`} />
                        </div>
                        <div>
                          <p className="font-medium">
                            Current Plan: <span className="capitalize">{subscriptionTier}</span> {subscriptionType === 'teacher' ? 'Teacher' : 'Student'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {subscriptionType === 'teacher' 
                              ? subscriptionTier === 'free' ? '0 classes allowed' : subscriptionTier === 'premium' ? '5 classes allowed' : '20 classes allowed'
                              : subscriptionTier === 'free' ? '5 AI tools/day' : subscriptionTier === 'premium' ? '30 AI tools/day' : 'Unlimited AI tools'
                            }
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={async () => {
                          try {
                            const res = await fetch('/api/subscription/upgrade');
                            if (res.ok) {
                              const data = await res.json();
                              setSubscriptionTier(data.tier || 'free');
                              setSubscriptionType(data.type || 'student');
                            }
                          } catch (e) {
                            console.error('Failed to refresh subscription:', e);
                          }
                        }}
                      >
                        Refresh
                      </Button>
                    </div>

                    {/* Upgrade Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Upgrade Your Plan</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Link href="/upgrade" className="block">
                          <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <CreditCard className="h-5 w-5 text-amber-600" />
                                <span className="font-medium">Upgrade to Premium</span>
                              </div>
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Get access to premium features and advanced tools
                            </p>
                          </div>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="personalization" className="mt-0">
                <Card className="border-0 shadow-none">
                  <CardHeader className="px-0">
                    <CardTitle>{dictionary.settings.personalization.title}</CardTitle>
                    <CardDescription>
                      {dictionary.settings.personalization.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-0">
                    <ThemePicker
                      theme={theme}
                      setTheme={setTheme}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="accessibility" className="mt-0">
                <Card className="border-0 shadow-none">
                  <CardHeader className="px-0">
                    <CardTitle>{dictionary.settings.accessibility.title}</CardTitle>
                    <CardDescription>
                      {dictionary.settings.accessibility.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-0 space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="high-contrast">{dictionary.settings.accessibility.highContrast}</Label>
                        <p className='text-sm text-muted-foreground'>{dictionary.settings.accessibility.highContrastDescription}</p>
                      </div>
                      <Switch id="high-contrast" checked={highContrast} onCheckedChange={setHighContrast} />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="dyslexia-font">{dictionary.settings.accessibility.dyslexiaFont}</Label>
                        <p className='text-sm text-muted-foreground'>{dictionary.settings.accessibility.dyslexiaFontDescription}</p>
                      </div>
                      <Switch id="dyslexia-font" checked={dyslexiaFont} onCheckedChange={setDyslexiaFont} />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="reduced-motion">{dictionary.settings.accessibility.reducedMotion}</Label>
                        <p className='text-sm text-muted-foreground'>{dictionary.settings.accessibility.reducedMotionDescription}</p>
                      </div>
                      <Switch id="reduced-motion" checked={reducedMotion} onCheckedChange={setReducedMotion} />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
