
import os

target_file = "app/services/generator.py"

with open(target_file, "r", encoding="utf-8") as f:
    content = f.read()

if "✔" in content:
    print(f"Found ✔ in {target_file}. Replacing...")
    new_content = content.replace("✔", "[OK]")
    with open(target_file, "w", encoding="utf-8") as f:
        f.write(new_content)
    print("Replaced successfully.")
else:
    print("✔ not found.")

if "🔒" in content:
    print(f"Found 🔒 in {target_file}. Replacing...")
    new_content = content.replace("🔒", "")
    with open(target_file, "w", encoding="utf-8") as f:
        f.write(new_content)
    print("Replaced successfully.")
else:
    print("🔒 not found.")

if "⚡" in content:
    print(f"Found ⚡ in {target_file}. Replacing...")
    new_content = content.replace("⚡", "")
    with open(target_file, "w", encoding="utf-8") as f:
        f.write(new_content)
    print("Replaced successfully.")
else:
    print("⚡ not found.")

if "🎯" in content:
    print(f"Found 🎯 in {target_file}. Replacing...")
    new_content = content.replace("🎯", "")
    with open(target_file, "w", encoding="utf-8") as f:
        f.write(new_content)
    print("Replaced successfully.")
else:
    print("🎯 not found.")

if "🔄" in content:
    print(f"Found 🔄 in {target_file}. Replacing...")
    new_content = content.replace("🔄", "")
    with open(target_file, "w", encoding="utf-8") as f:
        f.write(new_content)
    print("Replaced successfully.")
else:
    print("🔄 not found.")
