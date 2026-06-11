import os

def optimize_files(root_dir):
    html_files = ['index.html', 'about.html', 'reels.html', 'guests.html', 'archive.html']
    
    font_preconnect = (
        '  <link rel="preconnect" href="https://fonts.googleapis.com">\n'
        '  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
        '  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">\n'
    )
    
    # 1. Optimize HTML Files
    for filename in html_files:
        filepath = os.path.join(root_dir, filename)
        if not os.path.exists(filepath):
            print(f"File not found: {filename}")
            continue
            
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Check if already optimized
        if 'fonts.gstatic.com' in content:
            print(f"{filename} is already optimized for fonts.")
            continue
            
        # Insert Google Fonts preconnect and style links in the <head>
        target_link = '<link rel="stylesheet" href="assets/styles.css">'
        if target_link in content:
            new_links = font_preconnect + '  ' + target_link + '\n  <script src="assets/site.js" defer></script>'
            content = content.replace(target_link, new_links)
            print(f"Optimized font loading and script deferring in <head> of {filename}")
        else:
            print(f"Warning: Could not find target stylesheet link in {filename}")
            
        # Remove the old script reference from the bottom
        old_script = '<script src="assets/site.js"></script>'
        if old_script in content:
            content = content.replace(old_script, '')
            print(f"Removed old bottom script reference from {filename}")
            
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
            
    # 2. Optimize styles.css
    css_path = os.path.join(root_dir, 'assets', 'styles.css')
    if os.path.exists(css_path):
        with open(css_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            
        # Remove first line if it contains Google Fonts @import
        if lines and '@import' in lines[0] and 'fonts.googleapis.com' in lines[0]:
            print(f"Removing render-blocking @import from styles.css")
            lines = lines[1:]
            
            with open(css_path, 'w', encoding='utf-8') as f:
                f.writelines(lines)
        else:
            print("No render-blocking @import found in styles.css (already removed).")

if __name__ == "__main__":
    project_dir = "C:\\Users\\Re dmi\\Documents\Codex\\2026-06-04\\1-data-reports-directory-5-files\\outputs\\flowstable-site"
    optimize_files(project_dir)
