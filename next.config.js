/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export for Cloudflare Pages
  output: 'export',
  
  // Disable features not supported in static export
  images: {
    unoptimized: true, // Cloudflare Pages doesn't support Next.js Image Optimization
    domains: ['cdn.example.com', 'pub-*.r2.dev'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.r2.cloudflarestorage.com',
      },
    ],
  },
  
  // Trailing slash for better static hosting compatibility
  trailingSlash: true,
  
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://drama-backend.your-worker.workers.dev',
  },
}

module.exports = nextConfig
