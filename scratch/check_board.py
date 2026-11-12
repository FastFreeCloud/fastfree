import sqlite3
import json

db_path = r"C:\Users\FastFree\.gemini\antigravity\drafts.sqlite"
conn = sqlite3.connect(db_path)
c = conn.cursor()
c.execute("SELECT id, content FROM drafts WHERE id LIKE '%kanban%'")
row = c.fetchone()
if row:
    print("Found board draft:", row[0])
    data = json.loads(row[1])
    tasks = data.get("tasks", [])
    print(f"Total tasks: {len(tasks)}")
    for t in tasks:
        print(f" - [{t.get('status')}] {t.get('title')}")
else:
    print("No kanban board found in drafts.sqlite")
conn.close()
