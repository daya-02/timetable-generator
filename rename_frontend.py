import os

dir_path = "frontend/src"
replacements = {
    "seminar_hours_per_week": "self_study_hours_per_week",
    "internship_hours_per_week": "seminar_hours_per_week",
    "internship_block_size": "seminar_block_size",
    "internship_day_based": "seminar_day_based",
    "seminar_hours": "self_study_hours",
    "internship_hours": "seminar_hours",
    "internshipDayBased": "seminarDayBased",
    "internshipBlock": "seminarBlock",
    "isInternship": "isSeminar",
    "isSeminar": "isSelfStudy",
    "'internship'": "'seminar'",
    "'seminar'": "'self_study'",
    '"internship"': '"seminar"',
    '"seminar"': '"self_study"',
    "h Seminar": "h Self Study",
    "h Internship": "h Seminar",
    "Internship / IT": "Seminar",
    "Seminar": "Self Study",
    "badge-seminar": "badge-self-study",
    "badge internship": "badge seminar",
    "badge seminar": "badge self-study",
}

for root, dirs, files in os.walk(dir_path):
    for filename in files:
        if filename.endswith(".jsx") or filename.endswith(".js") or filename.endswith(".css"):
            file_path = os.path.join(root, filename)
            try:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()

                for old, new in replacements.items():
                    content = content.replace(old, new)

                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(content)
            except Exception as e:
                print(e)
                pass

print("Frontend replacements complete.")
