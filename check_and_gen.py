import urllib.request, json

BASE = "http://localhost:8000/api"

def get(path):
    r = urllib.request.urlopen(BASE + path)
    return json.loads(r.read().decode())

semesters = get("/semesters/")
print("=== SEMESTERS ===")
for s in semesters:
    print(f"  id={s['id']} code={s['code']} name={s['name']} dept_id={s.get('dept_id')}")

# Try generating without dept filter
print("\n=== Trying generate without dept_id filter ===")
data = json.dumps({"clear_existing": True}).encode()
req = urllib.request.Request(BASE + "/timetable/generate", data=data, method="POST")
req.add_header("Content-Type", "application/json")
try:
    resp = urllib.request.urlopen(req)
    result = json.loads(resp.read().decode())
    print(f"  Success: {result.get('success')}")
    print(f"  Message: {result.get('message')}")
    print(f"  Allocations: {result.get('total_allocated')}")
except urllib.error.HTTPError as e:
    print(f"  Error: {e.code} - {e.read().decode()}")
