import sqlite3
import json

db_path = r"C:\Users\FastFree\AppData\Roaming\ai.opencode.desktop\drafts.sqlite"
conn = sqlite3.connect(db_path)
c = conn.cursor()

c.execute("SELECT value FROM state WHERE key = 'plugin.fastfree_board.kanban-v2'")
row = c.fetchone()
data = json.loads(row[0])
cards = data.get("cards", [])
print(f"Total tasks on fastfree_board: {len(cards)}")

status_counts = {}
for card in cards:
    st = card.get("status")
    status_counts[st] = status_counts.get(st, 0) + 1

print("\nStatus Breakdown:")
for st, count in status_counts.items():
    print(f"  - {st.upper()}: {count} tasks")

print("\nApp & Package Coverage:")
for idx, card in enumerate(cards):
    print(f"[{idx+1:02d}] [{card.get('status').upper():<8}] {card.get('title')}")

conn.close()
