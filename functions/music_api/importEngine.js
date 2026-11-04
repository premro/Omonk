const https = require('https');
const http = require('http');

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

function fetchJson(url) {
    return new Promise((resolve) => {
        try {
            const parsed = new URL(url);
            const mod = parsed.protocol === 'https:' ? https : http;
            const req = mod.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)',
                    'Accept': 'application/json, text/plain, */*'
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try { resolve(JSON.parse(data)); } catch (e) { resolve(null); }
                });
            });
            req.on('error', () => resolve(null));
            req.setTimeout(6000, () => { req.destroy(); resolve(null); });
        } catch (e) {
            resolve(null);
        }
    });
}

function fetchText(url, maxRedirects = 5) {
    return new Promise((resolve) => {
        if (!url || maxRedirects < 0) return resolve('');
        try {
            const parsed = new URL(url);
            const mod = parsed.protocol === 'https:' ? https : http;
            const req = mod.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9'
                }
            }, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    let nextUrl = res.headers.location;
                    if (!nextUrl.startsWith('http')) {
                        nextUrl = new URL(nextUrl, url).href;
                    }
                    return resolve(fetchText(nextUrl, maxRedirects - 1));
                }
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve(data));
            });
            req.on('error', () => resolve(''));
            req.setTimeout(9000, () => { req.destroy(); resolve(''); });
        } catch (e) {
            resolve('');
        }
    });
}

function cleanTrackName(title) {
    if (!title) return '';
    return title
        .replace(/#\S+/g, '')
        .replace(/^\s*\d+[\.\-\)]\s*/, '')
        .replace(/\b(Official Video|Official Audio|Music Video|Lyrical Video|Lyrical|Lyric Video|Video Song|Audio Song|4K|8K|60FPS|Full Song|HD|Remastered|Jukebox|Full Album|Audio Jukebox|status|shorts)\b/gi, '')
        .replace(/\|\s*.*$/, '')
        .replace(/[-–—: ]+$/, '')
        .trim();
}

async function importYouTube(inputUrl) {
    if (!inputUrl) return { success: false, error: 'URL is required' };

    // 1. YouTube Playlist check
    const pMatch = inputUrl.match(/list=([a-zA-Z0-9_-]+)/);
    const vMatch = inputUrl.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([a-zA-Z0-9_-]{11})/);

    let playlistId = pMatch ? pMatch[1] : null;
    let videoId = vMatch ? vMatch[1] : null;

    if (!playlistId && !videoId) {
        return { success: false, error: 'Invalid or unsupported YouTube URL' };
    }

    const targetUrl = playlistId && !videoId
        ? `https://www.youtube.com/playlist?list=${playlistId}`
        : `https://www.youtube.com/watch?v=${videoId}`;

    const body = await fetchText(targetUrl);
    if (!body) {
        return { success: false, error: 'Could not fetch YouTube page' };
    }

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

    // Detect primary artist from title
    let primaryArtist = 'Various Artists';
    const artistRegex = /\b(ilayaraja|ilayaraaja|ilaiyaraaja|a\.?\s*r\.?\s*rahman|anirudh|anirudh\s*ravichander|harris\s*jayaraj|yuvan\s*shankar\s*raja|yuvan|spb|s\.\s*p\.\s*balasubrahmanyam|chitra|k\.\s*s\.\s*chithra|janaki|s\.\s*janaki|yesudas|k\.\s*j\.\s*yesudas|vidyasagar|devi\s*sri\s*prasad|dsp|thaman|thaman\s*s|arijit\s*singh|arijit|shreya\s*ghoshal|sid\s*sriram|santhosh\s*narayanan|g\.?\s*v\.?\s*prakash|hiphop\s*tamizha|d\.?\s*imman|taylor\s*swift|billie\s*eilish|bad\s*bunny|the\s*weeknd)\b/i;
    const am = title.match(artistRegex);
    if (am) {
        primaryArtist = am[1].trim();
        // Capitalize properly if needed
        if (/ilaya/i.test(primaryArtist)) primaryArtist = 'Ilayaraaja';
        else if (/rahman/i.test(primaryArtist)) primaryArtist = 'A.R. Rahman';
        else if (/anirudh/i.test(primaryArtist)) primaryArtist = 'Anirudh Ravichander';
        else if (/harris/i.test(primaryArtist)) primaryArtist = 'Harris Jayaraj';
        else if (/yuvan/i.test(primaryArtist)) primaryArtist = 'Yuvan Shankar Raja';
    }

    // Strategy 1: Playlist Items
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
                    title: cleanTrackName(pvTitle),
                    artist: pvArtist,
                    duration: pvDur,
                    artwork: pvThumb
                });
            }
        }
    }

    // Strategy 2: Official YouTube Structured Chapters (macroMarkersListItemRenderer / chapterRenderer)
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

                let trackTitle = cleanTrackName(cTitle);
                let trackArtist = primaryArtist;

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

    // Strategy 3: Description Timestamp Parsing
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
                    let cName = cleanTrackName(name);
                    let trackArtist = primaryArtist;
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

    // Strategy 4: Video Licensing Cards
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
                    title: cleanTrackName(tTitle),
                    artist: tArtist,
                    duration: 210,
                    artwork: cover
                });
            }
        }
    }

    // Strategy 5: Single track fallback
    if (tracks.length === 0 && title) {
        const clean = cleanTrackName(title);
        const parts = clean.split(/[-–—|:]/).map(s => s.trim()).filter(Boolean);
        let trackArtist = primaryArtist;
        let trackTitle = clean || title;
        if (parts.length >= 2) {
            trackArtist = parts[0];
            trackTitle = parts.slice(1).join(' - ');
        }
        tracks.push({
            title: trackTitle,
            artist: trackArtist,
            duration: 210,
            artwork: cover
        });
    }

    return {
        success: true,
        platform: 'YouTube',
        title: title || 'YouTube Playlist',
        artwork: tracks[0]?.artwork || cover,
        count: tracks.length,
        tracks
    };
}

