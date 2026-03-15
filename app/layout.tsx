import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Libre_Baskerville, Atkinson_Hyperlegible, Kalam, Caveat } from 'next/font/google';
import { cn } from "@/lib/utils";
import { AppContextProvider } from "@/contexts/app-context";

const fontBaskerville = Libre_Baskerville({
  subsets: ['latin'],
  variable: '--font-baskerville',
  weight: ['400', '700'],
  display: 'swap',
});

const fontAtkinsonHyperlegible = Atkinson_Hyperlegible({
  subsets: ['latin'],
  variable: '--font-atkinson-hyperlegible',
  weight: ['400', '700'],
});

const fontKalam = Kalam({
  subsets: ['latin'],
  variable: '--font-kalam',
  weight: ['400', '700'],
  display: 'swap',
});

const fontCaveat = Caveat({
  subsets: ['latin'],
  variable: '--font-caveat',
  weight: ['400', '700'],
  display: 'swap',
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
  themeColor: "#007bff",
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
        "font-sans antialiased",
        fontBaskerville.variable,
        fontAtkinsonHyperlegible.variable,
        fontKalam.variable,
        fontCaveat.variable
      )}>
        <AppContextProvider>
            {children}
        </AppContextProvider>
        <Toaster />
      </body>
    </html>
  );
}
