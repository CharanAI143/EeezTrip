"""
Unified Image Fetcher for TripSync (Wikimedia Commons only)
Fetches place images from Wikimedia Commons and caches them in data/image_cache.json.
Supports multiple images per place with strict filtering for scenic quality.
"""

import re
import requests
import json
import time
import os
from pathlib import Path
from typing import Optional, List, Dict, Set, Any
from dotenv import load_dotenv

load_dotenv()

# --------------- API Configuration ---------------

WIKIMEDIA_API = "https://commons.wikimedia.org/w/api.php"
CACHE_FILE = Path(__file__).resolve().parent / "data" / "image_cache.json"

# --------------- cache helpers ---------------

_mem_cache: dict | None = None

def load_cache() -> dict:
    global _mem_cache
    if _mem_cache is not None:
        return _mem_cache
    try:
        if CACHE_FILE.exists():
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                _mem_cache = json.load(f)
        else:
            _mem_cache = {}
    except Exception as e:
        _mem_cache = {}
    return _mem_cache

def save_cache(cache: dict):
    global _mem_cache
    _mem_cache = cache
    try:
        CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(cache, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Error saving cache: {e}")

def _cache_key(place_name: str, state: str = "") -> str:
    if state:
        return f"{place_name.strip().lower()}|{state.strip().lower()}"
    return place_name.strip().lower()

def _build_used_ids(cache: dict) -> set[str]:
    used: set[str] = set()
    for entry in cache.values():
        for img in entry.get("images", []):
            img_id = img.get("image_id")
            if img_id:
                used.add(img_id)
    return used

# --------------- Wikimedia Commons fetch ---------------

def _wikimedia_build_photo(page: dict, query: str) -> dict | None:
    pageid = page.get("pageid")
    title = page.get("title", "").replace("File:", "", 1)
    
    # Strict Format Filtering
    valid_extensions = {".jpg", ".jpeg", ".png", ".webp"}
    if not any(title.lower().endswith(ext) for ext in valid_extensions):
        return None

    # Blacklist irrelevant content
    blacklist = {
        "map", "icon", "logo", "profile", "user", "texture", "diagram", 
        "portrait", "census", "flag", "coat", "infobox", "banner",
        "placeholder", "black", "white", "transparent", "sign", "label", "pdf", "djvu"
    }
    title_lower = title.lower()
    if any(word in title_lower for word in blacklist):
        return None

    imageinfo = page.get("imageinfo", [])
    if not imageinfo:
        return None

    info = imageinfo[0]
    
    # Minimum Dimensions for high-quality scenic views
    width = info.get("width", 0)
    height = info.get("height", 0)
    if width < 1000 or height < 600: 
        return None
    
    # Aspect Ratio Filter (Prefer Landscapes)
    aspect_ratio = width / height
    if aspect_ratio < 0.8 or aspect_ratio > 2.5:
        return None

    url_raw = info.get("url")
    if not url_raw:
        return None

    thumb_url = info.get("thumburl")
    
    regular_url = thumb_url or url_raw
    return {
        "image_id": f"commons-{pageid}",
        "url": regular_url,
        "url_raw": url_raw,
        "url_full": url_raw,
        "url_regular": regular_url,
        "url_small": regular_url,
        "url_thumb": regular_url,
        "alt": title,
        "author": info.get("user", "Unknown"),
        "author_url": f"https://commons.wikimedia.org/wiki/User:{info.get('user', '')}",
        "source_link": f"https://commons.wikimedia.org/wiki/File:{title}",
        "source": "wikimedia",
    }

def _do_wikimedia_query(search_query: str, per_page: int, exclude_ids: set[str]) -> list[dict]:
    params = {
        "action": "query",
        "generator": "search",
        "gsrsearch": search_query,
        "gsrnamespace": "6",
        "gsrlimit": max(20, per_page * 2),
        "prop": "imageinfo",
        "iiprop": "url|dimensions|user",
        "iiurlwidth": 1280,
        "format": "json",
    }
    headers = {"User-Agent": "TripSync/1.0 (contact@example.com)"}

    try:
        resp = requests.get(WIKIMEDIA_API, params=params, headers=headers, timeout=15)
        resp.raise_for_status()
        data = resp.json()
    except Exception:
        return []

    pages = data.get("query", {}).get("pages", {})
    images = []
    seen_ids = set()

    for page in pages.values():
        img = _wikimedia_build_photo(page, search_query)
        if not img or img["image_id"] in exclude_ids or img["image_id"] in seen_ids:
            continue
            
        # Very loose validation
        title_lower = img["alt"].lower()
        if any(bad in title_lower for bad in ["map", "flag", "logo", "icon", "chart", "graph"]):
            continue
            
        images.append(img)
        seen_ids.add(img["image_id"])
        if len(images) >= per_page:
            break
    return images

def fetch_from_wikimedia(
    query: str,
    place_name: str = "",
    per_page: int = 3,
    exclude_ids: set[str] | None = None,
    tags: list[str] | None = None,
) -> list[dict]:
    if exclude_ids is None:
        exclude_ids = set()

    tag_str = " ".join([tag.strip() for tag in tags if tag and isinstance(tag, str)]) if tags else ""

    queries_to_try = []
    if place_name:
        queries_to_try.append(f"intitle:{place_name} {tag_str} landscape scenic".strip())
        queries_to_try.append(f"intitle:{place_name} {tag_str}".strip())
        queries_to_try.append(f"{place_name} {tag_str} landscape".strip())
        queries_to_try.append(f"{place_name}".strip())
    else:
        queries_to_try.append(f"{query} landscape scenic")
        queries_to_try.append(query)

    all_images = []
    seen_ids = set(exclude_ids)

    for search_query in queries_to_try:
        if not search_query:
            continue

        new_images = _do_wikimedia_query(search_query, per_page - len(all_images), seen_ids)
        for img in new_images:
            all_images.append(img)
            seen_ids.add(img["image_id"])

        if len(all_images) >= per_page:
            break

    return all_images

# --------------- public API ---------------

def get_place_images(
    place_name: str, state: str = "", per_page: int = 3, force: bool = False, tags: list[str] = None
) -> list[dict]:
    key = _cache_key(place_name, state)
    cache = load_cache()

    if not force and key in cache and cache[key].get("images"):
        return cache[key]["images"]

    used_ids = _build_used_ids(cache)
    print(f"Fetching images for '{place_name}' from Wikimedia Commons...")
    query_name = f"{place_name} {state}".strip()
    images = fetch_from_wikimedia(query_name, place_name, per_page, used_ids, tags)

    if images:
        cache[key] = {"place": place_name, "state": state, "images": images}
        save_cache(cache)
        print(f"Cached {len(images)} images for '{place_name}'")
    else:
        print(f"No images found for '{place_name}'")

    return images

def get_unique_image(
    place_name: str,
    state: str = "",
    used_urls: set[str] | None = None,
    tags: list[str] = None,
) -> Optional[str]:
    if used_urls is None:
        used_urls = set()

    images = get_place_images(place_name, state, per_page=3, tags=tags)

    for img in images:
        url = img.get("url_regular") or img.get("url_small")
        if url and url not in used_urls:
            return url
    
    return images[0].get("url_regular") if images else None

def get_first_image(place_name: str, state: str = "", tags: list[str] = None) -> Optional[str]:
    return get_unique_image(place_name, state, tags=tags)

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        sys.exit(1)
    imgs = get_place_images(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "")
    print(json.dumps(imgs, indent=2))