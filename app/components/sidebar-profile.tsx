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
  Lightbulb,
  LogOut,
  ChevronsUpDown,
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

function initialsFor(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '?';
  return trimmed.charAt(0).toUpperCase();
}

function AvatarBadge({ label, isPremium }: { label: string; isPremium: boolean }) {
  return (
    <div
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-medium ${
        isPremium ? 'bg-foreground text-background' : 'bg-sidebar-accent text-sidebar-foreground'
      }`}
    >
      {initialsFor(label)}
    </div>
  );
}

function normalizeDisplayName(value: unknown): string {
  if (typeof value !== 'string') return '';
  const normalized = value.trim();
  if (!normalized) return '';
  if (normalized.toLowerCase() === 'guest') return '';
  if (!/[\p{L}\p{N}]/u.test(normalized)) return '';
  return normalized;
}

export function SidebarProfile() {
  const { session } = useContext(AppContext) as AppContextType;
  const userId = session?.user?.id ?? null;
  const { state, isMobile } = useSidebar();
  const isCollapsed = !isMobile && state === 'collapsed';
  const router = useRouter();
  const [subscriptionTier, setSubscriptionTier] = useState<string>('free');
  const [resolvedDisplayName, setResolvedDisplayName] = useState<string>('');
  const [menuOpen, setMenuOpen] = useState(false);
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
      }
    };
    if (userId) fetchSubscription();
  }, [userId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const local = normalizeDisplayName(window.localStorage.getItem('studyweb-display-name'));
    const meta =
      normalizeDisplayName((session as any)?.user?.user_metadata?.display_name) ||
      normalizeDisplayName((session as any)?.user?.user_metadata?.full_name) ||
      normalizeDisplayName((session as any)?.user?.user_metadata?.name);
    setResolvedDisplayName(local || meta || '');
  }, [session?.user?.id]);

  useEffect(() => {
    const openProfileMenu = () => setMenuOpen(true);
    window.addEventListener('cautie:open-profile-menu', openProfileMenu);
    return () => window.removeEventListener('cautie:open-profile-menu', openProfileMenu);
  }, []);

  // Not logged in - show guest state with sign up button
  if (!session) {
    if (isCollapsed) return null;
    
    return (
      <div className="px-2 py-1.5 space-y-1.5">
        {/* Sign Up button for guest users */}
        <Button
          variant="outline"
          size="sm"
          className="w-full h-9 justify-start rounded-lg border-transparent bg-primary text-xs text-primary-foreground hover:brightness-95"
          asChild
        >
          <Link href="/login">
            <ArrowUpRight className="h-3 w-3 mr-1.5" />
            Sign Up
          </Link>
        </Button>

        {/* Guest username */}
        <div className="flex items-center gap-2 w-full rounded-lg bg-sidebar-accent/42 px-2.5 py-1.5 text-left">
          <AvatarBadge label={resolvedDisplayName || 'Guest'} isPremium={false} />
          <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{resolvedDisplayName || 'Guest'}</p>
              <p className="text-[11px] text-sidebar-foreground/70 leading-tight">Free</p>
          </div>
        </div>
      </div>
    );
  }

  // Logged in - show user info
  // Extract email prefix (before @)
  const email = session.user?.email || '';
  const emailPrefix = email.split('@')[0] || 'User';
  const profileName = resolvedDisplayName || emailPrefix;

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

  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center gap-1.5 px-1.5 py-1.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-md text-sidebar-foreground/70 hover:text-sidebar-foreground"
          asChild
        >
          <Link href="/upgrade" aria-label="Upgrade">
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Button>
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" aria-label="Account menu">
              {isPremium ? <Crown className="h-4 w-4" /> : <User className="h-4 w-4" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="right" className="min-w-[180px]">
            <DropdownMenuItem onClick={() => router.push('/settings')}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/help')}>
              <HelpCircle className="h-4 w-4 mr-2" />
              Help & FAQ
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/ideas-board')}>
              <Lightbulb className="h-4 w-4 mr-2" />
              Ideas Board
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

  return (
    <div className="px-2 py-1.5 space-y-2">
      {/* Upgrade button for logged in users */}
      {!isPremium && (
        <Button
          size="sm"
          className="w-full h-9 justify-center rounded-lg bg-foreground text-background text-xs font-medium hover:bg-foreground/90"
          asChild
        >
          <Link href="/upgrade">
            <ArrowUpRight className="h-3.5 w-3.5 mr-1.5" />
            Upgrade
          </Link>
        </Button>
      )}

      {/* Username dropdown - ChatGPT style */}
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button className="flex w-full items-center gap-2 rounded-lg border-0 bg-sidebar-accent/42 px-2.5 py-1.5 text-left outline-none transition-colors group hover:bg-sidebar-accent/62 focus-visible:ring-1 focus-visible:ring-sidebar-ring/40">
            <AvatarBadge label={profileName} isPremium={isPremium} />
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm">{profileName}</p>
              <p className="text-[11px] text-sidebar-foreground/70 leading-tight">{tierLabel}</p>
            </div>
            <ChevronsUpDown className="h-3.5 w-3.5 text-sidebar-foreground/70 transition-colors group-hover:text-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          side="top"
          className="w-[--radix-dropdown-menu-trigger-width] min-w-[200px]"
        >
          <div className="px-3 py-2">
            <p className="text-sm">{profileName}</p>
            <p className="text-xs text-foreground/70">{email}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push('/settings')}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/help')}>
            <HelpCircle className="h-4 w-4 mr-2" />
            Help & FAQ
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/ideas-board')}>
            <Lightbulb className="h-4 w-4 mr-2" />
            Ideas Board
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
