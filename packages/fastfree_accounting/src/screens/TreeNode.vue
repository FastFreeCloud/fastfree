<template>
  <div class="tree-node" :class="{ 'is-root': depth === 0 }">
    <div
      class="node-row"
      :class="{
        'is-group': node.isGroup,
        'is-expanded': isExpanded,
        'has-children': hasChildren
      }"
      :style="{ paddingInlineStart: depth * 24 + 'px' }"
      @click="handleClick"
    >
      <!-- Expand/collapse arrow -->
      <div class="node-arrow" :class="{ 'visible': hasChildren }">
        <q-icon
          :name="isExpanded ? 'mdi-chevron-down' : 'mdi-chevron-right'"
          size="18px"
          class="arrow-icon"
        />
      </div>

      <!-- Account type color indicator -->
      <div class="type-indicator" :style="{ backgroundColor: typeColor }" />

      <!-- Account icon -->
      <div class="node-icon" :class="node.isGroup ? 'group-icon' : 'account-icon'">
        <q-icon
          :name="node.isGroup ? 'mdi-folder-open' : 'mdi-book-open-page-variant'"
          :size="node.isGroup ? '20px' : '18px'"
        />
      </div>

      <!-- Account info -->
      <div class="node-info">
        <div class="node-name">{{ node.accountName }}</div>
        <div class="node-meta" v-if="!node.isGroup">
          <q-chip
            dense
            size="xs"
            :color="typeColor"
            text-color="white"
            class="type-chip"
          >
            {{ translateType(node.accountType) }}
          </q-chip>
          <span class="balance" v-if="node.openingBalance !== 0">
            {{ formatNumber(node.openingBalance) }}
          </span>
        </div>
      </div>

      <!-- Children count badge -->
      <q-badge
        v-if="hasChildren"
        color="grey-5"
        text-color="white"
        floating
        class="children-badge"
      >
        {{ node.children!.length }}
      </q-badge>
    </div>

    <!-- Children nodes with connecting lines -->
    <Transition name="expand">
      <div v-if="isExpanded && hasChildren" class="node-children">
        <div class="tree-line" />
        <TreeNode
          v-for="child in node.children"
          :key="child.name"
          :node="child"
          :depth="depth + 1"
          :expanded-nodes="expandedNodes"
          @toggle="$emit('toggle', $event)"
        />
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLcI18n } from 'quasar-app-extension-fastfree-lowcode/src/runtime/i18n'
import type { Account, AccountType } from '../types'

const { t } = useLcI18n()

const props = defineProps<{
  node: Account & { children?: Account[] }
  depth: number
  expandedNodes: Record<string, boolean>
}>()

const emit = defineEmits<{
  toggle: [nodeName: string]
}>()

const hasChildren = computed(() => {
  return props.node.children && props.node.children.length > 0
})

const isExpanded = computed(() => {
  return !!props.expandedNodes[props.node.name]
})

const typeColor = computed(() => {
  const map: Record<AccountType, string> = {
    Asset: '#1976d2',
    Liability: '#d32f2f',
    Equity: '#7b1fa2',
    Income: '#388e3c',
    Expense: '#f57c00',
  }
  return map[props.node.accountType] ?? '#757575'
})

function translateType(type: AccountType): string {
  return t(`accounting.${type.toLowerCase()}`)
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat().format(n)
}

function handleClick() {
  if (hasChildren.value) {
    emit('toggle', props.node.name)
  }
}
</script>

<script lang="ts">
export default {
  name: 'TreeNode',
}
</script>

<style lang="scss" scoped>
.tree-node {
  position: relative;

  &.is-root {
    margin-bottom: 4px;
  }
}

.node-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;

  &:hover {
    background: rgba(25, 118, 210, 0.06);
  }

  &.is-group {
    .node-name {
      font-weight: 600;
      color: var(--lc-on-surface, #333);
    }
  }

  &.has-children {
    cursor: pointer;
  }
}

.node-arrow {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;

  &.visible {
    opacity: 1;
  }

  .arrow-icon {
    color: var(--lc-on-surface-variant, #666);
    transition: transform 0.2s ease;
  }
}

.type-indicator {
  width: 4px;
  height: 24px;
  border-radius: 2px;
  flex-shrink: 0;
}

.node-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &.group-icon {
    background: linear-gradient(135deg, #ffb300 0%, #ff8f00 100%);
    color: white;
  }

  &.account-icon {
    background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
    color: #1976d2;
  }
}

.node-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.node-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--lc-on-surface, #333);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.node-meta {
  display: flex;
  align-items: center;
  gap: 8px;

  .type-chip {
    font-size: 10px;
    height: 18px;
    padding: 0 6px;
  }

  .balance {
    font-size: 12px;
    color: var(--lc-on-surface-variant, #666);
    font-family: monospace;
    direction: ltr;
  }
}

.children-badge {
  font-size: 10px;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
}

.node-children {
  position: relative;
  margin-inline-start: 32px;
  padding-inline-start: 16px;

  .tree-line {
    position: absolute;
    inset-inline-start: 0;
    top: 0;
    bottom: 12px;
    width: 2px;
    background: linear-gradient(180deg, #e0e0e0 0%, transparent 100%);
    border-radius: 1px;
  }
}

// Expand animation
.expand-enter-active,
.expand-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 1000px;
}
</style>
