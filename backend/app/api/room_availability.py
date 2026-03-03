"""
Room Availability Tracking API.

Provides real-time room schedule data derived from timetable allocations
and fixed slots.  All endpoints are READ-ONLY analytics unless explicitly
noted (e.g. the suggestion endpoint).

Key capabilities
─────────────────
1. Per-room weekly schedule matrix (occupied / free per day-slot).
2. Available rooms for a given (day, slot) combination.
3. Room utilization summary with conflict detection.
4. Smart room suggestion when assigning a new class.
"""
from __future__ import annotations

from typing import Dict, List, Optional, Set, Tuple

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.core.config import get_settings
from app.db.session import get_db
from app.db.models import (
    Allocation,
    FixedSlot,
    Room,
    Semester,
    Subject,
    Teacher,
    Department,
    room_departments,
)

router = APIRouter(prefix="/room-availability", tags=["Room Availability"])

DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

# ─────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────

def _get_settings():
    return get_settings()


def _build_room_schedule(db: Session, room_ids: List[int], settings) -> Dict[int, Dict]:
    """
    Build a per-room schedule matrix.

    Returns a dict keyed by room_id.  Each value is a dict with keys:
      - "occupied": list of {day, slot, semester_id, semester_name, subject_name, teacher_name, component, is_fixed}
      - "schedule_matrix": dict[day][slot] -> occupancy info or None
    """
    num_days = len(DAY_NAMES)
    slots_per_day = settings.SLOTS_PER_DAY

    # Fetch allocations for the requested rooms
    allocations = (
        db.query(Allocation)
        .options(
            joinedload(Allocation.semester),
            joinedload(Allocation.subject),
            joinedload(Allocation.teacher),
        )
        .filter(Allocation.room_id.in_(room_ids))
        .all()
    )

    # Fetch fixed slots for the requested rooms
    fixed_slots = (
        db.query(FixedSlot)
        .options(
            joinedload(FixedSlot.semester),
            joinedload(FixedSlot.subject),
            joinedload(FixedSlot.teacher),
        )
        .filter(FixedSlot.room_id.in_(room_ids))
        .all()
    )

    # Initialise empty matrices
    result: Dict[int, Dict] = {}
    for rid in room_ids:
        matrix = {}
        for d in range(num_days):
            matrix[d] = {}
            for s in range(slots_per_day):
                matrix[d][s] = None  # free
        result[rid] = {"occupied": [], "schedule_matrix": matrix}

    # Fill from allocations
    for alloc in allocations:
        rid = alloc.room_id
        if rid not in result:
            continue
        entry = {
            "day": alloc.day,
            "slot": alloc.slot,
            "semester_id": alloc.semester_id,
            "semester_name": alloc.semester.name if alloc.semester else None,
            "semester_code": alloc.semester.code if alloc.semester else None,
            "subject_id": alloc.subject_id,
            "subject_name": alloc.subject.name if alloc.subject else None,
            "subject_code": alloc.subject.code if alloc.subject else None,
            "teacher_id": alloc.teacher_id,
            "teacher_name": alloc.teacher.name if alloc.teacher else None,
            "component": (
                alloc.academic_component
                or (alloc.component_type.value if alloc.component_type else "theory")
            ),
            "is_lab_continuation": alloc.is_lab_continuation,
            "is_elective": alloc.is_elective,
            "is_fixed": False,
        }
        result[rid]["occupied"].append(entry)
        result[rid]["schedule_matrix"][alloc.day][alloc.slot] = entry

    # Fill from fixed slots (overlay; fixed slots take priority if both exist)
    for fs in fixed_slots:
        rid = fs.room_id
        if rid not in result:
            continue
        entry = {
            "day": fs.day,
            "slot": fs.slot,
            "semester_id": fs.semester_id,
            "semester_name": fs.semester.name if fs.semester else None,
            "semester_code": fs.semester.code if fs.semester else None,
            "subject_id": fs.subject_id,
            "subject_name": fs.subject.name if fs.subject else None,
            "subject_code": fs.subject.code if fs.subject else None,
            "teacher_id": fs.teacher_id,
            "teacher_name": fs.teacher.name if fs.teacher else None,
            "component": (
                fs.academic_component
                or (fs.component_type.value if fs.component_type else "theory")
            ),
            "is_lab_continuation": fs.is_lab_continuation,
            "is_elective": fs.is_elective,
            "is_fixed": True,
        }
        # Only overwrite if the allocation slot is empty (avoid double-counting)
        if result[rid]["schedule_matrix"][fs.day][fs.slot] is None:
            result[rid]["occupied"].append(entry)
            result[rid]["schedule_matrix"][fs.day][fs.slot] = entry

    return result


