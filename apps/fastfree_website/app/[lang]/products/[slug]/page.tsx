import { notFound } from 'next/navigation';
import { buildMetadata } from '@/lib/seo';
import type { Locale } from '@/lib/i18n';
import ProductClient from './ProductClient';
import { products } from '@/src/data/products';

export const dynamicParams = false;

export async function generateStaticParams() {
  const langs: Locale[] = ['ar', 'en'];
  return products.flatMap((p) => langs.map((lang) => ({ lang, slug: p.slug })));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { lang, slug } = await params;
  const product = products.find((p) => p.slug === slug);
  return buildMetadata({ lang: lang as Locale, type: 'product', id: slug, ogImage: product?.cover_image ?? undefined });
}

export default async function Page({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { slug } = await params;
  if (!products.find((p) => p.slug === slug)) notFound();
  return <ProductClient />;
}
