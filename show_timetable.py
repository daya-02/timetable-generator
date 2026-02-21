"""Display generated timetables from the API."""
import urllib.request, json

BASE = "http://localhost:8000/api"

def get(path):
    try:
        r = urllib.request.urlopen(BASE + path)
        return json.loads(r.read().decode())
    except Exception as e:
        print(f"  ERROR: {e}")
        return None

DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri"]

semesters = get("/semesters/")
if not semesters:
    print("No semesters found")
    exit()

for sem in semesters:
    sem_id = sem["id"]
    tt = get(f"/timetable/view/semester/{sem_id}")
    if not tt:
        continue

    days = tt.get("days", [])
    if not days:
        print(f"\n  {sem['name']}: No allocations")
        continue

    print(f"\n{'=' * 120}")
    print(f"  TIMETABLE: {sem['name']} ({sem.get('code','?')})")
    print(f"{'=' * 120}")

    max_slot = 0
    for day in days:
        for s in day.get("slots", []):
            if s.get("slot", 0) > max_slot:
                max_slot = s["slot"]

    # Header
    header = f"{'Day':<6}"
    for p in range(max_slot + 1):
        header += f"{'P' + str(p+1):^18}"
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
                subj = s.get("subject_code", "") or s.get("subject_name", "?")[:8]
                teacher = s.get("teacher_name", "?")
                # Get first name or short version
                tshort = teacher.split()[-1][:5] if teacher else "?"
                comp = s.get("component_type", "")
                batches = s.get("batch_allocations", [])

                if s.get("is_lab_continuation"):
                    cell = "(cont)"
                elif batches and len(batches) > 1:
                    # Parallel labs!
                    parts = []
                    for b in batches:
                        bsubj = b.get("subject_code", subj)
                        parts.append(f"{bsubj}")
                    cell = "/".join(parts) + "[PAR]"
                elif comp == "lab":
                    cell = f"{subj}[LAB]-{tshort}"
                elif s.get("is_elective"):
                    cell = f"{subj}[ELEC]-{tshort}"
                else:
                    cell = f"{subj}-{tshort}"
            else:
                cell = "---"
            row += f"{cell:^18}"
        print(row)

    # Show summary
    total_slots = sum(len(d.get("slots", [])) for d in days)
    lab_slots = sum(1 for d in days for s in d.get("slots", []) if s.get("component_type") == "lab")
    elective_slots = sum(1 for d in days for s in d.get("slots", []) if s.get("is_elective"))
    parallel_slots = sum(1 for d in days for s in d.get("slots", []) if len(s.get("batch_allocations", [])) > 1)

    print(f"\n  Summary: {total_slots} total slots | {lab_slots} lab slots | {elective_slots} elective slots | {parallel_slots} parallel-lab slots")

print(f"\n{'=' * 120}")
print("  Legend: [LAB]=Lab block, [ELEC]=Elective, [PAR]=Parallel multi-subject lab, (cont)=Lab continuation")
print(f"{'=' * 120}")
