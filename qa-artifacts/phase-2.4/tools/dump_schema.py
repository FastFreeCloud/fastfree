import json
for f in ['step6_launchpad.json', 'clan_launchpad_dashboard.json']:
    p = 'apps/fastfree_installer/src/schemas/' + f
    d = json.load(open(p, encoding='utf-8'))
    print('=====', f, 'id=', d.get('id'))
    def walk(n, dep=0):
        t = n.get('type')
        if t == 'button':
            lab = n.get('props', {}).get('label')
            if isinstance(lab, dict):
                lab = lab.get('en')
            print('  ' * dep + 'BUTTON: ' + str(lab))
        for c in (n.get('children') or []):
            walk(c, dep + 1)
    walk(d.get('root', {}))
