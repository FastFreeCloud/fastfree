import type { Metadata } from 'next';
import { SITE, SITE_URL, resolveSeo } from './seo-data';
import { localeOG, type Locale } from './i18n';

// Builds server-side Next.js Metadata with locale-prefixed canonical URLs
// and reciprocal hreflang alternates (required for bilingual indexing).
export function buildMetadata(opts: {
  lang: Locale;
  type: 'page' | 'post' | 'product';
  id: string;
  title?: string;
  ogImage?: string;
}): Metadata {
  const seo = resolveSeo(opts);
  const base = seo.path === '/' ? '' : seo.path; // '/about' or '/blog/slug'
  const og = opts.ogImage
    ? opts.ogImage.startsWith('http')
      ? opts.ogImage
      : `${SITE_URL}${opts.ogImage}`
    : seo.ogImage;
  const canonical = `${SITE_URL}/${opts.lang}${base}`;
  const languages: Record<string, string> = {
    ar: `${SITE_URL}/ar${base}`,
    en: `${SITE_URL}/en${base}`,
    'x-default': `${SITE_URL}/ar${base}`,
  };

  return {
    title: `${seo.title} | ${SITE}`,
    description: seo.description,
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: canonical,
      siteName: SITE,
      locale: localeOG(opts.lang),
      type: seo.ogType,
      images: [{ url: og }],
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.title,
      description: seo.description,
      images: [og],
    },
  };
}
