import sys
import os
sys.path.append(os.getcwd())

from app.db.session import SessionLocal
from app.services.generator import TimetableGenerator
from app.db.models import Semester, Allocation, Subject, ClassSubjectTeacher


def run_test():
    db = SessionLocal()
    try:
        gen = TimetableGenerator(db)
        
        # Step 1: Run generation
        print("Running generation...")
        try:
            success, msg, allocs, duration = gen.generate(clear_existing=True)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return

        with open("allocation_report.txt", "w", encoding="utf-8") as rep:
            rep.write(f"Generation Result: {success} ({duration:.2f}s)\n")
            rep.write(f"Message: {msg}\n\n")
            
            # FAILURES
            rep.write("ALLOCATION FAILURES:\n")
            if hasattr(gen, 'allocation_failures') and gen.allocation_failures:
                for fail in gen.allocation_failures:
                    rep.write(f"  - {fail}\n")
            else:
                rep.write("  None reported.\n")
            
            rep.write("\nELECTIVE BASKET 1 ANALYSIS:\n")
            
            # Find allocations for Basket 1
            basket_allocs = [a for a in allocs if a.is_elective and a.elective_basket_id == 1]
            
            # Group by Semester + Subject + Component
            sem_map = {s.id: s for s in db.query(Semester).all()}
            sub_map = {s.id: s for s in db.query(Subject).all()}
            
            results = {}
            for a in basket_allocs:
                sem = sem_map.get(a.semester_id)
                sub = sub_map.get(a.subject_id)
                if not sem or not sub: continue
                
                key = (sem.dept_id, sem.semester_number, sub.name, a.component_type.value)
                if key not in results:
                    results[key] = set()
                results[key].add((a.day, a.slot))
                
            sorted_items = sorted(results.items(), key=lambda item: (item[0][0] if item[0][0] is not None else -1, item[0][1], item[0][2], item[0][3]))
            
            for key, slots in sorted_items:
                dept, sem_num, sub_name, comp_type = key
                slots_str = ", ".join([f"D{d}S{s}" for d, s in sorted(list(slots))])
                rep.write(f"Dept {dept} Sem {sem_num} - {sub_name} ({comp_type}): {slots_str}\n")

            # Check GEN AI All Allocations
            gen_ai = next((s for s in db.query(Subject).all() if "GEN AI" in s.name), None)
            if gen_ai:
                teacher_ids = db.query(ClassSubjectTeacher).filter(ClassSubjectTeacher.subject_id == gen_ai.id).all()
                t_ids = [t.teacher_id for t in teacher_ids]
                rep.write(f"\n[DIAGNOSTIC] Subject '{gen_ai.name}' Teachers: {t_ids}\n")
                
                # Verify allocations
                gen_allocs = [a for a in allocs if a.subject_id == gen_ai.id]
                rep.write(f"[DIAGNOSTIC] GEN AI Allocations: {len(gen_allocs)}\n")
                for a in gen_allocs:
                    rep.write(f"  - Sem {a.semester_id} | Type: {a.component_type} | Day {a.day} Slot {a.slot} | IsElective: {a.is_elective} | Basket: {a.elective_basket_id}\n")
            
            # Check SCRUM Teacher
            scrum = next((s for s in db.query(Subject).all() if "SCRUM" in s.name), None)
            if scrum:
                teacher_ids = db.query(ClassSubjectTeacher).filter(ClassSubjectTeacher.subject_id == scrum.id).all()
                t_ids = [t.teacher_id for t in teacher_ids]
                rep.write(f"[DIAGNOSTIC] Subject '{scrum.name}' Teachers: {t_ids}\n")

    finally:
        db.close()

if __name__ == "__main__":
    run_test()
