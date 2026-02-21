"""
COMPLETE DEMO: Clean database, seed fresh data with all features, generate, display.
Shows: Regular Theory, Labs, Elective Baskets, Parallel Labs.
"""
import urllib.request
import json
import sys
import time

BASE = "http://localhost:8000/api"


def api(method, path, data=None):
    url = f"{BASE}{path}"
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, method=method)
    if body:
        req.add_header("Content-Type", "application/json")
    try:
        resp = urllib.request.urlopen(req)
        if resp.status == 204:
            return None
        return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        print(f"  [!] {e.code}: {err[:150]}")
        return None


def post(path, data):
    return api("POST", path, data)


def get(path):
    return api("GET", path)


def delete(path):
    return api("DELETE", path)


def put(path, data):
    return api("PUT", path, data)


print("=" * 70)
print("  COMPLETE DEMO: All Core Features")
print("=" * 70)

# ===========================
# STEP 0: CLEAR ALL DATA
# ===========================
print("\n[0] Clearing all existing data...")

# Clear timetable
delete("/timetable/clear")

# Delete all elective baskets
baskets = get("/elective-baskets/")
for b in (baskets or []):
    delete(f"/elective-baskets/{b['id']}")
    print(f"  Deleted basket: {b['name']}")

# Delete all teacher assignments + teachers
teachers = get("/teachers/")
for t in (teachers or []):
    for a in t.get("class_assignments", []):
        delete(f"/teachers/assignments/{a['id']}")
    delete(f"/teachers/{t['id']}")
    print(f"  Deleted teacher: {t['name']}")

# Delete subjects
subjects = get("/subjects/")
for s in (subjects or []):
    delete(f"/subjects/{s['id']}")
    print(f"  Deleted subject: {s['code']}")

# Delete semesters
semesters = get("/semesters/")
for s in (semesters or []):
    delete(f"/semesters/{s['id']}")
    print(f"  Deleted semester: {s['code']}")

# Delete rooms
rooms = get("/rooms/")
for r in (rooms or []):
    delete(f"/rooms/{r['id']}")
    print(f"  Deleted room: {r['name']}")

# Delete departments
depts = get("/departments/")
for d in (depts or []):
    delete(f"/departments/{d['id']}")
    print(f"  Deleted dept: {d['name']}")

print("  Database cleaned!")

# ===========================
# STEP 1: DEPARTMENT
# ===========================
print("\n[1] Creating Department...")
dept = post("/departments/", {"name": "Computer Science & Engineering", "code": "CSE"})
DEPT = dept["id"]
print(f"  Created: CSE (ID={DEPT})")

# ===========================
# STEP 2: ROOMS
# ===========================
print("\n[2] Creating Rooms...")
rooms = {}
for name, rtype in [
    ("LH-101 (Lecture)", "lecture"),
    ("LH-102 (Lecture)", "lecture"),
    ("Lab-A (DBMS Lab)", "lab"),
    ("Lab-B (OS Lab)", "lab"),
    ("Lab-C (Networks Lab)", "lab"),
]:
    r = post("/rooms/", {"name": name, "capacity": 60 if "Lec" in name else 30, "room_type": rtype, "dept_id": DEPT})
    rooms[name] = r
    print(f"  Created: {name} (ID={r['id']})")

# ===========================
# STEP 3: SEMESTERS
# ===========================
print("\n[3] Creating Semesters...")
cs3a = post("/semesters/", {
    "name": "CSE 3rd Sem A", "code": "CS3A",
    "year": 2, "semester_number": 3, "section": "A",
    "student_count": 60, "dept_id": DEPT
})
cs5a = post("/semesters/", {
    "name": "CSE 5th Sem A", "code": "CS5A",
    "year": 3, "semester_number": 5, "section": "A",
    "student_count": 60, "dept_id": DEPT
})
print(f"  Created: CS3A (ID={cs3a['id']}), CS5A (ID={cs5a['id']})")
SEM_3A = cs3a["id"]
SEM_5A = cs5a["id"]

# ===========================
# STEP 4: SUBJECTS
# ===========================
print("\n[4] Creating Subjects...")

subjs = {}


