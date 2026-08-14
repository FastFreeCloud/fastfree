import type { BlogPost } from './blogTypes';
import { blogTips } from './blogParts/tips';
import { blogTechnology } from './blogParts/technology';
import { blogWeb } from './blogParts/web';
import { blogMarketing } from './blogParts/marketing';
import { blogNews } from './blogParts/news';

export type { BlogPost };

export const blogPosts: BlogPost[] = [
  ...blogTips,
  ...blogTechnology,
  ...blogWeb,
  ...blogMarketing,
  ...blogNews,
];
