import json, os

base = 'apps/fastfree_installer/src/schemas'
names = {1: 'discovery', 2: 'license', 3: 'sizing', 4: 'wireguard', 5: 'provisioning', 6: 'launchpad'}

def text_of(node):
    t = node.get('text')
    if isinstance(t, dict):
        return t.get('en') or t.get('ar')
    if isinstance(t, str):
        return t
    p = node.get('props', {}) or {}
    l = p.get('label')
    if isinstance(l, dict):
        return l.get('en') or l.get('ar')
    return l

for n in range(1, 7):
    p = os.path.join(base, 'step%d_%s.json' % (n, names[n]))
    d = json.load(open(p, encoding='utf-8'))
    print('===== STEP %d =====' % n)

    def walk(node, depth=0):
        ev = node.get('events')
        act = node.get('action')
        if ev or act:
            print('  ' * depth + 'NODE type=%s model=%s label=%r id=%s' % (
                node.get('type'), node.get('model'), text_of(node), node.get('id')))
            if act:
                print('  ' * depth + '  action=' + json.dumps(act, ensure_ascii=False))
            if ev:
                print('  ' * depth + '  events=' + json.dumps(ev, ensure_ascii=False))
        for c in (node.get('children') or []):
            walk(c, depth + 1)
    walk(d.get('root', {}))
    print()
