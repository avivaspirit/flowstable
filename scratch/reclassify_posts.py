import json
import re
import os

def get_new_category(title, message):
    text = (title + " " + message).lower()
    
    # Life & Mindset keywords (highest priority because it's a specific philosophical topic)
    life_kw = [
        'stoicism', 'สโตอิก', 'overflow', 'mental', 'wellness', 
        'สุขภาพใจ', 'ความสุข', 'คิดดี', 'พลังงานบวก', 'positive', 'spiritual', 'สมาธิ', 
        'จิตใจ', 'ความหวัง', 'อ่านหนังสือ', 'หนังสือ', 'book', 'read', 'mentoring', 'mentor', 
        'ความฝัน', 'abundance', 'ปรัชญา', 'philosophy', 'นิ้วกลม', 'ความรู้สึก', 'ทัศนคติ',
        'จิตวิญญาณ', 'คิดบวก', 'จิตใต้สำนึก'
    ]

    # Investment keywords
    inv_kw = [
        'ลงทุน', 'นักลงทุน', 'หุ้น', ' vi ', 'value invest', 'ตลาดหุ้น', 'ตลาดทุน',
        'พอร์ต', 'port', 'financial', 'finance', 'การเงิน', 'บริหารเงิน', 'เก็บเงิน', 
        'วางแผนการเงิน', 'ปันผล', 'อสังหา', ' leasehold', 'สินทรัพย์', 'asset', 'wealth',
        'buffett', 'บัฟเฟตต์', 'เสี่ยยักษ์', 'bottom fishing', 'bottomliner', 'คริปโต', 
        'crypto', 'bitcoin', 'btc', 'blockchain', 'web3', 'rwa', 'tokenization'
    ]
    
    # Business keywords
    bus_kw = [
        'ธุรกิจ', 'business', 'sme', 'startup', 'scale', 'franchise', 'แฟรนไชส์', 
        'yoguruto', 'โยกุรุโตะ', 'sappe', 'เซ็ปเป้', 'tarad.com', 'ตลาดดอตคอม', 
        'one person business', 'solopreneur', 'ผู้ประกอบการ', ' ai ', 'gemini', 'chatgpt', 
        'marketing', 'การตลาด', ' b2b', 'hackathon', 'disrupt', 'creator', 'แบรนด์', 'brand',
        'โรงงาน', 'ผู้บริหาร', 'managing director', 'co-founder', 'customer'
    ]
    
    # Match life & mindset first (high priority)
    if any(kw in text for kw in life_kw):
        return 'Life & Mindset'
    # Match investment next
    elif any(kw in text for kw in inv_kw):
        return 'Investment'
    # Match business next
    elif any(kw in text for kw in bus_kw):
        return 'Business'
    # Default to Gatherings
    return 'Gatherings'

def run():
    # 1. Update posts.json
    posts_path = 'assets/data/posts.json'
    with open(posts_path, 'r', encoding='utf-8') as f:
        posts = json.load(f)
    
    cat_stats = {}
    for p in posts:
        new_cat = get_new_category(p.get('title', ''), p.get('message', ''))
        p['category'] = new_cat
        cat_stats[new_cat] = cat_stats.get(new_cat, 0) + 1
        
    with open(posts_path, 'w', encoding='utf-8') as f:
        json.dump(posts, f, ensure_ascii=False, indent=2)
        
    print("New classification stats for posts.json:")
    for cat, count in sorted(cat_stats.items()):
        print(f"  {cat}: {count}")

    # 2. Update archive.html
    archive_path = 'archive.html'
    with open(archive_path, 'r', encoding='utf-8') as f:
        html = f.read()

    # Update chips block
    new_chips = """          <div class="category-chips" id="categoryChips">
            <button class="chip active" data-value="all">All notes</button>
            <button class="chip" data-value="Investment">Investment</button>
            <button class="chip" data-value="Business">Business</button>
            <button class="chip" data-value="Life & Mindset">Life & Mindset</button>
            <button class="chip" data-value="Gatherings">Gatherings</button>
          </div>"""

    # Replace category chips via regex
    html = re.sub(
        r'<div class="category-chips" id="categoryChips">.*?</div>',
        new_chips.replace('\\', '\\\\'),
        html,
        flags=re.DOTALL
    )

    # Update individual static posts in HTML
    post_pattern = re.compile(
        r'(<article class="archive-post"\s+data-category="([^"]+)"\s+data-search="([^"]+)">\s*<div class="archive-head">\s*<div>\s*<p class="eyebrow">([^<]+)</p>\s*<h2>([^<]+)</h2>.*?<div class="archive-copy">(.*?)</div>\s*</article>)',
        re.DOTALL
    )
    
    matches = post_pattern.findall(html)
    print(f"Found {len(matches)} static article blocks in HTML.")
    
    updated_html = html
    for full_block, old_cat, old_search, old_eyebrow, title, copy_body in matches:
        # Re-derive category
        clean_copy = re.sub(r'<[^>]+>', '', copy_body)
        new_cat = get_new_category(title, clean_copy)
        
        new_block = full_block
        
        # 1. Replace data-category attribute
        new_block = new_block.replace(f'data-category="{old_cat}"', f'data-category="{new_cat}"')
        
        # 2. Update data-search text
        old_cat_lower = old_cat.lower()
        new_cat_lower = new_cat.lower()
        new_search = old_search
        
        # Remove old categories from search text to avoid bloat
        for c in ['conversations', 'field notes', 'gatherings', 'learning', 'reflections', 'investment', 'business', 'life & mindset']:
            new_search = new_search.replace(f" {c}", "")
            
        new_search = f"{new_search} {new_cat_lower}"
        new_block = new_block.replace(f'data-search="{old_search}"', f'data-search="{new_search}"')
        
        # 3. Update eyebrow tag category
        if " / " in old_eyebrow:
            parts = old_eyebrow.split(" / ")
            new_eyebrow = f"{parts[0]} / {new_cat}"
            new_block = new_block.replace(f'<p class="eyebrow">{old_eyebrow}</p>', f'<p class="eyebrow">{new_eyebrow}</p>')
            
        updated_html = updated_html.replace(full_block, new_block)
        
    with open(archive_path, 'w', encoding='utf-8') as f:
        f.write(updated_html)
    print("Archive HTML updated successfully.")

if __name__ == '__main__':
    run()
