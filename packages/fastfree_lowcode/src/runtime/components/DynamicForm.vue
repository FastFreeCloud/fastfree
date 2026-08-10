<template>
  <div class="dynamic-form">
    <div class="row q-col-gutter-md">
      <div
        v-for="field in fields"
        :key="field.name"
        :class="`col-${field.col || 12}`"
      >
        <!-- Text / Email / Phone / Password / Number -->
        <q-input
          v-if="['text', 'email', 'phone', 'password', 'number'].includes(field.type)"
          :model-value="(modelValue?.[field.name] as string | number | null | undefined)"
          @update:model-value="updateField(field.name, $event)"
          :label="field.label"
          :type="(field.type === 'phone' ? 'text' : field.type) as 'text' | 'email' | 'password' | 'number'"
          :mask="field.type === 'phone' ? '##############' : undefined"
          :outlined="true"
          dense
          :disable="readonly"
          :rules="getRules(field)"
        >
          <template v-if="field.prefix" #prepend>
            <q-icon :name="field.prefix" />
          </template>
        </q-input>

        <!-- Select -->
        <q-select
          v-else-if="field.type === 'select'"
          :model-value="(modelValue?.[field.name] as string | number | null | undefined)"
          @update:model-value="updateField(field.name, $event)"
          :label="field.label"
          :options="field.options || []"
          emit-value
          map-options
          outlined
          dense
          :disable="readonly"
          :rules="getRules(field)"
        />

        <!-- Date -->
        <q-input
          v-else-if="field.type === 'date'"
          :model-value="(modelValue?.[field.name] as string | number | null | undefined)"
          @update:model-value="updateField(field.name, $event)"
          :label="field.label"
          outlined
          dense
          :disable="readonly"
          mask="####-##-##"
          :rules="getRules(field)"
        >
          <template #append>
            <q-icon name="event" class="cursor-pointer">
              <q-popup-proxy>
                <q-date
                  :model-value="modelValue?.[field.name]"
                  @update:model-value="updateField(field.name, $event)"
                  mask="YYYY-MM-DD"
                />
              </q-popup-proxy>
            </q-icon>
          </template>
        </q-input>

        <!-- Textarea -->
        <q-input
          v-else-if="field.type === 'textarea'"
          :model-value="(modelValue?.[field.name] as string | number | null | undefined)"
          @update:model-value="updateField(field.name, $event)"
          :label="field.label"
          type="textarea"
          outlined
          dense
          :disable="readonly"
          :rules="getRules(field)"
        />

        <!-- Checkbox -->
        <q-checkbox
          v-else-if="field.type === 'checkbox'"
          :model-value="modelValue?.[field.name]"
          @update:model-value="updateField(field.name, $event)"
          :label="field.label"
          :disable="readonly"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useLcI18n } from '../i18n'

export interface FieldDefinition {
  name: string
  label: string
  type: 'text' | 'email' | 'phone' | 'password' | 'number' | 'select' | 'date' | 'textarea' | 'checkbox'
  required?: boolean
  col?: number
  prefix?: string
  options?: { label: string; value: unknown }[]
  rules?: ((val: unknown) => true | string)[]
}

const props = defineProps<{
  modelValue?: Record<string, unknown>
  fields: FieldDefinition[]
  readonly?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, unknown>]
}>()

const { t } = useLcI18n()

function updateField(name: string, value: unknown) {
  emit('update:modelValue', { ...props.modelValue, [name]: value })
}

function getRules(field: FieldDefinition) {
  const rules: ((val: unknown) => true | string)[] = []
  if (field.required) {
    rules.push((val) => !!val || `${field.label} ${t('validation.required')}`)
  }
  if (field.rules) {
    rules.push(...field.rules)
  }
  return rules
}

</script>
