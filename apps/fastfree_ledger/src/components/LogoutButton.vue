<template>
  <q-btn
    flat
    round
    icon="mdi-logout"
    :title="t('auth.logout')"
    @click="handleLogout"
  />
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar'
import { useLcI18n } from 'quasar-app-extension-fastfree-lowcode'
import { useAuthStore } from 'fastfree-auth'

const $q = useQuasar()
const { t } = useLcI18n()
const authStore = useAuthStore()

function handleLogout() {
  $q.dialog({
    title: t('auth.logout'),
    message: t('auth.logoutConfirm'),
    cancel: true,
  }).onOk(() => {
    void authStore.logout().then(() => {
      window.location.reload()
    })
  })
}
</script>
