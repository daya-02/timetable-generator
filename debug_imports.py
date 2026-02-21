import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

modules = [
    "app.db.models",
    "app.schemas.schemas",
    "app.services.pdf_service",
    "app.services.reporting",
    "app.services.generator",
    "app.services.substitution",
    "app.api.subjects",
    "app.api.elective_baskets",
    "main"
]

print("Starting import check...")
for module in modules:
    try:
        print(f"Importing {module}...")
        __import__(module)
        print(f"[OK] {module} imported successfully")
    except Exception as e:
        print(f"[FAIL] Failed to import {module}: {e}")
        # Print full traceback to see line number
        import traceback
        traceback.print_exc()
        break
