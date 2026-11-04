"""
Multi-Language Daily, Weekly, and Monthly Charts Synchronizer.
Actively fetches and synchronizes real-time trending hits, weekly chartbusters,
and monthly blockbusters across 11 languages (Tamil, Telugu, Hindi, Malayalam,
Kannada, Punjabi, English, Spanish, K-Pop, Japanese, French).
Sources: JioSaavn Real-time Streaming Charts, Apple Music RSS feeds, and Spotify Streaming Trends.
Maintains persistent cache in weekly_cache.json with automated TTL expiration per timeframe:
- Daily: 24 Hours
- Weekly: 7 Days
- Monthly: 30 Days
"""

import urllib.request
import urllib.parse
import json
import os
import time
import re
import concurrent.futures

BASE_DIR = os.path.dirname(__file__)
CACHE_FILE = os.path.join(BASE_DIR, "weekly_cache.json")

TTL_MAP = {
    "daily": 24 * 3600,       # 1 Day
    "weekly": 7 * 24 * 3600,   # 7 Days
    "monthly": 30 * 24 * 3600  # 30 Days
}

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

LANGUAGES = [
    "tamil", "telugu", "hindi", "malayalam", "kannada", "punjabi",
    "english", "spanish", "kpop", "japanese", "french"
]

def load_cache():
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, dict):
                    return data
        except Exception as e:
            print(f"[weekly_sync] Error reading cache: {e}")
    return {}

def save_cache(data):
    try:
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        # Also mirror active charts to chartsData.json
        cd_file = os.path.join(BASE_DIR, "chartsData.json")
        if os.path.exists(cd_file):
            with open(cd_file, 'r', encoding='utf-8') as f:
                cd = json.load(f)
            cd.setdefault('charts', {})
            for lang, tfs in data.items():
                if isinstance(tfs, dict):
                    cd['charts'].setdefault(lang, {})
                    for tf in ('daily', 'weekly', 'monthly'):
                        if isinstance(tfs.get(tf), dict) and tfs[tf].get('tracks'):
                            cd['charts'][lang][tf] = tfs[tf]['tracks']
            with open(cd_file, 'w', encoding='utf-8') as f:
                json.dump(cd, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"[weekly_sync] Failed to save cache: {e}")

def fetch_itunes_top(country="in", limit=25):
    url = f"https://itunes.apple.com/{country}/rss/topsongs/limit={limit}/json"
    req = urllib.request.Request(url, headers=HEADERS)
    tracks = []
    try:
        with urllib.request.urlopen(req, timeout=6) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            entries = data.get('feed', {}).get('entry', [])
            for e in entries:
                title = e.get('im:name', {}).get('label', '')
                artist = e.get('im:artist', {}).get('label', '')
                art = ''
                images = e.get('im:image', [])
                if images:
                    art = images[-1].get('label', '').replace('170x170', '500x500')
                if title and artist:
                    tracks.append({
                        "title": title,
                        "artist": artist,
                        "album": f"Apple Music Top Songs ({country.upper()})",
                        "duration": 210,
                        "artwork": art,
                        "source": f"Apple Music Top Songs ({country.upper()})"
                    })
    except Exception as ex:
        print(f"[weekly_sync] iTunes fetch failed ({country}): {ex}")
    return tracks

def fetch_saavn_chart_tracks(query, limit=15, source_label="JioSaavn Live Charts"):
    try:
        encoded_q = urllib.parse.quote(query)
        url = f"https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&n={limit}&p=1&q={encoded_q}"
        req = urllib.request.Request(url, headers=HEADERS)
        tracks = []
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            results = data.get('results', [])
            for r in results:
                title = r.get('song') or r.get('title') or ''
                artist = r.get('primary_artists') or r.get('singers') or r.get('artist') or ''
                album = r.get('album') or f"{query} Hit"
                art = r.get('image', '').replace('150x150', '500x500')
                media_url = r.get('media_preview_url', '')
                if title:
                    tracks.append({
                        "title": title.replace('&quot;', '"').replace('&amp;', '&').replace('&#039;', "'"),
                        "artist": artist.replace('&quot;', '"').replace('&amp;', '&').replace('&#039;', "'"),
                        "album": album.replace('&quot;', '"').replace('&amp;', '&').replace('&#039;', "'"),
                        "duration": int(r.get('duration') or 210),
                        "artwork": art,
                        "streamUrl": media_url,
                        "source": source_label
                    })
        return tracks
    except Exception as ex:
        print(f"[weekly_sync] Saavn fetch failed ({query}): {ex}")
        return []

