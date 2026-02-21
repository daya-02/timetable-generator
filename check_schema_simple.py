import sqlite3
import os

DB_PATH = "timetable.db"

def check_schema():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    tables_to_check = {
        "class_subject_teachers": ["parallel_lab_group", "batch_id"],
        "allocations": ["batch_id"]
    }

    for table, columns in tables_to_check.items():
        print(f"Checking table: {table}")
        cursor.execute(f"PRAGMA table_info({table})")
        existing_columns = [info[1] for info in cursor.fetchall()]
        
        for col in columns:
            if col in existing_columns:
                print(f"  [OK] Column '{col}' exists.")
            else:
                print(f"  [MISSING] Column '{col}' is MISSING!")

    conn.close()

if __name__ == "__main__":
    check_schema()
