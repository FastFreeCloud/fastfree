import json, os, sys

base = 'apps/fastfree_installer/src/schemas'
names = {1: 'discovery', 2: 'license', 3: 'sizing', 4: 'wireguard', 5: 'provisioning', 6: 'launchpad'}
INTERACTIVE = ('input', 'slider', 'button', 'tab', 'tabs', 'select', 'toggle', 'checkbox', 'switch', 'radio', 'card')

def text_of(node):
    t = node.get('text')
    if isinstance(t, dict):
        return t.get('en') or t.get('ar')
    return t

for n in range(1, 7):
    p = os.path.join(base, 'step%d_%s.json' % (n, names[n]))
    d = json.load(open(p, encoding='utf-8'))
    print('===== STEP %d: %s =====' % (n, d.get('id')))
    print('title:', text_of(d))

    def walk(node, depth=0):
        t = node.get('type')
        props = node.get('props', {}) or {}
        if t in INTERACTIVE:
            label = text_of(node)
            keep = {k: v for k, v in props.items() if k in ('label', 'icon', 'name', 'value', 'role', 'type', 'placeholder', 'model')}
            print('  ' * depth + '[%s] model=%s label=%r action=%s props=%s' % (
                t, node.get('model'), label, node.get('action'), keep))
        for c in (node.get('children') or []):
            walk(c, depth + 1)
    walk(d.get('root', {}))
    print()
