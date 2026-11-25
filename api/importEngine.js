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

function fetchInnertube(endpoint, payload) {
    return new Promise((resolve) => {
        try {
            const data = JSON.stringify(payload);
            const req = https.request(`https://www.youtube.com/youtubei/v1/${endpoint}?prettyPrint=false`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Content-Length': Buffer.byteLength(data)
                }
            }, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    try { resolve(JSON.parse(body)); } catch (e) { resolve(null); }
                });
            });
            req.on('error', () => resolve(null));
            req.setTimeout(8000, () => { req.destroy(); resolve(null); });
            req.write(data);
            req.end();
        } catch (e) {
            resolve(null);
        }
    });
}

function cleanTrackName(title) {
    if (!title) return '';
    return title
        .replace(/#\S+/g, '')
        .replace(/^\s*\d+[\.\-\)]\s*/, '')
        .replace(/[\(\[\{][^\)\]\}]*(?:remaster|official|audio|video|lyrics?|version|4k|8k|hd|uhd|full)[^\)\]\}]*[\)\]\}]/gi, '')
        .replace(/\s*[-–—:]\s*(?:(?:hd|4k|8k|60fps|uhd|full\s*hd)\s+)?(?:video\s*song|video|audio\s*song|audio|lyrical\s*video|lyrical\s*song|lyrical|lyrics|music\s*video|official\s*video|official\s*audio|official|jukebox|audio\s*jukebox|remastered|status|shorts)\b.*$/gi, '')
        .replace(/\s+(?:(?:hd|4k|8k|60fps|uhd|full\s*hd)\s+)?(?:video\s*song|video|audio\s*song|audio|lyrical\s*video|lyrical\s*song|lyrical|lyrics|music\s*video|official\s*video|official\s*audio|official|jukebox|full\s*song)\s*$/gi, '')
        .replace(/ (Official Video|Official Audio|Music Video|Lyrical Video|Lyrical|Lyric Video|Video Song|Audio Song|4K|8K|60FPS|Full Song|HD|Remastered|Jukebox|Full Album|Audio Jukebox|status|shorts) /gi, '')
        .replace(/\|\s*.*$/, '')
        .replace(/[\(\[\{]\s*[\)\]\}]/g, '')
        .replace(/[-–—: ]+$/, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function parseYouTubeTitle(rawTitle, authorName = '') {
    if (!rawTitle) return { title: 'Unknown Title', artist: authorName || 'Various Artists', album: '' };

    let clean = rawTitle
        .replace(/#\S+/g, '')
        .replace(/[\(\[\{][^\)\]\}]*(?:remaster|official|audio|video|lyrics?|version|4k|8k|hd|uhd|full)[^\)\]\}]*[\)\]\}]/gi, ' ')
        .trim();

    const rawSegments = clean.split(/\s*[|•/]\s*/).map(s => s.trim()).filter(Boolean);
    const junkRegex = /^(?:(?:hd|4k|8k|60fps|uhd|full\s*hd)\s+)?(?:video\s*song|video|audio\s*song|audio|lyrical\s*video|lyrical\s*song|lyrical|lyrics|music\s*video|official\s*video|official\s*audio|official|jukebox|audio\s*jukebox|remastered|status|shorts)$/i;

    const usefulSegments = [];
    for (const seg of rawSegments) {
        let s = seg.replace(/[-–—]\s*(?:(?:hd|4k|8k|60fps|uhd|full\s*hd)\s+)?(?:video\s*song|video|audio\s*song|audio|lyrical\s*video|lyrical|lyrics|official\s*video).*$/i, '').trim();
        s = s.replace(/^(?:(?:hd|4k|8k|60fps|uhd|full\s*hd)\s+)?(?:video\s*song|video|audio\s*song|audio|lyrical\s*video|lyrical|lyrics|official\s*video).*?[-–—]\s*/i, '').trim();
        if (!s || junkRegex.test(s)) continue;
        if (/^[\u0900-\u0D7F\s\p{P}]+$/u.test(s)) continue;
        usefulSegments.push(s);
    }

    let title = '';
    let artist = '';
    let album = '';

    const knownArtists = [
        'anirudh', 'anirudh ravichander', 'a.r. rahman', 'ar rahman', 'ilayaraja', 'ilayaraaja', 'ilaiyaraaja',
        'yuvan', 'yuvan shankar raja', 'harris jayaraj', 'pradeep kumar', 'sid sriram', 'spb', 's.p. balasubrahmanyam',
        'dhanush', 'the weeknd', 'taylor swift', 'dua lipa', 'justin bieber', 'ed sheeran', 'billie eilish', 'bad bunny',
        's.a. rajkumar', 'sa rajkumar', 'deva', 'vidyasagar', 'd. imman', 'imman', 'immann', 'santhosh narayanan',
        'sushin shyam', 'sushin', 'devi sri prasad', 'dsp', 'thaman', 'thaman s', 'g.v. prakash', 'gv prakash',
        'hiphop tamizha', 'shreya ghoshal', 'arijit singh', 'arijit', 'karan aujla', 'diljit dosanjh', 'diljit',
        'badshah', 'pritam', 'neha kakkar', 'atif aslam', 's. janaki', 'k.s. chithra', 'chithra', 'k.j. yesudas',
        'yesudas', 'hariharan', 'shankar mahadevan', 'vijay antony', 'sai abhyankkar', 'sam c.s.', 'sam cs',
        'stephen sanchez', 'sabrina carpenter', 'bruno mars', 'post malone', 'drake', 'coldplay', 'madcon'
    ];

    const junkChannelLabels = [
        'sun tv', 'sun pictures', 'sony music south', 'sony music', 'think music', 'think music india',
        't-series', 'tseries', 'zee music company', 'zee music south', 'zee music', 'saregama', 'saregama tamil',
        'lahari music', 'aditya music', 'speed audio', 'muzik247', 'tips official', 'tips', 'yrf', 'eros now',
        'rajshri', 'speed records', 'white hill music', 'geetha arts', 'lyca productions', 'red giant movies',
        'svf', 'sathya movies', 'ag entertainment', 'prk audio', 'anand audio', 'vevo'
    ];

    const isJunkLabel = (str) => {
        if (!str) return true;
        const low = str.toLowerCase().trim();
        if (junkChannelLabels.some(jl => low === jl || low.startsWith(jl))) return true;
        if (/\b(vevo|records|record label|official channel|topic|channel|studios|productions|entertainment|music company)\b/i.test(low)) return true;
        if (/\b(directed by|director|producer|starring|choreography|cinematography|dop)\b/i.test(low)) return true;
        return false;
    };

    if (usefulSegments.length === 0) {
        title = rawTitle.replace(/[-–—|].*$/, '').trim();
        artist = !isJunkLabel(authorName) ? authorName : 'Various Artists';
    } else if (usefulSegments.length === 1) {
        const seg = usefulSegments[0];
        const dashParts = seg.split(/\s*[-–—]\s*/);
        if (dashParts.length >= 2) {
            const p0 = dashParts[0].trim();
            const p1 = dashParts.slice(1).join(' - ').trim();
            const auth = (authorName || '').toLowerCase().replace(/\s*(?:official|music|vevo|records|channel|- topic).*/g, '').trim();
            if (knownArtists.some(k => p1.toLowerCase().includes(k)) || /\b(feat|ft|singers?|vocals?|composer)\b/i.test(p1) || (auth && p1.toLowerCase().includes(auth))) {
                artist = p1;
                title = p0;
            } else if (knownArtists.some(k => p0.toLowerCase().includes(k)) || (auth && p0.toLowerCase().includes(auth))) {
                artist = p0;
                title = p1;
            } else {
                title = p0;
                artist = p1;
            }
        } else {
            title = seg;
            artist = !isJunkLabel(authorName) ? authorName : 'Various Artists';
        }
    } else {
        title = usefulSegments[0];
        const dashInSeg0 = title.split(/\s*[-–—]\s*/);
        if (dashInSeg0.length >= 2) {
            if (knownArtists.some(k => dashInSeg0[0].toLowerCase().includes(k))) {
                artist = dashInSeg0[0].trim();
                title = dashInSeg0.slice(1).join(' - ').trim();
            } else if (/video|audio|lyrical|song|full/i.test(dashInSeg0[1])) {
                title = dashInSeg0[0].trim();
            }
        }

        const otherSegments = usefulSegments.slice(1);
        for (const seg of otherSegments) {
            if (knownArtists.some(k => seg.toLowerCase().includes(k)) || /\b(singers?|vocals?|composer|music by)\b/i.test(seg)) {
                if (!artist) artist = seg;
            } else if (!album && !isJunkLabel(seg) && !/\b(directed|starring|dop|producer)\b/i.test(seg)) {
                album = seg;
            }
        }

        if (!artist) {
            for (const seg of otherSegments) {
                if (seg !== album && !isJunkLabel(seg)) {
                    artist = seg;
                    break;
                }
            }
        }

        if (!artist) {
            artist = !isJunkLabel(authorName) ? authorName : 'Various Artists';
        }
        if (!album && otherSegments.length > 0 && !isJunkLabel(otherSegments[0])) {
            album = otherSegments[0];
        }
    }

    title = cleanTrackName(title) || title;
    return { title, artist, album };
}

