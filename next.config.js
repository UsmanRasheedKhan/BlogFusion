/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'firebasestorage.googleapis.com', // For Firebase Storage
      'lh3.googleusercontent.com',      // For Google Auth photos
      'd.newsweek.com',                 // Added for Newsweek images
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'd.newsweek.com',
        pathname: '/**',
      }
    ],
  },
}

module.exports = nextConfig