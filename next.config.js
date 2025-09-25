/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Allow building even if ESLint reports problems. This prevents dev-time lint
  // rules from blocking production builds (useful during development or CI).
  // If you prefer to keep strict linting, remove or set to false and fix the
  // reported issues instead.
  eslint: {
    ignoreDuringBuilds: false,
  },
  // Do not expose sensitive secrets here. Server-side code should read process.env.GEMINI_API_KEY directly.
  // If you must expose a model selection to the client, prefix it with NEXT_PUBLIC_. Avoid embedding API keys.
  headers: async () => {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 's-maxage=180, stale-while-revalidate=300',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;