import sqlite3
import json

with open("./guns.json", "r") as f:
    data = json.load(f)

conn = sqlite3.connect("./server-side-stuff/guns.db")
cursor = conn.cursor()

rows = []
for block in data:
    for entry in block.values():
        name = entry["name"]
        mag = entry["magazine_supported"]["name"]

        ammo = []
        for ammo_type, ammo_data in entry["supported_ammo"].items():
            ammo.append({
                "type": ammo_type,
                "velocity": int(ammo_data.get("velocity")),
                "weight": float(ammo_data.get("weight") or ammo_data.get("weigth"))
            })

        rows.append((name, mag, json.dumps(ammo)))

cursor.executemany(
    "INSERT OR REPLACE INTO guns (name, mag, ammo) VALUES (?, ?, ?)",
    rows
)

conn.commit()
print(f"{len(rows)} armes insérées.")
conn.close()