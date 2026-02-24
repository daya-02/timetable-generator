import urllib.request
import json
import traceback

try:
    print('Fetching departments...')
    req = urllib.request.Request('http://localhost:8000/api/departments/')
    with urllib.request.urlopen(req) as res:
        depts = json.loads(res.read().decode())
    
    if not depts:
        print('No depts')
        exit(0)
    
    dept_id = depts[0]['id']
    print(f'Using dept_id: {dept_id}')
    
    url = f'http://localhost:8000/api/timetable/generate'
    payload = json.dumps({"dept_id": dept_id, "clear_existing": True, "semester_type": "EVEN"}).encode('utf-8')
    req2 = urllib.request.Request(url, data=payload, headers={'Content-Type': 'application/json'})
    
    with urllib.request.urlopen(req2) as res2:
        output = json.loads(res2.read().decode())
        print('Success:', output.get('success', False))
        print('Message:', output.get('message', ''))
        
except Exception as e:
    print('Failed to request:')
    traceback.print_exc()
