import sqlite3

conn = sqlite3.connect('timetable.db')
cursor = conn.cursor()

columns_to_add = [
    ("theory_hours", "INTEGER DEFAULT 3"),
    ("lab_hours", "INTEGER DEFAULT 2"),
    ("continuous_lab_periods", "INTEGER DEFAULT 2"),
    ("same_slot_across_departments", "BOOLEAN DEFAULT 1"),
    ("allow_lab_parallel", "BOOLEAN DEFAULT 0")
]

for col, dtype in columns_to_add:
    try:
        cursor.execute(f"ALTER TABLE structured_composite_baskets ADD COLUMN {col} {dtype}")
        print(f"Added column {col}")
    except sqlite3.OperationalError as e:
        print(f"Skipped {col}: {e}")

conn.commit()
conn.close()
