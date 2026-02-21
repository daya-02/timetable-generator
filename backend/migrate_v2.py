"""
Migration v2: Backend Stability & Performance
- Add missing indexes on existing tables
- Add 'year' column to elective_baskets if missing
- Safe: Will NOT delete data, only ADD columns/indexes
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "timetable.db")

def run_migration():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}. Will be created on server start.")
        return
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Enable WAL mode
    cursor.execute("PRAGMA journal_mode=WAL")
    
    migrations = []
    
    # 1. Add 'year' column to elective_baskets if missing
    cursor.execute("PRAGMA table_info(elective_baskets)")
    cols = [row[1] for row in cursor.fetchall()]
    if 'year' not in cols:
        migrations.append(("ALTER TABLE elective_baskets ADD COLUMN year INTEGER DEFAULT 2", "Added 'year' column to elective_baskets"))
    
    # 2. Add indexes (IF NOT EXISTS is available in SQLite 3.9.0+)
    index_defs = [
        ("ix_rooms_dept_id", "rooms", "dept_id"),
        ("ix_teachers_dept_id", "teachers", "dept_id"),
        ("ix_teachers_teacher_code", "teachers", "teacher_code"),
        ("ix_subjects_dept_id", "subjects", "dept_id"),
        ("ix_subjects_elective_basket_id", "subjects", "elective_basket_id"),
        ("ix_semesters_dept_id", "semesters", "dept_id"),
        ("ix_allocations_teacher_id", "allocations", "teacher_id"),
        ("ix_allocations_subject_id", "allocations", "subject_id"),
        ("ix_allocations_semester_id", "allocations", "semester_id"),
        ("ix_allocations_room_id", "allocations", "room_id"),
        ("ix_allocations_day", "allocations", "day"),
        ("ix_allocations_sem_day_slot", "allocations", "semester_id, day, slot"),
        ("ix_allocations_teacher_day_slot", "allocations", "teacher_id, day, slot"),
        ("ix_cst_semester_id", "class_subject_teachers", "semester_id"),
        ("ix_cst_subject_id", "class_subject_teachers", "subject_id"),
        ("ix_cst_teacher_id", "class_subject_teachers", "teacher_id"),
    ]
    
    for idx_name, table, columns in index_defs:
        sql = f"CREATE INDEX IF NOT EXISTS {idx_name} ON {table}({columns})"
        migrations.append((sql, f"Index {idx_name} on {table}({columns})"))
    
    # Execute
    success = 0
    for sql, desc in migrations:
        try:
            cursor.execute(sql)
            print(f"  ✓ {desc}")
            success += 1
        except Exception as e:
            print(f"  ✗ {desc}: {e}")
    
    conn.commit()
    conn.close()
    
    print(f"\nMigration complete: {success}/{len(migrations)} operations succeeded.")

if __name__ == "__main__":
    print("Running Migration v2: Indexes + Schema Updates")
    print("=" * 50)
    run_migration()
