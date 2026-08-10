import { ref } from 'vue';
import { Notify } from 'quasar';

export function usePWACache() {
  const isClearing = ref(false);
  const clearingProgress = ref('');

  // مسح جميع كاشات CacheStorage
  async function clearAllCaches() {
    isClearing.value = true;
    clearingProgress.value = 'جاري مسح كاشات CacheStorage...';

    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
      clearingProgress.value = `تم مسح ${cacheNames.length} كاش`;
      Notify.create({
        message: `تم مسح ${cacheNames.length} كاش من CacheStorage`,
        color: 'positive',
        position: 'bottom',
      });
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      console.error('[PWA] Cache clear failed:', error);
      Notify.create({
        message: 'فشل مسح الكاش: ' + error.message,
        color: 'negative',
        position: 'bottom',
      });
    } finally {
      isClearing.value = false;
      setTimeout(() => {
        clearingProgress.value = '';
      }, 3000);
    }
  }

  // إلغاء تسجيل جميع Service Workers
  async function unregisterAllServiceWorkers() {
    isClearing.value = true;
    clearingProgress.value = 'جاري إلغاء تسجيل Service Workers...';

    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((reg) => reg.unregister()));
        Notify.create({
          message: `تم إلغاء تسجيل ${registrations.length} Service Worker`,
          color: 'positive',
          position: 'bottom',
        });
      }
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      console.error('[PWA] SW unregister failed:', error);
      Notify.create({
        message: 'فشل إلغاء تسجيل SW: ' + error.message,
        color: 'negative',
        position: 'bottom',
      });
    } finally {
      isClearing.value = false;
      setTimeout(() => {
        clearingProgress.value = '';
      }, 3000);
    }
  }

  // مسح شامل: كاش + SW + localStorage (Pinia) + إعادة تحميل
  async function nuclearClear() {
    isClearing.value = true;
    clearingProgress.value = 'تنظيف نووي شامل...';

    try {
      // 1. مسح جميع الكاشات
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));

      // 2. إلغاء تسجيل جميع SW
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((reg) => reg.unregister()));
      }

      // 3. مسح localStorage (Pinia persisted state)
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          (key.startsWith('lc-') ||
            key.startsWith('pinia') ||
            key.startsWith('persist:') ||
            key.startsWith('__pinia'))
        ) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));

      // 4. مسح sessionStorage
      sessionStorage.clear();

      Notify.create({
        message: 'تم التنظيف الكامل - جاري إعادة التحميل...',
        color: 'positive',
        position: 'bottom',
        timeout: 10000,
      });

      // 5. إعادة تحميل الصفحة
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      console.error('[PWA] Nuclear clear failed:', error);
      Notify.create({
        message: 'فشل التنظيف: ' + error.message,
        color: 'negative',
        position: 'bottom',
      });
    } finally {
      isClearing.value = false;
      clearingProgress.value = '';
    }
  }

  // تحديث Service Worker يدوياً
  async function checkForUpdate() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.update();
        Notify.create({
          message: 'تم فحص التحديثات',
          color: 'primary',
          position: 'bottom',
        });
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e));
        console.error('[PWA] Update check failed:', error);
        Notify.create({
          message: 'فشل فحص التحديث: ' + error.message,
          color: 'negative',
          position: 'bottom',
        });
      }
    }
  }

  // إجبار تحديث SW
  async function forceSWUpdate() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        await registration.update();
        Notify.create({
          message: 'تم تحديث Service Worker',
          color: 'positive',
          position: 'bottom',
        });
        // إعادة تحميل بعد فترة قصيرة
        setTimeout(() => window.location.reload(), 1000);
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e));
        console.error('[PWA] Force update failed:', error);
        Notify.create({
          message: 'فشل التحديث الإجباري: ' + error.message,
          color: 'negative',
          position: 'bottom',
        });
      }
    }
  }

  return {
    isClearing,
    clearingProgress,
    clearAllCaches,
    unregisterAllServiceWorkers,
    nuclearClear,
    checkForUpdate,
    forceSWUpdate,
  };
}
