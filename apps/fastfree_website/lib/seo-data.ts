// Server-safe SEO data and resolvers (NO 'use client' directive).
// Imported by both the server metadata helper (lib/seo.ts) and the
// client hook (lib/use-seo.ts) to avoid duplicating factual copy.
// NOTE: blogMeta is the client-safe slice (no content_ar/content_en).
// Server routes that need bodies should import from '@/src/data/blog'.
import { blogMeta } from '@/src/data/blog-meta';
import { products } from '@/src/data/products';
import { services } from '@/src/data/services';

export const SITE = 'FastFree';
export const SITE_URL = 'https://fastfree.cloud';
export const OG_IMAGE = '/assets/og-image.png';

// OG images must be raster (PNG/JPG/WebP) for Facebook/X; SVG is rejected.
export function isValidOgImage(url: string): boolean {
  return /\.(png|jpe?g|webp)(\?.*)?$/i.test(url);
}

export const PAGE_TITLES: Record<string, { ar: string; en: string }> = {
  home: { ar: 'الرئيسية', en: 'Home' },
  about: { ar: 'من نحن', en: 'About Us' },
  services: { ar: 'خدماتنا', en: 'Our Services' },
  products: { ar: 'منتجاتنا', en: 'Our Products' },
  blog: { ar: 'المدونة', en: 'Blog' },
  contact: { ar: 'تواصل معنا', en: 'Contact Us' },
};

export const PAGE_PATHS: Record<string, string> = {
  home: '/',
  about: '/about',
  services: '/services',
  products: '/products',
  blog: '/blog',
  contact: '/contact',
};

export type SeoEntry = { title: string; description: string };

// Concise, factual SEO copy keyed by page key (no hype, no fake stats).
// Descriptions are 140-160 chars for optimal meta display; factual, no fluff.
export const SEO_MAP: Record<string, { ar: SeoEntry; en: SeoEntry }> = {
  home: {
    ar: {
      title: 'FastFree — حلول برمجية للشركات',
      description:
        'FastFree تبني أنظمة CRM وERP ولوحات تحكم وتطبيقات ويب ثنائية اللغة (العربية والإنجليزية) بمنصة Low-Code ووحدات المحاسبة والمخزون والمبيعات مع دعم RTL.',
    },
    en: {
      title: 'FastFree — Business Software Solutions',
      description:
        'FastFree builds CRM, ERP, dashboards and bilingual web apps with Low-Code, covering accounting, inventory, sales and HR modules with RTL and dark mode support.',
    },
  },
  about: {
    ar: {
      title: 'من نحن — FastFree',
      description:
        'تعرف على FastFree وفريقها ونهجها في بناء حلول برمجية للشركات: منصة Low-Code وERP معياري يضم المحاسبة والمخزون والمبيعات والموارد البشرية وCRM بدعم RTL.',
    },
    en: {
      title: 'About Us — FastFree',
      description:
        'Learn about FastFree and our team: a Low-Code platform and modular ERP with accounting, inventory, sales, HR and CRM, bilingual Arabic RTL and 60 screens.',
    },
  },
  services: {
    ar: {
      title: 'خدماتنا — FastFree',
      description:
        'خدمات FastFree: منصة منخفضة الكود لبناء التطبيقات بسرعة، وأنظمة ERP معيارية تضم المحاسبة والمخزون والمبيعات، وتطوير مواقع وتطبيقات ويب ثنائية اللغة مع RTL.',
    },
    en: {
      title: 'Our Services — FastFree',
      description:
        'FastFree services: Low-Code platform for rapid apps, modular ERP with accounting, inventory, sales and HR, and bilingual web development with RTL support.',
    },
  },
  products: {
    ar: {
      title: 'منتجاتنا — FastFree',
      description:
        'استكشف منتجات FastFree: نظام محاسبة ودفتر أستاذ، ووحدات المبيعات والمشتريات والمخزون والموارد البشرية وCRM ونقطة بيع مع لوحات وتطبيقات أندرويد قابلة للتخصيص.',
    },
    en: {
      title: 'Our Products — FastFree',
      description:
        'Explore FastFree products: accounting, sales, purchasing, inventory, HR, CRM and POS with dashboards and Android apps — customizable for SMEs in Egypt.',
    },
  },
  blog: {
    ar: {
      title: 'المدونة — FastFree',
      description:
        'مقالات ونصائح تقنية من FastFree حول تطوير البرمجيات والأعمال الرقمية والويب.',
    },
    en: {
      title: 'Blog — FastFree',
      description:
        'Technical articles and tips from FastFree on software development, digital business, and the web.',
    },
  },
  contact: {
    ar: {
      title: 'تواصل معنا — FastFree',
      description:
        'تواصل مع فريق FastFree لمناقشة مشروعك البرمجي أو طلب عرض أسعار: نوضح الوحدات المناسبة من ERP أو Low-Code ونجيب خلال يوم عمل بلغتك المفضلة عربية أو إنجليزية.',
    },
    en: {
      title: 'Contact Us — FastFree',
      description:
        'Contact FastFree to discuss your project or request a quote: we pinpoint the right ERP or Low-Code modules and reply within a business day in Arabic or English.',
    },
  },
};

