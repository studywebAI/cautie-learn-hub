'use client';

import { Suspense, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AuthForm } from '@/components/auth-form';
import { useToast } from '@/hooks/use-toast';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const { toast } = useToast();
  const authSearchParams = {
    message: searchParams.get('message') || '',
    type: searchParams.get('type') || '',
    email: searchParams.get('email') || '',
  };

  useEffect(() => {
    const message = searchParams.get('message');
    if (!message) return;
    const type = searchParams.get('type') || 'info';
    toast({
      title: type === 'error' ? 'Authentication error' : type === 'warning' ? 'Notice' : 'Notification',
      description: message,
      duration: 7000,
      variant: type === 'error' ? 'destructive' : 'default',
    });
    router.replace('/login');
  }, [router, searchParams, toast]);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/');
      }
    };
    checkSession();
  }, [router, supabase]);

  return <AuthForm searchParams={authSearchParams} />;
}

export default function Login() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
