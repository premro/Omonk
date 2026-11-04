import sys, os, json, concurrent.futures
sys.path.insert(0, '/Users/prem-19467/Documents/LosslessMusicApp')
import charts_data, spotiflac

ART_CACHE_FILE = '/Users/prem-19467/Documents/LosslessMusicApp/artwork_cache.json'

art_cache = {}
if os.path.exists(ART_CACHE_FILE):
    try:
        with open(ART_CACHE_FILE, 'r') as f:
            art_cache = json.load(f)
    except Exception:
        pass

def get_track_art(t):
    title = t.get('title', '')
    artist = t.get('artist', '')
    if t.get('artwork'):
        return t
    key = f"{title.lower()}|||{artist.lower()}"
    if key in art_cache:
        t['artwork'] = art_cache[key]
        return t
    try:
        res = spotiflac.resolve_track_audio(title, artist)
        if res and res.get('image'):
            img = res.get('image')
            art_cache[key] = img
            t['artwork'] = img
    except Exception:
        pass
    return t

all_tracks = []
for lang, charts in charts_data.CHART_CATALOG.items():
    for ctype in ['daily', 'weekly', 'monthly']:
        all_tracks.extend(charts.get(ctype, []))

print(f"Total catalog tracks to check: {len(all_tracks)}")
with concurrent.futures.ThreadPoolExecutor(max_workers=12) as ex:
    list(ex.map(get_track_art, all_tracks))

with open(ART_CACHE_FILE, 'w') as f:
    json.dump(art_cache, f, indent=2)

print(f"Cached {len(art_cache)} track artworks into {ART_CACHE_FILE}")
