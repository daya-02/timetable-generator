
import sqlite3
import os
import sys

# Force UTF-8 for stdout
sys.stdout.reconfigure(encoding='utf-8')

DB_PATH = 'backend/timetable.db'
if not os.path.exists(DB_PATH):
    DB_PATH = 'timetable.db'

print(f"Connecting to {DB_PATH}")
conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

def diagnose():
    with open("diag_output_new.txt", "w", encoding="utf-8") as f:
        def log(msg):
            print(msg)
            f.write(msg + "\n")

        log("Diagnosis for 2nd Year (Semesters assigned year=2)")
        
        # Get 2nd year semesters
        cursor.execute("SELECT * FROM semesters WHERE year = 2")
        semesters = cursor.fetchall()
        
        if not semesters:
            log("No semesters found for year 2.")
            return

        for sem in semesters:
            log(f"\nAnalyzing Semester: {sem['name']} (ID: {sem['id']})")
            
            # Check Allocations
            cursor.execute("SELECT * FROM allocations WHERE semester_id = ?", (sem['id'],))
            allocs = cursor.fetchall()
            
            allocated_slots = set()
            for a in allocs:
                allocated_slots.add((a['day'], a['slot']))
                
            log(f"  Total Allocations: {len(allocs)}")
            
            # Find Free Periods
            MAX_DAYS = 5
            MAX_SLOTS = 7
            free_slots = []
            for d in range(MAX_DAYS):
                for s in range(MAX_SLOTS):
                    if (d, s) not in allocated_slots:
                        free_slots.append((d, s))
                        
            if free_slots:
                log(f"  FREE PERIODS ({len(free_slots)}): {free_slots}")
            else:
                log("  No free periods.")

            # List ALL subjects
            cursor.execute("""
                SELECT s.id, s.name, s.code, s.is_elective, s.theory_hours_per_week, s.lab_hours_per_week
                FROM subjects s
                JOIN subject_semesters ss ON s.id = ss.subject_id
                WHERE ss.semester_id = ?
            """, (sem['id'],))
            subjects = cursor.fetchall()
            
            log(f"  Total Subjects Linked: {len(subjects)}")
            elective_count = 0
            for sub in subjects:
                is_elec = "ELECTIVE" if sub['is_elective'] else "Regular"
                hours = sub['theory_hours_per_week'] + sub['lab_hours_per_week']
                
                # Check allocation for this sub
                cursor.execute("""
                    SELECT COUNT(*) as count FROM allocations 
                    WHERE subject_id = ? AND semester_id = ?
                """, (sub['id'], sem['id']))
                alloc_count = cursor.fetchone()['count']
                
                log(f"    - [{is_elec}] {sub['name']} ({sub['code']}): Req {hours}, Alloc {alloc_count}")
                if sub['is_elective']:
                    elective_count += 1
                    if alloc_count < hours:
                        log(f"      *** WARNING: MISSING {hours - alloc_count} PERIODS ***")
                        # Check teacher availability
                        cursor.execute("""
                            SELECT t.id, t.name, t.available_days
                            FROM teachers t
                            JOIN teacher_subjects ts ON t.id = ts.teacher_id
                            WHERE ts.subject_id = ?
                        """, (sub['id'],))
                        teachers = cursor.fetchall()
                        log(f"      Capable Teachers: {[t['name'] for t in teachers]}")

            if elective_count == 0:
                log("  *** NO ELECTIVE SUBJECTS FOUND FOR THIS SEMESTER ***")
                # Check if there are electives in Baskets for this semester
                cursor.execute("""
                    SELECT * FROM elective_baskets WHERE semester_number = ?
                """, (sem['semester_number'],))
                baskets = cursor.fetchall()
                if baskets:
                    log(f"  Found Elective Baskets for Sem Number {sem['semester_number']}: {[b['name'] for b in baskets]}")
                    log("  Usage: Subjects in these baskets might not be linked to the Semester via subject_semesters table.")
                else:
                    log(f"  No Elective Baskets found for Sem Number {sem['semester_number']}")

diagnose()
conn.close()
