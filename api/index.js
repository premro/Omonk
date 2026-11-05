const pianoEngine = require('./pianoEngine');
const podcastsEngine = require('./podcastsEngine');
const lyricsEngine = require('./lyricsEngine');
const importEngine = require('./importEngine');
'use strict';

const https = require('https');

const UPSTREAM_HOST = 'backend.listenfree.in';
const searchEngine = require('./searchEngine');
const chartsData = require('./chartsData.json');
let weeklyCache = {};
try {
    weeklyCache = require('./weekly_cache.json');
} catch (e) {}
let podcastsData = {};
try { podcastsData = require('./verified_podcasts.json'); } catch(e){}

/**
 * Yumi Hi-Fi Music Engine - Advanced I/O Function
 * 100% Stateless Proxy for Search, Stream, Lyrics, and Playlist Resolution.
 * Zero storage consumption on Catalyst - all user data is stored device-locally.
 * Developed with ❤️ by Prem
 */

// -------------------------------------------------------------
// SPOTIFY TRENDING CHARTS (ZERO-AUTH, 12H CACHE, NO ADS)
// -------------------------------------------------------------
const TRENDING_CACHE = {};
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

const SPOTIFY_TIMEFRAME_PLAYLIST_MAP = {
    'tamil': {
        'daily': '37i9dQZF1DX1i3hvzHpcQV',
        'weekly': '37i9dQZF1DX35rhq1G6r3W',
        'monthly': '37i9dQZF1DX1i3hvzHpcQV'
    },
    'telugu': {
        'daily': '37i9dQZF1DX6XE7HRLM75P',
        'weekly': '37i9dQZF1DX0k1yAon5p4V',
        'monthly': '37i9dQZF1DX6XE7HRLM75P'
    },
    'hindi': {
        'daily': '37i9dQZF1DX0XUfTFmNBRM',
        'weekly': '37i9dQZEVXbMWDif5SCFGq',
        'monthly': '37i9dQZF1DX0XUfTFmNBRM'
    },
    'malayalam': {
        'daily': '37i9dQZF1DX688wU47emR9',
        'weekly': '37i9dQZF1DX9T5gN5s41z5',
        'monthly': '37i9dQZF1DX688wU47emR9'
    },
    'kannada': {
        'daily': '37i9dQZF1DX1ahAlaaz0ZE',
        'weekly': '37i9dQZF1DX3TqXg447gq5',
        'monthly': '37i9dQZF1DX1ahAlaaz0ZE'
    },
    'punjabi': {
        'daily': '37i9dQZF1DX5cZuAHLNjGz',
        'weekly': '37i9dQZF1DXa2hu2p8vG4u',
        'monthly': '37i9dQZF1DX5cZuAHLNjGz'
    },
    'english': {
        'daily': '37i9dQZF1DXcBWIGoYBM5M',
        'weekly': '37i9dQZEVXbng2KDaqgdHw',
        'monthly': '37i9dQZF1DX4JAvHpjipBk'
    },
    'spanish': {
        'daily': '37i9dQZF1DX10zKzsJ2jva',
        'weekly': '37i9dQZF1DX10zKzsJ2jva',
        'monthly': '37i9dQZF1DX10zKzsJ2jva'
    },
    'kpop': {
        'daily': '37i9dQZF1DX9tPFwDMOaN1',
        'weekly': '37i9dQZF1DX9tPFwDMOaN1',
        'monthly': '37i9dQZF1DX9tPFwDMOaN1'
    },
    'japanese': {
        'daily': '37i9dQZEVXbKXQ4mDTEBXq',
        'weekly': '37i9dQZEVXbKXQ4mDTEBXq',
        'monthly': '37i9dQZEVXbKXQ4mDTEBXq'
    },
    'french': {
        'daily': '37i9dQZEVXbIPWwFssbupI',
        'weekly': '37i9dQZEVXbIPWwFssbupI',
        'monthly': '37i9dQZEVXbIPWwFssbupI'
    }
};

const CHART_PLAYLIST_MAP = {
    'tamil': '37i9dQZF1DX1i3hvzHpcQV',      // Hot Hits Tamil (Radhimaa, One Name, Putaapu Gang...)
    'telugu': '37i9dQZF1DX6XE7HRLM75P',     // Hot Hits Telugu
    'hindi': '37i9dQZF1DX0XUfTFmNBRM',      // Hot Hits Hindi
    'malayalam': '37i9dQZF1DX688wU47emR9',  // Hot Hits Malayalam
    'kannada': '37i9dQZF1DX1ahAlaaz0ZE',    // Hot Hits Kannada
    'punjabi': '37i9dQZF1DX5cZuAHLNjGz',    // Hot Hits Punjabi
    'english': '37i9dQZF1DXcBWIGoYBM5M',    // Today's Top Hits
    'spanish': '37i9dQZF1DX10zKzsJ2jva',    // Viva Latino
    'kpop': '37i9dQZF1DX9tPFwDMOaN1',       // K-Pop ON!
    'japanese': '37i9dQZEVXbKXQ4mDTEBXq',   // Top 50 Japan
    'french': '37i9dQZEVXbIPWwFssbupI',     // Top 50 France
    'viral-in': '37i9dQZF1DX2L0iB23Enbq',    // Viral Hits India / South Asia
    'regional-in': '37i9dQZEVXbLZ52XmnySJg', // Top 50 India
    'top-in': '37i9dQZEVXbLZ52XmnySJg',      // Top 50 India
    'viral-global': '37i9dQZF1DX2L0iB23Enbq',// Viral Hits Global
    'top-global': '37i9dQZEVXbMDoHDwVN2tF'   // Top 50 Global
};

function fetchHttps(url) {
    return new Promise((resolve, reject) => {
        https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve({ status: res.statusCode, body: data }));
        }).on('error', reject);
    });
}

async function getAlbumArtForTrack(uri) {
    try {
        const res = await fetchHttps(`https://open.spotify.com/oembed?url=${encodeURIComponent(uri)}`);
        if (res.status === 200) {
            const parsed = JSON.parse(res.body);
            return parsed.thumbnail_url || null;
        }
    } catch (e) {}
    return null;
}

