'use client';

import Image from 'next/image';
import { useState, useRef } from 'react';
import Link from 'next/link';
import { Layers, Cpu, BookOpen, Newspaper, Megaphone, Globe, Smartphone, Lightbulb, Search, Eye, ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/lib/language-provider';
import { useSEOMeta } from '@/lib/use-seo';
import { motion, useInView } from 'framer-motion';
import { TextReveal } from '@/components/ui/TextReveal';
import { BreadcrumbSchema } from '@/components/SEO/StructuredData';
import { blogPosts, type BlogPost } from '@/src/data/blog';

function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }} transition={{ duration: 0.6, delay, ease: 'easeOut' }} className={className}>
      {children}
    </motion.div>
  );
}

const CATEGORIES = [
  { key: 'ALL', icon: Layers, labelAr: 'الكل', labelEn: 'All' },
  { key: 'TECHNOLOGY', icon: Cpu, labelAr: 'تقنية', labelEn: 'Technology' },
  { key: 'TUTORIALS', icon: BookOpen, labelAr: 'شروحات', labelEn: 'Tutorials' },
  { key: 'COMPANY_NEWS', icon: Newspaper, labelAr: 'أخبار', labelEn: 'News' },
  { key: 'DIGITAL_MARKETING', icon: Megaphone, labelAr: 'تسويق', labelEn: 'Marketing' },
  { key: 'WEB_DEVELOPMENT', icon: Globe, labelAr: 'ويب', labelEn: 'Web Dev' },
  { key: 'MOBILE_DEVELOPMENT', icon: Smartphone, labelAr: 'جوال', labelEn: 'Mobile' },
  { key: 'TIPS', icon: Lightbulb, labelAr: 'نصائح', labelEn: 'Tips' },
];

export default function BlogPage() {
  const { t, lang } = useLanguage();
  useSEOMeta('page', 'blog', lang);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const publishedPosts = blogPosts.filter((p) => p.is_published);

  const filteredPosts = publishedPosts.filter((p) => {
    const categoryOk = activeCategory === 'ALL' || p.category === activeCategory;
    const query = searchQuery.trim().toLowerCase();
    const searchOk =
      !query ||
      (p.title_ar.toLowerCase().includes(query) ||
        p.title_en.toLowerCase().includes(query) ||
        (p.excerpt_ar || '').toLowerCase().includes(query) ||
        (p.excerpt_en || '').toLowerCase().includes(query));
    return categoryOk && searchOk;
  });

  return (
    <div className="min-h-screen bg-[#030712] bg-grid-pattern text-white selection:bg-[var(--ff-primary-light)] selection:text-[#030712] relative overflow-hidden" style={{ fontFamily: "var(--ff-font-body)" }}>
      <BreadcrumbSchema items={[{ name: lang === 'ar' ? 'الرئيسية' : 'Home', url: 'https://fastfree.cloud/' }, { name: lang === 'ar' ? 'المدونة' : 'Blog', url: 'https://fastfree.cloud/blog' }]} />

      {/* Hero */}
      <section className="relative pt-36 pb-16 overflow-hidden text-center bg-[#030712]">
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <motion.div className="absolute -top-[10%] -left-[10%] w-[400px] h-[400px] rounded-full bg-gradient-to-r from-[var(--ff-accent)]/10 to-[var(--ff-primary)]/10 blur-[100px]" animate={{ x: [0, 30, 0], y: [0, -30, 0] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }} />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 z-10">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="inline-flex items-center gap-2 bg-[var(--ff-accent)]/10 border border-[var(--ff-accent)]/20 text-[var(--ff-accent)] px-5 py-2 rounded-full text-sm font-medium mb-8">
            <BookOpen size={16} />
            {t('BLOG_BADGE', 'مقالات تقنية', 'Technical Articles')}
          </motion.div>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold mb-6 flex justify-center" style={{ fontFamily: 'var(--ff-font-heading)' }}>
            <TextReveal text={t('BLOG_TITLE', 'المدونة التقنية', 'Tech Blog')} />
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg leading-relaxed mb-8">
            {t('BLOG_DESC', 'مقالات وشروحات تقنية متخصصة في الويب والتطبيقات وأحدث استراتيجيات التسويق الرقمي.', 'Technical articles and tutorials specialized in web, applications, and the latest digital marketing strategies.')}
          </p>
          {/* Search */}
          <div className="max-w-md mx-auto relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder={t('BLOG_SEARCH', 'ابحث عن مقال...', 'Search articles...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-[var(--ff-accent)] focus:ring-1 focus:ring-[var(--ff-accent)] transition-all placeholder:text-slate-400"
            />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-8 max-w-7xl mx-auto px-6">
        <div className="flex flex-wrap justify-center gap-3">
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => { setActiveCategory(cat.key); }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer ${isActive ? 'bg-[var(--ff-accent)] text-[#030712] shadow-lg shadow-[var(--ff-accent)]/20' : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'}`}
              >
                <cat.icon size={16} />
                {lang === 'ar' ? cat.labelAr : cat.labelEn}
              </button>
            );
          })}
        </div>
      </section>

      {/* Blog Grid */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        {filteredPosts.length === 0 ? (
          <div className="text-center py-20 text-slate-400">{t('BLOG_EMPTY', 'لا توجد مقالات حالياً.', 'No articles currently.')}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.map((post, i) => (
              <FadeIn key={post.id} delay={i * 0.08}>
                <div className="rounded-3xl bg-slate-900/40 border border-white/10 overflow-hidden hover:border-white/20 transition-all flex flex-col justify-between group shadow-2xl h-full">
                  <div>
                    <div className="h-52 overflow-hidden bg-slate-900 relative">
                      <Image src={post.cover_image || '/assets/og-default.svg'} alt={lang === 'ar' ? post.title_ar : post.title_en} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
                    </div>
                    <div className={`p-6 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                      {post.tags && post.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {post.tags.map((tag, idx) => (
                            <span key={idx} className="text-[11px] sm:text-xs font-bold text-[var(--ff-accent)] bg-[var(--ff-accent)]/10 px-2 py-0.5 rounded-full border border-[var(--ff-accent)]/15">{tag}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] sm:text-xs font-bold text-[var(--ff-accent)] bg-[var(--ff-accent)]/10 px-2 py-0.5 rounded-full border border-[var(--ff-accent)]/15 mb-3 inline-block">{post.category}</span>
                      )}
                      <h3 className="text-lg font-bold mb-3 leading-snug group-hover:text-[var(--ff-accent)] transition-colors">{lang === 'ar' ? post.title_ar : post.title_en}</h3>
                      <p className="text-slate-400 text-sm leading-relaxed line-clamp-3">{lang === 'ar' ? post.excerpt_ar : post.excerpt_en}</p>
                    </div>
                  </div>
                  <div className={`p-6 border-t border-white/5 flex items-center justify-between text-xs text-slate-400 ${lang === 'ar' ? '' : ''}`}>
                    <div className="flex items-center gap-4">
                      <span>{post.published_at ? new Date(post.published_at).toLocaleDateString('ar-EG') : ''}</span>
                      <span className="flex items-center gap-1"><Eye size={12} /> {post.views}</span>
                    </div>
                    <Link href={`/${lang}/blog/${post.slug}`} className="font-bold text-white hover:text-[var(--ff-accent)] flex items-center gap-1">
                      {t('BLOG_READ', 'اقرأ', 'Read')} <ArrowLeft size={12} className={lang === 'ar' ? '' : 'rotate-180'} />
                    </Link>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
