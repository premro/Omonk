"""
Spotify & Global Podcast Engine
Fetches top trending Spotify podcasts, search results, and parses episode feeds with streaming audio.
Includes direct support for trending Indian and international shows (e.g. Vocal Oli, Idhayathin Kural, The Ranveer Show, Huberman Lab).
"""

import urllib.request
import urllib.parse
import json
import xml.etree.ElementTree as ET
import re
import html
import os
import sys

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
}

PODCAST_CACHE = {}

# Verified Spotify & Global Top Podcast Catalog with live feeds
FEATURED_SPOTIFY_PODCASTS = [
    {
        "id": "vocal_oli",
        "name": "Vocal Oli",
        "publisher": "vijay varadharaj",
        "avatar": "https://is1-ssl.mzstatic.com/image/thumb/Podcasts125/v4/3a/43/d3/3a43d3d0-506f-897a-4c9e-613768325b23/mza_4856961052461320435.jpg/600x600bb.jpg",
        "badge": "Top Tamil Comedy & Film #1",
        "description": "The voice of Vocal chord\nSupport vocal oli\nUPI ID : vocalolipodcast@okhdfcbank",
        "category": "Comedy & Film",
        "feedUrl": "https://anchor.fm/s/1734c904/podcast/rss",
        "rating": "4.9 ★ (7.3k)",
        "genres": ["Comedy", "Film", "Music History"]
    },
    {
        "id": "idhayathin_kural",
        "name": "Idhayathin Kural - Tamil Podcast",
        "publisher": "Naveen Vigneshwar",
        "avatar": "https://is1-ssl.mzstatic.com/image/thumb/Podcasts116/v4/a4/09/ec/a409ec84-934d-56a9-e85c-196016e45ca4/mza_16383679803175239106.jpg/600x600bb.jpg",
        "badge": "Top Tamil Show #1",
        "description": "A Feel Good Tamil Podcast bringing positivity, motivational stories, nostalgia, and soothing life thoughts.",
        "category": "Tamil / Lifestyle",
        "feedUrl": "https://anchor.fm/s/2dce90c8/podcast/rss",
        "rating": "4.8 ★ (12k)",
        "genres": ["Lifestyle", "Stories", "Motivation"]
    },
    {
        "id": "ranveer_show",
        "name": "The Ranveer Show",
        "publisher": "BeerBiceps aka Ranveer Allahbadia",
        "avatar": "https://is1-ssl.mzstatic.com/image/thumb/Podcasts126/v4/6b/64/09/6b6409fe-b684-2977-8fa0-b384666cfeb8/mza_10332824647614050519.jpg/600x600bb.jpg",
        "badge": "Studio Talk #1 India",
        "description": "India's smartest podcast hosted by BeerBiceps covering spirituality, entrepreneurship, fitness, science, and success.",
        "category": "Interviews & Society",
        "feedUrl": "https://feeds.simplecast.com/7PWFZi_d",
        "rating": "4.9 ★ (48k)",
        "genres": ["Interviews", "Society & Culture", "Spirituality"]
    },
    {
        "id": "huberman_lab",
        "name": "Huberman Lab",
        "publisher": "Dr. Andrew Huberman",
        "avatar": "https://is1-ssl.mzstatic.com/image/thumb/Podcasts116/v4/91/3c/d4/913cd452-9d3e-9080-d5be-d7eb1923cbcf/mza_15569472304919598282.jpg/600x600bb.jpg",
        "badge": "Top Global Science",
        "description": "Dr. Andrew Huberman discusses neuroscience and science-based tools for everyday life, sleep, fitness, and brain function.",
        "category": "Science & Health",
        "feedUrl": "https://feeds.megaphone.fm/hubermanlab",
        "rating": "4.9 ★ (110k)",
        "genres": ["Health & Fitness", "Science", "Neuroscience"]
    },
    {
        "id": "joe_rogan",
        "name": "The Joe Rogan Experience",
        "publisher": "Joe Rogan",
        "avatar": "https://is1-ssl.mzstatic.com/image/thumb/Podcasts125/v4/6f/a6/50/6fa65012-70b1-5e58-6fc8-47fb459fa4f8/mza_7047466827725916056.jpg/600x600bb.jpg",
        "badge": "Top Talk Show #1 Worldwide",
        "description": "The official podcast of comedian Joe Rogan. Long-form conversations with comedians, scientists, fighters, and thinkers.",
        "category": "Comedy & Culture",
        "feedUrl": "https://feeds.megaphone.fm/GLT1412515089",
        "rating": "4.8 ★ (180k)",
        "genres": ["Comedy", "Society & Culture"]
    },
    {
        "id": "jay_shetty",
        "name": "On Purpose with Jay Shetty",
        "publisher": "Jay Shetty",
        "avatar": "https://is1-ssl.mzstatic.com/image/thumb/Podcasts125/v4/21/d9/6a/21d96a6f-6f96-3e75-fa52-e4277977a5aa/mza_1330386221430030589.jpg/600x600bb.jpg",
        "badge": "Top Wellness #1",
        "description": "Fascinating conversations with insightful people on mental health, relationships, purpose, and mindfulness.",
        "category": "Health & Mindset",
        "feedUrl": "https://feeds.megaphone.fm/on-purpose",
        "rating": "4.8 ★ (32k)",
        "genres": ["Health", "Relationships", "Mindfulness"]
    },
    {
        "id": "crime_junkie",
        "name": "Crime Junkie",
        "publisher": "audiochuck",
        "avatar": "https://is1-ssl.mzstatic.com/image/thumb/Podcasts116/v4/bb/f1/b7/bbf1b714-25e2-04e3-d731-0ea05cfc4d44/mza_12739487192804599951.jpg/600x600bb.jpg",
        "badge": "Top Crime Series #1",
        "description": "Ashley Flowers delivers suspenseful and gripping true-crime stories every week.",
        "category": "True Crime",
        "feedUrl": "https://feeds.simplecast.com/qm_9xx0g",
        "rating": "4.8 ★ (95k)",
        "genres": ["True Crime", "Documentary"]
    },
    {
        "id": "ted_talks_daily",
        "name": "TED Talks Daily",
        "publisher": "TED",
        "avatar": "https://is1-ssl.mzstatic.com/image/thumb/Podcasts115/v4/80/e5/2d/80e52dd4-91ad-d250-9d0b-68e370e5b7c7/mza_17208752402123567884.jpg/600x600bb.jpg",
        "badge": "Global Knowledge",
        "description": "Every weekday, TED Talks Daily brings you the latest talks in audio to spark your curiosity.",
        "category": "Education & Tech",
        "feedUrl": "https://feeds.acast.com/public/shows/67587e77c705e3f74ab7b8b2",
        "rating": "4.6 ★ (25k)",
        "genres": ["Education", "Technology", "Innovation"]
    },
    {
        "id": "modern_wisdom",
        "name": "Modern Wisdom",
        "publisher": "Chris Williamson",
        "avatar": "https://is1-ssl.mzstatic.com/image/thumb/Podcasts126/v4/0f/c6/12/0fc61214-5d5d-e59c-dc22-d7b1ec79ba1b/mza_10793740268571166665.jpg/600x600bb.jpg",
        "badge": "Culture & Wisdom",
        "description": "Life lessons and insights from the greatest minds on human psychology, science, and life strategies.",
        "category": "Philosophy & Society",
        "feedUrl": "https://feeds.megaphone.fm/SIXMSB5088139739",
        "rating": "4.9 ★ (30k)",
        "genres": ["Philosophy", "Psychology", "Self-Help"]
    },
    {
        "id": "finshots_daily",
        "name": "Finshots Daily",
        "publisher": "Finshots",
        "avatar": "https://is1-ssl.mzstatic.com/image/thumb/Podcasts125/v4/94/b3/ef/94b3ef77-7a2e-c7ff-99fe-a5f1a56f6505/mza_11707945037305917897.jpg/600x600bb.jpg",
        "badge": "Business & Finance #1",
        "description": "Daily 5-minute financial updates explaining business and economic headlines in plain English.",
        "category": "Business & Tech",
        "feedUrl": "https://anchor.fm/s/37a76020/podcast/rss",
        "rating": "4.8 ★ (15k)",
        "genres": ["Business", "Finance", "Daily News"]
    }
]