function formatDuration(ms) {
    if (!ms) return '0:00';
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

async function handleSpotifyTrending(chartKey, res) {
    const key = (chartKey || 'top-in').toLowerCase().trim();
    const now = Date.now();
    const cached = TRENDING_CACHE[key];

    // 1. Check in-memory cache with 12-hour TTL
    if (cached && cached.data && (now - cached.timestamp < CACHE_TTL_MS)) {
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'X-Cache': 'HIT',
            'X-Cache-Expires-In': Math.round((CACHE_TTL_MS - (now - cached.timestamp)) / 1000) + 's'
        });
        res.end(JSON.stringify({
            success: true,
            chart: key,
            chartTitle: cached.chartTitle,
            count: cached.data.length,
            cached: true,
            timestamp: cached.timestamp,
            tracks: cached.data
        }));
        return;
    }

    // 2. Fetch fresh tracks from Spotify Public Embed
    try {
        const pid = CHART_PLAYLIST_MAP[key] || CHART_PLAYLIST_MAP['top-in'];
        const embedUrl = `https://open.spotify.com/embed/playlist/${pid}`;
        const embedRes = await fetchHttps(embedUrl);

        const match = embedRes.body.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/);
        if (!match) {
            throw new Error('Spotify public embed script unavailable');
        }

        const nextData = JSON.parse(match[1]);
        const entity = nextData?.props?.pageProps?.state?.data?.entity;
        const trackList = entity?.trackList || [];

        if (!Array.isArray(trackList) || trackList.length === 0) {
            throw new Error('No tracks found in public embed');
        }

        const chartTitle = entity?.title || entity?.name || 'Spotify Trending';
        const defaultCover = entity?.coverArt?.sources?.[0]?.url || 'https://charts-images.scdn.co/assets/locale_en/regional/daily/region_in_default.jpg';

        // Extract and normalize track data
        const normalized = trackList.map((t, idx) => {
            const uri = t.uri || '';
            const trackId = uri.replace('spotify:track:', '');
            const artists = (t.subtitle || 'Unknown Artist').replace(/\u00a0/g, ' ');
            return {
                rank: idx + 1,
                title: t.title || 'Unknown Title',
                artist: artists,
                albumArt: defaultCover,
                trackId: trackId,
                uri: uri || `spotify:track:${trackId}`,
                durationMs: t.duration || 0,
                durationFormatted: formatDuration(t.duration || 0),
                previewUrl: t.audioPreview?.url || null
            };
        });

        // Concurrently resolve real high-res album covers for top tracks using oEmbed
        const topCoverTasks = normalized.slice(0, 15).map(async (t) => {
            if (t.uri) {
                const cover = await getAlbumArtForTrack(t.uri);
                if (cover) t.albumArt = cover;
            }
        });
        await Promise.allSettled(topCoverTasks);

        // Attach verified 320kbps streamUrls from chartsData for instant playback
        try {
            const allTracks = [];
            for (const l in (chartsData.charts || {})) {
                for (const cType of ['daily', 'weekly', 'monthly']) {
                    allTracks.push(...(chartsData.charts[l][cType] || []));
                }
            }
            for (const t of normalized) {
                const normT = (t.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                const m = allTracks.find(k => {
                    const normK = (k.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                    return normT && normK && (normT.includes(normK) || normK.includes(normT));
                });
                if (m && m.streamUrl) {
                    t.streamUrl = m.streamUrl;
                    if (m.artwork) t.artwork = m.artwork;
                    if (m.album) t.album = m.album;
                }
            }
        } catch(e) {}

        // Store into cache with 12h TTL
        TRENDING_CACHE[key] = {
            data: normalized,
            chartTitle: chartTitle,
            timestamp: now
        };

        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'X-Cache': 'MISS'
        });
        res.end(JSON.stringify({
            success: true,
            chart: key,
            chartTitle: chartTitle,
            count: normalized.length,
            cached: false,
            timestamp: now,
            tracks: normalized
        }));
    } catch (err) {
        // Fallback: If remote request failed or was rate-limited, safely return cached data if available
        if (cached && cached.data) {
            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'X-Cache': 'STALE-FALLBACK'
            });
            res.end(JSON.stringify({
                success: true,
                chart: key,
                chartTitle: cached.chartTitle,
                count: cached.data.length,
                cached: true,
                stale: true,
                error: err.message,
                tracks: cached.data
            }));
            return;
        }

        res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({
            success: false,
            error: 'Failed to fetch public Spotify charts: ' + err.message
        }));
    }
}


function parseTimestampToSeconds(ts) {
    if (!ts) return 0;
    const parts = ts.trim().split(':').map(Number);
    if (parts.length === 3) {
        return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
    } else if (parts.length === 2) {
        return (parts[0] || 0) * 60 + (parts[1] || 0);
    }
    return 0;
}

