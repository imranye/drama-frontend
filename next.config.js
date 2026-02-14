/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['cdn.example.com', 'pub-*.r2.dev'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.r2.cloudflarestorage.com',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://drama-backend.your-worker.workers.dev',
  },
}

module.exports = nextConfig
