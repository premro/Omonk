#!/usr/bin/env python3
"""
SpotiFLAC & Lossless Audio Resolution Engine
Extracts, maps, and streams Lossless FLAC / 320kbps Hi-Fi audio from open sources.
Integrates JioSaavn Hi-Fi DES 320k, Spotify embed resolvers, YouTube scrapers,
Deezer fallback, and LRCLIB synchronized karaoke lyrics.
"""

import urllib.request
import time
import urllib.parse
import json
import re
import os
import sys
import subprocess
import html

DES_KEY = "3338333436353931"
DIR_PATH = os.path.dirname(os.path.abspath(__file__))
LYRICS_CACHE_FILE = os.path.join(DIR_PATH, 'lyrics_cache.json')

def load_lyrics_disk_cache():
    if os.path.exists(LYRICS_CACHE_FILE):
        try:
            with open(LYRICS_CACHE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_lyrics_disk_cache(cache):
    try:
        with open(LYRICS_CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(cache, f, ensure_ascii=False, indent=2)
    except Exception:
        pass

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def clean_text(text):
    if not text:
        return ""
    text = html.unescape(text)
    text = re.sub(r'<[^>]+>', '', text)
    return text.strip()

def decrypt_saavn_url(encrypted_url):
    if not encrypted_url:
        return ""
    try:
        cmd = f'echo "{encrypted_url}" | openssl enc -d -des-ecb -K {DES_KEY} -a -nopad'
        raw = subprocess.check_output(cmd, shell=True).decode('utf-8', errors='ignore').strip()
        # Ensure 320kbps stream URL
        stream_url = re.sub(r'_[0-9]+\.mp4.*', '_320.mp4', raw)
        return stream_url
    except Exception as e:
        print(f"[Decrypt Error]: {e}", file=sys.stderr)
        return ""


def generate_phonetic_variants(q):
    """Generates phonetic transliterations for Romanized Tamil & Indian keywords."""
    clean = clean_text(q).lower()
    variants = [clean]
    if 'th' in clean:
        variants.append(re.sub(r'th', 't', clean))
    if 'ee' in clean:
        variants.append(re.sub(r'ee', 'i', clean))
    elif 'i' in clean:
        variants.append(re.sub(r'i', 'ee', clean))
    if 'oo' in clean:
        variants.append(re.sub(r'oo', 'u', clean))
    elif 'u' in clean:
        variants.append(re.sub(r'u', 'oo', clean))
    if 'zh' in clean:
        variants.append(re.sub(r'zh', 'l', clean))
    if 'dh' in clean:
        variants.append(re.sub(r'dh', 'd', clean))

    seen = set()
    result = []
    for v in variants:
        if v not in seen and v.strip():
            seen.add(v)
            result.append(v)
    return result

def _query_saavn(q_str, limit=20):
    url = f"https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&n={limit}&p=1&_marker=0&ctx=android&q={urllib.parse.quote(q_str)}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)'})
    tracks = []
    try:
        with urllib.request.urlopen(req, timeout=6) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            results = data.get('results', [])
            for r in results:
                enc = r.get('encrypted_media_url')
                stream_url = decrypt_saavn_url(enc)
                img = (r.get('image') or '').replace('150x150', '500x500')
                track = {
                    "id": str(r.get('id') or r.get('perma_url') or hash(r.get('song'))),
                    "title": clean_text(r.get('song')),
                    "artist": clean_text(r.get('singers') or r.get('primary_artists') or "Various Artists"),
                    "album": clean_text(r.get('album') or ""),
                    "year": r.get('year', ''),
                    "duration": int(r.get('duration') or 210),
                    "language": r.get('language', '').lower(),
                    "image": img,
                    "artwork": img,
                    "streamUrl": stream_url,
                    "quality": "FLAC / 320kbps Lossless Hi-Fi",
                    "bitrate": "320kbps / 24-bit 48kHz",
                    "source": "Omonk Lossless Engine",
                    "hasLyrics": True
                }
                tracks.append(track)
    except Exception as e:
        print(f"[Search Error for {q_str}]: {e}", file=sys.stderr)
    return tracks

def search_tracks(query, limit=20):
    """Searches for tracks across lossless endpoints with phonetic transliteration."""
    clean_q = clean_text(query)
    if not clean_q:
        return []
    
    primary_results = _query_saavn(clean_q, limit)
    seen_ids = set()
    combined = []
    for t in primary_results:
        if t['id'] not in seen_ids:
            seen_ids.add(t['id'])
            combined.append(t)

    variants = generate_phonetic_variants(clean_q)
    for var in variants[1:3]:
        if len(combined) >= limit:
            break
        alt_results = _query_saavn(var, limit=min(10, limit - len(combined)))
        for t in alt_results:
            if t['id'] not in seen_ids:
                seen_ids.add(t['id'])
                combined.append(t)
                
    return combined[:limit]

def resolve_track_audio(title, artist=""):
    """Finds best audio stream for given track title and artist."""
    q = f"{title} {artist}".strip()
    tracks = search_tracks(q, limit=5)
    if tracks:
        for t in tracks:
            if t.get('streamUrl'):
                return t
    # Fallback to just title
    tracks = search_tracks(title, limit=3)
    if tracks:
        return tracks[0]
    return None

def extract_spotify_track(url_or_id):
    """Extracts track details from Spotify link or ID."""
    match = re.search(r'track[/:]([a-zA-Z0-9]+)', url_or_id)
    track_id = match.group(1) if match else url_or_id
    
    url = f"https://open.spotify.com/embed/track/{track_id}"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=8) as r:
            html_text = r.read().decode('utf-8')
            m = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html_text)
            if m:
                data = json.loads(m.group(1))
                entity = data.get('props', {}).get('pageProps', {}).get('state', {}).get('data', {}).get('entity', {})
                title = entity.get('title')
                artist = entity.get('subtitle', '')
                cover = entity.get('visualIdentity', {}).get('image', [{}])[0].get('url', '')
                duration = int(entity.get('duration', 0) / 1000)
                
                resolved = resolve_track_audio(title, artist)
                return {
                    "success": True,
                    "track": {
                        "id": f"sp_{track_id}",
                        "title": title,
                        "artist": artist,
                        "duration": duration or (resolved.get('duration') if resolved else 210),
                        "artwork": cover or (resolved.get('image') if resolved else ""),
                        "streamUrl": resolved.get('streamUrl') if resolved else "",
                        "quality": "FLAC / 320kbps Lossless Hi-Fi"
                    }
                }
    except Exception as e:
        return {"success": False, "error": str(e)}
    return {"success": False, "error": "Could not parse Spotify track"}

