import os
import json
import requests
import re
from datetime import datetime

# Configuration
PAGE_ID = "914737241717875"
PAGE_ACCESS_TOKEN = "EAAOOrC2AbRQBRl0m1iySFoZAFdiD6gZBoNNO6IGw3j1OKviIyjyE2pPiGwIrMRkWcdbueqsHvZAb7LRpvyMNzFSZA8Frc7PAJiAIRR3i7ZAHbxrPtTGh8kawputvGqqxKbjMb7Sm3VkYmbhOfSy2kJIfJ3DKWiIXbWe4GdocJzmCRGYs5ndjPRo2nK6AXjFZBb2KWPRu3CF3bSxe2IMDN84BHQalqKCUZCZBfMAVDEZAN"

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_FILE = os.path.join(BASE_DIR, "assets", "data", "posts.json")
PHOTOS_DIR = os.path.join(BASE_DIR, "assets", "photos")
REELS_FILE = os.path.join(BASE_DIR, "_data", "reels.json")

def clean_text(value):
    return re.sub(r"\n{3,}", "\n\n", (value or "").strip())

def category_for(text):
    lowered = text.lower()
    rules = [
        ("Gatherings", ["งาน", "event", "party", "society", "birthday", "รวมภาพ", "meet", "network"]),
        ("Conversations", ["ถอดบท", "บทสนทนา", "คุย", "share", "round", "conversation"]),
        ("Learning", ["book", "หนังสือ", "เรียน", "lesson", "workshop", "ai", "claude"]),
        ("Reflections", ["ชีวิต", "ความเชื่อ", "stoic", "flow", "grow", "mindset"]),
    ]
    for label, terms in rules:
        if any(term in lowered for term in terms):
            return label
    return "Field Notes"

def format_date(value):
    try:
        dt = datetime.strptime(value.replace(":", ""), "%Y-%m-%dT%H%M%S%z")
        return dt.strftime("%d %b %Y")
    except Exception:
        try:
            dt = datetime.fromisoformat(value.split("+")[0])
            return dt.strftime("%d %b %Y")
        except Exception:
            return value[:10]

def sync_facebook_posts():
    print("Fetching posts from Facebook Graph API...")
    url = f"https://graph.facebook.com/v20.0/{PAGE_ID}/feed"
    params = {
        "fields": "id,from,message,story,created_time,permalink_url,attachments{media,type,url,subattachments},reactions.summary(true),comments.summary(true),shares",
        "access_token": PAGE_ACCESS_TOKEN,
        "limit": 50
    }
    
    response = requests.get(url, params=params)
    if not response.ok:
        print(f"Error calling Facebook Graph API: {response.text}")
        if "expired" in response.text.lower():
            print("\nWARNING: Meta Access Token has expired. Please update PAGE_ACCESS_TOKEN with a new long-lived token.\n")
        return False
        
    posts_data = response.json().get("data", [])
    print(f"Retrieved {len(posts_data)} posts from API.")
    
    # Load existing posts database
    existing_posts = []
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            existing_posts = json.load(f)
            
    existing_ids = {p["id"] for p in existing_posts}
    new_or_updated = []
    
    for item in posts_data:
        post_id = item["id"]
        
        # Verify ownership (skip shared or third-party posts)
        author_id = item.get("from", {}).get("id")
        if author_id and author_id != PAGE_ID:
            print(f"Skipping post {post_id} - not authored directly by the page owner (Author ID: {author_id})")
            continue
            
        msg = clean_text(item.get("message", ""))
        story = clean_text(item.get("story", ""))
        
        # Skip shared posts identified by story label containing "shared"
        if story and "shared" in story.lower():
            print(f"Skipping shared content post {post_id}: '{story}'")
            continue
            
        # Decide title
        title = msg.split("\n")[0] if msg else story.split("\n")[0] if story else "Flow's Table Update"
        if len(title) > 80:
            title = title[:77] + "..."
            
        category = category_for(msg + " " + story)
        date_label = format_date(item.get("created_time", ""))
        
        # Engagement counts
        reactions = item.get("reactions", {}).get("summary", {}).get("total_count", 0)
        comments = item.get("comments", {}).get("summary", {}).get("total_count", 0)
        shares = item.get("shares", {}).get("count", 0)
        
        # Photo attachments download
        photos = []
        attachments = item.get("attachments", {}).get("data", [])
        
        photo_urls = []
        for att in attachments:
            if att.get("type") in ["photo", "added_photos", "profile_media"]:
                if att.get("media", {}).get("image", {}).get("src"):
                    photo_urls.append(att["media"]["image"]["src"])
            # Subattachments (for carousel posts)
            sub_atts = att.get("subattachments", {}).get("data", [])
            for sub in sub_atts:
                if sub.get("media", {}).get("image", {}).get("src"):
                    photo_urls.append(sub["media"]["image"]["src"])
                    
        # Download photos locally
        os.makedirs(PHOTOS_DIR, exist_ok=True)
        for idx, photo_url in enumerate(photo_urls):
            local_name = f"{post_id}_{idx}.jpg"
            local_path = os.path.join(PHOTOS_DIR, local_name)
            
            # Save reference
            photos.append(f"assets/photos/{local_name}")
            
            # Download file if not exists
            if not os.path.exists(local_path):
                try:
                    img_data = requests.get(photo_url).content
                    with open(local_path, "wb") as handler:
                        handler.write(img_data)
                    print(f"Downloaded photo: {local_name}")
                except Exception as ex:
                    print(f"Failed to download photo {photo_url}: {ex}")
                    
        post_obj = {
            "id": post_id,
            "created_time": item.get("created_time"),
            "date_label": date_label,
            "message": msg,
            "story": story,
            "title": title,
            "category": category,
            "permalink_url": item.get("permalink_url"),
            "reaction_count": reactions,
            "comment_count": comments,
            "share_count": shares,
            "photos": photos,
            "alt": f"Flow's Table community moment from {date_label}"
        }
        
        new_or_updated.append(post_obj)
        
    # Merge lists (keep order: new posts first)
    new_ids = {p["id"] for p in new_or_updated}
    merged_posts = new_or_updated + [p for p in existing_posts if p["id"] not in new_ids]
    
    # Save back to posts.json
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(merged_posts, f, ensure_ascii=False, indent=2)
        
    print(f"Successfully synced Facebook posts. Total in database: {len(merged_posts)}")
    return True