# Seed cache with featured podcasts
for _p in FEATURED_SPOTIFY_PODCASTS:
    PODCAST_CACHE[_p['id']] = _p
    # Also register vocal oli collection ID
    if _p['id'] == 'vocal_oli':
        PODCAST_CACHE['pod_1536305556'] = _p

def get_podcasts(query=None):
    if not query:
        return FEATURED_SPOTIFY_PODCASTS
    return search_podcasts(query)

def get_podcast_by_id(pid):
    if not pid:
        return None
        
    for p in FEATURED_SPOTIFY_PODCASTS:
        if p['id'] == pid:
            return p
            
    if pid in PODCAST_CACHE:
        return PODCAST_CACHE[pid]
        
    # If pid is from search: pod_<collectionId>
    if pid.startswith("pod_"):
        col_id = pid.replace("pod_", "")
        url = f"https://itunes.apple.com/lookup?id={urllib.parse.quote(col_id)}"
        req = urllib.request.Request(url, headers=HEADERS)
        try:
            with urllib.request.urlopen(req, timeout=6) as r:
                data = json.loads(r.read().decode('utf-8'))
                results = data.get('results', [])
                if results:
                    item = results[0]
                    pod = {
                        "id": pid,
                        "name": item.get('collectionName', 'Unknown Podcast'),
                        "publisher": item.get('artistName', 'Unknown Host'),
                        "avatar": item.get('artworkUrl600') or item.get('artworkUrl100', ''),
                        "badge": item.get('primaryGenreName', 'Podcast'),
                        "description": f"{item.get('collectionName')} by {item.get('artistName')}",
                        "category": item.get('primaryGenreName', 'Talk Show'),
                        "feedUrl": item.get('feedUrl', ''),
                        "genres": item.get('genres', [])
                    }
                    PODCAST_CACHE[pid] = pod
                    return pod
        except Exception as e:
            print(f"Error looking up podcast ID {pid}: {e}", file=sys.stderr)

    # Secondary lookup: check by name matching in featured
    for p in FEATURED_SPOTIFY_PODCASTS:
        if pid.lower() in p['name'].lower() or p['name'].lower() in pid.lower():
            return p
            
    return None

