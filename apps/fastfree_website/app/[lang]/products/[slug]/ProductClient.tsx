'use client';

import Image from 'next/image';
import { useState } from 'react';
import Link from 'next/link';
import { Smartphone, Globe, Monitor, Github, ShoppingCart, ExternalLink, Video } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useLanguage } from '@/lib/language-provider';
import { useSEOMeta } from '@/lib/use-seo';
import { motion } from 'framer-motion';
import { TextReveal } from '@/components/ui/TextReveal';
import { products as allProducts, type Product } from '@/src/data/products';
import { notFound, useParams } from 'next/navigation';
import { ProductSchema, BreadcrumbSchema } from '@/components/SEO/StructuredData';

function MarkdownContent({ content, dir }: { content: string; dir: 'rtl' | 'ltr' }) {
  return (
    <div className="prose prose-invert max-w-none" dir={dir}>
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t, lang, dir } = useLanguage();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const product: Product | null = allProducts.find((p) => p.slug === slug) || null;
  useSEOMeta('product', slug, lang, product ? (lang === 'ar' ? product.name_ar : product.name_en) : undefined);

  if (!product) {
    notFound();
  }

  const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
    APP: { label: t('PRODUCT_TYPE_APP', 'تطبيق هاتف', 'Mobile App'), icon: Smartphone, color: '#10b981' },
    WEBSITE: { label: t('PRODUCT_TYPE_WEBSITE', 'موقع ويب', 'Website'), icon: Globe, color: '#3b82f6' },
    PROGRAM: { label: t('PRODUCT_TYPE_PROGRAM', 'برنامج سطح مكتب', 'Desktop Program'), icon: Monitor, color: '#8b5cf6' },
  };

  const config = TYPE_CONFIG[product.type] || TYPE_CONFIG.APP;
  const TypeIcon = config.icon;

  const suggestedProducts = allProducts
    .filter((p) => p.is_active && p.type === product.type && p.slug !== product.slug)
    .slice(0, 3);

  const allImages: string[] = [];
  if (product.thumbnail) allImages.push(product.thumbnail);
  if (product.images && Array.isArray(product.images)) {
    product.images.forEach((img: string) => { if (!allImages.includes(img)) allImages.push(img); });
  }
  const displayImage = selectedImage || product.thumbnail || (allImages.length > 0 ? allImages[0] : null);

  return (
    <div className="min-h-screen bg-[#030712] bg-grid-pattern text-white selection:bg-[var(--ff-primary-light)] selection:text-[#030712] relative overflow-hidden" style={{ fontFamily: "var(--ff-font-body)" }}>
      <ProductSchema
        name={lang === 'ar' ? product.name_ar : product.name_en}
        description={lang === 'ar' ? (product.short_description_ar || product.description_ar || '') : (product.short_description_en || product.description_en || '')}
        image={displayImage || undefined}
        url={`https://fastfree.cloud/products/${product.slug}`}
        brand="FastFree"
      />
      <BreadcrumbSchema items={[
        { name: lang === 'ar' ? 'الرئيسية' : 'Home', url: 'https://fastfree.cloud/' },
        { name: lang === 'ar' ? 'منتجاتنا' : 'Products', url: 'https://fastfree.cloud/products' },
        { name: lang === 'ar' ? product.name_ar : product.name_en, url: `https://fastfree.cloud/products/${product.slug}` },
      ]} />

      <section className="relative pt-36 pb-20 overflow-hidden text-center bg-[#030712]">
        {/* Dynamic Nebula Glowing Orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <motion.div
            className="absolute -top-[10%] -left-[10%] w-[450px] h-[450px] rounded-full bg-gradient-to-r from-[var(--ff-accent)]/15 to-[var(--ff-primary)]/10 blur-[110px]"
            animate={{
              x: [0, 40, 0],
              y: [0, -40, 0],
              scale: [1, 1.08, 1],
            }}
            transition={{
              duration: 14,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 z-10">
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="text-xs font-bold text-[var(--ff-accent)] bg-[var(--ff-accent)]/10 px-3 py-1 rounded-full border border-[var(--ff-accent)]/20 inline-flex items-center gap-1">
              <TypeIcon size={12} /> {config.label}
            </span>
            {product.version && (
              <span className="text-xs text-slate-400 bg-white/5 px-3 py-1 rounded-full border border-white/10">v{product.version}</span>
            )}
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 flex justify-center" style={{ fontFamily: 'var(--ff-font-heading)' }}>
            <TextReveal text={lang === 'ar' ? product.name_ar : product.name_en} />
          </h1>
          <p className="text-slate-400 max-w-xl mx-auto text-lg leading-relaxed">{lang === 'ar' ? product.short_description_ar : product.short_description_en}</p>
        </div>
      </section>

      <section className={`py-16 max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-12 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
        <div className="lg:col-span-1 space-y-8 order-last lg:order-first">
          <div className="p-8 rounded-3xl bg-white/5 border border-white/10 shadow-2xl space-y-6">
            <h3 className="text-xl font-bold border-b border-white/5 pb-4 mb-4">{t('PRODUCT_INFO', 'معلومات المنتج', 'Product Information')}</h3>
            <div>
              <span className="text-xs text-slate-400 block mb-1">{t('PRODUCT_TYPE', 'النوع', 'Type')}</span>
              <span className="text-white font-bold text-sm flex items-center gap-2"><TypeIcon size={16} /> {config.label}</span>
            </div>

            {product.version && <div><span className="text-xs text-slate-400 block mb-1">{t('PRODUCT_VERSION', 'الإصدار', 'Version')}</span><span className="text-white font-bold text-sm">{product.version}</span></div>}

            <div className="flex flex-col gap-3">
              {product.google_play_link && (
                <a href={product.google_play_link} target="_blank" rel="noopener noreferrer" className="transition hover:scale-105">
                  <Image src="/assets/Google_play_button.png" alt="Google Play" width={165} height={48} className="h-12 w-auto" sizes="(max-width: 768px) 100vw, 200px" />
                </a>
              )}
              {product.apple_store_link && (
                <a href={product.apple_store_link} target="_blank" rel="noopener noreferrer" className="transition hover:scale-105">
                  <Image src="/assets/apple_store_button.png" alt="App Store" width={165} height={48} className="h-12 w-auto" sizes="(max-width: 768px) 100vw, 200px" />
                </a>
              )}
              {product.github_link && (
                <a href={product.github_link} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold hover:bg-white/10 transition">
                  <Github size={16} /> GitHub
                </a>
              )}
            </div>

            {/* Request Product Button */}
            <div>
              <Link
                href={`/${lang}/contact?service=${encodeURIComponent(lang === 'ar' ? `طلب منتج ${product.name_ar}` : `Request Product: ${product.name_en}`)}`}
                className="w-full py-3 text-center block text-white font-bold rounded-xl border border-[var(--ff-accent)] hover:bg-[var(--ff-accent)]/10 transition-all"
              >
                <ShoppingCart size={16} className="inline ml-2" />
                {t('PRODUCT_REQUEST', 'طلب المنتج', 'Request Product')}
              </Link>
            </div>

            {product.link && (
              <div>
                <a href={product.link} target="_blank" rel="noopener noreferrer" className="w-full py-4 text-center block text-[#070b19] font-bold rounded-xl shadow-lg transition-all hover:scale-105" style={{ background: 'var(--ff-gradient)' }}>
                  <ExternalLink size={16} className="inline ml-2" /> {t('PRODUCT_VISIT_SITE', 'زيارة الموقع', 'Visit Site')}
                </a>
              </div>
            )}

            {product.demo_video_url && (
              <a href={product.demo_video_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold hover:bg-red-500/20 transition">
                <Video size={16} /> {t('PRODUCT_DEMO_VIDEO', 'فيديو توضيحي', 'Demo Video')}
              </a>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
          {displayImage && (
            <div className={`${product.type === 'APP' ? 'flex justify-center' : ''}`}>
              {product.type === 'APP' ? (
                <div className="relative w-full max-w-[300px] sm:w-[300px]">
                  <div className="rounded-[3rem] border-[3px] border-slate-600 bg-slate-800 p-2 shadow-2xl shadow-blue-500/10">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-slate-800 rounded-b-2xl z-10 flex items-center justify-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-slate-600" />
                      <div className="w-12 h-1.5 rounded-full bg-slate-600" />
                    </div>
                    <div className="rounded-[2.3rem] overflow-hidden bg-black aspect-[9/19] relative">
                      <Image src={displayImage || '/assets/og-default.svg'} alt={lang === 'ar' ? product.name_ar : product.name_en} fill className="object-cover" sizes="100vw" />
                    </div>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-24 h-1 rounded-full bg-slate-600" />
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-white/10 overflow-hidden bg-slate-900 shadow-2xl relative aspect-video w-full max-h-[500px]">
                  <Image src={displayImage || '/assets/og-default.svg'} alt={lang === 'ar' ? product.name_ar : product.name_en} fill className="object-cover" sizes="100vw" />
                </div>
              )}
            </div>
          )}

          {allImages.length > 1 && (
            <div>
              <div className="flex gap-3 overflow-x-auto pb-2" dir="ltr">
                {allImages.map((img, idx) => (
                     <button
                    key={idx}
                    onClick={() => setSelectedImage(img)}
                    aria-label={`${lang === 'ar' ? product.name_ar : product.name_en} ${t('PRODUCT_IMAGE', 'صورة', 'image')} ${idx + 1}`}
                    className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all relative ${displayImage === img ? 'border-[var(--ff-accent)] ring-1 ring-[var(--ff-accent)] scale-110' : 'border-white/10 opacity-70 hover:opacity-100'}`}
                  >
                    <Image src={img || '/assets/og-default.svg'} alt={`${lang === 'ar' ? product.name_ar : product.name_en} ${idx + 1}`} fill className="object-cover" sizes="(max-width: 768px) 100vw, 200px" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {product.gif_image && (
            <div className="rounded-3xl border border-white/10 overflow-hidden shadow-2xl relative aspect-video w-full">
              <Image src={product.gif_image || '/assets/og-default.svg'} alt={`${lang === 'ar' ? product.name_ar : product.name_en} demo`} fill className="object-cover" sizes="100vw" />
            </div>
          )}

          <div className="p-8 md:p-12 rounded-3xl bg-white/5 border border-white/10 shadow-2xl">
            <h2 className="text-2xl font-bold mb-6 border-b border-white/5 pb-4">{t('PRODUCT_ABOUT', 'عن المنتج', 'About the Product')}</h2>
            <div className="text-slate-300 leading-relaxed text-lg whitespace-pre-line space-y-4">
              {lang === 'ar' ? product.description_ar : product.description_en}
            </div>
          </div>

          {(lang === 'ar' ? product.content_ar : product.content_en) && (
            <div className="p-8 md:p-12 rounded-3xl bg-white/5 border border-white/10 shadow-2xl">
              <MarkdownContent content={lang === 'ar' ? product.content_ar! : product.content_en!} dir={dir} />
            </div>
          )}

          {/* Suggested Products */}
          {suggestedProducts.length > 0 && (
            <div className="p-8 md:p-12 rounded-3xl bg-white/5 border border-white/10 shadow-2xl">
              <h2 className="text-2xl font-bold mb-6 border-b border-white/5 pb-4">
                {t('PRODUCT_SUGGESTED', 'منتجات مقترحة', 'Suggested Products')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {suggestedProducts.slice(0, 3).map((sp) => (
                  <Link key={sp.id} href={`/${lang}/products/${sp.slug}`} className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all hover:scale-105 text-center group">
                    {sp.thumbnail && (
                      <div className="w-full h-24 relative overflow-hidden rounded-xl mb-3">
                        <Image src={sp.thumbnail || '/assets/og-default.svg'} alt={lang === 'ar' ? sp.name_ar : sp.name_en} fill className="object-cover" sizes="(max-width: 768px) 100vw, 200px" />
                      </div>
                    )}
                    <h3 className="text-sm font-bold text-white group-hover:text-[var(--ff-accent)] transition-colors">
                      {lang === 'ar' ? sp.name_ar : sp.name_en}
                    </h3>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
