import { notFound } from 'next/navigation';
import { buildMetadata } from '@/lib/seo';
import type { Locale } from '@/lib/i18n';
import BlogPostClient from './BlogPostClient';
import { blogPosts } from '@/src/data/blog';

export const dynamicParams = false;

export async function generateStaticParams() {
  const langs: Locale[] = ['ar', 'en'];
  return blogPosts.flatMap((p) => langs.map((lang) => ({ lang, slug: p.slug })));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { lang, slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);
  return buildMetadata({ lang: lang as Locale, type: 'post', id: slug, ogImage: post?.cover_image ?? undefined });
}

export default async function Page({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { slug } = await params;
  if (!blogPosts.find((p) => p.slug === slug)) notFound();
  return <BlogPostClient />;
}
