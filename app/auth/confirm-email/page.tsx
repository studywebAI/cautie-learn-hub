'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ConfirmEmailPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const email = searchParams.get('email') || '';
  const message = searchParams.get('message') || '';

  const verifyOtp = async (formData: FormData) => {
    setIsLoading(true);
    setError(null);

    const token = formData.get('token') as string;

    if (!email || !token) {
      setError('Email and code are required.');
      setIsLoading(false);
      return;
    }

    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });

    if (error) {
      setError('Invalid or expired code. Please try again.');
      setIsLoading(false);
      return;
    }

    // On successful verification, redirect to home
    router.push('/');
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background">
      <div className="mx-auto max-w-md w-full space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Check your email</h1>
        <p className="text-muted-foreground mt-2">
          We've sent an 8-digit verification code to <strong>{email}</strong>. Please enter it below to confirm your email address.
        </p>
        </div>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            verifyOtp(formData);
          }}
        >
          <div className="space-y-2">
            <label className="text-md font-medium" htmlFor="token">Verification Code</label>
            <input
              className="w-full rounded-md px-4 py-2 bg-inherit border"
              name="token"
              placeholder="Enter 8-digit verification code"
              required
              disabled={isLoading}
            />
          </div>
          <button
            className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-md disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? 'Verifying...' : 'Verify Email'}
          </button>

          {(message || error) && (
            <p className="p-4 bg-muted text-foreground text-center rounded-lg">
              {error || message}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
