import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Fix chunk loading: use project root for file tracing (resolves multiple lockfiles warning)
  outputFileTracingRoot: path.resolve(process.cwd()),
  
  // Optimize package imports for faster builds and runtime
  transpilePackages: [
    'lucide-react', 
    'zod',
    '@prisma/client',
    'date-fns',
    'bcryptjs',
    'next-auth'
  ],
  
  experimental: {
    optimizePackageImports: [
      'lucide-react', 
      'zod',
      'date-fns',
      '@prisma/client'
    ],
  },
  
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'media.gettyimages.com',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: 'encrypted-tbn0.gstatic.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'gravatar.com',
      },
    ],
  },
};

export default nextConfig;
