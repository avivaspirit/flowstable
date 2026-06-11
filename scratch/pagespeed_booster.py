import os

def boost_performance(root_dir):
    html_files = ['index.html', 'about.html', 'reels.html', 'guests.html', 'archive.html']
    
    # 1. Update HTML Files
    for filename in html_files:
        filepath = os.path.join(root_dir, filename)
        if not os.path.exists(filepath):
            print(f"File not found: {filename}")
            continue
            
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Add LCP Preload tag
        preload_tag = ""
        if filename == 'index.html':
            preload_tag = '  <link rel="preload" href="assets/photos/914737241717875_122112465597110108_0.jpg" as="image">\n'
        elif filename in ['about.html', 'guests.html', 'reels.html']:
            preload_tag = '  <link rel="preload" href="assets/photos/914737241717875_122093694105110108_0.jpg" as="image">\n'
            
        if preload_tag and 'as="image"' not in content:
            target_hook = '<link rel="preconnect" href="https://fonts.googleapis.com">'
            if target_hook in content:
                content = content.replace(target_hook, preload_tag + target_hook)
                print(f"Added LCP image preload in {filename}")
                
        # Fix Brand Logo Image Dimensions in header to prevent CLS
        old_logo_img = '<img src="assets/photos/914737241717875_122093694105110108_3.jpg" alt="Flow\'s Table logo">'
        new_logo_img = '<img src="assets/photos/914737241717875_122093694105110108_3.jpg" alt="Flow\'s Table logo" width="36" height="36">'
        if old_logo_img in content:
            content = content.replace(old_logo_img, new_logo_img)
            print(f"Added explicit width/height to logo image in {filename}")
            
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
            
    # 2. Update styles.css carousel dots contrast for accessibility
    css_path = os.path.join(root_dir, 'assets', 'styles.css')
    if os.path.exists(css_path):
        with open(css_path, 'r', encoding='utf-8') as f:
            css_content = f.read()
            
        old_dot_style = (
            '.carousel-dot {\n'
            '  width: 8px;\n'
            '  height: 8px;\n'
            '  border-radius: 50%;\n'
            '  background: var(--line);\n'
        )
        new_dot_style = (
            '.carousel-dot {\n'
            '  width: 8px;\n'
            '  height: 8px;\n'
            '  border-radius: 50%;\n'
            '  background: rgba(29, 23, 20, 0.25);\n'
        )
        
        if old_dot_style in css_content:
            css_content = css_content.replace(old_dot_style, new_dot_style)
            print("Optimized carousel dots color contrast in styles.css")
            
            with open(css_path, 'w', encoding='utf-8') as f:
                f.write(css_content)

if __name__ == "__main__":
    project_dir = "C:\\Users\\Re dmi\\Documents\\Codex\\2026-06-04\\1-data-reports-directory-5-files\\outputs\\flowstable-site"
    boost_performance(project_dir)
