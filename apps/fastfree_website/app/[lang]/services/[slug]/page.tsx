import { notFound } from 'next/navigation';
import { buildMetadata } from '@/lib/seo';
import type { Locale } from '@/lib/i18n';
import ServiceClient from './ServiceClient';
import { services } from '@/src/data/services';

export const dynamicParams = false;

export async function generateStaticParams() {
  const langs: Locale[] = ['ar', 'en'];
  return services.flatMap((s) => langs.map((lang) => ({ lang, slug: s.id })));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { lang, slug } = await params;
  return buildMetadata({ lang: lang as Locale, type: 'page', id: `service-${slug}` });
}

export default async function Page({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { slug } = await params;
  if (!services.find((s) => String(s.id) === slug)) notFound();
  return <ServiceClient />;
}
