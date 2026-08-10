<template>
  <div class="chart-of-accounts q-pa-md">
    <q-card flat bordered class="tree-card">
      <q-card-section class="tree-header row items-center q-gutter-sm">
        <div class="header-icon">
          <q-icon name="mdi-sitemap" size="2.2rem" color="primary" />
        </div>
        <div class="header-text">
          <div class="text-h6 text-weight-bold">{{ t('accounting.chartOfAccounts') }}</div>
          <div class="text-caption text-grey-6">{{ totalAccounts }} {{ t('accounting.totalAccounts') }}</div>
        </div>
        <q-space />
        <q-btn color="primary" icon="mdi-plus" :label="t('accounting.addAccount')" no-caps rounded @click="showAdd = true" />
      </q-card-section>

      <q-card-section class="tree-search">
        <q-input v-model="search" :placeholder="t('common.search')" dense outlined clearable class="search-input">
          <template #prepend><q-icon name="mdi-magnify" color="grey-5" /></template>
          <template #append>
            <q-chip dense size="sm" color="primary" text-color="white" class="count-chip">
              {{ filteredTree.length }}
            </q-chip>
          </template>
        </q-input>
      </q-card-section>

      <q-card-section class="tree-content">
        <div v-if="filteredTree.length === 0" class="empty-tree">
          <q-icon name="mdi-file-tree-outline" size="64px" color="grey-4" />
          <div class="text-subtitle1 text-grey-5 q-mt-sm">{{ t('groups.noResults') }}</div>
        </div>

        <div v-else class="tree-container">
          <TreeNode
            v-for="node in filteredTree"
            :key="node.name"
            :node="node"
            :depth="0"
            :expanded-nodes="expandedNodes"
            @toggle="toggleNode"
          />
        </div>
      </q-card-section>
    </q-card>

    <!-- Add Account Dialog -->
    <q-dialog v-model="showAdd" persistent>
      <q-card style="min-width: 420px" class="add-dialog">
        <q-card-section class="row items-center q-pb-none">
          <q-icon name="mdi-plus-circle" size="24px" color="primary" class="q-mr-sm" />
          <div class="text-h6">{{ t('accounting.addAccount') }}</div>
          <q-space />
          <q-btn icon="mdi-close" flat round dense @click="showAdd = false" />
        </q-card-section>
        <q-card-section>
          <q-input v-model="newAccount.accountName" :label="t('accounting.accountName')" outlined class="q-mb-sm" dense :rules="[val => !!val || t('accounting.fieldRequired')]" lazy-rules>
            <template #prepend><q-icon name="mdi-label-outline" /></template>
          </q-input>
          <q-select v-model="newAccount.accountType" :options="accountTypeOptions" :label="t('accounting.accountType')" outlined class="q-mb-sm" emit-value map-options dense :rules="[val => !!val || t('accounting.fieldRequired')]" lazy-rules>
            <template #prepend><q-icon name="mdi-tag-outline" /></template>
          </q-select>
          <q-select v-model="newAccount.rootType" :options="rootTypeOptions" :label="t('accounting.rootType')" outlined class="q-mb-sm" emit-value map-options dense>
            <template #prepend><q-icon name="mdi-folder-outline" /></template>
          </q-select>
          <q-input v-model.number="newAccount.openingBalance" :label="t('accounting.openingBalance')" outlined type="number" dense>
            <template #prepend><q-icon name="mdi-cash" /></template>
          </q-input>
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat :label="t('common.cancel')" no-caps @click="showAdd = false" />
          <q-btn color="primary" :label="t('common.save')" no-caps rounded @click="saveAccount" icon="mdi-check" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useLcI18n } from 'quasar-app-extension-fastfree-lowcode/src/runtime/i18n'
import { useAccountingStore } from '../stores/useAccountingStore'
import type { Account, AccountType, AccountRootType } from '../types'
import TreeNode from './TreeNode.vue'

const { t } = useLcI18n()
const $q = useQuasar()
const store = useAccountingStore()