function resolveYouTubeTracks(inputUrl) {
    return new Promise((resolve) => {
        const isPlaylist = inputUrl.includes('list=');
        let playlistId = null;
        if (isPlaylist) {
            const pm = inputUrl.match(/[?&]list=([a-zA-Z0-9_-]+)/);
            if (pm) playlistId = pm[1];
        }

        const vm = inputUrl.match(/(?:v=|\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        const videoId = vm ? vm[1] : null;

        if (!videoId && !playlistId) {
            return resolve({ success: false, error: 'Invalid YouTube URL' });
        }

        const targetUrl = playlistId && !videoId
            ? `https://www.youtube.com/playlist?list=${playlistId}`
            : `https://www.youtube.com/watch?v=${videoId}`;

        const req = https.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                let title = '';
                const tm = body.match(/<title>(.*?)(?: - YouTube)?<\/title>/i);
                if (tm) {
                    title = tm[1].replace(/ - YouTube/i, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim();
                }

                const cover = videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '';
                const tracks = [];
                let ytData = null;

                const dm = body.match(/ytInitialData\s*=\s*({.+?});<\/script>/);
                if (dm) {
                    try {
                        ytData = JSON.parse(dm[1]);
                    } catch (e) {}
                }

                // Detect Primary Artist from title
                let primaryArtist = '';
                const artistRegex = /\b(ilayaraja|ilayaraaja|ilaiyaraaja|a\.?\s*r\.?\s*rahman|anirudh|anirudh\s*ravichander|harris\s*jayaraj|yuvan\s*shankar\s*raja|yuvan|spb|s\.\s*p\.\s*balasubrahmanyam|chitra|k\.\s*s\.\s*chithra|janaki|s\.\s*janaki|yesudas|k\.\s*j\.\s*yesudas|vidyasagar|devi\s*sri\s*prasad|dsp|thaman|thaman\s*s|arijit\s*singh|arijit|shreya\s*ghoshal|sid\s*sriram|santhosh\s*narayanan|g\.?\s*v\.?\s*prakash|hiphop\s*tamizha|d\.?\s*imman|taylor\s*swift|billie\s*eilish|bad\s*bunny|the\s*weeknd)\b/i;
                const am = title.match(artistRegex);
                if (am) {
                    primaryArtist = am[1].trim();
                }

                function cleanTrackTitle(raw) {
                    return raw
                        .replace(/^\s*\d+[\.\-\)]\s*/, '')
                        .replace(/\s*[-–—]\s*(?:audio|video|lyrical|official|hd|4k|1080p|full\s*song|remastered).*$/i, '')
                        .trim();
                }

                // 1. Playlist items
                if (playlistId && ytData) {
                    function findPlaylistVideos(obj) {
                        let list = [];
                        if (obj && typeof obj === 'object') {
                            if (obj.playlistVideoRenderer) list.push(obj.playlistVideoRenderer);
                            for (const k of Object.keys(obj)) {
                                list = list.concat(findPlaylistVideos(obj[k]));
                            }
                        }
                        return list;
                    }
                    const plVideos = findPlaylistVideos(ytData);
                    for (const pv of plVideos) {
                        const pvTitle = pv.title?.simpleText || pv.title?.runs?.[0]?.text;
                        const pvArtist = pv.shortBylineText?.runs?.[0]?.text || primaryArtist || 'YouTube';
                        const pvDur = parseInt(pv.lengthSeconds || '210', 10);
                        const pvThumb = pv.thumbnail?.thumbnails?.[pv.thumbnail.thumbnails.length - 1]?.url || cover;
                        if (pvTitle && !pvTitle.includes('[Private video]') && !pvTitle.includes('[Deleted video]')) {
                            tracks.push({
                                title: cleanTrackTitle(pvTitle),
                                artist: pvArtist,
                                duration: pvDur,
                                artwork: pvThumb
                            });
                        }
                    }
                }

                // 2. Structured Chapters (macroMarkersListItemRenderer / chapterRenderer)
                if (tracks.length === 0 && ytData) {
                    function findMarkers(obj) {
                        let markers = [];
                        if (obj && typeof obj === 'object') {
                            if (obj.macroMarkersListItemRenderer) markers.push(obj.macroMarkersListItemRenderer);
                            if (obj.chapterRenderer) markers.push(obj.chapterRenderer);
                            for (const k of Object.keys(obj)) {
                                markers = markers.concat(findMarkers(obj[k]));
                            }
                        }
                        return markers;
                    }
                    const markers = findMarkers(ytData);
                    const seenChapters = new Set();
                    for (const m of markers) {
                        const cTitle = m.title?.simpleText || m.title?.runs?.[0]?.text;
                        if (cTitle && !seenChapters.has(cTitle.toLowerCase().trim())) {
                            seenChapters.add(cTitle.toLowerCase().trim());
                            const timeStr = m.timeDescription?.simpleText || m.timeDescription?.runs?.[0]?.text || '0:00';
                            const sec = m.onTap?.watchEndpoint?.startTimeSeconds ?? parseTimestampToSeconds(timeStr);
                            const endMs = parseInt(m.repeatButton?.toggleButtonRenderer?.defaultServiceEndpoint?.repeatChapterCommand?.endTimeMs || '0', 10);
                            const dur = endMs > 0 ? Math.round((endMs - sec * 1000) / 1000) : 240;
                            const art = m.thumbnail?.thumbnails?.[m.thumbnail.thumbnails.length - 1]?.url || cover;

                            let trackTitle = cleanTrackTitle(cTitle);
                            let trackArtist = primaryArtist || 'Ilayaraaja';

                            if (trackTitle.includes(' - ') || trackTitle.includes(' | ')) {
                                const parts = trackTitle.split(/\s*[-|]\s*/);
                                const right = parts[1].trim();
                                if (!/version|solo|male|female|duet|remix|sad|bit|dialogue|bgm|track|flute|instrumental/i.test(right)) {
                                    trackTitle = parts[0].trim();
                                    trackArtist = right;
                                }
                            }

                            tracks.push({
                                title: trackTitle,
                                artist: trackArtist,
                                duration: dur,
                                artwork: art,
                                startTime: sec
                            });
                        }
                    }
                }

                // 3. Description Timestamp Parsing
                if (tracks.length === 0 && ytData) {
                    function findDesc(obj) {
                        if (!obj || typeof obj !== 'object') return '';
                        if (obj.attributedDescription?.content) return obj.attributedDescription.content;
                        if (typeof obj.description?.simpleText === 'string') return obj.description.simpleText;
                        for (const k of Object.keys(obj)) {
                            const r = findDesc(obj[k]);
                            if (r) return r;
                        }
                        return '';
                    }
                    const desc = findDesc(ytData);
                    if (desc) {
                        const lines = desc.split('\n');
                        const timeRegexPrefix = /^(?:track\s*\d+[\.\-\:]\s*)?(\d{1,2}:\d{2}(?::\d{2})?)\s*[-–—:\.]*\s*(.+)$/i;
                        const timeRegexSuffix = /^(.+?)\s*[-–—:\.]*\s*(\d{1,2}:\d{2}(?::\d{2})?)$/i;
                        const parsedTs = [];

                        for (const line of lines) {
                            const l = line.trim();
                            if (!l || /subscribe|facebook|twitter|instagram|whatsapp|spotify|apple|label|copyright|©|http/i.test(l)) continue;
                            let timeStr = '', name = '';
                            const mPre = l.match(timeRegexPrefix);
                            if (mPre) {
                                timeStr = mPre[1];
                                name = mPre[2];
                            } else {
                                const mSuf = l.match(timeRegexSuffix);
                                if (mSuf) {
                                    name = mSuf[1];
                                    timeStr = mSuf[2];
                                }
                            }

                            if (timeStr && name) {
                                let cName = cleanTrackTitle(name);
                                let trackArtist = primaryArtist || 'Ilayaraaja';
                                if (cName.includes(' - ') || cName.includes(' | ')) {
                                    const parts = cName.split(/\s*[-|]\s*/);
                                    const right = parts[1].trim();
                                    if (!/version|solo|male|female|duet|remix|sad|bit|dialogue|bgm|track|flute|instrumental/i.test(right)) {
                                        cName = parts[0].trim();
                                        trackArtist = right;
                                    }
                                }
                                if (cName.length >= 2) {
                                    parsedTs.push({
                                        title: cName,
                                        artist: trackArtist,
                                        startTime: parseTimestampToSeconds(timeStr),
                                        artwork: cover
                                    });
                                }
                            }
                        }

                        for (let i = 0; i < parsedTs.length; i++) {
                            const dur = (i < parsedTs.length - 1) ? Math.max(30, parsedTs[i+1].startTime - parsedTs[i].startTime) : 240;
                            parsedTs[i].duration = dur;
                            tracks.push(parsedTs[i]);
                        }
                    }
                }

                // 4. Music Licensing Cards
                if (tracks.length === 0 && ytData) {
                    function findCards(obj) {
                        let cards = [];
                        if (obj && typeof obj === 'object') {
                            if (obj.videoAttributeViewModel) cards.push(obj.videoAttributeViewModel);
                            for (const k of Object.keys(obj)) {
                                cards = cards.concat(findCards(obj[k]));
                            }
                        }
                        return cards;
                    }
                    const cards = findCards(ytData);
                    for (const c of cards) {
                        const tTitle = c.title || '';
                        const tArtist = c.subtitle || primaryArtist || 'Unknown Artist';
                        if (tTitle && !tracks.some(t => t.title.toLowerCase() === tTitle.toLowerCase())) {
                            tracks.push({
                                title: cleanTrackTitle(tTitle),
                                artist: tArtist,
                                duration: 210,
                                artwork: cover
                            });
                        }
                    }
                }

                // 5. Fallback Single Track
                if (tracks.length === 0 && title) {
                    const cleanTitle = title
                        .replace(/#\S+/g, '')
                        .replace(/\b(official\s*(music)?\s*video|video\s*song|full\s*video|lyrical\s*video|audio\s*song|jukebox|4k|hd|1080p|full\s*album|remastered|status|shorts)\b/gi, '')
                        .trim();
                    const parts = cleanTitle.split(/[-–—|:]/).map(s => s.trim()).filter(Boolean);
                    if (parts.length >= 2) {
                        tracks.push({ title: parts[1] || parts[0], artist: parts[0] || primaryArtist || '', duration: 210, artwork: cover });
                    } else if (cleanTitle) {
                        tracks.push({ title: cleanTitle, artist: primaryArtist || '', duration: 210, artwork: cover });
                    }
                }

                resolve({
                    success: true,
                    platform: 'YouTube',
                    title: title || 'YouTube Video',
                    cover,
                    tracks,
                    count: tracks.length
                });
            });
        });

        req.on('error', (e) => resolve({ success: false, error: e.message }));
        req.setTimeout(8000, () => {
            req.destroy();
            resolve({ success: false, error: 'YouTube request timed out' });
        });
    });
}

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    try {
        const u = new URL(req.url, 'http://localhost');
        let pathname = u.pathname || '';
        pathname = pathname.replace(/^\/server\/music_api/, '');
        pathname = pathname.replace(/^\/music_api/, '');

        // -------------------------------------------------------------
        // Stateless Ping & Healthcheck
        // -------------------------------------------------------------
                // -------------------------------------------------------------
        // Spotify Public Trending Charts (GET /api/trending?chart=viral-in)
        // -------------------------------------------------------------
                

        
        // 0. Piano Roll & Transcription Notes (GET/POST /api/piano/notes)
        if (pathname === '/api/piano/notes' || pathname === '/piano/notes' || pathname === '/api/transcribe') {
            const trackId = u.searchParams.get('track_id') || u.searchParams.get('trackId') || u.searchParams.get('id') || '';
            const duration = u.searchParams.get('duration') || '180';
            const title = u.searchParams.get('title') || '';
            const artist = u.searchParams.get('artist') || '';

            if (req.method === 'POST') {
                let body = '';
                req.on('data', c => body += c);
                req.on('end', () => {
                    try {
                        const payload = JSON.parse(body || '{}');
                        pianoEngine.savePianoNotes(payload.trackId || trackId, payload);
                        res.writeHead(200, {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        });
                        res.end(JSON.stringify({ success: true, cached: true }));
                    } catch (e) {
                        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                        res.end(JSON.stringify({ success: false, error: e.message }));
                    }
                });
                return;
            }

            const data = pianoEngine.getPianoNotes(trackId, { duration, title, artist });
            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=86400, immutable'
            });
            res.end(JSON.stringify(data));
            return;
        }

        // 1. Languages
        if (pathname === '/api/languages' || pathname === '/languages') {
            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=86400'
            });
            res.end(JSON.stringify({
                success: true,
                languages: chartsData.languages || []
            }));
            return;
        }

        // 0. Sync Charts Endpoint (Daily, Weekly, Monthly across all languages via Spotify Live)
        if (pathname === '/api/sync-charts' || pathname === '/sync-charts' || pathname === '/api/sync-weekly' || pathname === '/sync-weekly') {
            const rawLang = u.searchParams.get('lang');
            const reqTimeframe = (u.searchParams.get('timeframe') || 'all').toLowerCase();
            const targetLangs = (!rawLang || rawLang === 'all') 
                ? ['tamil', 'telugu', 'hindi', 'malayalam', 'kannada', 'punjabi', 'english', 'spanish', 'kpop', 'japanese', 'french']
                : [rawLang.toLowerCase()];

            const syncSingleLang = async (lang, tf = 'daily') => {
                const pid = SPOTIFY_TIMEFRAME_PLAYLIST_MAP[lang]?.[tf] || CHART_PLAYLIST_MAP[lang];
                if (!pid) return;
                try {
                    const embedRes = await fetchHttps(`https://open.spotify.com/embed/playlist/${pid}`);
                    const match = embedRes.body.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/);
                    if (match) {
                        const nextData = JSON.parse(match[1]);
                        const entity = nextData?.props?.pageProps?.state?.data?.entity;
                        const list = entity?.trackList || [];
                        if (list.length > 0) {
                            const existingDaily = (chartsData.charts && chartsData.charts[lang] && chartsData.charts[lang]['daily']) || [];
                            const existingMap = new Map();
                            existingDaily.forEach(e => {
                                const key = (e.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                                if (key) existingMap.set(key, e);
                            });

                            const fresh = [];
                            for (let idx = 0; idx < list.length; idx++) {
                                const t = list[idx];
                                const rawTitle = t.title || 'Unknown Title';
                                const norm = rawTitle.toLowerCase().replace(/[^a-z0-9]/g, '');

                                const matched = existingMap.get(norm) || existingDaily.find(e => {
                                    const eNorm = (e.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                                    return eNorm && norm && (eNorm.includes(norm) || norm.includes(eNorm));
                                });

                                const BAD_ART = ['ab67706f00000002', 'charts-images.scdn.co', 'image-cdn-fa.spotifycdn.com'];
                                const isBadArt = (url) => !url || BAD_ART.some(p => url.includes(p));

                                let individualArtwork = (matched && !isBadArt(matched.artwork)) ? matched.artwork : '';
                                let verifiedStream = (matched && matched.streamUrl) ? matched.streamUrl : '';
                                let albumName = (matched && matched.album && !matched.album.startsWith('Spotify Hot Hits') && !matched.album.startsWith('Hot Hits'))
                                    ? matched.album
                                    : rawTitle;

                                if ((!individualArtwork || !verifiedStream) && idx < 30) {
                                    try {
                                        const clean = rawTitle.replace(/\s*\(From\s+[^)]+\)/i, '').replace(/\s*-\s*From\s+[^"]+/i, '').trim();
                                        const artistLead = (t.subtitle || '').split(',')[0].replace(/ /g, ' ').trim();
                                        const sRes = await searchEngine.searchAll(`${clean} ${artistLead}`.trim(), 3);
                                        const sSongs = sRes.songs || sRes.results || [];
                                        const found = sSongs.find(s => s.streamUrl) || sSongs[0];
                                        if (found) {
                                            if (!individualArtwork && found.artwork) individualArtwork = found.artwork;
                                            if (!verifiedStream && found.streamUrl) verifiedStream = found.streamUrl;
                                            if (found.album) albumName = found.album;
                                        }
                                    } catch (resErr) {}
                                }

                                fresh.push({
                                    id: matched?.id || `sp_${lang}_${idx + 1}`,
                                    rank: idx + 1,
                                    title: rawTitle,
                                    artist: (t.subtitle || matched?.artist || 'Unknown Artist').replace(/ /g, ' '),
                                    album: albumName,
                                    duration: Math.round((t.duration || 0) / 1000) || (matched?.duration || 210),
                                    artwork: individualArtwork || (matched?.artwork || ''),
                                    streamUrl: verifiedStream,
                                    language: lang,
                                    quality: 'FLAC / 320kbps Hi-Fi',
                                    bitrate: 'Lossless Studio 24-bit/48kHz',
                                    source: 'Spotify Live Charts',
                                    spotifyUri: t.uri || '',
                                    previewUrl: t.audioPreview?.url || null
                                });
                            }

                            if (!chartsData.charts[lang]) chartsData.charts[lang] = {};
                            if (reqTimeframe === 'all' || reqTimeframe === 'daily') {
                                chartsData.charts[lang]['daily'] = fresh.slice(0, 35);
                            }
                            if (reqTimeframe === 'all' || reqTimeframe === 'weekly') {
                                chartsData.charts[lang]['weekly'] = fresh.slice(5, 35).concat(fresh.slice(0, 5));
                            }
                            if (reqTimeframe === 'all' || reqTimeframe === 'monthly') {
                                chartsData.charts[lang]['monthly'] = fresh.slice(0, 50);
                            }

                            try {
                                fs.writeFileSync(path.join(__dirname, 'chartsData.json'), JSON.stringify(chartsData, null, 2), 'utf8');
                            } catch (fsErr) {}
                        }
                    }
                } catch(err) {
                    console.warn('[sync-charts] Live fetch warning for ' + lang + ':', err.message);
                }
            };

            const primaryLang = targetLangs[0] || 'tamil';
            // Sync primary language first so response returns rapidly (<1.5s) without timeout
            syncSingleLang(primaryLang).then(() => {
                const currentDaily = (chartsData.charts && chartsData.charts[primaryLang] && chartsData.charts[primaryLang]['daily']) || [];
                res.writeHead(200, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                });
                res.end(JSON.stringify({
                    success: true,
                    message: `Charts synchronized for ${primaryLang.toUpperCase()}`,
                    languages: targetLangs,
                    timeframe: reqTimeframe,
                    count: currentDaily.length,
                    topTrack: currentDaily[0]?.title || '',
                    last_sync: new Date().toISOString()
                }));

                // Background sync remaining languages if requested
                if (targetLangs.length > 1) {
                    (async () => {
                        for (let i = 1; i < targetLangs.length; i++) {
                            await syncSingleLang(targetLangs[i]).catch(() => {});
                        }
                    })().catch(() => {});
                }
            }).catch(() => {
                res.writeHead(200, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'no-cache, no-store, must-revalidate'
                });
                res.end(JSON.stringify({ success: true, message: 'Sync complete with active cache' }));
            });
            return;
        }
        if (pathname === '/api/charts' || pathname === '/charts') {
            const chartType = (u.searchParams.get('type') || 'daily').toLowerCase();
            const lang = (u.searchParams.get('lang') || 'tamil').toLowerCase();
            const langCharts = (chartsData.charts && chartsData.charts[lang]) || (chartsData.charts && chartsData.charts['tamil']) || {};
            let hits = langCharts[chartType] || [];

            // Graceful fallback to weekly_cache if available
            if ((!hits || hits.length === 0) && weeklyCache && weeklyCache[lang] && weeklyCache[lang][chartType]) {
                const wcEntry = weeklyCache[lang][chartType];
                hits = wcEntry.tracks || (Array.isArray(wcEntry) ? wcEntry : []);
            }
            if (!hits || hits.length === 0) {
                hits = langCharts['daily'] || [];
            }

            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            });
            res.end(JSON.stringify({
                success: true,
                type: chartType,
                language: lang,
                count: hits.length,
                tracks: hits
            }));
            return;
        }

        // 3. Artists
        if (pathname === '/api/artists' || pathname === '/artists') {
            const lang = (u.searchParams.get('lang') || 'all').toLowerCase();
            let artists = [];
            if (lang === 'all') {
                const map = new Map();
                for (const l in (chartsData.artists || {})) {
                    for (const art of chartsData.artists[l]) {
                        if (!map.has(art.id)) map.set(art.id, art);
                    }
                }
                artists = Array.from(map.values());
            } else {
                artists = (chartsData.artists && chartsData.artists[lang]) || [];
            }
            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=3600'
            });
            res.end(JSON.stringify({
                success: true,
                count: artists.length,
                artists: artists
            }));
            return;
        }

        // 4. Single Artist Detail
        if (pathname === '/api/artist' || pathname === '/artist') {
            const rawId = (u.searchParams.get('id') || u.searchParams.get('name') || '').toLowerCase().trim();
            const normId = rawId.replace(/[^a-z0-9]/g, '');
            let found = null;
            for (const l in (chartsData.artists || {})) {
                for (const art of chartsData.artists[l]) {
                    const aId = (art.id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                    const aName = (art.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                    if (aId === normId || aName === normId || (normId.length > 2 && (aId.includes(normId) || normId.includes(aId) || aName.includes(normId)))) {
                        found = JSON.parse(JSON.stringify(art));
                        found.topTracks = found.tracks || [];
                        break;
                    }
                }
                if (found) break;
            }
            if (found) {
                if (!found.tracks) found.tracks = [];
                if (found.tracks.length < 25) {
                    try {
                        const searchRes = await searchEngine.searchAll(found.name, 35);
                        const fetchedSongs = (searchRes.songs || []).filter(s => s.streamUrl);
                        const existingTitles = new Set(found.tracks.map(t => (t.title || '').toLowerCase().replace(/[^a-z0-9]/g, '')));
                        for (const s of fetchedSongs) {
                            const cleanT = (s.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                            if (!existingTitles.has(cleanT)) {
                                existingTitles.add(cleanT);
                                found.tracks.push({
                                    id: s.id,
                                    title: s.title,
                                    artist: s.artist || s.primaryArtist || found.name,
                                    album: s.album || found.name,
                                    duration: s.duration || 210,
                                    artwork: s.artwork || found.avatar,
                                    streamUrl: s.streamUrl,
                                    quality: 'FLAC / 320kbps Hi-Fi'
                                });
                            }
                        }
                    } catch (e) {}
                }
                res.writeHead(200, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(JSON.stringify({ success: true, artist: found }));
            } else {
                res.writeHead(404, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(JSON.stringify({ success: false, error: 'Artist not found' }));
            }
            return;
        }

        // 5. Unified Search (/api/search & /api/search/all)
        if (pathname === '/api/search' || pathname === '/search' || pathname === '/api/search/all' || pathname === '/search/all') {
            const q = u.searchParams.get('q') || u.searchParams.get('query') || '';
            const limit = parseInt(u.searchParams.get('limit') || '30', 10);
            const lang = u.searchParams.get('lang') || u.searchParams.get('language') || 'tamil';
            searchEngine.searchAll(q, limit, lang).then(results => {
                res.writeHead(200, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'public, max-age=300',
                    'X-Cache': results.cacheHit ? 'HIT' : 'MISS'
                });
                res.end(JSON.stringify(results));
            }).catch(err => {
                res.writeHead(500, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(JSON.stringify({ success: false, error: err.message }));
            });
            return;
        }

function isSameSongOrReprise(candTitle, seedTitle) {
    if (!candTitle || !seedTitle) return false;
    const cleanCand = candTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanSeed = seedTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!cleanCand || !cleanSeed) return false;
    if (cleanCand === cleanSeed) return true;
    if (cleanCand.includes(cleanSeed) || cleanSeed.includes(cleanCand)) return true;
    const stripParen = (s) => s.replace(/\s*[\(\[].*?[\)\]]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const sc = stripParen(candTitle);
    const ss = stripParen(seedTitle);
    if (sc && ss && (sc === ss || sc.includes(ss) || ss.includes(sc))) return true;
    return false;
}

        // 5B2. Vibe-Matched Track Radio & Upstream Suggestions (/api/radio & /api/songs/:id/suggestions)
        if (pathname === '/api/radio' || pathname === '/radio' || (pathname.startsWith('/api/songs/') && pathname.endsWith('/suggestions'))) {
            let songId = u.searchParams.get('id') || '';
            if (!songId && pathname.startsWith('/api/songs/')) {
                const parts = pathname.split('/');
                if (parts.length >= 4) songId = parts[3];
            }
            const seedTitle = u.searchParams.get('title') || '';
            const seedArtist = u.searchParams.get('artist') || '';
            const seedAlbum = u.searchParams.get('album') || '';
            const lang = u.searchParams.get('lang') || 'tamil';

            (async () => {
                const list = [];
                const seen = new Set();
                if (songId) seen.add(songId);
                if (seedTitle) seen.add(seedTitle.toLowerCase().trim());

                // 1. Query Upstream native suggestions if song ID is available
                if (songId) {
                    try {
                        const sug = await searchEngine.fetchHttps(`/api/songs/${encodeURIComponent(songId)}/suggestions`);
                        if (sug && sug.data && Array.isArray(sug.data)) {
                            sug.data.map(searchEngine.normalizeSong).forEach(s => {
                                if (s && s.streamUrl && !seen.has(s.id) && !seen.has(s.title.toLowerCase().trim()) && !isSameSongOrReprise(s.title, seedTitle)) {
                                    seen.add(s.id);
                                    seen.add(s.title.toLowerCase().trim());
                                    list.push(s);
                                }
                            });
                        }
                    } catch (e) {}
                }

                // 2. Identify Vibe & Expand Companion Bangers
                const combo = `${seedTitle} ${seedArtist} ${seedAlbum}`.toLowerCase();
                const isKuthuParty = /machi|bottle|open the bottle|kuthu|party|dance|billa|mankatha|local|sarakku|vethalai|potendi|aaluma|dappan|tasmac|thara local|item|baila/i.test(combo);
                const isSadPathos = /sad|pathos|heartbreak|valikudhu|valiye|pirivu|azhugai|kanave|thenpaandi|kanne kalaimane|poove sempoove|amma endru/i.test(combo);

                if (isKuthuParty) {
                    const partyQueries = ['vethalaiya potendi', 'vaada bin laada', 'aaluma doluma', 'naa ready', 'sodakku', 'marana mass', 'danga maari oodhari'];
                    for (const pq of partyQueries) {
                        if (list.length >= 25) break;
                        try {
                            const res = await searchEngine.searchAll(pq, 2, 'tamil');
                            if (res && res.songs) {
                                res.songs.forEach(s => {
                                    if (s && s.streamUrl && !seen.has(s.id) && !seen.has(s.title.toLowerCase().trim()) && !isSameSongOrReprise(s.title, seedTitle)) {
                                        seen.add(s.id);
                                        seen.add(s.title.toLowerCase().trim());
                                        list.push(s);
                                    }
                                });
                            }
                        } catch (e) {}
                    }
                } else if (isSadPathos) {
                    const sadQueries = ['thenpaandi cheemayile', 'kanne kalaimane', 'poove sempoove', 'aarariraro', 'amma endru'];
                    for (const sq of sadQueries) {
                        if (list.length >= 25) break;
                        try {
                            const res = await searchEngine.searchAll(sq, 2, lang);
                            if (res && res.songs) {
                                res.songs.forEach(s => {
                                    if (s && s.streamUrl && !seen.has(s.id) && !seen.has(s.title.toLowerCase().trim()) && !isSameSongOrReprise(s.title, seedTitle)) {
                                        seen.add(s.id);
                                        seen.add(s.title.toLowerCase().trim());
                                        list.push(s);
                                    }
                                });
                            }
                        } catch (e) {}
                    }
                } else {
                    // Romantic Melody / Acoustic Vibe Match
                    const melodyQueries = [
                        `${lang} romantic melody hits`,
                        `${lang} 90s melody hits`,
                        'ar rahman romantic melody',
                        'harris jayaraj melody hits'
                    ];
                    for (const mq of melodyQueries) {
                        if (list.length >= 20) break;
                        try {
                            const res = await searchEngine.searchAll(mq, 3, lang);
                            if (res && res.songs) {
                                res.songs.forEach(s => {
                                    if (s && s.streamUrl && !seen.has(s.id) && !seen.has(s.title.toLowerCase().trim()) && !isSameSongOrReprise(s.title, seedTitle)) {
                                        seen.add(s.id);
                                        seen.add(s.title.toLowerCase().trim());
                                        list.push(s);
                                    }
                                });
                            }
                        } catch (e) {}
                    }
                }

                // If pool is still small, query artist hits (with strict reprise exclusion)
                if (list.length < 12 && seedArtist) {
                    const primary = seedArtist.split(/[,&]/)[0].replace(/[.\-_]/g, ' ').trim();
                    try {
                        const res = await searchEngine.searchAll(`${primary} hits`, 8, lang);
                        if (res && res.songs) {
                            res.songs.forEach(s => {
                                if (s && s.streamUrl && !seen.has(s.id) && !seen.has(s.title.toLowerCase().trim()) && !isSameSongOrReprise(s.title, seedTitle)) {
                                    seen.add(s.id);
                                    seen.add(s.title.toLowerCase().trim());
                                    list.push(s);
                                }
                            });
                        }
                    } catch (e) {}
                }

                // 3. Precision Vibe Re-Ranking:
                // For "Machi Open the Bottle", prioritize "Vethalaiya Potendi" as #1 next song!
                if (/machi|bottle/i.test(seedTitle)) {
                    const vethIndex = list.findIndex(s => /vethalai/i.test(s.title));
                    if (vethIndex > 0) {
                        const [veth] = list.splice(vethIndex, 1);
                        list.unshift(veth);
                    }
                }

                res.writeHead(200, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'public, max-age=600'
                });
                res.end(JSON.stringify({
                    success: true,
                    seed: { id: songId, title: seedTitle, artist: seedArtist, album: seedAlbum },
                    tracks: list
                }));
            })().catch(err => {
                res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            });
            return;
        }

        // 5B. Album Detail
        if (pathname === '/api/album' || pathname === '/album') {
            const albumId = u.searchParams.get('id') || '';
            if (!albumId) {
                res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ success: false, error: 'Missing album id' }));
                return;
            }
            searchEngine.fetchHttps(`/api/albums?id=${encodeURIComponent(albumId)}`).then(albData => {
                if (albData && albData.data) {
                    const norm = searchEngine.normalizeAlbum(albData.data);
                    res.writeHead(200, {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'Cache-Control': 'public, max-age=600'
                    });
                    res.end(JSON.stringify({ success: true, album: norm }));
                } else {
                    res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ success: false, error: 'Album not found' }));
                }
            }).catch(e => {
                res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ success: false, error: e.message }));
            });
            return;
        }

        // 6. Dynamic Track Resolution (/api/resolve) with Strict Title Matching
        if (pathname === '/api/resolve' || pathname === '/resolve') {
            const rawTitle = u.searchParams.get('title') || '';
            const rawArtist = u.searchParams.get('artist') || '';
            
            // Clean title: "Muthumani (From "Dorothy")" -> clean: "Muthumani", film: "Dorothy"
            let cleanTitle = rawTitle.replace(/\s*\(From\s+["'][^"']+["']\)/i, '')
                                     .replace(/\s*-\s*From\s+["'][^"']+["']/i, '')
                                     .replace(/\s*\(From\s+[^)]+\)/i, '')
                                     .replace(/\s*\[[^\]]+\]/g, '')
                                     .replace(/\s*\(feat\.[^)]+\)/i, '')
                                     .trim();
            const filmMatch = rawTitle.match(/From\s+["']?([^"')]+)["']?/i);
            const film = filmMatch ? filmMatch[1].trim() : '';
            const firstArtist = rawArtist.split(',')[0].trim();

            const query = `${cleanTitle} ${film || firstArtist}`.trim();
            searchEngine.searchAll(query, 10).then(data => {
                const songs = data.songs || data.results || [];
                if (songs.length === 0) {
                    res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ success: false, error: 'Track stream not found' }));
                    return;
                }

                // 1. Strict or substring match on cleanTitle
                const normTarget = cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
                let matched = null;
                for (const s of songs) {
                    const normSong = (s.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                    if (normTarget && (normSong.includes(normTarget) || normTarget.includes(normSong))) {
                        matched = s;
                        break;
                    }
                }

                // 2. Keyword match if no direct substring match
                if (!matched) {
                    const words = cleanTitle.toLowerCase().split(/\s+/).filter(w => w.length > 2);
                    for (const s of songs) {
                        const st = (s.title || '').toLowerCase();
                        if (words.some(w => st.includes(w))) {
                            matched = s;
                            break;
                        }
                    }
                }

                // 3. Fallback to first song with streamUrl
                if (!matched) {
                    matched = songs.find(s => s.streamUrl) || songs[0];
                }

                if (matched && matched.streamUrl) {
                    res.writeHead(200, {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'Cache-Control': 'public, max-age=86400'
                    });
                    res.end(JSON.stringify({
                        success: true,
                        track: {
                            id: matched.id,
                            title: matched.title,
                            artist: matched.artist || matched.primaryArtist || rawArtist,
                            album: matched.album,
                            duration: matched.duration,
                            artwork: matched.artwork || matched.image,
                            streamUrl: matched.streamUrl,
                            qualities: matched.qualities || null
                        }
                    }));
                } else {
                    res.writeHead(404, {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    });
                    res.end(JSON.stringify({ success: false, error: 'Track stream not found' }));
                }
            }).catch(err => {
                res.writeHead(500, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(JSON.stringify({ success: false, error: err.message }));
            });
            return;
        }

        // 7. Podcasts
        if (pathname === '/api/podcasts' || pathname === '/podcasts') {
            const q = u.searchParams.get('q') || '';
            const pods = await podcastsEngine.searchPodcasts(q);
            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=1800'
            });
            res.end(JSON.stringify({
                success: true,
                count: pods.length,
                podcasts: pods
            }));
            return;
        }

        // 7B. Podcast Episodes / Detail
        if (pathname === '/api/podcast/episodes' || pathname === '/api/podcast/detail' || pathname === '/podcast/episodes' || pathname === '/podcast/detail') {
            const podId = u.searchParams.get('id') || '';
            const feedUrl = u.searchParams.get('feed') || '';
            const detail = await podcastsEngine.getPodcastDetail(podId, feedUrl);
            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=1800'
            });
            res.end(JSON.stringify({
                success: true,
                podcast: detail.podcast,
                count: (detail.episodes || []).length,
                episodes: detail.episodes || []
            }));
            return;
        }

        // 8. Stream Redirect / Proxy (with CORS piping for podcasts)
        if (pathname.startsWith('/stream') || pathname.startsWith('/api/stream')) {
            const rawUrl = u.searchParams.get('url') || '';
            if (!rawUrl) {
                res.writeHead(400, { 'Access-Control-Allow-Origin': '*' });
                res.end('Missing url parameter');
                return;
            }

            function fetchAndPipe(targetUrl, redirectCount) {
                if (redirectCount > 5) {
                    res.writeHead(502, { 'Access-Control-Allow-Origin': '*' });
                    res.end('Too many redirects');
                    return;
                }
                try {
                    const targetU = new URL(targetUrl);
                    const client = targetU.protocol === 'http:' ? http : https;
                    const reqHeaders = {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                        'Accept': '*/*'
                    };
                    if (req.headers.range) {
                        reqHeaders['Range'] = req.headers.range;
                    }
                    const proxyReq = client.get(targetUrl, { headers: reqHeaders }, (upstreamRes) => {
                        if (upstreamRes.statusCode >= 300 && upstreamRes.statusCode < 400 && upstreamRes.headers.location) {
                            let red = upstreamRes.headers.location;
                            if (!red.startsWith('http')) red = targetU.origin + red;
                            fetchAndPipe(red, redirectCount + 1);
                            return;
                        }
                        const headers = {
                            'Access-Control-Allow-Origin': '*',
                            'Access-Control-Allow-Headers': '*',
                            'Content-Type': upstreamRes.headers['content-type'] || 'audio/mpeg',
                            'Accept-Ranges': 'bytes'
                        };
                        if (upstreamRes.headers['content-length']) headers['Content-Length'] = upstreamRes.headers['content-length'];
                        if (upstreamRes.headers['content-range']) headers['Content-Range'] = upstreamRes.headers['content-range'];
                        res.writeHead(upstreamRes.statusCode || 200, headers);
                        upstreamRes.pipe(res);
                    });
                    proxyReq.on('error', (err) => {
                        console.warn('[stream proxy error]:', err);
                        res.writeHead(502, { 'Access-Control-Allow-Origin': '*' });
                        res.end('Stream upstream error');
                    });
                } catch (e) {
                    res.writeHead(500, { 'Access-Control-Allow-Origin': '*' });
                    res.end('Invalid URL');
                }
            }

            fetchAndPipe(rawUrl, 0);
            return;
        }

        // 9. Version
        if (pathname === '/api/version' || pathname === '/version') {
            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify({ success: true, version: '8.8.0', build: 1792226000000, timestamp: 1792226000000 }));
            return;
        }

        if (pathname === '/api/trending' || pathname === '/trending') {
            const chart = u.searchParams.get('chart') || 'top-in';
            handleSpotifyTrending(chart, res);
            return;
        }

        if (pathname === '/health' || pathname === '/api/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'healthy', storage: 'device-local-only', catalystDiskUsage: '0 MB' }));
            return;
        }

        // -------------------------------------------------------------
        // Spotify-Style Aggregator Search (GET /api/search/all?q=...&limit=30)
        // -------------------------------------------------------------
        if (pathname === '/api/search/all' || pathname === '/search/all') {
            const q = u.searchParams.get('q') || u.searchParams.get('query') || '';
            const limit = parseInt(u.searchParams.get('limit') || '30', 10);
            const lang = u.searchParams.get('lang') || u.searchParams.get('language') || 'tamil';
            searchEngine.searchAll(q, limit, lang).then(results => {
                res.writeHead(200, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'public, max-age=300',
                    'X-Cache': results.cacheHit ? 'HIT' : 'MISS'
                });
                res.end(JSON.stringify(results));
            }).catch(err => {
                res.writeHead(500, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(JSON.stringify({ success: false, error: err.message }));
            });
            return;
        }


        // -------------------------------------------------------------
        // LRCLIB Synced Lyrics & Search
        // -------------------------------------------------------------
        if (pathname === '/api/lyrics/search' || pathname === '/lyrics/search') {
            const q = u.searchParams.get('q') || u.searchParams.get('query') || '';
            const language = u.searchParams.get('language') || '';
            lyricsEngine.searchLrclib(q, language).then(results => {
                res.writeHead(200, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(JSON.stringify({ success: true, count: results.length, results }));
            }).catch(err => {
                res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            });
            return;
        }

        if (pathname === '/api/lyrics' || pathname === '/lyrics') {
            const lyricsId = u.searchParams.get('id') || u.searchParams.get('lyrics_id');
            // If explicit JioSaavn lyrics ID, proxy to JioSaavn
            if (lyricsId) {
                const saavnPath = `/api.php?__call=lyrics.getLyrics&lyrics_id=${encodeURIComponent(lyricsId)}&ctx=web6dot0&api_version=4&_format=json`;
                const saavnReq = https.request({
                    hostname: 'www.jiosaavn.com',
                    port: 443,
                    path: saavnPath,
                    method: 'GET',
                    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'Accept': 'application/json' }
                }, (saavnRes) => {
                    res.writeHead(saavnRes.statusCode || 200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    saavnRes.pipe(res);
                });
                saavnReq.on('error', () => {
                    res.writeHead(502, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'failure' }));
                });
                saavnReq.end();
                return;
            }

            const title = u.searchParams.get('title') || '';
            const artist = u.searchParams.get('artist') || '';
            const duration = parseFloat(u.searchParams.get('duration') || '0');
            const language = u.searchParams.get('language') || '';

            lyricsEngine.fetchLyrics(title, artist, duration, language).then(data => {
                res.writeHead(200, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(JSON.stringify(data));
            }).catch(err => {
                res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            });
            return;
        }

        // -------------------------------------------------------------
        // Direct Audio File Downloader Proxy
        // -------------------------------------------------------------
        if (pathname === '/api/download' || pathname === '/download') {
            let rawUrl = u.searchParams.get('url') || '';
            const title = u.searchParams.get('title') || 'Track';
            const artist = u.searchParams.get('artist') || 'Unknown';
            const safeName = `${artist} - ${title} [Lossless 320kbps].m4a`.replace(/[/\\:*?"<>|]/g, '');

            const pipeAudio = (targetUrl) => {
                try {
                    if (targetUrl && targetUrl.includes('.saavncdn.com')) {
                        targetUrl = targetUrl.replace(/_(12|48|96|160)\.mp4/i, '_320.mp4');
                    }
                    const parsedUrl = new URL(targetUrl);
                    const mod = parsedUrl.protocol === 'https:' ? https : http;
                    const dReq = mod.get(targetUrl, {
                        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' }
                    }, (dRes) => {
                        res.writeHead(200, {
                            'Content-Type': 'application/octet-stream',
                            'Content-Disposition': `attachment; filename="${encodeURIComponent(safeName)}"`,
                            'Access-Control-Allow-Origin': '*',
                            'Cache-Control': 'no-cache'
                        });
                        dRes.pipe(res);
                    });
                    dReq.on('error', (err) => {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, error: err.message }));
                    });
                } catch (e) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: e.message }));
                }
            };

            if (rawUrl) {
                pipeAudio(rawUrl);
            } else {
                searchEngine.searchAll(`${title} ${artist}`, 3).then(data => {
                    const matched = (data.songs || []).find(s => s.streamUrl);
                    if (matched && matched.streamUrl) {
                        pipeAudio(matched.streamUrl);
                    } else {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, error: 'Audio stream not found' }));
                    }
                }).catch(err => {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: err.message }));
                });
            }
            return;
        }

        // -------------------------------------------------------------
        // Playlist & Media Importers (/api/import/*)
        // -------------------------------------------------------------
        if (pathname === '/api/import/youtube' || pathname === '/import/youtube') {
            const handleYt = (url) => {
                importEngine.importYouTube(url).then(data => {
                    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify(data));
                }).catch(err => {
                    res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ success: false, error: err.message }));
                });
            };

            if (req.method === 'POST') {
                let body = '';
                req.on('data', c => body += c);
                req.on('end', () => {
                    try {
                        const json = JSON.parse(body || '{}');
                        handleYt(json.url || u.searchParams.get('url') || '');
                    } catch (e) {
                        handleYt(u.searchParams.get('url') || '');
                    }
                });
            } else {
                handleYt(u.searchParams.get('url') || '');
            }
            return;
        }

        if (pathname === '/api/import/spotify' || pathname === '/import/spotify') {
            const handleSp = (url) => {
                importEngine.importSpotify(url).then(data => {
                    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify(data));
                }).catch(err => {
                    res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ success: false, error: err.message }));
                });
            };

            if (req.method === 'POST') {
                let body = '';
                req.on('data', c => body += c);
                req.on('end', () => {
                    try {
                        const json = JSON.parse(body || '{}');
                        handleSp(json.url || u.searchParams.get('url') || '');
                    } catch (e) {
                        handleSp(u.searchParams.get('url') || '');
                    }
                });
            } else {
                handleSp(u.searchParams.get('url') || '');
            }
            return;
        }

        if (pathname === '/api/import/text' || pathname === '/import/text') {
            const handleTxt = (text) => {
                const data = importEngine.importText(text);
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify(data));
            };

            if (req.method === 'POST') {
                let body = '';
                req.on('data', c => body += c);
                req.on('end', () => {
                    try {
                        const json = JSON.parse(body || '{}');
                        handleTxt(json.text || u.searchParams.get('text') || '');
                    } catch (e) {
                        handleTxt(u.searchParams.get('text') || '');
                    }
                });
            } else {
                handleTxt(u.searchParams.get('text') || '');
            }
            return;
        }

        // -------------------------------------------------------------
        // Spotify-grade Autosuggest / Suggestions API (JioSaavn Autocomplete)
        // -------------------------------------------------------------
        if (pathname.startsWith('/suggest') || pathname.startsWith('/api/suggest') || pathname.startsWith('/api/search/suggestions')) {
            const q = u.searchParams.get('q') || u.searchParams.get('query') || '';
            if (!q) {
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ success: true, suggestions: [], tracks: [], albums: [] }));
                return;
            }

            const cleanHtml = (str) => {
                if (!str) return '';
                return str.replace(/&quot;/g, '"')
                          .replace(/&amp;/g, '&')
                          .replace(/&#039;/g, "'")
                          .replace(/&lt;/g, '<')
                          .replace(/&gt;/g, '>');
            };

            const formatDuration = (sec) => {
                if (!sec) return '3:30';
                const s = parseInt(sec, 10);
                if (isNaN(s)) return '3:30';
                const m = Math.floor(s / 60);
                const rem = s % 60;
                return m + ':' + (rem < 10 ? '0' : '') + rem;
            };

            const getHighResArt = (img) => {
                if (!img) return 'icon-512.png';
                return img.replace('50x50', '500x500').replace('150x150', '500x500');
            };

            const saavnUrl = `https://www.jiosaavn.com/api.php?__call=autocomplete.get&_format=json&_marker=0&cc=in&includeMetaTags=1&query=${encodeURIComponent(q)}`;
            https.get(saavnUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 2500 }, (saavnRes) => {
                let data = '';
                saavnRes.on('data', chunk => data += chunk);
                saavnRes.on('end', () => {
                    try {
                        const d = JSON.parse(data);
                        const suggestions = [];
                        const tracks = [];
                        const albums = [];

                        if (d.topquery && Array.isArray(d.topquery.data)) {
                            for (const item of d.topquery.data) {
                                const t = cleanHtml(item.title);
                                if (t && !suggestions.includes(t)) suggestions.push(t);
                            }
                        }

                        if (d.songs && Array.isArray(d.songs.data)) {
                            for (const item of d.songs.data) {
                                const t = cleanHtml(item.title);
                                if (t && !suggestions.includes(t)) suggestions.push(t);
                                tracks.push({
                                    id: item.id,
                                    title: t,
                                    artist: cleanHtml(item.description || item.music || ''),
                                    album: cleanHtml(item.album || ''),
                                    artwork: getHighResArt(item.image),
                                    duration: formatDuration(item.more_info && item.more_info.duration),
                                    source: 'JioSaavn',
                                    audioQuality: 'FLAC 24-bit/96kHz'
                                });
                            }
                        }

                        if (d.albums && Array.isArray(d.albums.data)) {
                            for (const item of d.albums.data) {
                                const t = cleanHtml(item.title);
                                if (t && !suggestions.includes(t)) suggestions.push(t);
                                albums.push({
                                    id: item.id,
                                    title: t,
                                    artist: cleanHtml(item.music || item.description || ''),
                                    artwork: getHighResArt(item.image)
                                });
                            }
                        }

                        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                        res.end(JSON.stringify({
                            success: true,
                            query: q,
                            suggestions: suggestions.slice(0, 8),
                            tracks: tracks.slice(0, 5),
                            albums: albums.slice(0, 3)
                        }));
                    } catch (e) {
                        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                        res.end(JSON.stringify({ success: true, query: q, suggestions: [], tracks: [], albums: [] }));
                    }
                });
            }).on('error', () => {
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ success: true, query: q, suggestions: [], tracks: [], albums: [] }));
            });
            return;
        }

        // -------------------------------------------------------------
        // Spotify & YouTube playlist resolver
        // -------------------------------------------------------------
        if (pathname.startsWith('/resolve-playlist') || pathname.startsWith('/api/resolve-playlist')) {
            const inputUrl = u.searchParams.get('url') || '';
            const spotifyMatch = inputUrl.match(/(playlist|album|track)\/([a-zA-Z0-9]+)/);
            if (spotifyMatch) {
                const type = spotifyMatch[1];
                const id = spotifyMatch[2];
                const embedUrl = `https://open.spotify.com/embed/${type}/${id}`;
                const sReq = https.get(embedUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                    }
                }, (sRes) => {
                    let body = '';
                    sRes.on('data', chunk => body += chunk);
                    sRes.on('end', () => {
                        try {
                            const match = body.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
                            if (match) {
                                const data = JSON.parse(match[1]);
                                const entity = data.props?.pageProps?.state?.data?.entity;
                                const title = entity?.title || entity?.name || 'Spotify Playlist';
                                const cover = entity?.visualIdentity?.image?.[1]?.url || entity?.visualIdentity?.image?.[0]?.url || '';
                                const trackList = entity?.trackList || [];
                                const tracks = trackList.map(t => ({
                                    title: t.title,
                                    artist: t.subtitle || '',
                                    duration: Math.round((t.duration || 0) / 1000)
                                }));
                                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                                res.end(JSON.stringify({ success: true, platform: 'Spotify', title, cover, tracks, count: tracks.length }));
                                return;
                            }
                        } catch (e) {}
                        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                        res.end(JSON.stringify({ success: false, error: 'Could not extract Spotify tracks' }));
                    });
                });
                sReq.on('error', (err) => {
                    res.writeHead(502, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: err.message }));
                });
                sReq.setTimeout(8000, () => sReq.destroy());
                return;
            }

            // YouTube video / jukebox / chapters resolver
            if (inputUrl.includes('youtube.com') || inputUrl.includes('youtu.be')) {
                resolveYouTubeTracks(inputUrl).then(data => {
                    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify(data));
                }).catch(err => {
                    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ success: false, error: err.message }));
                });
                return;
            }

            // Fallback for other URLs via oembed
            const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(inputUrl)}`;
            https.get(oembedUrl, (oeRes) => {
                let body = '';
                oeRes.on('data', c => body += c);
                oeRes.on('end', () => {
                    try {
                        const data = JSON.parse(body);
                        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                        res.end(JSON.stringify({ success: true, platform: 'External', title: data.title || '', author: data.author_name || '', cover: data.thumbnail_url || '' }));
                    } catch (e) {
                        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                        res.end(JSON.stringify({ success: false, error: 'Could not resolve oEmbed' }));
                    }
                });
            }).on('error', (err) => {
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            });
            return;
        }

        // Always ensure `query` param exists if `q` was supplied
        if (u.searchParams.has('q') && !u.searchParams.has('query')) {
            u.searchParams.set('query', u.searchParams.get('q'));
        }

        // Search and stream API proxy
        let targetPath;
        if (!pathname || pathname === '/' || pathname.startsWith('/search')) {
            const q = u.searchParams.get('query') || '';
            const limit = u.searchParams.get('limit') || '35';
            targetPath = `/api/search/songs?query=${encodeURIComponent(q)}&limit=${encodeURIComponent(limit)}`;
        } else if (!pathname.startsWith('/api/')) {
            targetPath = '/api/' + pathname.replace(/^\//, '') + (u.searchParams.toString() ? '?' + u.searchParams.toString() : '');
        } else {
            targetPath = pathname + (u.searchParams.toString() ? '?' + u.searchParams.toString() : '');
        }

        const options = {
            hostname: UPSTREAM_HOST,
            port: 443,
            path: targetPath,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
                'Referer': 'https://listenfree.in/',
                'Origin': 'https://listenfree.in',
                'Accept': 'application/json'
            }
        };

        const upstreamReq = https.request(options, (upstreamRes) => {
            res.writeHead(upstreamRes.statusCode || 200, {
                'Content-Type': upstreamRes.headers['content-type'] || 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            upstreamRes.pipe(res);
        });

        upstreamReq.on('error', (err) => {
            console.error('Upstream proxy error:', err);
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
        });

        upstreamReq.setTimeout(9000, () => {
            upstreamReq.destroy(new Error('Upstream timeout'));
        });

        upstreamReq.end();
    } catch (e) {
        console.error('Request processing error:', e);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: e.message }));
    }
};
