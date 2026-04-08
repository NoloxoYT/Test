import sqlite3
import json

# JSON data
with open("guns.json", "r") as f:
    data = json.load(f)

# Connect to DB
conn = sqlite3.connect("range.db")
cursor = conn.cursor()

conn = sqlite3.connect("./server-side-stuff/range.db")
cursor = conn.cursor()

rows = []
for block in data:
    for entry in block.values():
        rows.append((entry["name"], int(entry["range"])))

cursor.executemany("INSERT INTO range (gun_name, range) VALUES (?, ?)", rows)
conn.commit()

print(f"{len(rows)} armes insérées.")

conn.close()