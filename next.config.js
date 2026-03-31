/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allows xlsx to work server-side
  serverExternalPackages: ['xlsx'],
}

module.exports = nextConfig
