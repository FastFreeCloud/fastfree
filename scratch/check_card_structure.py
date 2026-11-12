import sqlite3
import json

db_path = r"C:\Users\FastFree\AppData\Roaming\ai.opencode.desktop\drafts.sqlite"
conn = sqlite3.connect(db_path)
c = conn.cursor()

c.execute("SELECT value FROM state WHERE key = 'plugin.fastfree_board.kanban-v2'")
row = c.fetchone()
data = json.loads(row[0])
print("First card sample:")
print(json.dumps(data["cards"][0], ensure_ascii=False, indent=2))
print("\nColumns structure:")
print(json.dumps(data["columns"], ensure_ascii=False, indent=2))
conn.close()
