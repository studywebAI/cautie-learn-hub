import type { IntegrationProvider, IntegrationProviderAdapter } from '@/lib/integrations/providers/types';
import { microsoftProviderAdapter } from '@/lib/integrations/providers/microsoft-adapter';

const PROVIDER_REGISTRY: Record<IntegrationProvider, IntegrationProviderAdapter> = {
  microsoft: microsoftProviderAdapter,
};

export function getProviderAdapter(provider: IntegrationProvider): IntegrationProviderAdapter {
  const adapter = PROVIDER_REGISTRY[provider];
  if (!adapter) throw new Error(`Provider adapter not found: ${provider}`);
  return adapter;
}
