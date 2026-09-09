import type { Metadata } from 'next';
import { OG_IMAGE, SITE, SITE_URL, isValidOgImage, resolveSeo } from './seo-data';
import { localeOG, type Locale } from './i18n';

function toAbsoluteOg(url: string): string {
  return url.startsWith('http') ? url : `${SITE_URL}${url}`;
}

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
  // Only raster images are valid for og:image; SVG is rejected by Facebook/X.
  // Guard both the direct ogImage param and the resolved seo.ogImage fallback.
  const rawOg = opts.ogImage && isValidOgImage(opts.ogImage) ? opts.ogImage : seo.ogImage;
  const validOg = isValidOgImage(rawOg) ? rawOg : OG_IMAGE;
  const og = toAbsoluteOg(validOg);
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
      images: [{ url: og, width: 1200, height: 630, alt: seo.title, type: 'image/png' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.title,
      description: seo.description,
      images: [og],
    },
  };
}
