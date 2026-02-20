'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, ArrowLeft, Crown } from 'lucide-react';
import Link from 'next/link';

export default function UpgradePage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
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
          tier: 'premium', // Will be overridden by code validation
          type: 'teacher'  // Will be overridden by code validation
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid code');
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push('/');
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
              Redirecting you to the dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Upgrade Your Plan</CardTitle>
          <CardDescription>
            Enter your subscription code to unlock premium features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="Enter subscription code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="text-center tracking-widest uppercase"
                disabled={loading}
              />
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
          
          <div className="mt-6 pt-6 border-t">
            <Button variant="ghost" className="w-full" asChild>
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