def get_query_for_lang(lang, timeframe):
    lang_title = lang.title()
    if lang == 'english':
        if timeframe == 'daily':
            return 'Top English Songs'
        elif timeframe == 'weekly':
            return 'Global Top 50 Hits'
        else:
            return 'Billboard Hot 100 Hits'
    elif lang == 'spanish':
        if timeframe == 'daily':
            return 'Top Latin Hits'
        elif timeframe == 'weekly':
            return 'Spanish Top 20 Hits'
        else:
            return 'Reggaeton Superhits'
    elif lang == 'kpop':
        if timeframe == 'daily':
            return 'Top K-Pop Hits'
        elif timeframe == 'weekly':
            return 'BTS Blackpink K-Pop Hits'
        else:
            return 'K-Pop Greatest Hits'
    elif lang == 'japanese':
        if timeframe == 'daily':
            return 'Top Japanese Anime Songs'
        elif timeframe == 'weekly':
            return 'J-Pop Top Hits'
        else:
            return 'Japanese Greatest Hits'
    elif lang == 'french':
        if timeframe == 'daily':
            return 'Top French Songs'
        elif timeframe == 'weekly':
            return 'French Top 20 Hits'
        else:
            return 'French Classic Hits'
    else:
        # Regional Indian languages (Tamil, Telugu, Hindi, Malayalam, Kannada, Punjabi)
        if timeframe == 'daily':
            return f'Top {lang_title} Songs'
        elif timeframe == 'weekly':
            return f'{lang_title} Superhits'
        else:
            return f'Latest {lang_title} Hits'


SPOTIFY_PLAYLIST_MAP = {
    'tamil': '37i9dQZF1DX1i3hvzHpcQV',      # Hot Hits Tamil (Radhimaa, One Name, Putaapu Gang, Aura 10/10...)
    'telugu': '37i9dQZF1DX6XE7HRLM75P',     # Hot Hits Telugu
    'hindi': '37i9dQZF1DX0XUfTFmNBRM',      # Hot Hits Hindi
    'malayalam': '37i9dQZF1DX688wU47emR9',  # Hot Hits Malayalam
    'kannada': '37i9dQZF1DX1ahAlaaz0ZE',    # Hot Hits Kannada
    'punjabi': '37i9dQZF1DX5cZuAHLNjGz',    # Punjabi 101 / Hot Hits Punjabi
    'english': '37i9dQZF1DXcBWIGoYBM5M',    # Today's Top Hits
    'spanish': '37i9dQZF1DX10zKzsJ2jva',    # Viva Latino
    'kpop': '37i9dQZF1DX9tPFwDMOaN1',       # K-Pop ON!
    'japanese': '37i9dQZEVXbKXQ4mDTEBXq',   # Top 50 - Japan
    'french': '37i9dQZEVXbIPWwFssbupI'      # Top 50 - France
}

SPOTIFY_TIMEFRAME_PLAYLIST_MAP = {
    'english': {
        'daily': '37i9dQZF1DXcBWIGoYBM5M',     # Today's Top Hits
        'weekly': '37i9dQZEVXbng2KDaqgdHw',    # Top Songs Global Weekly
        'monthly': '37i9dQZF1DX4JAvHpjipBk',   # Hot Hits Global
    },
    'tamil': {
        'daily': '37i9dQZF1DX1i3hvzHpcQV',      # Hot Hits Tamil
        'weekly': '37i9dQZF1DX35rhq1G6r3W',     # Top Songs Tamil Weekly
        'monthly': '37i9dQZF1DX1i3hvzHpcQV',    # Tamil Hits
    },
    'hindi': {
        'daily': '37i9dQZF1DX0XUfTFmNBRM',      # Hot Hits Hindi
        'weekly': '37i9dQZEVXbMWDif5SCFGq',     # Top 50 India Weekly
        'monthly': '37i9dQZF1DX0XUfTFmNBRM',    # Hindi Hits
    },
    'telugu': {
        'daily': '37i9dQZF1DX6XE7HRLM75P',     # Hot Hits Telugu
        'weekly': '37i9dQZF1DX6XE7HRLM75P',     # Telugu Weekly
        'monthly': '37i9dQZF1DX6XE7HRLM75P',    # Telugu Hits
    }
}

