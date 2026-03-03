import re

with open('app/services/generator.py', 'r', encoding='utf-8') as f:
    code = f.read()

if "import json" not in code:
    code = code.replace("import random\n", "import random\nimport json\n")

scb_call = """
        print("\\nPHASE 0.5: PRE-SCHEDULING STRUCTURED COMPOSITE BASKETS")
        scb_allocations = self._pre_schedule_scbs(
            target_semesters,
            all_subjects,
            teacher_assignment_map_global,
            blocked_slots,
            all_rooms
        )
        print(f"   [GLOBAL SCB] Locked {len(scb_allocations)} SCB slot entries")
        
        # Add to cumulative state directly
        for entry in scb_allocations:
            cumulative_state.add_allocation(entry, force_parallel=True)
            cumulative_state.mark_slot_as_fixed(entry.semester_id, entry.day, entry.slot)
"""
code = code.replace(
    "        # INITIALIZE CUMULATIVE STATE",
    scb_call + "\n        # INITIALIZE CUMULATIVE STATE"
)

scb_method = """
    def _pre_schedule_scbs(
        self,
        target_semesters,
        all_subjects,
        teacher_assignment_map,
        blocked_slots,
        all_rooms
    ):
        import json
        from app.db.models import StructuredCompositeBasket, RoomType, ComponentType, Batch
        
        allocations = []
        target_sem_ids = {s.id for s in target_semesters}
        
        try:
            active_scbs = self.db.query(StructuredCompositeBasket).all()
        except Exception:
            return []
            
        if not active_scbs:
            return []
            
        subject_by_id = {s.id: s for s in all_subjects}
        room_by_type = {RoomType.LECTURE: [r for r in all_rooms if r.room_type in [RoomType.LECTURE, RoomType.SEMINAR]],
                        RoomType.LAB: [r for r in all_rooms if r.room_type == RoomType.LAB]}
        
        for scb in active_scbs:
            if not scb.departments_involved:
                continue
                
            scb_dept_ids = {d.id for d in scb.departments_involved}
            participating_sems = [
                s for s in target_semesters
                if s.dept_id in scb_dept_ids and s.semester_number == scb.semester
            ]
            
            if not participating_sems:
                continue
                
            try:
                pattern = json.loads(scb.structure_pattern)
            except:
                continue
                
            used_days = set()
            
            # For labs, we may have batches. Group theory all together and labs separated if `allow_lab_parallel` is True.
            for day_key, conf in pattern.items():
                continuous = conf.get("continuous", 1)
                seq_pattern = conf.get("pattern", [])
                
                valid_days = [d for d in range(DAYS_PER_WEEK) if d not in used_days]
                random.shuffle(valid_days)
                
                block_found = False
                for d in valid_days:
                    valid_starts = [s for s in range(SLOTS_PER_DAY - continuous + 1)]
                    random.shuffle(valid_starts)
                    
                    for start_slot in valid_starts:
                        slots_to_check = [start_slot + i for i in range(continuous)]
                        
                        if any(s in blocked_slots for s in slots_to_check):
                            continue
                        if any(s in self.lab_continuity_boundaries for s in slots_to_check[:-1]):
                            continue
                            
                        # If reached here, time block geometrically valid
                        used_days.add(d)
                        
                        # Process each participating semester
                        for sem in participating_sems:
                            batches = []
                            try:
                                batches = self.db.query(Batch).filter(Batch.semester_id == sem.id).all()
                            except:
                                pass
                                
                            for offset, pat in enumerate(seq_pattern):
                                slot = start_slot + offset
                                comp_val = "lab" if ("LAB" in pat.upper()) else "theory"
                                
                                # Assign subjects linked to SCB
                                for link in scb.linked_subjects:
                                    subject = subject_by_id.get(link.subject_id)
                                    if not subject: continue
                                    
                                    # Very basic heuristic: if subject is theory vs lab
                                    is_lab_subj = "LAB" in subject.name.upper() or subject.lab_hours_per_week > 0
                                    if comp_val == "lab" and not is_lab_subj:
                                        continue
                                    if comp_val == "theory" and is_lab_subj:
                                        continue
                                        
                                    teacher_id = teacher_assignment_map.get((sem.id, subject.id, ComponentType.LAB.value if comp_val == "lab" else ComponentType.THEORY.value))
                                    if not teacher_id:
                                        # Use standard mapped teacher
                                        teacher_id = teacher_assignment_map.get((sem.id, subject.id, ComponentType.THEORY.value))
                                    
                                    if not teacher_id: continue
                                    
                                    # Handles lab parallelism: batches A/B to different labs
                                    if comp_val == "lab" and scb.allow_lab_parallel and batches:
                                        for i, b in enumerate(batches):
                                            room = room_by_type[RoomType.LAB][i % len(room_by_type[RoomType.LAB])] if room_by_type[RoomType.LAB] else None
                                            entry = AllocationEntry(
                                                semester_id=sem.id,
                                                subject_id=subject.id,
                                                teacher_id=teacher_id,
                                                room_id=room.id if room else None,
                                                day=d,
                                                slot=slot,
                                                component_type=ComponentType.LAB,
                                                academic_component="lab",
                                                batch_id=b.id
                                            )
                                            allocations.append(entry)
                                    else:
                                        room_type = RoomType.LAB if comp_val == "lab" else RoomType.LECTURE
                                        room_list = room_by_type[room_type]
                                        room = random.choice(room_list) if room_list else None
                                        
                                        entry = AllocationEntry(
                                            semester_id=sem.id,
                                            subject_id=subject.id,
                                            teacher_id=teacher_id,
                                            room_id=room.id if room else None,
                                            day=d,
                                            slot=slot,
                                            component_type=ComponentType.LAB if comp_val == "lab" else ComponentType.THEORY,
                                            academic_component=comp_val,
                                            batch_id=None
                                        )
                                        allocations.append(entry)
                                        
                        block_found = True
                        break
                    if block_found:
                        break
                        
        return allocations
"""

if "_pre_schedule_scbs" not in code:
    code = code.replace("    def _scan_global_elective_slots", scb_method + "\n\n    def _scan_global_elective_slots")

with open('app/services/generator.py', 'w', encoding='utf-8') as f:
    f.write(code)

print("Updated generator.py")
