"""Fix semester dept_id values, regenerate, and display timetable."""
import urllib.request, json

BASE = "http://localhost:8000/api"
DEPT_ID = 1

def api(method, path, data=None):
    url = BASE + path
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
        print(f"  ERROR {e.code} on {method} {path}: {e.read().decode()[:200]}")
        return None

def get(path):
    return api("GET", path)

def put(path, data):
    return api("PUT", path, data)

def post(path, data):
    return api("POST", path, data)

# Step 1: Fix semester dept_id
print("=== Fixing semester dept_id ===")
semesters = get("/semesters/")
for sem in semesters:
    if sem.get("dept_id") is None:
        result = put(f"/semesters/{sem['id']}", {"dept_id": DEPT_ID})
        if result:
            print(f"  Fixed: {sem['code']} -> dept_id={DEPT_ID}")
        else:
            print(f"  Failed to fix: {sem['code']}")
    else:
        print(f"  OK: {sem['code']} dept_id={sem['dept_id']}")

# Step 2: Generate with dept_id
print("\n=== Generating Timetable (dept_id=1) ===")
gen = post("/timetable/generate", {"dept_id": DEPT_ID, "clear_existing": True})
if gen:
    print(f"  Success: {gen.get('success')}")
    print(f"  Message: {gen.get('message')}")

# Step 3: Display timetables
print("\n=== GENERATED TIMETABLES ===")
DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri"]

semesters = get("/semesters/")
for sem in semesters:
    sem_id = sem["id"]
    tt = get(f"/timetable/semester/{sem_id}")
    if not tt:
        continue

    days = tt.get("days", [])
    if not days:
        continue

    print(f"\n{'=' * 100}")
    print(f"  {sem['name']} ({sem['code']})")
    print(f"{'=' * 100}")

    max_slot = 0
    for day in days:
        for s in day.get("slots", []):
            if s.get("slot", 0) > max_slot:
                max_slot = s["slot"]

    # Header
    header = f"{'Day':<6}"
    for p in range(max_slot + 1):
        header += f"{'P' + str(p+1):^16}"
    print(header)
    print("-" * len(header))

    for day in sorted(days, key=lambda d: d.get("day", 0)):
        day_num = day.get("day", 0)
        if day_num >= len(DAY_NAMES):
            continue
        row = f"{DAY_NAMES[day_num]:<6}"

        slot_map = {}
        for s in day.get("slots", []):
            slot_map[s["slot"]] = s

        for p in range(max_slot + 1):
            if p in slot_map:
                s = slot_map[p]
                subj = s.get("subject_code", "") or s.get("subject_name", "?")[:6]
                teacher = s.get("teacher_name", "?")
                teacher_short = teacher.split()[-1][:6] if teacher else "?"
                comp = s.get("component_type", "")
                batches = s.get("batch_allocations", [])

                if s.get("is_lab_continuation"):
                    cell = "(cont)"
                elif batches and len(batches) > 1:
                    parts = []
                    for b in batches:
                        bsubj = b.get("subject_code", subj)
                        parts.append(bsubj)
                    cell = "/".join(parts)
                elif comp == "lab":
                    cell = f"{subj}[L]-{teacher_short}"
                elif s.get("is_elective"):
                    cell = f"{subj}[E]-{teacher_short}"
                else:
                    cell = f"{subj}-{teacher_short}"
            else:
                cell = "  ---  "
            row += f"{cell:^16}"
        print(row)

print(f"\n{'=' * 100}")
print("  OPEN http://localhost:5173 to view in browser")
print(f"{'=' * 100}")
