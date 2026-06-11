import json

def inspect():
    with open('assets/data/posts.json', 'r', encoding='utf-8') as f:
        posts = json.load(f)
        
    report = []
    cats = sorted(list(set(p['category'] for p in posts)))
    for c in cats:
        report.append(f"\n=== CATEGORY: {c} ===")
        cat_posts = [p for p in posts if p['category'] == c]
        for p in cat_posts:
            report.append(f" - {p.get('title', 'Untitled')}")
            
    with open('scratch/classification_report.txt', 'w', encoding='utf-8') as f:
        f.write('\n'.join(report))
    print("Report written to scratch/classification_report.txt")

if __name__ == '__main__':
    inspect()
