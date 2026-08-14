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

const STABLE_DATE = new Date('2026-01-01');

function buildAlternates(path: string) {
  return {
    languages: {
      ar: `${SITE_URL}/ar${path}`,
      en: `${SITE_URL}/en${path}`,
      'x-default': `${SITE_URL}/ar${path}`,
    },
  };
}

function emitLocales(route: Route): MetadataRoute.Sitemap {
  return locales.map((locale) => ({
    url: `${SITE_URL}/${locale}${route.path}`,
    lastModified: route.lastModified ?? STABLE_DATE,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
    alternates: buildAlternates(route.path),
  }));
}

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: Route[] = [
    { path: '/', priority: 1.0, changeFrequency: 'monthly' },
    { path: '/about', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/services', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/products', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/blog', priority: 0.8, changeFrequency: 'daily' },
    { path: '/contact', priority: 0.8, changeFrequency: 'yearly' },
  ];

  const productRoutes: Route[] = products
    .filter((p) => p.is_active)
    .map((p) => ({
      path: `/products/${p.slug}`,
      priority: 0.6,
      changeFrequency: 'monthly',
    }));

  const blogRoutes: Route[] = blogPosts
    .filter((b) => b.is_published)
    .map((b) => ({
      path: `/blog/${b.slug}`,
      priority: 0.6,
      changeFrequency: 'weekly',
      lastModified: b.published_at ? new Date(b.published_at) : STABLE_DATE,
    }));

  const serviceRoutes: Route[] = services
    .filter((s) => s.is_active)
    .map((s) => ({
      path: `/services/${s.id}`,
      priority: 0.6,
      changeFrequency: 'monthly',
    }));

  const allRoutes: Route[] = [
    ...staticRoutes,
    ...productRoutes,
    ...blogRoutes,
    ...serviceRoutes,
  ];

  return allRoutes.flatMap((route) => emitLocales(route));
}
