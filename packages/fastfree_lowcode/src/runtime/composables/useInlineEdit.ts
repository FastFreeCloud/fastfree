import { ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { getSharedConfig } from '../shared-config'

export interface EditableRow {
  _isEditing: boolean
  _isNew: boolean
  _saving: boolean
  _autoSaving: boolean
  _form: Record<string, unknown>
  [key: string]: unknown
}

export interface InlineEditOptions {
  fields: string[]
  requiredFields?: string[]
  labels?: Record<string, string>
  validate?: (row: EditableRow) => string | true
  onSave?: (row: EditableRow) => Promise<void>
  onDelete?: (row: EditableRow) => Promise<void>
  autoSave?: boolean
  autoSaveDelay?: number
}

export function useInlineEdit<T extends Record<string, unknown>>(options: InlineEditOptions) {
  const $q = useQuasar()
  const editingRows = ref<EditableRow[]>([])
  const autoSave = ref(options.autoSave ?? false)
  const autoSaveDelay = ref(options.autoSaveDelay ?? 3000)
  const _autoSaveTimers = ref<Map<string | number, ReturnType<typeof setTimeout>>>(new Map())

  const editingIds = computed(() => new Set(editingRows.value.map((r) => r.id as string | number)))

  const allRows = computed(() => editingRows.value)

  function scheduleAutoSave(row: EditableRow) {
    if (!autoSave.value) return
    cancelAutoSave(row)
    const id = row.id as string | number
    const timer = setTimeout(async () => {
      _autoSaveTimers.value.delete(id)
      await saveRow(row)
    }, autoSaveDelay.value)
    _autoSaveTimers.value.set(id, timer)
    row._autoSaving = true
  }

  function cancelAutoSave(row: EditableRow) {
    const id = row.id as string | number
    const timer = _autoSaveTimers.value.get(id)
    if (timer !== undefined) {
      clearTimeout(timer)
      _autoSaveTimers.value.delete(id)
    }
    row._autoSaving = false
  }

  function addNewRow(): EditableRow {
    const newRow: EditableRow = {
      id: -(Date.now() + Math.random()),
      _isEditing: true,
      _isNew: true,
      _saving: false,
      _autoSaving: false,
      _form: {},
    }
    options.fields.forEach((f) => {
      newRow._form[f] = ''
      newRow[f] = ''
    })
    editingRows.value.push(newRow)
    return newRow
  }

  function startEdit(row: Record<string, unknown>) {
    const editable: EditableRow = {
      ...row,
      _isEditing: true,
      _isNew: false,
      _saving: false,
      _autoSaving: false,
      _form: {},
    }
    options.fields.forEach((f) => {
      editable._form[f] = row[f] ?? ''
    })
    editingRows.value.push(editable)
  }

  function cancelEdit(row: EditableRow) {
    cancelAutoSave(row)
    editingRows.value = editingRows.value.filter((r) => r.id !== row.id)
  }

  async function saveRow(row: EditableRow) {
    cancelAutoSave(row)

    if (options.requiredFields) {
      for (const f of options.requiredFields) {
        if (!row._form[f]) {
          const label = options.labels?.[f] || f
          $q.notify({ type: 'negative', message: `${label} ${getSharedConfig().messages['validation.required']}` })
          return
        }
      }
    }

    if (options.validate) {
      const result = options.validate(row)
      if (result !== true) {
        $q.notify({ type: 'negative', message: result })
        return
      }
    }

    row._saving = true
    try {
      await options.onSave?.(row)
      editingRows.value = editingRows.value.filter((r) => r.id !== row.id)
      $q.notify({ type: 'positive', message: getSharedConfig().messages['common.saved'] })
    } catch {
      $q.notify({ type: 'negative', message: getSharedConfig().messages['common.saveError'] })
    } finally {
      row._saving = false
      row._autoSaving = false
    }
  }

  async function confirmDelete(row: T) {
    return new Promise<boolean>((resolve) => {
      $q.dialog({
        title: getSharedConfig().messages['common.confirmDelete'],
        message: getSharedConfig().messages['common.deleteMessage'],
        cancel: { label: getSharedConfig().messages['common.cancel'], flat: true },
        ok: { label: getSharedConfig().messages['common.delete'], color: 'negative' },
        persistent: true,
      }).onOk(async () => {
        try {
          await options.onDelete?.(row as unknown as EditableRow)
          $q.notify({ type: 'positive', message: getSharedConfig().messages['common.deleteSuccess'] })
          resolve(true)
        } catch {
          $q.notify({ type: 'negative', message: getSharedConfig().messages['common.deleteError'] })
          resolve(false)
        }
      }).onCancel(() => resolve(false))
    })
  }

  function onEditKeydown(e: KeyboardEvent, row: EditableRow) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      saveRow(row)
    } else if (e.key === 'Escape') {
      cancelEdit(row)
    }
  }

  if (options.autoSave) {
    watch(editingRows, () => {
      for (const row of editingRows.value) {
        if (row._isEditing && !row._isNew && !row._autoSaving) {
          scheduleAutoSave(row)
        }
      }
    }, { deep: true })
  }

  return {
    editingRows,
    editingIds,
    allRows,
    addNewRow,
    startEdit,
    cancelEdit,
    saveRow,
    confirmDelete,
    onEditKeydown,
    scheduleAutoSave,
    cancelAutoSave,
  }
}
