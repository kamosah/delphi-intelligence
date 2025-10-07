/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Enable experimental features as needed
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // Allow importing packages from the monorepo
  transpilePackages: ['@olympus/ui', '@olympus/types', '@olympus/config'],
}

export default nextConfig