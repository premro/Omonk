const https = require('https');
const http = require('http');

const MAX_CACHE_ENTRIES = 500;
const lyricsMemoryCache = new Map();

function setBoundedCache(key, value) {
    if (lyricsMemoryCache.size >= MAX_CACHE_ENTRIES) {
        const oldestKey = lyricsMemoryCache.keys().next().value;
        lyricsMemoryCache.delete(oldestKey);
    }
    lyricsMemoryCache.set(key, value);
}

function cleanTitle(title) {
    if (!title) return '';
    return title
        .replace(/\(From\s+.*?\)/gi, '')
        .replace(/\(feat\..*?\)/gi, '')
        .replace(/\(Duet.*?\)/gi, '')
        .replace(/\(Audio.*?\)/gi, '')
        .replace(/\(Video.*?\)/gi, '')
        .replace(/\[.*?\]/g, '')
        .replace(/\b(Official Video|Official Audio|Music Video|Lyrical Video|Lyrical|Audio|Lossless|320kbps)\b/gi, '')
        .replace(/\|\s*.*$/, '')
        .replace(/[-–—:]/g, ' ')
        .trim();
}

function detectScript(text) {
    if (!text) return 'unknown';
    const tamil = (text.match(/[\u0B80-\u0BFF]/g) || []).length;
    const telugu = (text.match(/[\u0C00-\u0C7F]/g) || []).length;
    const kannada = (text.match(/[\u0C80-\u0CFF]/g) || []).length;
    const malayalam = (text.match(/[\u0D00-\u0D7F]/g) || []).length;
    const devanagari = (text.match(/[\u0900-\u097F]/g) || []).length;
    const latin = (text.match(/[a-zA-Z]/g) || []).length;

    const counts = { tamil, telugu, kannada, malayalam, hindi: devanagari };
    let topLang = 'english';
    let maxCount = latin;

    for (const [k, v] of Object.entries(counts)) {
        if (v > maxCount && v > 15) {
            topLang = k;
            maxCount = v;
        }
    }
    return topLang;
}

function getScriptLabel(script, targetLang = '') {
    const labels = {
        english: '🔤 English / Romanized',
        tamil: '🌐 Native தமிழ் (Tamil)',
        telugu: '🌐 Native తెలుగు (Telugu)',
        kannada: '🌐 Native ಕನ್ನಡ (Kannada)',
        malayalam: '🌐 Native മലയാളം (Malayalam)',
        hindi: '🌐 Native हिन्दी (Hindi)',
        unknown: '📄 Text Lyrics'
    };
    const normTarget = (targetLang || '').toLowerCase().trim();
    if (
        normTarget &&
        script !== 'english' &&
        script !== 'unknown' &&
        normTarget !== script
    ) {
        return `⚠️ ${script.toUpperCase()} Dub`;
    }
    return labels[script] || `🌐 ${script}`;
}

function requestJson(url) {
    return new Promise((resolve) => {
        const u = new URL(url);
        const mod = u.protocol === 'https:' ? https : http;
        const req = mod.get(url, {
            headers: {
                'User-Agent': 'LosslessMusicStudio/8.1 (https://omonk.web.app)',
                'Accept': 'application/json'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: null });
                }
            });
        });
        req.on('error', () => resolve({ status: 500, data: null }));
        req.setTimeout(5000, () => {
            req.destroy();
            resolve({ status: 504, data: null });
        });
    });
}

async function searchLrclib(query, language = '', targetDuration = 0) {
    const qClean = cleanTitle(query);
    if (!qClean) return [];

    const url = `https://lrclib.net/api/search?q=${encodeURIComponent(qClean)}`;
    const res = await requestJson(url);
    if (!res.data || !Array.isArray(res.data)) return [];

    const normLang = (language || '').toLowerCase().trim();
    const dur = Math.round(Number(targetDuration) || 0);

    const mapped = res.data.slice(0, 25).map(item => {
        const text = item.syncedLyrics || item.plainLyrics || '';
        const script = detectScript(text);
        const itemDur = Math.round(item.duration || 0);
        const durDiff = (dur > 0 && itemDur > 0) ? Math.abs(dur - itemDur) : 0;
        const isWrongDub = Boolean(normLang && script !== 'english' && script !== 'unknown' && script !== normLang);

        let score = 0;
        if (item.syncedLyrics) score += 50;
        if (dur > 0 && durDiff <= 4) score += 40;
        else if (dur > 0 && durDiff <= 10) score += 15;
        else if (dur > 0 && durDiff > 20) score -= 35;
        if (!isWrongDub) score += 30;
        else score -= 60;

        return {
            id: item.id,
            trackName: item.trackName || item.name || '',
            artistName: item.artistName || '',
            albumName: item.albumName || '',
            duration: itemDur,
            durationDiff: durDiff,
            hasSynced: Boolean(item.syncedLyrics),
            hasPlain: Boolean(item.plainLyrics),
            syncedLyrics: item.syncedLyrics || '',
            plainLyrics: item.plainLyrics || '',
            script,
            scriptLabel: getScriptLabel(script, normLang),
            _score: score
        };
    });

    return mapped.sort((a, b) => b._score - a._score);
}