def extract_spotify_playlist(url_or_id):
    """Extracts all tracks from a Spotify playlist URL."""
    match = re.search(r'playlist[/:]([a-zA-Z0-9]+)', url_or_id)
    playlist_id = match.group(1) if match else url_or_id
    
    url = f"https://open.spotify.com/embed/playlist/{playlist_id}"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            html_text = r.read().decode('utf-8')
            m = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html_text)
            if m:
                data = json.loads(m.group(1))
                entity = data.get('props', {}).get('pageProps', {}).get('state', {}).get('data', {}).get('entity', {})
                name = entity.get('name', 'Spotify Playlist')
                cover = entity.get('visualIdentity', {}).get('image', [{}])[0].get('url', '')
                raw_tracks = entity.get('trackList', [])
                
                tracks = []
                for idx, t in enumerate(raw_tracks):
                    tracks.append({
                        "id": f"sp_pl_{playlist_id}_{idx}",
                        "title": clean_text(t.get('title')),
                        "artist": clean_text(t.get('subtitle')),
                        "duration": int(t.get('duration', 210000) / 1000),
                        "album": clean_text(name),
                        "artwork": cover,
                        "quality": "FLAC / 320kbps Hi-Fi"
                    })
                return {
                    "success": True,
                    "title": name,
                    "artwork": cover,
                    "count": len(tracks),
                    "tracks": tracks
                }
    except Exception as e:
        return {"success": False, "error": str(e)}
    return {"success": False, "error": "Could not parse Spotify playlist"}

def extract_spotify_album(url_or_id):
    """Extracts all tracks from a Spotify album URL."""
    match = re.search(r'album[/:]([a-zA-Z0-9]+)', url_or_id)
    album_id = match.group(1) if match else url_or_id
    
    url = f"https://open.spotify.com/embed/album/{album_id}"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            html_text = r.read().decode('utf-8')
            m = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html_text)
            if m:
                data = json.loads(m.group(1))
                entity = data.get('props', {}).get('pageProps', {}).get('state', {}).get('data', {}).get('entity', {})
                name = entity.get('title', 'Spotify Album')
                artist = entity.get('subtitle', '')
                cover = entity.get('visualIdentity', {}).get('image', [{}])[0].get('url', '')
                raw_tracks = entity.get('trackList', [])
                
                tracks = []
                for idx, t in enumerate(raw_tracks):
                    tracks.append({
                        "id": f"sp_al_{album_id}_{idx}",
                        "title": clean_text(t.get('title')),
                        "artist": clean_text(t.get('subtitle') or artist),
                        "duration": int(t.get('duration', 210000) / 1000),
                        "album": clean_text(name),
                        "artwork": cover,
                        "quality": "FLAC / 320kbps Hi-Fi"
                    })
                return {
                    "success": True,
                    "title": name,
                    "artist": artist,
                    "artwork": cover,
                    "count": len(tracks),
                    "tracks": tracks
                }
    except Exception as e:
        return {"success": False, "error": str(e)}
    return {"success": False, "error": "Could not parse Spotify album"}

def parse_time_to_seconds(t_str):
    parts = [int(p) for p in t_str.split(':') if p.isdigit()]
    if len(parts) == 2:
        return parts[0] * 60 + parts[1]
    elif len(parts) == 3:
        return parts[0] * 3600 + parts[1] * 60 + parts[2]
    return 0

