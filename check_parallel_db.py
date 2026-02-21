import sys
import os
import pandas as pd

# Add backend directory to sys.path
sys.path.append(os.path.abspath("backend"))

from app.db.session import SessionLocal
from app.db.models import ClassSubjectTeacher, Subject, Semester, Teacher

def check_parallel_groups():
    db = SessionLocal()
    try:
        print("Checking ClassSubjectTeacher for parallel_lab_group entries...")
        assignments = db.query(ClassSubjectTeacher).filter(
            ClassSubjectTeacher.parallel_lab_group.isnot(None)
        ).all()
        
        if not assignments:
            print("No assignments found with parallel_lab_group set.")
            all_assigns = db.query(ClassSubjectTeacher).all()
            print(f"Total assignments in DB: {len(all_assigns)}")
            if all_assigns:
                print("First 5 assignments:")
                for a in all_assigns[:5]:
                    print(f"ID: {a.id}, Subject: {a.subject_id}, Sem: {a.semester_id}, Group: {a.parallel_lab_group}")
        else:
            print(f"Found {len(assignments)} assignments with parallel groups:")
            data = []
            for a in assignments:
                sem = db.query(Semester).get(a.semester_id)
                subj = db.query(Subject).get(a.subject_id)
                teacher = db.query(Teacher).get(a.teacher_id)
                
                data.append({
                    "Class": sem.name if sem else a.semester_id,
                    "Subject": subj.code if subj else a.subject_id,
                    "Teacher": teacher.name if teacher else a.teacher_id,
                    "Group": a.parallel_lab_group,
                    "Type": a.component_type.value
                })
            
            df = pd.DataFrame(data)
            print(df.to_string(index=False))

    finally:
        db.close()

if __name__ == "__main__":
    check_parallel_groups()
