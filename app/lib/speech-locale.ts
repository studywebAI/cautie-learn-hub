/**
 * Speech locale resolver — maps language codes to BCP 47 speech recognition locales.
 * Supports 12 languages across major regions.
 */

export const resolveSpeechLocale = (language?: string) => {
  switch ((language || 'en').toLowerCase()) {
    case 'nl':
      return 'nl-NL';
    case 'de':
      return 'de-DE';
    case 'fr':
      return 'fr-FR';
    case 'es':
      return 'es-ES';
    case 'pt':
      return 'pt-PT';
    case 'pl':
      return 'pl-PL';
    case 'ru':
      return 'ru-RU';
    case 'ar':
      return 'ar-SA';
    case 'ur':
      return 'ur-PK';
    case 'bn':
      return 'bn-BD';
    case 'hi':
      return 'hi-IN';
    case 'zh':
      return 'zh-CN';
    default:
      return 'en-US';
  }
};
