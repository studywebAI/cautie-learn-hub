'use client';

import { useContext, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppContext, AppContextType, useDictionary } from '@/contexts/app-context';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
    role,
    setRole
  } = useContext(AppContext) as AppContextType;

  const { dictionary } = useDictionary();
  const [activeTab, setActiveTab] = useState('general');

  return (
    <div className="flex flex-col gap-8 h-full">
      <header>
        <h1 className="text-3xl font-headline">{dictionary.settings.title}</h1>
        <p className="text-muted-foreground">
          {dictionary.settings.description}
        </p>
      </header>

      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <div className="flex h-full">
            {/* Left sidebar with tabs */}
            <div className="w-64 border-r bg-muted/20">
              <TabsList className="flex flex-col h-full w-full bg-transparent p-2 gap-1">
                <TabsTrigger
                  value="general"
                  className="w-full justify-start data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  {dictionary.settings.general.title}
                </TabsTrigger>
                <TabsTrigger
                  value="personalization"
                  className="w-full justify-start data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  {dictionary.settings.personalization.title}
                </TabsTrigger>
                <TabsTrigger
                  value="accessibility"
                  className="w-full justify-start data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  {dictionary.settings.accessibility.title}
                </TabsTrigger>
                <TabsTrigger
                  value="developer"
                  className="w-full justify-start data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  {dictionary.settings.developer.title}
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

              <TabsContent value="personalization" className="mt-0">
                <Card className="border-0 shadow-none">
                  <CardHeader className="px-0">
                    <CardTitle>{dictionary.settings.personalization.title}</CardTitle>
                    <CardDescription>
                      {dictionary.settings.personalization.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-0 space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="theme">{dictionary.settings.personalization.theme}</Label>
                      <Select value={theme} onValueChange={setTheme}>
                        <SelectTrigger id="theme" className="w-[280px]">
                          <SelectValue placeholder="Select theme" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">{dictionary.settings.personalization.light}</SelectItem>
                          <SelectItem value="dark">{dictionary.settings.personalization.dark}</SelectItem>
                          <SelectItem value="ocean">{dictionary.settings.personalization.ocean}</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className='text-sm text-muted-foreground'>{dictionary.settings.personalization.themeDescription}</p>
                    </div>
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

              <TabsContent value="developer" className="mt-0">
                <Card className="border-0 shadow-none">
                  <CardHeader className="px-0">
                    <CardTitle>{dictionary.settings.developer.title}</CardTitle>
                    <CardDescription>
                      {dictionary.settings.developer.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="role-switch">{dictionary.settings.developer.roleSwitch}</Label>
                        <p className='text-sm text-muted-foreground'>
                          {dictionary.settings.developer.roleSwitchDescription}
                        </p>
                      </div>
                      <Switch
                        id="role-switch"
                        checked={role === 'teacher'}
                        onCheckedChange={(checked) => setRole(checked ? 'teacher' : 'student')}
                      />
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
