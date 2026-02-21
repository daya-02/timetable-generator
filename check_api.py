import urllib.request
import sys
import json

BASE_URL = "http://localhost:8001/api"

def check_endpoint(endpoint):
    url = f"{BASE_URL}{endpoint}"
    print(f"Checking {url}...")
    try:
        with urllib.request.urlopen(url, timeout=5) as response:
            status = response.getcode()
            content = response.read().decode('utf-8')
            print(f"Status: {status}")
            print(f"Response: {content[:200]}")
            return status == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    health = check_endpoint("/health")
    stats = check_endpoint("/dashboard/stats")
    
    if health and stats:
        print("Backend seems healthy!")
        sys.exit(0)
    else:
        print("Backend issues detected.")
        sys.exit(1)
