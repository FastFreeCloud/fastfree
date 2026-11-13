<template>
  <component
    :is="resolvedComponent"
    v-bind="boundProps"
    v-on="eventListeners"
  >
    <!-- Dynamic text rendering in default slot -->
    <template v-if="interpolatedText">{{ interpolatedText }}</template>

    <!-- Recursive children rendering -->
    <SduiNode
      v-for="(child, index) in node.children"
      :key="child.id || index"
      :node="child"
      :state="state"
      @action="onChildAction"
    />
  </component>
</template>

<script setup lang="ts">
import { computed, defineOptions, type Component } from 'vue'
import type { SduiNode, SduiState, SduiAction } from './types'
import { SduiRegistry } from './SduiRegistry'
import { SduiActionDispatcher } from './SduiActionDispatcher'
import {
  resolveNodeValue,
  type SduiResolveLocale,
  type SduiResolveState,
} from './resolve'

defineOptions({
  name: 'SduiNode'
})

interface Props {
  node: SduiNode
  state?: SduiState
}

const props = withDefaults(defineProps<Props>(), {
  state: () => ({})
})

const emit = defineEmits<{
  (e: 'action', payload: { action: SduiAction | SduiAction[]; eventName: string; event: any }): void
}>()

const registry = SduiRegistry.getInstance()
const dispatcher = SduiActionDispatcher.getInstance()

/**
 * Active application locale from reactive state
 */
const currentLocale = computed<SduiResolveLocale>(() => {
  return (props.state as any)?.locale || 'ar'
})

/**
 * Resolve one node value (text/label/style/prop) through the shared resolver:
 * dual-language { ar, en } -> {{ expression }} interpolation -> tokens.css
 * CSS variable resolution for the active theme.
 */
function resolveNodeValueForNode(value: any): any {
  return resolveNodeValue(value, currentLocale.value, props.state as SduiResolveState)
}

/**
 * Resolve Vue or Quasar component
 */
const resolvedComponent = computed<Component>(() => {
  return registry.resolve(props.node.type)
})

/**
 * Two-way model binding synced with state[node.model]
 */
const modelValue = computed({
  get: () => {
    if (!props.node.model || !props.state) return undefined
    return dispatcher.getNestedState(props.state, props.node.model)
  },
  set: (val: any) => {
    if (props.node.model && props.state) {
      dispatcher.setNestedState(props.state, props.node.model, val)
    }
  }
})

const onModelUpdate = (val: any) => {
  modelValue.value = val
}

/**
 * Computes all component props, CSS styles, classes, and two-way bindings
 */
const boundProps = computed(() => {
  const rawProps = props.node.props || {}
  const result: Record<string, any> = {}

  for (const [key, val] of Object.entries(rawProps)) {
    result[key] = resolveNodeValueForNode(val)
  }

  if (props.node.id) {
    result.id = props.node.id
  }

  if (props.node.class) {
    result.class = props.node.class
  }

  if (props.node.style) {
    result.style = resolveNodeValueForNode(props.node.style)
  }

  // Two-way data binding for Quasar and standard elements
  if (props.node.model) {
    result.modelValue = modelValue.value
    result['model-value'] = modelValue.value
    result['onUpdate:modelValue'] = onModelUpdate
    result['onUpdate:model-value'] = onModelUpdate

    // Support HTML native inputs
    result.value = modelValue.value
    result.onInput = (e: any) => {
      const val = e && typeof e === 'object' && 'target' in e ? e.target.value : e
      onModelUpdate(val)
    }
  }

  return result
})

/**
 * Event listeners forwarding actions to SduiActionDispatcher
 */
const eventListeners = computed(() => {
  const listeners: Record<string, (event: any) => void> = {}

  if (props.node.events) {
    for (const [eventName, actionOrActions] of Object.entries(props.node.events)) {
      listeners[eventName] = async (event: any) => {
        // Resolve dual-language labels and {{ state }} payloads inside actions
        // before they are emitted or dispatched.
        const resolvedActions = resolveNodeValue(
          actionOrActions,
          currentLocale.value,
          props.state as SduiResolveState
        )

        emit('action', {
          action: resolvedActions,
          eventName,
          event
        })

        await dispatcher.dispatchAll(resolvedActions, {
          state: props.state,
          event,
          node: props.node,
          dispatch: (act) =>
            dispatcher.dispatch(act, {
              state: props.state,
              event,
              node: props.node
            })
        })
      }
    }
  }

  return listeners
})

/**
 * Dynamic text evaluation with localization and {{ expression }} interpolation
 */
const interpolatedText = computed(() => {
  if (!props.node.text) return ''
  return resolveNodeValueForNode(props.node.text)
})

const onChildAction = (payload: { action: SduiAction | SduiAction[]; eventName: string; event: any }) => {
  emit('action', payload)
}
</script>
