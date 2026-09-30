/** @type {import('next').NextConfig} */
const nextConfig = {
  // serveur autonome (.next/standalone) pour l'image Docker
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
