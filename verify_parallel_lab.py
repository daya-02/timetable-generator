import urllib.request
import urllib.parse
import json
import time

BASE_URL = "http://localhost:8000"

def make_request(url, method='GET', data=None):
    try:
        req = urllib.request.Request(url, method=method)
        if data:
            json_data = json.dumps(data).encode('utf-8')
            req.add_header('Content-Type', 'application/json')
            req.data = json_data
        
        with urllib.request.urlopen(req) as response:
            if response.status >= 200 and response.status < 300:
                result = response.read().decode('utf-8')
                return json.loads(result) if result else True
            else:
                print(f"Request failed: {response.status} {response.reason}")
    except urllib.error.HTTPError as e:
        print(f"HTTP Error: {e.code} {e.reason}")
        try:
           print(e.read().decode('utf-8'))
        except: pass
    except Exception as e:
        print(f"Error making request: {e}")
    return None

def get_teachers():
    return make_request(f"{BASE_URL}/api/teachers") or []

def get_subjects():
    return make_request(f"{BASE_URL}/api/subjects?limit=100") or []

def get_semesters():
    return make_request(f"{BASE_URL}/api/semesters") or []

def get_rooms():
    return make_request(f"{BASE_URL}/api/rooms") or []

def get_batches(semester_id):
    return make_request(f"{BASE_URL}/api/semesters/{semester_id}/batches") or []

def create_assignment(teacher_id, data):
    print(f"Creating assignment for teacher {teacher_id}: {json.dumps(data)}")
    return make_request(f"{BASE_URL}/api/teachers/{teacher_id}/assignments", method='POST', data=data)

def generate_timetable(semester_ids):
    print("Generating timetable...")
    data = {
        "semester_ids": semester_ids,
        "clear_existing": True
    }
    result = make_request(f"{BASE_URL}/api/timetable/generate", method='POST', data=data)
    if result and result.get('success'):
        print(f"Timetable generated successfully. {result['total_allocations']} allocations.")
        return True
    else:
        print(f"Generation failed: {result}")
        return False

def get_allocations(semester_id):
    # urllib doesn't handle query params automatically in urlopen for GET
    return make_request(f"{BASE_URL}/api/timetable/allocations?semester_id={semester_id}") or []

def main():
    teachers = get_teachers()
    subjects = get_subjects()
    semesters = get_semesters()
    rooms = get_rooms()

    if not teachers or not subjects or not semesters or not rooms:
        print("Failed to fetch initial data.")
        return

    # 1. Find a Semester (e.g. Civil 4th Sem)
    # Filter by name or just pick one that has batches
    target_semester = None
    target_batches = []
    
    for sem in semesters:
        batches = get_batches(sem['id'])
        if len(batches) >= 2:
            target_semester = sem
            target_batches = batches
            break
            
    if not target_semester:
        print("No semester with at least 2 batches found.")
        return

    print(f"Target Semester: {target_semester['name']} (ID: {target_semester['id']})")
    print(f"Batches: {[b['name'] for b in target_batches]}")

    # 2. Find 2 Lab Subjects in this Department (or compatible)
    # We need two DIFFERENT subjects for the parallel lab test
    lab_subjects = [s for s in subjects if s['lab_hours_per_week'] > 0]
    if len(lab_subjects) < 2:
        print("Not enough lab subjects found.")
        # Create Dummy Lab Subjects? No, risk polluting.
        return

    subject1 = lab_subjects[0]
    subject2 = lab_subjects[1]
    
    print(f"Subject 1: {subject1['name']} ({subject1['code']})")
    print(f"Subject 2: {subject2['name']} ({subject2['code']})")

    # 3. Find 2 Teachers and 2 Labs
    teacher1 = teachers[0]
    teacher2 = teachers[1] if len(teachers) > 1 else teachers[0]
    
    lab_rooms = [r for r in rooms if r['room_type'] == 'lab']
    if len(lab_rooms) < 2:
         print("Not enough lab rooms.")
         return
         
    room1 = lab_rooms[0]
    room2 = lab_rooms[1]

    # 4. Create Parallel Assignments
    # B1 -> Subject 1 -> Teacher 1 -> Room 1 (Group G1)
    # B2 -> Subject 2 -> Teacher 2 -> Room 2 (Group G1)
    
    parallel_group = "TEST_G1"
    
    # Assignment 1
    a1_data = {
        "semester_id": target_semester['id'],
        "subject_id": subject1['id'],
        "teacher_id": teacher1['id'],
        "component_type": "lab",
        "hours_per_week": subject1['lab_hours_per_week'],
        "batch_id": target_batches[0]['id'],
        "room_id": room1['id'],
        "parallel_lab_group": parallel_group
    }
    create_assignment(teacher1['id'], a1_data)

    # Assignment 2
    a2_data = {
        "semester_id": target_semester['id'],
        "subject_id": subject2['id'],
        "teacher_id": teacher2['id'], # Different teacher
        "component_type": "lab",
        "hours_per_week": subject2['lab_hours_per_week'], # Make sure blocks match. If not, generator handles max.
        "batch_id": target_batches[1]['id'],
        "room_id": room2['id'],
        "parallel_lab_group": parallel_group
    }
    create_assignment(teacher2['id'], a2_data)
    
    # 5. Generate
    if generate_timetable([target_semester['id']]):
        # 6. Verify
        allocs = get_allocations(target_semester['id'])
        
        # Check if we have allocs with parallel_lab_group logic
        # Basically, see if B1 and B2 are scheduled in SAME slots with DIFFERENT subjects
        
        # Group by (Day, Slot)
        slots = {}
        for a in allocs:
            key = (a['day'], a['slot'])
            if key not in slots: slots[key] = []
            slots[key].append(a)
            
        found_parallel = False
        for key, slot_allocs in slots.items():
            # Check if this slot has both subjects assigned to different batches
            # Note: Allocations might be split or grouped depending on API response
            # But underlying logic is Allocation entry per batch
            
            has_sub1 = any(a['subject']['id'] == subject1['id'] and a['batch_id'] == target_batches[0]['id'] for a in slot_allocs)
            has_sub2 = any(a['subject']['id'] == subject2['id'] and a['batch_id'] == target_batches[1]['id'] for a in slot_allocs)
            
            if has_sub1 and has_sub2:
                print(f"SUCCESS: Found parallel scheduling at Day {key[0]} Slot {key[1]}!")
                found_parallel = True
                break
        
        if not found_parallel:
            print("FAILURE: Did not find parallel scheduling of specified subjects.")
            # Print debug info regarding the lab allocs
            print("Allocations involving test subjects:")
            for a in allocs:
                if a['subject']['id'] in [subject1['id'], subject2['id']]:
                    print(f"Day {a['day']} Slot {a['slot']} Sub: {a['subject']['code']} Batch: {a['batch_id']}")

if __name__ == "__main__":
    main()