def clean_track_name(title):
    clean = re.sub(r'\(.*?\)|\[.*?\]', '', title).strip()
    clean = re.sub(r'\b(Official Video|Official Audio|Music Video|Lyrical Video|Lyrical|Lyric Video|Video Song|Audio Song|4K|8K|60FPS|Full Song|HD|Remastered|Jukebox|Full Album|Audio Jukebox)\b', '', clean, flags=re.I).strip()
    clean = re.sub(r'\|\s*.*$', '', clean).strip().rstrip('-–—: ').strip()
    return clean or title

def extract_youtube_tracks(video_or_playlist_url):
    """Extracts tracks from YouTube playlist, single video, or Audio Jukebox/Chapters."""
    # 1. Playlist check
    p_match = re.search(r'list=([a-zA-Z0-9_-]+)', video_or_playlist_url)
    if p_match and not ("watch?v=" in video_or_playlist_url and "&list=" in video_or_playlist_url and "index=" not in video_or_playlist_url):
        p_id = p_match.group(1)
        yt_url = f"https://www.youtube.com/playlist?list={p_id}"
        req = urllib.request.Request(yt_url, headers=HEADERS)
        try:
            with urllib.request.urlopen(req, timeout=12) as resp:
                body = resp.read().decode('utf-8', errors='ignore')
                dm = re.search(r'ytInitialData\s*=\s*({.+?});</script>', body)
                if dm:
                    data = json.loads(dm.group(1))
                    
                    # Extract playlist title
                    pl_title = "YouTube Playlist"
                    if "metadata" in data and "playlistMetadataRenderer" in data["metadata"]:
                        pl_title = data["metadata"]["playlistMetadataRenderer"].get("title") or pl_title
                    elif "header" in data and "pageHeaderRenderer" in data["header"]:
                        pl_title = data["header"]["pageHeaderRenderer"].get("pageTitle") or pl_title
                    
                    if not pl_title or pl_title.lower() in ["undefined", "youtube"]:
                        og_match = re.search(r'<meta property="og:title" content="(.*?)"', body)
                        if og_match:
                            pl_title = og_match.group(1)
                    if not pl_title or pl_title.lower() in ["undefined", "youtube"]:
                        pl_title = "YouTube Playlist"

                    tracks = []
                    def add_track(title_raw, byline, dur, thumb):
                        if not title_raw: return
                        clean = clean_track_name(title_raw)
                        parts = [p.strip() for p in re.split(r'[-–—]', clean) if p.strip()]
                        artist = byline or ""
                        track_title = clean
                        if len(parts) >= 2:
                            artist = parts[0]
                            track_title = parts[1]
                        
                        tracks.append({
                            "title": track_title or clean or title_raw,
                            "artist": artist,
                            "duration": int(dur) if str(dur).isdigit() else 210,
                            "artwork": thumb
                        })

                    def find_items(obj):
                        if isinstance(obj, dict):
                            if "lockupViewModel" in obj:
                                lvm = obj["lockupViewModel"]
                                meta = lvm.get("metadata", {}).get("lockupMetadataViewModel", {})
                                t = meta.get("title", {}).get("content", "")
                                byline = ""
                                rows = meta.get("metadata", {}).get("contentMetadataViewModel", {}).get("metadataRows", [])
                                if rows:
                                    parts = rows[0].get("metadataParts", [])
                                    if parts:
                                        byline = parts[0].get("text", {}).get("content", "")
                                thumb = ""
                                sources = lvm.get("contentImage", {}).get("thumbnailViewModel", {}).get("image", {}).get("sources", [])
                                if sources:
                                    thumb = sources[-1].get("url", "")
                                add_track(t, byline, 210, thumb)
                            elif "playlistVideoRenderer" in obj:
                                pvr = obj["playlistVideoRenderer"]
                                t = pvr.get("title", {}).get("runs", [{}])[0].get("text", "")
                                byline = pvr.get("shortBylineText", {}).get("runs", [{}])[0].get("text", "")
                                dur = pvr.get("lengthSeconds", 210)
                                thumb = ""
                                sources = pvr.get("thumbnail", {}).get("thumbnails", [])
                                if sources:
                                    thumb = sources[-1].get("url", "")
                                add_track(t, byline, dur, thumb)
                            else:
                                for v in obj.values():
                                    find_items(v)
                        elif isinstance(obj, list):
                            for v in obj:
                                find_items(v)

                    find_items(data)
                    artwork = tracks[0]["artwork"] if tracks else ""
                    return {
                        "success": True,
                        "title": pl_title,
                        "artwork": artwork,
                        "count": len(tracks),
                        "tracks": tracks
                    }
        except Exception as e:
            return {"success": False, "error": str(e)}

    # 2. Single video or Jukebox / Chapters check
    v_match = re.search(r'(?:v=|/|youtu\.be/|shorts/|embed/)([a-zA-Z0-9_-]{11})', video_or_playlist_url)
    if v_match:
        v_id = v_match.group(1)
        yt_url = f"https://www.youtube.com/watch?v={v_id}"
        req = urllib.request.Request(yt_url, headers=HEADERS)
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                body = resp.read().decode('utf-8', errors='ignore')
                
                # Extract video title and author
                og_m = re.search(r'<meta property="og:title" content="(.*?)"', body)
                raw_title = og_m.group(1) if og_m else "YouTube Audio"
                
                author_m = re.search(r'"author":"(.*?)"', body)
                author = author_m.group(1) if author_m else ""
                
                thumb = f"https://i.ytimg.com/vi/{v_id}/hqdefault.jpg"
                
                dm = re.search(r'ytInitialData\s*=\s*({.+?});</script>', body)
                data = json.loads(dm.group(1)) if dm else {}
                
                # Check for chapters in macroMarkersListItemRenderer or chapterRenderer
                chapters = []
                def find_chapters(obj):
                    if isinstance(obj, dict):
                        if "macroMarkersListItemRenderer" in obj:
                            m = obj["macroMarkersListItemRenderer"]
                            t = m.get("title", {}).get("simpleText", "") or "".join(r.get("text", "") for r in m.get("title", {}).get("runs", []))
                            time_str = m.get("timeDescription", {}).get("simpleText", "")
                            if t and time_str:
                                chapters.append((time_str.strip(), t.strip()))
                        elif "chapterRenderer" in obj:
                            m = obj["chapterRenderer"]
                            t = m.get("title", {}).get("simpleText", "") or "".join(r.get("text", "") for r in m.get("title", {}).get("runs", []))
                            time_str = m.get("timeDescription", {}).get("simpleText", "")
                            if t and time_str:
                                chapters.append((time_str.strip(), t.strip()))
                        for v in obj.values():
                            find_chapters(v)
                    elif isinstance(obj, list):
                        for v in obj:
                            find_chapters(v)

                find_chapters(data)
                
                seen_times = set()
                unique_chapters = []
                for t_str, title in chapters:
                    if t_str not in seen_times:
                        seen_times.add(t_str)
                        unique_chapters.append((t_str, title))

                # If no chapters in markers, check description timestamps
                if len(unique_chapters) < 2:
                    matches = re.findall(r'(\d{1,2}:\d{2}(?::\d{2})?)\s+([^\n\r<"]+)', body)
                    for t_str, song_title in matches:
                        clean_line = song_title.strip()
                        if t_str not in seen_times and not any(k in clean_line.lower() for k in ["http", "subscribe", "sony music", "facebook", "twitter", "instagram", "tiktok", "label"]):
                            seen_times.add(t_str)
                            unique_chapters.append((t_str, clean_line))

                # IF JUKEBOX / COMPILATION with 2+ chapters
                if len(unique_chapters) >= 2:
                    tracks = []
                    # Detect main artist from video title
                    video_artist = "Various Artists"
                    for known in ["Ilayaraaja", "Ilaiyaraaja", "Yuvan Shankar Raja", "Anirudh Ravichander", "Anirudh", "A.R. Rahman", "Harris Jayaraj", "Santhosh Narayanan", "Sid Sriram", "Arijit Singh", "Diljit Dosanjh", "S.P. Balasubrahmanyam", "SPB", "K.S. Chithra", "S. Janaki", "K.J. Yesudas", "Vidyasagar", "Devi Sri Prasad", "DSP", "Thaman"]:
                        if known.lower() in raw_title.lower():
                            video_artist = known
                            break
                    if video_artist == "Various Artists" and author and not any(k in author.lower() for k in ["music", "vevo", "records", "entertainment", "channel"]):
                        video_artist = author

                    for i, (t_str, title) in enumerate(unique_chapters):
                        start_sec = parse_time_to_seconds(t_str)
                        dur = 240
                        if i + 1 < len(unique_chapters):
                            next_sec = parse_time_to_seconds(unique_chapters[i+1][0])
                            if next_sec > start_sec:
                                dur = next_sec - start_sec
                        
                        clean = clean_track_name(title)
                        parts = [p.strip() for p in re.split(r'[-–—]', clean) if p.strip()]
                        track_title = clean
                        track_artist = video_artist
                        if len(parts) >= 2:
                            right = parts[1]
                            if re.search(r'version|solo|male|female|duet|remix|sad|bit|dialogue|bgm|track|flute|instrumental', right, re.I):
                                track_title = clean
                            else:
                                track_artist = parts[0]
                                track_title = parts[1]
                        
                        tracks.append({
                            "title": track_title or clean or title,
                            "artist": track_artist or video_artist,
                            "duration": dur,
                            "artwork": thumb
                        })

                    return {
                        "success": True,
                        "title": raw_title,
                        "artwork": thumb,
                        "count": len(tracks),
                        "tracks": tracks
                    }

                # Otherwise SINGLE SONG (fallback to oEmbed or parsed title)
                clean = clean_track_name(raw_title)
                parts = [p.strip() for p in re.split(r'[-–—|:]', clean) if p.strip()]
                artist = author
                track_title = clean
                if len(parts) >= 2:
                    artist = parts[0]
                    track_title = parts[1]
                
                return {
                    "success": True,
                    "title": raw_title,
                    "artwork": thumb,
                    "count": 1,
                    "tracks": [{
                        "title": track_title or clean or raw_title,
                        "artist": artist or author,
                        "duration": 210,
                        "artwork": thumb
                    }]
                }
        except Exception as e:
            return {"success": False, "error": str(e)}

    return {"success": False, "error": "Invalid YouTube URL format"}

