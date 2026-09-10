import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo-data';
import { locales } from '@/lib/i18n';
import { products } from '@/src/data/products';
import { blogPosts } from '@/src/data/blog';
import { services } from '@/src/data/services';

type Route = {
  path: string;
  priority: number;
  changeFrequency: 'monthly' | 'weekly' | 'daily' | 'yearly';
  lastModified?: Date;
};

// Fallback for content without an explicit date. Update when site copy
// changes globally. Latest verifiable content touch in repo is the Android
// APK batch version `2026.09.06` (products 11-14).
const FALLBACK_DATE = new Date('2026-09-06');

// Per-static-page lastmod. Bump a single entry when that page's copy
// changes; until then entries honestly share FALLBACK_DATE.
const STATIC_LASTMOD: Record<string, string> = {
  '/': '2026-09-06',
  '/about': '2026-09-06',
  '/services': '2026-09-06',
  '/products': '2026-09-06',
  '/blog': '2026-09-06',
  '/contact': '2026-09-06',
  '/privacy': '2026-09-10',
};

// Shared lastmod for service detail pages until per-service `updated_at`
// fields are added to `src/data/services.ts`.
const SERVICE_LASTMOD = '2026-09-06';

// Optional going forward: `updated_at: string | null` on Product / Service /
// BlogPost. Read via a structural cast so this file compiles before the
// fields are added.
type WithUpdatedAt = { updated_at?: string | null };

// Parse + validate + clamp future dates to now. Invalid/empty -> fallback.
function toSafeDate(iso: string | null | undefined, fallback: Date = FALLBACK_DATE): Date {
  if (!iso) return fallback;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return fallback;
  return new Date(Math.min(t, Date.now()));
}

// Product `version` doubles as a date for dated releases: '2026.09.06' or
// '2026-09-06' -> Date. Marketing versions like '1.0.0' -> null.
function parseVersionDate(version: string | null): Date | null {
  if (!version) return null;
  const m = version.match(/^(\d{4})[.-](\d{2})[.-](\d{2})/);
  if (!m) return null;
  const t = new Date(`${m[1]}-${m[2]}-${m[3]}`).getTime();
  if (Number.isNaN(t)) return null;
  return new Date(Math.min(t, Date.now()));
}

// Preferred edit date when the field exists, else the caller-supplied
// content-derived fallback, else FALLBACK_DATE.
function contentDate(obj: unknown, extraFallback?: Date | null): Date {
  const updatedAt = (obj as WithUpdatedAt | null | undefined)?.updated_at;
  if (updatedAt) return toSafeDate(updatedAt);
  if (extraFallback) return extraFallback;
  return FALLBACK_DATE;
}

// Matches the canonical shape in lib/seo.ts: '/ar', not '/ar/' for home.
function localize(path: string, locale: string): string {
  return path === '/' ? `${SITE_URL}/${locale}` : `${SITE_URL}/${locale}${path}`;
}

function buildAlternates(path: string) {
  return {
    languages: {
      ar: localize(path, 'ar'),
      en: localize(path, 'en'),
      'x-default': localize(path, 'ar'),
    },
  };
}

function emitLocales(route: Route): MetadataRoute.Sitemap {
  return locales.map((locale) => ({
    url: localize(route.path, locale),
    lastModified: route.lastModified ?? FALLBACK_DATE,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
    alternates: buildAlternates(route.path),
  }));
}

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: Route[] = [
    { path: '/', priority: 1.0, changeFrequency: 'monthly', lastModified: toSafeDate(STATIC_LASTMOD['/']) },
    { path: '/about', priority: 0.7, changeFrequency: 'yearly', lastModified: toSafeDate(STATIC_LASTMOD['/about']) },
    { path: '/services', priority: 0.8, changeFrequency: 'monthly', lastModified: toSafeDate(STATIC_LASTMOD['/services']) },
    { path: '/products', priority: 0.9, changeFrequency: 'weekly', lastModified: toSafeDate(STATIC_LASTMOD['/products']) },
    { path: '/blog', priority: 0.9, changeFrequency: 'weekly', lastModified: toSafeDate(STATIC_LASTMOD['/blog']) },
    { path: '/contact', priority: 0.5, changeFrequency: 'yearly', lastModified: toSafeDate(STATIC_LASTMOD['/contact']) },
    { path: '/privacy', priority: 0.5, changeFrequency: 'yearly', lastModified: toSafeDate(STATIC_LASTMOD['/privacy']) },
  ];

  const productRoutes: Route[] = products
    .filter((p) => p.is_active)
    .map((p) => ({
      path: `/products/${p.slug}`,
      priority: 0.7,
      changeFrequency: 'monthly' as const,
      lastModified: contentDate(p, parseVersionDate(p.version)),
    }));

  const blogRoutes: Route[] = blogPosts
    .filter((b) => b.is_published)
    .map((b) => ({
      path: `/blog/${b.slug}`,
      priority: 0.6,
      changeFrequency: 'monthly' as const,
      lastModified: contentDate(b, toSafeDate(b.published_at)),
    }));

  const serviceRoutes: Route[] = services
    .filter((s) => s.is_active)
    .map((s) => ({
      path: `/services/${s.id}`,
      priority: 0.6,
      changeFrequency: 'monthly' as const,
      lastModified: contentDate(s, toSafeDate(SERVICE_LASTMOD)),
    }));

  const allRoutes: Route[] = [
    ...staticRoutes,
    ...productRoutes,
    ...blogRoutes,
    ...serviceRoutes,
  ];

  return allRoutes.flatMap((route) => emitLocales(route));
}
