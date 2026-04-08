# Color Baseline (Before 2026-04-08 Changes)

Source snapshots taken from `HEAD` before this working-tree patch.

## Root Tokens

## Sand Tokens (Old)
```css
  .theme-sand {
    --background: 50 23.1% 94.9%;
    --foreground: 60 4% 9.8%;
    --card: 0 0% 100%;
    --card-foreground: 60 4% 9.8%;
    --popover: 0 0% 100%;
    --popover-foreground: 60 4% 9.8%;
    --primary: 50 16.7% 92.9%;
    --primary-foreground: 60 4% 9.8%;
    --secondary: 50 16.7% 92.9%;
    --secondary-foreground: 60 3.4% 34.9%;
    --muted: 46.7 24.3% 92.7%;
    --muted-foreground: 52.5 3.4% 53.3%;
    --accent: 50 16.7% 92.9%;
    --accent-foreground: 60 4% 9.8%;
    --destructive: 0 56.7% 40.8%;
    --destructive-foreground: 0 0% 100%;
    --success: 164.8 76% 24.5%;
    --success-foreground: 0 0% 100%;
    --border: 60 4% 9.8% / 0.1;
    --input: 60 4% 9.8% / 0.2;
    --ring: 60 4% 9.8%;
    --chart-1: 60 4% 22%;
    --chart-2: 160.9 69% 36.7%;
    --chart-3: 36 86.2% 54.5%;
    --chart-4: 0.4 72.4% 58.8%;
    --chart-5: 209.8 74.6% 37.1%;

    --surface-1: 0 0% 100%;
    --surface-2: 50 16.7% 92.9%;
    --surface-3: 46.7 24.3% 92.7%;
    --interactive-hover: 60 4% 9.8% / 0.05;
    --interactive-active: 60 4% 9.8% / 0.1;
    --focus-ring: 60 4% 9.8%;
    --sidebar-background: 50 16.7% 92.9%;
    --sidebar-foreground: 60 3.4% 34.9%;
    --sidebar-primary: 60 4% 9.8%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 0 0% 100%;
    --sidebar-accent-foreground: 60 3.4% 34.9%;
    --sidebar-active-foreground: 60 4% 9.8%;
    --sidebar-border: 60 4% 9.8% / 0.1;
    --sidebar-ring: 60 4% 9.8%;
  }

```

## Sunset Tokens (Old)
```css
  .theme-sunset {
    --background: 34 24% 93.1%;
    --foreground: 28 30% 15%;
    --card: 34 28% 95.7%;
    --card-foreground: 28 30% 15%;
    --popover: 34 28% 95.7%;
    --popover-foreground: 28 30% 15%;
    --primary: 26 58% 40%;
    --primary-foreground: 34 36% 98%;
    --secondary: 34 28% 95.7%;
    --secondary-foreground: 28 28% 16.5%;
    --muted: 34 18% 95.7%;
    --muted-foreground: 24 16% 38%;
    --accent: 34 18% 95.7%;
    --accent-foreground: 28 28% 16.5%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;
    --success: 146 36% 34%;
    --success-foreground: 0 0% 100%;
    --border: 34 28% 95.4%;
    --input: 34 28% 95.4%;
    --ring: 26 58% 40%;
    --chart-1: 26 58% 40%;
    --chart-2: 14 46% 46%;
    --chart-3: 38 44% 44%;
    --chart-4: 52 36% 50%;
    --chart-5: 20 28% 58%;
    --surface-1: 34 28% 95.7%;
    --surface-2: 34 20% 95.4%;
    --surface-3: 34 18% 95.1%;
    --interactive-hover: 34 20% 89.2%;
    --interactive-active: 34 20% 87%;
    --focus-ring: 26 58% 40%;
    --sidebar-background: 34 28% 95.7%;
    --sidebar-foreground: 28 28% 16.5%;
    --sidebar-primary: 26 58% 40%;
    --sidebar-primary-foreground: 34 36% 98%;
    --sidebar-accent: 34 28% 95.7%;
    --sidebar-accent-foreground: 28 28% 16.5%;
    --sidebar-active-foreground: var(--sidebar-accent-foreground);
    --sidebar-border: 34 28% 95.4%;
    --sidebar-ring: 26 58% 40%;
  }

```

## Theme Picker Palette (Old)
```tsx
const THEMES: ThemeOption[] = [
  { value: 'light', label: 'light', colors: { bg: '#f2f2f2', fg: '#1a1a1a', primary: '#262626', card: '#fbfbfb', muted: '#f7f7f7' } },
  { value: 'sand', label: 'sand', colors: { bg: '#F5F4EF', fg: '#1A1A18', primary: '#D97757', card: '#FFFFFF', muted: '#EEECEA' } },
  { value: 'legacy', label: 'legacy', colors: { bg: '#f2f2f2', fg: '#1a1a1a', primary: '#262626', card: '#fbfbfb', muted: '#f7f7f7' } },
  { value: 'dark', label: 'dark', colors: { bg: '#121212', fg: '#ffffff', primary: '#e6e6e6', card: '#1c1c1c', muted: '#262626' } },
  { value: 'ocean', label: 'mist', colors: { bg: '#f2f6f8', fg: '#213945', primary: '#2a6787', card: '#e8eff3', muted: '#dfe8ed' } },
  { value: 'forest', label: 'sage', colors: { bg: '#f3f7f1', fg: '#243628', primary: '#3b6f48', card: '#e9efe6', muted: '#e0e8dc' } },
  { value: 'sunset', label: 'sand', colors: { bg: '#faf5ee', fg: '#3b2a1e', primary: '#b06633', card: '#f1e7da', muted: '#e8ddcf' } },
  { value: 'rose', label: 'blossom', colors: { bg: '#faf2f4', fg: '#412734', primary: '#9f4f71', card: '#f1e5e9', muted: '#e7d9df' } },
];

function ThemeCard({ option, selected, onClick }: { option: ThemeOption; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex flex-col rounded-xl border-2 p-3 transition-all duration-200 text-left group',
        selected
          ? 'border-primary shadow-sm'
          : 'border-border hover:border-muted-foreground/30'
      )}
```