def fetch_spotify_playlist_tracks(lang, timeframe="daily", limit=30):
    pid = SPOTIFY_TIMEFRAME_PLAYLIST_MAP.get(lang, {}).get(timeframe) or SPOTIFY_PLAYLIST_MAP.get(lang)
    if not pid:
        return []
    url = f"https://open.spotify.com/embed/playlist/{pid}"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            html = resp.read().decode('utf-8')
            match = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html)
            if not match:
                return []
            data = json.loads(match.group(1))
            entity = data.get('props', {}).get('pageProps', {}).get('state', {}).get('data', {}).get('entity', {})
            cover_sources = entity.get('coverArt', {}).get('sources', [])
            default_cover = cover_sources[0].get('url', '') if cover_sources else ''
            tracks_raw = entity.get('trackList', [])
            
            tracks = []
            for idx, t in enumerate(tracks_raw[:limit], 1):
                uri = t.get('uri', '')
                track_id = uri.replace('spotify:track:', '') if uri else ''
                artists = t.get('subtitle', '').replace('\u00a0', ' ').strip()
                title = t.get('title', '').strip()
                dur = round((t.get('duration', 0) or 0) / 1000)
                tracks.append({
                    "id": f"sp_{lang}_{idx}",
                    "title": title,
                    "artist": artists,
                    "album": entity.get('title') or f"Spotify Hot Hits {lang.title()}",
                    "duration": dur if dur > 30 else 210,
                    "artwork": default_cover,
                    "source": f"Spotify {entity.get('title', 'Hot Hits')}",
                    "spotifyUri": uri,
                    "spotifyId": track_id,
                    "chartType": timeframe
                })
            return tracks
    except Exception as ex:
        print(f"[weekly_sync] Spotify fetch failed ({lang} {timeframe}): {ex}")
        return []

def fetch_tracks_for_language(lang, timeframe):
    tracks = []
    seen_titles = set()

    # 1. Primary Source: Live Official Spotify Hot Hits / Top Charts
    spotify_tracks = fetch_spotify_playlist_tracks(lang, timeframe=timeframe, limit=35)
    for t in spotify_tracks:
        tl = t['title'].lower()
        if tl not in seen_titles:
            seen_titles.add(tl)
            tracks.append(t)

    # 2. Secondary Source: Apple Music RSS for global languages
    itunes_country_map = {
        'english': 'us',
        'spanish': 'es',
        'japanese': 'jp',
        'french': 'fr'
    }
    if lang in itunes_country_map:
        itunes_tracks = fetch_itunes_top(itunes_country_map[lang], limit=15)
        for t in itunes_tracks:
            tl = t['title'].lower()
            if tl not in seen_titles:
                seen_titles.add(tl)
                tracks.append(t)

    # 3. Tertiary Source: Query JioSaavn live search for active streaming URLs & artwork
    query = get_query_for_lang(lang, timeframe)
    saavn_tracks = fetch_saavn_chart_tracks(query, limit=15, source_label=f"{lang.title()} {timeframe.title()} Streaming Charts")
    for t in saavn_tracks:
        tl = t['title'].lower()
        if tl not in seen_titles:
            seen_titles.add(tl)
            tracks.append(t)

    return tracks

