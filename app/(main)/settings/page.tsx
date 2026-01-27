'use client';

import { useContext, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppContext, AppContextType } from '@/contexts/app-context';
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

  const [activeTab, setActiveTab] = useState('general');

  return (
    <div className="flex flex-col gap-8 h-full">
      <header>
        <h1 className="text-3xl font-bold font-headline">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and application settings.
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
                  General
                </TabsTrigger>
                <TabsTrigger
                  value="personalization"
                  className="w-full justify-start data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  Personalization
                </TabsTrigger>
                <TabsTrigger
                  value="accessibility"
                  className="w-full justify-start data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  Accessibility
                </TabsTrigger>
                <TabsTrigger
                  value="developer"
                  className="w-full justify-start data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  Developer
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Main content area */}
            <div className="flex-1 overflow-y-auto p-6">
              <TabsContent value="general" className="mt-0">
                <Card className="border-0 shadow-none">
                  <CardHeader className="px-0">
                    <CardTitle>General</CardTitle>
                    <CardDescription>
                      Configure your application preferences.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-0 space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="language">Language</Label>
                      <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger id="language" className="w-[280px]">
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="nl">Nederlands (Dutch)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="personalization" className="mt-0">
                <Card className="border-0 shadow-none">
                  <CardHeader className="px-0">
                    <CardTitle>Personalization</CardTitle>
                    <CardDescription>
                      Customize the appearance and colors of your app.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-0 space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="theme">Theme</Label>
                      <Select value={theme} onValueChange={setTheme}>
                        <SelectTrigger id="theme" className="w-[280px]">
                          <SelectValue placeholder="Select theme" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                          <SelectItem value="pastel">Pastel</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className='text-sm text-muted-foreground'>Choose your preferred color scheme.</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="accessibility" className="mt-0">
                <Card className="border-0 shadow-none">
                  <CardHeader className="px-0">
                    <CardTitle>Accessibility</CardTitle>
                    <CardDescription>
                      Customize the appearance and behavior of the app to suit your needs.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-0 space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="high-contrast">High-Contrast Mode</Label>
                        <p className='text-sm text-muted-foreground'>Increase text and background contrast.</p>
                      </div>
                      <Switch id="high-contrast" checked={highContrast} onCheckedChange={setHighContrast} />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="dyslexia-font">Dyslexia-Friendly Font</Label>
                        <p className='text-sm text-muted-foreground'>Use a font designed for easier reading.</p>
                      </div>
                      <Switch id="dyslexia-font" checked={dyslexiaFont} onCheckedChange={setDyslexiaFont} />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="reduced-motion">Reduce Animations</Label>
                        <p className='text-sm text-muted-foreground'>Turn off decorative animations and transitions.</p>
                      </div>
                      <Switch id="reduced-motion" checked={reducedMotion} onCheckedChange={setReducedMotion} />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="developer" className="mt-0">
                <Card className="border-0 shadow-none">
                  <CardHeader className="px-0">
                    <CardTitle>Developer Settings</CardTitle>
                    <CardDescription>
                      Temporary settings for development purposes.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="role-switch">Toggle Role (Dev Only)</Label>
                        <p className='text-sm text-muted-foreground'>
                          Switch between student and teacher view. This is for development and will be removed.
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