'use client';

import { useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { useSidebar } from '@/components/ui/sidebar';
import {
  ArrowUpRight,
  Settings,
  HelpCircle,
  LogOut,
  ChevronUp,
  User,
  Crown,
} from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function SidebarProfile() {
  const { session } = useContext(AppContext) as AppContextType;
  const userId = session?.user?.id ?? null;
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';
  const router = useRouter();
  const [subscriptionTier, setSubscriptionTier] = useState<string>('free');
  const SUBSCRIPTION_CACHE_KEY = 'studyweb-subscription-cache-v1';
  const SUBSCRIPTION_CACHE_TTL_MS = 300_000;

  // Fetch subscription status on mount
  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        if (typeof window !== 'undefined') {
          const raw = window.sessionStorage.getItem(SUBSCRIPTION_CACHE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.updatedAt && Date.now() - parsed.updatedAt < SUBSCRIPTION_CACHE_TTL_MS) {
              setSubscriptionTier(parsed.tier || 'free');
              return;
            }
          }
        }

        const res = await fetch('/api/subscription/upgrade');
        if (res.ok) {
          const data = await res.json();
          setSubscriptionTier(data.tier || 'free');
          if (typeof window !== 'undefined') {
            window.sessionStorage.setItem(
              SUBSCRIPTION_CACHE_KEY,
              JSON.stringify({ updatedAt: Date.now(), tier: data.tier || 'free' })
            );
          }
        }
      } catch (e) {
        console.error('Failed to fetch subscription:', e);
      }
    };
    if (userId) fetchSubscription();
  }, [userId]);

  // Not logged in - show guest state with sign up button
  if (!session) {
    if (isCollapsed) return null;
    
    return (
      <div className="px-2 py-1.5 space-y-1.5">
        {/* Sign Up button for guest users */}
        <Button
          variant="outline"
          size="sm"
          className="w-full h-8 text-xs rounded-md border-border/55 bg-transparent hover:bg-sidebar-accent/45"
          asChild
        >
          <Link prefetch={false} href="/login">
            <ArrowUpRight className="h-3 w-3 mr-1.5" />
            sign up
          </Link>
        </Button>

        {/* Guest username - no avatar */}
        <div className="flex items-center gap-2 w-full rounded-md px-2 py-1 text-left">
          <div className="flex-1 min-w-0">
              <p className="text-sm truncate">guest</p>
              <p className="text-[11px] text-muted-foreground leading-tight">free</p>
          </div>
        </div>
      </div>
    );
  }

  // Logged in - show user info
  // Extract email prefix (before @)
  const email = session.user?.email || '';
  const emailPrefix = email.split('@')[0] || 'User';

  // Show subscription tier only (premium/pro/free)
  const tierLabel = subscriptionTier === 'free' ? 'Free' : subscriptionTier.charAt(0).toUpperCase() + subscriptionTier.slice(1);
  const isPremium = subscriptionTier === 'premium' || subscriptionTier === 'pro';

  const handleLogout = async () => {
    // Import supabase client and sign out directly
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    // Force page reload to update context
    window.location.reload();
  };

  return (
    <div className="px-2 py-1.5 space-y-1.5">
      {/* Upgrade button for logged in users */}
      <Button
        variant="outline"
        size="sm"
        className="w-full h-8 text-xs rounded-md border-border/55 bg-transparent hover:bg-sidebar-accent/45"
        asChild
      >
        <Link prefetch={false} href="/upgrade">
          <ArrowUpRight className="h-3 w-3 mr-1.5" />
          upgrade
        </Link>
      </Button>

      {/* Username dropdown - ChatGPT style */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 w-full rounded-md px-2 py-1 text-left hover:bg-sidebar-accent/45 transition-colors group">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{emailPrefix}</p>
              <p className="text-[11px] text-muted-foreground leading-tight">{tierLabel}</p>
            </div>
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          side="top"
          className="w-[--radix-dropdown-menu-trigger-width] min-w-[200px]"
        >
          <div className="px-3 py-2">
            <p className="text-sm font-medium">{emailPrefix}</p>
            <p className="text-xs text-muted-foreground">{email}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push('/settings')}>
            <Settings className="h-4 w-4 mr-2" />
            settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => window.open('https://cautie-learn-hub.vercel.app/help', '_blank')}>
            <HelpCircle className="h-4 w-4 mr-2" />
            help & faq
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
            <LogOut className="h-4 w-4 mr-2" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
