const https = require('https');
const http = require('http');

const lyricsMemoryCache = new Map();

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

function getScriptLabel(script) {
    const labels = {
        english: '🔤 English / Romanized',
        tamil: '🌐 Native தமிழ் (Tamil)',
        telugu: '🌐 Native తెలుగు (Telugu)',
        kannada: '🌐 Native ಕನ್ನಡ (Kannada)',
        malayalam: '🌐 Native മലയാളം (Malayalam)',
        hindi: '🌐 Native हिन्दी (Hindi)',
        unknown: '📄 Text Lyrics'
    };
    return labels[script] || `🌐 ${script}`;
}

function requestJson(url) {
    return new Promise((resolve) => {
        const u = new URL(url);
        const mod = u.protocol === 'https:' ? https : http;
        const req = mod.get(url, {
            headers: {
                'User-Agent': 'LosslessMusicStudio/6.9 (https://omonk.web.app)',
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

async function searchLrclib(query, language = '') {
    const qClean = cleanTitle(query);
    if (!qClean) return [];

    const url = `https://lrclib.net/api/search?q=${encodeURIComponent(qClean)}`;
    const res = await requestJson(url);
    if (!res.data || !Array.isArray(res.data)) return [];

    return res.data.slice(0, 20).map(item => {
        const text = item.syncedLyrics || item.plainLyrics || '';
        const script = detectScript(text);
        return {
            id: item.id,
            trackName: item.trackName || item.name || '',
            artistName: item.artistName || '',
            albumName: item.albumName || '',
            duration: Math.round(item.duration || 0),
            hasSynced: Boolean(item.syncedLyrics),
            hasPlain: Boolean(item.plainLyrics),
            syncedLyrics: item.syncedLyrics || '',
            plainLyrics: item.plainLyrics || '',
            script: script,
            scriptLabel: getScriptLabel(script)
        };
    });
}

async function fetchLyrics(title, artist = '', duration = 0, language = '') {
    const cacheKey = `${(title || '').toLowerCase()}_${(artist || '').toLowerCase()}`;
    if (lyricsMemoryCache.has(cacheKey)) {
        return lyricsMemoryCache.get(cacheKey);
    }

    const cTitle = cleanTitle(title);
    const primaryArtist = (artist || '').split(/[,&]/)[0].trim();

    // 1. Direct LRCLIB get
    if (cTitle) {
        let getUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cTitle)}`;
        if (primaryArtist) getUrl += `&artist_name=${encodeURIComponent(primaryArtist)}`;
        if (duration > 0) getUrl += `&duration=${Math.round(duration)}`;

        const getRes = await requestJson(getUrl);
        if (getRes.data && (getRes.data.syncedLyrics || getRes.data.plainLyrics)) {
            const d = getRes.data;
            const resObj = {
                success: true,
                syncedLyrics: d.syncedLyrics || '',
                plainLyrics: d.plainLyrics || '',
                trackName: d.trackName || title,
                artistName: d.artistName || artist,
                hasDual: false
            };
            lyricsMemoryCache.set(cacheKey, resObj);
            return resObj;
        }
    }

    // 2. Search fallback
    const queries = [
        `${cTitle} ${primaryArtist}`.trim(),
        cTitle,
        title
    ].filter(Boolean);

    for (const q of queries) {
        const candidates = await searchLrclib(q, language);
        if (candidates.length > 0) {
            // Find best synchronized candidate
            const synced = candidates.find(c => c.syncedLyrics && c.syncedLyrics.length > 20);
            const best = synced || candidates[0];

            if (best && (best.syncedLyrics || best.plainLyrics)) {
                // Check if we can form dual script (English + Native)
                const englishCand = candidates.find(c => c.script === 'english' && c.syncedLyrics);
                const nativeCand = candidates.find(c => c.script !== 'english' && c.syncedLyrics);

                const hasDual = Boolean(englishCand && nativeCand && englishCand.id !== nativeCand.id);
                const resObj = {
                    success: true,
                    syncedLyrics: best.syncedLyrics || '',
                    plainLyrics: best.plainLyrics || '',
                    trackName: best.trackName || title,
                    artistName: best.artistName || artist,
                    hasDual: hasDual,
                    english: englishCand ? { syncedLyrics: englishCand.syncedLyrics, plainLyrics: englishCand.plainLyrics } : null,
                    native: nativeCand ? { syncedLyrics: nativeCand.syncedLyrics, plainLyrics: nativeCand.plainLyrics } : null,
                    nativeLabel: nativeCand ? nativeCand.scriptLabel : '🌐 Native'
                };
                lyricsMemoryCache.set(cacheKey, resObj);
                return resObj;
            }
        }
    }

    const notFound = { success: false, syncedLyrics: '', plainLyrics: '', hasDual: false };
    lyricsMemoryCache.set(cacheKey, notFound);
    return notFound;
}

module.exports = {
    fetchLyrics,
    searchLrclib,
    cleanTitle
};
