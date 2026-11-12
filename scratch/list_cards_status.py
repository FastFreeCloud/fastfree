import sqlite3
import json

db_path = r"C:\Users\FastFree\AppData\Roaming\ai.opencode.desktop\drafts.sqlite"
conn = sqlite3.connect(db_path)
c = conn.cursor()

c.execute("SELECT value FROM state WHERE key = 'plugin.fastfree_board.kanban-v2'")
row = c.fetchone()
data = json.loads(row[0])
cards = data.get("cards", [])
print(f"Total cards: {len(cards)}")
for c_item in cards:
    print(f"- [{c_item.get('status')}] {c_item.get('title')}")
conn.close()