# ─────────────────────────────────────────────────────────────────────
# 1. Full Room Schedule (weekly matrix for one or all rooms)
# ─────────────────────────────────────────────────────────────────────

@router.get("/schedule")
def get_room_schedules(
    dept_id: Optional[int] = Query(None, description="Filter by department"),
    room_type: Optional[str] = Query(None, description="Filter by room type (lecture/lab/seminar)"),
    room_id: Optional[int] = Query(None, description="Specific room"),
    db: Session = Depends(get_db),
):
    """
    Return the weekly schedule matrix for rooms.

    Each room gets a 5×7 matrix (days × slots).  Occupied cells contain
    class/subject/teacher info; free cells are null.
    """
    settings = _get_settings()

    query = db.query(Room).filter(Room.is_available == True)
    if room_id:
        query = query.filter(Room.id == room_id)
    if dept_id:
        room_ids_in_dept = (
            db.query(room_departments.c.room_id)
            .filter(room_departments.c.dept_id == dept_id)
            .subquery()
        )
        from sqlalchemy import select
        query = query.filter(
            (Room.id.in_(select(room_ids_in_dept.c.room_id)))
            | (Room.dept_id == dept_id)
            | (Room.dept_id.is_(None))
        )
    if room_type:
        query = query.filter(Room.room_type == room_type)

    rooms = query.order_by(Room.name).all()
    if not rooms:
        return {"rooms": [], "slot_timings": settings.SLOT_TIMINGS, "days": DAY_NAMES}

    rid_list = [r.id for r in rooms]
    schedules = _build_room_schedule(db, rid_list, settings)

    result_rooms = []
    for room in rooms:
        sched = schedules.get(room.id, {"occupied": [], "schedule_matrix": {}})
        matrix = sched["schedule_matrix"]

        # Convert matrix to serialisable format
        serialised_matrix = {}
        total_occupied = 0
        total_slots = len(DAY_NAMES) * settings.SLOTS_PER_DAY
        for d in range(len(DAY_NAMES)):
            day_slots = {}
            for s in range(settings.SLOTS_PER_DAY):
                cell = matrix.get(d, {}).get(s)
                if cell:
                    total_occupied += 1
                day_slots[str(s)] = cell
            serialised_matrix[str(d)] = day_slots

        utilization_pct = round(total_occupied / total_slots * 100, 1) if total_slots else 0

        result_rooms.append({
            "room_id": room.id,
            "room_name": room.name,
            "room_type": room.room_type.value if room.room_type else "lecture",
            "capacity": room.capacity,
            "dept_id": room.dept_id,
            "dept_ids": [d.id for d in room.departments] if room.departments else [],
            "assigned_year": room.assigned_year,
            "assigned_section": room.assigned_section,
            "is_default_classroom": room.is_default_classroom,
            "schedule": serialised_matrix,
            "total_occupied": total_occupied,
            "total_free": total_slots - total_occupied,
            "utilization_percent": utilization_pct,
        })

    return {
        "rooms": result_rooms,
        "slot_timings": settings.SLOT_TIMINGS,
        "days": DAY_NAMES,
        "breaks": settings.BREAKS,
    }


# ─────────────────────────────────────────────────────────────────────
# 2. Available Rooms for a specific (day, slot)
# ─────────────────────────────────────────────────────────────────────

