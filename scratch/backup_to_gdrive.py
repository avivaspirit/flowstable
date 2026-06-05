import os
import shutil
import sys

def backup_files(src_dir, dest_drive_letter="G"):
    # Target backup folder in My Drive
    gdrive_base = f"{dest_drive_letter}:\\My Drive"
    dest_dir = os.path.join(gdrive_base, "flowstable-site-backup")
    
    # Check if Google Drive is running and mounted
    if not os.path.exists(gdrive_base):
        print(f"Error: Google Drive is not mounted at '{dest_drive_letter}:\\'.")
        print("Please ensure Google Drive Desktop is running and logged in.")
        return False
        
    print(f"Starting backup from: {src_dir}")
    print(f"Destination folder  : {dest_dir}")
    
    # Define directories and files to exclude
    exclude_dirs = {'.git', '.vercel', 'node_modules', '__pycache__'}
    exclude_files = {'.gitignore', 'server.log', 'preview.ps1'}
    
    copied_count = 0
    created_dirs = 0
    
    for root, dirs, files in os.walk(src_dir):
        # Filter out excluded directories
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        
        # Determine relative path from source
        rel_path = os.path.relpath(root, src_dir)
        if rel_path == ".":
            target_root = dest_dir
        else:
            target_root = os.path.join(dest_dir, rel_path)
            
        # Create target directory if it doesn't exist
        if not os.path.exists(target_root):
            os.makedirs(target_root)
            created_dirs += 1
            
        # Copy files
        for f in files:
            if f in exclude_files:
                continue
            src_file = os.path.join(root, f)
            dest_file = os.path.join(target_root, f)
            
            # Copy only if file is new or modified
            if not os.path.exists(dest_file) or os.path.getmtime(src_file) > os.path.getmtime(dest_file):
                shutil.copy2(src_file, dest_file)
                copied_count += 1
                print(f"Copied: {os.path.join(rel_path, f) if rel_path != '.' else f}")
                
    print(f"\nBackup complete!")
    print(f"Created directories: {created_dirs}")
    print(f"Copied/updated files: {copied_count}")
    return True

if __name__ == '__main__':
    src = r"C:\Users\Re dmi\Documents\Codex\2026-06-04\1-data-reports-directory-5-files\outputs\flowstable-site"
    # Allow passing drive letter as argument
    drive = sys.argv[1] if len(sys.argv) > 1 else "G"
    backup_files(src, drive)
