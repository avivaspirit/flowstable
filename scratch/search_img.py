import os

def search_ref(root_dir, search_str):
    print(f"Searching for references to '{search_str}'...")
    found_count = 0
    for dirpath, _, filenames in os.walk(root_dir):
        if '.git' in dirpath or 'scratch' in dirpath or 'backup' in dirpath:
            continue
        for f in filenames:
            if f.endswith(('.html', '.js', '.json', '.yml')):
                filepath = os.path.join(dirpath, f)
                try:
                    with open(filepath, 'r', encoding='utf-8') as file:
                        content = file.read()
                        if search_str in content:
                            print(f" - Found in: {os.path.relpath(filepath, root_dir)}")
                            found_count += 1
                except Exception as e:
                    pass
    print(f"Total references found: {found_count}")

if __name__ == "__main__":
    project_dir = "C:\\Users\\Re dmi\\Documents\\Codex\\2026-06-04\\1-data-reports-directory-5-files\\outputs\\flowstable-site"
    search_ref(project_dir, "914737241717875_122114150625110108_1.jpg")
