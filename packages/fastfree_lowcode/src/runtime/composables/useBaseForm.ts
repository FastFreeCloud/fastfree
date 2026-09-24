import { ref, computed, type Ref, type ComputedRef } from 'vue'
import { useQuasar } from 'quasar'
import { useLcI18n } from '../i18n'
import { useFormatNumber } from './useFormatNumber'
import { useStatusHelpers } from './useStatusHelpers'
import type { ApiResponse } from 'fastfree-auth'

export interface FormField {
  name: string
  label: string
  type:
    | 'text'
    | 'number'
    | 'email'
    | 'password'
    | 'select'
    | 'date'
    | 'datetime'
    | 'textarea'
    | 'checkbox'
    | 'toggle'
    | 'radio'
    | 'currency'
    | 'percent'
    | 'autocomplete'
    | 'table'
    | 'computed'
  required?: boolean
  default?: unknown
  options?:
    | Array<{ label: string; value: unknown }>
    | (() =>
        | Array<{ label: string; value: unknown }>
        | Promise<Array<{ label: string; value: unknown }>>)
  placeholder?: string
  hint?: string
  validation?: (value: unknown) => string | undefined
  dependsOn?: string
  showWhen?: (form: Record<string, unknown>) => boolean
  debounce?: number
  getLabel?: (item: { label: string; value: unknown }) => string
  getValue?: (item: { label: string; value: unknown }) => unknown
  col?: number
  min?: number
  max?: number
  readonly?: boolean
  computedFormula?: string
  tableFields?: FormField[]
  tableAddLabel?: string
}

export interface BaseFormOptions<T extends Record<string, unknown>> {
  service: {
    get: (id: string) => Promise<ApiResponse<T>>
    create: (data: Partial<T>) => Promise<ApiResponse<T>>
    update: (id: string, data: Partial<T>) => Promise<ApiResponse<T>>
    delete: (id: string) => Promise<ApiResponse<void>>
    submit?: (id: string) => Promise<ApiResponse<void>>
    cancel?: (id: string) => Promise<ApiResponse<void>>
  }
  fields: FormField[]
  itemTitle: string
  namespace: string
  permissions?: {
    create?: boolean
    edit?: boolean
    delete?: boolean
    submit?: boolean
    cancel?: boolean
  }
}

export interface BaseFormReturn<T extends Record<string, unknown>> {
  form: Ref<Partial<T>>
  loading: Ref<boolean>
  saving: Ref<boolean>
  submitting: Ref<boolean>
  cancelling: Ref<boolean>
  deleting: Ref<boolean>
  error: Ref<string | null>
  docstatus: Ref<0 | 1 | 2>
  isNew: ComputedRef<boolean>
  canEdit: ComputedRef<boolean>
  canSubmit: ComputedRef<boolean>
  canCancel: ComputedRef<boolean>
  canDelete: ComputedRef<boolean>
  load: (id: string) => Promise<void>
  reset: () => void
  save: () => Promise<T | null>
  submit: () => Promise<void>
  cancel: () => Promise<void>
  delete: () => Promise<void>
  formatNumber: ReturnType<typeof useFormatNumber>['formatNumber']
  formatCurrency: ReturnType<typeof useFormatNumber>['formatCurrency']
  formatPercent: ReturnType<typeof useFormatNumber>['formatPercent']
  translateStatus: ReturnType<typeof useStatusHelpers>['translateStatus']
  statusColor: ReturnType<typeof useStatusHelpers>['statusColor']
  statusOptions: ReturnType<typeof useStatusHelpers>['statusOptions']
}

const DEFAULT_PERMISSIONS = {
  create: true,
  edit: true,
  delete: true,
  submit: true,
  cancel: true,
}

function buildDefaultForm<T extends Record<string, unknown>>(fields: FormField[]): Partial<T> {
  const defaults: Record<string, unknown> = {}
  for (const field of fields) {
    if (field.default !== undefined) {
      defaults[field.name] = field.default
    } else {
      switch (field.type) {
        case 'number':
        case 'currency':
        case 'percent':
          defaults[field.name] = 0
          break
        case 'checkbox':
          defaults[field.name] = false
          break
        case 'select':
          defaults[field.name] = ''
          break
        default:
          defaults[field.name] = ''
      }
    }
  }
  return defaults as Partial<T>
}

