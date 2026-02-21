import sys
import os

# Add backend directory to sys.path
sys.path.append(os.path.abspath("backend"))

from app.db.session import SessionLocal, engine
from app.db.models import ClassSubjectTeacher
from sqlalchemy import text

def check_db_schema():
    print("Checking database schema...")
    with engine.connect() as connection:
        result = connection.execute(text("PRAGMA table_info(class_subject_teachers)"))
        columns = [row[1] for row in result]
        print(f"Columns in class_subject_teachers: {columns}")
        
        if 'parallel_lab_group' in columns:
            print("✅ 'parallel_lab_group' column exists.")
        else:
            print("❌ 'parallel_lab_group' column MISSING!")

def check_data():
    print("\nChecking data...")
    try:
        db = SessionLocal()
        assignments = db.query(ClassSubjectTeacher).filter(
            ClassSubjectTeacher.parallel_lab_group.isnot(None)
        ).all()
        print(f"Found {len(assignments)} assignments with parallel groups.")
        for a in assignments:
            print(f"ID: {a.id}, Group: {a.parallel_lab_group}")
    except Exception as e:
        print(f"Error querying data: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_db_schema()
    check_data()
