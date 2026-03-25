export type IntegrationProviderId = 'microsoft' | 'google' | 'notion';
export type IntegrationAppId =
  | 'word'
  | 'powerpoint'
  | 'onedrive'
  | 'excel'
  | 'google-docs'
  | 'google-slides'
  | 'google-sheets'
  | 'notion-pages';

export type IntegrationAppConfig = {
  id: IntegrationAppId;
  provider: IntegrationProviderId;
  label: string;
  description: string;
  logoPath: string;
  enabled: boolean;
};

export const INTEGRATION_APPS: IntegrationAppConfig[] = [
  {
    id: 'word',
    provider: 'microsoft',
    label: 'Word',
    description: 'Read-only .doc/.docx access',
    logoPath: '/integrations/microsoft-word.svg',
    enabled: false,
  },
  {
    id: 'powerpoint',
    provider: 'microsoft',
    label: 'PowerPoint',
    description: 'Read-only .ppt/.pptx access',
    logoPath: '/integrations/microsoft-powerpoint.svg',
    enabled: false,
  },
  {
    id: 'excel',
    provider: 'microsoft',
    label: 'Excel',
    description: 'Read-only .xls/.xlsx access',
    logoPath: '/integrations/microsoft-excel.svg',
    enabled: false,
  },
  {
    id: 'onedrive',
    provider: 'microsoft',
    label: 'OneDrive',
    description: 'Read-only files and images',
    logoPath: '/integrations/microsoft-onedrive.svg',
    enabled: true,
  },
  {
    id: 'google-docs',
    provider: 'google',
    label: 'Google Docs',
    description: 'Read-only docs access',
    logoPath: '/integrations/google-docs.svg',
    enabled: false,
  },
  {
    id: 'google-slides',
    provider: 'google',
    label: 'Google Slides',
    description: 'Read-only slides access',
    logoPath: '/integrations/google-slides.svg',
    enabled: false,
  },
  {
    id: 'google-sheets',
    provider: 'google',
    label: 'Google Sheets',
    description: 'Read-only sheets access',
    logoPath: '/integrations/google-sheets.svg',
    enabled: false,
  },
  {
    id: 'notion-pages',
    provider: 'notion',
    label: 'Notion',
    description: 'Read-only pages access',
    logoPath: '/integrations/notion.svg',
    enabled: false,
  },
];

export const ENABLED_INTEGRATION_APPS = INTEGRATION_APPS.filter((app) => app.enabled);
export const ENABLED_INTEGRATION_APP_IDS = ENABLED_INTEGRATION_APPS.map((app) => app.id);
export const ENABLED_INTEGRATION_PROVIDER_IDS = Array.from(new Set(ENABLED_INTEGRATION_APPS.map((app) => app.provider)));

export function getIntegrationAppById(id: string) {
  return INTEGRATION_APPS.find((app) => app.id === id);
}

export function isEnabledIntegrationAppId(id: string): id is IntegrationAppId {
  return ENABLED_INTEGRATION_APP_IDS.includes(id as IntegrationAppId);
}

export function isEnabledIntegrationProviderId(id: string): id is IntegrationProviderId {
  return ENABLED_INTEGRATION_PROVIDER_IDS.includes(id as IntegrationProviderId);
}