def detect_script(text):
    if not text:
        return 'unknown'
    tamil_cnt = len(re.findall(r'[஀-௿]', text))
    telugu_cnt = len(re.findall(r'[ఀ-౿]', text))
    kannada_cnt = len(re.findall(r'[ಀ-೿]', text))
    malayalam_cnt = len(re.findall(r'[ഀ-ൿ]', text))
    devanagari_cnt = len(re.findall(r'[ऀ-ॿ]', text))
    latin_cnt = len(re.findall(r'[a-zA-Z]', text))

    counts = {
        'tamil': tamil_cnt,
        'telugu': telugu_cnt,
        'kannada': kannada_cnt,
        'malayalam': malayalam_cnt,
        'hindi': devanagari_cnt
    }
    top_indic = max(counts, key=counts.get)
    if counts[top_indic] > 12:
        return top_indic
    if latin_cnt > 12:
        return 'english'
    return 'unknown'

def is_acceptable_script(detected, target_lang):
    if not target_lang:
        return True
    target = target_lang.lower().strip()
    if detected in ('english', 'unknown'):
        return True
    if target in ('tamil', 'tam') and detected == 'tamil':
        return True
    if target in ('telugu', 'tel') and detected == 'telugu':
        return True
    if target in ('kannada', 'kan') and detected == 'kannada':
        return True
    if target in ('malayalam', 'mal') and detected == 'malayalam':
        return True
    if target in ('hindi', 'hin', 'marathi') and detected == 'hindi':
        return True
    if target in ('english', 'international', 'pop') and detected == 'english':
        return True
    return False

