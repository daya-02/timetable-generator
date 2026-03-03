import sqlite3
import json

db_path = "timetable.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Set EVEN semester lunch_slot to 2 (after 3rd period)
cursor.execute("SELECT id, timing_structure FROM semester_templates WHERE semester_type='EVEN'")
row = cursor.fetchone()
if row:
    tid, timing_str = row
    timing = json.loads(timing_str) if timing_str else {}
    timing["lunch_slot"] = 2
    
    cursor.execute("""
        UPDATE semester_templates 
        SET lunch_slot=2, 
            break_slots='[1, 4]', 
            timing_structure=? 
        WHERE id=?
    """, (json.dumps(timing), tid))
    print("Updated EVEN template: lunch_slot=2 (3 periods before lunch, 4 periods after lunch)")
else:
    print("EVEN template not found.")

conn.commit()
conn.close()
