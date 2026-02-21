import os
import re

def fix_imports(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.py'):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Check if Optional is used but not imported from typing
                if 'Optional' in content and 'from typing import' in content:
                    if 'Optional' not in re.search(r'from typing import.*', content).group(0):
                        print(f"Fixing {path}")
                        # Add Optional to typing import
                        new_content = re.sub(r'from typing import (.*)', r'from typing import \1, Optional', content)
                        # Clean up if it was already there or if there are double commas
                        new_content = new_content.replace(', Optional, Optional', ', Optional')
                        new_content = new_content.replace('List, Optional', 'List, Optional') # ensure List is there if used
                        
                        # Sometimes it might be 'from typing import Optional' (without List)
                        # Let's use a more robust replacement
                        
                        with open(path, 'w', encoding='utf-8') as f:
                            f.write(new_content)

def fix_imports_robust(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.py'):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                
                has_optional = any('Optional' in line for line in lines if not line.strip().startswith(('from', 'import', '#', '"""')))
                typing_import_line_idx = -1
                for i, line in enumerate(lines):
                    if line.startswith('from typing import'):
                        typing_import_line_idx = i
                        break
                
                if has_optional:
                    if typing_import_line_idx != -1:
                        if 'Optional' not in lines[typing_import_line_idx]:
                            print(f"Adding Optional to typing import in {path}")
                            lines[typing_import_line_idx] = lines[typing_import_line_idx].strip() + ", Optional\n"
                    else:
                        print(f"Adding 'from typing import Optional' to {path}")
                        # Insert at beginning after docstring or at top
                        lines.insert(0, "from typing import Optional\n")
                
                with open(path, 'w', encoding='utf-8') as f:
                    f.writelines(lines)

if __name__ == "__main__":
    fix_imports_robust('backend/app/api')
