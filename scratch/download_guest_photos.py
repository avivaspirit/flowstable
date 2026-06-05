import urllib.request
import urllib.parse
import re
import json
import os
import sys
from PIL import Image
import io

# Define the list of guests and their search queries
GUESTS = [
    {
        "id": 1,
        "name": "Tiwa Chinshadaphong",
        "query": "ทิวา ชินธาดาพงศ์"
    },
    {
        "id": 2,
        "name": "Suthon Singhasitthangkul",
        "query": "สุธน สิงหสิทธางกูร"
    },
    {
        "id": 3,
        "name": "Pawoot Pom Ponpipat",
        "query": "ภาวุธ พงษ์วิทยภานุ"
    },
    {
        "id": 4,
        "name": "Jing Chanapan",
        "query": "ชนาพรรณ จึงรุ่งเรืองกิจ"
    },
    {
        "id": 5,
        "name": "Supachai Parchariyanon",
        "query": "ศุภชัย พาร์ชาเรียนนท์"
    },
    {
        "id": 6,
        "name": "Toy Kasidit",
        "query": "กษิดิศ สตางค์มงคล"
    },
    {
        "id": 7,
        "name": "Tre Pramoj",
        "query": "ตรี ปราโมช"
    },
    {
        "id": 8,
        "name": "Nithi Satchatippavarn",
        "query": "นิธิ สัจจทิพวรรณ"
    },
    {
        "id": 9,
        "name": "Punyawe Chantarakajorn",
        "query": "ปุณยวีร์ จันทรขจร"
    },
    {
        "id": 10,
        "name": "Benz Arnun",
        "query": "Benz Arnun One Person Business"
    },
    {
        "id": 11,
        "name": "Benz Vorapat",
        "query": "วรภัทร ชวนะนันท์"
    }
]

def search_bing_images(query):
    url = "https://www.bing.com/images/search?q=" + urllib.parse.quote_plus(query)
    req = urllib.request.Request(
        url, 
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
    )
    try:
        with urllib.request.urlopen(req) as response:
            html = response.read().decode('utf-8')
            matches = re.findall(r'class="iusc"[^>]*m="([^"]+)"', html)
            images = []
            for m in matches:
                m_clean = m.replace('&quot;', '"').replace('&amp;', '&')
                try:
                    data = json.loads(m_clean)
                    if 'murl' in data:
                        images.append(data['murl'])
                except Exception:
                    match_url = re.search(r'"murl"\s*:\s*"([^"]+)"', m_clean)
                    if match_url:
                        images.append(match_url.group(1))
            return images
    except Exception as e:
        print(f"Error searching Bing for {query}: {e}")
        return []

def download_and_process_image(url, output_path):
    print(f"Attempting to download: {url}")
    req = urllib.request.Request(
        url, 
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            image_data = response.read()
            img = Image.open(io.BytesIO(image_data))
            
            # Convert palette/RGBA images to RGB
            if img.mode != 'RGB':
                img = img.convert('RGB')
                
            # Perform centered square crop
            w, h = img.size
            min_dim = min(w, h)
            left = (w - min_dim) / 2
            top = (h - min_dim) / 2
            right = (w + min_dim) / 2
            bottom = (h + min_dim) / 2
            
            img_cropped = img.crop((left, top, right, bottom))
            img_resized = img_cropped.resize((300, 300), Image.Resampling.LANCZOS)
            
            # Save as WebP
            img_resized.save(output_path, 'WEBP', quality=85)
            print(f"Saved: {output_path} ({os.path.getsize(output_path)} bytes)")
            return True
    except Exception as e:
        print(f"Failed to process {url}: {e}")
        return False

def main():
    project_dir = r"C:\Users\Re dmi\Documents\Codex\2026-06-04\1-data-reports-directory-5-files\outputs\flowstable-site"
    output_dir = os.path.join(project_dir, "assets", "photos", "guests")
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"Created directory: {output_dir}")
        
    for guest in GUESTS:
        name = guest["name"]
        query = guest["query"]
        output_file = os.path.join(output_dir, f"guest_{guest['id']}.webp")
        
        print(f"\n=== Processing Guest {guest['id']}: {name} ===")
        
        # Get list of images
        image_urls = search_bing_images(query)
        if not image_urls:
            print(f"No image URLs found for query: {query}")
            continue
            
        success = False
        # Try downloading images one by one until one succeeds
        for url in image_urls[:5]:  # Try top 5 images
            # Skip invalid formats in URL string if possible
            if not url.startswith('http'):
                continue
            if download_and_process_image(url, output_file):
                success = True
                break
                
        if not success:
            print(f"FAILED to download any image for {name}")

if __name__ == "__main__":
    main()
