import sqlite3

db_path = r"C:\Users\FastFree\.gemini\antigravity\drafts.sqlite"
conn = sqlite3.connect(db_path)
c = conn.cursor()
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = c.fetchall()
print("Tables:", tables)
for t in tables:
    c.execute(f"PRAGMA table_info({t[0]})")
    print(f"Schema for {t[0]}:", c.fetchall())
    c.execute(f"SELECT * FROM {t[0]} LIMIT 2")
    print(f"Sample row in {t[0]}:", c.fetchall())
conn.close()
