'use client';

import Image from 'next/image';
import { useState } from 'react';
import Link from 'next/link';
import { Smartphone, Globe, Monitor, Package, Tags, Github, ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/lib/language-provider';
import { useSEOMeta } from '@/lib/use-seo';
import { motion, AnimatePresence } from 'framer-motion';
import { TextReveal } from '@/components/ui/TextReveal';
import { products as allProducts, type Product } from '@/src/data/products';
import { BreadcrumbSchema } from '@/components/SEO/StructuredData';
import { tags as allTagsData, type Tag } from '@/src/data/tags';

export default function ProductsPage() {
  const { t, lang } = useLanguage();
  useSEOMeta('page', 'products', lang);
  const [activeType, setActiveType] = useState('ALL');
  const [activeTagId, setActiveTagId] = useState('ALL');

  const allTags: Tag[] = allTagsData;

  const totalProducts = allProducts.length;
  const appCount = allProducts.filter((p) => p.type === 'APP').length;
  const websiteCount = allProducts.filter((p) => p.type === 'WEBSITE').length;
  const programCount = allProducts.filter((p) => p.type === 'PROGRAM').length;

  const TYPE_CONFIG: Record<string, { label: string; icon: any }> = {
    APP: { label: t('PRODUCT_TYPE_APP', 'تطبيق هاتف', 'Mobile App'), icon: Smartphone },
    WEBSITE: { label: t('PRODUCT_TYPE_WEBSITE', 'موقع ويب', 'Website'), icon: Globe },
    PROGRAM: { label: t('PRODUCT_TYPE_PROGRAM', 'برنامج سطح مكتب', 'Desktop Program'), icon: Monitor },
  };

  const filteredProducts = allProducts.filter((p) => {
    if (!p.is_active) return false;
    const typeOk = activeType === 'ALL' || p.type === activeType;
    const tagOk =
      activeTagId === 'ALL' ||
      (() => {
        const tag = allTags.find((tg) => tg.id === activeTagId);
        if (!tag) return true;
        const needle = (tag.title_en || '').toLowerCase();
        return p.tags.some((pt) => {
          const hay = pt.toLowerCase();
          return hay.includes(needle) || needle.includes(hay);
        });
      })();
    return typeOk && tagOk;
  });

  return (
    <div className="min-h-screen bg-[#030712] bg-grid-pattern text-white selection:bg-[var(--ff-primary-light)] selection:text-[#030712] relative overflow-hidden" style={{ fontFamily: "var(--ff-font-body)" }}>
      <BreadcrumbSchema items={[{ name: lang === 'ar' ? 'الرئيسية' : 'Home', url: 'https://fastfree.cloud/' }, { name: lang === 'ar' ? 'منتجاتنا' : 'Products', url: 'https://fastfree.cloud/products' }]} />

      {/* Hero */}
      <section className="relative pt-36 pb-16 overflow-hidden text-center bg-[#030712]">
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <motion.div className="absolute -top-[10%] -left-[10%] w-[400px] h-[400px] rounded-full bg-gradient-to-r from-[var(--ff-accent)]/10 to-[var(--ff-primary)]/10 blur-[100px]" animate={{ x: [0, 30, 0], y: [0, -30, 0] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }} />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 z-10">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="inline-flex items-center gap-2 bg-[var(--ff-accent)]/10 border border-[var(--ff-accent)]/20 text-[var(--ff-accent)] px-5 py-2 rounded-full text-sm font-medium mb-8">
            <Package size={16} />
            {t('PRODUCTS_BADGE', `${totalProducts} منتجات رقمية`, `${totalProducts} Digital Products`)}
          </motion.div>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold mb-6 flex justify-center" style={{ fontFamily: 'var(--ff-font-heading)' }}>
            <TextReveal text={t('PRODUCTS_PAGE_TITLE', 'منتجاتنا الرقمية', 'Our Digital Products')} />
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg leading-relaxed">
            {t('PRODUCTS_PAGE_DESC', 'تطبيقات هاتف، مواقع ويب، وبرامج سطح مكتب — حلول رقمية متكاملة تلبي احتياجاتك.', 'Mobile apps, websites, and desktop programs — integrated digital solutions that meet your needs.')}
          </p>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="py-8 border-y border-white/5 bg-[#080c16]">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          {[
            { icon: Smartphone, value: String(appCount), label: t('APPS', 'تطبيقات', 'Apps') },
            { icon: Globe, value: String(websiteCount), label: t('WEBSITES', 'مواقع', 'Websites') },
            { icon: Monitor, value: String(programCount), label: t('PROGRAMS', 'برامج', 'Programs') },
          ].map((stat, i) => (
            <div key={i} className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--ff-accent)]/10 text-[var(--ff-accent)] flex items-center justify-center">
                <stat.icon size={20} />
              </div>
              <div className="text-right">
                <div className="text-xl font-bold">{stat.value}</div>
                <div className="text-xs text-slate-400">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Filters */}
      <section className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-wrap gap-3 justify-center mb-4">
          <button onClick={() => { setActiveType('ALL'); setActiveTagId('ALL'); }} className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${activeType === 'ALL' ? 'bg-[var(--ff-accent)] text-[#030712] shadow-lg shadow-[var(--ff-accent)]/20' : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'}`}>
            {t('PRODUCT_ALL', 'الكل', 'All')}
          </button>
          {Object.entries(TYPE_CONFIG).map(([key, config]) => (
            <button key={key} onClick={() => { setActiveType(key); setActiveTagId('ALL'); }} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${activeType === key ? 'bg-[var(--ff-accent)] text-[#030712] shadow-lg shadow-[var(--ff-accent)]/20' : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'}`}>
              <config.icon size={14} /> {config.label}
            </button>
          ))}
        </div>
        {activeType !== 'ALL' && (
          <div className="flex flex-wrap gap-2 justify-center">
            {allTags.map((tag) => (
              <button key={tag.id} onClick={() => { setActiveTagId(activeTagId === tag.id ? 'ALL' : tag.id); }} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${activeTagId === tag.id ? 'bg-[var(--ff-accent)]/15 border border-[var(--ff-accent)]/40 text-[var(--ff-accent)]' : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'}`}>
                <Tags size={11} /> {lang === 'ar' ? tag.title_ar : tag.title_en}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Products Grid */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 text-slate-400">{t('PRODUCTS_EMPTY', 'لا توجد منتجات في هذا التصنيف حالياً.', 'No products in this category currently.')}</div>
        ) : (
          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence mode="popLayout">
              {filteredProducts.map((product) => {
                const config = TYPE_CONFIG[product.type] || TYPE_CONFIG.APP;
                const TypeIcon = config.icon;
                return (
                  <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.3 }} key={product.id} className="rounded-3xl bg-slate-900/40 border border-white/10 overflow-hidden group shadow-2xl hover:border-white/20 transition-all hover:scale-[1.01] flex flex-col justify-between">
                    <div>
                      <div className="h-56 relative overflow-hidden bg-slate-900">
                        {product.thumbnail ? (
                          product.type === 'APP' ? (
                            <div className="flex items-center justify-center h-full bg-gradient-to-b from-slate-900 to-slate-800">
                              <div className="relative w-[120px]">
                                <div className="rounded-[1.5rem] border-[2px] border-slate-600 bg-slate-800 p-1 shadow-lg">
                                  <div className="absolute -top-0 left-1/2 -translate-x-1/2 w-12 h-2.5 bg-slate-800 rounded-b-lg z-10" />
                                  <div className="rounded-[1.3rem] overflow-hidden bg-black aspect-[9/19] relative">
                                    <Image src={product.thumbnail || '/assets/og-default.svg'} alt={lang === 'ar' ? product.name_ar : product.name_en} fill className="object-cover" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
                                  </div>
                                  <div className="absolute -bottom-0 left-1/2 -translate-x-1/2 w-10 h-0.5 rounded-full bg-slate-600" />
                                </div>
                              </div>
                            </div>
                          ) : product.type === 'WEBSITE' ? (
                            <div className="w-full h-full overflow-hidden relative">
                              <Image src={product.thumbnail || '/assets/og-default.svg'} alt={lang === 'ar' ? product.name_ar : product.name_en} width={400} height={800} className="w-full object-cover transition-transform duration-[4000ms] group-hover:-translate-y-[55%]" style={{ height: '200%' }} sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
                            </div>
                          ) : (
                            <div className="w-full h-full relative">
                              <Image src={product.thumbnail || '/assets/og-default.svg'} alt={lang === 'ar' ? product.name_ar : product.name_en} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
                            </div>
                          )
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400"><TypeIcon size={48} /></div>
                        )}
                        <div className="absolute top-4 right-4 bg-[#030712]/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-[var(--ff-accent)] border border-white/10 flex items-center gap-1.5">
                          <TypeIcon size={12} /> {config.label}
                        </div>
                        {product.version && <span className="absolute top-4 left-4 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold bg-white/10 backdrop-blur-sm text-slate-300 border border-white/10">v{product.version}</span>}
                      </div>
                      <div className={`p-6 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                        <h3 className="text-lg font-bold mb-2 group-hover:text-[var(--ff-accent)] transition-colors">{lang === 'ar' ? product.name_ar : product.name_en}</h3>
                        <p className="text-slate-400 text-sm mb-4 leading-relaxed line-clamp-2">{lang === 'ar' ? (product.short_description_ar || product.description_ar) : (product.short_description_en || product.description_en)}</p>
                        {product.tags && product.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {product.tags.map((pt, idx) => (
                              <span key={idx} className="px-2 py-0.5 rounded-md text-[11px] sm:text-xs font-bold bg-white/5 border border-white/10 text-slate-400">{pt}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="px-6 pb-6">
                      <div className="flex flex-wrap gap-2 mb-4">
                        {product.google_play_link && (
                          <a href={product.google_play_link} target="_blank" rel="noopener noreferrer" className="transition hover:scale-105">
                            <Image src="/assets/Google_play_button.png" alt="Google Play" width={110} height={32} className="h-8 w-auto" sizes="(max-width: 768px) 100vw, 200px" />
                          </a>
                        )}
                        {product.apple_store_link && (
                          <a href={product.apple_store_link} target="_blank" rel="noopener noreferrer" className="transition hover:scale-105">
                            <Image src="/assets/apple_store_button.png" alt="App Store" width={110} height={32} className="h-8 w-auto" sizes="(max-width: 768px) 100vw, 200px" />
                          </a>
                        )}
                        {product.github_link && (
                          <a href={product.github_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition">
                            <Github size={12} /> GitHub
                          </a>
                        )}
                      </div>
                      <Link href={`/${lang}/products/${product.slug}`} className="text-sm font-bold text-white flex items-center gap-2 group-hover:text-[var(--ff-accent)] transition-colors">
                        {t('PRODUCT_DETAILS', 'تفاصيل المنتج', 'Product Details')} <ArrowLeft size={14} className={lang === 'ar' ? '' : 'rotate-180'} />
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </section>
    </div>
  );
}
