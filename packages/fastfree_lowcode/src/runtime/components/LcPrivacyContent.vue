<template>
  <div class="lc-privacy-content" :dir="isRtl ? 'rtl' : 'ltr'">
    <div class="lc-privacy-content__updated">{{ content.updated }}</div>
    <section
      v-for="(section, i) in content.sections"
      :key="i"
      class="lc-privacy-content__section"
    >
      <h2 class="lc-privacy-content__heading">{{ section.heading }}</h2>
      <p
        v-for="(paragraph, j) in section.paragraphs"
        :key="j"
        class="lc-privacy-content__text"
      >
        {{ paragraph }}
      </p>
      <ul v-if="section.list" class="lc-privacy-content__list">
        <li v-for="(item, k) in section.list" :key="k">{{ item }}</li>
      </ul>
      <p
        v-for="(paragraph, j) in section.closing ?? []"
        :key="`c-${j}`"
        class="lc-privacy-content__text"
      >
        {{ paragraph }}
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLcI18nStore } from '../composables/useLcI18nStore'
import { PRIVACY_CONTENT } from './privacy-content'

const i18nStore = useLcI18nStore()

const isRtl = computed(() => i18nStore.locale.value === 'ar')
const content = computed(() => PRIVACY_CONTENT[isRtl.value ? 'ar' : 'en'])
</script>

<style lang="scss" scoped>
.lc-privacy-content {
  padding: 4px 2px 24px;
  color: var(--lc-on-surface, #222);
}

.lc-privacy-content__updated {
  font-size: 12px;
  font-weight: 600;
  color: var(--lc-on-surface-variant, #666);
  margin-bottom: 12px;
}

.lc-privacy-content__section {
  margin-bottom: 18px;
}

.lc-privacy-content__heading {
  font-size: 16px;
  font-weight: 700;
  line-height: 1.5;
  margin: 0 0 8px;
  color: var(--lc-primary, #1565c0);
}

.lc-privacy-content__text {
  font-size: 14px;
  line-height: 1.8;
  margin: 0 0 8px;
}

.lc-privacy-content__list {
  margin: 0 0 8px;
  padding-inline-start: 20px;
  font-size: 14px;
  line-height: 1.8;

  li {
    margin-bottom: 4px;
  }
}
</style>
