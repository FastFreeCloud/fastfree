export const BLOG_CATEGORY_LABELS = {
  ALL: { ar: 'الكل', en: 'All' },
  TECHNOLOGY: { ar: 'تقنية', en: 'Technology' },
  COMPANY_NEWS: { ar: 'أخبار', en: 'News' },
  DIGITAL_MARKETING: { ar: 'تسويق', en: 'Marketing' },
  WEB_DEVELOPMENT: { ar: 'ويب', en: 'Web Dev' },
  MOBILE_DEVELOPMENT: { ar: 'جوال', en: 'Mobile' },
  TIPS: { ar: 'نصائح', en: 'Tips' },
} as const;

export function catLabel(category: string | null | undefined, lang: string): string {
  if (!category) return '';
  const hit = (BLOG_CATEGORY_LABELS as Record<string, { ar: string; en: string }>)[category];
  return hit ? hit[lang === 'ar' ? 'ar' : 'en'] : category;
}