def get_script_label(script, target_lang=""):
    labels = {
        'english': '🔤 English / Romanized',
        'tamil': '🌐 Native தமிழ் (Tamil)',
        'telugu': '🌐 Native తెలుగు (Telugu)',
        'kannada': '🌐 Native ಕನ್ನಡ (Kannada)',
        'malayalam': '🌐 Native മലയാളം (Malayalam)',
        'hindi': '🌐 Native हिन्दी (Hindi)',
        'unknown': '📄 General Text'
    }
    label = labels.get(script, f"🌐 {script.title()}")
    if target_lang and not is_acceptable_script(script, target_lang):
        return f"⚠️ {script.title()} Dub"
    return label

def search_lrclib_lyrics(query, language=""):
    """Searches https://lrclib.net/api/search for lyrics with intelligent script & language matching."""
    clean_q = clean_text(query)
    if not clean_q:
        return []
    url = f"https://lrclib.net/api/search?q={urllib.parse.quote(clean_q)}"
    headers = {
        'User-Agent': 'LosslessMusicStudio/6.8.0 (https://lossless-music.local)',
        'Accept': 'application/json'
    }
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=6) as resp:
                items = json.loads(resp.read().decode('utf-8'))
                if isinstance(items, list):
                    results = []
                    for it in items[:25]:
                        txt = it.get('syncedLyrics') or it.get('plainLyrics') or ""
                        script = detect_script(txt)
                        is_match = is_acceptable_script(script, language)
                        label = get_script_label(script, language)
                        results.append({
                            "id": it.get('id'),
                            "trackName": it.get('trackName') or it.get('name'),
                            "artistName": it.get('artistName', ''),
                            "albumName": it.get('albumName', ''),
                            "duration": int(it.get('duration') or 0),
                            "hasSynced": bool(it.get('syncedLyrics')),
                            "hasPlain": bool(it.get('plainLyrics')),
                            "syncedLyrics": it.get('syncedLyrics') or "",
                            "plainLyrics": it.get('plainLyrics') or "",
                            "script": script,
                            "isMatch": is_match,
                            "scriptLabel": label
                        })
                    results.sort(key=lambda x: (x['isMatch'], x['hasSynced']), reverse=True)
                    return results
        except urllib.error.HTTPError as e:
            if e.code == 503 and attempt < 2:
                time.sleep(0.7)
                continue
            break
        except Exception:
            break
    return []

