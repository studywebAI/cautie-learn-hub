'use client';

import { useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppContext, AppContextType } from '@/contexts/app-context';
import {
  ArrowUpRight,
  Settings,
  HelpCircle,
  Lightbulb,
  LogOut,
  Crown,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const SUBSCRIPTION_CACHE_KEY = 'studyweb-subscription-cache-v1';
const SUBSCRIPTION_CACHE_TTL_MS = 300_000;

function normalizeDisplayName(value: unknown): string {
  if (typeof value !== 'string') return '';
  const normalized = value.trim();
  if (!normalized) return '';
  if (normalized.toLowerCase() === 'guest') return '';
  if (!/[\p{L}\p{N}]/u.test(normalized)) return '';
  return normalized;
}

// Account/profile menu, moved from the bottom of the sidebar into the
// persistent topbar's top-right corner (matches the reference UI the user
// pointed at — profile avatar + Settings/Help/Ideas live in the header, not
// pinned to the nav rail).
export function TopbarAccountMenu() {
  const { session, language } = useContext(AppContext) as AppContextType;
  const isDutch = language === 'nl';
  const router = useRouter();
  const [subscriptionTier, setSubscriptionTier] = useState<string>('free');
  const [resolvedDisplayName, setResolvedDisplayName] = useState<string>('');
  const [menuOpen, setMenuOpen] = useState(false);
  const userId = session?.user?.id ?? null;

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
      } catch {}
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

  if (!session) return null;

  const email = session.user?.email || '';
  const emailPrefix = email.split('@')[0] || 'User';
  const profileName = resolvedDisplayName || emailPrefix;
  const tierLabel = subscriptionTier === 'free' ? 'Free' : subscriptionTier.charAt(0).toUpperCase() + subscriptionTier.slice(1);
  const isPremium = subscriptionTier === 'premium' || subscriptionTier === 'pro';

  const handleLogout = async () => {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    window.location.reload();
  };

  return (
    <div className="flex items-center gap-1 shrink-0">
      <button
        type="button"
        title={isDutch ? 'Instellingen' : 'Settings'}
        onClick={() => router.push('/settings')}
        className="hidden sm:inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Settings className="h-4 w-4" />
      </button>
      <button
        type="button"
        title={isDutch ? 'Help & FAQ' : 'Help & FAQ'}
        onClick={() => router.push('/settings?tab=help')}
        className="hidden sm:inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <HelpCircle className="h-4 w-4" />
      </button>
      <button
        type="button"
        title={isDutch ? 'Ideeënbord' : 'Ideas Board'}
        onClick={() => router.push('/ideas-board')}
        className="hidden sm:inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground mr-1"
      >
        <Lightbulb className="h-4 w-4" />
      </button>
      {!isPremium && (
        <button
          type="button"
          onClick={() => router.push('/upgrade')}
          className="hidden sm:inline-flex h-7 items-center gap-1 rounded-md bg-foreground px-2.5 text-[12px] font-medium text-background hover:bg-foreground/90"
        >
          <ArrowUpRight className="h-3 w-3" />
          {isDutch ? 'Upgraden' : 'Upgrade'}
        </button>
      )}
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Account menu"
            className={`flex h-7 max-w-[160px] items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring/40 ${
              isPremium ? 'bg-foreground text-background' : 'bg-muted text-foreground/80 hover:bg-muted/80'
            }`}
          >
            {isPremium && <Crown className="h-3.5 w-3.5 shrink-0" />}
            <span className="truncate">{profileName}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[220px]">
          <div className="px-3 py-2">
            <p className="text-sm truncate">{profileName}</p>
            <p className="text-xs text-foreground/60 truncate">{email || tierLabel}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push('/settings')}>
            <Settings className="h-4 w-4 mr-2" />
            {isDutch ? 'Instellingen' : 'Settings'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/settings?tab=help')}>
            <HelpCircle className="h-4 w-4 mr-2" />
            {isDutch ? 'Help & FAQ' : 'Help & FAQ'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/ideas-board')}>
            <Lightbulb className="h-4 w-4 mr-2" />
            {isDutch ? 'Ideeënbord' : 'Ideas Board'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
            <LogOut className="h-4 w-4 mr-2" />
            {isDutch ? 'Uitloggen' : 'Log out'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
