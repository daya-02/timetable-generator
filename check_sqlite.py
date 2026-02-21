import sqlite3
import os

DB_PATH = "backend/timetable.db"  # Assuming default location

def check_sqlite():
    if not os.path.exists(DB_PATH):
        print(f"Database file not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print("Checking table 'class_subject_teachers'...")
    try:
        cursor.execute("PRAGMA table_info(class_subject_teachers)")
        columns = [row[1] for row in cursor.fetchall()]
        print(f"Columns: {columns}")
        
        if 'parallel_lab_group' in columns:
            print("✅ 'parallel_lab_group' column exists.")
            
            # Check data
            cursor.execute("SELECT id, parallel_lab_group FROM class_subject_teachers WHERE parallel_lab_group IS NOT NULL")
            rows = cursor.fetchall()
            print(f"Found {len(rows)} rows with parallel_lab_group set:")
            for row in rows:
                print(row)
        else:
            print("❌ 'parallel_lab_group' column MISSING!")
            # Attempt to add it
            print("Attempting to add column...")
            try:
                cursor.execute("ALTER TABLE class_subject_teachers ADD COLUMN parallel_lab_group VARCHAR(100)")
                conn.commit()
                print("✅ Column added successfully.")
            except Exception as e:
                print(f"Failed to add column: {e}")

    except Exception as e:
        print(f"Error checking table: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    check_sqlite()
