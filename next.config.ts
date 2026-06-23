// next.config.ts
// @ts-ignore - next-pwa types not available  
import type { NextConfig } from 'next';
// @ts-ignore
import withPWA from 'next-pwa';
// @ts-ignore
import withBundleAnalyzer from '@next/bundle-analyzer';
import path from 'node:path';

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname),
  typescript: {
    ignoreBuildErrors: true,
  },
  compress: true,
  poweredByHeader: false,

  transpilePackages: ['lucide-react'],
  experimental: {
    optimizePackageImports: ['lucide-react'],
    // Next 16 defaults dynamic route caching to 0s, forcing a fresh RSC fetch
    // (and the nearest loading.tsx fallback) on every single navigation, even
    // to a page visited seconds ago. Restore caching so revisits are instant.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 7,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        pathname: '/**',
      },
    ],
  },

  serverExternalPackages: [
    'genkit',
    '@genkit-ai/google-genai',
    '@genkit-ai/next',
  ],

  webpack: (config: any, { isServer }: any) => {
    if (isServer) {
      const externals = config.externals || [];

      // voeg alles in één keer toe
      const genkitExternals = [
        'express',
        'import-in-the-middle',
        'require-in-the-middle',
        'genkit',
        '@genkit-ai/google-genai',
        '@genkit-ai/next',
        /^@genkit-ai\//,
      ];

      config.externals = [...externals, ...genkitExternals];
    }

    return config;
  },
};

// Temporarily disable PWA to fix build
export default bundleAnalyzer(nextConfig);
