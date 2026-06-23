/**
 * Error code system for user-friendly error messaging and team monitoring.
 * Format: {CATEGORY}-{SUBCATEGORY}-{NUMBER}
 * E.g.: AUTH-LOGIN-001, API-NETWORK-002, STUDY-SYNC-003
 */

export interface ErrorCodeDefinition {
  code: string;
  titleEn: string;
  titleNl: string;
  descriptionEn: string;
  descriptionNl: string;
  category: 'auth' | 'api' | 'study' | 'sync' | 'data' | 'system';
  severity: 'info' | 'warning' | 'error' | 'critical';
  userActionEn?: string;
  userActionNl?: string;
}

const errorCodes: Record<string, ErrorCodeDefinition> = {
  // Authentication errors
  'AUTH-LOGIN-001': {
    code: 'AUTH-LOGIN-001',
    titleEn: 'Invalid credentials',
    titleNl: 'Ongeldige inloggegevens',
    descriptionEn: 'The email or password you entered is incorrect.',
    descriptionNl: 'Het e-mailadres of wachtwoord dat je hebt ingevoerd, is onjuist.',
    category: 'auth',
    severity: 'warning',
    userActionEn: 'Check your email and password, then try again.',
    userActionNl: 'Controleer je e-mailadres en wachtwoord en probeer het opnieuw.',
  },
  'AUTH-SESSION-001': {
    code: 'AUTH-SESSION-001',
    titleEn: 'Session expired',
    titleNl: 'Sessie verlopen',
    descriptionEn: 'Your login session has expired. Please log in again.',
    descriptionNl: 'Je inlogsessie is verlopen. Log opnieuw in.',
    category: 'auth',
    severity: 'warning',
    userActionEn: 'Log in again with your credentials.',
    userActionNl: 'Log opnieuw in met je inloggegevens.',
  },
  'AUTH-2FA-001': {
    code: 'AUTH-2FA-001',
    titleEn: 'Two-factor authentication failed',
    titleNl: 'Twee-factor authenticatie mislukt',
    descriptionEn: 'The code you entered is invalid or expired.',
    descriptionNl: 'De code die je hebt ingevoerd, is ongeldig of verlopen.',
    category: 'auth',
    severity: 'warning',
    userActionEn: 'Enter a new code from your authenticator app.',
    userActionNl: 'Voer een nieuwe code in van je authenticator-app.',
  },

  // Network/API errors
  'API-NETWORK-001': {
    code: 'API-NETWORK-001',
    titleEn: 'Network connection error',
    titleNl: 'Netwerkverbindingsfout',
    descriptionEn: 'Unable to reach the server. Check your internet connection.',
    descriptionNl: 'Kan de server niet bereiken. Controleer je internetverbinding.',
    category: 'api',
    severity: 'error',
    userActionEn: 'Check your connection and try again.',
    userActionNl: 'Controleer je verbinding en probeer het opnieuw.',
  },
  'API-TIMEOUT-001': {
    code: 'API-TIMEOUT-001',
    titleEn: 'Request timeout',
    titleNl: 'Verzoek verlopen',
    descriptionEn: 'The server took too long to respond.',
    descriptionNl: 'De server heeft te lang nodig gehad om te reageren.',
    category: 'api',
    severity: 'error',
    userActionEn: 'Try again in a few moments.',
    userActionNl: 'Probeer het over enkele ogenblikken opnieuw.',
  },
  'API-SERVER-001': {
    code: 'API-SERVER-001',
    titleEn: 'Server error',
    titleNl: 'Serverfout',
    descriptionEn: 'The server encountered an error processing your request.',
    descriptionNl: 'De server is een fout tegengekomen bij het verwerken van je verzoek.',
    category: 'api',
    severity: 'critical',
    userActionEn: 'Contact support if the problem persists.',
    userActionNl: 'Neem contact op met ondersteuning als het probleem aanhoudt.',
  },

  // Study tools errors
  'STUDY-QUIZ-001': {
    code: 'STUDY-QUIZ-001',
    titleEn: 'Failed to load quiz',
    titleNl: 'Quiz kan niet worden geladen',
    descriptionEn: 'The quiz could not be loaded. Your data may not be saved.',
    descriptionNl: 'De quiz kan niet worden geladen. Je gegevens zijn mogelijk niet opgeslagen.',
    category: 'study',
    severity: 'error',
    userActionEn: 'Reload the page and try again.',
    userActionNl: 'Laad de pagina opnieuw en probeer het opnieuw.',
  },
  'STUDY-FLASHCARD-001': {
    code: 'STUDY-FLASHCARD-001',
    titleEn: 'Failed to load flashcards',
    titleNl: 'Flashcards kunnen niet worden geladen',
    descriptionEn: 'The flashcard set could not be loaded.',
    descriptionNl: 'De flashcardset kan niet worden geladen.',
    category: 'study',
    severity: 'error',
    userActionEn: 'Try refreshing the page.',
    userActionNl: 'Probeer de pagina te vernieuwen.',
  },

  // Sync errors
  'SYNC-DATA-001': {
    code: 'SYNC-DATA-001',
    titleEn: 'Sync failed',
    titleNl: 'Synchronisatie mislukt',
    descriptionEn: 'Your changes could not be saved. You may be offline.',
    descriptionNl: 'Je wijzigingen kunnen niet worden opgeslagen. Mogelijk ben je offline.',
    category: 'sync',
    severity: 'warning',
    userActionEn: 'Check your connection and try again.',
    userActionNl: 'Controleer je verbinding en probeer het opnieuw.',
  },

  // Data/Storage errors
  'DATA-STORAGE-001': {
    code: 'DATA-STORAGE-001',
    titleEn: 'Storage quota exceeded',
    titleNl: 'Opslagruimte overschreden',
    descriptionEn: 'You have reached your storage limit.',
    descriptionNl: 'Je hebt je opslaglimiet bereikt.',
    category: 'data',
    severity: 'warning',
    userActionEn: 'Upgrade your plan or delete unused content.',
    userActionNl: 'Upgrade je plan of verwijder ongebruikte inhoud.',
  },

  // System errors
  'SYSTEM-BROWSER-001': {
    code: 'SYSTEM-BROWSER-001',
    titleEn: 'Browser not supported',
    titleNl: 'Browser wordt niet ondersteund',
    descriptionEn: 'Your browser is not fully supported. Please use a modern browser.',
    descriptionNl: 'Je browser wordt niet volledig ondersteund. Gebruik een moderne browser.',
    category: 'system',
    severity: 'warning',
  },
};

