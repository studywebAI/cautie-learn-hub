'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, ChevronRight, Languages, Palette, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getDictionary } from '@/lib/get-dictionary';

type Language = 'nl' | 'en' | 'es' | 'ru' | 'zh';
type Theme = 'system' | 'light' | 'dark' | 'pastel';
type Role = 'student' | 'professor';

interface SetupWizardProps {
  onComplete: () => void;
}

const LANGUAGES = [
  { code: 'nl' as Language, name: 'Nederlands', native: 'Nederlands' },
  { code: 'en' as Language, name: 'English', native: 'English' },
  { code: 'es' as Language, name: 'Español', native: 'Español' },
  { code: 'ru' as Language, name: 'Русский', native: 'Русский' },
  { code: 'zh' as Language, name: '中文', native: '中文' },
];

const THEMES = [
  {
    id: 'system' as Theme,
    nameKey: 'systemDefault',
    colors: 'bg-gradient-to-br from-white to-black',
    description: 'Follow system setting'
  },
  {
    id: 'light' as Theme,
    nameKey: 'light',
    colors: 'bg-white border-gray-200',
    description: 'Bright and clean'
  },
  {
    id: 'dark' as Theme,
    nameKey: 'dark',
    colors: 'bg-black border-gray-800',
    description: 'Easy on the eyes'
  },
  {
    id: 'pastel' as Theme,
    nameKey: 'pastel',
    colors: 'bg-gradient-to-br from-blue-50 via-green-50 to-white',
    description: 'Soft and retro'
  },
];

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const [step, setStep] = useState(1);
  const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedTier, setSelectedTier] = useState<'free' | 'premium' | null>(null);
  const [professorCode, setProfessorCode] = useState('');
  const [dictionary, setDictionary] = useState<any>(null);

  const supabase = createClient();

  // Detect system language on mount
  useEffect(() => {
    const systemLang = navigator.language.split('-')[0] as Language;
    if (LANGUAGES.some(lang => lang.code === systemLang)) {
      setSelectedLanguage(systemLang);
    } else {
      setSelectedLanguage('en'); // fallback
    }
  }, []);

  // Load dictionary when language changes
  useEffect(() => {
    if (selectedLanguage) {
      setDictionary(getDictionary(selectedLanguage));
    }
  }, [selectedLanguage]);

  // Apply theme immediately when selected
  useEffect(() => {
    if (selectedTheme) {
      document.documentElement.className = `theme-${selectedTheme}`;
    }
  }, [selectedTheme]);

  const handleLanguageSelect = (language: Language) => {
    setSelectedLanguage(language);
  };

  const handleThemeSelect = (theme: Theme) => {
    setSelectedTheme(theme);
  };

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    setSelectedTier(null); // Reset tier when role changes
  };

  const handleNext = () => {
    if (step === 3 && selectedRole === 'professor' && !professorCode) {
      // Professor needs code before tier selection
      return;
    }
    if (step < 4) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSkip = () => {
    // Use system defaults
    const systemLang = navigator.language.split('-')[0] as Language;
    const defaultLang = LANGUAGES.some(lang => lang.code === systemLang) ? systemLang : 'en';
    const defaultTheme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';

    setSelectedLanguage(defaultLang);
    setSelectedTheme(defaultTheme as Theme);
    setSelectedRole('student');
    setSelectedTier('free');

    handleComplete();
  };

  const handleComplete = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Save preferences to Supabase using user_preferences table
        await (supabase as any).from('user_preferences').upsert({
          user_id: user.id,
          preference_key: 'setup_preferences',
          preference_value: {
            language: selectedLanguage,
            theme: selectedTheme,
            role: selectedRole,
            tier: selectedTier,
            professorCode: selectedRole === 'professor' ? professorCode : null,
            setupCompleted: true
          }
        });
      }

      // Save to localStorage as backup
      localStorage.setItem('cautie_setup_completed', 'true');
      localStorage.setItem('cautie_language', selectedLanguage || 'en');
      localStorage.setItem('cautie_theme', selectedTheme || 'light');
      localStorage.setItem('cautie_role', selectedRole || 'student');
      localStorage.setItem('cautie_tier', selectedTier || 'free');

      onComplete();
    } catch (error) {
      console.error('Failed to save preferences:', error);
      // Still complete setup even if save fails
      onComplete();
    }
  };

  const renderStep1 = () => {
    if (!dictionary) return <div>Loading...</div>;

    return (
      <div className="space-y-8">
        <div className="text-center">
          <Languages className="h-16 w-16 mx-auto mb-4 text-primary" />
          <h1 className="text-3xl font-bold mb-2">{dictionary.setup.language.title}</h1>
          <p className="text-muted-foreground">{dictionary.setup.language.description}</p>
        </div>

        <div className="grid grid-cols-1 gap-3 max-w-md mx-auto">
          {LANGUAGES.map((language) => (
            <button
              key={language.code}
              onClick={() => handleLanguageSelect(language.code)}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                selectedLanguage === language.code
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="font-semibold">{language.native}</div>
              <div className="text-sm text-muted-foreground">{language.name}</div>
            </button>
          ))}
        </div>

        <div className="text-center text-sm text-muted-foreground">
          Language can always be changed in settings
        </div>
      </div>
    );
  };

  const renderStep2 = () => {
    if (!dictionary) return <div>Loading...</div>;

    return (
      <div className="space-y-8">
        <div className="text-center">
          <Palette className="h-16 w-16 mx-auto mb-4 text-primary" />
          <h1 className="text-3xl font-bold mb-2">{dictionary.setup.theme.title}</h1>
          <p className="text-muted-foreground">{dictionary.setup.theme.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
          {THEMES.map((theme) => (
            <button
              key={theme.id}
              onClick={() => handleThemeSelect(theme.id)}
              className={`p-6 rounded-xl border-2 text-center transition-all ${theme.colors} ${
                selectedTheme === theme.id
                  ? 'ring-2 ring-primary'
                  : 'hover:ring-2 hover:ring-primary/50'
              }`}
            >
              <div className="font-semibold text-foreground">{theme.nameKey}</div>
              <div className="text-sm text-muted-foreground">{theme.description}</div>
            </button>
          ))}
        </div>

        <div className="text-center text-sm text-muted-foreground">
          Theme can always be changed in settings
        </div>
      </div>
    );
  };

  const renderStep3 = () => {
    if (!dictionary) return <div>Loading...</div>;

    return (
      <div className="space-y-8">
        <div className="text-center">
          <User className="h-16 w-16 mx-auto mb-4 text-primary" />
          <h1 className="text-3xl font-bold mb-2">What's your role?</h1>
          <p className="text-muted-foreground">Tell us about yourself</p>
        </div>

        <div className="grid grid-cols-1 gap-4 max-w-md mx-auto">
          <button
            onClick={() => handleRoleSelect('student')}
            className={`p-6 rounded-lg border-2 text-center transition-all ${
              selectedRole === 'student'
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="text-2xl mb-2">🎓</div>
            <div className="font-semibold">{dictionary.setup.profile.student}</div>
            <div className="text-sm text-muted-foreground">Access study materials and assignments</div>
          </button>

          <button
            onClick={() => handleRoleSelect('professor')}
            className={`p-6 rounded-lg border-2 text-center transition-all ${
              selectedRole === 'professor'
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="text-2xl mb-2">👨‍🏫</div>
            <div className="font-semibold">{dictionary.setup.profile.teacher}</div>
            <div className="text-sm text-muted-foreground">Create and manage class content</div>
          </button>
        </div>

        {selectedRole === 'professor' && (
          <div className="space-y-4 max-w-sm mx-auto">
            <Label htmlFor="professor-code">Enter Professor Code</Label>
            <Input
              id="professor-code"
              value={professorCode}
              onChange={(e) => setProfessorCode(e.target.value)}
              placeholder="Enter your professor code"
            />
          </div>
        )}
      </div>
    );
  };

  const renderStep4 = () => {
    if (!dictionary) return <div>Loading...</div>;

    return (
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Choose your plan</h1>
          <p className="text-muted-foreground">Select your subscription tier</p>
        </div>

        <div className="grid grid-cols-1 gap-3 max-w-sm mx-auto">
          <button
            onClick={() => setSelectedTier('free')}
            className={`p-4 rounded-lg border-2 text-center transition-all ${
              selectedTier === 'free'
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="font-semibold">Free Tier</div>
            <div className="text-sm text-muted-foreground">
              {selectedRole === 'student'
                ? '1 set per day, basic features'
                : 'Limited class management'
              }
            </div>
          </button>

          <button
            onClick={() => setSelectedTier('premium')}
            className={`p-4 rounded-lg border-2 text-center transition-all ${
              selectedTier === 'premium'
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="font-semibold">Premium Tier</div>
            <div className="text-sm text-muted-foreground">
              {selectedRole === 'student'
                ? '20 sets per day, unlimited access'
                : 'Full class management, advanced features'
              }
            </div>
            <div className="text-xs text-primary font-medium mt-1">
              €6/month or €49/year
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              (Stripe not set up - placeholder)
            </div>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl">
        <CardContent className="p-8">
          {/* Progress indicator */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center space-x-4">
              {[1, 2, 3, 4].map((stepNum) => (
                <div
                  key={stepNum}
                  className={`w-3 h-3 rounded-full ${
                    stepNum <= step ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Step indicator */}
          <div className="text-center mb-4 text-sm text-muted-foreground">
            {dictionary?.setup.step} {step} {dictionary?.setup.of} 4
          </div>

          {/* Step content */}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}

          {/* Navigation */}
          <div className="flex justify-between items-center mt-8">
            <div>
              {step > 1 && (
                <Button variant="outline" onClick={handleBack}>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  {dictionary?.setup.back || 'Back'}
                </Button>
              )}
            </div>

            <div className="flex items-center gap-4">
              {step === 1 && (
                <Button variant="ghost" onClick={handleSkip}>
                  Skip
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              )}

              <Button
                onClick={handleNext}
                disabled={
                  (step === 1 && !selectedLanguage) ||
                  (step === 2 && !selectedTheme) ||
                  (step === 3 && (!selectedRole || (selectedRole === 'professor' && !professorCode))) ||
                  (step === 4 && !selectedTier)
                }
              >
                {step === 4 ? (dictionary?.setup.finish || 'Finish Setup') : (dictionary?.setup.next || 'Next')}
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}