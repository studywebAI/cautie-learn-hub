import type { IntegrationAppId, IntegrationProviderId } from '@/lib/integrations/catalog';

export type IntegrationProvider = IntegrationProviderId;
export type IntegrationApp = IntegrationAppId;

export type ProviderFileItem = {
  id: string;
  name: string;
  kind: IntegrationApp;
  mimeType?: string;
  webUrl?: string;
  size?: number;
  lastModifiedDateTime?: string;
};

export type ProviderExtractInput = {
  accessToken: string;
  app: IntegrationApp;
  fileId: string;
  fileName?: string;
  mimeType?: string | null;
};

export interface IntegrationProviderAdapter {
  provider: IntegrationProvider;
  listFiles(input: { accessToken: string; app: IntegrationApp; query?: string }): Promise<ProviderFileItem[]>;
  extractContent(input: ProviderExtractInput): Promise<string>;
}