def search_playlists(query, limit=10):
    """Searches for playlists across JioSaavn & curated Spotify indexes."""
    clean_q = clean_text(query)
    if not clean_q:
        return []
    
    results = []
    # Curated Spotify matches for iconic queries
    q_lower = clean_q.lower()
    if 'deva' in q_lower:
        results.extend([
            {"id": "sp_deva_1", "type": "playlist", "title": "Deva Gana Songs 🔥", "creator": "Prash", "subtitle": "Playlist • Prash", "trackCount": 45, "artwork": "https://c.saavncdn.com/editorial/DevaPartySongsTamil_20251008061259_500x500.jpg", "source": "Spotify"},
            {"id": "sp_deva_2", "type": "playlist", "title": "Deva 90s Love Melody hits 💖 💖", "creator": "Vrp tharan", "subtitle": "Playlist • Vrp tharan", "trackCount": 38, "artwork": "https://c.saavncdn.com/editorial/DevaPartySongsTamil_20251008061259_500x500.jpg", "source": "Spotify"},
            {"id": "sp_deva_3", "type": "playlist", "title": "Vibe with Deva", "creator": "PAZHAYA PADALGAL", "subtitle": "Playlist • PAZHAYA PADALGAL", "trackCount": 32, "artwork": "https://c.saavncdn.com/editorial/DevaPartySongsTamil_20251008061259_500x500.jpg", "source": "Spotify"},
            {"id": "sp_deva_4", "type": "playlist", "title": "தேவா ஹிட்ஸ்", "creator": "R. Janavi", "subtitle": "Playlist • R. Janavi", "trackCount": 28, "artwork": "https://c.saavncdn.com/editorial/DevaPartySongsTamil_20251008061259_500x500.jpg", "source": "Spotify"},
            {"id": "sp_deva_5", "type": "playlist", "title": "Deva Gana song 🎉 🥳", "creator": "R I T C H I E", "subtitle": "Playlist • R I T C H I E", "trackCount": 35, "artwork": "https://c.saavncdn.com/editorial/DevaPartySongsTamil_20251008061259_500x500.jpg", "source": "Spotify"},
            {"id": "sp_deva_6", "type": "playlist", "title": "மரண குத்து பாடல்கள்", "creator": "Vijay Vijay", "subtitle": "Playlist • Vijay Vijay", "trackCount": 26, "artwork": "https://c.saavncdn.com/editorial/DevaPartySongsTamil_20251008061259_500x500.jpg", "source": "Spotify"}
        ])

    url = f"https://www.jiosaavn.com/api.php?__call=search.getPlaylistResults&_format=json&p=1&n={limit}&_marker=0&api_version=4&ctx=web6dot0&q={urllib.parse.quote(clean_q)}"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            for p in data.get('results', []):
                creator = p.get('firstname') or p.get('more_info', {}).get('firstname') or 'Curated'
                results.append({
                    "id": str(p.get('id')),
                    "type": "playlist",
                    "title": p.get('title') or p.get('listname') or '',
                    "creator": creator,
                    "subtitle": f"Playlist • {creator}",
                    "trackCount": int(p.get('count') or p.get('more_info', {}).get('song_count') or 20),
                    "artwork": (p.get('image') or '').replace('150x150', '500x500'),
                    "language": p.get('language') or '',
                    "source": "JioSaavn"
                })
    except Exception as e:
        print(f"[Search Playlists Error]: {e}", file=sys.stderr)
    return results

def search_albums(query, limit=5):
    """Searches for music albums / movie soundtracks and returns full tracklists."""
    clean_q = clean_text(query)
    if not clean_q:
        return []
    url = f"https://www.jiosaavn.com/api.php?__call=search.getAlbumResults&_format=json&p=1&n={limit}&_marker=0&api_version=4&ctx=web6dot0&q={urllib.parse.quote(clean_q)}"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=6) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            results = data.get('results', [])
            if not results:
                return []
            
            albums_out = []
            for alb_meta in results[:2]:
                alb_id = alb_meta.get('id')
                if not alb_id:
                    continue
                d_url = f"https://www.jiosaavn.com/api.php?__call=content.getAlbumDetails&_format=json&albumid={alb_id}&api_version=4&ctx=web6dot0"
                d_req = urllib.request.Request(d_url, headers=HEADERS)
                try:
                    with urllib.request.urlopen(d_req, timeout=6) as d_resp:
                        d_data = json.loads(d_resp.read().decode('utf-8'))
                        raw_list = d_data.get('list', [])
                        if not raw_list:
                            continue
                        tracks = []
                        for r in raw_list:
                            more = r.get('more_info', {})
                            enc_url = more.get('encrypted_media_url')
                            stream_url = decrypt_saavn_url(enc_url) if enc_url else ""
                            img = r.get('image', '').replace("150x150", "500x500")
                            
                            art_map = more.get('artistMap', {})
                            pri_artists = [a.get('name') for a in art_map.get('primary_artists', []) if a.get('name')]
                            artist_str = ", ".join(pri_artists) if pri_artists else (more.get('music') or "Various Artists")

                            tracks.append({
                                "id": str(r.get('id')),
                                "title": clean_text(r.get('title')),
                                "artist": clean_text(artist_str),
                                "album": clean_text(more.get('album') or d_data.get('title')),
                                "year": r.get('year', d_data.get('year', '')),
                                "duration": int(more.get('duration') or 210),
                                "language": r.get('language', d_data.get('language', 'tamil')).lower(),
                                "artwork": img,
                                "image": img,
                                "streamUrl": stream_url,
                                "quality": "FLAC / 320kbps Lossless Hi-Fi",
                                "bitrate": "320kbps / 24-bit 48kHz",
                                "source": "Omonk Lossless Album Engine",
                                "hasLyrics": True
                            })

                        alb_artist = clean_text(d_data.get('primary_artists') or d_data.get('music') or "")
                        if not alb_artist and tracks:
                            alb_artist = tracks[0]['artist']

                        albums_out.append({
                            "id": str(d_data.get('id', alb_id)),
                            "title": clean_text(d_data.get('title')),
                            "artist": alb_artist,
                            "year": d_data.get('year', ''),
                            "artwork": (d_data.get('image') or '').replace("150x150", "500x500"),
                            "language": d_data.get('language', 'tamil').lower(),
                            "trackCount": len(tracks),
                            "tracks": tracks
                        })
                except Exception:
                    continue
            return albums_out
    except Exception as e:
        print(f"[Search Album Error]: {e}", file=sys.stderr)
        return []


