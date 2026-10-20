import os
import json
import requests
import re
from datetime import datetime

# Configuration
PAGE_ID = "914737241717875"

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load_env_file():
    """Load PAGE_ACCESS_TOKEN from .env (local) without extra dependencies."""
    env_path = os.path.join(BASE_DIR, ".env")
    if not os.path.exists(env_path):
        return
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_env_file()
PAGE_ACCESS_TOKEN = os.environ.get("PAGE_ACCESS_TOKEN", "")

if not PAGE_ACCESS_TOKEN:
    raise SystemExit(
        "PAGE_ACCESS_TOKEN is not set. Add it to .env locally or as a GitHub Actions secret."
    )
DATA_FILE = os.path.join(BASE_DIR, "assets", "data", "posts.json")
PHOTOS_DIR = os.path.join(BASE_DIR, "assets", "photos")
REELS_FILE = os.path.join(BASE_DIR, "_data", "reels.json")

def clean_text(value):
    return re.sub(r"\n{3,}", "\n\n", (value or "").strip())

def category_for(text):
    lowered = text.lower()
    rules = [
        ("Session Summaries", ["สรุป", "ถอดบทสนทนา", "ถอดบทเรียน", "session", "recap", "key lessons", "ตกตะกอน"]),
        ("Investment", ["ลงทุน", "หุ้น", "vi ", "value investor", "asset", "leasehold", "พอร์ต", "การเงิน", "wealth", "vc ", "valuation", "การบริหารเงิน"]),
        ("Business", ["ธุรกิจ", "sme", "franchise", "แฟรนไชส์", "เพจ", "100ล้าน", "การขาย", "b2b", "solopreneur", "entrepreneur", "กลยุทธ์", "brand", "แบรนด์", "company"]),
        ("Life & Mindset", ["ชีวิต", "mindset", "ความเชื่อ", "stoic", "stoicism", "ความฝัน", "passion", "วินัย", "ดูแลใจ", "ความสุข"]),
        ("Gatherings", ["งาน", "event", "party", "society", "birthday", "รวมภาพ", "meet", "network"]),
        ("Conversations", ["ถอดบท", "บทสนทนา", "คุย", "share", "round", "conversation"]),
        ("Learning", ["book", "หนังสือ", "เรียน", "lesson", "workshop", "ai", "claude", "คอร์ส"]),
        ("Reflections", ["flow", "grow", "มุมมอง", "ข้อคิด"]),
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

def _fetch_paginated(base_url, base_params, max_pages=4, label="posts"):
    """Helper: fetch all pages from a Graph API endpoint."""
    results = []
    url = base_url
    params = base_params
    for page_num in range(max_pages):
        response = requests.get(url, params=params, timeout=30)
        if not response.ok:
            print(f"  Error fetching {label}: {response.text[:200]}")
            break
        page_data = response.json()
        page_items = page_data.get("data", [])
        results.extend(page_items)
        print(f"  {label} page {page_num + 1}: {len(page_items)} (total: {len(results)})")
        next_url = page_data.get("paging", {}).get("next")
        if not next_url or not page_items:
            break
        url = next_url
        params = None
    return results


def _add_unique(items, value):
    if value and value not in items:
        items.append(value)


def _attachment_image_urls(attachment):
    """Collect preview images from Facebook attachment trees."""
    urls = []
    media = attachment.get("media") or {}
    image = media.get("image") or {}
    _add_unique(urls, image.get("src"))

    subattachments = ((attachment.get("subattachments") or {}).get("data") or [])
    for subattachment in subattachments:
        for url in _attachment_image_urls(subattachment):
            _add_unique(urls, url)

    return urls


def _download_photo(photo_url, local_name):
    os.makedirs(PHOTOS_DIR, exist_ok=True)
    local_path = os.path.join(PHOTOS_DIR, local_name)
    if os.path.exists(local_path):
        return local_name

    tmp_jpg = local_path.replace(".webp", ".jpg")
    try:
        resp = requests.get(photo_url, timeout=30)
        if not resp.ok or len(resp.content) < 500:
            print(f"Failed to download photo {photo_url}: HTTP {resp.status_code}")
            return ""
        with open(tmp_jpg, "wb") as handler:
            handler.write(resp.content)

        try:
            from PIL import Image
            im = Image.open(tmp_jpg)
            if im.mode in ("RGBA", "P"):
                im = im.convert("RGB")
            im.save(local_path, "WEBP", quality=85)
            os.remove(tmp_jpg)
            print(f"Downloaded photo: {local_name}")
            return local_name
        except ImportError:
            jpg_name = local_name.replace(".webp", ".jpg")
            os.rename(tmp_jpg, os.path.join(PHOTOS_DIR, jpg_name))
            print(f"Downloaded photo: {jpg_name}")
            return jpg_name
    except Exception as ex:
        if os.path.exists(tmp_jpg):
            os.remove(tmp_jpg)
        print(f"Failed to download photo {photo_url}: {ex}")
        return ""

def sync_facebook_posts():
    print("Fetching posts from Facebook Graph API...")
    fields = (
        "id,from,message,story,created_time,permalink_url,full_picture,picture,"
        "attachments{media{image},type,url,target,subattachments{media{image},type,url,target}},"
        "reactions.summary(true),comments.summary(true),shares"
    )
    base_params = {
        "fields": fields,
        "access_token": PAGE_ACCESS_TOKEN,
        "limit": 50,
    }

    # Fetch from BOTH /posts (page's own posts incl shared) AND /feed (all)
    print("  --- /posts endpoint (includes shared posts) ---")
    posts_data = _fetch_paginated(
        f"https://graph.facebook.com/v20.0/{PAGE_ID}/posts",
        base_params, max_pages=4, label="/posts"
    )
    # Also fetch /feed to catch anything /posts misses
    print("  --- /feed endpoint ---")
    feed_data = _fetch_paginated(
        f"https://graph.facebook.com/v20.0/{PAGE_ID}/feed",
        base_params, max_pages=2, label="/feed"
    )

    # Also fetch videos/reels — include thumbnail + picture fields
    print("  --- /videos endpoint (Facebook reels) ---")
    video_params = {
        "fields": "id,description,created_time,permalink_url,length,thumbnail,picture,format",
        "access_token": PAGE_ACCESS_TOKEN,
        "limit": 100,
    }
    video_data = _fetch_paginated(
        f"https://graph.facebook.com/v20.0/{PAGE_ID}/videos",
        video_params, max_pages=2, label="/videos"
    )

    # Merge — dedupe by post ID (process posts+feed first, then mark videos with _from_videos)
    seen_ids = set()
    all_raw = []
    for item in posts_data + feed_data:
        pid = item.get("id", "")
        if pid and pid not in seen_ids:
            seen_ids.add(pid)
            all_raw.append(item)

    # Convert video items to post-like format
    for item in video_data:
        pid = item.get("id", "")
        if not pid or pid in seen_ids:
            continue
        seen_ids.add(pid)
        item["_from_videos"] = True
        all_raw.append(item)

    posts_data = all_raw
    print(f"Retrieved {len(posts_data)} unique items (posts+feed+videos).")

    # Deduplicate by normalized permalink (reels appear under both /posts and /videos with different IDs)
    seen_permas = set()
    deduped = []
    for item in posts_data:
        perma = (item.get("permalink_url") or "").replace("https://www.facebook.com", "").rstrip("/")
        norm = perma or item.get("id", "")
        if norm in seen_permas:
            continue
        seen_permas.add(norm)
        deduped.append(item)
    posts_data = deduped
    print(f"After permalink dedup: {len(posts_data)} items.")

    # Load existing posts database
    existing_posts = []
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            existing_posts = json.load(f)

    existing_by_id = {p["id"]: p for p in existing_posts if "id" in p}
    new_or_updated = []

    # Junk titles to filter out (FB auto-generated noise)
    JUNK_TITLES = {
        "Flow's Table Update",
        "Flow's Table Video",
        "Flow's Table updated their status.",
        "Flow's Table updated their cover photo.",
        "Flow's Table updated their profile picture.",
    }

    for item in posts_data:
        post_id = item["id"]
        prev_post = existing_by_id.get(post_id, {})
        prev_category = prev_post.get("category")

        # Keep all posts by the page (including shared posts)
        # Only skip truly third-party posts that somehow appear
        author_id = item.get("from", {}).get("id")
        if author_id and author_id != PAGE_ID:
            print(f"Skipping post {post_id} - not from this page (Author ID: {author_id})")
            continue

        # Handle video items (from /videos endpoint — different field names)
        if item.get("_from_videos"):
            msg = clean_text(item.get("description", ""))
            if not msg and not prev_post.get("message"):
                # Skip empty untitled videos that have no description
                continue
            permalink = item.get("permalink_url", "")
            if not permalink:
                permalink = f"https://www.facebook.com/{PAGE_ID}/videos/{post_id}"
            elif permalink.startswith("/"):
                permalink = f"https://www.facebook.com{permalink}"
            created = item.get("created_time", "")
            title = msg.split("\n")[0] if msg else prev_post.get("title") or "Flow's Table Video"
            if len(title) > 80:
                title = title[:77] + "..."
            category = prev_category if (prev_category and prev_category != "Field Notes") else category_for(msg)
            date_label = format_date(created)

            # Download video thumbnail
            photos = []
            thumb_url = item.get("thumbnail") or item.get("picture") or ""
            if thumb_url:
                saved_name = _download_photo(thumb_url, f"{post_id}_0.webp")
                if saved_name:
                    photos.append(f"assets/photos/{saved_name}")
            if not photos and prev_post.get("photos"):
                photos = prev_post["photos"]

            post_obj = {
                "id": post_id,
                "created_time": created,
                "date_label": date_label,
                "message": msg or prev_post.get("message", ""),
                "story": "",
                "title": title,
                "category": category,
                "permalink_url": permalink,
                "reaction_count": prev_post.get("reaction_count", 0),
                "comment_count": prev_post.get("comment_count", 0),
                "share_count": prev_post.get("share_count", 0),
                "photos": photos,
                "alt": f"Flow's Table video from {date_label}",
            }
            new_or_updated.append(post_obj)
            continue

        # Skip junk auto-generated posts (status/cover/photo updates with no real message)
        raw_msg = clean_text(item.get("message", ""))
        raw_story = clean_text(item.get("story", ""))
        early_title = (raw_msg.split("\n")[0] if raw_msg else raw_story.split("\n")[0] if raw_story else "").strip()
        if early_title in JUNK_TITLES and not raw_msg:
            print(f"Skipping junk post {post_id}: {early_title}")
            continue

        msg = raw_msg
        story = raw_story

        # For shared posts (story contains "shared"), try to extract text
        # from message field if Flow's Table added a caption
        is_shared = story and "shared" in story.lower()
        if is_shared:
            if not msg:
                # No caption from Flow's Table — use story as the message
                msg = story
            print(f"Including shared post {post_id}: '{story[:50]}'")

        # Decide title — for shared posts, story often has useful context
        title = msg.split("\n")[0] if msg else story.split("\n")[0] if story else "Flow's Table Update"
        if len(title) > 80:
            title = title[:77] + "..."

        # Final junk filter: skip posts whose title is junk AND have no message
        if title in JUNK_TITLES and not msg:
            print(f"Skipping junk post {post_id}: {title}")
            continue

        category = prev_category if (prev_category and prev_category != "Field Notes") else category_for(msg + " " + story)
        date_label = format_date(item.get("created_time", ""))

        # Engagement counts
        reactions = item.get("reactions", {}).get("summary", {}).get("total_count", 0)
        comments = item.get("comments", {}).get("summary", {}).get("total_count", 0)
        shares = item.get("shares", {}).get("count", 0)

        # Photo/preview attachments download
        photos = []
        attachments = item.get("attachments", {}).get("data", [])

        photo_urls = []
        _add_unique(photo_urls, item.get("full_picture"))
        _add_unique(photo_urls, item.get("picture"))
        for att in attachments:
            # Capture ALL attachment types that have an image preview.
            # Including: photo, added_photos, share, link, video_inline, etc.
            for photo_url in _attachment_image_urls(att):
                _add_unique(photo_urls, photo_url)

        # Download photos locally (as .webp)
        os.makedirs(PHOTOS_DIR, exist_ok=True)
        for idx, photo_url in enumerate(photo_urls):
            local_name = f"{post_id}_{idx}.webp"
            saved_name = _download_photo(photo_url, local_name)
            if saved_name:
                photos.append(f"assets/photos/{saved_name}")
        if not photos and prev_post.get("photos"):
            photos = prev_post["photos"]

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

    # Merge lists, remove any historical junk posts, and sort newest-first by created_time
    new_ids = {p["id"] for p in new_or_updated}
    merged_posts = new_or_updated + [
        p for p in existing_posts
        if p["id"] not in new_ids and not (p.get("title") in JUNK_TITLES and not p.get("message"))
    ]
    merged_posts.sort(key=lambda p: p.get("created_time") or "", reverse=True)

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
    response = requests.get(url, params=params, timeout=30)
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
    media_response = requests.get(media_url, params=media_params, timeout=30)
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
                    "thumbnail_url_raw": item.get("thumbnail_url", ""),
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
            # Always refresh expiring media_url when fresh from API
            if reel.get("media_url"):
                existing_reel["media_url"] = reel["media_url"]
            if reel.get("thumbnail_url_raw") and not existing_reel.get("thumbnail_url"):
                existing_reel["thumbnail_url_raw"] = reel["thumbnail_url_raw"]
            for key in ["caption", "timestamp"]:
                if reel.get(key) and not existing_reel.get(key):
                    existing_reel[key] = reel[key]
        else:
            existing_reels.insert(0, reel)
            reels_by_url[url_key] = reel
            added_count += 1

    # Backfill Facebook reels AND videos from posts.json
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as pf:
                fb_posts = json.load(pf)
            for post in fb_posts:
                p_url = post.get("permalink_url") or ""
                is_reel = "facebook.com/reel/" in p_url
                is_video = "facebook.com" in p_url and "/videos/" in p_url
                if is_reel or is_video:
                    url_key = p_url.rstrip("/").lower()
                    fb_reel_data = {
                        "url": p_url,
                        "caption": post.get("message") or post.get("story") or "",
                        "timestamp": post.get("created_time") or "",
                        "thumbnail_url": post.get("photos", [None])[0] if post.get("photos") else ""
                    }
                    if url_key in reels_by_url:
                        existing_reel = reels_by_url[url_key]
                        for key in ["caption", "thumbnail_url", "timestamp"]:
                            if fb_reel_data.get(key) and not existing_reel.get(key):
                                existing_reel[key] = fb_reel_data[key]
                    else:
                        existing_reels.insert(0, fb_reel_data)
                        reels_by_url[url_key] = fb_reel_data
                        added_count += 1
        except Exception as e:
            print(f"Error backfilling Facebook reels/videos: {e}")

    # Download IG thumbnails locally as webp
    reels_photo_dir = os.path.join(BASE_DIR, "assets", "photos", "reels")
    os.makedirs(reels_photo_dir, exist_ok=True)
    for reel in existing_reels:
        raw_thumb = reel.pop("thumbnail_url_raw", "")
        if not raw_thumb:
            continue
        if raw_thumb.startswith("assets/"):
            reel.setdefault("thumbnail_url", raw_thumb)
            continue
        # Try to download CDN thumbnail
        reel_id = reel.get("url", "").rstrip("/").split("/")[-1]
        local_name = f"assets/photos/reels/reel_{reel_id}.webp"
        local_path = os.path.join(BASE_DIR, local_name)
        if os.path.exists(local_path):
            reel["thumbnail_url"] = local_name
            continue
        try:
            headers = {"User-Agent": "Mozilla/5.0", "Referer": "https://www.instagram.com/"}
            resp = requests.get(raw_thumb, headers=headers, timeout=15)
            if resp.status_code == 200 and len(resp.content) > 2000:
                try:
                    from PIL import Image
                    import io
                    im = Image.open(io.BytesIO(resp.content))
                    if im.mode in ("RGBA", "P"):
                        im = im.convert("RGB")
                    im.save(local_path, "WEBP", quality=85)
                    reel["thumbnail_url"] = local_name
                except ImportError:
                    reel["thumbnail_url"] = raw_thumb
            else:
                reel["thumbnail_url"] = raw_thumb
        except Exception:
            reel["thumbnail_url"] = raw_thumb

    existing_reels.sort(key=lambda r: r.get("timestamp") or "", reverse=True)

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
        response = requests.get(url, params=params, timeout=30)
        if response.ok:
            res_data = response.json()
            followers = res_data.get("followers_count") or res_data.get("fan_count") or existing_stats.get("followers_count") or 1632
            if os.path.exists(stats_file) and existing_stats.get("followers_count") == followers:
                print(f"Page stats unchanged (followers={followers}).")
                return True
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

    # Regenerate sitemap after sync
    import subprocess
    import sys
    try:
        subprocess.run([sys.executable, os.path.join(BASE_DIR, "scripts", "generate_sitemap.py")], check=True)
    except Exception as e:
        print(f"Failed to generate sitemap: {e}")

    print("Sync process completed.")
