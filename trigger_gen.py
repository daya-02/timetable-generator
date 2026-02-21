import urllib.request
import urllib.error
import json
import time

def trigger_generation():
    url = "http://localhost:8000/api/timetable/generate"
    try:
        print(f"Triggering generation at {url}...")
        # Empty payload or specific semesters if needed. Assuming empty generates for all.
        req = urllib.request.Request(
            url, 
            data=json.dumps({}).encode('utf-8'),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        
        with urllib.request.urlopen(req, timeout=60) as response:
            status = response.getcode()
            if status == 200:
                print("Generation Successful!")
                # Get response body
                data = json.load(response)
                print(json.dumps(data, indent=2))
            else:
                print(f"Generation Failed: {status}")
            
    except urllib.error.HTTPError as e:
        print(f"HTTP Error: {e.code}")
        print(e.read().decode('utf-8'))
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    trigger_generation()
