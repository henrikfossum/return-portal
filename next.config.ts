import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Add external domains that are allowed to host images
    domains: ['cdn.shopify.com'],
  },
  // Other configuration options can be added here
};

export default nextConfig;
