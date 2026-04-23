/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Production optimizations
  poweredByHeader: false,
  compress: true,
  
  // Skip lint/type errors during build (lint runs as separate CI step)
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_POLYGON_RPC: process.env.NEXT_PUBLIC_POLYGON_RPC || 'https://polygon-mainnet.g.alchemy.com/v2/ho45p9JtQwjYllbKWKWNH',
    NEXT_PUBLIC_CHAIN_ID: '137',
  },
  
  // Webpack config for ethers compatibility
  webpack: (config) => {
    // Node.js polyfills for browser
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      path: false,
      os: false,
      stream: false,
      http: false,
      https: false,
      zlib: false,
    };
    
    return config;
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ];
  },
};

export default nextConfig;
