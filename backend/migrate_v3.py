import os
import sys

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.session import engine, SessionLocal
from app.db.models import Base, SemesterTemplate, SemesterType
from sqlalchemy import text

def migrate():
    print("Creating new tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully.")
    
    print("Populating SemesterTemplates...")
    with SessionLocal() as db:
        # ODD
        odd_template = db.query(SemesterTemplate).filter_by(semester_type=SemesterType.ODD).first()
        if not odd_template:
            odd_template = SemesterTemplate(
                semester_type=SemesterType.ODD,
                total_periods=7,
                break_slots="[1]",
                lunch_slot=3
            )
            db.add(odd_template)
            print("Added ODD template.")
        else:
            odd_template.break_slots = "[1]"
            odd_template.lunch_slot = 3
            print("Updated ODD template.")
            
        # EVEN
        even_template = db.query(SemesterTemplate).filter_by(semester_type=SemesterType.EVEN).first()
        if not even_template:
            even_template = SemesterTemplate(
                semester_type=SemesterType.EVEN,
                total_periods=7,
                break_slots="[1, 4]",
                lunch_slot=3
            )
            db.add(even_template)
            print("Added EVEN template.")
        else:
            even_template.break_slots = "[1, 4]"
            even_template.lunch_slot = 3
            print("Updated EVEN template.")
            
        db.commit()
        print("Templates populated successfully.")

if __name__ == "__main__":
    migrate()
