import os
import json
import requests
import re
from datetime import datetime

# Configuration
PAGE_ID = "914737241717875"
PAGE_ACCESS_TOKEN = "EAAOOrC2AbRQBRnDpZB0nX1g3YiU53B1UkmrEZAuBLyQZBkD1Qby3LRql5L5QzdfRBQNG87x0EiL9E5iHRT3aLZAzqT96UHZAstOLTxYcMwILGJeMuSNIBRN8T4b7PTqei1gy6bUF8jq1t3FQARuEWW9nYZAnKBnwlwHuHJ9ZBy9X0oZCqxKIRqiMR8h6GVKF4FPKAY2LBNHki2VnL4f2BATnZAXKvjxOZC9ikg8gtaYc4ZD"

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
                ig_reels.append({
                    "url": permalink,
                    "caption": item.get("caption", ""),
                    "thumbnail_url": item.get("thumbnail_url", ""),
                    "media_url": item.get("media_url", ""),
                    "timestamp": item.get("timestamp", "")
                })
                
    print(f"Filtered down to {len(ig_reels)} Instagram reels.")
    
    # Load existing reels
    existing_reels = []
    if os.path.exists(REELS_FILE):
        with open(REELS_FILE, "r", encoding="utf-8") as f:
            try:
                existing_reels = json.load(f)
            except Exception:
                existing_reels = []
                
    # Create a map of existing reels by URL for easy lookup
    reels_by_url = {}
    for r in existing_reels:
        if "url" in r:
            url_key = r["url"].rstrip("/").lower()
            reels_by_url[url_key] = r
            
    added_count = 0
    # Merge/update Instagram reels
    for reel in ig_reels:
        url_key = reel["url"].rstrip("/").lower()
        if url_key in reels_by_url:
            existing_reel = reels_by_url[url_key]
            for key in ["caption", "thumbnail_url", "media_url", "timestamp"]:
                if key in reel and (key not in existing_reel or not existing_reel[key]):
                    existing_reel[key] = reel[key]
        else:
            existing_reels.insert(0, reel)
            reels_by_url[url_key] = reel
            added_count += 1

    # Backfill Facebook reels details from posts.json
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as pf:
                fb_posts = json.load(pf)
            for post in fb_posts:
                p_url = post.get("permalink_url") or ""
                if "facebook.com/reel/" in p_url:
                    url_key = p_url.rstrip("/").lower()
                    fb_reel_data = {
                        "url": p_url,
                        "caption": post.get("message") or post.get("story") or "",
                        "timestamp": post.get("created_time") or "",
                        "thumbnail_url": post.get("photos")[0] if post.get("photos") else ""
                    }
                    if url_key in reels_by_url:
                        existing_reel = reels_by_url[url_key]
                        for key in ["caption", "thumbnail_url", "timestamp"]:
                            if key in fb_reel_data and (key not in existing_reel or not existing_reel[key]):
                                existing_reel[key] = fb_reel_data[key]
                    else:
                        existing_reels.append(fb_reel_data)
                        reels_by_url[url_key] = fb_reel_data
        except Exception as e:
            print(f"Error backfilling Facebook reels: {e}")
            
    # Save back to reels.json
    os.makedirs(os.path.dirname(REELS_FILE), exist_ok=True)
    with open(REELS_FILE, "w", encoding="utf-8") as f:
        json.dump(existing_reels, f, ensure_ascii=False, indent=2)
        
    print(f"Successfully synced Reels. Added {added_count} new reels. Total in database: {len(existing_reels)}")
    return True

def sync_page_stats():
    print("Fetching page stats from Facebook Graph API...")
    url = f"https://graph.facebook.com/v20.0/{PAGE_ID}"
    params = {
        "fields": "fan_count,followers_count",
        "access_token": PAGE_ACCESS_TOKEN
    }
    
    stats_file = os.path.join(BASE_DIR, "assets", "data", "page_stats.json")
    existing_stats = {"followers_count": 1632, "last_updated": ""}
    if os.path.exists(stats_file):
        try:
            with open(stats_file, "r", encoding="utf-8") as f:
                existing_stats = json.load(f)
        except Exception as e:
            print(f"Error reading existing page_stats.json: {e}")
            
    try:
        response = requests.get(url, params=params)
        if response.ok:
            res_data = response.json()
            followers = res_data.get("followers_count") or res_data.get("fan_count") or existing_stats.get("followers_count") or 1632
            existing_stats["followers_count"] = followers
            existing_stats["last_updated"] = datetime.now().isoformat()
            
            with open(stats_file, "w", encoding="utf-8") as f:
                json.dump(existing_stats, f, ensure_ascii=False, indent=2)
            print(f"Successfully updated page stats: {existing_stats}")
            return True
        else:
            print(f"Error calling page stats API: {response.text}")
            if not os.path.exists(stats_file):
                with open(stats_file, "w", encoding="utf-8") as f:
                    json.dump(existing_stats, f, ensure_ascii=False, indent=2)
            return False
    except Exception as ex:
        print(f"Exception fetching page stats: {ex}")
        if not os.path.exists(stats_file):
            with open(stats_file, "w", encoding="utf-8") as f:
                json.dump(existing_stats, f, ensure_ascii=False, indent=2)
        return False

if __name__ == "__main__":
    facebook_success = sync_facebook_posts()
    instagram_success = sync_instagram_reels()
    page_stats_success = sync_page_stats()
    print("Sync process completed.")