export function useBaseForm<T extends Record<string, unknown>>(
  options: BaseFormOptions<T>,
): BaseFormReturn<T> {
  const $q = useQuasar()
  const { t } = useLcI18n()
  const formatNumber = useFormatNumber()
  const statusHelpers = useStatusHelpers(options.namespace)

  const perms = { ...DEFAULT_PERMISSIONS, ...options.permissions }

  const form = ref(buildDefaultForm(options.fields)) as Ref<Partial<T>>
  const loading = ref(false)
  const saving = ref(false)
  const submitting = ref(false)
  const cancelling = ref(false)
  const deleting = ref(false)
  const error = ref<string | null>(null)
  const docstatus = ref<0 | 1 | 2>(0)
  let currentId: string | null = null

  const isNew = computed(() => currentId === null)

  const canEdit = computed(() => {
    if (!perms.edit) return false
    if (docstatus.value === 1 && !perms.submit) return false
    if (docstatus.value === 2) return false
    return true
  })

  const canSubmit = computed(
    () => docstatus.value === 0 && perms.submit && options.service.submit !== undefined,
  )

  const canCancel = computed(
    () => docstatus.value === 1 && perms.cancel && options.service.cancel !== undefined,
  )

  const canDelete = computed(() => docstatus.value === 2 && perms.delete)

  function reset(): void {
    currentId = null
    form.value = buildDefaultForm(options.fields)
    docstatus.value = 0
    error.value = null
  }

  async function load(id: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const response = await options.service.get(id)
      if (!response.success) {
        throw new Error(response.error?.message ?? t('common.error'))
      }
      currentId = id
      form.value = response.data as Partial<T>
      const status = (response.data as Record<string, unknown>).docstatus
      docstatus.value = status === 1 || status === 2 ? status : 0
    } catch (e) {
      const message = e instanceof Error ? e.message : t('common.error')
      error.value = message
      $q.notify({ type: 'negative', message })
      throw e
    } finally {
      loading.value = false
    }
  }

  async function save(): Promise<T | null> {
    saving.value = true
    error.value = null
    try {
      let response: ApiResponse<T>
      if (isNew.value) {
        response = await options.service.create(form.value)
      } else {
        if (!currentId) throw new Error(t('common.error'))
        response = await options.service.update(currentId, form.value)
      }
      if (!response.success) {
        throw new Error(response.error?.message ?? t('common.saveError'))
      }
      currentId = ((response.data as Record<string, unknown>)?.name as string) ?? currentId
      const savedStatus = (response.data as Record<string, unknown>)?.docstatus
      docstatus.value = savedStatus === 1 || savedStatus === 2 ? savedStatus : 0
      const savedKey = isNew.value
        ? `${options.namespace}.${options.itemTitle}Created`
        : `${options.namespace}.${options.itemTitle}Saved`
      $q.notify({ type: 'positive', message: t(savedKey) ?? t('common.saved') })
      return response.data as T
    } catch (e) {
      const message = e instanceof Error ? e.message : t('common.saveError')
      error.value = message
      $q.notify({ type: 'negative', message })
      throw e
    } finally {
      saving.value = false
    }
  }

  async function submit(): Promise<void> {
    if (!options.service.submit) {
      const msg = t('common.error')
      error.value = msg
      $q.notify({ type: 'negative', message: msg })
      throw new Error(msg)
    }
    if (!currentId) {
      const msg = t('common.error')
      error.value = msg
      $q.notify({ type: 'negative', message: msg })
      throw new Error(msg)
    }
    submitting.value = true
    error.value = null
    try {
      const response = await options.service.submit(currentId)
      if (!response.success) {
        throw new Error(response.error?.message ?? t('common.error'))
      }
      docstatus.value = 1
      $q.notify({
        type: 'positive',
        message: t(`${options.namespace}.${options.itemTitle}Submitted`) ?? t('common.submit'),
      })
    } catch (e) {
      const message = e instanceof Error ? e.message : t('common.error')
      error.value = message
      $q.notify({ type: 'negative', message })
      throw e
    } finally {
      submitting.value = false
    }
  }

  async function cancel(): Promise<void> {
    if (!options.service.cancel) {
      const msg = t('common.error')
      error.value = msg
      $q.notify({ type: 'negative', message: msg })
      throw new Error(msg)
    }
    if (!currentId) {
      const msg = t('common.error')
      error.value = msg
      $q.notify({ type: 'negative', message: msg })
      throw new Error(msg)
    }
    cancelling.value = true
    error.value = null
    try {
      const confirmedCancel = await new Promise<boolean>((resolve) => {
        $q.dialog({
          title: t('common.confirm'),
          message: t('common.confirmDelete'),
          cancel: true,
          persistent: true,
        })
          .onOk(() => resolve(true))
          .onCancel(() => resolve(false))
          .onDismiss(() => resolve(false))
      })
      if (!confirmedCancel) return // user dismissed the confirm dialog — not an error

      const response = await options.service.cancel(currentId)
      if (!response.success) {
        throw new Error(response.error?.message ?? t('common.error'))
      }
      docstatus.value = 2
      $q.notify({
        type: 'positive',
        message: t(`${options.namespace}.${options.itemTitle}Cancelled`) ?? t('common.cancel'),
      })
    } catch (e) {
      const message = e instanceof Error ? e.message : t('common.error')
      error.value = message
      $q.notify({ type: 'negative', message })
      throw e
    } finally {
      cancelling.value = false
    }
  }

  async function remove(): Promise<void> {
    if (!currentId) {
      const msg = t('common.error')
      error.value = msg
      $q.notify({ type: 'negative', message: msg })
      throw new Error(msg)
    }
    deleting.value = true
    error.value = null
    try {
      const confirmed = await new Promise<boolean>((resolve) => {
        $q.dialog({
          title: t('common.confirm'),
          message: t('common.confirmDelete'),
          cancel: true,
          persistent: true,
        })
          .onOk(() => resolve(true))
          .onCancel(() => resolve(false))
          .onDismiss(() => resolve(false))
      })
      if (!confirmed) return

      const response = await options.service.delete(currentId)
      if (!response.success) {
        throw new Error(response.error?.message ?? t('common.deleteError'))
      }
      $q.notify({
        type: 'positive',
        message: t(`${options.namespace}.${options.itemTitle}Deleted`) ?? t('common.deleteSuccess'),
      })
      reset()
    } catch (e) {
      const message = e instanceof Error ? e.message : t('common.deleteError')
      error.value = message
      $q.notify({ type: 'negative', message })
      throw e
    } finally {
      deleting.value = false
    }
  }

  return {
    form,
    loading,
    saving,
    submitting,
    cancelling,
    deleting,
    error,
    docstatus,
    isNew,
    canEdit,
    canSubmit,
    canCancel,
    canDelete,
    load,
    reset,
    save,
    submit,
    cancel,
    delete: remove,
    formatNumber: formatNumber.formatNumber,
    formatCurrency: formatNumber.formatCurrency,
    formatPercent: formatNumber.formatPercent,
    translateStatus: statusHelpers.translateStatus,
    statusColor: statusHelpers.statusColor,
    statusOptions: statusHelpers.statusOptions,
  }
}
