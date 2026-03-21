'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, ArrowLeft, Crown, User, BookUser, Check } from 'lucide-react';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';

type PlanType = 'student' | 'teacher';
type PlanTier = 'premium' | 'pro';

const pricingByType: Record<PlanType, Record<PlanTier, string>> = {
  student: {
    premium: '$9.99/mo',
    pro: '$19.99/mo',
  },
  teacher: {
    premium: '$19.99/mo',
    pro: '$39.99/mo',
  },
};

const featureMap: Record<PlanType, Record<PlanTier, string[]>> = {
  student: {
    premium: ['30 AI tool actions/day', 'Smart summaries + quizzes', 'Studyset planning'],
    pro: ['Unlimited AI tool actions', 'Advanced study plans', 'Priority generation speed', 'Full Studyset tracking'],
  },
  teacher: {
    premium: ['Up to 5 classes', 'Teacher collaboration tools', 'Manage + schedule controls'],
    pro: ['Up to 20 classes', 'Priority teacher workflows', 'Full audit visibility', 'Advanced class management'],
  },
};

export default function UpgradePage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [selectedType, setSelectedType] = useState<PlanType>('student');
  const [selectedTier, setSelectedTier] = useState<PlanTier>('premium');

  const activePrice = pricingByType[selectedType][selectedTier];
  const activeFeatures = featureMap[selectedType][selectedTier];

  const planLabel = useMemo(
    () => `${selectedTier[0].toUpperCase()}${selectedTier.slice(1)} ${selectedType[0].toUpperCase()}${selectedType.slice(1)}`,
    [selectedTier, selectedType]
  );

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
          type: selectedType,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid code');
      } else {
        setSuccess(true);
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem('studyweb-cached-dashboard');
        }
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fafc,_#e2e8f0_55%,_#cbd5e1)] p-6 md:p-10">
        <div className="mx-auto max-w-2xl">
          <Card className="border-slate-300 shadow-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white">
                <Crown className="h-7 w-7" />
              </div>
              <CardTitle className="text-2xl">Upgrade successful</CardTitle>
              <CardDescription>You are now on {planLabel}. Reloading your workspace...</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div className="h-full w-full animate-pulse bg-slate-900" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#f8fafc,_#f1f5f9_45%,_#e2e8f0)] p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" className="bg-white/80" asChild>
            <Link prefetch={false} href="/settings">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Settings
            </Link>
          </Button>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white/70 px-4 py-2 text-xs font-medium text-slate-600">
            <ShieldCheck className="h-4 w-4" />
            Secure code redemption
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 border-slate-300 bg-white/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-3xl leading-tight">Upgrade your plan without the ugly checkout flow</CardTitle>
              <CardDescription>Pick role and tier, redeem code, done.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <section className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">1. Choose Role</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setSelectedType('student')}
                    className={`rounded-xl border p-4 text-left transition ${
                      selectedType === 'student'
                        ? 'border-slate-900 bg-slate-900 text-white shadow-lg'
                        : 'border-slate-300 bg-white hover:border-slate-500'
                    }`}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span className="font-semibold">Student</span>
                    </div>
                    <p className={`text-sm ${selectedType === 'student' ? 'text-slate-200' : 'text-slate-600'}`}>
                      Learning tools, study plans, AI practice.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedType('teacher')}
                    className={`rounded-xl border p-4 text-left transition ${
                      selectedType === 'teacher'
                        ? 'border-slate-900 bg-slate-900 text-white shadow-lg'
                        : 'border-slate-300 bg-white hover:border-slate-500'
                    }`}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <BookUser className="h-4 w-4" />
                      <span className="font-semibold">Teacher</span>
                    </div>
                    <p className={`text-sm ${selectedType === 'teacher' ? 'text-slate-200' : 'text-slate-600'}`}>
                      Class management, collaboration, schedules.
                    </p>
                  </button>
                </div>
              </section>

              <Separator />

              <section className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">2. Choose Tier</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(['premium', 'pro'] as PlanTier[]).map((tier) => {
                    const selected = selectedTier === tier;
                    const tierName = tier[0].toUpperCase() + tier.slice(1);
                    return (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => setSelectedTier(tier)}
                        className={`rounded-xl border p-4 text-left transition ${
                          selected ? 'border-amber-500 bg-amber-50 shadow-sm' : 'border-slate-300 bg-white hover:border-slate-500'
                        }`}
                      >
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="font-semibold">{tierName}</span>
                          {selected && <Check className="h-4 w-4 text-amber-600" />}
                        </div>
                        <p className="text-xl font-bold text-slate-900">{pricingByType[selectedType][tier]}</p>
                        <p className="mt-1 text-sm text-slate-600">
                          {tier === 'premium' ? 'Solid daily workflow' : 'Full power + priority'}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </section>
            </CardContent>
          </Card>

          <Card className="h-fit border-slate-300 bg-white/90 shadow-xl lg:sticky lg:top-6">
            <CardHeader>
              <CardTitle className="text-xl">{planLabel}</CardTitle>
              <CardDescription>{activePrice}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                {activeFeatures.map((feature) => (
                  <div key={feature} className="flex items-start gap-2 text-sm text-slate-700">
                    <Check className="mt-0.5 h-4 w-4 text-emerald-600" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <Separator />

              <form onSubmit={handleSubmit} className="space-y-3">
                <label className="text-sm font-medium text-slate-700">3. Enter redemption code</label>
                <Input
                  type="text"
                  placeholder="ENTER-CODE"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="h-11 border-slate-300 bg-white text-center tracking-[0.18em]"
                  disabled={loading}
                />
                {error && (
                  <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                    {error}
                  </p>
                )}
                <Button type="submit" className="h-11 w-full" disabled={loading}>
                  {loading ? 'Validating...' : 'Redeem Code'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