def create_subj(code, name, theory, lab, stype, elective, sem_ids):
    s = post("/subjects/", {
        "name": name, "code": code,
        "theory_hours_per_week": theory,
        "lab_hours_per_week": lab,
        "credits": theory + (lab // 2),
        "subject_type": stype,
        "is_elective": elective,
        "dept_id": DEPT,
        "semester_ids": sem_ids,
    })
    subjs[code] = s
    tag = "[ELECTIVE]" if elective else "[LAB]" if lab > 0 else ""
    print(f"  {code}: {name} (T={theory}h L={lab}h) {tag}")
    return s


# --- 3rd Sem Subjects ---
print("  --- CSE 3rd Semester ---")
create_subj("CS301", "Data Structures", 4, 0, "regular", False, [SEM_3A])
create_subj("CS302", "DBMS", 3, 2, "regular", False, [SEM_3A])
create_subj("CS303", "Operating Systems", 3, 2, "regular", False, [SEM_3A])
create_subj("CS304", "Discrete Maths", 3, 0, "regular", False, [SEM_3A])
create_subj("CS305", "Computer Networks", 3, 2, "regular", False, [SEM_3A])

# --- 5th Sem Subjects ---
print("  --- CSE 5th Semester ---")
create_subj("CS501", "Compiler Design", 4, 0, "regular", False, [SEM_5A])
create_subj("CS502", "Software Engineering", 3, 0, "regular", False, [SEM_5A])
create_subj("CS503", "Web Technologies", 3, 2, "regular", False, [SEM_5A])

# --- 5th Sem Electives ---
print("  --- 5th Sem Electives ---")
create_subj("CSOE1", "Machine Learning", 3, 0, "elective", True, [SEM_5A])
create_subj("CSOE2", "Cyber Security", 3, 0, "elective", True, [SEM_5A])

# ===========================
# STEP 5: TEACHERS
# ===========================
print("\n[5] Creating Teachers...")
tchrs = {}


def create_teacher(code, name):
    t = post("/teachers/", {
        "name": name, "teacher_code": code,
        "email": f"{code.lower()}@cse.edu",
        "dept_id": DEPT, "max_hours_per_week": 24,
        "available_days": "0,1,2,3,4"
    })
    if not t:
        # Teacher code may already exist (soft-deleted). Find and reactivate.
        all_t = get(f"/teachers/?active_only=false&teacher_code={code}")
        if all_t:
            t = all_t[0]
            put(f"/teachers/{t['id']}", {"name": name, "is_active": True})
            print(f"  {code}: {name} (reactivated, ID={t['id']})")
        else:
            # Try without active filter
            all_t2 = get(f"/teachers/?teacher_code={code}")
            if all_t2:
                t = all_t2[0]
                print(f"  {code}: {name} (exists, ID={t['id']})")
            else:
                print(f"  {code}: FAILED to create!")
                return None
    else:
        print(f"  {code}: {name} (ID={t['id']})")
    tchrs[code] = t
    return t


create_teacher("AS01", "Dr. Arun Sharma")
create_teacher("KN02", "Prof. Kavitha Nair")
create_teacher("RK03", "Dr. Rajesh Kumar")
create_teacher("PS04", "Prof. Priya Singh")
create_teacher("MP05", "Dr. Manoj Patel")
create_teacher("DI06", "Prof. Deepa Iyer")
create_teacher("SM07", "Dr. Suresh Menon")
create_teacher("AR08", "Prof. Anita Rao")

# ===========================
# STEP 6: ASSIGNMENTS
# ===========================
print("\n[6] Creating Teacher Assignments...")


def assign(tcode, scode, comp, room_name=None, batch_id=None, pgroup=None):
    t = tchrs[tcode]
    s = subjs[scode]
    sem_id = s["semesters"][0]["id"]
    data = {
        "semester_id": sem_id, "subject_id": s["id"],
        "teacher_id": t["id"], "component_type": comp,
    }
    if room_name:
        data["room_id"] = rooms[room_name]["id"]
    if batch_id is not None:
        data["batch_id"] = batch_id
    if pgroup:
        data["parallel_lab_group"] = pgroup
    result = post(f"/teachers/{t['id']}/assignments", data)
    pg = f" [parallel={pgroup}]" if pgroup else ""
    print(f"  {tcode} -> {scode} ({comp}){pg}")


# 3rd Sem Theory
print("  --- 3rd Sem Theory ---")
assign("AS01", "CS301", "theory")    # DSA
assign("KN02", "CS302", "theory")    # DBMS
assign("RK03", "CS303", "theory")    # OS
assign("PS04", "CS304", "theory")    # Discrete Maths
assign("MP05", "CS305", "theory")    # CN

# 3rd Sem Labs — PARALLEL LAB GROUP
print("  --- 3rd Sem Labs (PARALLEL GROUP G1: DBMS Lab + OS Lab) ---")
assign("KN02", "CS302", "lab", "Lab-A (DBMS Lab)", pgroup="G1")
assign("RK03", "CS303", "lab", "Lab-B (OS Lab)", pgroup="G1")
# Regular (non-parallel) lab
assign("MP05", "CS305", "lab", "Lab-C (Networks Lab)")

# 5th Sem Theory
print("  --- 5th Sem Theory ---")
assign("DI06", "CS501", "theory")    # Compiler Design
assign("SM07", "CS502", "theory")    # Software Eng
assign("AR08", "CS503", "theory")    # Web Tech

# 5th Sem Labs
print("  --- 5th Sem Labs ---")
assign("AR08", "CS503", "lab", "Lab-A (DBMS Lab)")

# 5th Sem Electives
print("  --- 5th Sem Electives (CSOE1 + CSOE2) ---")
assign("AS01", "CSOE1", "theory")    # ML
assign("PS04", "CSOE2", "theory")    # Cyber Sec

# ===========================
# STEP 7: ELECTIVE BASKET
# ===========================
print("\n[7] Creating Elective Basket...")
basket = post("/elective-baskets/", {
    "name": "Open Elective Basket 1",
    "code": "OEB1",
    "semester_number": 5,
    "theory_hours_per_week": 3,
    "lab_hours_per_week": 0,
    "tutorial_hours_per_week": 0,
    "semester_ids": [SEM_5A],
    "subject_ids": [subjs["CSOE1"]["id"], subjs["CSOE2"]["id"]]
})
if basket:
    print(f"  Created basket: '{basket['name']}' with CSOE1 (ML) + CSOE2 (Cyber Sec)")
    print(f"  These will be scheduled at the SAME time slot!")

# ===========================
# STEP 8: GENERATE TIMETABLE
# ===========================
print("\n[8] Generating Timetable...")
gen = post("/timetable/generate", {"dept_id": DEPT, "clear_existing": True})
if gen:
    print(f"  Success: {gen.get('success')}")
    print(f"  Message: {gen.get('message')}")

# ===========================
# STEP 9: DISPLAY TIMETABLES
# ===========================
print("\n" + "=" * 120)
print("  GENERATED TIMETABLES")
print("=" * 120)

DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

for sem_id, sem_label in [(SEM_3A, "CSE 3rd Sem A"), (SEM_5A, "CSE 5th Sem A")]:
    tt = get(f"/timetable/view/semester/{sem_id}")
    if not tt:
        print(f"\n  {sem_label}: No timetable data")
        continue

    days = tt.get("days", [])
    print("\n" + "-" * 120)
    print(f"  {sem_label}")
    print("-" * 120)

    # Find max periods
    max_periods = max(len(d.get("slots", [])) for d in days) if days else 0

    # Header
    hdr = f"{'Day':^10}|"
    for p in range(max_periods):
        hdr += f"{'Period ' + str(p+1):^20}|"
    print(hdr)
    print("-" * len(hdr))

    for day in sorted(days, key=lambda d: d.get("day", 0)):
        day_num = day.get("day", 0)
        if day_num >= len(DAY_NAMES):
            continue
        row = f"{DAY_NAMES[day_num]:^10}|"

        for idx, s in enumerate(day.get("slots", [])):
            subj = s.get("subject_code") or s.get("subject_name") or ""
            teacher = s.get("teacher_name", "")
            tshort = teacher.split()[-1] if teacher else ""
            comp = s.get("component_type", "")
            batches = s.get("batch_allocations", [])
            is_elec = s.get("is_elective", False)

            if not subj:
                cell = "FREE"
            elif s.get("is_lab_continuation"):
                cell = ">> (cont)"
            elif len(batches) > 1:
                # PARALLEL LABS
                parts = []
                for b in batches:
                    bc = b.get("subject_code", "?")
                    bt = (b.get("teacher_name", "?").split()[-1]) if b.get("teacher_name") else "?"
                    parts.append(f"{bc}:{bt}")
                cell = " / ".join(parts)
            elif comp == "lab":
                cell = f"{subj} [LAB] {tshort}"
            elif is_elec:
                cell = f"{subj} [ELEC] {tshort}"
            else:
                cell = f"{subj} {tshort}"

            row += f"{cell:^20}|"
        print(row)

    # Feature summary
    all_slots = [s for d in days for s in d.get("slots", [])]
    filled = sum(1 for s in all_slots if s.get("subject_code"))
    labs = sum(1 for s in all_slots if s.get("component_type") == "lab")
    elecs = sum(1 for s in all_slots if s.get("is_elective"))
    parallels = sum(1 for s in all_slots if len(s.get("batch_allocations", [])) > 1)
    free = sum(1 for s in all_slots if not s.get("subject_code"))

    print(f"\n  >> {filled} classes | {labs} lab slots | {elecs} elective slots | {parallels} parallel-lab slots | {free} free periods")

print(f"\n{'=' * 120}")
print("  LEGEND")
print("  [LAB]   = Lab session (2-period block)")
print("  [ELEC]  = Elective (basket subjects share same slot)")
print("  (cont)  = Lab continuation (2nd period of lab block)")
print("  A / B   = Parallel labs (different subjects, same timeslot)")
print("  FREE    = No class scheduled")
print(f"{'=' * 120}")
print("\n  >> Open http://localhost:5173 in your browser to view the UI!")
