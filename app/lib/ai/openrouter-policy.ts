export const OPENROUTER_PROVIDER_PREFERENCE = 'openai' as const;
export const OPENROUTER_LOCKED_MODEL = 'google/gemini-2.5-flash-lite' as const;

export function resolveOpenRouterApiKey() {
  const value = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || '';
  return String(value).trim();
}

export function normalizeOpenRouterModel(_value: unknown) {
  return OPENROUTER_LOCKED_MODEL;
}

export function normalizeOpenRouterProviderPreference(_value: unknown) {
  return OPENROUTER_PROVIDER_PREFERENCE;
}