def sync_charts_all(force=False, timeframe="all", language=None):
    """
    Synchronizes daily, weekly, and/or monthly charts for all supported languages.
    timeframe: 'all' | 'daily' | 'weekly' | 'monthly'
    language: None (all) or specific language code (e.g. 'tamil')
    """
    cache = load_cache()
    now = time.time()

    timeframes_to_sync = ["daily", "weekly", "monthly"] if timeframe == "all" else [timeframe]
    languages_to_sync = [language] if language and language in LANGUAGES else LANGUAGES

    if "timeframes" not in cache:
        cache["timeframes"] = {}

    charts_updated = {}
    synced_any = False

    for tf in timeframes_to_sync:
        tf_ttl = TTL_MAP.get(tf, 24 * 3600)
        tf_cache = cache["timeframes"].setdefault(tf, {"last_sync": 0, "charts": {}})
        last_sync = tf_cache.get("last_sync", 0)

        # Check if entire timeframe is fresh and not forced
        if not force and (now - last_sync < tf_ttl) and tf_cache.get("charts"):
            # Still valid, check if specific language is requested and present
            if language:
                if tf_cache["charts"].get(language):
                    continue
            else:
                continue

        print(f"⚡ Actively synchronizing {tf.upper()} charts across {len(languages_to_sync)} languages...")
        synced_any = True

        # Concurrently fetch for all languages in this timeframe
        def do_fetch(lang):
            return lang, fetch_tracks_for_language(lang, tf)

        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
            results = list(executor.map(do_fetch, languages_to_sync))

        for lang, trks in results:
            if trks:
                tf_cache["charts"][lang] = trks
                charts_updated.setdefault(tf, {})[lang] = len(trks)
                # Keep both formats updated in cache
                cache.setdefault(lang, {})[tf] = {
                    "timestamp": int(now),
                    "count": len(trks),
                    "tracks": trks
                }

        tf_cache["last_sync"] = now
        tf_cache["last_sync_formatted"] = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime(now))

    # Maintain backward compatibility for older weekly_cache readers
    weekly_tf = cache.get("timeframes", {}).get("weekly", {}).get("charts", {})
    legacy_charts = cache.setdefault("charts", {})
    for lang, trks in weekly_tf.items():
        legacy_charts[lang] = trks
    if "english" in weekly_tf:
        legacy_charts["english"] = weekly_tf["english"]
    if "tamil" in weekly_tf:
        legacy_charts["india_weekly"] = weekly_tf["tamil"]

    cache["last_sync_timestamp"] = now
    cache["last_sync_formatted"] = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime(now))
    cache["sources"] = "JioSaavn Lossless CDN & Apple Music Official Charts"

    if synced_any:
        save_cache(cache)

    return {
        "status": "updated" if synced_any else "cached",
        "last_sync": cache["last_sync_formatted"],
        "timeframes_synced": list(charts_updated.keys()) if synced_any else timeframes_to_sync,
        "details": charts_updated if synced_any else "Cache valid and up-to-date"
    }

def get_synced_tracks(chart_type, language):
    """Returns active synced tracks for (chart_type, language), or None if not found."""
    cache = load_cache()
    chart_type = chart_type.lower()
    language = language.lower()
    
    # 1. Direct language and chart_type dictionary check
    lang_entry = cache.get(language)
    if isinstance(lang_entry, dict):
        tf_entry = lang_entry.get(chart_type)
        if isinstance(tf_entry, dict) and tf_entry.get("tracks"):
            return tf_entry["tracks"]
        elif isinstance(tf_entry, list) and tf_entry:
            return tf_entry

    # 2. Check timeframes[chart_type]["charts"][language]
    tf_charts = cache.get("timeframes", {}).get(chart_type, {}).get("charts", {})
    if tf_charts and language in tf_charts and tf_charts[language]:
        return tf_charts[language]
    
    # 3. Fallback to legacy charts dictionary
    legacy = cache.get("charts", {})
    if language in legacy and legacy[language]:
        return legacy[language]
    if language in ('tamil', 'telugu', 'hindi', 'punjabi') and 'india_weekly' in legacy:
        return legacy['india_weekly']
    return None

def sync_weekly_all(force=False):
    """Backward-compatible weekly sync alias."""
    return sync_charts_all(force=force, timeframe="weekly")

if __name__ == "__main__":
    res = sync_charts_all(force=True, timeframe="all")
    print("Sync result:", res)
