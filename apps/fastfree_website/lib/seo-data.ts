// Server-safe SEO data and resolvers (NO 'use client' directive).
// Imported by both the server metadata helper (lib/seo.ts) and the
// client hook (lib/use-seo.ts) to avoid duplicating factual copy.
import { blogPosts } from '@/src/data/blog';
import { products } from '@/src/data/products';
import { services } from '@/src/data/services';

export const SITE = 'FastFree';
export const SITE_URL = 'https://fastfree.cloud';
export const OG_IMAGE = '/assets/og-default.svg';

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
export const SEO_MAP: Record<string, { ar: SeoEntry; en: SeoEntry }> = {
  home: {
    ar: {
      title: 'FastFree — حلول برمجية للشركات',
      description:
        'FastFree تبني أنظمة CRM وERP ولوحات تحكم وتطبيقات ويب ثنائية اللغة العربية والإنجليزية بأحدث التقنيات.',
    },
    en: {
      title: 'FastFree — Business Software Solutions',
      description:
        'FastFree builds CRM, ERP, dashboards, and bilingual web applications using modern technologies.',
    },
  },
  about: {
    ar: {
      title: 'من نحن — FastFree',
      description:
        'تعرف على FastFree وفريقها وما تبنيه من حلول برمجية للشركات والمؤسسات.',
    },
    en: {
      title: 'About Us — FastFree',
      description:
        'Learn about FastFree, our team, and the business software we build for companies and organizations.',
    },
  },
  services: {
    ar: {
      title: 'خدماتنا — FastFree',
      description:
        'منصّة منخفضة الكود، وأنظمة ERP معيارية، وتطوير تطبيقات ويب ثنائية اللغة من FastFree.',
    },
    en: {
      title: 'Our Services — FastFree',
      description:
        'Low-code platform, modular ERP suites, and bilingual web application development by FastFree.',
    },
  },
  products: {
    ar: {
      title: 'منتجاتنا — FastFree',
      description:
        'استكشف منتجات FastFree: أنظمة محاسبة ولوحات تحكم وتطبيقات أعمال جاهزة وقابلة للتخصيص.',
    },
    en: {
      title: 'Our Products — FastFree',
      description:
        'Explore FastFree products: accounting systems, dashboards, and ready-to-customize business applications.',
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
      description: 'تواصل مع فريق FastFree لمناقشة مشروعك البرمجي أو لطلب عرض أسعار.',
    },
    en: {
      title: 'Contact Us — FastFree',
      description:
        'Get in touch with the FastFree team to discuss your software project or request a quote.',
    },
  },
};

export const DEFAULT_DESCRIPTION: Record<'ar' | 'en', string> = {
  ar: 'FastFree تبني حلولاً برمجية للشركات: CRM وERP ولوحات تحكم وتطبيقات ويب ثنائية اللغة.',
  en: 'FastFree builds business software: CRM, ERP, dashboards, and bilingual web apps.',
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
    const post = blogPosts.find((b) => b.slug === id);
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
    const post = blogPosts.find((b) => b.slug === id);
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
  const ogImage = opts.ogImage ?? OG_IMAGE;
  return { title, description, path, ogType, ogImage };
}
