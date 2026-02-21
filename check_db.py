import sqlite3

conn = sqlite3.connect('database/timetable.db')
cursor = conn.cursor()

# Check tables
tables = ["semesters", "teachers", "subjects", "allocations"]
print("Table Counts:")
for t in tables:
    try:
        cursor.execute(f"SELECT count(*) FROM {t}")
        print(f"{t}: {cursor.fetchone()[0]}")
    except:
        print(f"{t}: Error/Missing")

# Check Departments
print("\nSemesters by Dept:")
try:
    cursor.execute("SELECT dept_id, count(*) FROM semesters GROUP BY dept_id")
    rows = cursor.fetchall()
    print("Dept ID | Count")
    for r in rows:
        print(f"{r[0]}       | {r[1]}")
except Exception as e:
    print(f"Error querying headers: {e}")
    # Check if column exists
    cursor.execute("PRAGMA table_info(semesters)")
    cols = [r[1] for r in cursor.fetchall()]
    print(f"Columns in semesters: {cols}")

conn.close()
