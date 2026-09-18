/**
 * fastfree_update — Arabic messages (`update.*` namespace, RTL-ready).
 *
 * Key parity with English is enforced at compile time by typing this export
 * as `UpdateMessagesEn`: adding/removing a key in one locale breaks the
 * build until the other locale matches.
 */
import type { UpdateMessagesEn } from './messages-en';

export const updateMessagesAr: UpdateMessagesEn = {
  update: {
    title: 'يتوفّر تحديث جديد',
    body: 'يتوفّر إصدار جديد من التطبيق. حدّث الآن للحصول على أحدث المزايا والإصلاحات.',
    updateNow: 'تحديث الآن',
    later: 'لاحقاً',
    checking: 'جارٍ التحقق من وجود تحديثات…',
    noUpdate: 'أنت تستخدم أحدث إصدار.',
    offline: 'أنت غير متصل بالإنترنت. تحقق من الاتصال وحاول مجدداً.',
    openPlay: 'فتح في متجر Play',
    clearCacheWeb: 'حدّث الصفحة لتطبيق أحدث نسخة ويب.',
    dismissed: 'تم تأجيل التذكير. سنسألك مجدداً لاحقاً.',
  },
};
