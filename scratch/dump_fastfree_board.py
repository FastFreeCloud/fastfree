import sqlite3
import json

db_path = r"C:\Users\FastFree\AppData\Roaming\ai.opencode.desktop\drafts.sqlite"
conn = sqlite3.connect(db_path)
c = conn.cursor()

c.execute("SELECT value FROM state WHERE key = 'plugin.fastfree_board.kanban-v2'")
row = c.fetchone()
if row:
    data = json.loads(row[0])
    print("Columns:", [col.get("id") or col.get("title") for col in data.get("columns", [])])
    cards = data.get("cards", [])
    print(f"\nTotal tasks/cards in fastfree_board: {len(cards)}")
    for idx, card in enumerate(cards):
        print(f"[{idx+1:02d}] ID: {card.get('id')} | Col: {card.get('column')} | Title: {card.get('title')}")
else:
    print("Not found")

conn.close()
