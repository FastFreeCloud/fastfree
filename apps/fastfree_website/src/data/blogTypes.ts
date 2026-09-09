export type BlogPost = {
  id: string;
  title_ar: string;
  title_en: string;
  slug: string;
  content_ar: string;
  content_en: string;
  excerpt_ar: string | null;
  excerpt_en: string | null;
  cover_image: string | null;
  category: string | null;
  tags: string[];
  is_published: boolean;
  published_at: string | null;
  views: number;
};

export type BlogMeta = Omit<BlogPost, 'content_ar' | 'content_en'>;

export type BlogBodies = Record<string, Pick<BlogPost, 'content_ar' | 'content_en'>>;
