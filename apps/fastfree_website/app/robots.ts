import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo-data';

export default function robots(): MetadataRoute.Robots {
  // Bare hostname: Google ignores Host:, Bing expects no scheme.
  const host = new URL(SITE_URL).hostname;
  return {
    // Single '*' rule covers Googlebot too (previous file duplicated it).
    // '/api' covers both /api and /api/* (contact POST endpoint).
    // Intentionally no `/_next/` disallow: Googlebot needs the JS/CSS
    // chunks to render; the middleware matcher already excludes
    // _next/api/assets/sitemap/robots from the locale redirect.
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: '/api',
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host,
  };
}
