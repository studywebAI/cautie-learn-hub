'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Check } from 'lucide-react';
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
      <div className="space-y-4">
        <div className="flex items-center">
          <Button variant="outline" asChild>
            <Link prefetch={false} href="/settings">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Settings
            </Link>
          </Button>
        </div>
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Upgrade successful</CardTitle>
              <CardDescription>You are now on {planLabel}. Reloading your workspace...</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-2 w-full overflow-hidden rounded-full surface-interactive">
                <div className="h-full w-full animate-pulse bg-foreground/70" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <Button variant="outline" asChild>
          <Link prefetch={false} href="/settings">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Settings
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Upgrade Plan</CardTitle>
          <CardDescription>Select role, select tier, enter your code.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">1. Choose Role</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {(['student', 'teacher'] as PlanType[]).map((type) => (
                <Button
                  key={type}
                  type="button"
                  variant={selectedType === type ? 'default' : 'outline'}
                  className="h-11 justify-start"
                  onClick={() => setSelectedType(type)}
                >
                  {type[0].toUpperCase() + type.slice(1)}
                </Button>
              ))}
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">2. Choose Tier</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {(['premium', 'pro'] as PlanTier[]).map((tier) => (
                <Button
                  key={tier}
                  type="button"
                  variant={selectedTier === tier ? 'default' : 'outline'}
                  className="h-11 justify-between"
                  onClick={() => setSelectedTier(tier)}
                >
                  <span>{tier[0].toUpperCase() + tier.slice(1)}</span>
                  <span>{pricingByType[selectedType][tier]}</span>
                </Button>
              ))}
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">3. Enter Code</h3>
            <div className="rounded-lg surface-interactive p-3 text-sm">
              <p className="font-medium">{planLabel}</p>
              <p className="text-muted-foreground">{activePrice}</p>
              <div className="mt-2 space-y-1">
                {activeFeatures.map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-muted-foreground">
                    <Check className="h-3.5 w-3.5" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <Input
                type="text"
                placeholder="Enter code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="h-11"
                disabled={loading}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="h-11 w-full" disabled={loading}>
                {loading ? 'Validating...' : 'Redeem Code'}
              </Button>
            </form>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
