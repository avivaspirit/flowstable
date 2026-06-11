import os
from PIL import Image

def optimize_image(filepath, max_width=1200, quality=80):
    try:
        if not os.path.exists(filepath):
            print(f"File not found: {filepath}")
            return
            
        initial_size = os.path.getsize(filepath) / 1024.0
        
        with Image.open(filepath) as img:
            # Check dimensions
            width, height = img.size
            if width > max_width:
                ratio = max_width / float(width)
                new_height = int(float(height) * ratio)
                img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)
                print(f"Resized {os.path.basename(filepath)} from {width}x{height} to {max_width}x{new_height}")
                
            # Save back with optimization
            img.save(filepath, "JPEG", optimize=True, quality=quality)
            
        final_size = os.path.getsize(filepath) / 1024.0
        print(f"Compressed {os.path.basename(filepath)}: {initial_size:.1f} KB -> {final_size:.1f} KB (Saved {(initial_size - final_size) / initial_size * 100:.1f}%)")
        
    except Exception as e:
        print(f"Error optimizing {filepath}: {e}")

if __name__ == "__main__":
    project_dir = "C:\\Users\\Re dmi\\Documents\\Codex\\2026-06-04\\1-data-reports-directory-5-files\\outputs\\flowstable-site"
    images_to_optimize = [
        "assets/photos/914737241717875_122114150625110108_1.jpg",
        "assets/photos/914737241717875_122114150625110108_0.jpg",
        "assets/photos/press/0k8a8862.jpg"
    ]
    
    for rel_path in images_to_optimize:
        full_path = os.path.join(project_dir, rel_path)
        optimize_image(full_path)
