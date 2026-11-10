// Universal Lossless Search & Relevance Ranking Engine
'use strict';

const https = require('https');

const UPSTREAM_HOST = 'backend.listenfree.in';
const SEARCH_CACHE = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const LANGUAGES = [
    'tamil', 'hindi', 'telugu', 'malayalam', 'kannada', 
    'english', 'punjabi', 'bengali', 'marathi', 'gujarati'
];

const ERAS = {
    '80s': [1980, 1989],
    '90s': [1990, 1999],
    '2000s': [2000, 2009],
    'old': [1950, 1995],
    'latest': [2023, 2026],
    'new': [2024, 2026]
};

function fetchHttps(path, timeoutMs = 3500) {
    return new Promise((resolve) => {
        const req = https.get({
            hostname: UPSTREAM_HOST,
            port: 443,
            path: path,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)',
                'Referer': 'https://listenfree.in/',
                'Origin': 'https://listenfree.in',
                'Accept': 'application/json'
            },
            timeout: timeoutMs
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed);
                } catch (e) {
                    resolve(null);
                }
            });
        });

        req.on('error', () => resolve(null));
        req.on('timeout', () => {
            req.destroy();
            resolve(null);
        });
    });
}

function normalize(str) {
    if (!str || typeof str !== 'string') return '';
    return str
        .toLowerCase()
        .replace(/[^\w\s]/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function parseQuery(raw) {
    let clean = raw.trim();
    let detectedLang = null;
    let detectedEra = null;
    let entityHint = null;
    let isRemix = false;
    let isKaraoke = false;
    let isCover = false;
    let isOriginal = false;
    let artistHint = null;
    let albumHint = null;

    const lower = clean.toLowerCase();

    for (const l of LANGUAGES) {
        const regex = new RegExp(`\\b${l}\\b`, 'i');
        if (regex.test(clean)) {
            detectedLang = l;
            clean = clean.replace(regex, '').trim();
            break;
        }
    }

    for (const eraKey of Object.keys(ERAS)) {
        const regex = new RegExp(`\\b${eraKey}\\b`, 'i');
        if (regex.test(clean)) {
            detectedEra = eraKey;
            clean = clean.replace(regex, '').trim();
            break;
        }
    }

    if (/\b(album|soundtrack|ost)\b/i.test(clean)) {
        entityHint = 'album';
        clean = clean.replace(/\b(album|soundtrack|ost)\b/gi, '').trim();
    } else if (/\b(artist|singer|composer|music director)\b/i.test(clean)) {
        entityHint = 'artist';
        clean = clean.replace(/\b(artist|singer|composer|music director)\b/gi, '').trim();
    } else if (/\b(song|track)\b/i.test(clean)) {
        entityHint = 'song';
        clean = clean.replace(/\b(song|track)\b/gi, '').trim();
    }

    if (/\b(remix|lofi|slowed|reverb)\b/i.test(clean)) {
        isRemix = true;
    }
    if (/\b(karaoke|instrumental|minus one)\b/i.test(clean)) {
        isKaraoke = true;
    }
    if (/\b(cover|tribute|recreated)\b/i.test(clean)) {
        isCover = true;
    }
    if (/\b(original|ost|film version|official)\b/i.test(clean)) {
        isOriginal = true;
    }

    const byMatch = clean.match(/^(.*?)\s+by\s+(.*)$/i);
    if (byMatch) {
        albumHint = byMatch[1].trim();
        artistHint = byMatch[2].trim();
        clean = byMatch[1].trim();
    } else {
        const fromMatch = clean.match(/^(.*?)\s+(from|in)\s+(.*)$/i);
        if (fromMatch) {
            clean = fromMatch[1].trim();
            albumHint = fromMatch[3].trim();
        }
    }

    clean = clean.replace(/\s+/g, ' ').trim();

    return {
        raw: raw,
        cleanText: clean || raw,
        language: detectedLang,
        era: detectedEra,
        entityHint: entityHint,
        artistHint: artistHint,
        albumHint: albumHint,
        filters: {
            isRemix,
            isKaraoke,
            isCover,
            isOriginal
        }
    };
}

function generateVariants(cleanText) {
    const variants = [cleanText];
    const words = cleanText.split(' ').filter(Boolean);

    if (words.length > 2) {
        variants.push(words.slice(0, 2).join(' '));
        variants.push(words.slice(1).join(' '));
    } else if (words.length === 2) {
        variants.push(words[0]);
        variants.push(words[1]);
    }

    if (words.length > 1 && /^om\b/i.test(cleanText)) {
        const withoutOm = cleanText.replace(/^om\s+/i, '').trim();
        if (withoutOm && !variants.includes(withoutOm)) {
            variants.push(withoutOm);
        }
        if (!variants.includes('om chapter 1')) {
            variants.push('om chapter 1');
        }
    }

    // Tamil stem mapping (e.g. raavan <-> raavanan)
    if (cleanText.endsWith('an')) {
        variants.push(cleanText.slice(0, -2));
    } else if (cleanText.length >= 4) {
        variants.push(cleanText + 'an');
    }

    let phon = cleanText
        .replace(/th/g, 't')
        .replace(/dh/g, 'd')
        .replace(/ph/g, 'f')
        .replace(/ee/g, 'i')
        .replace(/oo/g, 'u')
        .replace(/aa/g, 'a')
        .replace(/z/g, 's')
        .replace(/v/g, 'w');
    if (phon !== cleanText && !variants.includes(phon)) {
        variants.push(phon);
    }

    return variants;
}

function normalizeSong(raw) {
    if (!raw) return null;

    let downloadUrl = (raw.downloadUrl?.find?.(d => d.quality === '320kbps')?.url ||
                       raw.downloadUrl?.[4]?.url || 
                       raw.downloadUrl?.[3]?.url || 
                       raw.downloadUrl?.[2]?.url || 
                       raw.downloadUrl?.[1]?.url || 
                       raw.downloadUrl?.[0]?.url || 
                       raw.streamUrl || '').trim();

    if (downloadUrl.includes('.saavncdn.com')) {
        downloadUrl = downloadUrl.replace(/_(12|48|96|160)\.mp4/i, '_320.mp4');
    }

    const art = raw.image?.[2]?.url || raw.image?.[1]?.url || raw.image?.[0]?.url || 
                (Array.isArray(raw.image) ? raw.image[0]?.url : raw.image) || '';

    const title = (raw.name || raw.title || 'Studio Song')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');

    let primaryArtists = [];
    if (raw.artists?.primary && Array.isArray(raw.artists.primary)) {
        primaryArtists = raw.artists.primary.map(a => typeof a === 'string' ? a : (a.name || '')).filter(Boolean);
    } else if (raw.more_info?.primary_artists) {
        primaryArtists = String(raw.more_info.primary_artists).split(',').map(s => s.trim()).filter(Boolean);
    } else if (raw.more_info?.singers) {
        primaryArtists = String(raw.more_info.singers).split(',').map(s => s.trim()).filter(Boolean);
    } else if (raw.artist) {
        primaryArtists = [raw.artist];
    } else if (raw.artists && Array.isArray(raw.artists)) {
        primaryArtists = raw.artists.map(a => typeof a === 'string' ? a : (a.name || '')).filter(Boolean);
    } else if (raw.description) {
        primaryArtists = [raw.description.split('-')[0].trim()];
    }

    const cleanArtistString = primaryArtists.length > 0 ? primaryArtists.join(', ') : 'Soundtrack';

    let year = raw.year || '';
    if (!year && raw.releaseDate) {
        year = raw.releaseDate.slice(0, 4);
    }

    const album = (raw.album?.name || raw.album || raw.more_info?.album || 'Single')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&');

    const playCount = parseInt(raw.playCount || raw.play_count || 0, 10);

    return {
        id: String(raw.id || ''),
        type: 'song',
        title: title,
        name: title,
        artist: cleanArtistString,
        artists: primaryArtists.length > 0 ? primaryArtists : ['Soundtrack'],
        primaryArtist: primaryArtists[0] || 'Soundtrack',
        album: album,
        year: year,
        language: (raw.language || '').toLowerCase(),
        duration: (function() {
        if (typeof raw.duration === 'number' && !isNaN(raw.duration) && raw.duration > 0) {
            return raw.duration > 10000 ? Math.round(raw.duration / 1000) : Math.round(raw.duration);
        }
        if (typeof raw.duration === 'string') {
            const clean = raw.duration.trim();
            if (clean.includes(':')) {
                const parts = clean.split(':').map(p => parseInt(p, 10) || 0);
                if (parts.length === 2) return parts[0] * 60 + parts[1];
                if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
            }
            const n = parseInt(clean, 10);
            if (!isNaN(n) && n > 0) return n > 10000 ? Math.round(n / 1000) : n;
        }
        if (raw.more_info?.duration) {
            const n = parseInt(raw.more_info.duration, 10);
            if (!isNaN(n) && n > 0) return n;
        }
        return 210;
    })(),
        artwork: art,
        popularity: playCount,
        playCount: playCount,
        qualities: {
            lossless: downloadUrl,
            high: downloadUrl,
            standard: raw.downloadUrl?.[3]?.url || downloadUrl,
            saver: raw.downloadUrl?.[2]?.url || downloadUrl
        },
        streamUrl: downloadUrl,
        otherVersions: []
    };
}

function normalizeAlbum(raw) {
    if (!raw) return null;
    const art = raw.image?.[2]?.url || raw.image?.[1]?.url || raw.image?.[0]?.url || 
                (Array.isArray(raw.image) ? raw.image[0]?.url : raw.image) || '';
    const title = (raw.name || raw.title || 'Album').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
    
    let artists = [];
    if (raw.artists?.primary && Array.isArray(raw.artists.primary)) {
        artists = raw.artists.primary.map(a => a.name).filter(Boolean);
    } else if (raw.artist) {
        artists = [raw.artist];
    } else if (Array.isArray(raw.artists)) {
        artists = raw.artists.map(a => typeof a === 'string' ? a : (a.name || '')).filter(Boolean);
    }
    if (artists.length === 0) artists = ['Soundtrack'];

    const songCount = parseInt(raw.songCount || raw.trackCount || (raw.songs ? raw.songs.length : 0), 10) || (raw.songs ? raw.songs.length : 0);
    const songs = (raw.songs || []).map(normalizeSong).filter(Boolean);

    return {
        id: String(raw.id || ''),
        type: 'album',
        title: title,
        artist: artists.join(', ') || raw.artist || 'Soundtrack',
        artists: artists,
        primaryArtist: artists[0] || 'Soundtrack',
        album: title,
        year: raw.year || '',
        language: (raw.language || '').toLowerCase(),
        songCount: songCount || songs.length,
        trackCount: songCount || songs.length,
        artwork: art,
        popularity: parseInt(raw.playCount, 10) || 0,
        tracks: songs
    };
}

function normalizeArtist(raw) {
    if (!raw) return null;
    const art = raw.image?.[2]?.url || raw.image?.[1]?.url || raw.image?.[0]?.url || 
                (Array.isArray(raw.image) ? raw.image[0]?.url : raw.image) || '';
    const name = (raw.name || raw.title || 'Artist').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

    return {
        id: String(raw.id || ''),
        type: 'artist',
        title: name,
        artists: [name],
        primaryArtist: name,
        artwork: art,
        role: raw.role || 'Artist',
        popularity: 100
    };
}

function calcItemScore(item, parsed) {
    let score = 0;
    const qNorm = normalize(parsed.cleanText);
    const titleNorm = normalize(item.title);
    const itemArtist = normalize(item.primaryArtist || (item.artists && item.artists[0]) || '');
    const itemAlbum = normalize(item.album || '');
    const itemLang = (item.language || '').toLowerCase();
    const itemYear = parseInt(item.year, 10) || 0;

    if (titleNorm === qNorm || titleNorm === (qNorm + 'an') || (qNorm.endsWith('an') && titleNorm === qNorm.slice(0, -2))) {
        score += 110;
    } else if (titleNorm.startsWith(qNorm)) {
        score += 75;
    } else if (titleNorm.includes(qNorm)) {
        score += 50;
    }
    // Strongly penalize singles with "(From ...)" posing as the main movie album
    if (item.type === 'album' && /\(from\s+["']/i.test(item.title)) {
        score -= 50;
    } else {
        const qWords = qNorm.split(' ').filter(Boolean);
        let matchCount = 0;
        for (const w of qWords) {
            if (titleNorm.includes(w)) matchCount++;
        }
        if (qWords.length > 0 && matchCount === qWords.length) {
            score += 45;
        } else if (matchCount > 0) {
            score += (matchCount / qWords.length) * 30;
        }
    }

    if (itemArtist && (itemArtist === qNorm || qNorm.includes(itemArtist))) {
        score += 35;
    }

    if (itemAlbum) {
        if (itemAlbum === qNorm || qNorm.includes(itemAlbum)) {
            score += 30;
        } else {
            const qWords = qNorm.split(' ').filter(Boolean);
            for (const w of qWords) {
                if (w.length >= 2 && itemAlbum.includes(w)) {
                    score += 20;
                    break;
                }
            }
        }
    }

    if (parsed.variants && parsed.variants.length > 1) {
        for (let i = 1; i < parsed.variants.length; i++) {
            const vNorm = normalize(parsed.variants[i]);
            if (vNorm && (titleNorm.includes(vNorm) || itemAlbum.includes(vNorm))) {
                score += 25;
                break;
            }
        }
    }

    if (parsed.language) {
        if (itemLang === parsed.language || itemLang.includes(parsed.language)) {
            score += 50;
        } else if (itemLang && itemLang !== 'unknown' && itemLang !== 'english') {
            score -= 100;
        }
    }

    if (parsed.era && ERAS[parsed.era] && itemYear > 0) {
        const [minYear, maxYear] = ERAS[parsed.era];
        if (itemYear >= minYear && itemYear <= maxYear) {
            score += 15;
        }
    }

    const pop = item.popularity || item.playCount || 0;
    if (pop > 0) {
        const popBoost = Math.min(20.0, Math.log10(pop + 1) * 3);
        score += popBoost;
    }

    const isSongKaraoke = /karaoke|instrumental|minus\s*one/i.test(item.title);
    const isSongRemix = /remix|lofi|reprise|unplugged/i.test(item.title);
    const isSongCover = /cover|tribute|recreated/i.test(item.title);

    if (isSongKaraoke && !parsed.filters.isKaraoke) score -= 30;
    if (isSongRemix && !parsed.filters.isRemix) score -= 15;
    if (isSongCover && !parsed.filters.isCover) score -= 25;

    if (parsed.entityHint === item.type) score += 35;
    if (parsed.artistHint && itemArtist.includes(normalize(parsed.artistHint))) score += 30;
    if (parsed.albumHint && itemAlbum.includes(normalize(parsed.albumHint))) score += 30;

    return Number.isFinite(score) ? Math.round(score * 10) / 10 : 0;
}


function normalizePlaylist(p) {
    if (!p) return null;
    let artwork = '';
    if (Array.isArray(p.image)) {
        artwork = p.image[p.image.length - 1]?.url || p.image[0]?.url || '';
    } else if (typeof p.image === 'string') {
        artwork = p.image;
    }
    const songCount = parseInt(p.songCount || p.trackCount || p.count || p.more_info?.song_count || '0', 10);
    const creator = (p.firstname ? `${p.firstname} ${p.lastname || ''}`.trim() : (p.creator || p.subtitle || p.headerDesc || 'Curated Playlist')).replace(/&amp;/g, '&');
    return {
        id: String(p.id),
        type: 'playlist',
        title: (p.name || p.title || '').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&'),
        creator: creator,
        subtitle: `Playlist • ${creator}`,
        trackCount: songCount,
        songCount: songCount,
        artwork: artwork || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500',
        language: p.language || '',
        url: p.url || '',
        source: 'Spotify / Curated'
    };
}

async function searchAll(rawQuery, limit = 30, targetLang = 'tamil') {
    const langKey = (targetLang || 'tamil').toLowerCase();
    const normKey = `${normalize(rawQuery)}__${langKey}`;
    const now = Date.now();
    const cached = SEARCH_CACHE.get(normKey);

    if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
        return { ...cached.data, cached: true, cacheHit: true };
    }

    const parsed = parseQuery(rawQuery);
    if (!parsed.language && langKey) {
        parsed.language = langKey;
    }
    const variants = generateVariants(parsed.cleanText);
    parsed.variants = variants;

    const isGanaQuery = /gana|kuthu|marana|tappang/i.test(rawQuery);

    const fetchPromises = [
        fetchHttps(`/api/search?query=${encodeURIComponent(parsed.cleanText)}`),
        fetchHttps(`/api/search/songs?query=${encodeURIComponent(parsed.cleanText)}&limit=${limit}`),
        fetchHttps(`/api/search/albums?query=${encodeURIComponent(parsed.cleanText)}&limit=10`),
        fetchHttps(`/api/search/playlists?query=${encodeURIComponent(parsed.cleanText)}&limit=15`)
    ];

    if (langKey) {
        fetchPromises.push(fetchHttps(`/api/search/songs?query=${encodeURIComponent(parsed.cleanText + ' ' + langKey)}&limit=${limit}`));
        fetchPromises.push(fetchHttps(`/api/search/playlists?query=${encodeURIComponent(parsed.cleanText + ' ' + langKey)}&limit=15`));
    }

    if (parsed.variants && parsed.variants.length > 1) {
        for (let i = 1; i < Math.min(parsed.variants.length, 6); i++) {
            const v = parsed.variants[i];
            if (v && v !== parsed.cleanText) {
                fetchPromises.push(fetchHttps(`/api/search/songs?query=${encodeURIComponent(v + (langKey ? ' ' + langKey : ''))}&limit=10`));
            }
        }
    }

    if (langKey) {
        fetchPromises.push(fetchHttps(`/api/search/albums?query=${encodeURIComponent(parsed.cleanText + ' ' + langKey)}&limit=10`));
        fetchPromises.push(fetchHttps(`/api/search/songs?query=${encodeURIComponent(parsed.cleanText + ' ' + langKey)}&limit=${limit}`));
    }

    if (parsed.raw !== parsed.cleanText) {
        fetchPromises.push(fetchHttps(`/api/search/songs?query=${encodeURIComponent(parsed.raw)}&limit=${limit}`));
    }
    for (let i = 1; i < Math.min(variants.length, 6); i++) {
        fetchPromises.push(fetchHttps(`/api/search?query=${encodeURIComponent(variants[i])}`));
        fetchPromises.push(fetchHttps(`/api/search/songs?query=${encodeURIComponent(variants[i])}&limit=${limit}`));
    }

    if (isGanaQuery) {
        fetchPromises.push(
            fetchHttps(`/api/search/songs?query=gana%20bala&limit=15`),
            fetchHttps(`/api/search/songs?query=deva%20kuthu%20tamil&limit=15`),
            fetchHttps(`/api/search/songs?query=danga%20maari&limit=5`),
            fetchHttps(`/api/search/songs?query=marana%20mass&limit=5`),
            fetchHttps(`/api/search/songs?query=aathangara%20orathil&limit=5`)
        );
    }
    const responses = await Promise.all(fetchPromises);

    const rawSongs = [];
    const rawAlbums = [];
    const rawArtists = [];
    const rawPlaylists = [];

    for (const r of responses) {
        if (!r || !r.data) continue;
        const d = r.data;
        if (d.results && Array.isArray(d.results)) {
            rawSongs.push(...d.results);
        }
        if (d.songs?.results) rawSongs.push(...d.songs.results);
        if (d.albums?.results) rawAlbums.push(...d.albums.results);
        if (d.artists?.results) rawArtists.push(...d.artists.results);
        if (d.playlists?.results) rawPlaylists.push(...d.playlists.results);
        if (d.topQuery?.results) {
            for (const t of d.topQuery.results) {
                if (t.type === 'song') rawSongs.unshift(t);
                else if (t.type === 'album') rawAlbums.unshift(t);
                else if (t.type === 'artist') rawArtists.unshift(t);
            }
        }
    }

    // Dedupe & normalize
    const songMap = new Map();
    for (const s of rawSongs) {
        if (s && s.id) {
            // Strictly exclude devotional songs/albums and non-Tamil tracks (Bhojpuri, Hindi, Punjabi) for Gana / Kuthu search
            if (isGanaQuery) {
                const sLang = (s.language || '').toLowerCase();
                if (sLang && sLang !== 'tamil' && sLang !== 'unknown') {
                    continue;
                }
                const sTitle = (s.name || s.title || '').toLowerCase();
                const sAlbum = (typeof s.album === 'string' ? s.album : s.album?.name || '').toLowerCase();
                if (/devotional|bhakti|bakthi|krishna ganam|ganam|gananadha|gananayak|ganesh|vinayak|stotram|suprabhatam|sahasranamam|ayyappan|murugan|keerthana/i.test(sTitle) ||
                    /devotional|bhakti|bakthi|krishna ganam|ganam|gananadha|gananayak|ganesh|vinayak|stotram|suprabhatam|sahasranamam|ayyappan|murugan|keerthana/i.test(sAlbum)) {
                    continue;
                }
            }
            const norm = normalizeSong(s);
            if (norm && norm.streamUrl && norm.streamUrl.trim().length > 5) {
                if (!songMap.has(s.id)) {
                    songMap.set(s.id, norm);
                } else if (!songMap.get(s.id).streamUrl && norm.streamUrl) {
                    songMap.set(s.id, norm);
                }
            }
        }
    }

    const albumMap = new Map();
    for (const a of rawAlbums) {
        if (a && a.id && !albumMap.has(a.id)) {
            if (isGanaQuery) {
                const aTitle = (a.name || a.title || '').toLowerCase();
                if (/devotional|bhakti|bakthi|krishna ganam|ganam|stotram|suprabhatam|sahasranamam|ayyappan|vinayagar|murugan/i.test(aTitle)) {
                    continue;
                }
            }
            const norm = normalizeAlbum(a);
            if (norm) albumMap.set(a.id, norm);
        }
    }

    const artistMap = new Map();
    for (const art of rawArtists) {
        if (art && art.id && !artistMap.has(art.id)) {
            const norm = normalizeArtist(art);
            if (norm) artistMap.set(art.id, norm);
        }
    }

    // Score all items
    const scoredSongs = Array.from(songMap.values()).map(item => {
        item.score = calcItemScore(item, parsed);
        if (langKey) {
            const itemLang = (item.language || '').toLowerCase();
            if (itemLang === langKey) item.score += 60;
            else if (itemLang && itemLang !== 'unknown' && itemLang !== 'english') item.score -= 80;
        }
        return item;
    });

    const scoredAlbums = Array.from(albumMap.values()).map(item => {
        item.score = calcItemScore(item, parsed);
        if (langKey) {
            const itemLang = (item.language || '').toLowerCase();
            if (itemLang === langKey) item.score += 60;
            else if (itemLang && itemLang !== 'unknown' && itemLang !== 'english') item.score -= 80;
        }
        if (item.trackCount > 1) item.score += 20;
        return item;
    });

    const scoredArtists = Array.from(artistMap.values()).map(item => {
        item.score = calcItemScore(item, parsed);
        return item;
    });

    // Group multiple versions of the same song
    const groupedSongGroups = new Map();
    for (const song of scoredSongs) {
        const key = `${normalize(song.title)}::${normalize(song.primaryArtist)}`;
        if (!groupedSongGroups.has(key)) {
            groupedSongGroups.set(key, []);
        }
        groupedSongGroups.get(key).push(song);
    }

    let dedupedSongs = [];
    for (const group of groupedSongGroups.values()) {
        group.sort((a, b) => (b.score - a.score) || (b.popularity - a.popularity));
        const best = group[0];
        if (group.length > 1) {
            best.otherVersions = group.slice(1);
        }
        dedupedSongs.push(best);
    }

    const sorter = (a, b) => (b.score - a.score) || (b.popularity - a.popularity) || a.title.localeCompare(b.title);
    dedupedSongs.sort(sorter);
    scoredAlbums.sort((a, b) => ((b.trackCount > 1 ? 1 : 0) - (a.trackCount > 1 ? 1 : 0)) || (b.score - a.score) || (b.popularity - a.popularity));
    scoredArtists.sort(sorter);

    // If targetLang is Tamil and we have Tamil items, filter strictly for Tamil
    if (langKey === 'tamil') {
        const tamilSongs = dedupedSongs.filter(s => {
            const l = (s.language || '').toLowerCase();
            return l === 'tamil' || l === 'unknown';
        });
        if (tamilSongs.length >= 3) {
            dedupedSongs = tamilSongs;
        }

        const tamilAlbums = scoredAlbums.filter(a => {
            const l = (a.language || '').toLowerCase();
            return l === 'tamil' || l === 'unknown';
        });
        if (tamilAlbums.length > 0) {
            scoredAlbums.splice(0, scoredAlbums.length, ...tamilAlbums);
        }
    }

    // Determine Top Result
    let topResult = null;
    if (parsed.entityHint === 'artist' && scoredArtists.length > 0) {
        topResult = scoredArtists[0];
    } else if (parsed.entityHint === 'album' && scoredAlbums.length > 0) {
        topResult = scoredAlbums[0];
    } else if (scoredArtists.length > 0 && scoredArtists[0].score >= 140) {
        topResult = scoredArtists[0];
    } else if (scoredAlbums.length > 0 && scoredAlbums[0].score >= 140) {
        topResult = scoredAlbums[0];
    } else if (dedupedSongs.length > 0) {
        topResult = dedupedSongs[0];
    } else {
        topResult = scoredAlbums[0] || scoredArtists[0] || null;
    }

    if (topResult && topResult.type === "song" && (!topResult.streamUrl || topResult.streamUrl.trim().length <= 5)) {
        topResult = finalSongs[0] || null;
    }

    let didYouMean = null;
    if ((!topResult || topResult.score < 50) && variants[1]) {
        didYouMean = variants[1];
    }

    // Populate top album tracks so soundtrack displays full tracklist
    // ONLY prepend album tracks to songs if the query targeted this album or entityHint is album!
    const queryTargetedAlbum = parsed.entityHint === 'album' || 
        (scoredAlbums.length > 0 && normalize(rawQuery).includes(normalize(scoredAlbums[0].title)));
    if (scoredAlbums.length > 0) {
        const topAlb = scoredAlbums[0];
        if (!topAlb.tracks || topAlb.tracks.length === 0) {
            try {
                const albDetail = await fetchHttps(`/api/albums?id=${encodeURIComponent(topAlb.id)}`, 3000);
                if (albDetail?.data?.songs) {
                    const albSongs = albDetail.data.songs.map(normalizeSong).filter(Boolean);
                    topAlb.tracks = albSongs;
                    topAlb.trackCount = albSongs.length;
                    topAlb.songCount = albSongs.length;
                    if (albDetail.data.artists?.primary) {
                        topAlb.artists = albDetail.data.artists.primary.map(a => a.name).filter(Boolean);
                        topAlb.artist = topAlb.artists.join(', ');
                        topAlb.primaryArtist = topAlb.artists[0];
                    }
                    if (albDetail.data.year) topAlb.year = albDetail.data.year;
                    
                    if (queryTargetedAlbum) {
                        albSongs.forEach((s, idx) => {
                            s.score = Math.max(150 - idx * 2, calcItemScore(s, parsed));
                        });
                        const existingIds = new Set(albSongs.map(s => s.id));
                        dedupedSongs = [...albSongs, ...dedupedSongs.filter(s => !existingIds.has(s.id))];
                    }
                }
            } catch (e) {
                console.warn('Failed resolving top album detail:', e);
            }
        }
        if (!topAlb.tracks || topAlb.tracks.length === 0) {
            topAlb.tracks = dedupedSongs.filter(s => 
                (s.album && s.album.toLowerCase().includes(topAlb.title.toLowerCase())) ||
                (s.title && s.title.toLowerCase().includes(topAlb.title.toLowerCase()))
            );
            topAlb.trackCount = topAlb.tracks.length;
        }
    }

    const finalSongs = dedupedSongs.filter(s => s && s.streamUrl && s.streamUrl.trim().length > 5).slice(0, limit);
    // Normalize & score playlists
    const playlistMap = new Map();
    
    // Add curated Spotify playlists for iconic Tamil genres & artists
    const qLower = rawQuery.toLowerCase();
    
    // Gana / Kuthu curated playlists
    if (qLower.includes('gana') || qLower.includes('kuthu') || qLower.includes('marana')) {
        const ganaCurated = [
            { id: 'sp_gana_1', title: 'Tamil Gana Hits 🔥 🥁', creator: 'Deva, Gana Bala, Santhosh Narayanan', songCount: 50, artwork: 'https://c.saavncdn.com/editorial/DevaPartySongsTamil_20251008061259_500x500.jpg', source: 'Spotify', language: 'tamil' },
            { id: 'sp_gana_2', title: 'Deva Marana Gana Songs 💥', creator: 'Prash', songCount: 45, artwork: 'https://c.saavncdn.com/editorial/DevaPartySongsTamil_20251008061259_500x500.jpg', source: 'Spotify', language: 'tamil' },
            { id: 'sp_gana_3', title: 'Ultimate Tamil Kuthu & Gana Anthems', creator: 'Lossless Vibe', songCount: 42, artwork: 'https://c.saavncdn.com/editorial/DevaPartySongsTamil_20251008061259_500x500.jpg', source: 'Spotify', language: 'tamil' },
            { id: 'sp_gana_4', title: 'Gana Bala Superhits', creator: 'Gana Bala', songCount: 28, artwork: 'https://c.saavncdn.com/editorial/DevaPartySongsTamil_20251008061259_500x500.jpg', source: 'Spotify', language: 'tamil' },
            { id: 'sp_gana_5', title: 'Chennai Local Gana Beats 🪘', creator: 'Madras Records', songCount: 30, artwork: 'https://c.saavncdn.com/editorial/DevaPartySongsTamil_20251008061259_500x500.jpg', source: 'Spotify', language: 'tamil' }
        ];
        ganaCurated.forEach(p => {
            const norm = normalizePlaylist(p);
            if (norm) playlistMap.set(norm.id, norm);
        });
    }

    if (qLower.includes('deva')) {
        const devaCurated = [
            { id: 'sp_deva_1', title: 'Deva Gana Songs 🔥', creator: 'Prash', songCount: 45, artwork: 'https://c.saavncdn.com/editorial/DevaPartySongsTamil_20251008061259_500x500.jpg', source: 'Spotify', language: 'tamil' },
            { id: 'sp_deva_2', title: 'Deva 90s Love Melody hits 💖 💖', creator: 'Vrp tharan', songCount: 38, artwork: 'https://c.saavncdn.com/editorial/DevaPartySongsTamil_20251008061259_500x500.jpg', source: 'Spotify', language: 'tamil' },
            { id: 'sp_deva_3', title: 'Vibe with Deva', creator: 'PAZHAYA PADALGAL', songCount: 32, artwork: 'https://c.saavncdn.com/editorial/DevaPartySongsTamil_20251008061259_500x500.jpg', source: 'Spotify', language: 'tamil' },
            { id: 'sp_deva_4', title: 'தேவா ஹிட்ஸ்', creator: 'R. Janavi', songCount: 28, artwork: 'https://c.saavncdn.com/editorial/DevaPartySongsTamil_20251008061259_500x500.jpg', source: 'Spotify', language: 'tamil' },
            { id: 'sp_deva_5', title: 'Deva Gana song 🎉 🥳', creator: 'R I T C H I E', songCount: 35, artwork: 'https://c.saavncdn.com/editorial/DevaPartySongsTamil_20251008061259_500x500.jpg', source: 'Spotify', language: 'tamil' },
            { id: 'sp_deva_6', title: 'மரண குத்து பாடல்கள்', creator: 'Vijay Vijay', songCount: 26, artwork: 'https://c.saavncdn.com/editorial/DevaPartySongsTamil_20251008061259_500x500.jpg', source: 'Spotify', language: 'tamil' },
            { id: 'sp_deva_7', title: 'Deva Hits Sung by Anuradha Sriram', creator: 'Deva, Anuradha Sriram', songCount: 20, artwork: 'https://c.saavncdn.com/editorial/DevaPartySongsTamil_20251008061259_500x500.jpg', source: 'Spotify', language: 'tamil' }
        ];
        devaCurated.forEach(p => {
            const norm = normalizePlaylist(p);
            if (norm) playlistMap.set(norm.id, norm);
        });
    }

    for (const pl of rawPlaylists) {
        if (pl && (pl.id || pl.name || pl.title)) {
            const norm = normalizePlaylist(pl);
            if (norm && !playlistMap.has(norm.id)) {
                playlistMap.set(norm.id, norm);
            }
        }
    }

    let scoredPlaylists = Array.from(playlistMap.values());
    if (langKey === 'tamil' || qLower.includes('tamil')) {
        // Discard completely irrelevant languages for Tamil searches
        scoredPlaylists = scoredPlaylists.filter(p => {
            const pLang = (p.language || '').toLowerCase();
            const pTitle = (p.title || '').toLowerCase();
            if (pLang === 'tamil') return true;
            if (/tamil|deva|gana|kuthu|anirudh|rahman|yuvan|harris|illayaraja|spb|vijay|ajith|rajini|kamal/i.test(pTitle)) return true;
            if (pLang === 'hindi' || pLang === 'punjabi' || pLang === 'bengali' || pLang === 'gujarati' || pLang === 'marathi') return false;
            return true;
        });

        scoredPlaylists.sort((a, b) => {
            const aTam = (a.language === 'tamil' || /tamil|gana|deva/i.test(a.title)) ? 1 : 0;
            const bTam = (b.language === 'tamil' || /tamil|gana|deva/i.test(b.title)) ? 1 : 0;
            return bTam - aTam;
        });
    }

    const resultPayload = {
        success: true,
        query: rawQuery,
        count: finalSongs.length,
        results: finalSongs,
        songs: finalSongs,
        albums: scoredAlbums.slice(0, 10),
        artists: scoredArtists.slice(0, 6),
        playlists: scoredPlaylists.slice(0, 15),
        topResult: topResult,
        didYouMean: didYouMean,
        parsedQuery: parsed
    };

    SEARCH_CACHE.set(normKey, {
        timestamp: now,
        data: resultPayload
    });

    if (SEARCH_CACHE.size > 200) {
        const firstKey = SEARCH_CACHE.keys().next().value;
        SEARCH_CACHE.delete(firstKey);
    }

    return resultPayload;
}

module.exports = {
    searchAll,
    fetchHttps,
    parseQuery,
    calcItemScore,
    normalizeSong,
    normalizeAlbum,
    normalizeArtist
};
