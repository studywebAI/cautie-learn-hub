'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, ArrowLeft, Crown, User, BookUser, Check, X } from 'lucide-react';
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
        // Clear cached dashboard data to force refresh with new role
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem('studyweb-cached-dashboard');
        }
        // Force a hard refresh to update subscription state
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (err) {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-8">
        <div className="w-full max-w-2xl text-center">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-6">
              <Crown className="h-10 w-10 text-black" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">
              Upgrade Successful!
            </h1>
            <p className="text-xl text-gray-300">
              You're now a {selectedTier} {selectedType}!
            </p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
            <p className="text-gray-400 mb-4">Redirecting to dashboard...</p>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div className="bg-white h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
        <div className="relative max-w-7xl mx-auto px-8 py-16">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-4 bg-white/5 px-6 py-3 rounded-full border border-white/10">
                <Shield className="h-6 w-6 text-white" />
                <span className="text-sm font-medium text-gray-300">SECURE UPGRADE</span>
              </div>
              <h1 className="text-6xl font-bold leading-tight">
                Upgrade Your
                <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent"> Plan</span>
              </h1>
              <p className="text-xl text-gray-300 leading-relaxed">
                Choose your plan and enter your subscription code to unlock premium features. 
                Experience the full power of our platform with advanced tools and capabilities.
              </p>
              <div className="flex gap-4">
                <Button 
                  variant="outline" 
                  className="border-white/20 bg-transparent hover:bg-white/10 text-white"
                  asChild
                >
                  <Link href="/settings">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Settings
                  </Link>
                </Button>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-3xl blur-3xl"></div>
                <div className="relative bg-white/5 backdrop-blur-sm rounded-3xl p-8 border border-white/10">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-6 bg-black/50 rounded-2xl border border-white/10">
                      <User className="h-8 w-8 mx-auto mb-4 text-gray-300" />
                      <div className="font-semibold">Student</div>
                      <div className="text-sm text-gray-400 mt-2">AI learning tools</div>
                    </div>
                    <div className="text-center p-6 bg-black/50 rounded-2xl border border-white/10">
                      <BookUser className="h-8 w-8 mx-auto mb-4 text-gray-300" />
                      <div className="font-semibold">Teacher</div>
                      <div className="text-sm text-gray-400 mt-2">Create classes</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Section */}
      <div className="max-w-4xl mx-auto px-8 pb-16">
        <Card className="bg-black border-white/10 shadow-2xl">
          <CardContent className="p-8 space-y-8">
            {/* Plan Type Selection */}
            <div>
              <h3 className="text-lg font-semibold mb-6 text-gray-300">I am a:</h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setSelectedType('student')}
                  className={`p-6 rounded-xl border-2 transition-all duration-300 ${
                    selectedType === 'student' 
                      ? 'border-white bg-white/10 shadow-lg shadow-white/10' 
                      : 'border-white/20 hover:border-white/40 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-center mb-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      selectedType === 'student' ? 'bg-white text-black' : 'bg-white/10 text-gray-300'
                    }`}>
                      <User className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="font-bold text-lg mb-2">Student</div>
                  <div className="text-sm text-gray-400">
                    AI learning tools and personalized study assistance
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedType('teacher')}
                  className={`p-6 rounded-xl border-2 transition-all duration-300 ${
                    selectedType === 'teacher' 
                      ? 'border-white bg-white/10 shadow-lg shadow-white/10' 
                      : 'border-white/20 hover:border-white/40 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-center mb-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      selectedType === 'teacher' ? 'bg-white text-black' : 'bg-white/10 text-gray-300'
                    }`}>
                      <BookUser className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="font-bold text-lg mb-2">Teacher</div>
                  <div className="text-sm text-gray-400">
                    Create classes and manage student assignments
                  </div>
                </button>
              </div>
            </div>

            <Separator className="bg-white/20" />

            {/* Plan Tier Selection */}
            <div>
              <h3 className="text-lg font-semibold mb-6 text-gray-300">Select Tier:</h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setSelectedTier('premium')}
                  className={`p-6 rounded-xl border-2 transition-all duration-300 ${
                    selectedTier === 'premium' 
                      ? 'border-amber-400 bg-amber-400/10 shadow-lg shadow-amber-400/20' 
                      : 'border-white/20 hover:border-amber-400/50 hover:bg-amber-400/5'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-bold">Premium</span>
                    {selectedTier === 'premium' && (
                      <div className="w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center">
                        <Check className="h-4 w-4 text-black" />
                      </div>
                    )}
                  </div>
                  <div className="text-2xl font-bold mb-2">
                    {selectedType === 'student' ? '$9.99' : '$19.99'}/mo
                  </div>
                  <div className="text-sm text-gray-400">
                    {selectedType === 'student' ? '30 AI tools/day' : '5 classes'}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTier('pro')}
                  className={`p-6 rounded-xl border-2 transition-all duration-300 ${
                    selectedTier === 'pro' 
                      ? 'border-amber-400 bg-amber-400/10 shadow-lg shadow-amber-400/20' 
                      : 'border-white/20 hover:border-amber-400/50 hover:bg-amber-400/5'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-bold">Pro</span>
                    {selectedTier === 'pro' && (
                      <div className="w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center">
                        <Check className="h-4 w-4 text-black" />
                      </div>
                    )}
                  </div>
                  <div className="text-2xl font-bold mb-2">
                    {selectedType === 'student' ? '$19.99' : '$39.99'}/mo
                  </div>
                  <div className="text-sm text-gray-400">
                    {selectedType === 'student' ? 'Unlimited AI tools' : '20 classes'}
                  </div>
                </button>
              </div>
            </div>

            <Separator className="bg-white/20" />

            {/* Code Input Section */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-3 text-gray-300">
                  Enter your subscription code:
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="ENTER-YOUR-CODE-HERE"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="bg-black border-white/20 text-white placeholder-gray-500 text-center text-lg tracking-widest py-6 text-2xl"
                    disabled={loading}
                  />
                  {code && (
                    <button
                      type="button"
                      onClick={() => setCode('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
              
              {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}
              
              <Button 
                type="submit" 
                className="w-full h-14 text-lg font-semibold bg-white text-black hover:bg-gray-200 transition-colors"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-black border-t-white rounded-full animate-spin"></div>
                    Validating...
                  </div>
                ) : (
                  'Redeem Code'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}