@router.get("/free-rooms")
def get_free_rooms(
    day: int = Query(..., ge=0, le=4, description="Day index (0=Monday)"),
    slot: int = Query(..., ge=0, le=6, description="Slot index (0-based)"),
    dept_id: Optional[int] = Query(None, description="Filter by department"),
    room_type: Optional[str] = Query(None, description="Filter by room type"),
    min_capacity: Optional[int] = Query(None, ge=1, description="Minimum capacity"),
    db: Session = Depends(get_db),
):
    """
    Return rooms that are FREE at the specified (day, slot).

    Useful for assigning a new class or reassigning after a move.
    """
    settings = _get_settings()

    # Rooms occupied at this specific (day, slot)
    occupied_room_ids_alloc = set(
        r[0]
        for r in db.query(Allocation.room_id)
        .filter(Allocation.day == day, Allocation.slot == slot, Allocation.room_id.isnot(None))
        .all()
    )
    occupied_room_ids_fixed = set(
        r[0]
        for r in db.query(FixedSlot.room_id)
        .filter(FixedSlot.day == day, FixedSlot.slot == slot, FixedSlot.room_id.isnot(None))
        .all()
    )
    occupied_room_ids = occupied_room_ids_alloc | occupied_room_ids_fixed

    # Query available rooms excluding occupied ones
    query = db.query(Room).filter(Room.is_available == True)
    if occupied_room_ids:
        query = query.filter(Room.id.notin_(occupied_room_ids))
    if dept_id:
        room_ids_in_dept = (
            db.query(room_departments.c.room_id)
            .filter(room_departments.c.dept_id == dept_id)
            .subquery()
        )
        from sqlalchemy import select
        query = query.filter(
            (Room.id.in_(select(room_ids_in_dept.c.room_id)))
            | (Room.dept_id == dept_id)
            | (Room.dept_id.is_(None))
        )
    if room_type:
        query = query.filter(Room.room_type == room_type)
    if min_capacity:
        query = query.filter(Room.capacity >= min_capacity)

    free_rooms = query.order_by(Room.name).all()

    return {
        "day": day,
        "day_name": DAY_NAMES[day],
        "slot": slot,
        "slot_timing": settings.SLOT_TIMINGS[slot] if slot < len(settings.SLOT_TIMINGS) else None,
        "total_free": len(free_rooms),
        "total_occupied": len(occupied_room_ids),
        "free_rooms": [
            {
                "room_id": r.id,
                "room_name": r.name,
                "room_type": r.room_type.value if r.room_type else "lecture",
                "capacity": r.capacity,
                "dept_id": r.dept_id,
                "dept_ids": [d.id for d in r.departments] if r.departments else [],
                "is_default_classroom": r.is_default_classroom,
                "assigned_year": r.assigned_year,
                "assigned_section": r.assigned_section,
            }
            for r in free_rooms
        ],
    }


# ─────────────────────────────────────────────────────────────────────
# 3. Utilization Summary (all rooms)
# ─────────────────────────────────────────────────────────────────────