/**
 * Get error code definition or return a generic error code.
 */
export function getErrorDefinition(code: string): ErrorCodeDefinition {
  return (
    errorCodes[code] || {
      code,
      titleEn: 'An error occurred',
      titleNl: 'Een fout is opgetreden',
      descriptionEn: 'Something went wrong. Please try again.',
      descriptionNl: 'Er is iets fout gegaan. Probeer het opnieuw.',
      category: 'system',
      severity: 'error',
    }
  );
}

/**
 * Get user-friendly error message based on locale.
 */
export function getErrorMessage(code: string, locale: 'en' | 'nl' = 'en'): { title: string; description: string; action?: string } {
  const def = getErrorDefinition(code);
  const key = locale === 'nl' ? 'Nl' : 'En';
  return {
    title: def[`title${key}` as keyof ErrorCodeDefinition] as string,
    description: def[`description${key}` as keyof ErrorCodeDefinition] as string,
    action: def[`userAction${key}` as keyof ErrorCodeDefinition] as string | undefined,
  };
}

/**
 * Generate a new error code for unknown errors.
 */
export function generateErrorCode(category: 'auth' | 'api' | 'study' | 'sync' | 'data' | 'system' = 'system'): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `${category.toUpperCase()}-UNKNOWN-${timestamp}${random}`.toUpperCase().substring(0, 20);
}

export const ALL_ERROR_CODES = Object.values(errorCodes);
