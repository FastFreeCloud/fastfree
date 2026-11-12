import sqlite3
import json

db_path = r"C:\Users\FastFree\AppData\Roaming\ai.opencode.desktop\drafts.sqlite"
conn = sqlite3.connect(db_path)
c = conn.cursor()

for tbl in ['document', 'state', 'plugin']:
    c.execute(f"PRAGMA table_info({tbl})")
    print(f"Schema {tbl}:", c.fetchall())

print("\n--- Searching in `document` ---")
c.execute("SELECT id, collection, length(content) FROM document WHERE id LIKE '%kanban%' OR collection LIKE '%kanban%' OR id LIKE '%board%'")
for r in c.fetchall():
    print("Document:", r)

print("\n--- Searching in `state` ---")
c.execute("SELECT id, length(data) FROM state WHERE id LIKE '%kanban%' OR id LIKE '%board%'")
for r in c.fetchall():
    print("State:", r)

conn.close()