const search = ref('')
const showAdd = ref(false)
const expandedNodes = ref<Record<string, boolean>>({})
const accountTypes: AccountType[] = ['Asset', 'Liability', 'Equity', 'Income', 'Expense']
const rootTypes: AccountRootType[] = ['Balance Sheet', 'Profit and Loss']

const accountTypeOptions = computed(() => accountTypes.map(type => ({ label: t(`accounting.${type.toLowerCase()}`), value: type })))
const rootTypeOptions = computed(() => rootTypes.map(type => ({ label: t(`accounting.${type === 'Balance Sheet' ? 'balanceSheet' : 'profitAndLoss'}`), value: type })))

const newAccount = ref({
  accountName: '',
  accountType: 'Asset' as AccountType,
  rootType: 'Balance Sheet' as AccountRootType,
  openingBalance: 0,
})

const totalAccounts = computed(() => {
  let count = 0
  function countNodes(nodes: (Account & { children?: Account[] })[]) {
    for (const node of nodes) {
      count++
      if (node.children) countNodes(node.children)
    }
  }
  countNodes(store.accountTree)
  return count
})

const filteredTree = computed(() => {
  if (!search.value) {
    return store.accountTree
  }
  const q = search.value.toLowerCase()
  return filterTree(store.accountTree, q)
})

function expandAllNodes(nodes: (Account & { children?: Account[] })[]) {
  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      expandedNodes.value[node.name] = true
    }
    if (node.children) {
      expandAllNodes(node.children)
    }
  }
}

watch(filteredTree, (tree) => {
  expandAllNodes(tree)
}, { immediate: true })

function filterTree(nodes: (Account & { children?: Account[] })[], query: string): (Account & { children?: Account[] })[] {
  return nodes.filter(node => {
    const match = node.accountName.toLowerCase().includes(query)
    const childMatch = node.children && filterTree(node.children, query).length > 0
    return match || childMatch
  }).map(node => ({
    ...node,
    children: node.children ? filterTree(node.children, query) : [],
  }))
}

function toggleNode(nodeName: string) {
  expandedNodes.value[nodeName] = !expandedNodes.value[nodeName]
}

async function saveAccount() {
  if (!newAccount.value.accountName) {
    $q.notify({ type: 'warning', message: t('accounting.fieldRequired') })
    return
  }
  try {
    const { createAccount } = await import('../services/account.service')
    const result = await createAccount({
      accountName: newAccount.value.accountName,
      accountType: newAccount.value.accountType,
      rootType: newAccount.value.rootType,
      openingBalance: newAccount.value.openingBalance,
    })
    if (result.success) {
      await store.fetchAccounts()
      showAdd.value = false
      newAccount.value = { accountName: '', accountType: 'Asset', rootType: 'Balance Sheet', openingBalance: 0 }
    } else {
      $q.notify({ type: 'negative', message: result.error?.message ?? t('common.error') })
    }
  } catch (e) {
    $q.notify({ type: 'negative', message: (e as Error).message ?? t('common.error') })
  }
}

onMounted(() => store.fetchAccounts())
</script>

<style lang="scss" scoped>
.chart-of-accounts {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.tree-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  overflow: hidden;
  background: var(--lc-surface, #fafafa);
}

.tree-header {
  background: linear-gradient(135deg, var(--lc-primary, #1976d2) 0%, var(--lc-primary-dark, #1565c0) 100%);
  color: white;
  padding: 16px 20px;

  .header-icon {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    padding: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .header-text {
    .text-h6 {
      margin: 0;
      line-height: 1.2;
    }
    .text-caption {
      margin: 0;
      opacity: 0.9;
    }
  }
}

.tree-search {
  padding: 12px 20px;
  background: white;
  border-bottom: 1px solid var(--lc-border, #e0e0e0);

  .search-input {
    :deep(.q-field__control) {
      border-radius: 24px;
      background: #f5f5f5;
    }
  }

  .count-chip {
    font-size: 11px;
    min-width: 24px;
    height: 20px;
  }
}

.tree-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  background: white;
}

.tree-container {
  // Indentation handled by TreeNode component
}

.empty-tree {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: var(--lc-on-surface-variant, #999);
}

.add-dialog {
  border-radius: 16px;
}
</style>