@router.get("/summary")
def get_availability_summary(
    dept_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Per-room utilization summary across the entire week.

    Returns total occupied / free slots and utilisation %, plus
    conflict detection (any slot with >1 allocation to the same room).
    """
    settings = _get_settings()
    total_weekly_slots = len(DAY_NAMES) * settings.SLOTS_PER_DAY

    query = db.query(Room).filter(Room.is_available == True)
    if dept_id:
        room_ids_in_dept = (
            db.query(room_departments.c.room_id)
            .filter(room_departments.c.dept_id == dept_id)
            .subquery()
        )
        from sqlalchemy import select
        query = query.filter(
            (Room.id.in_(select(room_ids_in_dept.c.room_id)))
            | (Room.dept_id == dept_id)
            | (Room.dept_id.is_(None))
        )

    rooms = query.order_by(Room.name).all()
    rid_list = [r.id for r in rooms]

    if not rid_list:
        return {"rooms": [], "total_rooms": 0, "avg_utilization": 0}

    schedules = _build_room_schedule(db, rid_list, settings)

    # Detect conflicts: multiple allocations to same room at same (day, slot)
    conflict_query = (
        db.query(Allocation)
        .options(
            joinedload(Allocation.semester),
            joinedload(Allocation.subject),
            joinedload(Allocation.teacher),
        )
        .filter(Allocation.room_id.in_(rid_list))
        .all()
    )
    from collections import defaultdict
    slot_allocs = defaultdict(list)
    for alloc in conflict_query:
        slot_allocs[(alloc.room_id, alloc.day, alloc.slot)].append(alloc)

    # Build room_id -> name map
    room_name_map = {r.id: r.name for r in rooms}

    conflicts = []
    for (room_id, day, slot), allocs in slot_allocs.items():
        if len(allocs) > 1:
            slot_timing = settings.SLOT_TIMINGS[slot] if slot < len(settings.SLOT_TIMINGS) else {}
            clashing_classes = []
            for a in allocs:
                clashing_classes.append({
                    "semester_name": a.semester.name if a.semester else None,
                    "semester_code": a.semester.code if a.semester else None,
                    "subject_name": a.subject.name if a.subject else None,
                    "subject_code": a.subject.code if a.subject else None,
                    "teacher_name": a.teacher.name if a.teacher else None,
                    "component": (
                        a.academic_component
                        or (a.component_type.value if a.component_type else "theory")
                    ),
                })
            conflicts.append({
                "room_id": room_id,
                "room_name": room_name_map.get(room_id, f"Room #{room_id}"),
                "day": day,
                "day_name": DAY_NAMES[day],
                "slot": slot,
                "slot_label": slot_timing.get("label", f"Slot {slot + 1}"),
                "slot_start": slot_timing.get("start", ""),
                "slot_end": slot_timing.get("end", ""),
                "count": len(allocs),
                "clashing_classes": clashing_classes,
            })

    summary = []
    total_utilization = 0.0
    for room in rooms:
        sched = schedules.get(room.id, {"occupied": []})
        occupied = len(sched["occupied"])
        free = total_weekly_slots - occupied
        util = round(occupied / total_weekly_slots * 100, 1) if total_weekly_slots else 0
        total_utilization += util

        # Peak day calculation
        day_counts = {}
        for occ in sched["occupied"]:
            day_counts[occ["day"]] = day_counts.get(occ["day"], 0) + 1
        peak_day = max(day_counts, key=day_counts.get) if day_counts else None

        summary.append({
            "room_id": room.id,
            "room_name": room.name,
            "room_type": room.room_type.value if room.room_type else "lecture",
            "capacity": room.capacity,
            "total_occupied": occupied,
            "total_free": free,
            "utilization_percent": util,
            "peak_day": DAY_NAMES[peak_day] if peak_day is not None else None,
            "has_conflict": any(c["room_id"] == room.id for c in conflicts),
        })

    avg_util = round(total_utilization / len(rooms), 1) if rooms else 0

    return {
        "rooms": summary,
        "total_rooms": len(rooms),
        "avg_utilization": avg_util,
        "conflicts": conflicts,
        "total_weekly_slots": total_weekly_slots,
    }


# ─────────────────────────────────────────────────────────────────────
# 4. Suggest rooms for a new assignment
# ─────────────────────────────────────────────────────────────────────

@router.get("/suggest")
def suggest_rooms(
    day: int = Query(..., ge=0, le=4),
    slot: int = Query(..., ge=0, le=6),
    dept_id: Optional[int] = Query(None),
    room_type: Optional[str] = Query(None),
    min_capacity: Optional[int] = Query(None, ge=1),
    consecutive: int = Query(1, ge=1, le=7, description="Number of consecutive slots needed"),
    db: Session = Depends(get_db),
):
    """
    Suggest available rooms for a given time window (day, slot … slot+consecutive-1).

    Useful for lab scheduling that needs 2 consecutive free slots.
    """
    settings = _get_settings()
    slots_needed = list(range(slot, min(slot + consecutive, settings.SLOTS_PER_DAY)))

    # Gather occupied room IDs across ALL required slots
    occupied_ids: Set[int] = set()
    for s in slots_needed:
        alloc_ids = set(
            r[0]
            for r in db.query(Allocation.room_id)
            .filter(Allocation.day == day, Allocation.slot == s, Allocation.room_id.isnot(None))
            .all()
        )
        fixed_ids = set(
            r[0]
            for r in db.query(FixedSlot.room_id)
            .filter(FixedSlot.day == day, FixedSlot.slot == s, FixedSlot.room_id.isnot(None))
            .all()
        )
        occupied_ids |= alloc_ids | fixed_ids

    query = db.query(Room).filter(Room.is_available == True)
    if occupied_ids:
        query = query.filter(Room.id.notin_(occupied_ids))
    if dept_id:
        room_ids_in_dept = (
            db.query(room_departments.c.room_id)
            .filter(room_departments.c.dept_id == dept_id)
            .subquery()
        )
        from sqlalchemy import select
        query = query.filter(
            (Room.id.in_(select(room_ids_in_dept.c.room_id)))
            | (Room.dept_id == dept_id)
            | (Room.dept_id.is_(None))
        )
    if room_type:
        query = query.filter(Room.room_type == room_type)
    if min_capacity:
        query = query.filter(Room.capacity >= min_capacity)

    suggested = query.order_by(Room.capacity.desc(), Room.name).all()

    return {
        "day": day,
        "day_name": DAY_NAMES[day],
        "slots": slots_needed,
        "slot_timings": [
            settings.SLOT_TIMINGS[s] for s in slots_needed if s < len(settings.SLOT_TIMINGS)
        ],
        "suggestions": [
            {
                "room_id": r.id,
                "room_name": r.name,
                "room_type": r.room_type.value if r.room_type else "lecture",
                "capacity": r.capacity,
                "dept_id": r.dept_id,
            }
            for r in suggested
        ],
    }
