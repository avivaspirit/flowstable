import json

def inspect():
    with open('assets/data/posts.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    out_lines = []
    out_lines.append(f"Total posts: {len(data)}")
    for i, p in enumerate(data):
        title = p.get('title', 'Untitled')
        cat = p.get('category', 'None')
        msg = p.get('message', '')[:120].replace('\n', ' ')
        out_lines.append(f"{i+1:03d}. Title: {title[:35]:<35} | Cat: {cat:<15} | Msg: {msg}")
        
    with open('scratch/inspected_posts.txt', 'w', encoding='utf-8') as f:
        f.write('\n'.join(out_lines))
    print("Inspection complete. Saved to scratch/inspected_posts.txt")

if __name__ == '__main__':
    inspect()