def sync_instagram_reels():
    print("Checking for linked Instagram Business Account...")
    url = f"https://graph.facebook.com/v20.0/{PAGE_ID}"
    params = {
        "fields": "instagram_business_account",
        "access_token": PAGE_ACCESS_TOKEN
    }
    response = requests.get(url, params=params)
    if not response.ok:
        print(f"Error checking linked Instagram Business Account: {response.text}")
        return False
        
    data = response.json()
    ig_acc_id = data.get("instagram_business_account", {}).get("id")
    if not ig_acc_id:
        print("No linked Instagram Business Account found for this Facebook Page.")
        return False
        
    print(f"Found linked Instagram Business Account: {ig_acc_id}. Fetching media...")
    
    media_url = f"https://graph.facebook.com/v20.0/{ig_acc_id}/media"
    media_params = {
        "fields": "id,caption,media_type,permalink,thumbnail_url,media_url,timestamp",
        "access_token": PAGE_ACCESS_TOKEN,
        "limit": 100
    }
    media_response = requests.get(media_url, params=media_params)
    if not media_response.ok:
        print(f"Error fetching Instagram media: {media_response.text}")
        return False
        
    media_items = media_response.json().get("data", [])
    print(f"Retrieved {len(media_items)} Instagram media items.")
    
    # Filter for videos (Reels)
    ig_reels = []
    for item in media_items:
        if item.get("media_type") == "VIDEO":
            permalink = item.get("permalink")
            if permalink:
                ig_reels.append({"url": permalink})
                
    print(f"Filtered down to {len(ig_reels)} Instagram reels.")
    
    # Load existing reels
    existing_reels = []
    if os.path.exists(REELS_FILE):
        with open(REELS_FILE, "r", encoding="utf-8") as f:
            try:
                existing_reels = json.load(f)
            except Exception:
                existing_reels = []
                
    # Merge reels (keep duplicates out)
    existing_urls = {r["url"].rstrip("/").lower() for r in existing_reels if "url" in r}
    merged_reels = list(existing_reels)
    
    added_count = 0
    for reel in ig_reels:
        clean_url = reel["url"].rstrip("/").lower()
        if clean_url not in existing_urls:
            merged_reels.insert(0, reel) # Prepend new reels to display them first
            existing_urls.add(clean_url)
            added_count += 1
            
    # Save back to reels.json
    os.makedirs(os.path.dirname(REELS_FILE), exist_ok=True)
    with open(REELS_FILE, "w", encoding="utf-8") as f:
        json.dump(merged_reels, f, ensure_ascii=False, indent=2)
        
    print(f"Successfully synced Instagram Reels. Added {added_count} new reels. Total reels in database: {len(merged_reels)}")
    return True

if __name__ == "__main__":
    facebook_success = sync_facebook_posts()
    instagram_success = sync_instagram_reels()
    print("Sync process completed.")
