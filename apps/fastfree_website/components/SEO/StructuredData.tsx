import { siteConfig } from '@/src/data/siteConfig';

interface OrganizationSchemaProps {
  name?: string;
  url?: string;
  logo?: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export default function OrganizationSchema({
  name = 'FastFree',
  url = 'https://fastfree.cloud',
  logo = 'https://fastfree.cloud/fastfree_logo.png',
  description = 'FastFree تقدم حلولاً برمجية متكاملة: أنظمة CRM، تطبيقات ويب، لوحات تحكم، وأنظمة إدارة محتوى بأحدث التقنيات.',
  phone = '+201091999937',
  email = 'sales@fastfree.cloud',
  address = 'القاهرة، جمهورية مصر العربية',
}: OrganizationSchemaProps) {
  // Canonical social URLs — using canonical literals, keeping GitHub from config.
  const sameAs = [
    'https://www.facebook.com/share/1DHAKK2ek1/',
    'https://www.linkedin.com/company/fastfree-cloud/',
    siteConfig.socialLinks.github,
  ].filter((link): link is string => Boolean(link));
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    url,
    logo,
    description,
    telephone: phone,
    email,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'القاهرة',
      addressCountry: 'EG',
      streetAddress: address,
    },
    sameAs,
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+201091999937',
      contactType: 'customer service',
      areaServed: ['EG', 'SA'],
      availableLanguage: ['Arabic', 'English'],
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface WebSiteSchemaProps {
  name?: string;
  url?: string;
}

export function WebSiteSchema({
  name = 'FastFree',
  url = 'https://fastfree.cloud',
}: WebSiteSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name,
    url,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface BreadcrumbSchemaProps {
  items: Array<{ name: string; url: string }>;
}

export function BreadcrumbSchema({ items }: BreadcrumbSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface ProductSchemaProps {
  name: string;
  description: string;
  image?: string;
  url?: string;
  brand?: string;
}

export function ProductSchema({
  name,
  description,
  image,
  url,
  brand = 'FastFree',
}: ProductSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    image,
    url,
    brand: {
      '@type': 'Brand',
      name: brand,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface ArticleSchemaProps {
  title: string;
  description: string;
  image?: string;
  url?: string;
  datePublished?: string;
  dateModified?: string;
  author?: string;
}

export function ArticleSchema({
  title,
  description,
  image,
  url,
  datePublished,
  dateModified,
  author = 'FastFree',
}: ArticleSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    image,
    url,
    datePublished,
    dateModified: dateModified || datePublished,
    author: {
      '@type': 'Organization',
      name: author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'FastFree',
      logo: {
        '@type': 'ImageObject',
        url: 'https://fastfree.cloud/fastfree_logo.png',
      },
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface FAQSchemaProps {
  items: Array<{ question: string; answer: string }>;
}

export function FAQSchema({ items }: FAQSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
