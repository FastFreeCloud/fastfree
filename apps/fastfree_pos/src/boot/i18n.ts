import { watch } from 'vue';
import { defineBoot } from '#q-app';
import { createI18n } from 'vue-i18n';

import messages from '@/i18n';
import { getLcI18nStore } from 'quasar-app-extension-fastfree-lowcode';

export type MessageLanguages = keyof typeof messages;
// Type-define 'en-US' as the master schema for the resource
export type MessageSchema = (typeof messages)['en-US'];

// See https://vue-i18n.intlify.dev/guide/advanced/typescript.html#global-resource-schema-type-definition
/* eslint-disable @typescript-eslint/no-empty-object-type */
declare module 'vue-i18n' {
  // define the locale messages schema
  export interface DefineLocaleMessage extends MessageSchema {}

  // define the datetime format schema
  export interface DefineDateTimeFormat {}

  // define the number format schema
  export interface DefineNumberFormat {}
}
/* eslint-enable @typescript-eslint/no-empty-object-type */

export default defineBoot(({ app }) => {
  const i18n = createI18n<{ message: MessageSchema }, MessageLanguages>({
    locale: 'en-US',
    legacy: false,
    messages,
  });

  // Set i18n instance on app
  app.use(i18n);

  // Sync vue-i18n locale with package's i18n store
  const i18nStore = getLcI18nStore();
  watch(
    () => i18nStore.locale.value,
    (newLocale) => {
      const mapped = newLocale === 'ar' ? 'ar-SA' : 'en-US';
      i18n.global.locale = mapped;
    },
    { immediate: true },
  );
});