def search_podcasts(query, limit=16):
    """Searches podcasts via iTunes/Spotify directory and caches results"""
    if not query:
        return FEATURED_SPOTIFY_PODCASTS

    clean_q = query.strip()
    url = f"https://itunes.apple.com/search?term={urllib.parse.quote(clean_q)}&entity=podcast&limit={limit}"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=6) as r:
            data = json.loads(r.read().decode('utf-8'))
            results = []
            for item in data.get('results', []):
                col_id = item.get('collectionId')
                pid = f"pod_{col_id}"
                
                # Check if it matches featured show (like vocal_oli)
                if str(col_id) == "1536305556" or "vocal oli" in item.get('collectionName', '').lower():
                    feat = next((f for f in FEATURED_SPOTIFY_PODCASTS if f['id'] == 'vocal_oli'), None)
                    if feat:
                        PODCAST_CACHE[pid] = feat
                        PODCAST_CACHE[feat['id']] = feat
                        results.append(feat)
                        continue

                pod_obj = {
                    "id": pid,
                    "name": item.get('collectionName', 'Unknown Podcast'),
                    "publisher": item.get('artistName', 'Unknown Host'),
                    "avatar": item.get('artworkUrl600') or item.get('artworkUrl100', ''),
                    "badge": item.get('primaryGenreName', 'Podcast'),
                    "description": f"{item.get('collectionName')} by {item.get('artistName')}",
                    "category": item.get('primaryGenreName', 'Talk Show'),
                    "feedUrl": item.get('feedUrl', ''),
                    "genres": item.get('genres', [item.get('primaryGenreName', 'Podcast')])
                }
                PODCAST_CACHE[pid] = pod_obj
                results.append(pod_obj)
            return results
    except Exception as e:
        print(f"Podcast search error: {e}", file=sys.stderr)
        return [p for p in FEATURED_SPOTIFY_PODCASTS if clean_q.lower() in p['name'].lower() or clean_q.lower() in p['publisher'].lower()]