export const DEFAULT_DESCRIPTION: Record<'ar' | 'en', string> = {
  ar: 'FastFree تبني حلولاً برمجية للشركات: منصة Low-Code وأنظمة CRM وERP تضم المحاسبة والمخزون والمبيعات والموارد البشرية وCRM وتطبيقات ويب ثنائية اللغة بدعم RTL.',
  en: 'FastFree builds business software: Low-Code platform with CRM, ERP, accounting, inventory, sales, HR and bilingual web apps with RTL and dark-mode support.',
};

export type ResolvedSeo = {
  title: string;
  description: string;
  path: string; // base path WITHOUT locale, e.g. '/about', '/blog/slug', '/'
  ogType: 'website' | 'article';
  ogImage: string;
};

export function resolvePath(type: 'page' | 'post' | 'product', id: string): string {
  if (type === 'page') {
    if (id.startsWith('service-')) {
      const sid = id.replace('service-', '');
      return `/services/${sid}`;
    }
    return PAGE_PATHS[id] ?? '/';
  }
  if (type === 'post') return `/blog/${id}`;
  if (type === 'product') return `/products/${id}`;
  return '/';
}

export function resolveDescription(
  type: 'page' | 'post' | 'product',
  id: string,
  lang: 'ar' | 'en',
  title?: string,
): string {
  if (type === 'page') {
    if (SEO_MAP[id]) return SEO_MAP[id][lang].description;
    if (id.startsWith('service-')) {
      const sid = id.replace('service-', '');
      const svc = services.find((s) => s.id === sid);
      if (svc) return lang === 'ar' ? svc.description_ar : svc.description_en;
    }
    return DEFAULT_DESCRIPTION[lang];
  }
  if (type === 'post') {
    const post = blogMeta.find((b) => b.slug === id);
    if (post) {
      const ex = lang === 'ar' ? post.excerpt_ar : post.excerpt_en;
      if (ex) return ex;
    }
    return title ?? DEFAULT_DESCRIPTION[lang];
  }
  if (type === 'product') {
    const prod = products.find((p) => p.slug === id);
    if (prod) {
      const d = lang === 'ar' ? prod.short_description_ar : prod.short_description_en;
      if (d) return d;
    }
    return title ?? DEFAULT_DESCRIPTION[lang];
  }
  return DEFAULT_DESCRIPTION[lang];
}

export function resolveTitle(
  type: 'page' | 'post' | 'product',
  id: string,
  lang: 'ar' | 'en',
  overrideTitle?: string,
): string {
  // Returns the bare label; the Next.js title template ('%s | FastFree')
  // and the client hook each append the site name.
  if (overrideTitle) return overrideTitle;
  if (type === 'page' && PAGE_TITLES[id]) {
    return lang === 'ar' ? PAGE_TITLES[id].ar : PAGE_TITLES[id].en;
  }
  if (type === 'post') {
    const post = blogMeta.find((b) => b.slug === id);
    if (post) return lang === 'ar' ? post.title_ar : post.title_en;
  }
  if (type === 'product') {
    const prod = products.find((p) => p.slug === id);
    if (prod) return lang === 'ar' ? prod.name_ar : prod.name_en;
  }
  if (id.startsWith('service-')) {
    const sid = id.replace('service-', '');
    const svc = services.find((s) => s.id === sid);
    if (svc) return lang === 'ar' ? svc.title_ar : svc.title_en;
  }
  return SITE;
}

export function resolveSeo(opts: {
  type: 'page' | 'post' | 'product';
  id: string;
  lang: 'ar' | 'en';
  title?: string;
  ogImage?: string;
}): ResolvedSeo {
  const path = resolvePath(opts.type, opts.id);
  const description = resolveDescription(opts.type, opts.id, opts.lang, opts.title);
  const title = resolveTitle(opts.type, opts.id, opts.lang, opts.title);
  const ogType = opts.type === 'post' ? 'article' : 'website';
  const ogImage = opts.ogImage && isValidOgImage(opts.ogImage) ? opts.ogImage : OG_IMAGE;
  return { title, description, path, ogType, ogImage };
}
