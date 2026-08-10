import { useQuasar } from 'quasar'
import { useLcI18n } from '../i18n'

export function useConfirmDialog() {
  const $q = useQuasar()
  const { t } = useLcI18n()

  function confirmDelete(label: string): Promise<boolean> {
    return new Promise((resolve) => {
      $q.dialog({
        title: t('common.confirmDelete'),
        message: `${t('common.deleteMessage')} ${label}`,
        cancel: { label: t('common.cancel'), flat: true },
        ok: { label: t('common.delete'), color: 'negative' },
        persistent: true,
      }).onOk(() => resolve(true))
        .onCancel(() => resolve(false))
        .onDismiss(() => resolve(false))
    })
  }

  function confirmAction(options: {
    title?: string
    message: string
    okLabel?: string
    okColor?: string
    cancelLabel?: string
  }): Promise<boolean> {
    return new Promise((resolve) => {
      $q.dialog({
        title: options.title || t('common.confirmDelete'),
        message: options.message,
        cancel: { label: options.cancelLabel || t('common.cancel'), flat: true },
        ok: { label: options.okLabel || t('common.delete'), color: options.okColor || 'negative' },
        persistent: true,
      }).onOk(() => resolve(true))
        .onCancel(() => resolve(false))
        .onDismiss(() => resolve(false))
    })
  }

  return { confirmDelete, confirmAction }
}
