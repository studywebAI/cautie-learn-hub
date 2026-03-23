export type IntegrationProvider = 'microsoft';
export type IntegrationApp = 'word' | 'powerpoint' | 'excel';

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
};

export interface IntegrationProviderAdapter {
  provider: IntegrationProvider;
  listFiles(input: { accessToken: string; app: IntegrationApp; query?: string }): Promise<ProviderFileItem[]>;
  extractContent(input: ProviderExtractInput): Promise<string>;
}
