<template>
  <q-dialog
    v-model="open"
    :persistent="false"
    :dir="dir"
    aria-labelledby="ff-update-title"
    aria-describedby="ff-update-body"
    @hide="onHide"
  >
    <q-card :dir="dir" class="ff-update-card">
      <q-card-section>
        <div id="ff-update-title" class="text-h6">{{ messages.title }}</div>
      </q-card-section>

      <q-card-section id="ff-update-body">
        <div>{{ messages.body }}</div>
        <div v-if="props.versionInfo" class="text-caption ff-update-card__version">
          {{ props.versionInfo }}
        </div>
      </q-card-section>

      <q-card-actions align="right" class="ff-update-card__actions">
        <q-btn
          flat
          :label="messages.later"
          :aria-label="messages.later"
          @click="onLater"
        />
        <q-btn
          flat
          :label="messages.openPlay"
          :aria-label="messages.openPlay"
          @click="onOpenPlay"
        />
        <q-btn
          color="primary"
          :label="messages.updateNow"
          :aria-label="messages.updateNow"
          @click="onUpdate"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { resolveUpdateLocale, resolveUpdateMessages } from './useAppUpdate';

const props = defineProps<{
  versionInfo?: string;
}>();

const emit = defineEmits<{
  (e: 'update'): void;
  (e: 'later'): void;
  (e: 'open-play'): void;
}>();

// Dismissible dialog: persistent=false lets the user close via ESC/backdrop,
// which counts as "later" (see onHide) so the snooze cooldown still applies.
const open = ref(true);
// Ensures exactly one of update/later/open-play is emitted per showing.
const resolved = ref(false);

const messages = resolveUpdateMessages();
// RTL comes from the resolved locale; layout uses logical properties only
// (inset-inline-*/padding-inline-*) so both directions render correctly.
const dir = computed(() => (resolveUpdateLocale() === 'ar' ? 'rtl' : 'ltr'));

function close(): void {
  open.value = false;
}

function onUpdate(): void {
  if (resolved.value) {
    return;
  }
  resolved.value = true;
  emit('update');
  close();
}

function onLater(): void {
  if (resolved.value) {
    return;
  }
  resolved.value = true;
  emit('later');
  close();
}

function onOpenPlay(): void {
  if (resolved.value) {
    return;
  }
  resolved.value = true;
  emit('open-play');
  close();
}

function onHide(): void {
  if (resolved.value) {
    return;
  }
  resolved.value = true;
  emit('later');
}
</script>

<style scoped>
.ff-update-card {
  width: 100%;
  max-width: 26.25rem;
}

.ff-update-card__version {
  padding-block-start: 0.5rem;
  opacity: 0.7;
}

.ff-update-card__actions {
  padding-inline-start: 0.75rem;
  padding-inline-end: 0.75rem;
  padding-block-end: 0.75rem;
}
</style>
