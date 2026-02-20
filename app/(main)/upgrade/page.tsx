'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, ArrowLeft, Crown, User, BookUser, Check } from 'lucide-react';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';

type PlanType = 'student' | 'teacher';
type PlanTier = 'premium' | 'pro';

export default function UpgradePage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [selectedType, setSelectedType] = useState<PlanType>('student');
  const [selectedTier, setSelectedTier] = useState<PlanTier>('premium');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Please enter a code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/subscription/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code: code.trim(),
          tier: selectedTier,
          type: selectedType
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid code');
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push('/settings');
        }, 2000);
      }
    } catch (err) {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-amber-100 dark:bg-amber-900 rounded-full">
                <Crown className="h-12 w-12 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mb-2">
              Upgrade Successful!
            </h2>
            <p className="text-muted-foreground">
              You're now a {selectedTier} {selectedType}!
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Redirecting to settings...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Upgrade Your Plan</CardTitle>
          <CardDescription>
            Choose your plan and enter your subscription code
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Plan Type Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">I am a:</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedType('student')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedType === 'student' 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <User className={`h-6 w-6 mx-auto mb-2 ${selectedType === 'student' ? 'text-primary' : 'text-muted-foreground'}`} />
                <p className="font-medium">Student</p>
                <p className="text-xs text-muted-foreground">AI learning tools</p>
              </button>
              <button
                type="button"
                onClick={() => setSelectedType('teacher')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedType === 'teacher' 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <BookUser className={`h-6 w-6 mx-auto mb-2 ${selectedType === 'teacher' ? 'text-primary' : 'text-muted-foreground'}`} />
                <p className="font-medium">Teacher</p>
                <p className="text-xs text-muted-foreground">Create classes</p>
              </button>
            </div>
          </div>

          <Separator />

          {/* Plan Tier Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Select Tier:</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedTier('premium')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedTier === 'premium' 
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20' 
                    : 'border-border hover:border-amber-500/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold">Premium</span>
                  {selectedTier === 'premium' && <Check className="h-4 w-4 text-amber-500" />}
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedType === 'student' ? '30 AI tools/day' : '5 classes'}
                </p>
                <p className="text-sm font-medium mt-1">
                  {selectedType === 'student' ? '$9.99/mo' : '$19.99/mo'}
                </p>
              </button>
              <button
                type="button"
                onClick={() => setSelectedTier('pro')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedTier === 'pro' 
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20' 
                    : 'border-border hover:border-amber-500/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold">Pro</span>
                  {selectedTier === 'pro' && <Check className="h-4 w-4 text-amber-500" />}
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedType === 'student' ? 'Unlimited AI tools' : '20 classes'}
                </p>
                <p className="text-sm font-medium mt-1">
                  {selectedType === 'student' ? '$19.99/mo' : '$39.99/mo'}
                </p>
              </button>
            </div>
          </div>

          <Separator />

          {/* Code Input */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Enter your code:</label>
              <Input
                type="text"
                placeholder="e.g. zo01e"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="text-center tracking-widest uppercase"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground text-center mt-2">
                Got your code? Enter it above to upgrade to {selectedTier} {selectedType}
              </p>
            </div>
            
            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? 'Validating...' : 'Redeem Code'}
            </Button>
          </form>
          
          <div className="pt-2">
            <Button variant="ghost" className="w-full" asChild>
              <Link href="/settings">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Settings
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
