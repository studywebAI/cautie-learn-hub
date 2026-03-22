import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Inter, Atkinson_Hyperlegible } from 'next/font/google';
import { cn } from "@/lib/utils";
import { AppContextProvider } from "@/contexts/app-context";
import { GlobalRequestLogger } from "@/components/debug/global-request-logger";

const fontInter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['400', '500', '600'],
  display: 'swap',
});

const fontAtkinsonHyperlegible = Atkinson_Hyperlegible({
  subsets: ['latin'],
  variable: '--font-atkinson-hyperlegible',
  weight: ['400'],
});

export const metadata: Metadata = {
  title: "cautie",
  description: "The future of learning, powered by AI.",
  manifest: "/manifest.json",
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

const themeBootstrapScript = `
(() => {
  try {
    const themes = ['light', 'dark', 'ocean', 'forest', 'sunset', 'rose'];
    const saved = localStorage.getItem('studyweb-theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const resolved = themes.includes(saved || '') ? saved : (systemDark ? 'dark' : 'light');
    const root = document.documentElement;
    root.classList.remove('theme-light', 'theme-dark', 'theme-ocean', 'theme-forest', 'theme-sunset', 'theme-rose');
    root.classList.add('theme-' + resolved);
  } catch {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className={cn(
        "subpixel-antialiased",
        fontInter.variable,
        fontAtkinsonHyperlegible.variable
      )}>
        <AppContextProvider>
            <Suspense fallback={null}>
              <GlobalRequestLogger />
            </Suspense>
            {children}
        </AppContextProvider>
        <Toaster />
      </body>
    </html>
  );
}
