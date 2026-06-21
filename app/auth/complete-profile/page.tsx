'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

export default function CompleteProfilePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !password.trim() || !confirmPassword.trim()) return;

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Set password for Google OAuth user
      const { error: passwordError } = await supabase.auth.updateUser({
        password,
      });
      if (passwordError) throw passwordError;

      // Update profile with name
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({ id: user.id, display_name: name.trim(), full_name: name.trim() });
      if (upsertError) throw upsertError;

      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <div className="mx-auto w-full max-w-md space-y-6 rounded-2xl border border-border/70 surface-panel p-6">
        <div className="text-center">
          <h1 className="text-2xl">Complete your profile</h1>
          <p className="mt-2 text-sm text-muted-foreground">We need a display name and password to finish setup</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
              disabled={isLoading}
              className="h-10"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
              disabled={isLoading}
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
              disabled={isLoading}
              className="h-10"
            />
          </div>
          <Button
            type="submit"
            disabled={isLoading || !name.trim() || !password.trim() || !confirmPassword.trim()}
            className="h-10 w-full"
          >
            {isLoading ? (
              <>
                <Spinner size={16} color="white" className="mr-2" />
                Saving...
              </>
            ) : (
              'Complete Setup'
            )}
          </Button>
          {error && <p className="text-center text-sm text-destructive">{error}</p>}
        </form>
      </div>
    </div>
  );
}