def fetch_podcast_episodes(feed_url, limit=100):
    """Parses podcast RSS feed to extract playable episodes and channel metadata"""
    if not feed_url:
        return {}, []

    req = urllib.request.Request(feed_url, headers=HEADERS)
    episodes = []
    channel_meta = {}
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            content = resp.read()
            root = ET.fromstring(content)
            channel = root.find('channel')
            if channel is None:
                return {}, []

            itunes_ns = {'itunes': 'http://www.itunes.com/dtds/podcast-1.0.dtd'}
            ch_title = channel.findtext('title', 'Podcast')
            ch_desc = channel.findtext('description', '')
            ch_author = channel.findtext('itunes:author', '', itunes_ns)
            ch_img_elem = channel.find('image/url')
            ch_art = ch_img_elem.text if ch_img_elem is not None else ''
            
            itunes_img = channel.find('itunes:image', itunes_ns)
            if itunes_img is not None and itunes_img.get('href'):
                ch_art = itunes_img.get('href')

            ch_desc_clean = re.sub(r'<[^>]+>', '', html.unescape(ch_desc or '')).strip()
            channel_meta = {
                "title": ch_title,
                "description": ch_desc_clean,
                "author": ch_author or "Studio Audio",
                "artwork": ch_art
            }

            items = channel.findall('item')
            for idx, item in enumerate(items[:limit]):
                title = item.findtext('title', f'Episode #{idx+1}')
                desc = item.findtext('description', '')
                desc_clean = re.sub(r'<[^>]+>', '', html.unescape(desc or '')).strip()[:320]
                pub_date = item.findtext('pubDate', '')
                enc = item.find('enclosure')
                audio_url = enc.get('url') if enc is not None else ''

                ep_art = ch_art
                ep_img = item.find('itunes:image', itunes_ns)
                if ep_img is not None and ep_img.get('href'):
                    ep_art = ep_img.get('href')

                duration_str = item.findtext('itunes:duration', '', itunes_ns)
                duration_sec = 1800
                if duration_str:
                    parts = duration_str.split(':')
                    if len(parts) == 3:
                        try: duration_sec = int(parts[0])*3600 + int(parts[1])*60 + int(parts[2])
                        except: pass
                    elif len(parts) == 2:
                        try: duration_sec = int(parts[0])*60 + int(parts[1])
                        except: pass
                    else:
                        try: duration_sec = int(duration_str)
                        except: pass

                if audio_url:
                    # Clean pubDate e.g. "Sat, 03 Oct 2026 19:33:26 GMT" -> "Oct 3, 2026"
                    clean_date = pub_date[:16] if pub_date else "Recent"
                    try:
                        dp = pub_date.split()
                        if len(dp) >= 4:
                            clean_date = f"{dp[2]} {dp[1]}, {dp[3]}"
                    except Exception:
                        pass

                    episodes.append({
                        "id": f"pod_ep_{idx}_{abs(hash(title)) % 1000000}",
                        "title": title.strip(),
                        "artist": ch_author or ch_title,
                        "album": ch_title,
                        "description": desc_clean,
                        "duration": duration_sec,
                        "artwork": ep_art,
                        "streamUrl": audio_url,
                        "pubDate": clean_date,
                        "quality": "Podcast Audio Stream",
                        "isPodcast": True
                    })
    except Exception as e:
        print(f"Error parsing podcast feed ({feed_url}): {e}", file=sys.stderr)

    return channel_meta, episodes

def get_podcast_detail(pod_id, feed_url=None):
    """Resolves full podcast metadata and fetches episode tracklist in one go"""
    pod = get_podcast_by_id(pod_id) if pod_id else None
    if not feed_url and pod:
        feed_url = pod.get('feedUrl')

    channel_meta, episodes = fetch_podcast_episodes(feed_url, limit=100)

    if not pod and channel_meta:
        pod = {
            "id": pod_id or f"pod_{abs(hash(feed_url)) % 1000000}",
            "name": channel_meta.get('title', 'Original Podcast'),
            "publisher": channel_meta.get('author', 'Studio Audio'),
            "avatar": channel_meta.get('artwork', ''),
            "description": channel_meta.get('description', ''),
            "badge": "Podcast",
            "feedUrl": feed_url,
            "category": "Talk Show",
            "genres": ["Podcast", "Talk Show"]
        }
    elif pod and channel_meta:
        # If featured show has a clean curated description, preserve it
        if pod.get('id') != 'vocal_oli' and channel_meta.get('description') and len(channel_meta.get('description')) > len(pod.get('description', '')):
            pod['description'] = channel_meta.get('description')
        if channel_meta.get('author') and pod.get('publisher') in ('Unknown Host', 'Studio Audio'):
            pod['publisher'] = channel_meta.get('author')
        if channel_meta.get('artwork') and not pod.get('avatar'):
            pod['avatar'] = channel_meta.get('artwork')

    return pod, episodes
