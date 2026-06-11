import os

def check_image_sizes(root_dir):
    print("Scanning image file sizes...")
    image_extensions = ('.jpg', '.jpeg', '.png', '.webp', '.gif')
    large_files = []
    total_size = 0
    file_count = 0
    
    for dirpath, _, filenames in os.walk(root_dir):
        # Exclude backup and .git
        if '.git' in dirpath or 'backup' in dirpath or 'scratch' in dirpath:
            continue
        for f in filenames:
            if f.lower().endswith(image_extensions):
                full_path = os.path.join(dirpath, f)
                size_kb = os.path.getsize(full_path) / 1024.0
                total_size += size_kb
                file_count += 1
                if size_kb > 200: # Files larger than 200KB are candidates for optimization
                    rel_path = os.path.relpath(full_path, root_dir)
                    large_files.append((rel_path, size_kb))
                    
    print(f"\nTotal Images Scanned: {file_count}")
    print(f"Total Combined Size: {total_size/1024.0:.2f} MB")
    
    # Sort large files
    large_files.sort(key=lambda x: x[1], reverse=True)
    print("\nImages larger than 200KB:")
    for path, size in large_files[:25]:
        print(f" - {path}: {size:.1f} KB")

if __name__ == "__main__":
    project_dir = "C:\\Users\\Re dmi\\Documents\\Codex\\2026-06-04\\1-data-reports-directory-5-files\\outputs\\flowstable-site"
    check_image_sizes(project_dir)
