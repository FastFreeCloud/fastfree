<script lang="ts">
import { ref, h, defineComponent, type VNode } from 'vue'
import { useQuasar } from 'quasar'
import { useLcI18n } from '../i18n'

interface TreeNode {
  key: string
  value: unknown
  type: string
  children: TreeNode[]
}

export default defineComponent({
  name: 'PiniaStateTreeView',
  props: {
    nodes: { type: Array as () => TreeNode[], required: true },
    store: { type: Object, required: true }
  },
  emits: ['update'],
  setup(props, { emit }) {
    const expanded = ref(new Set<string>())
    const $q = useQuasar()
    const { t } = useLcI18n()

    function toggleExpand(path: string) {
      if (expanded.value.has(path)) expanded.value.delete(path)
      else expanded.value.add(path)
    }

    function editValue(node: TreeNode) {
      if (typeof node.value === 'object' && node.value !== null) return
      $q.dialog({
        title: `${t('debugger.edit')} ${node.key.split('.').pop()}`,
        message: node.key,
        prompt: {
          model: JSON.stringify(node.value),
          type: 'text',
          isValid: (val: string) => { try { JSON.parse(val); return true } catch { return val.length > 0 } }
        },
        cancel: true,
        persistent: true
      }).onOk((val: string) => {
        try {
          emit('update', node.key, JSON.parse(val))
        } catch {
          emit('update', node.key, val)
        }
      })
    }

    function renderNode(node: TreeNode, depth = 0): VNode {
      const hasChildren = node.children.length > 0
      const isExpanded = expanded.value.has(node.key)

      return h('div', { style: { marginLeft: `${depth * 16}px` } }, [
        h('div', {
          style: 'display: flex; align-items: center; gap: 6px; padding: 3px 4px; border-radius: 4px; min-height: 28px;',
          class: 'tree-node'
        }, [
          hasChildren
            ? h('span', {
                style: 'cursor: pointer; width: 14px; display: inline-block; font-size: 10px; text-align: center; user-select: none;',
                onClick: () => toggleExpand(node.key)
              }, isExpanded ? '\u25BC' : '\u25B6')
            : h('span', { style: 'width: 14px; display: inline-block;' }),
          h('strong', { style: 'color: var(--q-primary, #1976d2); min-width: 80px; font-size: 12px; word-break: break-all;' },
            node.key.split('.').pop()),
          h('span', { style: 'color: #999; font-size: 10px; min-width: 40px;' }, `(${node.type})`),
          h('span', {
            style: 'color: #666; font-family: monospace; flex: 1; font-size: 11px; word-break: break-all; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 300px;'
          },
            typeof node.value === 'object'
              ? (Array.isArray(node.value) ? `[${node.value.length}]` : '{...}')
              : String(node.value)
          ),
          !hasChildren
            ? h('button', {
                style: 'font-size: 10px; padding: 2px 8px; border: 1px solid #ccc; border-radius: 4px; background: #fff; cursor: pointer; white-space: nowrap;',
                onClick: () => editValue(node)
              }, t('debugger.edit'))
            : null
        ]),
        hasChildren && isExpanded
          ? h('div', { class: 'tree-children' }, node.children.map(c => renderNode(c, depth + 1)))
          : null
      ])
    }

    return () => h('div', { class: 'pinia-tree' },
      props.nodes.length === 0
        ? h('div', { style: 'color: #999; padding: 16px; text-align: center;' }, t('debugger.noState'))
        : props.nodes.map(node => renderNode(node))
    )
  }
})
</script>

<style scoped>
.pinia-tree { font-family: monospace; font-size: 12px; }
.tree-node:hover { background: rgba(0, 0, 0, 0.03); }
.tree-children { border-left: 1px dashed #e0e0e0; margin-left: 4px; }
</style>
