import {
  extractMicrosoftFileText,
  listMicrosoftFiles,
  type MicrosoftFileKind,
} from '@/lib/integrations/microsoft';
import type { IntegrationProviderAdapter } from '@/lib/integrations/providers/types';

function toMicrosoftKind(app: string): MicrosoftFileKind {
  if (app === 'word' || app === 'powerpoint' || app === 'excel' || app === 'onedrive') return app;
  throw new Error(`Unsupported Microsoft app: ${app}`);
}

export const microsoftProviderAdapter: IntegrationProviderAdapter = {
  provider: 'microsoft',
  async listFiles(input) {
    return listMicrosoftFiles({
      accessToken: input.accessToken,
      kind: toMicrosoftKind(input.app),
      query: input.query,
    });
  },
  async extractContent(input) {
    return extractMicrosoftFileText({
      accessToken: input.accessToken,
      fileId: input.fileId,
      kind: toMicrosoftKind(input.app),
      fileName: input.fileName,
      mimeType: input.mimeType || undefined,
    });
  },
};
