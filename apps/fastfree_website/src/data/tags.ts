export type Tag = { id: string; title_ar: string; title_en: string; type: string };

export const tags: Tag[] = [
  { id: '4', title_ar: 'نظام ERP', title_en: 'ERP', type: 'domain' },
  { id: '6', title_ar: 'NixOS', title_en: 'NixOS', type: 'infra' },
  { id: '7', title_ar: 'Docker', title_en: 'Docker', type: 'infra' },
  { id: '8', title_ar: 'منخفض الكود', title_en: 'Low-Code', type: 'domain' },
  { id: '9', title_ar: 'الذكاء الاصطناعي', title_en: 'AI', type: 'tech' },
  { id: '10', title_ar: 'الحوسبة السحابية', title_en: 'Cloud', type: 'infra' },
  { id: '11', title_ar: 'أندرويد', title_en: 'Android', type: 'tech' },
];
