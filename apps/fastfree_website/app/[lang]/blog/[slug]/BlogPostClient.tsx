'use client';

import Image from 'next/image';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/lib/language-provider';
import { useSEOMeta } from '@/lib/use-seo';
import { motion } from 'framer-motion';
import { TextReveal } from '@/components/ui/TextReveal';
import { blogPosts, type BlogPost } from '@/src/data/blog';
import { ArticleSchema, BreadcrumbSchema } from '@/components/SEO/StructuredData';
import { siteConfig } from '@/src/data/siteConfig';
import { notFound } from 'next/navigation';

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t, lang } = useLanguage();

  const post: BlogPost | null = blogPosts.find((p) => p.slug === slug) || null;
  useSEOMeta('post', slug, lang, post ? (lang === 'ar' ? post.title_ar : post.title_en) : undefined);

  if (!post) {
    notFound();
  }

  const suggestedPosts = blogPosts
    .filter((p) => p.is_published && p.slug !== post.slug)
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-[#030712] bg-grid-pattern text-white selection:bg-[var(--ff-primary-light)] selection:text-[#030712] relative overflow-hidden" style={{ fontFamily: "var(--ff-font-body)" }}>
      <ArticleSchema
        title={lang === 'ar' ? post.title_ar : post.title_en}
        description={lang === 'ar' ? (post.excerpt_ar || post.title_ar) : (post.excerpt_en || post.title_en)}
        image={post.cover_image || undefined}
        url={`https://fastfree.cloud/blog/${post.slug}`}
        datePublished={post.published_at || undefined}
      />
      <BreadcrumbSchema items={[
        { name: lang === 'ar' ? 'الرئيسية' : 'Home', url: 'https://fastfree.cloud/' },
        { name: lang === 'ar' ? 'المدونة' : 'Blog', url: 'https://fastfree.cloud/blog' },
        { name: lang === 'ar' ? post.title_ar : post.title_en, url: `https://fastfree.cloud/blog/${post.slug}` },
      ]} />

      {/* Article Hero */}
      <section className={`relative pt-36 pb-12 overflow-hidden ${lang === 'ar' ? 'text-right' : 'text-left'} bg-[#030712]`}>
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

        <div className="relative max-w-4xl mx-auto px-6 z-10">
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {post.tags.map((tag, idx) => (
                <span key={idx} className="text-xs font-bold text-[var(--ff-accent)] bg-[var(--ff-accent)]/10 px-3 py-1 rounded-full border border-[var(--ff-accent)]/20">
                  {tag}
                </span>
              ))}
            </div>
          )}
          <h1 className={`text-3xl md:text-5xl font-extrabold mb-6 leading-tight flex ${lang === 'ar' ? 'justify-end text-right' : 'justify-start text-left'}`} style={{ fontFamily: 'var(--ff-font-heading)' }}>
            <TextReveal text={lang === 'ar' ? post.title_ar : post.title_en} />
          </h1>

          <div className="flex items-center gap-6 text-sm text-slate-400 border-b border-white/5 pb-6">
            <span>{t('BLOG_AUTHOR', 'الكاتب:', 'Author:')} {siteConfig.siteName}</span>
            <span>•</span>
            <span>{post.published_at ? new Date(post.published_at).toLocaleDateString('ar-EG') : ''}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Eye size={14} />
              {post.views} {t('BLOG_VIEWS', 'مشاهدة', 'Views')}
            </span>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className={`max-w-4xl mx-auto px-6 py-8 ${lang === 'ar' ? 'text-right' : 'text-left'} space-y-12`}>
        {/* Cover Image */}
        <div className="rounded-3xl border border-white/10 overflow-hidden shadow-2xl bg-slate-900 aspect-[21/9] relative">
          <Image src={post.cover_image || '/assets/og-default.svg'} alt={lang === 'ar' ? post.title_ar : post.title_en} fill className="object-cover" sizes="(max-width: 768px) 100vw, 75vw" />
        </div>

        {/* Article content */}
        <div className="p-8 md:p-12 rounded-3xl bg-white/5 border border-white/10 shadow-2xl leading-relaxed text-lg text-slate-200 whitespace-pre-line space-y-4">
          {lang === 'ar' ? post.content_ar : post.content_en}
        </div>

        {/* Back to Blog */}
        <div className="flex justify-start">
          <Link href={`/${lang}/blog`} className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all font-bold text-sm flex items-center gap-2">
            <ArrowRight size={16} />
            {t('BLOG_BACK', 'العودة لقائمة المقالات', 'Back to Articles List')}
          </Link>
        </div>

        {/* Suggested Posts */}
        {suggestedPosts.length > 0 && (
          <div className="border-t border-white/5 pt-12">
            <h3 className="text-2xl font-bold text-white mb-8">
              {t('BLOG_SUGGESTED', 'مقالات مقترحة', 'Suggested Articles')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {suggestedPosts.slice(0, 3).map((sp) => (
                <Link key={sp.id} href={`/${lang}/blog/${sp.slug}`} className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all hover:scale-105 group">
                   <div className="w-full h-32 relative overflow-hidden rounded-xl mb-4">
                      <Image src={sp.cover_image || '/assets/og-default.svg'} alt={lang === 'ar' ? sp.title_ar : sp.title_en} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="(max-width: 768px) 100vw, 33vw" />
                    </div>
                  <h4 className="font-bold text-white text-sm group-hover:text-[var(--ff-accent)] transition-colors">
                    {lang === 'ar' ? sp.title_ar : sp.title_en}
                  </h4>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
