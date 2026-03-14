import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,

  allowedDevOrigins: ['10.196.79.7'],

  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  experimental: {
    optimizePackageImports: ['lucide-react'],
  },

  turbopack: {
    root: __dirname,
  },

  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.infrastructureLogging = {
        level: 'error',
      };
    }
    return config;
  },

  logging: {
    fetches: {
      fullUrl: false,
    },
  },
};

export default nextConfig;