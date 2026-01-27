// next.config.ts
import type { NextConfig } from 'next';
import withPWA from 'next-pwa';
import withBundleAnalyzer from '@next/bundle-analyzer';

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },

  transpilePackages: ['lucide-react'],

  images: {
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
