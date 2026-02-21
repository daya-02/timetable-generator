import sys
import os
# Add the absolute path to the backend directory
sys.path.append(r"c:\Users\navee\.gemini\antigravity\scratch\timetable_generator\backend")

from app.db.database import SessionLocal
from app.db.models import Subject, Semester, ElectiveBasket, ClassSubjectTeacher
# Department might not exist, skip it.

def check_baskets():
    db = SessionLocal()
    try:
        print("Checking 'scrum' subject:")
        scrum_subjects = db.query(Subject).filter(Subject.name.ilike("%scrum%")).all()
        for s in scrum_subjects:
            print(f"  - Name: {s.name} (ID: {s.id})")
            print(f"    Is Elective: {s.is_elective}")
            print(f"    Basket ID: {s.elective_basket_id}")
            if s.elective_basket_id:
                b = db.query(ElectiveBasket).get(s.elective_basket_id)
                print(f"    Basket Name: {b.name}")
        
        print("-" * 20)
        
        # Get all distinct dept_ids from Semester
        semesters = db.query(Semester).all()
        dept_ids = set()
        for s in semesters:
            if hasattr(s, 'dept_id') and s.dept_id:
                dept_ids.add(s.dept_id)
        
        print(f"Found Dept IDs: {dept_ids}")
        
        # Helper to find electives for a dept ID
        def print_dept_electives(dept_id_filter):
            print(f"\nChecking electives for Dept ID {dept_id_filter}:")
            sems = db.query(Semester).filter(Semester.dept_id == dept_id_filter).all()
            if not sems:
                print("  No semesters found.")
                return

            sem_ids = [s.id for s in sems]
            csts = db.query(ClassSubjectTeacher).filter(ClassSubjectTeacher.semester_id.in_(sem_ids)).all()
            subject_ids = set(cst.subject_id for cst in csts)
            
            if not subject_ids:
                 print("  No subjects assigned.")
                 return

            subjects = db.query(Subject).filter(Subject.id.in_(subject_ids), Subject.is_elective == True).all()
            for sub in subjects:
                 print(f"  - Subject: {sub.name} (ID: {sub.id})")
                 print(f"    Basket ID: {sub.elective_basket_id}")
                 if sub.elective_basket_id:
                     b = db.query(ElectiveBasket).get(sub.elective_basket_id)
                     print(f"    Basket Name: {b.name}")

        # Try to map dept_id to name if possible via some logic or just iterate all
        # Assuming 1=IT? 2=AIML? from user context.
        # Let's just dump for all found dept_ids
        for callback_id in sorted(list(dept_ids)):
             print_dept_electives(callback_id)

    finally:
        db.close()

if __name__ == "__main__":
    check_baskets()
