"""Debug: Check what requirements were built and why labs/electives are missing."""
import urllib.request, json

BASE = "http://localhost:8000/api"

def get(path):
    r = urllib.request.urlopen(BASE + path)
    return json.loads(r.read().decode())

def post(path, data):
    body = json.dumps(data).encode()
    req = urllib.request.Request(BASE + path, data=body, method="POST")
    req.add_header("Content-Type", "application/json")
    try:
        resp = urllib.request.urlopen(req)
        return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        print(f"  ERROR {e.code}: {e.read().decode()[:300]}")
        return None

# Check CST assignments
print("=== CLASS-SUBJECT-TEACHER (raw) ===")
teachers = get("/teachers/")
for t in teachers:
    for a in t.get("class_assignments", []):
        subj = a.get("subject", {})
        sem = a.get("semester", {})
        print(f"  sem_id={a.get('semester_id',a.get('semester',{}).get('id','?'))}"
              f"  subj_id={subj.get('id','?')} subj={subj.get('code','?')}"
              f"  teacher_id={t.get('id','?')} teacher={t.get('teacher_code','?')}"
              f"  comp={a.get('component_type','?')}"
              f"  room_id={a.get('room_id')}"
              f"  batch_id={a.get('batch_id')}"
              f"  parallel={a.get('parallel_lab_group')}")

# Show subject associations
print("\n=== SUBJECTS -> SEMESTERS ===")
subjects = get("/subjects/")
for s in subjects:
    sem_ids = [se.get("id") for se in s.get("semesters", [])]
    print(f"  {s['code']} (id={s['id']}, elective={s.get('is_elective')}, basket_id={s.get('elective_basket_id')}): sems={sem_ids}")

# Try regenerate with debug
print("\n=== REGENERATING with debug ===")
result = post("/timetable/generate", {"dept_id": 1, "clear_existing": True})
if result:
    print(f"  success={result.get('success')}")
    print(f"  message={result.get('message')}")
    print(f"  total_allocated={result.get('total_allocated')}")
