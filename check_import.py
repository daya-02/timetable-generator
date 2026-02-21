
import sys
import os

# Add backend folder to path so 'app' is importable
sys.path.append(os.path.join(os.getcwd(), 'backend'))

try:
    from app.services.generator import TimetableGenerator
    print("Import successful")
except Exception as e:
    import traceback
    traceback.print_exc()
    print(f"Import failed: {e}")
