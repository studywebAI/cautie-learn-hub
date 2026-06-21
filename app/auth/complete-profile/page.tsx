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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({ id: user.id, display_name: name.trim(), full_name: name.trim() });
      if (upsertError) throw upsertError;
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your name. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <div className="mx-auto w-full max-w-md space-y-6 rounded-2xl border border-border/70 surface-panel p-6">
        <div className="text-center">
          <h1 className="text-2xl">One more thing</h1>
          <p className="mt-2 text-sm text-muted-foreground">What should we call you?</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
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
          <Button type="submit" disabled={isLoading || !name.trim()} className="h-10 w-full">
            {isLoading ? (
              <>
                <Spinner size={16} color="white" className="mr-2" />
                Saving...
              </>
            ) : (
              'Continue'
            )}
          </Button>
          {error && <p className="text-center text-sm text-destructive">{error}</p>}
        </form>
      </div>
    </div>
  );
}
