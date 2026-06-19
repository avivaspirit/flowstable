import os
import json
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
POSTS_FILE = os.path.join(BASE_DIR, "assets", "data", "posts.json")
SITEMAP_FILE = os.path.join(BASE_DIR, "sitemap.xml")

STATIC_PAGES = [
    ("", "weekly", "1.0"),
    ("about", "monthly", "0.8"),
    ("articles", "weekly", "0.9"),
    ("reels", "weekly", "0.8"),
    ("guests", "monthly", "0.8")
]

MIN_MSG_CHARS = 100  # Only include posts with meaningful content

def generate_sitemap():
    today = datetime.now().strftime("%Y-%m-%d")
    
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    ]
    
    # Static pages
    for path, changefreq, priority in STATIC_PAGES:
        loc = f"https://flowstable.vercel.app/{path}"
        lines.append("  <url>")
        lines.append(f"    <loc>{loc}</loc>")
        lines.append(f"    <lastmod>{today}</lastmod>")
        lines.append(f"    <changefreq>{changefreq}</changefreq>")
        lines.append(f"    <priority>{priority}</priority>")
        lines.append("  </url>")
        
    # Dynamic posts — only include those with meaningful message content
    posts_count = 0
    skipped = 0
    if os.path.exists(POSTS_FILE):
        with open(POSTS_FILE, "r", encoding="utf-8") as f:
            try:
                posts = json.load(f)
                for post in posts:
                    if "id" in post:
                        msg = post.get("message", "").strip()
                        if len(msg) < MIN_MSG_CHARS:
                            skipped += 1
                            continue
                        loc = f"https://flowstable.vercel.app/notes/{post['id']}"
                        lastmod = today
                        if post.get("created_time"):
                            lastmod = post["created_time"][:10]
                        lines.append("  <url>")
                        lines.append(f"    <loc>{loc}</loc>")
                        lines.append(f"    <lastmod>{lastmod}</lastmod>")
                        lines.append("    <changefreq>monthly</changefreq>")
                        lines.append("    <priority>0.6</priority>")
                        lines.append("  </url>")
                        posts_count += 1
                if skipped:
                    print(f"  Skipped {skipped} posts with message < {MIN_MSG_CHARS} chars")
            except Exception as e:
                print(f"Error loading posts.json for sitemap: {e}")
                
    lines.append("</urlset>")
    
    with open(SITEMAP_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
        
    print(f"Generated sitemap.xml with {len(STATIC_PAGES) + posts_count} URLs")

if __name__ == "__main__":
    generate_sitemap()
