'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Copy, Check, CalendarPlus } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';

type CalendarProvider = 'apple' | 'google' | 'outlook' | 'caldav';

interface CalendarAccount {
  id: string;
  provider: string;
  username: string;
  caldav_url?: string;
  created_at: string;
  last_synced_at?: string;
}

interface CalendarConnectionDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  userId?: string | null;
  classes?: Array<{ id: string; name: string }> | null;
  initialProvider?: CalendarProvider | null;
}

export function CalendarConnectionDialog({
  isOpen,
  setIsOpen,
  userId,
  classes,
  initialProvider,
}: CalendarConnectionDialogProps) {
  const { toast } = useToast();
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [accounts, setAccounts] = useState<CalendarAccount[]>([]);
  const [hasLoadedAccounts, setHasLoadedAccounts] = useState(false);

  // Connection form state
  const [selectedProvider, setSelectedProvider] = useState<CalendarProvider>('apple');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [caldavUrl, setCaldavUrl] = useState('');

  // Update selectedProvider if initialProvider is provided
  useEffect(() => {
    if (initialProvider && isOpen) {
      setSelectedProvider(initialProvider);
    }
  }, [initialProvider, isOpen]);

  const loadAccounts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/calendar/accounts');
      const data = await response.json();

      if (!response.ok) {
        toast({
          variant: 'destructive',
          title: 'Failed to load accounts',
          description: data?.error || 'Could not fetch calendar accounts',
        });
        return;
      }

      setAccounts(data.accounts || []);
      setHasLoadedAccounts(true);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error?.message || 'Failed to load calendar accounts',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!username.trim() || !password.trim()) {
      toast({
        variant: 'destructive',
        title: 'Missing fields',
        description: 'Please enter your username and password',
      });
      return;
    }

    if (selectedProvider === 'caldav' && !caldavUrl.trim()) {
      toast({
        variant: 'destructive',
        title: 'Missing CalDAV URL',
        description: 'Please enter your CalDAV server URL',
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/calendar/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          username,
          password,
          caldavUrl: selectedProvider === 'caldav' ? caldavUrl : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          variant: 'destructive',
          title: 'Connection failed',
          description: data?.error || 'Could not connect to calendar',
        });
        return;
      }

      toast({
        title: 'Connected successfully',
        description: `Your ${selectedProvider} calendar is now connected and syncing.`,
      });

      // Reset form and reload accounts
      setUsername('');
      setPassword('');
      setCaldavUrl('');
      await loadAccounts();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error?.message || 'Failed to connect calendar',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/calendar/accounts?id=${accountId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          variant: 'destructive',
          title: 'Disconnection failed',
          description: data?.error || 'Could not disconnect calendar',
        });
        return;
      }

      toast({
        title: 'Disconnected',
        description: 'Calendar account has been removed',
      });

      await loadAccounts();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error?.message || 'Failed to disconnect calendar',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch {
      toast({ title: 'Could not copy', description: 'Copy the URL manually', variant: 'destructive' });
    }
  };

  const getWebcalUrl = (path: string) => {
    if (typeof window === 'undefined') return '';
    return `webcal://${window.location.host}${path}`;
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && !hasLoadedAccounts) {
      loadAccounts();
    }
  };

  const providerInfo = {
    apple: {
      label: 'Apple iCloud',
      description: 'Connect your Apple iCloud Calendar',
      help: 'Use your Apple ID email and password. You may need to create an app-specific password.',
    },
    google: {
      label: 'Google Calendar',
      description: 'Connect your Google Calendar account',
      help: 'Use your Google email and an app password (not your regular password).',
    },
    outlook: {
      label: 'Microsoft Outlook',
      description: 'Connect your Outlook Calendar account',
      help: 'Use your Outlook email and password.',
    },
    caldav: {
      label: 'Custom CalDAV Server',
      description: 'Connect any CalDAV-compatible server',
      help: 'Provide your CalDAV server URL, username, and password.',
    },
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Connect Your Calendar</DialogTitle>
          <DialogDescription>
            Sync your schedule automatically with Apple Calendar, Google Calendar, Outlook, or any
            CalDAV-compatible service
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="subscribe" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="subscribe">Subscribe</TabsTrigger>
            <TabsTrigger value="connect">Connect</TabsTrigger>
            <TabsTrigger value="accounts">Accounts</TabsTrigger>
          </TabsList>

          <TabsContent value="subscribe" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Add these links to Apple Calendar, Google Calendar, or any app that supports webcal subscriptions. The feed updates automatically.
            </p>

            {/* Personal study plan feed */}
            {userId && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Personal study plan</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={getWebcalUrl(`/api/calendar/student/${userId}`)}
                    className="h-9 text-xs font-mono"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-9 w-9 shrink-0"
                    onClick={() => copyUrl(getWebcalUrl(`/api/calendar/student/${userId}`))}
                    title="Copy link"
                  >
                    {copiedUrl === getWebcalUrl(`/api/calendar/student/${userId}`) ? (
                      <Check className="h-3.5 w-3.5 text-green-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-9 w-9 shrink-0"
                    asChild
                    title="Add to calendar"
                  >
                    <a href={getWebcalUrl(`/api/calendar/student/${userId}`)}>
                      <CalendarPlus className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                </div>
              </div>
            )}

            {/* Per-class feeds */}
            {Array.isArray(classes) && classes.length > 0 && (
              <div className="space-y-3">
                <Label className="text-xs font-medium">Class calendars</Label>
                {classes.map((cls) => (
                  <div key={cls.id} className="space-y-1">
                    <p className="text-xs text-muted-foreground truncate">{cls.name}</p>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={getWebcalUrl(`/api/calendar/class/${cls.id}`)}
                        className="h-9 text-xs font-mono"
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-9 w-9 shrink-0"
                        onClick={() => copyUrl(getWebcalUrl(`/api/calendar/class/${cls.id}`))}
                        title="Copy link"
                      >
                        {copiedUrl === getWebcalUrl(`/api/calendar/class/${cls.id}`) ? (
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-9 w-9 shrink-0"
                        asChild
                        title="Add to calendar"
                      >
                        <a href={getWebcalUrl(`/api/calendar/class/${cls.id}`)}>
                          <CalendarPlus className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!userId && !classes?.length && (
              <p className="text-sm text-muted-foreground py-4 text-center">No feeds available yet.</p>
            )}
          </TabsContent>

          <TabsContent value="connect" className="space-y-4">
            <div className="space-y-3">
              <Label>Calendar Provider</Label>
              <div className="grid grid-cols-2 gap-2">
                {(['apple', 'google', 'outlook', 'caldav'] as CalendarProvider[]).map((provider) => (
                  <button
                    key={provider}
                    onClick={() => setSelectedProvider(provider)}
                    className={`rounded-lg border-2 p-3 text-left transition-colors ${
                      selectedProvider === provider
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                        : 'border-border hover:border-border/50'
                    }`}
                  >
                    <div className="font-medium text-sm">{providerInfo[provider as CalendarProvider].label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-3 text-sm">
              <p className="text-blue-700 dark:text-blue-300">
                {providerInfo[selectedProvider].help}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Email or Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="your-email@example.com"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>

            {selectedProvider === 'caldav' && (
              <div className="space-y-2">
                <Label htmlFor="caldav-url">CalDAV Server URL</Label>
                <Input
                  id="caldav-url"
                  type="url"
                  placeholder="https://caldav.example.com/calendar/"
                  value={caldavUrl}
                  onChange={(e) => setCaldavUrl(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            )}

            <Button
              onClick={handleConnect}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading && <Spinner size={16} color="white" className="mr-2" />}
              {isLoading ? 'Connecting...' : 'Connect Calendar'}
            </Button>
          </TabsContent>

          <TabsContent value="accounts" className="space-y-4">
            {isLoading && !hasLoadedAccounts ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : accounts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-sm">
                  No calendar accounts connected yet. Go to the "Connect New" tab to add one.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {accounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm capitalize">{account.provider}</p>
                      <p className="text-xs text-muted-foreground">{account.username}</p>
                      {account.last_synced_at && (
                        <p className="text-xs text-muted-foreground">
                          Last synced: {new Date(account.last_synced_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDisconnect(account.id)}
                      disabled={isLoading}
                      className="rounded p-2 hover:bg-destructive/10 text-destructive disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
