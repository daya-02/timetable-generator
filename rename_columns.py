import sqlite3
import os

db_path = "backend/timetable.db"
if not os.path.exists(db_path):
    print("DB not found")
else:
    conn = sqlite3.connect(db_path)
    c = conn.cursor()

    try:
        c.execute("ALTER TABLE subjects RENAME COLUMN seminar_hours_per_week TO self_study_hours_per_week;")
        print("Renamed seminar to self_study")
    except Exception as e:
        print("1:", e)

    try:
        c.execute("ALTER TABLE subjects RENAME COLUMN internship_hours_per_week TO seminar_hours_per_week;")
        print("Renamed internship to seminar")
    except Exception as e:
        print("2:", e)
        
    try:
        c.execute("ALTER TABLE subjects RENAME COLUMN internship_block_size TO seminar_block_size;")
    except Exception as e:
        print("3:", e)

    try:
        c.execute("ALTER TABLE subjects RENAME COLUMN internship_day_based TO seminar_day_based;")
    except Exception as e:
        print("4:", e)

    try:
        c.execute("ALTER TABLE elective_baskets ADD COLUMN self_study_hours_per_week INTEGER DEFAULT 0;")
        print("Added self_study to elective_baskets")
    except Exception as e:
        print("5:", e)

    conn.commit()
    conn.close()
    print("Migration complete")
