import sqlite3
db = '.hermes/kanban/boards/fastfree-erp/kanban.db'
con = sqlite3.connect(db)
con.row_factory = sqlite3.Row
cur = con.cursor()
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
print('tables:', [r[0] for r in cur.fetchall()])
for t in [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]:
    cur.execute("PRAGMA table_info(%s)" % t)
    cols = [c[1] for c in cur.fetchall()]
    print(t, cols)
try:
    cur.execute("SELECT id, title, status, assignee FROM tasks ORDER BY created_at DESC LIMIT 50")
    for r in cur.fetchall():
        print(r['id'], '|', r['status'], '|', r['assignee'], '|', r['title'][:90])
except Exception as e:
    print('err', e)
