
import sqlite3
import os

conn = sqlite3.connect('backend/timetable.db')
cursor = conn.cursor()

# Check Business Comm for AIML (Sem 5)
cursor.execute("""
    SELECT s.name, a.day, a.slot 
    FROM allocations a 
    JOIN subjects s ON a.subject_id=s.id 
    WHERE a.semester_id=5 AND s.name LIKE '%Business Communication%'
    ORDER BY a.day, a.slot
""")
rows = cursor.fetchall()
print("AIML Business Communication Slots:")
for r in rows:
    print(r)

# Check for continuity
slots_by_day = {}
for r in rows:
    day = r[1]
    slot = r[2]
    if day not in slots_by_day:
        slots_by_day[day] = []
    slots_by_day[day].append(slot)

for day, slots in slots_by_day.items():
    sorted_slots = sorted(slots)
    print(f"Day {day}: {sorted_slots}")
    # Verify continuity (e.g. 0,1 or 3,4)
    if len(sorted_slots) >= 2:
        is_cont = True
        for i in range(len(sorted_slots)-1):
            if sorted_slots[i+1] != sorted_slots[i] + 1:
                is_cont = False
        print(f"  Continuous? {is_cont}")

conn.close()
