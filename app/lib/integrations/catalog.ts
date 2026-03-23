export type IntegrationProviderId = 'microsoft';
export type IntegrationAppId = 'word' | 'powerpoint' | 'excel';

export type IntegrationAppConfig = {
  id: IntegrationAppId;
  provider: IntegrationProviderId;
  label: string;
  description: string;
  logoPath: string;
};

export const INTEGRATION_APPS: IntegrationAppConfig[] = [
  {
    id: 'word',
    provider: 'microsoft',
    label: 'Word',
    description: 'Read-only .doc/.docx access',
    logoPath: '/integrations/microsoft-word.svg',
  },
  {
    id: 'powerpoint',
    provider: 'microsoft',
    label: 'PowerPoint',
    description: 'Read-only .ppt/.pptx access',
    logoPath: '/integrations/microsoft-powerpoint.svg',
  },
  {
    id: 'excel',
    provider: 'microsoft',
    label: 'Excel',
    description: 'Read-only .xls/.xlsx access',
    logoPath: '/integrations/microsoft-excel.svg',
  },
];

export function getIntegrationAppById(id: string) {
  return INTEGRATION_APPS.find((app) => app.id === id);
}
