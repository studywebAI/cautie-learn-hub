import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import "./styles/animations.css";
import { Toaster } from "@/components/ui/toaster";
import { Atkinson_Hyperlegible } from 'next/font/google';
import { cn } from "@/lib/utils";
import { AppContextProvider } from "@/contexts/app-context";
import { GlobalRequestLogger } from "@/components/debug/global-request-logger";
import { ChunkRecovery } from "@/components/runtime/chunk-recovery";
import { IdeasProviderWrapper } from "@/components/IdeasProvider";

const fontAtkinsonHyperlegible = Atkinson_Hyperlegible({
  subsets: ['latin'],
  variable: '--font-atkinson-hyperlegible',
  weight: ['400'],
  preload: false,
  display: 'swap',
});

export const metadata: Metadata = {
  title: "cautie",
  description: "The future of learning, powered by AI.",
  manifest: process.env.NEXT_PUBLIC_ENABLE_PWA === '1' ? "/manifest.json" : undefined,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f6" },
    { media: "(prefers-color-scheme: dark)", color: "#111216" },
  ],
};

// This bootstrap script is hardcoded and safe for inline scripts.
// It contains no user-supplied data and is executed only once during page load.
// It's necessary for theme application before React hydration to prevent FOUC.
const themeBootstrapScript = `
(() => {
  try {
    const themes = ['light', 'sand', 'dark'];
    const saved = localStorage.getItem('studyweb-theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const legacyMap = { sunset: 'sand', legacy: 'light', ocean: 'light', forest: 'light', rose: 'light' };
    const resolvedSaved = legacyMap[saved] || saved;
    const resolved = themes.includes(resolvedSaved || '') ? resolvedSaved : (systemDark ? 'dark' : 'light');
    const root = document.documentElement;
    root.classList.remove('theme-light', 'theme-sand', 'theme-legacy', 'theme-dark', 'theme-ocean', 'theme-forest', 'theme-sunset', 'theme-rose');
    root.classList.add('theme-' + resolved);
    root.classList.toggle('dark', resolved === 'dark');
    root.classList.remove('ui-font-georgia', 'ui-font-legacy');
    root.classList.add('ui-font-legacy');
  } catch {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const shouldEnableRequestLogger = process.env.NODE_ENV !== 'production';

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className={cn(
        "subpixel-antialiased",
        fontAtkinsonHyperlegible.variable
      )}>
        <AppContextProvider>
          <IdeasProviderWrapper>
            <ChunkRecovery />
            {shouldEnableRequestLogger ? (
              <Suspense fallback={null}>
                <GlobalRequestLogger />
              </Suspense>
            ) : null}
            {children}
          </IdeasProviderWrapper>
        </AppContextProvider>
        <Toaster />
      </body>
    </html>
  );
}
