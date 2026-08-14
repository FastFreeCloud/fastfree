import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },

  // ── Image Optimization ──────────────────────────────
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },

  // ── Standalone Output (Docker) ──────────────────────
  output: 'standalone',

  // ── Transpile Packages ──────────────────────────────
  transpilePackages: ['motion'],

  // ── Server External Packages (not bundled in client) ──
  serverExternalPackages: ['@google/genai', 'bcrypt', 'resend'],

  // ── Experimental Features ───────────────────────────
  experimental: {
    // Optimize barrel imports — converts named imports to path imports at build time
    // Saves ~89KB+ for lucide-react alone
    optimizePackageImports: [
      'lucide-react',
      'react-icons',
      '@heroicons/react',
      'date-fns',
    ],

    // Client Router Cache — keep pages in memory longer
    // Default: static=0s, dynamic=0s (Next 15 changed from 5min/30s)
    staleTimes: {
      static: 180,  // Static pages cached 3 minutes
      dynamic: 30,  // Dynamic pages cached 30 seconds
    },
  },

  // ── Security & Cache Headers ────────────────────────
  async headers() {
    const securityHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=()',
      },
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          // Next.js injects its own inline bootstrap scripts/styles
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob: https://fastfree.cloud https://picsum.photos https://images.unsplash.com",
          "font-src 'self' data:",
          "connect-src 'self' https://fastfree.cloud",
          "frame-ancestors 'self'",
          "base-uri 'self'",
          "form-action 'self'",
          "object-src 'none'",
          'upgrade-insecure-requests',
        ].join('; '),
      },
    ];

    return [
      {
        // Versioned /assets bundle — safe to cache forever
        source: '/assets/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Static image, font, JS, CSS files — content-hashed, cache forever
        source:
          '/(.*)\\.(jpg|jpeg|png|gif|ico|svg|webp|avif|woff|woff2|ttf|eot|js|css)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Global security headers for all routes
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },

  // ── Webpack Config ──────────────────────────────────
  webpack: (config, { dev }) => {
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    config.externals = config.externals || [];
    if (!Array.isArray(config.externals)) {
      config.externals = [config.externals];
    }
    config.externals.push('resend');
    return config;
  },
};

export default nextConfig;
