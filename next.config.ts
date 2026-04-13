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
  async redirects() {
    // Permanent backward-compatibility redirects for legacy Event-era URLs.
    // These should remain in place so old bookmarks/shared links continue to work.
    return [
      { source: '/events/:path*', destination: '/bookings/:path*', permanent: true },
      { source: '/admin/events/:path*', destination: '/admin/bookings/:path*', permanent: true },
      { source: '/dashboard/events/:path*', destination: '/dashboard/bookings/:path*', permanent: true },
      { source: '/staff/events/:path*', destination: '/staff/bookings/:path*', permanent: true },
      { source: '/facilitator/events/:path*', destination: '/facilitator/bookings/:path*', permanent: true },
      { source: '/board/events/:path*', destination: '/board/bookings/:path*', permanent: true },
      { source: '/partner/events/:path*', destination: '/partner/bookings/:path*', permanent: true },
      { source: '/admin/event-requests/:path*', destination: '/admin/booking-requests/:path*', permanent: true },
      { source: '/dashboard/my-events/:path*', destination: '/dashboard/my-bookings/:path*', permanent: true },
      { source: '/staff/my-events/:path*', destination: '/staff/my-bookings/:path*', permanent: true },
      { source: '/facilitator/my-events/:path*', destination: '/facilitator/my-bookings/:path*', permanent: true },
      { source: '/partner/my-events/:path*', destination: '/partner/my-bookings/:path*', permanent: true },
      { source: '/volunteer/my-events/:path*', destination: '/volunteer/my-bookings/:path*', permanent: true },
    ]
  },
};

export default nextConfig;
