import sys
import os
# Add current dir to path to allow `import app`
sys.path.append(os.getcwd())

from app.db.session import SessionLocal
from app.db.models import Subject, Semester, ElectiveBasket, ClassSubjectTeacher

def check_baskets():
    db = SessionLocal()
    try:
        with open('baskets_dump.txt', 'w', encoding='utf-8') as f:
            f.write("=== ELECTIVE BASKET ANALYSIS ===\n")
            # 1. List all Baskets
            baskets = db.query(ElectiveBasket).all()
            basket_map = {b.id: b.name for b in baskets}
            f.write(f"Found {len(baskets)} Baskets:\n")
            for b in baskets:
                f.write(f"  [{b.id}] {b.name}\n")
            
            f.write("\n=== ALL ELECTIVE SUBJECTS ===\n")
            electives = db.query(Subject).filter(Subject.is_elective == True).all()
            
            # Pre-load semester and teacher info
            # Subject -> ClassSubjectTeacher -> [Semester, Teacher]
            cst_map = {}
            from app.db.models import Teacher
            
            csts = db.query(ClassSubjectTeacher).all()
            teacher_map = {t.id: t for t in db.query(Teacher).all()}
            sem_map = {s.id: s for s in db.query(Semester).all()}
            
            for c in csts:
                if c.subject_id not in cst_map:
                    cst_map[c.subject_id] = []
                cst_map[c.subject_id].append(c)

            # Restoring grouping logic
            by_basket = {}
            for s in electives:
                bid = s.elective_basket_id
                if bid not in by_basket:
                    by_basket[bid] = []
                by_basket[bid].append(s)
                
            for bid, subs in by_basket.items():
                bname = basket_map.get(bid, "Unknown/None")
                f.write(f"\nBasket ID {bid} ({bname}): {len(subs)} subjects\n")
                for s in subs:
                    # Get details
                    mappings = cst_map.get(s.id, [])
                    details = []
                    for m in mappings:
                        sem = sem_map.get(m.semester_id)
                        teach = teacher_map.get(m.teacher_id)
                        
                        tname = teach.name if teach else "NoTeacher"
                        if sem:
                            year = getattr(sem, 'year', (sem.semester_number + 1) // 2)
                            dept_id = getattr(sem, 'dept_id', '?')
                            details.append(f"Sem{sem.semester_number}(Y{year},D{dept_id}): {tname}")
                    
                    details_str = " | ".join(details)
                    f.write(f"  - {s.name} ({s.code}) -> [{details_str}]\n")

    except Exception as e:
        print(f"ERROR: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_baskets()