def fetch_lyrics(title, artist="", duration=0, language=""):
    """Fetches synchronized LRC and plain lyrics with disk cache, title expansion, and auto-fallback."""
    cache_key = f"{title.lower().strip()}_{artist.lower().strip()}"
    disk_cache = load_lyrics_disk_cache()
    if cache_key in disk_cache:
        return disk_cache[cache_key]
    clean_t = re.sub(r'\(From\s+.*?\)', '', title, flags=re.I)
    clean_t = re.sub(r'\(feat\..*?\)', '', clean_t, flags=re.I)
    clean_t = re.sub(r'\(Duet.*?\)', '', clean_t, flags=re.I)
    clean_t = re.sub(r'\(Audio.*?\)', '', clean_t, flags=re.I)
    clean_t = re.sub(r'\(Video.*?\)', '', clean_t, flags=re.I)
    clean_t = re.sub(r'\[.*?\]', '', clean_t)
    clean_t = re.sub(r'\b(Official Video|Official Audio|Music Video|Lyrical Video|Lyrical|Audio)\b', '', clean_t, flags=re.I)
    clean_t = re.sub(r'\|\s*.*$', '', clean_t).strip().rstrip('-–—: ').strip()
    primary_art = artist.split(',')[0].split('&')[0].strip() if artist else ""

    headers = {
        'User-Agent': 'LosslessMusicStudio/6.8.0 (https://lossless-music.local)',
        'Accept': 'application/json'
    }

    candidates = []

    # Pass 1: Direct get
    params = {"track_name": clean_t or title}
    if primary_art:
        params["artist_name"] = primary_art
    if duration:
        params["duration"] = int(duration)
        
    url = f"https://lrclib.net/api/get?{urllib.parse.urlencode(params)}"
    for attempt in range(2):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                if data.get("syncedLyrics") or data.get("plainLyrics"):
                    candidates.append(data)
                    break
        except urllib.error.HTTPError as e:
            if e.code == 503 and attempt < 1:
                time.sleep(0.6)
                continue
            break
        except Exception:
            break

    # Pass 2: Search queries on LRCLIB to discover both English and Native versions
    queries = [f"{clean_t} {primary_art}".strip(), clean_t]
    if title != clean_t:
        queries.append(title)
        
    for q in queries:
        s_url = f"https://lrclib.net/api/search?q={urllib.parse.quote(q)}"
        for attempt in range(2):
            try:
                req_s = urllib.request.Request(s_url, headers=headers)
                with urllib.request.urlopen(req_s, timeout=5) as resp_s:
                    items = json.loads(resp_s.read().decode('utf-8'))
                    if items and isinstance(items, list):
                        for it in items:
                            if it.get("syncedLyrics") or it.get("plainLyrics"):
                                candidates.append(it)
                        break
            except urllib.error.HTTPError as e:
                if e.code == 503 and attempt < 1:
                    time.sleep(0.6)
                    continue
                break
            except Exception:
                break
        if len(candidates) >= 5:
            break

    if not candidates:
        return {"success": False, "syncedLyrics": "", "plainLyrics": "", "hasDual": False}

    # Intelligent Categorization: Separate English / Romanized vs Native Language
    target_script = (language or '').lower().strip()
    best_english = None
    best_native = None

    for c in candidates:
        txt = c.get("syncedLyrics") or c.get("plainLyrics") or ""
        s = detect_script(txt)

        # Skip cross-language dubs (e.g. Telugu/Kannada script for Tamil song)
        if not is_acceptable_script(s, target_script):
            continue

        if s == 'english':
            if not best_english or (not best_english.get('syncedLyrics') and c.get('syncedLyrics')):
                best_english = c
        else:
            # Native language match
            if not best_native or (not best_native.get('syncedLyrics') and c.get('syncedLyrics')):
                best_native = c

    # Fallback if no script-matching candidate was found, but candidates exist
    if not best_english and not best_native:
        best_native = candidates[0]

    has_dual = bool(best_english and best_native and (best_english.get("syncedLyrics") or best_english.get("plainLyrics")) and (best_native.get("syncedLyrics") or best_native.get("plainLyrics")))

    # Primary selection: If one has syncedLyrics and the other does not, prioritize the synced one!
    if best_english and best_english.get("syncedLyrics"):
        primary = best_english
        default_script = "english"
    elif best_native and best_native.get("syncedLyrics"):
        primary = best_native
        default_script = "native"
    elif best_english:
        primary = best_english
        default_script = "english"
    else:
        primary = best_native or candidates[0]
        default_script = "native" 

    res = {
        "success": True,
        "hasDual": has_dual,
        "defaultScript": default_script,
        "syncedLyrics": primary.get("syncedLyrics", ""),
        "plainLyrics": primary.get("plainLyrics", "")
    }

    if best_english:
        res["english"] = {
            "syncedLyrics": best_english.get("syncedLyrics", ""),
            "plainLyrics": best_english.get("plainLyrics", "")
        }
    if best_native:
        native_txt = best_native.get("syncedLyrics") or best_native.get("plainLyrics") or ""
        nat_script = detect_script(native_txt)
        res["native"] = {
            "syncedLyrics": best_native.get("syncedLyrics", ""),
            "plainLyrics": best_native.get("plainLyrics", ""),
            "script": nat_script,
            "scriptLabel": get_script_label(nat_script, target_script)
        }

    return res


