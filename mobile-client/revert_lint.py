import os
import re

src_dir = os.path.join(os.getcwd(), 'src')

def replace_in_file(filepath, pattern, replacement):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    new_content = re.sub(pattern, replacement, content)
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

# Revert catch (_e) -> catch (e) across all files
for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith('.js'):
            filepath = os.path.join(root, file)
            replace_in_file(filepath, r'catch\s*\(\s*_error\s*\)', 'catch (error)')
            replace_in_file(filepath, r'catch\s*\(\s*_err\s*\)', 'catch (err)')
            replace_in_file(filepath, r'catch\s*\(\s*_e\s*\)', 'catch (e)')

print("Reverted catch variables.")
