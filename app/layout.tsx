import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Libre_Baskerville, Atkinson_Hyperlegible, Kalam } from 'next/font/google';
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

export const metadata: Metadata = {
  title: "cautie",
  description: "The future of learning, powered by AI.",
  manifest: "/manifest.json",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
  themeColor: "#007bff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(
        "font-sans antialiased",
        fontBaskerville.variable,
        fontAtkinsonHyperlegible.variable,
        fontKalam.variable
      )}>
        <AppContextProvider>
            {children}
        </AppContextProvider>
        <Toaster />
      </body>
    </html>
  );
}
