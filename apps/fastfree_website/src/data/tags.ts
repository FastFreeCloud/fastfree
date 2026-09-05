export type Tag = { id: string; title_ar: string; title_en: string; type: string };

export const tags: Tag[] = [
  { id: '1', title_ar: 'Vue', title_en: 'Vue', type: 'tech' },
  { id: '3', title_ar: 'TypeScript', title_en: 'TypeScript', type: 'tech' },
  { id: '4', title_ar: 'نظام ERP', title_en: 'ERP', type: 'domain' },
  { id: '5', title_ar: 'Frappe', title_en: 'Frappe', type: 'tech' },
  { id: '6', title_ar: 'NixOS', title_en: 'NixOS', type: 'infra' },
  { id: '7', title_ar: 'Docker', title_en: 'Docker', type: 'infra' },
  { id: '8', title_ar: 'منخفض الكود', title_en: 'Low-Code', type: 'domain' },
  { id: '9', title_ar: 'الذكاء الاصطناعي', title_en: 'AI', type: 'tech' },
  { id: '10', title_ar: 'الحوسبة السحابية', title_en: 'Cloud', type: 'infra' },
];