async function importYouTube(inputUrl) {
    if (!inputUrl) return { success: false, error: 'URL is required' };

    const pMatch = inputUrl.match(/list=([a-zA-Z0-9_-]+)/);
    const vMatch = inputUrl.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([a-zA-Z0-9_-]{11})/);

    let playlistId = pMatch ? pMatch[1] : null;
    let videoId = vMatch ? vMatch[1] : null;

    if (playlistId && (playlistId.startsWith('RD') || playlistId.startsWith('LL') || playlistId.startsWith('WL') || playlistId.startsWith('LM'))) {
        playlistId = null;
    }

    if (!playlistId && !videoId) {
        return { success: false, error: 'Invalid or unsupported YouTube URL' };
    }

    const cover = videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '';
    let title = '';
    let primaryArtist = 'Various Artists';
    const tracks = [];
    let ytData = null;
    let descText = '';

    // 1. Innertube direct query (Never blocked by Google 302 captcha)
    if (videoId) {
        try {
            const pData = await fetchInnertube('player', {
                context: { client: { clientName: 'WEB', clientVersion: '2.20240101.00.00' } },
                videoId
            });
            if (pData?.videoDetails) {
                ytData = pData;
                title = pData.videoDetails.title || '';
                primaryArtist = pData.videoDetails.author || primaryArtist;
                descText = pData.videoDetails.shortDescription || '';
            }
        } catch (e) {}

        if (!descText) {
            try {
                const nextData = await fetchInnertube('next', {
                    context: { client: { clientName: 'WEB', clientVersion: '2.20240101.00.00' } },
                    videoId
                });
                if (nextData) {
                    if (!ytData) ytData = nextData;
                    function findNextDesc(obj) {
                        if (!obj || typeof obj !== 'object') return '';
                        if (obj.attributedDescription?.content) return obj.attributedDescription.content;
                        if (typeof obj.description?.simpleText === 'string') return obj.description.simpleText;
                        for (const k of Object.keys(obj)) {
                            const r = findNextDesc(obj[k]);
                            if (r) return r;
                        }
                        return '';
                    }
                    const nDesc = findNextDesc(nextData);
                    if (nDesc) descText = nDesc;
                }
            } catch (e) {}
        }
    }

    if (playlistId) {
        try {
            const browseData = await fetchInnertube('browse', {
                context: { client: { clientName: 'WEB', clientVersion: '2.20240101.00.00' } },
                browseId: 'VL' + playlistId
            });
            if (browseData) {
                ytData = browseData;
                title = browseData.header?.playlistHeaderRenderer?.title?.simpleText ||
                        browseData.header?.playlistHeaderRenderer?.title?.runs?.[0]?.text ||
                        browseData.metadata?.playlistMetadataRenderer?.title ||
                        title || 'YouTube Playlist';
            }
        } catch (e) {}
    }

    // 2. Fallback to HTML/oEmbed if Innertube did not populate title
    let oembed = null;
    if (videoId && (!title || !descText)) {
        try {
            oembed = await fetchJson(`https://www.youtube.com/oembed?url=${encodeURIComponent('https://www.youtube.com/watch?v=' + videoId)}&format=json`);
            if (oembed?.title && !title) title = oembed.title;
            if (oembed?.author_name && primaryArtist === 'Various Artists') primaryArtist = oembed.author_name;
        } catch (e) {}
    }

    if (!title && !ytData) {
        const targetUrl = playlistId && !videoId
            ? `https://www.youtube.com/playlist?list=${playlistId}`
            : `https://www.youtube.com/watch?v=${videoId}`;
        const body = await fetchText(targetUrl);
        if (body) {
            const tm = body.match(/<title>(.*?)(?: - YouTube)?<\/title>/i);
            if (tm) title = tm[1].replace(/ - YouTube/i, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim();
            const dm = body.match(/ytInitialData\s*=\s*({.+?});<\/script>/);
            if (dm) {
                try { ytData = JSON.parse(dm[1]); } catch (e) {}
            }
        }
    }

    if (!title) title = 'YouTube Playlist';

    const artistRegex = /\b(ilayaraja|ilayaraaja|ilaiyaraaja|a\.?\s*r\.?\s*rahman|anirudh|anirudh\s*ravichander|harris\s*jayaraj|yuvan\s*shankar\s*raja|yuvan|spb|s\.\s*p\.\s*balasubrahmanyam|chitra|k\.\s*s\.\s*chithra|janaki|s\.\s*janaki|yesudas|k\.\s*j\.\s*yesudas|vidyasagar|devi\s*sri\s*prasad|dsp|thaman|thaman\s*s|arijit\s*singh|arijit|shreya\s*ghoshal|sid\s*sriram|santhosh\s*narayanan|g\.?\s*v\.?\s*prakash|hiphop\s*tamizha|d\.?\s*imman|taylor\s*swift|billie\s*eilish|bad\s*bunny|the\s*weeknd)\b/i;
    const am = title.match(artistRegex);
    if (am) {
        primaryArtist = am[1].trim();
        if (/ilaya/i.test(primaryArtist)) primaryArtist = 'Ilayaraaja';
        else if (/rahman/i.test(primaryArtist)) primaryArtist = 'A.R. Rahman';
        else if (/anirudh/i.test(primaryArtist)) primaryArtist = 'Anirudh Ravichander';
        else if (/harris/i.test(primaryArtist)) primaryArtist = 'Harris Jayaraj';
        else if (/yuvan/i.test(primaryArtist)) primaryArtist = 'Yuvan Shankar Raja';
    }

    // Strategy 1: Playlist Items (Supports both playlistVideoRenderer and lockupViewModel)
    if (playlistId && ytData) {
        function findPlaylistVideos(obj) {
            let list = [];
            if (obj && typeof obj === 'object') {
                if (obj.playlistVideoRenderer) list.push(obj.playlistVideoRenderer);
                if (obj.lockupViewModel) list.push({ lockup: obj.lockupViewModel });
                for (const k of Object.keys(obj)) {
                    list = list.concat(findPlaylistVideos(obj[k]));
                }
            }
            return list;
        }
        const plVideos = findPlaylistVideos(ytData);
        for (const item of plVideos) {
            if (item.lockup) {
                const lvm = item.lockup;
                const meta = lvm.metadata?.lockupMetadataViewModel;
                const pvTitle = meta?.title?.content;
                const rows = meta?.metadata?.contentMetadataViewModel?.metadataRows || [];
                const pvArtist = rows[0]?.metadataParts?.[0]?.text?.content || primaryArtist || 'YouTube';
                const sources = lvm.contentImage?.thumbnailViewModel?.image?.sources || [];
                const pvThumb = sources.length > 0 ? sources[sources.length - 1].url : cover;
                let pvId = lvm.contentId || '';
                if (!pvId && pvThumb) {
                    const idM = pvThumb.match(/\/vi\/([a-zA-Z0-9_-]{11})\//);
                    if (idM) pvId = idM[1];
                }
                if (pvTitle && !pvTitle.includes('[Private video]') && !pvTitle.includes('[Deleted video]')) {
                    const parsedSeg = parseYouTubeTitle(pvTitle, pvArtist);
                    tracks.push({
                        id: pvId ? `yt_${pvId}` : undefined,
                        youtubeId: pvId,
                        title: parsedSeg.title || cleanTrackName(pvTitle),
                        artist: parsedSeg.artist || pvArtist,
                        album: parsedSeg.album || '',
                        duration: 210,
                        artwork: pvThumb,
                        quality: 'FLAC / 320kbps Hi-Fi'
                    });
                }
            } else {
                const pv = item;
                const pvTitle = pv.title?.simpleText || pv.title?.runs?.[0]?.text;
                const pvArtist = pv.shortBylineText?.runs?.[0]?.text || primaryArtist || 'YouTube';
                const pvDur = parseInt(pv.lengthSeconds || '210', 10);
                const pvThumb = pv.thumbnail?.thumbnails?.[pv.thumbnail.thumbnails.length - 1]?.url || cover;
                const pvId = pv.videoId || '';
                if (pvTitle && !pvTitle.includes('[Private video]') && !pvTitle.includes('[Deleted video]')) {
                    const parsedSeg = parseYouTubeTitle(pvTitle, pvArtist);
                    tracks.push({
                        id: pvId ? `yt_${pvId}` : undefined,
                        youtubeId: pvId,
                        title: parsedSeg.title || cleanTrackName(pvTitle),
                        artist: parsedSeg.artist || pvArtist,
                        album: parsedSeg.album || '',
                        duration: pvDur,
                        artwork: pvThumb,
                        quality: 'FLAC / 320kbps Hi-Fi'
                    });
                }
            }
        }
    }

    // Strategy 2: Structured Chapters in ytData
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

                const isCuratorOrChannel = !primaryArtist || /editz|channel|records|music|vevo|status|mix|playlist|t-series|sony|yrf|official|audio|video|lyrics|studio|creations|ent|production|media/i.test(primaryArtist) || /[\uD800-\uDFFF]/.test(primaryArtist);
                const parsed = parseYouTubeTitle(cTitle, primaryArtist);
                tracks.push({
                    title: parsed.title || cleanTrackName(cTitle),
                    artist: (parsed.artist && parsed.artist !== primaryArtist) ? parsed.artist : (isCuratorOrChannel ? '' : primaryArtist),
                    album: parsed.album || '',
                    duration: dur,
                    artwork: art,
                    startTime: sec,
                    quality: 'FLAC / 320kbps Hi-Fi'
                });
            }
        }
    }

    // Strategy 3: Description Timestamp Parsing (e.g. Mixtape Compilations like 1xXW9U_O7Rs)
    if (tracks.length === 0) {
        if (!descText && ytData) {
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
            descText = findDesc(ytData);
        }

        if (descText) {
            const unescapedDesc = descText.replace(/\\n/g, '\n');
            const lines = unescapedDesc.split(/[\r\n]+/);
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
                    const isCuratorOrChannel = !primaryArtist || /editz|channel|records|music|vevo|status|mix|playlist|t-series|sony|yrf|official|audio|video|lyrics|studio|creations|ent|production|media/i.test(primaryArtist) || /[\uD800-\uDFFF]/.test(primaryArtist);
                    const parsed = parseYouTubeTitle(name, primaryArtist);
                    const cleanName = parsed.title || cleanTrackName(name);
                    if (cleanName.length >= 2) {
                        parsedTs.push({
                            title: cleanName,
                            artist: (parsed.artist && parsed.artist !== primaryArtist) ? parsed.artist : (isCuratorOrChannel ? '' : primaryArtist),
                            album: parsed.album || '',
                            startTime: parseTimestampToSeconds(timeStr),
                            artwork: cover,
                            quality: 'FLAC / 320kbps Hi-Fi'
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

    // Strategy 4: Video Licensing Cards (only for actual songs, ignore people/biography cards)
    if (tracks.length === 0 && ytData && playlistId) {
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
                const parsed = parseYouTubeTitle(tTitle, tArtist);
                tracks.push({
                    title: parsed.title || cleanTrackName(tTitle),
                    artist: parsed.artist || tArtist,
                    album: parsed.album || '',
                    duration: 210,
                    artwork: cover,
                    quality: 'FLAC / 320kbps Hi-Fi'
                });
            }
        }
    }

    // Strategy 5: Single track fallback (Video without chapters/timestamps)
    if (tracks.length === 0) {
        const rawTitleToParse = oembed?.title || title;
        const authorToParse = oembed?.author_name || primaryArtist;
        const parsed = parseYouTubeTitle(rawTitleToParse, authorToParse);
        const singleTrack = {
            id: videoId ? `yt_${videoId}` : undefined,
            youtubeId: videoId,
            title: parsed.title || cleanTrackName(rawTitleToParse),
            artist: parsed.artist || authorToParse,
            album: parsed.album || '',
            duration: 210,
            artwork: oembed?.thumbnail_url || cover,
            quality: 'FLAC / 320kbps Hi-Fi'
        };
        tracks.push(singleTrack);
        title = singleTrack.title;
    }

    // Pre-resolve 320kbps stream URL for single track import
    if (tracks.length === 1 && !tracks[0].streamUrl) {
        try {
            const searchEngine = require('./searchEngine');
            const queries = [];
            if (tracks[0].album) queries.push(tracks[0].title + ' ' + tracks[0].album);
            if (tracks[0].artist && tracks[0].artist !== 'Various Artists') queries.push(tracks[0].title + ' ' + tracks[0].artist);
            queries.push(tracks[0].title);
            for (const q of queries) {
                const sRes = await searchEngine.searchAll(q, 5, '');
                const cand = (sRes.songs || []).find(s => s && s.streamUrl);
                if (cand && cand.streamUrl) {
                    tracks[0].streamUrl = cand.streamUrl;
                    if (cand.artwork) tracks[0].artwork = cand.artwork;
                    if (cand.duration) tracks[0].duration = cand.duration;
                    if (cand.album) tracks[0].album = cand.album;
                    break;
                }
            }
        } catch (e) {}
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

    let match = url.match(/(?:intl-[a-z0-9_-]+\b\/)?(playlist|album|track)\b\/([a-zA-Z0-9_-]+)/i);
    if (!match) {
        match = url.match(/(playlist|album|track)\b\/([a-zA-Z0-9_-]+)/i);
    }
    if (!match && (url.includes('spotify.link') || url.includes('spotify.app.link'))) {
        const redirectHtml = await fetchText(url, 3);
        const mRedirect = redirectHtml.match(/(?:intl-[a-z0-9_-]+\b\/)?(playlist|album|track)\b\/([a-zA-Z0-9_-]+)/i) || redirectHtml.match(/(playlist|album|track)\b\/([a-zA-Z0-9_-]+)/i);
        if (mRedirect) match = mRedirect;
    }

    if (!match) {
        return { success: false, error: 'Invalid Spotify link. Please paste a valid playlist, album, or track URL.' };
    }

    const type = match[1].toLowerCase();
    const id = match[2];
    const embedUrl = `https://open.spotify.com/embed/${type}/${id}`;
    const body = await fetchText(embedUrl, 3);

    // Immediate fallback to Spotify oEmbed if embed page fetch returned empty
    if (!body && type === 'track') {
        try {
            const oembed = await fetchJson(`https://open.spotify.com/oembed?url=${encodeURIComponent('https://open.spotify.com/track/' + id)}`);
            if (oembed && oembed.title) {
                const singleTrack = {
                    id: `sp_${id}`,
                    spotifyId: id,
                    title: cleanTrackName(oembed.title) || oembed.title,
                    artist: 'Spotify Artist',
                    duration: 210,
                    artwork: oembed.thumbnail_url || '',
                    quality: 'FLAC / 320kbps Hi-Fi'
                };
                return {
                    success: true,
                    platform: 'Spotify',
                    title: singleTrack.title,
                    artwork: singleTrack.artwork,
                    count: 1,
                    tracks: [singleTrack]
                };
            }
        } catch (e) {}
    }

    if (!body) {
        return { success: false, error: 'Could not connect to Spotify. Please verify the URL.' };
    }

    try {
        const jsonMatch = body.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
        if (jsonMatch) {
            const data = JSON.parse(jsonMatch[1]);
            const pageProps = data?.props?.pageProps;
            if (pageProps?.status === 404) {
                return { success: false, error: 'Spotify item not found (404). Please ensure the playlist or track is public and active.' };
            }

            const entity = pageProps?.state?.data?.entity;
            const title = entity?.title || entity?.name || 'Spotify Playlist';
            const cover = entity?.visualIdentity?.image?.[1]?.url || entity?.visualIdentity?.image?.[0]?.url || '';
            const trackList = entity?.trackList || [];

            // If it is a single track
            if (type === 'track') {
                const artistsList = (entity?.artists || []).map(a => a.name).filter(Boolean);
                const artistName = artistsList.join(', ') || entity?.subtitle || 'Spotify Artist';
                const albumName = entity?.album?.name || (type === 'album' ? title : '');
                const singleTrack = {
                    id: `sp_${id}`,
                    spotifyId: id,
                    title: cleanTrackName(entity?.title || title) || title,
                    artist: artistName,
                    album: albumName,
                    duration: Math.round((entity?.duration || 210000) / 1000),
                    artwork: cover,
                    quality: 'FLAC / 320kbps Hi-Fi'
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

            const tracks = trackList.map((t, idx) => {
                const artistsList = (t.artists || []).map(a => a.name).filter(Boolean);
                const artistName = artistsList.join(', ') || t.subtitle || '';
                const albumName = (t.album?.name || t.album || (type === 'album' ? title : '') || '');
                return {
                    id: `sp_${t.id || id + '_' + idx}`,
                    spotifyId: t.id || id,
                    title: cleanTrackName(t.title) || t.title,
                    artist: artistName,
                    album: albumName,
                    duration: Math.round((t.duration || 210000) / 1000),
                    artwork: cover,
                    quality: 'FLAC / 320kbps Hi-Fi'
                };
            });

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
        if (type === 'track') {
            try {
                const oembed = await fetchJson(`https://open.spotify.com/oembed?url=${encodeURIComponent('https://open.spotify.com/track/' + id)}`);
                if (oembed && oembed.title) {
                    const singleTrack = {
                        id: `sp_${id}`,
                        spotifyId: id,
                        title: cleanTrackName(oembed.title) || oembed.title,
                        artist: 'Spotify Artist',
                        duration: 210,
                        artwork: oembed.thumbnail_url || '',
                        quality: 'FLAC / 320kbps Hi-Fi'
                    };
                    return {
                        success: true,
                        platform: 'Spotify',
                        title: singleTrack.title,
                        artwork: singleTrack.artwork,
                        count: 1,
                        tracks: [singleTrack]
                    };
                }
            } catch (oe) {}
        }
        return { success: false, error: `Spotify extraction failed: ${e.message}` };
    }

    // OpenGraph meta tag fallback
    if (type === 'track') {
        const ogTitle = body.match(/<meta property="og:title" content="([^"]+)"/i)?.[1];
        const ogImage = body.match(/<meta property="og:image" content="([^"]+)"/i)?.[1];
        const ogDesc = body.match(/<meta property="og:description" content="([^"]+)"/i)?.[1];
        if (ogTitle) {
            const singleTrack = {
                id: `sp_${id}`,
                spotifyId: id,
                title: cleanTrackName(ogTitle) || ogTitle,
                artist: ogDesc || 'Spotify Artist',
                duration: 210,
                artwork: ogImage || '',
                quality: 'FLAC / 320kbps Hi-Fi'
            };
            return {
                success: true,
                platform: 'Spotify',
                title: singleTrack.title,
                artwork: singleTrack.artwork,
                count: 1,
                tracks: [singleTrack]
            };
        }
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
    importText,
    parseYouTubeTitle
};
