'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface ContactFormProps {
  errorCode?: string;
  onSubmit?: (data: ContactFormData) => Promise<void>;
  locale?: 'en' | 'nl';
}

export interface ContactFormData {
  email: string;
  subject: string;
  message: string;
  errorCode?: string;
}

const translations = {
  en: {
    title: 'Contact Support',
    subtitle: 'Tell us how we can help',
    email: 'Email address',
    emailPlaceholder: 'your@email.com',
    subject: 'Subject',
    subjectPlaceholder: 'What is this about?',
    message: 'Message',
    messagePlaceholder: 'Describe your issue in detail...',
    errorCode: 'Error code (if applicable)',
    submit: 'Send message',
    sending: 'Sending...',
    success: 'Message sent! We\'ll get back to you soon.',
    error: 'Failed to send message. Please try again.',
  },
  nl: {
    title: 'Contact Ondersteuning',
    subtitle: 'Laat ons weten hoe we je kunnen helpen',
    email: 'E-mailadres',
    emailPlaceholder: 'jouw@email.com',
    subject: 'Onderwerp',
    subjectPlaceholder: 'Waar gaat dit over?',
    message: 'Bericht',
    messagePlaceholder: 'Beschrijf je probleem in detail...',
    errorCode: 'Foutcode (indien van toepassing)',
    submit: 'Bericht verzenden',
    sending: 'Verzenden...',
    success: 'Bericht verzonden! We nemen binnenkort contact met je op.',
    error: 'Bericht verzenden mislukt. Probeer het opnieuw.',
  },
};

export function ContactForm({ errorCode, onSubmit, locale = 'en' }: ContactFormProps) {
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const t = translations[locale];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus('idle');

    try {
      const data: ContactFormData = {
        email,
        subject,
        message,
        errorCode,
      };

      if (onSubmit) {
        await onSubmit(data);
      } else {
        // Default: send to API
        const response = await fetch('/api/support/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) throw new Error('Failed to send');
      }

      setStatus('success');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (err) {
      setStatus('error');
      console.error('Contact form error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto p-4">
      <div>
        <h2 className="text-lg font-semibold mb-1">{t.title}</h2>
        <p className="text-sm text-muted-foreground">{t.subtitle}</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">{t.email}</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t.emailPlaceholder}
          className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">{t.subject}</label>
        <input
          type="text"
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={t.subjectPlaceholder}
          className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">{t.message}</label>
        <textarea
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t.messagePlaceholder}
          className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent resize-none"
        />
      </div>

      {errorCode && (
        <div>
          <label className="block text-sm font-medium mb-1">{t.errorCode}</label>
          <div className="px-3 py-2 bg-muted rounded-lg border border-border text-sm font-mono">
            {errorCode}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {locale === 'nl'
              ? 'Deze foutcode wordt automatisch opgenomen in je bericht.'
              : 'This error code will be automatically included in your message.'}
          </p>
        </div>
      )}

      {status === 'success' && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
          {t.success}
        </div>
      )}

      {status === 'error' && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          {t.error}
        </div>
      )}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? t.sending : t.submit}
      </Button>
    </form>
  );
}
