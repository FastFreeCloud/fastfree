import { useQuasar } from 'quasar'
import { useLcI18n } from '../i18n'

export function useNotify() {
  const $q = useQuasar()
  const { t } = useLcI18n()

  function saved(msg?: string) {
    $q.notify({ type: 'positive', message: msg || t('common.saved'), icon: 'mdi-check-circle', timeout: 2000 })
  }

  function notifyDeleteSuccess(msg?: string) {
    $q.notify({ type: 'positive', message: msg || t('common.deleteSuccess'), icon: 'mdi-check-circle', timeout: 2000 })
  }

  function notifyError(msg?: string) {
    $q.notify({ type: 'negative', message: msg || t('common.errorOccurred'), icon: 'mdi-alert-circle', timeout: 3000 })
  }

  function notifyWarning(msg?: string) {
    $q.notify({ type: 'warning', message: msg || t('common.noData'), icon: 'mdi-file-document-outline', timeout: 2000 })
  }

  function info(msg: string) {
    $q.notify({ type: 'info', message: msg, icon: 'mdi-information', timeout: 2000 })
  }

  function create(options: { type: 'positive' | 'negative' | 'warning' | 'info'; message: string; icon?: string; timeout?: number }) {
    $q.notify({ icon: 'mdi-information', timeout: 2000, ...options })
  }

  return { saved, deleted: notifyDeleteSuccess, error: notifyError, warning: notifyWarning, info, create }
}
