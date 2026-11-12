import sqlite3
import json

db_path = r"C:\Users\FastFree\AppData\Roaming\ai.opencode.desktop\drafts.sqlite"
conn = sqlite3.connect(db_path)
c = conn.cursor()

print("--- Querying document ---")
c.execute("SELECT key FROM document WHERE key LIKE '%kanban%' OR key LIKE '%board%'")
docs = c.fetchall()
for d in docs:
    print("Found doc key:", d[0])
    c.execute("SELECT value FROM document WHERE key = ?", (d[0],))
    val = c.fetchone()[0]
    try:
        parsed = json.loads(val)
        if "cards" in parsed:
            print(f"  -> {len(parsed['cards'])} cards in {d[0]}")
            for idx, card in enumerate(parsed["cards"]):
                print(f"     [{idx+1}] [{card.get('column')}] {card.get('title')}")
        else:
            print(f"  -> keys: {list(parsed.keys())}")
    except Exception as e:
        print("  -> error parsing JSON:", e)

print("\n--- Querying state ---")
c.execute("SELECT name, key FROM state WHERE name LIKE '%kanban%' OR name LIKE '%board%' OR key LIKE '%kanban%' OR key LIKE '%board%'")
states = c.fetchall()
for s in states:
    print("Found state:", s)

conn.close()
