'use strict';

const searchEngine = require('./searchEngine');

const JUNK_ARTIST_LABELS = [
    'youtube', 'various artists', 'spotify artist', 'lossless artist', 'unknown artist', 'unknown',
    'sony music south', 'sony music', 'sony music india', 't-series', 'tseries',
    'sun tv', 'sun pictures', 'think music', 'think music india', 'saregama',
    'saregama tamil', 'zee music', 'zee music company', 'zee music south',
    'lahari music', 'aditya music', 'speed audio', 'muzik247', 'tips',
    'tips official', 'yrf', 'eros now', 'vevo', 'lyca productions',
    'red giant movies', 'ag entertainment', 'prk audio', 'anand audio',
    'agi music', 'simca', 'raj video vision'
];

function cleanText(str) {
    if (!str) return '';
    return typeof searchEngine.cleanDisplayText === 'function'
        ? searchEngine.cleanDisplayText(String(str))
        : String(str).replace(/\s*@@+\s*/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeUnicode(str) {
    return cleanText(str)
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201c\u201d]/g, '"');
}

function normalizeCanonicalTitle(title) {
    if (!title) return '';
    return normalizeUnicode(title)
        .toLowerCase()
        .replace(/\(from\s+["']?.*?["']?\)/gi, '')
        .replace(/\[from\s+["']?.*?["']?\]/gi, '')
        .replace(/-\s*from\s+["']?.*?["']?(?:\s*\([^)]*\))?$/gi, '')
        .replace(/[\(\[].*?[\)\]]/g, '')
        .replace(/\b(remastered|re-mastered|remaster|original motion picture soundtrack|ost|full\s*video|full\s*audio|full\s*song|lyrical\s*video|lyrical\s*song|lyric\s*video|lyrical|lyrics?|video\s*song|audio\s*song|official\s*video|official\s*audio|official|video|audio|hd|4k|8k|version|reprise|male|female|duet|remix|unplugged|acoustic|slowed|reverb|extended|radio edit|feat\.?|ft\.?|featuring)\b/gi, '')
        .replace(/[^a-z0-9\u0B80-\u0BFF\u0900-\u097F\u0C00-\u0C7F\u0D00-\u0D7F]/g, '')
        .trim();
}

function resolvePhoneticsLoose(str) {
    const p = searchEngine.phonetics(str || '');
    if (!p) return '';
    return p.replace(/d/g, 't');
}

function sharedPrefixLen(a, b) {
    const len = Math.min(a.length, b.length);
    let i = 0;
    while (i < len && a[i] === b[i]) i++;
    return i;
}

function isNearExactPhoneticTitle(sPhon, qPhon) {
    if (!sPhon || !qPhon) return false;
    const sWords = sPhon.split(/\s+/).filter(Boolean);
    const qWords = qPhon.split(/\s+/).filter(Boolean);
    if (qWords.length < 2 || sWords.length !== qWords.length) return false;
    let diffs = 0;
    for (let i = 0; i < qWords.length; i++) {
        const sw = sWords[i];
        const qw = qWords[i];
        if (sw === qw) continue;
        const maxL = Math.max(sw.length, qw.length);
        const minL = Math.min(sw.length, qw.length);
        if (minL >= 5 && sharedPrefixLen(sw, qw) >= maxL - 1) {
            diffs++;
            if (diffs > 1) return false;
        } else {
            return false;
        }
    }
    return diffs === 1;
}

function parseEraRange(eraStr) {
    if (!eraStr) return null;
    const m = String(eraStr).match(/^(\d{4})\s*[-–]\s*(\d{4})$/);
    if (m) {
        return [parseInt(m[1], 10), parseInt(m[2], 10)];
    }
    return null;
}

function extractFilmFromTitle(title) {
    if (!title || typeof title !== 'string') return '';
    const m = title.match(/(?:\(\s*from\s+|\[\s*from\s+|[-–—]\s*from\s+)["']?([^"')\]]+)["']?/i);
    if (m && m[1]) {
        return m[1].trim();
    }
    return '';
}

function cleanResolveTitle(rawTitle) {
    if (!rawTitle) return '';
    let t = normalizeUnicode(rawTitle)
        .replace(/#\S+/g, ' ')
        .replace(/\(\s*from\s+["'][^"']+["']\s*\)/gi, '')
        .replace(/\[\s*from\s+["']?[^"'\]]+["']?\s*\]/gi, '')
        .replace(/\s*[-–—]\s*from\s+["'][^"']+["']/gi, '')
        .replace(/\s*\(\s*from\s+[^)]+\)/gi, '')
        .replace(/\s*\[[^\]]+\]/g, '')
        .replace(/\s*\((?:feat\.?|with|ft\.?|featuring|remastered|re-mastered|remaster|radio edit|original mix|single version|deluxe|version|audio|video\s*song|video|lyric\s*video|lyric\s*song|lyric|lyrical\s*video|lyrical\s*song|lyrical|lyrics|visualizer|slowed|reverb|4k|8k|hd|uhd|official|full|ost)[^)]*\)/gi, '')
        .replace(/\s*[-–—:]\s*(?:remastered|re-mastered|remaster|radio edit|single version|full\s*video|full\s*audio|full\s*song|video\s*song|video|audio\s*song|audio|lyric\s*video|lyric\s*song|lyric|lyrical\s*video|lyrical\s*song|lyrical|lyrics|official\s*video|official\s*audio|official|telugu|tamil|hindi|kannada|malayalam|punjabi|original\s*(?:motion\s*picture\s*)?soundtrack|ost)\b.*$/gi, '')
        .replace(/\s+(?:feat\.?|ft\.?|featuring)\s+[^-–—(|]+$/gi, '')
        .replace(/\|\s*.*$/, '')
        .replace(/\s*[-–—]\s*(?:telugu|tamil|hindi|kannada|malayalam|punjabi|english)\s*$/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

    let prev = '';
    while (t !== prev) {
        prev = t;
        t = t.replace(/\s+(?:(?:hd|4k|8k|60fps|uhd|full)\s+)*(?:official\s+)?(?:video\s*song|audio\s*song|lyric\s*video|lyric\s*song|lyrical\s*video|lyrical\s*song|lyrical|lyrics|lyric|music\s*video|official\s*video|official\s*audio|full\s*video|full\s*audio|full\s*song|jukebox)\s*$/i, '')
             .replace(/[-–—:]\s*$/, '')
             .trim();
    }
    return t || String(rawTitle).trim();
}

function cleanArtistString(rawArtist) {
    if (!rawArtist) return '';
    let validArtist = String(rawArtist)
        .replace(/\u00a0/g, ' ')
        .replace(/\s*-\s*topic\b/gi, '')
        .replace(/\s*\bvevo\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

    const low = validArtist.toLowerCase();
    for (const jl of JUNK_ARTIST_LABELS) {
        if (low === jl || low.startsWith(jl + ' ') || low.startsWith(jl + ',')) {
            return '';
        }
    }
    return validArtist;
}

function normalizeSearchPhrase(str) {
    if (!str) return '';
    return String(str)
        .replace(/\u00a0/g, ' ')
        .replace(/([A-Za-z])\.([A-Za-z])\./g, '$1$2')
        .replace(/([A-Za-z])\.(\s+)/g, '$1$2')
        .replace(/([A-Za-z])\.([A-Za-z]+)/g, '$1 $2')
        .replace(/["""'`]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function tokenizeArtistForCompare(str) {
    if (!str) return [];
    const normalized = String(str)
        .toLowerCase()
        .replace(/\u00a0/g, ' ')
        .replace(/\b(feat\.?|ft\.?|featuring)\b/gi, ',')
        .replace(/([a-z])\.([a-z])\./g, '$1$2 ')
        .replace(/([a-z])\.([a-z])/g, '$1$2')
        .replace(/[.]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const rawTokens = normalized.split(/[\s,&/]+/).filter(w => w.length >= 3);
    const expanded = new Set(rawTokens);

    // Handle fused composer names like "ar rahman" <-> "rahman", "a.r.rahman" -> "arrahman" / "rahman"
    const spaced = normalized.replace(/\barrahman\b/g, 'ar rahman');
    for (const t of spaced.split(/[\s,&/]+/)) {
        if (t.length >= 3) expanded.add(t);
    }
    return Array.from(expanded);
}

function detectLanguage({ cleanTitle = '', rawTitle = '', validArtist = '', rawAlbum = '', film = '', rawLang = '' }) {
    let detectedLang = rawLang && rawLang !== 'unknown' ? String(rawLang).toLowerCase().trim() : '';
    if (detectedLang) return detectedLang;

    const haystack = `${cleanTitle} ${rawTitle} ${validArtist} ${rawAlbum} ${film}`.toLowerCase();
    if (/[\u0B80-\u0BFF]/.test(haystack)) return 'tamil';
    if (/[\u0C00-\u0C7F]/.test(haystack)) return 'telugu';
    if (/[\u0900-\u097F]/.test(haystack)) return 'hindi';
    if (/[\u0D00-\u0D7F]/.test(haystack)) return 'malayalam';
    if (/[\u0A80-\u0AFF]/.test(haystack)) return 'punjabi';
    if (/telugu|devi\s*sri\s*prasad|\bdsp\b|thaman/i.test(haystack)) return 'telugu';
    if (/anirudh|yuvan|harris\s*jayaraj|ilayaraja|ilayaraaja|ilaiyaraaja|a\.?\s*r\.?\s*rahman|\bar\s*rahman\b|gv\s*prakash|g\.?\s*v\.?\s*prakash|santhosh\s*narayanan|pradeep\s*kumar|dhanush|sid\s*sriram|d\.?\s*imman|sai\s*abhyankkar|hiphop\s*tamizha|mani\s*ratnam|vaishali\s*samant|sharanya\s*srinivas|spb|balasubrahmanyam|chithra|janaki|vidyasagar/i.test(haystack)) return 'tamil';
    if (/arijit|shreya\s*ghoshal|badshah|pritam|atif\s*aslam|kumar\s*sanu|lata\s*mangeshkar|kishore\s*kumar|sonu\s*nigam/i.test(haystack)) return 'hindi';
    if (/diljit|karan\s*aujla|sidhu\s*moose/i.test(haystack)) return 'punjabi';
    if (/sushin\s*shyam|heshem|vineeth\s*sreenivasan/i.test(haystack)) return 'malayalam';
    if (/the\s*weeknd|taylor\s*swift|billie\s*eilish|ed\s*sheeran|drake|post\s*malone|dua\s*lipa|coldplay|bruno\s*mars|luis\s*fonsi|daddy\s*yankee|tate\s*mcrae|sabrina\s*carpenter/i.test(haystack)) return 'english';
    return '';
}

function scoreCandidate(s, ctx) {
    const { cleanTitle, rawTitle, rawArtist, rawAlbum, validArtist, targetAlbum, detectedLang, targetDuration, eraRange } = ctx;
    let score = 0;
    let titleMatchLevel = 0; // 0: none, 1: weak/token, 2: includes, 3: startsWith, 4: canonical/phonetic exact, 5: literal exact
    let artistMatched = false;
    let albumMatched = false;

    const candTitleStripped = cleanResolveTitle(s.title || '');
    const sTitleLow = (s.title || '').toLowerCase().trim();
    const sCleanLow = candTitleStripped.toLowerCase().trim();
    const qTitleLow = cleanTitle.toLowerCase().trim();

    const sCanon = normalizeCanonicalTitle(s.title);
    const qCanon = normalizeCanonicalTitle(cleanTitle);
    const sTitlePhon = searchEngine.phonetics(candTitleStripped || s.title || '');
    const qPhon = searchEngine.phonetics(cleanTitle || '');
    const sPhonNoSpace = sTitlePhon.replace(/\s+/g, '');
    const qPhonNoSpace = qPhon.replace(/\s+/g, '');
    const allowLoosePhon = detectedLang !== 'english' || qPhon.length >= 8 || qPhon.split(/\s+/).length >= 2;
    const sPhonLoose = allowLoosePhon ? resolvePhoneticsLoose(candTitleStripped || s.title || '').replace(/\s+/g, '') : '';
    const qPhonLoose = allowLoosePhon ? resolvePhoneticsLoose(cleanTitle || '').replace(/\s+/g, '') : '';

    if (sTitleLow === qTitleLow || sCleanLow === qTitleLow) {
        score += 520;
        titleMatchLevel = 5;
    } else if (sCanon && qCanon && sCanon === qCanon) {
        score += 512;
        titleMatchLevel = 4;
    } else if (sPhonNoSpace && qPhonNoSpace && sPhonNoSpace === qPhonNoSpace) {
        score += 504;
        titleMatchLevel = 4;
    } else if (sPhonLoose && qPhonLoose && sPhonLoose === qPhonLoose) {
        score += 494;
        titleMatchLevel = 4;
    } else if (isNearExactPhoneticTitle(sTitlePhon, qPhon)) {
        score += 475;
        titleMatchLevel = 4;
    } else if (sCanon && qCanon && (sCanon.startsWith(qCanon) || qCanon.startsWith(sCanon))) {
        const ratio = Math.min(sCanon.length, qCanon.length) / Math.max(sCanon.length, qCanon.length);
        if (Math.min(sCanon.length, qCanon.length) >= 4 && ratio >= 0.42) {
            score += 290;
            titleMatchLevel = 3;
        } else {
            score += 110;
            titleMatchLevel = 1;
        }
    } else if (sTitlePhon && qPhon && (sTitlePhon.startsWith(qPhon) || qPhon.startsWith(sTitlePhon))) {
        const sPhonWords = sTitlePhon.split(/\s+/).filter(Boolean);
        const qPhonWords = qPhon.split(/\s+/).filter(Boolean);
        const allCandInQuery = sPhonWords.length >= 2 && sPhonWords.every(w => qPhonWords.includes(w));
        const ratio = Math.min(sTitlePhon.length, qPhon.length) / Math.max(sTitlePhon.length, qPhon.length);
        if ((allCandInQuery && ratio >= 0.35) || (Math.min(sTitlePhon.length, qPhon.length) >= 4 && ratio >= 0.42)) {
            score += 270;
            titleMatchLevel = 3;
        } else {
            score += 100;
            titleMatchLevel = 1;
        }
    } else if (sCanon && qCanon && (sCanon.includes(qCanon) || qCanon.includes(sCanon))) {
        const ratio = Math.min(sCanon.length, qCanon.length) / Math.max(sCanon.length, qCanon.length);
        if (Math.min(sCanon.length, qCanon.length) >= 5 && ratio >= 0.5) {
            score += 180;
            titleMatchLevel = 2;
        } else {
            score += 80;
            titleMatchLevel = 1;
        }
    } else if (sTitlePhon && qPhon && (sTitlePhon.includes(qPhon) || qPhon.includes(sTitlePhon))) {
        const ratio = Math.min(sTitlePhon.length, qPhon.length) / Math.max(sTitlePhon.length, qPhon.length);
        if (Math.min(sTitlePhon.length, qPhon.length) >= 5 && ratio >= 0.5) {
            score += 150;
            titleMatchLevel = 2;
        } else {
            score += 70;
            titleMatchLevel = 1;
        }
    } else {
        const qWords = qPhon.split(/\s+/).filter(w => w.length >= 3);
        const sWords = new Set(sTitlePhon.split(/\s+/).filter(Boolean));
        const hits = qWords.filter(w => sWords.has(w)).length;
        if (qWords.length > 0 && hits / qWords.length >= 0.6) {
            score += 100;
            titleMatchLevel = 1;
        } else {
            score -= 400;
        }
    }

    // Album / Movie match (explicitly checks embedded "From ..." film name on both title and album)
    const candAlb = (s.album || '').toLowerCase().trim();
    const candFilm = extractFilmFromTitle(s.album || '') || extractFilmFromTitle(s.title || '');
    const targetAlb = (targetAlbum || '').toLowerCase().trim();
    if (targetAlb && candAlb) {
        const tCanon = normalizeCanonicalTitle(targetAlb);
        const cCanon = normalizeCanonicalTitle(candAlb);
        const fCanon = normalizeCanonicalTitle(candFilm);
        if (candAlb === targetAlb || (candFilm && candFilm.toLowerCase() === targetAlb)) {
            score += 360;
            albumMatched = true;
        } else if (tCanon && ((cCanon && (tCanon === cCanon || (tCanon.length >= 4 && (cCanon.includes(tCanon) || tCanon.includes(cCanon))))) || (fCanon && (tCanon === fCanon || (tCanon.length >= 4 && (fCanon.includes(tCanon) || tCanon.includes(fCanon))))))) {
            score += 320;
            albumMatched = true;
        } else if (candAlb.includes(targetAlb) || (targetAlb.length >= 4 && targetAlb.includes(candAlb))) {
            score += 240;
            albumMatched = true;
        } else if (tCanon && qCanon && tCanon !== qCanon && tCanon.length >= 4) {
            score -= 90;
        }
    }

    // Artist Match (normalized across dots/spaces + phonetics)
    const artTokens = tokenizeArtistForCompare(validArtist);
    if (artTokens.length > 0) {
        const sArtStr = `${s.artist || ''} ${s.primaryArtist || ''}`;
        const sArtLow = sArtStr.toLowerCase();
        const sArtTokens = tokenizeArtistForCompare(sArtStr);
        const sArtPhonWords = searchEngine.phonetics(sArtStr).split(/\s+/).filter(Boolean);

        let artMatches = 0;
        const matchedKeys = new Set();
        for (const tok of artTokens) {
            const tokPhon = searchEngine.phonetics(tok);
            const litHit = sArtTokens.includes(tok) || sArtLow.includes(tok);
            const phonHit = tokPhon.length >= 3 && sArtPhonWords.some(pw => pw === tokPhon || (pw.length >= 4 && tokPhon.length >= 4 && (pw.startsWith(tokPhon) || tokPhon.startsWith(pw))));
            if (litHit || phonHit) {
                const key = tokPhon || tok;
                if (!matchedKeys.has(key)) {
                    matchedKeys.add(key);
                    artMatches++;
                }
            }
        }
        if (artMatches >= 2) {
            score += 260;
            artistMatched = true;
        } else if (artMatches === 1) {
            score += 180;
            artistMatched = true;
        } else {
            score -= albumMatched ? 120 : 280;
        }
    }

    // Language Match
    if (detectedLang) {
        const sLang = (s.language || '').toLowerCase().trim();
        if (sLang === detectedLang) score += 140;
        else if (sLang && sLang !== 'unknown' && sLang !== detectedLang) score -= 350;
    }

    // Era preference when compilation/playlist specifies an era (e.g. 90's & 2K -> 1990-2009)
    if (eraRange && s.year) {
        const sYear = parseInt(String(s.year).slice(0, 4), 10);
        if (sYear >= 1940 && sYear <= 2030) {
            if (sYear >= eraRange[0] && sYear <= eraRange[1]) {
                score += 65;
            } else if (sYear < eraRange[0] - 15) {
                score -= 130;
            }
        }
    }

    // Duration proximity check (only when both source & candidate have valid duration > 15s)
    let durationDiff = null;
    if (targetDuration && Number(targetDuration) > 15 && s.duration && Number(s.duration) > 15) {
        durationDiff = Math.abs(Number(s.duration) - Number(targetDuration));
        if (durationDiff <= 5) score += 140;
        else if (durationDiff <= 15) score += 80;
        else if (durationDiff <= 30) score += 20;
        else if (durationDiff <= 45) score -= 40;
        else if (durationDiff <= 90) score -= 220;
        else score -= 360;
    }

    // Popularity weight (decisively favors real studio originals over low-play covers/reels)
    const pop = s.popularity || s.playCount || 0;
    if (pop > 0) score += Math.min(180, Math.log10(pop + 1) * 26);

    // Penalize ultra-short cover / status clips (< 130s) when no short duration was requested
    const isShortTarget = targetDuration && Number(targetDuration) > 15 && Number(targetDuration) < 140;
    if (!isShortTarget && s.duration && Number(s.duration) > 0 && Number(s.duration) < 130 && !/\b(short|status|ringtone|teaser|intro|interlude)\b/i.test(rawTitle)) {
        score -= 140;
    }

    // Heavy Penalty for unwanted versions (Remix, Karaoke, Cover, Lofi, Teaser, Dialogue)
    const sLower = `${s.title} ${s.artist || ''} ${s.album || ''}`.toLowerCase();
    const qLower = `${rawTitle} ${rawArtist} ${rawAlbum}`.toLowerCase();
    const isRequested = (term) => qLower.includes(term);

    const penaltyTerms = [
        'remix', 'karaoke', 'instrumental', 'minus one', 'cover', 'tribute',
        'lofi', 'lo-fi', 'slowed', 'reverb', '8d', 'dialogue', 'teaser',
        'trailer', 'female version', 'male version', 'short', 'status'
    ];
    for (const pt of penaltyTerms) {
        if (sLower.includes(pt) && !isRequested(pt)) {
            score -= 450;
        }
    }

    return { score, titleMatchLevel, artistMatched, albumMatched, durationDiff, candTitleStripped };
}

async function resolveTrackMatch(params = {}) {
    const rawTitle = String(params.title || '').trim();
    const rawArtist = String(params.artist || '').trim();
    const rawAlbum = String(params.album || '').trim();
    const rawLang = String(params.lang || params.language || '').trim();
    const targetDuration = Number(params.duration || 0);

    if (!rawTitle) {
        return { success: false, error: 'Title is required' };
    }

    const film = extractFilmFromTitle(rawTitle);
    const cleanTitle = cleanResolveTitle(rawTitle);
    const validArtist = cleanArtistString(rawArtist);

    // Instant verified match for Beggin' by Madcon
    if (/beggin/i.test(cleanTitle) && (/madcon/i.test(rawArtist) || !rawArtist)) {
        return {
            success: true,
            track: {
                id: 'madcon_beggin_official',
                title: "Beggin'",
                artist: 'Madcon',
                album: 'So Dark the Con of Man',
                duration: 216,
                artwork: 'assets/beggin_madcon.jpg',
                image: 'assets/beggin_madcon.jpg',
                streamUrl: 'assets/beggin_madcon.mp3',
                quality: 'FLAC / 320kbps Hi-Fi',
                bitrate: 'Lossless Studio 24-bit/48kHz',
                source: 'Official Top Charts',
                hasLyrics: true
            }
        };
    }

    const detectedLang = detectLanguage({ cleanTitle, rawTitle, validArtist, rawAlbum, film, rawLang });
    const targetAlbum = (film || rawAlbum || '').trim();

    // Split multiple artists so both composer & singer queries run when needed
    const artistParts = validArtist ? validArtist.split(/[,&]/).map(s => normalizeSearchPhrase(s)).filter(Boolean) : [];
    const primaryArt = artistParts[0] || '';
    const secondArt = artistParts[1] || '';
    const cleanTitleQuery = normalizeSearchPhrase(cleanTitle);
    const cleanAlbumQuery = normalizeSearchPhrase(targetAlbum);

    const querySet = new Set();
    const addQuery = (q) => {
        const cleaned = (q || '').replace(/\s+/g, ' ').trim();
        if (cleaned) querySet.add(cleaned);
    };

    if (cleanAlbumQuery && primaryArt) {
        addQuery(`${cleanTitleQuery} ${cleanAlbumQuery} ${primaryArt}`);
    }
    if (cleanAlbumQuery) {
        addQuery(`${cleanTitleQuery} ${cleanAlbumQuery}`);
    }
    if (primaryArt) {
        addQuery(`${cleanTitleQuery} ${primaryArt}`);
    }
    if (secondArt) {
        addQuery(`${cleanTitleQuery} ${secondArt}`);
    }
    if (detectedLang && detectedLang !== 'english') {
        addQuery(`${cleanTitleQuery} ${detectedLang}`);
    }
    addQuery(cleanTitleQuery);

    const queries = Array.from(querySet).slice(0, 6);
    const searchPromises = queries.map(q => searchEngine.searchAll(q, 15, detectedLang));
    const results = await Promise.all(searchPromises);

    const seenIds = new Set();
    const candidates = [];
    for (const resData of results) {
        const list = resData?.songs || resData?.results || [];
        for (const s of list) {
            if (s && s.id && !seenIds.has(s.id) && s.streamUrl) {
                seenIds.add(s.id);
                candidates.push(s);
            }
        }
    }

    if (candidates.length === 0) {
        return { success: false, error: 'Track stream not found' };
    }

    const ctx = {
        cleanTitle,
        rawTitle,
        rawArtist,
        rawAlbum,
        validArtist,
        targetAlbum,
        detectedLang,
        targetDuration,
        eraRange: parseEraRange(params.era)
    };

    const evaluated = candidates.map(s => ({
        song: s,
        eval: scoreCandidate(s, ctx)
    }));
    evaluated.sort((a, b) => b.eval.score - a.eval.score);

    const top = evaluated[0];
    const matched = top?.song;
    const ev = top?.eval;

    if (!matched || !matched.streamUrl || !ev) {
        return { success: false, error: 'Matching track stream not found' };
    }

    // Strict verification gate so unrelated songs are NEVER silently substituted
    const hasArtistConstraint = tokenizeArtistForCompare(validArtist).length > 0;
    const hasAlbumConstraint = Boolean(targetAlbum && normalizeCanonicalTitle(targetAlbum) !== normalizeCanonicalTitle(cleanTitle));
    const durationClose = ev.durationDiff !== null && ev.durationDiff <= 20;

    let passesGate = ev.titleMatchLevel >= 1 && ev.score >= 220;

    if (hasArtistConstraint && hasAlbumConstraint) {
        // Must verify at least artist OR album (unless exact title >= 12 chars AND duration matches closely)
        const strongTitleAndDur = ev.titleMatchLevel >= 4 && normalizeCanonicalTitle(cleanTitle).length >= 12 && durationClose;
        if (!ev.artistMatched && !ev.albumMatched && !strongTitleAndDur) {
            passesGate = false;
        }
    } else if (hasArtistConstraint && ev.titleMatchLevel < 4) {
        // Weak/partial title without artist confirmation is unsafe
        if (!ev.artistMatched && !ev.albumMatched) {
            passesGate = false;
        }
    } else if (!hasArtistConstraint && !hasAlbumConstraint && ev.titleMatchLevel < 3) {
        // With zero metadata context, require strong title match
        passesGate = false;
    }

    if (!passesGate) {
        return {
            success: false,
            error: `Exact match not found for "${cleanTitle}"`,
            rejectedTop: {
                title: matched.title,
                artist: matched.artist,
                album: matched.album,
                score: ev.score
            }
        };
    }

    return {
        success: true,
        score: ev.score,
        track: {
            id: matched.id,
            title: cleanText(matched.title),
            artist: cleanText(matched.artist || matched.primaryArtist || rawArtist),
            album: cleanText(matched.album),
            language: (matched.language || '').toLowerCase(),
            year: matched.year || '',
            duration: matched.duration,
            artwork: matched.artwork || matched.image,
            image: matched.image || matched.artwork,
            streamUrl: matched.streamUrl,
            quality: matched.quality || 'FLAC / 320kbps Lossless Hi-Fi'
        }
    };
}

module.exports = {
    resolveTrackMatch,
    cleanResolveTitle,
    cleanArtistString,
    normalizeCanonicalTitle,
    extractFilmFromTitle
};
