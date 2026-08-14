import { buildMetadata } from '@/lib/seo';
import type { Locale } from '@/lib/i18n';
import ProductsClient from './ProductsClient';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return buildMetadata({ lang: lang as Locale, type: 'page', id: 'products' });
}

export default function Page() {
  return <ProductsClient />;
}