async function importSpotify(inputUrl) {
    if (!inputUrl) return { success: false, error: 'URL is required' };

    let url = inputUrl.trim();
    if (url.startsWith('spotify:')) {
        const parts = url.split(':');
        if (parts.length >= 3) {
            url = `https://open.spotify.com/${parts[1]}/${parts[2]}`;
        }
    }

    let match = url.match(/(playlist|album|track)\/([a-zA-Z0-9_-]+)/);
    if (!match && (url.includes('spotify.link') || url.includes('spotify.app.link'))) {
        // Expand mobile shortlink
        const redirectHtml = await fetchText(url, 3);
        const mRedirect = redirectHtml.match(/(playlist|album|track)\/([a-zA-Z0-9_-]+)/);
        if (mRedirect) match = mRedirect;
    }

    if (!match) {
        return { success: false, error: 'Invalid Spotify link. Please paste a valid playlist, album, or track URL.' };
    }

    const type = match[1];
    const id = match[2];
    const embedUrl = `https://open.spotify.com/embed/${type}/${id}`;
    const body = await fetchText(embedUrl, 3);

    if (!body) {
        return { success: false, error: 'Could not connect to Spotify. Please verify the URL.' };
    }

    try {
        const jsonMatch = body.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
        if (jsonMatch) {
            const data = JSON.parse(jsonMatch[1]);
            const pageProps = data?.props?.pageProps;
            if (pageProps?.status === 404) {
                return { success: false, error: 'Spotify playlist not found (404). Please ensure the playlist is public and active.' };
            }

            const entity = pageProps?.state?.data?.entity;
            const title = entity?.title || entity?.name || 'Spotify Playlist';
            const cover = entity?.visualIdentity?.image?.[1]?.url || entity?.visualIdentity?.image?.[0]?.url || '';
            const trackList = entity?.trackList || [];

            // If it is a single track
            if (type === 'track') {
                const singleTrack = {
                    title: cleanTrackName(entity?.title || title) || title,
                    artist: entity?.subtitle || 'Spotify Artist',
                    duration: Math.round((entity?.duration || 210000) / 1000),
                    artwork: cover
                };
                return {
                    success: true,
                    platform: 'Spotify',
                    title: singleTrack.title,
                    artwork: cover,
                    count: 1,
                    tracks: [singleTrack]
                };
            }

            if (!trackList || trackList.length === 0) {
                return { success: false, error: 'No playable tracks found in this playlist. Please ensure it is a public Spotify playlist.' };
            }

            const tracks = trackList.map(t => ({
                title: cleanTrackName(t.title) || t.title,
                artist: t.subtitle || '',
                duration: Math.round((t.duration || 210000) / 1000),
                artwork: cover
            }));

            return {
                success: true,
                platform: 'Spotify',
                title,
                artwork: cover,
                count: tracks.length,
                tracks
            };
        }
    } catch (e) {
        return { success: false, error: `Spotify extraction failed: ${e.message}` };
    }

    return { success: false, error: 'Could not parse Spotify playlist data. Ensure the playlist is public.' };
}

function importText(text) {
    if (!text) return { success: false, error: 'Text content is empty' };

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const tracks = [];

    lines.forEach((line, idx) => {
        const parts = line.split(/[-–—|]/).map(s => s.trim()).filter(Boolean);
        let artist = '';
        let title = line;
        if (parts.length >= 2) {
            artist = parts[0];
            title = parts.slice(1).join(' - ');
        }
        tracks.push({
            id: `txt_tr_${Date.now()}_${idx}`,
            title: cleanTrackName(title) || title,
            artist: artist || 'Unknown Artist',
            duration: 210,
            quality: 'FLAC / 320kbps Hi-Fi'
        });
    });

    return {
        success: true,
        platform: 'Text',
        title: 'Imported Playlist',
        count: tracks.length,
        tracks
    };
}

module.exports = {
    importYouTube,
    importSpotify,
    importText
};
