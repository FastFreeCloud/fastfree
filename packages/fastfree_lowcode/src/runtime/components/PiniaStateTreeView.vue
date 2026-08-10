<script lang="ts">
import { ref, h, defineComponent, type VNode } from 'vue'
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
    const { t } = useLcI18n()

    function toggleExpand(path: string) {
      if (expanded.value.has(path)) expanded.value.delete(path)
      else expanded.value.add(path)
    }

    function editValue(node: TreeNode) {
      if (typeof node.value === 'object' && node.value !== null) return
      const newVal = prompt(`${t('debugger.edit')} ${node.key}:`, JSON.stringify(node.value))
      if (newVal !== null) {
        try {
          emit('update', node.key, JSON.parse(newVal))
        } catch {
          emit('update', node.key, newVal)
        }
      }
    }

    function renderNode(node: TreeNode, depth = 0): VNode {
      const hasChildren = node.children.length > 0
      const isExpanded = expanded.value.has(node.key)

      return h('div', { style: { marginLeft: `${depth * 20}px` } }, [
        h('div', { style: 'display: flex; align-items: center; gap: 8px; padding: 2px 0;' }, [
          hasChildren
            ? h('span', {
                style: 'cursor: pointer; width: 16px; display: inline-block;',
                onClick: () => toggleExpand(node.key)
              }, isExpanded ? '\u25BC' : '\u25B6')
            : h('span', { style: 'width: 16px; display: inline-block;' }),
          h('strong', { style: 'color: #333; min-width: 150px;' }, node.key.split('.').pop()),
          h('span', { style: 'color: #999; font-size: 11px;' }, `(${node.type})`),
          h('span', { style: 'color: #666; font-family: monospace; flex: 1;' },
            typeof node.value === 'object'
              ? (Array.isArray(node.value) ? `[${node.value.length}]` : '{...}')
              : JSON.stringify(node.value)
          ),
          !hasChildren
            ? h('button', {
                style: 'font-size: 10px; padding: 2px 6px; margin-left: 8px;',
                onClick: () => editValue(node)
              }, t('debugger.edit'))
            : null
        ]),
        hasChildren && isExpanded
          ? h('div', node.children.map(c => renderNode(c, depth + 1)))
          : null
      ])
    }

    return () => h('div', { class: 'pinia-tree' },
      props.nodes.map(node => renderNode(node))
    )
  }
})
</script>

<style scoped>
.pinia-tree button { padding: 2px 6px; border: 1px solid #ccc; border-radius: 4px; background: #fff; cursor: pointer; }
.pinia-tree button:hover { background: #f5f5f5; }
</style>