async function fetchLyrics(title, artist = '', duration = 0, language = '') {
    const normLang = (language || '').toLowerCase().trim();
    const durSec = Math.round(Number(duration) || 0);
    const cacheKey = `${(title || '').toLowerCase()}_${(artist || '').toLowerCase()}_${durSec}_${normLang}`;

    if (lyricsMemoryCache.has(cacheKey)) {
        return lyricsMemoryCache.get(cacheKey);
    }

    const cTitle = cleanTitle(title);
    const primaryArtist = (artist || '').split(/[,&]/)[0].trim();

    if (cTitle) {
        let getUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cTitle)}`;
        if (primaryArtist) getUrl += `&artist_name=${encodeURIComponent(primaryArtist)}`;
        if (durSec > 0) getUrl += `&duration=${durSec}`;

        const getRes = await requestJson(getUrl);
        if (getRes.data && (getRes.data.syncedLyrics || getRes.data.plainLyrics)) {
            const d = getRes.data;
            const script = detectScript(d.syncedLyrics || d.plainLyrics);
            const isWrongDub = Boolean(normLang && script !== 'english' && script !== 'unknown' && script !== normLang);
            if (!isWrongDub) {
                const resObj = {
                    success: true,
                    syncedLyrics: d.syncedLyrics || '',
                    plainLyrics: d.plainLyrics || '',
                    trackName: d.trackName || title,
                    artistName: d.artistName || artist,
                    hasDual: false
                };
                setBoundedCache(cacheKey, resObj);
                return resObj;
            }
        }
    }

    const queries = [
        `${cTitle} ${primaryArtist}`.trim(),
        cTitle,
        title
    ].filter(Boolean);

    for (const q of queries) {
        const candidates = await searchLrclib(q, normLang, durSec);
        if (candidates.length > 0) {
            const validCandidates = candidates.filter(c => !c.scriptLabel.startsWith('⚠️'));
            const pool = validCandidates.length > 0 ? validCandidates : candidates;

            const synced = pool.find(c => c.syncedLyrics && c.syncedLyrics.length > 20 && (durSec === 0 || c.durationDiff <= 12));
            const best = synced || pool[0];

            if (best && (best.syncedLyrics || best.plainLyrics)) {
                const englishCand = pool.find(c => c.script === 'english' && c.syncedLyrics && (durSec === 0 || c.durationDiff <= 12));
                const nativeCand = pool.find(c => c.script === normLang && c.syncedLyrics && (durSec === 0 || c.durationDiff <= 12));

                const hasDual = Boolean(englishCand && nativeCand && englishCand.id !== nativeCand.id);
                const resObj = {
                    success: true,
                    syncedLyrics: best.syncedLyrics || '',
                    plainLyrics: best.plainLyrics || '',
                    trackName: best.trackName || title,
                    artistName: best.artistName || artist,
                    hasDual,
                    defaultScript: 'english',
                    english: englishCand ? { syncedLyrics: englishCand.syncedLyrics, plainLyrics: englishCand.plainLyrics } : null,
                    native: nativeCand ? {
                        syncedLyrics: nativeCand.syncedLyrics,
                        plainLyrics: nativeCand.plainLyrics,
                        scriptLabel: nativeCand.scriptLabel
                    } : null,
                    nativeLabel: nativeCand ? nativeCand.scriptLabel : '🌐 Native'
                };
                setBoundedCache(cacheKey, resObj);
                return resObj;
            }
        }
    }

    const notFound = { success: false, syncedLyrics: '', plainLyrics: '', hasDual: false };
    setBoundedCache(cacheKey, notFound);
    return notFound;
}

module.exports = {
    fetchLyrics,
    searchLrclib,
    cleanTitle
};
