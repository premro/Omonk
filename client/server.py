#!/usr/bin/env python3
"""
LosslessMusicApp High-Performance Audio Server
Provides lossless audio streaming, SpotiFLAC resolution, playlist import,
multi-language daily/weekly/monthly hits, range-request proxying, and lyrics.
"""

import http.server
import socketserver
import urllib.request
import urllib.parse
import json
import os
import time
import sys
import re
import mimetypes
import concurrent.futures
import threading

import spotiflac
import charts_data
import weekly_sync
import podcasts

PORT = 8888
DIR_PATH = os.path.dirname(os.path.abspath(__file__))

class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True

class LosslessRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIR_PATH, **kwargs)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Range, Authorization')
        self.send_header('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        qs = urllib.parse.parse_qs(parsed.query)

        # 0. API Version & Auto Sync Check
        if path == '/api/version':
            vpath = os.path.join(DIR_PATH, 'version.json')
            vdata = {"version": "6.8.0", "timestamp": int(time.time()), "build": "cyber-neon-blue-v6.8"}
            if os.path.exists(vpath):
                try:
                    with open(vpath, 'r', encoding='utf-8') as vf:
                        vdata = json.load(vf)
                except Exception:
                    pass
            return self.send_json(vdata)

        # 0. API Charts Sync (Daily, Weekly, Monthly across all languages)
        if path in ('/api/sync-charts', '/api/sync-weekly'):
            force = qs.get('force', ['false'])[0].lower() == 'true'
            timeframe = qs.get('timeframe', ['all' if path == '/api/sync-charts' else 'weekly'])[0]
            lang = qs.get('lang', [None])[0]
            if lang in ('all', '', 'null'):
                lang = None
            sync_res = weekly_sync.sync_charts_all(force=force, timeframe=timeframe, language=lang)
            return self.send_json({"success": True, "sync": sync_res})

        # 1. API Languages
        if path == '/api/languages':
            languages = charts_data.get_languages()
            return self.send_json({"success": True, "languages": languages})

        # 1B. API Podcasts (Spotify & Global Top Shows)
        if path == '/api/podcasts':
            q = qs.get('q', [''])[0]
            pod_list = podcasts.get_podcasts(query=q if q else None)
            return self.send_json({"success": True, "count": len(pod_list), "podcasts": pod_list})

        if path in ('/api/podcast/episodes', '/api/podcast/detail'):
            pod_id = qs.get('id', [''])[0]
            feed_url = qs.get('feed', [''])[0]
            pod_obj, episodes = podcasts.get_podcast_detail(pod_id, feed_url)
            return self.send_json({
                "success": True,
                "podcast": pod_obj,
                "count": len(episodes),
                "episodes": episodes
            })

        # 2. API Charts (Daily, Weekly, Monthly Hits)
        if path == '/api/artists':
            lang = qs.get('lang', ['all'])[0]
            artists = charts_data.get_artists(lang)
            return self.send_json({"success": True, "count": len(artists), "artists": artists})

        if path == '/api/artist':
            artist_id = qs.get('id', [''])[0] or qs.get('name', [''])[0]
            artist = charts_data.get_artist_by_id(artist_id)
            if artist:
                return self.send_json({"success": True, "artist": artist})
            return self.send_json({"success": False, "error": "Artist not found"}, 404)

        if path == '/api/charts':
            chart_type = qs.get('type', ['daily'])[0]
            lang = qs.get('lang', ['tamil'])[0]
            resolve_audio = qs.get('resolve', ['false'])[0].lower() == 'true'
            
            hits = charts_data.get_hits(chart_type, lang)
            
            # Optional quick stream resolution for top tracks (resolve full 20 tracks)
            if resolve_audio and hits:
                def resolve_single(t):
                    try:
                        res = spotiflac.resolve_track_audio(t['title'], t['artist'])
                        if res:
                            t['streamUrl'] = res.get('streamUrl', '')
                            if not t.get('artwork') and res.get('image'):
                                t['artwork'] = res.get('image', '')
                            t['duration'] = res.get('duration', t['duration'])
                    except Exception:
                        pass
                    return t
                
                with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
                    hits = list(executor.map(resolve_single, hits[:20]))

            return self.send_json({
                "success": True,
                "type": chart_type,
                "language": lang,
                "count": len(hits),
                "tracks": hits
            })

        # 3A. API Suggest (Instant Live Typeahead Suggestions)
        if path == '/api/suggest':
            query = qs.get('q', [''])[0]
            sug_data = spotiflac.get_search_suggestions(query)
            return self.send_json(sug_data)

        # 3. API Search (Tracks + Movie / Soundtrack Albums)
        if path == '/api/search':
            query = qs.get('q', [''])[0]
            limit = int(qs.get('limit', [25])[0])
            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
                future_tracks = executor.submit(spotiflac.search_tracks, query, limit)
                future_albums = executor.submit(spotiflac.search_albums, query, 3)
                results = future_tracks.result()
                albums = future_albums.result()

            return self.send_json({
                "success": True,
                "query": query,
                "albumCount": len(albums),
                "albums": albums,
                "count": len(results),
                "results": results
            })

        # 3B. API LRCLIB Web Lyrics Search
        if path == '/api/lyrics/search':
            query = qs.get('q', [''])[0]
            language = qs.get('language', [''])[0]
            results = spotiflac.search_lrclib_lyrics(query, language)
            return self.send_json({
                "success": True,
                "query": query,
                "language": language,
                "count": len(results),
                "results": results
            })

        # 4. API Resolve Track Audio
        if path == '/api/resolve':
            title = qs.get('title', [''])[0]
            artist = qs.get('artist', [''])[0]
            track = spotiflac.resolve_track_audio(title, artist)
            if track:
                return self.send_json({"success": True, "track": track})
            return self.send_json({"success": False, "error": "Track stream not found"}, status=404)

        # 5. API Lyrics (LRCLIB synced & plain)
        if path == '/api/lyrics':
            title = qs.get('title', [''])[0]
            artist = qs.get('artist', [''])[0]
            duration = int(qs.get('duration', [0])[0])
            lyrics_data = spotiflac.fetch_lyrics(title, artist, duration)
            return self.send_json(lyrics_data)

        # 5B. API Radio (Vibe flow auto-recommendations by artist / title / language)
        if path == '/api/radio':
            artist = qs.get('artist', [''])[0]
            title = qs.get('title', [''])[0]
            lang = qs.get('lang', ['tamil'])[0]
            track_id = qs.get('id', [''])[0]

            query = f"{artist} hits" if artist else f"{lang} top hits"
            try:
                radio_tracks = spotiflac.search_tracks(query, limit=20)
                filtered = [
                    t for t in radio_tracks
                    if str(t.get('id', '')) != str(track_id) and t.get('title', '').lower() != title.lower()
                ]
                return self.send_json({"success": True, "count": len(filtered), "tracks": filtered})
            except Exception as e:
                return self.send_json({"success": False, "error": str(e), "tracks": []})

        # 6. API Audio Stream Proxy (Range request support, ad-tracker unwrap, and streaming)
        if path == '/api/stream':
            raw_url = qs.get('url', [''])[0]
            if not raw_url:
                self.send_error(400, "Missing url parameter")
                return

            # Clean known dynamic ad-insertion & audio tracker redirect wrappers
            pattern = r'https?://(?:chtbl\.com/track/[^/]+/|dts\.podtrac\.com/redirect\.mp3/|prfx\.byspotify\.com/e/|pdst\.fm/e/)+'
            raw_url = re.sub(pattern, 'https://', raw_url)

            try:
                headers = {'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)'}
                # Forward range header if present
                range_header = self.headers.get('Range')
                if range_header:
                    headers['Range'] = range_header

                req = urllib.request.Request(raw_url, headers=headers)
                resp = urllib.request.urlopen(req, timeout=12)
                
                # Check response status
                status_code = resp.status if hasattr(resp, 'status') else 200
                self.send_response(status_code)
                
                # Forward headers
                content_type = resp.headers.get('Content-Type') or 'audio/mp4'
                content_length = resp.headers.get('Content-Length')
                content_range = resp.headers.get('Content-Range')
                accept_ranges = resp.headers.get('Accept-Ranges') or 'bytes'

                self.send_header('Content-Type', content_type)
                self.send_header('Accept-Ranges', accept_ranges)
                if content_length:
                    self.send_header('Content-Length', content_length)
                if content_range:
                    self.send_header('Content-Range', content_range)
                self.end_headers()

                # Stream chunks
                while True:
                    chunk = resp.read(65536)
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                resp.close()
                return
            except Exception as e:
                # If broken pipe (client paused/seeked), ignore cleanly
                return

        # 7. API Download Track Endpoint
        if path == '/api/download':
            raw_url = qs.get('url', [''])[0]
            title = qs.get('title', ['Track'])[0]
            artist = qs.get('artist', ['Unknown'])[0]
            
            if not raw_url:
                # Try to resolve url from title & artist
                resolved = spotiflac.resolve_track_audio(title, artist)
                if resolved and resolved.get('streamUrl'):
                    raw_url = resolved['streamUrl']
                else:
                    self.send_error(404, "Could not find stream for track")
                    return

            safe_name = re.sub(r'[/\\:*?"<>|]', '', f"{artist} - {title} [Lossless 320kbps].m4a")
            try:
                req = urllib.request.Request(raw_url, headers={'User-Agent': 'Mozilla/5.0'})
                resp = urllib.request.urlopen(req, timeout=15)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/octet-stream')
                self.send_header('Content-Disposition', f'attachment; filename="{safe_name}"')
                if resp.headers.get('Content-Length'):
                    self.send_header('Content-Length', resp.headers.get('Content-Length'))
                self.end_headers()

                while True:
                    chunk = resp.read(65536)
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                resp.close()
                return
            except Exception as e:
                self.send_error(500, f"Download error: {e}")
                return

        # Fallback to static files
        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        # Read JSON body
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length).decode('utf-8') if length > 0 else '{}'
        try:
            data = json.loads(body)
        except Exception:
            data = {}

        # 1. Spotify Import
        if path == '/api/import/spotify':
            url = data.get('url', '').strip()
            if not url:
                return self.send_json({"success": False, "error": "URL is required"}, 400)
            
            if 'playlist' in url:
                res = spotiflac.extract_spotify_playlist(url)
            elif 'album' in url:
                res = spotiflac.extract_spotify_album(url)
            elif 'track' in url:
                res = spotiflac.extract_spotify_track(url)
            else:
                return self.send_json({"success": False, "error": "Unrecognized Spotify URL format"}, 400)
            return self.send_json(res)

        # 2. YouTube Import
        if path == '/api/import/youtube':
            url = data.get('url', '').strip()
            if not url:
                return self.send_json({"success": False, "error": "URL is required"}, 400)
            res = spotiflac.extract_youtube_tracks(url)
            return self.send_json(res)

        # 3. Plain Text / CSV Import
        if path == '/api/import/text':
            text = data.get('text', '').strip()
            if not text:
                return self.send_json({"success": False, "error": "Text is required"}, 400)
            
            lines = [l.strip() for l in text.split('\n') if l.strip()]
            tracks = []
            for idx, line in enumerate(lines):
                # Check for "Artist - Title" or "Title"
                parts = [p.strip() for p in re.split(r'[-–—|]', line) if p.strip()]
                if len(parts) >= 2:
                    artist = parts[0]
                    title = parts[1]
                else:
                    artist = ""
                    title = line
                tracks.append({
                    "id": f"import_txt_{idx}_{int(os.times()[4]*1000)}",
                    "title": title,
                    "artist": artist,
                    "duration": 210,
                    "quality": "FLAC / 320kbps Hi-Fi"
                })
            return self.send_json({
                "success": True,
                "title": "Imported Text Playlist",
                "count": len(tracks),
                "tracks": tracks
            })

        self.send_error(404, "Endpoint not found")

def background_daily_sync():
    """Daily background worker to keep Spotify and charts constantly updated."""
    # Brief initial pause to let server bind and accept connections
    time.sleep(3)
    while True:
        try:
            print("⚡ [AutoSync Daemon] Refreshing Spotify and streaming charts...")
            weekly_sync.sync_charts_all(force=False, timeframe="all")
        except Exception as e:
            print(f"[AutoSync Daemon] Sync exception: {e}")
        # Sleep for 12 hours between checks
        time.sleep(12 * 3600)

def run():
    # Start automated background synchronization daemon
    sync_thread = threading.Thread(target=background_daily_sync, daemon=True)
    sync_thread.start()

    server = ThreadedHTTPServer(('0.0.0.0', PORT), LosslessRequestHandler)
    print(f"🎵 LosslessMusicApp server running on http://localhost:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        server.server_close()

if __name__ == '__main__':
    run()
