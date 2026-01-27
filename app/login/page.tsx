'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AuthForm } from '@/components/auth-form';

export default function Login({
  searchParams,
}: {
  searchParams: { message: string; type: string; email: string }
}) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Redirect if already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/');
      }
    };
    checkSession();
  }, [router, supabase.auth]);

  const signIn = async (formData: FormData) => {
    setIsLoading(true);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const code = formData.get('code') as string;

    if (code) {
      // Verify OTP code for email confirmation
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'email',
      });

      if (error) {
        console.error('OTP verification error:', error);
        let errorMessage = 'Invalid verification code';
        let errorType = 'error';

        if (error.message.includes('Token has expired')) {
          errorMessage = 'The verification code has expired. Please request a new one.';
          errorType = 'warning';
        } else if (error.message.includes('Token has been used')) {
          errorMessage = 'This verification code has already been used. Please request a new one.';
          errorType = 'warning';
        } else if (error.message.includes('Invalid token')) {
          errorMessage = 'Invalid verification code. Please check and try again.';
        } else if (error.message.includes('Too many requests')) {
          errorMessage = 'Too many verification attempts. Please wait a few minutes before trying again.';
        } else if (error.message) {
          errorMessage = `Verification error: ${error.message}`;
        }

        router.push(`/login?message=${encodeURIComponent(errorMessage)}&type=${errorType}&email=${encodeURIComponent(email)}`);
        setIsLoading(false);
        return;
      }

      // Success - redirect to dashboard
      router.push('/');
      setIsLoading(false);
    } else {
      // Sign in with password
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.error('Sign in error:', error);
          let errorMessage = 'Sign in failed';
          let errorType = 'error';

          if (error.message.includes('Invalid login credentials')) {
            errorMessage = 'Invalid email or password. Please check your credentials and try again.';
          } else if (error.message.includes('Email not confirmed')) {
            errorMessage = 'Please check your email and click the confirmation link before signing in.';
            errorType = 'warning';
          } else if (error.message.includes('Too many requests')) {
            errorMessage = 'Too many sign-in attempts. Please wait a few minutes before trying again.';
          } else if (error.message) {
            errorMessage = `Authentication error: ${error.message}`;
          }

          router.push(`/login?message=${encodeURIComponent(errorMessage)}&type=${errorType}&email=${encodeURIComponent(email)}`);
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.error('Sign in exception:', err);
        router.push(`/login?message=${encodeURIComponent('Network error during sign in. Please try again.')}&email=${encodeURIComponent(email)}`);
        setIsLoading(false);
        return;
      }

      router.push('/');
      setIsLoading(false);
    }
  };

  const signUp = async (formData: FormData) => {
    setIsLoading(true);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      if (error.message.includes('User already registered')) {
        router.push('/login?message=Account already exists. Please sign in instead.&type=info');
        setIsLoading(false);
        return;
      }
      router.push(`/login?message=${encodeURIComponent(error.message)}&email=${encodeURIComponent(email)}`);
      setIsLoading(false);
      return;
    }

    if (data.user && !data.session) {
      router.push(`/auth/confirm-email?email=${encodeURIComponent(email)}&message=Please check your email for the 8-digit verification code.`);
      setIsLoading(false);
      return;
    }

    router.push('/login?message=An unexpected error occurred. Please try again.');
    setIsLoading(false);
  };

  return (
    <AuthForm
      signIn={signIn}
      signUp={signUp}
      searchParams={searchParams}

    />
  );
}