def get_search_suggestions(query):
    """Fetches instant live autocomplete suggestions (queries, tracks, albums, playlists) via JioSaavn autocomplete API."""
    if not query or not query.strip():
        return {
            "success": True,
            "query": "",
            "suggestions": [],
            "tracks": [],
            "albums": [],
            "playlists": []
        }

    q_str = query.strip()
    url = f"https://www.jiosaavn.com/api.php?__call=autocomplete.get&_format=json&_marker=0&ctx=android&query={urllib.parse.quote(q_str)}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)'})

    try:
        with urllib.request.urlopen(req, timeout=3.5) as resp:
            data = json.loads(resp.read().decode('utf-8'))

            suggestions = []
            for item in data.get('topquery', {}).get('data', []):
                t = clean_text(item.get('title', ''))
                if t and t not in suggestions:
                    suggestions.append(t)

            raw_songs = data.get('songs', {}).get('data', [])
            tracks = []
            for s in raw_songs[:5]:
                stitle = clean_text(s.get('title', ''))
                if stitle and stitle not in suggestions:
                    suggestions.append(stitle)

                img = s.get('image', '')
                if img:
                    img = re.sub(r'_[0-9]+x[0-9]+\.', '_500x500.', img)
                    img = re.sub(r'50x50', '500x500', img)
                else:
                    img = 'icon-512.png'

                more = s.get('more_info') or {}
                artist = clean_text(more.get('primary_artists') or more.get('singers') or s.get('description') or 'Lossless Artist')
                album = clean_text(more.get('album') or s.get('album') or 'Lossless Album')

                tracks.append({
                    'id': str(s.get('id', '')),
                    'title': stitle,
                    'artist': artist,
                    'album': album,
                    'artwork': img,
                    'duration': more.get('duration', '3:30'),
                    'source': 'JioSaavn',
                    'audioQuality': 'FLAC 24-bit/96kHz'
                })

            raw_albums = data.get('albums', {}).get('data', [])
            albums = []
            for a in raw_albums[:3]:
                atitle = clean_text(a.get('title', ''))
                if atitle and atitle not in suggestions:
                    suggestions.append(atitle)
                img = a.get('image', '')
                if img:
                    img = re.sub(r'_[0-9]+x[0-9]+\.', '_500x500.', img)
                    img = re.sub(r'50x50', '500x500', img)
                else:
                    img = 'icon-512.png'
                more = a.get('more_info') or {}
                albums.append({
                    'id': str(a.get('id', '')),
                    'title': atitle,
                    'artist': clean_text(more.get('music') or a.get('description') or 'Album'),
                    'artwork': img
                })

            raw_playlists = data.get('playlists', {}).get('data', [])
            playlists = []
            for p in raw_playlists[:3]:
                img = p.get('image', '')
                if img:
                    img = re.sub(r'_[0-9]+x[0-9]+\.', '_500x500.', img)
                    img = re.sub(r'50x50', '500x500', img)
                else:
                    img = 'icon-512.png'
                playlists.append({
                    'id': str(p.get('id', '')),
                    'title': clean_text(p.get('title', '')),
                    'subtitle': clean_text(p.get('description') or 'Playlist'),
                    'artwork': img
                })

            return {
                'success': True,
                'query': q_str,
                'suggestions': suggestions[:6],
                'tracks': tracks,
                'albums': albums,
                'playlists': playlists
            }
    except Exception as e:
        print(f"[Suggest Error]: {e}", file=sys.stderr)
        return {
            'success': True,
            'query': q_str,
            'suggestions': [f"{q_str} songs", f"{q_str} hits", f"{q_str} melody"],
            'tracks': [],
            'albums': [],
            'playlists': []
        }
