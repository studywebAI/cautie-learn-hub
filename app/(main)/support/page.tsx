'use client';

import { useState } from 'react';
import { ContactForm, ContactFormData } from '@/components/support/contact-form';
import { PageHeader } from '@/components/page-header';
import { getErrorMessage, ALL_ERROR_CODES } from '@/lib/error-codes';

export default function SupportPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [locale, setLocale] = useState<'en' | 'nl'>('en');
  const [showContactForm, setShowContactForm] = useState(false);
  const [selectedErrorCode, setSelectedErrorCode] = useState<string>();

  const filteredCodes = ALL_ERROR_CODES.filter(
    (def) =>
      def.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      def[`title${locale === 'nl' ? 'Nl' : 'En'}`].toLowerCase().includes(searchQuery.toLowerCase())
  );

  const t = locale === 'nl' ? {
    title: 'Help & Ondersteuning',
    subtitle: 'Vind antwoorden op veelgestelde vragen en fouten',
    errorCodes: 'Foutcodes',
    errorCodesDesc: 'Alle openbaar beschikbare foutcodes met uitleg',
    search: 'Foutcode zoeken...',
    contact: 'Neem contact op met ondersteuning',
    language: 'Taal',
    noResults: 'Geen resultaten voor je zoekopdracht',
  } : {
    title: 'Help & Support',
    subtitle: 'Find answers to common questions and errors',
    errorCodes: 'Error Codes',
    errorCodesDesc: 'All publicly available error codes with explanations',
    search: 'Search code...',
    contact: 'Contact Support',
    language: 'Language',
    noResults: 'No results for your search',
  };

  const handleContactFormSubmit = async (data: ContactFormData) => {
    // Contact form will handle submission
    setShowContactForm(false);
  };

  return (
    <div className="page-content space-y-8">
      <PageHeader
        title={t.title}
        subtitle={t.subtitle}
        actions={
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as 'en' | 'nl')}
            className="px-3 py-2 border border-border rounded-lg bg-background text-sm"
          >
            <option value="en">English</option>
            <option value="nl">Nederlands</option>
          </select>
        }
      />

      {/* Contact Support Button */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowContactForm(true)}
          className="px-4 py-2 bg-accent text-white rounded-lg font-medium hover:opacity-90"
        >
          {t.contact}
        </button>
      </div>

      {showContactForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-xl max-w-md w-full shadow-lg">
            <div className="flex justify-between items-center p-4 border-b border-border">
              <h2 className="font-semibold">{t.contact}</h2>
              <button
                onClick={() => setShowContactForm(false)}
                className="text-muted-foreground hover:text-foreground text-xl"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              <ContactForm
                errorCode={selectedErrorCode}
                locale={locale}
                onSubmit={handleContactFormSubmit}
              />
            </div>
          </div>
        </div>
      )}

      {/* Error Codes Section */}
      <div className="space-y-4">
        <div>
          <h2 className="font-semibold text-lg">{t.errorCodes}</h2>
          <p className="text-sm text-muted-foreground">{t.errorCodesDesc}</p>
        </div>

        <input
          type="text"
          placeholder={t.search}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full max-w-md px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
        />

        <div className="space-y-2 max-w-4xl">
          {filteredCodes.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.noResults}</p>
          ) : (
            filteredCodes.map((def) => {
              const msg = getErrorMessage(def.code, locale);
              const severityColor = {
                info: 'surface-panel border-border',
                warning: 'surface-panel border-border',
                error: 'surface-interactive border-border',
                critical: 'surface-interactive border-foreground/30',
              }[def.severity];

              return (
                <div
                  key={def.code}
                  className={`p-4 rounded-lg border ${severityColor} cursor-pointer hover:shadow-sm transition-shadow`}
                  onClick={() => {
                    setSelectedErrorCode(def.code);
                    setShowContactForm(true);
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono font-semibold">{def.code}</code>
                        <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground capitalize">
                          {def.severity}
                        </span>
                      </div>
                      <h3 className="font-semibold text-sm mt-1">{msg.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{msg.description}</p>
                      {msg.action && (
                        <p className="text-sm text-muted-foreground mt-2 italic">
                          💡 {msg.action}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="space-y-4 max-w-4xl">
        <h2 className="font-semibold text-lg">
          {locale === 'nl' ? 'Veelgestelde vragen' : 'Frequently Asked Questions'}
        </h2>

        <div className="space-y-3">
          <details className="group p-4 border border-border rounded-lg cursor-pointer">
            <summary className="font-medium text-sm">
              {locale === 'nl'
                ? 'Hoe deel ik een error code met het supportteam?'
                : 'How do I share an error code with the support team?'}
            </summary>
            <p className="text-sm text-muted-foreground mt-2">
              {locale === 'nl'
                ? 'Kopieer de foutcode en plak deze in het contactformulier. Het code wordt automatisch opgenomen in je bericht naar ons supportteam.'
                : 'Copy the error code and paste it into the contact form below. The code will be automatically included in your message to our support team.'}
            </p>
          </details>

          <details className="group p-4 border border-border rounded-lg cursor-pointer">
            <summary className="font-medium text-sm">
              {locale === 'nl'
                ? 'Wat betekent "kritiek" in de ernstniveaus?'
                : 'What does "critical" mean in the severity levels?'}
            </summary>
            <p className="text-sm text-muted-foreground mt-2">
              {locale === 'nl'
                ? 'Kritieke fouten kunnen ervoor zorgen dat je niet kunt studeren of gegevens verliest. Neem onmiddellijk contact op met ondersteuning als je een kritieke fout tegenkomt.'
                : 'Critical errors can prevent you from studying or cause data loss. Please contact support immediately if you encounter a critical error.'}
            </p>
          </details>
        </div>
      </div>
    </div>
  );
}
