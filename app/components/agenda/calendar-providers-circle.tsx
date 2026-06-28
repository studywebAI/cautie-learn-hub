'use client';

import { Apple, Mail, Smartphone } from 'lucide-react';

type Provider = 'apple' | 'google' | 'outlook' | 'caldav';

interface CalendarProvidersCircleProps {
  onProviderClick: (provider: Provider) => void;
}

const PROVIDERS: Array<{ id: Provider; label: string; icon: React.ReactNode; color: string }> = [
  { id: 'apple', label: 'Apple', icon: <Apple className="h-5 w-5" />, color: 'text-gray-800 dark:text-gray-200' },
  { id: 'google', label: 'Google', icon: <Mail className="h-5 w-5" />, color: 'text-red-500' },
  { id: 'outlook', label: 'Outlook', icon: <Smartphone className="h-5 w-5" />, color: 'text-blue-600' },
  { id: 'caldav', label: 'CalDAV', icon: <Mail className="h-5 w-5" />, color: 'text-purple-600' },
];

export function CalendarProvidersCircle({ onProviderClick }: CalendarProvidersCircleProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Calendar</label>
      <div className="flex flex-wrap justify-center gap-3">
        {PROVIDERS.map((provider) => (
          <button
            key={provider.id}
            type="button"
            onClick={() => onProviderClick(provider.id)}
            className={`flex h-12 w-12 items-center justify-center rounded-full border-2 border-border transition-all hover:border-[var(--accent-brand)] hover:scale-110 ${provider.color}`}
            title={`Connect ${provider.label} Calendar`}
          >
            {provider.icon}
          </button>
        ))}
      </div>
    </div>
  );
}
