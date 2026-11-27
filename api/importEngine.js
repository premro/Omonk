const https = require('https');
const http = require('http');
const resolveEngine = require('./resolveEngine');

function isSafeExternalHttpUrl(rawUrl) {
    try {
        const parsed = new URL(String(rawUrl || ''));
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
        const host = (parsed.hostname || '').replace(/^\[|\]$/g, '').toLowerCase();
        if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
            return false;
        }
        const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
        if (ipv4) {
            const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
            if (a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) {
                return false;
            }
        }
        if (host === '::1' || host.startsWith('fe80:') || host.startsWith('fc') || host.startsWith('fd')) return false;
        return true;
    } catch (e) {
        return false;
    }
}

function cleanImportText(str) {
    if (typeof str !== 'string') return '';
    let s = str.replace(/\u00a0/g, ' ');
    if (s.includes('&')) {
        const map = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&#039;': "'", '&apos;': "'", '&nbsp;': ' ' };
        s = s
            .replace(/&(amp|lt|gt|quot|apos|nbsp|#0*39);/gi, (m) => map[m.toLowerCase()] || m)
            .replace(/&#(\d+);/g, (_, code) => {
                const n = parseInt(code, 10);
                return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : _;
            })
            .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
                const n = parseInt(hex, 16);
                return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : _;
            });
    }
    return s.replace(/\s*@@+\s*/g, ' ').replace(/\s+/g, ' ').trim();
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

function fetchJson(url, maxRedirects = 4) {
    return new Promise((resolve) => {
        if (!url || maxRedirects < 0 || !isSafeExternalHttpUrl(url)) return resolve(null);
        try {
            const parsed = new URL(url);
            if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return resolve(null);
            const mod = parsed.protocol === 'https:' ? https : http;
            const req = mod.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)',
                    'Accept': 'application/json, text/plain, */*'
                }
            }, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    res.resume();
                    let nextUrl = res.headers.location;
                    try { nextUrl = new URL(nextUrl, url).href; } catch (e) { return resolve(null); }
                    if (!isSafeExternalHttpUrl(nextUrl)) return resolve(null);
                    return resolve(fetchJson(nextUrl, maxRedirects - 1));
                }
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

function fetchText(url, maxRedirects = 5, customHeaders = {}) {
    return new Promise((resolve) => {
        if (!url || maxRedirects < 0 || !isSafeExternalHttpUrl(url)) return resolve('');
        try {
            const parsed = new URL(url);
            if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return resolve('');
            const mod = parsed.protocol === 'https:' ? https : http;
            const req = mod.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    ...customHeaders
                }
            }, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    res.resume();
                    let nextUrl = res.headers.location;
                    try { nextUrl = new URL(nextUrl, url).href; } catch (e) { return resolve(''); }
                    if (!isSafeExternalHttpUrl(nextUrl)) return resolve('');
                    return resolve(fetchText(nextUrl, maxRedirects - 1, customHeaders));
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

function normAlphaNum(str) {
    if (!str) return '';
    return String(str).toLowerCase().replace(/[^a-z0-9]/g, '');
}

const KNOWN_ARTIST_PATTERNS = [
    { key: 'a.r. rahman', norm: 'arrahman', display: 'A.R. Rahman' },
    { key: 'anirudh ravichander', norm: 'anirudh', display: 'Anirudh Ravichander' },
    { key: 'ilaiyaraaja', norm: 'ilayara', display: 'Ilayaraaja' },
    { key: 'yuvan shankar raja', norm: 'yuvanshankar', display: 'Yuvan Shankar Raja' },
    { key: 'yuvan', norm: 'yuvan', exactWord: true, display: 'Yuvan Shankar Raja' },
    { key: 'harris jayaraj', norm: 'harrisjayaraj', display: 'Harris Jayaraj' },
    { key: 'pradeep kumar', norm: 'pradeepkumar', display: 'Pradeep Kumar' },
    { key: 'sid sriram', norm: 'sidsriram', display: 'Sid Sriram' },
    { key: 's.p. balasubrahmanyam', norm: 'spbalasubrahmanyam', display: 'S.P. Balasubrahmanyam' },
    { key: 'spb', norm: 'spb', exactWord: true, display: 'S.P. Balasubrahmanyam' },
    { key: 'dhanush', norm: 'dhanush', exactWord: true },
    { key: 'the weeknd', norm: 'theweeknd' },
    { key: 'taylor swift', norm: 'taylorswift' },
    { key: 'dua lipa', norm: 'dualipa' },
    { key: 'justin bieber', norm: 'justinbieber' },
    { key: 'ed sheeran', norm: 'edsheeran' },
    { key: 'billie eilish', norm: 'billieeilish' },
    { key: 'bad bunny', norm: 'badbunny' },
    { key: 'luis fonsi', norm: 'luisfonsi' },
    { key: 'daddy yankee', norm: 'daddyyankee' },
    { key: 's.a. rajkumar', norm: 'sarajkumar' },
    { key: 'deva', norm: 'deva', exactWord: true },
    { key: 'vidyasagar', norm: 'vidyasagar' },
    { key: 'd. imman', norm: 'dimman' },
    { key: 'imman', norm: 'imman', exactWord: true },
    { key: 'santhosh narayanan', norm: 'santhoshnarayanan' },
    { key: 'sushin shyam', norm: 'sushinshyam' },
    { key: 'devi sri prasad', norm: 'devisriprasad' },
    { key: 'dsp', norm: 'dsp', exactWord: true },
    { key: 'thaman', norm: 'thaman', exactWord: true },
    { key: 'g.v. prakash', norm: 'gvprakash' },
    { key: 'hiphop tamizha', norm: 'hiphoptamizha' },
    { key: 'shreya ghoshal', norm: 'shreyaghoshal' },
    { key: 'arijit singh', norm: 'arijitsingh' },
    { key: 'arijit', norm: 'arijit', exactWord: true },
    { key: 'karan aujla', norm: 'karanaujla' },
    { key: 'diljit dosanjh', norm: 'diljitdosanjh' },
    { key: 'badshah', norm: 'badshah', exactWord: true },
    { key: 'pritam', norm: 'pritam', exactWord: true },
    { key: 'neha kakkar', norm: 'nehakakkar' },
    { key: 'atif aslam', norm: 'atifaslam' },
    { key: 's. janaki', norm: 'sjanaki' },
    { key: 'k.s. chithra', norm: 'kschithra' },
    { key: 'chithra', norm: 'chithra', exactWord: true },
    { key: 'k.j. yesudas', norm: 'kjyesudas' },
    { key: 'hariharan', norm: 'hariharan', exactWord: true },
    { key: 'shankar mahadevan', norm: 'shankarmahadevan' },
    { key: 'vijay antony', norm: 'vijayantony' },
    { key: 'sai abhyankkar', norm: 'saiabhyankkar' },
    { key: 'sam c.s.', norm: 'samcs' },
    { key: 'sabrina carpenter', norm: 'sabrinacarpenter' },
    { key: 'bruno mars', norm: 'brunomars' },
    { key: 'post malone', norm: 'postmalone' },
    { key: 'drake', norm: 'drake', exactWord: true },
    { key: 'coldplay', norm: 'coldplay', exactWord: true },
    { key: 'madcon', norm: 'madcon', exactWord: true },
    { key: 'tame impala', norm: 'tameimpala' },
    { key: 'olivia rodrigo', norm: 'oliviarodrigo' },
    { key: 'ariana grande', norm: 'arianagrande' },
    { key: 'camila cabello', norm: 'camilacabello' },
    { key: 'shawn mendes', norm: 'shawnmendes' },
    { key: 'karol g', norm: 'karolg' },
    { key: 'tate mcrae', norm: 'tatemcrae' },
    { key: 'harry styles', norm: 'harrystyles' },
    { key: 'vaishali samant', norm: 'vaishalisamant' },
    { key: 'sharanya srinivas', norm: 'sharanyasrinivas' }
];

function matchKnownArtist(segment) {
    if (!segment) return '';
    const low = segment.toLowerCase().trim();
    const norm = normAlphaNum(segment);
    if (!norm) return '';
    for (const ka of KNOWN_ARTIST_PATTERNS) {
        if (ka.exactWord) {
            const re = new RegExp(`\\b${ka.key}\\b`, 'i');
            if (re.test(low)) return ka.display || segment.trim();
        } else {
            if (low.includes(ka.key) || norm.includes(ka.norm)) {
                return ka.display || segment.trim();
            }
        }
    }
    return '';
}

const JUNK_CHANNEL_LABELS = [
    'sun tv', 'sun pictures', 'sony music south', 'sony music', 'think music', 'think music india',
    't-series', 'tseries', 'zee music company', 'zee music south', 'zee music', 'saregama', 'saregama tamil',
    'lahari music', 'aditya music', 'speed audio', 'muzik247', 'tips official', 'tips', 'yrf', 'eros now',
    'rajshri', 'speed records', 'white hill music', 'geetha arts', 'lyca productions', 'red giant movies',
    'svf', 'sathya movies', 'ag entertainment', 'prk audio', 'anand audio', 'vevo', 'youtube', 'various artists'
];

const NON_ARTIST_CREW_NORMS = [
    'maniratnam', 'lokeshkanagaraj', 'atlee', 'nelson', 'vetrimaaran', 'gauthamvasudevmenon',
    'shankar', 'subaskaran', 'vijaysethupathi', 'saipallavi', 'rajinikanth', 'kamalhaasan',
    'suriya', 'ajithkumar', 'sivakarthikeyan', 'thalapathyvijay', 'vikram', 'karthi', 'trisha',
    'nayanthara', 'samantha', 'rashmika', 'poojahegde', 'rajamouli', 'ssrajamouli', 'sukumar',
    'prashanthneel', 'trivikram', 'kalyanshankarr', 'kalpathisaghoram', 'udhay', 'lyca', 'madrasTalkies'
].map(s => s.toLowerCase());

function isJunkLabel(str) {
    if (!str) return true;
    const low = String(str).toLowerCase().trim();
    const norm = normAlphaNum(low);
    if (JUNK_CHANNEL_LABELS.some(jl => low === jl || low.startsWith(jl) || (norm && norm === normAlphaNum(jl)))) return true;
    if (/\b(vevo|records|record label|official channel|topic|channel|studios|productions|entertainment|music company)\b/i.test(low)) return true;
    if (/\b(directed by|director|producer|starring|choreography|cinematography|dop|presents)\b/i.test(low)) return true;
    return false;
}

function isCrewOrActorCredit(str) {
    if (!str) return false;
    const norm = normAlphaNum(str);
    return NON_ARTIST_CREW_NORMS.some(n => norm === n);
}

function normalizeAuthorBase(authorName) {
    if (!authorName) return '';
    return normAlphaNum(
        String(authorName)
            .replace(/\s*-\s*topic\b/gi, '')
            .replace(/vevo$/i, '')
            .replace(/\b(official|music|records|channel|audio)\b/gi, '')
    );
}

function cleanTrackName(title) {
    if (!title) return '';
    let t = String(title)
        .replace(/#\S+/g, '')
        .replace(/^\s*\d+[\.\-\)]\s*/, '')
        .replace(/[\(\[\{][^\)\]\}]*(?:remaster|official|audio|video|lyrics?|lyrical|version|4k|8k|hd|uhd|full|jukebox)[^\)\]\}]*[\)\]\}]/gi, '')
        .replace(/\s*[-–—:]\s*(?:(?:hd|4k|8k|60fps|uhd|full\s*hd)\s+)*(?:video\s*song|video|audio\s*song|audio|lyrical\s*video|lyrical\s*song|lyric\s*video|lyric\s*song|lyrical|lyrics?|music\s*video|official\s*video|official\s*audio|official|jukebox|audio\s*jukebox|remastered|status|shorts)\b.*$/gi, '')
        .replace(/\|\s*.*$/, '')
        .replace(/[\(\[\{]\s*[\)\]\}]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    let prev = '';
    while (t !== prev) {
        prev = t;
        t = t.replace(/\s+(?:(?:hd|4k|8k|60fps|uhd|full)\s+)*(?:official\s+)?(?:video\s*song|audio\s*song|lyric\s*video|lyric\s*song|lyrical\s*video|lyrical\s*song|lyrical|lyrics|lyric|music\s*video|official\s*video|official\s*audio|full\s*video|full\s*audio|full\s*song|video|audio|jukebox)\s*$/i, '')
             .replace(/[-–—: ]+$/, '')
             .trim();
    }
    return t;
}

function extractFeaturedFromTitle(text) {
    if (!text) return { clean: '', featured: '' };
    const m = text.match(/^(.*?)\s+(?:ft\.?|feat\.?|featuring)\s+(.+)$/i);
    if (m && m[1].trim() && m[2].trim()) {
        return { clean: m[1].trim(), featured: m[2].replace(/[\(\)\[\]]/g, '').trim() };
    }
    return { clean: text.trim(), featured: '' };
}

function parseYouTubeTitle(rawTitle, authorName = '') {
    const cleanAuthor = !isJunkLabel(authorName) ? String(authorName).replace(/\s*-\s*topic\b/gi, '').trim() : '';
    if (!rawTitle) return { title: 'Unknown Title', artist: cleanAuthor || 'Various Artists', album: '' };

    let clean = String(rawTitle)
        .replace(/#\S+/g, '')
        .replace(/[\(\[\{][^\)\]\}]*(?:remaster|official|audio|video|lyrics?|lyrical|version|4k|8k|hd|uhd|full)[^\)\]\}]*[\)\]\}]/gi, ' ')
        .trim();

    const rawSegments = clean.split(/\s*[|•\/]\s*/).map(s => s.trim()).filter(Boolean);
    const junkRegex = /^(?:(?:hd|4k|8k|60fps|uhd|full\s*hd)\s+)*(?:official\s+)?(?:video\s*song|video|audio\s*song|audio|lyrical\s*video|lyrical\s*song|lyric\s*video|lyric\s*song|lyrical|lyrics?|music\s*video|official\s*video|official\s*audio|official|jukebox|audio\s*jukebox|remastered|status|shorts)$/i;

    const usefulSegments = [];
    for (const seg of rawSegments) {
        let s = seg.replace(/[-–—]\s*(?:(?:hd|4k|8k|60fps|uhd|full\s*hd)\s+)*(?:video\s*song|video|audio\s*song|audio|lyrical\s*video|lyric\s*video|lyrical|lyrics?|official\s*video).*$/i, '').trim();
        s = s.replace(/^(?:(?:hd|4k|8k|60fps|uhd|full\s*hd)\s+)*(?:video\s*song|video|audio\s*song|audio|lyrical\s*video|lyric\s*video|lyrical|lyrics?|official\s*video).*?[-–—]\s*/i, '').trim();
        if (!s || junkRegex.test(s)) continue;
        if (/^[\u0900-\u0D7F\s\p{P}]+$/u.test(s)) continue;
        usefulSegments.push(s);
    }

    let title = '';
    let artist = '';
    let album = '';
    const authBase = normalizeAuthorBase(authorName);

    if (usefulSegments.length === 0) {
        title = cleanTrackName(rawTitle.replace(/[-–—|].*$/, '').trim()) || rawTitle.trim();
        artist = cleanAuthor || 'Various Artists';
    } else if (usefulSegments.length === 1) {
        const seg = usefulSegments[0];
        const dashParts = seg.split(/\s*[-–—]\s*/);
        if (dashParts.length >= 2) {
            const p0 = dashParts[0].trim();
            const p1 = dashParts.slice(1).join(' - ').trim();
            const p0Norm = normAlphaNum(p0);
            const p1Norm = normAlphaNum(p1);

            const p0AuthMatch = authBase && p0Norm && (p0Norm === authBase || authBase.includes(p0Norm) || p0Norm.includes(authBase));
            const p1AuthMatch = authBase && p1Norm && (p1Norm === authBase || authBase.includes(p1Norm) || p1Norm.includes(authBase));
            const p0Known = matchKnownArtist(p0);
            const p1Known = matchKnownArtist(p1);

            if (p0AuthMatch || (p0Known && !p1AuthMatch && !p1Known)) {
                const feat = extractFeaturedFromTitle(p1);
                title = feat.clean;
                artist = feat.featured ? `${p0Known || p0}, ${feat.featured}` : (p0Known || p0);
            } else if (p1AuthMatch || p1Known || /^\s*(?:feat|ft|featuring|singers?|vocals?|composer)\b/i.test(p1)) {
                title = p0;
                artist = p1Known || p1;
            } else if (/\S+\s+(?:feat\.?|ft\.?|featuring)\s+/i.test(p1)) {
                // "Artist - Song Title ft. Guest"
                const feat = extractFeaturedFromTitle(p1);
                title = feat.clean;
                artist = feat.featured ? `${p0}, ${feat.featured}` : p0;
            } else {
                // Default "Song - Artist" unless p1 was cleaned
                title = p0;
                artist = p1;
            }
        } else {
            const feat = extractFeaturedFromTitle(seg);
            title = feat.clean;
            artist = cleanAuthor
                ? (feat.featured ? `${cleanAuthor}, ${feat.featured}` : cleanAuthor)
                : (feat.featured || 'Various Artists');
        }
    } else {
        title = usefulSegments[0];
        const dashInSeg0 = title.split(/\s*[-–—]\s*/);
        if (dashInSeg0.length >= 2) {
            const d0Known = matchKnownArtist(dashInSeg0[0]);
            if (d0Known) {
                artist = d0Known;
                title = dashInSeg0.slice(1).join(' - ').trim();
            } else if (/video|audio|lyric|lyrical|song|full/i.test(dashInSeg0[1])) {
                title = dashInSeg0[0].trim();
            }
        }

        const otherSegments = usefulSegments.slice(1);
        const foundArtists = artist ? [artist] : [];
        for (const seg of otherSegments) {
            const matchedArt = matchKnownArtist(seg);
            if (matchedArt || /\b(singers?|vocals?|composer|music\s*by)\b/i.test(seg)) {
                const artVal = (matchedArt || seg).replace(/^(?:singers?|vocals?|composer|music\s*by)\s*[:\-–—]?\s*/i, '').trim();
                if (artVal && !foundArtists.some(a => normAlphaNum(a) === normAlphaNum(artVal))) {
                    foundArtists.push(artVal);
                }
            } else if (!album && !isJunkLabel(seg) && !isCrewOrActorCredit(seg) && !/\b(directed|starring|dop|producer)\b/i.test(seg)) {
                album = seg;
            }
        }

        if (foundArtists.length > 0) {
            artist = foundArtists.join(', ');
        } else {
            for (const seg of otherSegments) {
                if (seg !== album && !isJunkLabel(seg) && !isCrewOrActorCredit(seg)) {
                    artist = seg;
                    break;
                }
            }
        }

        if (!artist) {
            artist = cleanAuthor || 'Various Artists';
        }
        if (!album && otherSegments.length > 0 && !isJunkLabel(otherSegments[0]) && !isCrewOrActorCredit(otherSegments[0])) {
            const seg0IsArtist = foundArtists.some(a => normAlphaNum(a) === normAlphaNum(otherSegments[0]));
            if (!seg0IsArtist) {
                album = otherSegments[0];
            }
        }
    }

    title = cleanTrackName(title) || cleanTrackName(rawTitle) || title;
    return { title, artist, album };
}

function cleanCreditValue(val) {
    if (!val) return '';
    return String(val)
        .replace(/[\u00a0]/g, ' ')
        .replace(/\s*\|\s*.*$/, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function normalizeComposerName(name) {
    if (!name) return '';
    const known = matchKnownArtist(name);
    if (known) return known;
    return name.trim();
}

function extractCreditsFromDescription(descText) {
    const credits = { song: '', album: '', artist: '', composer: '', singers: '', language: '' };
    if (!descText || typeof descText !== 'string') return credits;

    const text = descText.replace(/\\n/g, '\n');
    const lines = text.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);

    // Format 1: Auto-generated "Provided to YouTube by ..." Topic descriptions
    if (/provided to youtube by/i.test(text)) {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.includes(' · ')) {
                const parts = line.split(/\s*·\s*/).map(p => p.trim()).filter(Boolean);
                if (parts.length >= 2) {
                    credits.song = cleanTrackName(parts[0]) || parts[0];
                    credits.artist = parts.slice(1).join(', ');
                    for (let j = i + 1; j < Math.min(lines.length, i + 4); j++) {
                        const nxt = lines[j];
                        if (!/^(?:auto-generated|℗|©|released\s+on|lyricist|composer|producer|music\s+publisher|http)/i.test(nxt)) {
                            credits.album = cleanCreditValue(nxt);
                            break;
                        }
                    }
                    return credits;
                }
            }
        }
    }

    // Format 2: Structured Label Credits ("Movie:", "Song:", "Music:", "Singers:")
    for (const line of lines) {
        if (line.length > 140 || /https?:\/\//i.test(line)) continue;
        let m;
        if (!credits.song && (m = line.match(/^(?:song|track|title|song\s*title|track\s*name|single)\s*(?:\([^)]*\))?\s*[:\-–—]\s*(.+)$/i))) {
            credits.song = cleanTrackName(cleanCreditValue(m[1])) || cleanCreditValue(m[1]);
        } else if (!credits.album && (m = line.match(/^(?:movie|film|album|movie\s*name|album\s*name|soundtrack|ost)\s*(?:\([^)]*\))?\s*[:\-–—]\s*(.+)$/i))) {
            credits.album = cleanCreditValue(m[1]);
        } else if (!credits.composer && (m = line.match(/^(?:music|music\s*director|music\s*by|composer|composed\s*by)\s*(?:\([^)]*\))?\s*[:\-–—]\s*(.+)$/i))) {
            const rawComp = cleanCreditValue(m[1]);
            if (rawComp && !isJunkLabel(rawComp)) {
                credits.composer = normalizeComposerName(rawComp);
            }
        } else if (!credits.singers && (m = line.match(/^(?:singers?|vocals?|sung\s*by|artists?|performed\s*by|vocals?\s*&\s*music)\s*(?:\([^)]*\))?\s*[:\-–—]\s*(.+)$/i))) {
            const rawSing = cleanCreditValue(m[1]);
            if (rawSing && !isJunkLabel(rawSing)) {
                credits.singers = rawSing;
            }
        } else if (!credits.language && (m = line.match(/^language\s*[:\-–—]\s*(.+)$/i))) {
            credits.language = cleanCreditValue(m[1]).toLowerCase();
        }
    }

    const mergedArtists = [];
    const seenArtNorm = new Set();
    const addArtistChunk = (str) => {
        if (!str) return;
        for (const piece of str.split(/\s*[,&\/]\s*/)) {
            const cleaned = normalizeComposerName(piece);
            const norm = normAlphaNum(cleaned);
            if (cleaned && norm && !seenArtNorm.has(norm) && !isJunkLabel(cleaned)) {
                seenArtNorm.add(norm);
                mergedArtists.push(cleaned);
            }
        }
    };
    addArtistChunk(credits.composer);
    addArtistChunk(credits.singers);
    credits.artist = mergedArtists.join(', ');

    return credits;
}

function isCompilationTitle(t) {
    if (!t) return false;
    return /\b(jukebox|collection|hits|melody|melodies|back\s*to\s*back|non[\s-]*stop|mashup|medley|evergreen|best\s*of|top\s*\d+|songs?\s*playlist|audio\s*jukebox|love\s*songs|golden\s*hits)\b/i.test(t);
}

function detectCollectionLanguage(title = '', descText = '') {
    const text = `${title} ${descText}`.toLowerCase();
    if (/\btamil\b|kollywood|[\u0B80-\u0BFF]/.test(text)) return 'tamil';
    if (/\btelugu\b|tollywood|[\u0C00-\u0C7F]/.test(text)) return 'telugu';
    if (/\bhindi\b|bollywood|[\u0900-\u097F]/.test(text)) return 'hindi';
    if (/\bmalayalam\b|mollywood|[\u0D00-\u0D7F]/.test(text)) return 'malayalam';
    if (/\bkannada\b|sandalwood|[\u0C80-\u0CFF]/.test(text)) return 'kannada';
    if (/\bpunjabi\b|pollywood|[\u0A00-\u0A7F]/.test(text)) return 'punjabi';
    return '';
}

function detectCollectionEra(title = '') {
    const t = String(title || '').toLowerCase();
    const has70 = /\b70['’\u2018\u2019]?s\b|197\d/.test(t);
    const has80 = /\b80['’\u2018\u2019]?s\b|198\d/.test(t);
    const has90 = /\b90['’\u2018\u2019]?s\b|199\d/.test(t);
    const has2k = /\b2k\b|\b2000['’\u2018\u2019]?s\b|\b00['’\u2018\u2019]?s\b/.test(t);
    const years = [];
    if (has70) years.push(1970, 1979);
    if (has80) years.push(1980, 1989);
    if (has90) years.push(1990, 1999);
    if (has2k) years.push(2000, 2009);
    if (years.length >= 2) {
        return `${Math.min(...years)}-${Math.max(...years)}`;
    }
    return '';
}

function extractLicensingCards(obj) {
    let cards = [];
    if (obj && typeof obj === 'object') {
        if (obj.videoAttributeViewModel) cards.push(obj.videoAttributeViewModel);
        for (const k of Object.keys(obj)) {
            cards = cards.concat(extractLicensingCards(obj[k]));
        }
    }
    return cards;
}

function isConflictingCardLanguage(cardTitle, collectionLang) {
    if (!collectionLang || !cardTitle) return false;
    const low = cardTitle.toLowerCase();
    const langs = ['tamil', 'telugu', 'hindi', 'malayalam', 'kannada', 'punjabi'];
    return langs.some(l => l !== collectionLang && new RegExp(`\\b${l}\\b`, 'i').test(low));
}

function enrichTrackWithLicensingCards(track, cards, collectionLang) {
    if (!track || !Array.isArray(cards) || cards.length === 0) return;
    const tCanon = resolveEngine.normalizeCanonicalTitle(track.title);
    if (!tCanon || tCanon.length < 4) return;

    for (const c of cards) {
        const rawCTitle = c.title || '';
        if (!rawCTitle || isConflictingCardLanguage(rawCTitle, collectionLang)) continue;
        const cCanon = resolveEngine.normalizeCanonicalTitle(rawCTitle);
        if (!cCanon || cCanon.length < 5) continue;

        const isMatch = cCanon === tCanon ||
            (tCanon.startsWith(cCanon) && cCanon.length >= 6) ||
            (cCanon.startsWith(tCanon) && tCanon.length >= 6);
        if (!isMatch) continue;

        const film = resolveEngine.extractFilmFromTitle(rawCTitle);
        if (film && !track.album && !isConflictingCardLanguage(film, collectionLang)) {
            track.album = film;
        }

        if (!track.artist && c.subtitle) {
            const pieces = String(c.subtitle).split(/\s*[,|&]\s*/);
            const verifiedArtists = [];
            for (const p of pieces) {
                const known = matchKnownArtist(p);
                if (known && !verifiedArtists.includes(known)) {
                    verifiedArtists.push(known);
                }
            }
            if (verifiedArtists.length > 0) {
                track.artist = verifiedArtists.join(', ');
            }
        }
        break;
    }
}

function normalizeYouTubeInputUrl(rawInput) {
    if (!rawInput || typeof rawInput !== 'string') return { url: '', playlistId: null, videoId: null, valid: false };
    const httpMatch = rawInput.match(/https?:\/\/[^\s"'<>]+/i);
    const cleaned = (httpMatch ? httpMatch[0] : rawInput).trim();
    let parsed = null;
    try {
        parsed = new URL(cleaned.startsWith('http') ? cleaned : `https://${cleaned}`);
    } catch (e) {
        return { url: cleaned, playlistId: null, videoId: null, valid: false };
    }
    if (!isSafeExternalHttpUrl(parsed.href)) {
        return { url: cleaned, playlistId: null, videoId: null, valid: false, ssrfBlocked: true };
    }
    const host = (parsed.hostname || '').toLowerCase();
    const isYtDomain = host === 'youtu.be' || host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtube-nocookie.com' || host.endsWith('.youtube-nocookie.com');
    if (!isYtDomain) {
        return { url: parsed.href, playlistId: null, videoId: null, valid: false };
    }
    let playlistId = parsed.searchParams.get('list') || null;
    let videoId = parsed.searchParams.get('v') || null;
    if (!videoId && host === 'youtu.be') {
        const seg = parsed.pathname.replace(/^\/+/, '').split('/')[0];
        if (seg && /^[a-zA-Z0-9_-]{11}$/.test(seg)) videoId = seg;
    }
    if (!videoId) {
        const pathMatch = parsed.pathname.match(/\/(?:shorts|embed|live|v)\/([a-zA-Z0-9_-]{11})/i);
        if (pathMatch) videoId = pathMatch[1];
    }
    if (!videoId && parsed.searchParams.get('u')) {
        const inner = decodeURIComponent(parsed.searchParams.get('u') || '');
        const innerV = inner.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
        if (innerV) videoId = innerV[1];
        const innerL = inner.match(/[?&]list=([a-zA-Z0-9_-]+)/);
        if (!playlistId && innerL) playlistId = innerL[1];
    }
    if (playlistId && /^(RD|LL|WL|LM)/i.test(playlistId)) {
        playlistId = null;
    }
    return { url: parsed.href, playlistId, videoId, valid: Boolean(playlistId || videoId) };
}

async function importYouTube(inputUrl) {
    if (!inputUrl) return { success: false, error: 'URL is required' };

    const norm = normalizeYouTubeInputUrl(inputUrl);
    if (norm.ssrfBlocked) {
        return { success: false, error: 'Blocked unsafe external URL' };
    }
    let playlistId = norm.playlistId;
    let videoId = norm.videoId;

    if (!playlistId && !videoId) {
        const pMatch = inputUrl.match(/[?&]list=([a-zA-Z0-9_-]+)/);
        const vMatch = inputUrl.match(/(?:[?&]v=|youtu\.be\/|\/shorts\/|\/embed\/|\/live\/|\/v\/)([a-zA-Z0-9_-]{11})/);
        playlistId = pMatch ? pMatch[1] : null;
        videoId = vMatch ? vMatch[1] : null;
        if (playlistId && /^(RD|LL|WL|LM)/i.test(playlistId)) playlistId = null;
    }

    if (!playlistId && !videoId) {
        return { success: false, error: 'Invalid or unsupported YouTube URL' };
    }

    const cover = videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '';
    let title = '';
    let primaryArtist = 'Various Artists';
    let rawAuthorName = '';
    let videoDuration = 0;
    const tracks = [];
    const skippedTracks = [];
    let ytData = null;
    let nextData = null;
    let descText = '';

    // 1. Innertube direct query
    if (videoId) {
        try {
            const pData = await fetchInnertube('player', {
                context: { client: { clientName: 'WEB', clientVersion: '2.20240101.00.00' } },
                videoId
            });
            if (pData?.videoDetails) {
                ytData = pData;
                title = pData.videoDetails.title || '';
                rawAuthorName = pData.videoDetails.author || '';
                primaryArtist = rawAuthorName || primaryArtist;
                descText = pData.videoDetails.shortDescription || '';
                const lenSec = parseInt(pData.videoDetails.lengthSeconds || '0', 10);
                if (lenSec > 0) videoDuration = lenSec;
            }
        } catch (e) {}

        if (!descText || (!playlistId && (videoDuration > 420 || isCompilationTitle(title)))) {
            try {
                const nData = await fetchInnertube('next', {
                    context: { client: { clientName: 'WEB', clientVersion: '2.20240101.00.00' } },
                    videoId
                });
                if (nData) {
                    nextData = nData;
                    if (!ytData) ytData = nData;
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
                    if (!descText) {
                        const nDesc = findNextDesc(nData);
                        if (nDesc) descText = nDesc;
                    }
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

    // 2. Fallback to watch HTML (extracts ytInitialPlayerResponse + shortDescription + lengthSeconds) & oEmbed
    if (videoId && (!title || !descText || !videoDuration)) {
        try {
            const body = await fetchText(`https://www.youtube.com/watch?v=${videoId}`);
            if (body) {
                const prM = body.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});\s*(?:var |<\/script>)/);
                if (prM) {
                    try {
                        const pr = JSON.parse(prM[1]);
                        const vd = pr?.videoDetails;
                        if (vd) {
                            if (!title && vd.title) title = vd.title;
                            if (!rawAuthorName && vd.author) {
                                rawAuthorName = vd.author;
                                primaryArtist = vd.author;
                            }
                            if (!descText && vd.shortDescription) descText = vd.shortDescription;
                            if (!videoDuration && vd.lengthSeconds) {
                                const lenSec = parseInt(vd.lengthSeconds, 10);
                                if (lenSec > 0) videoDuration = lenSec;
                            }
                        }
                    } catch (e) {}
                }
                if (!title) {
                    const tm = body.match(/<title>(.*?)(?: - YouTube)?<\/title>/i);
                    if (tm) {
                        const candidateTitle = tm[1].replace(/ - YouTube/i, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim();
                        if (candidateTitle && candidateTitle.toLowerCase() !== 'youtube') title = candidateTitle;
                    }
                }
                if (!ytData) {
                    const dm = body.match(/ytInitialData\s*=\s*({.+?});<\/script>/);
                    if (dm) {
                        try { ytData = JSON.parse(dm[1]); } catch (e) {}
                    }
                }
            }
        } catch (e) {}
    }

    if (playlistId && !ytData) {
        for (const hostUrl of [
            `https://www.youtube.com/playlist?list=${encodeURIComponent(playlistId)}`,
            `https://music.youtube.com/playlist?list=${encodeURIComponent(playlistId)}`
        ]) {
            if (ytData) break;
            try {
                const body = await fetchText(hostUrl);
                if (body) {
                    if (!title) {
                        const tm = body.match(/<title>(.*?)(?: - YouTube(?: Music)?)?<\/title>/i);
                        if (tm) {
                            const cand = cleanImportText(tm[1].replace(/ - YouTube(?: Music)?/i, ''));
                            if (cand && cand.toLowerCase() !== 'youtube') title = cand;
                        }
                    }
                    const dm = body.match(/ytInitialData\s*=\s*({.+?});<\/script>/);
                    if (dm) {
                        try { ytData = JSON.parse(dm[1]); } catch (e) {}
                    }
                }
            } catch (e) {}
        }
    }

    let oembed = null;
    if (videoId && !title) {
        try {
            oembed = await fetchJson(`https://www.youtube.com/oembed?url=${encodeURIComponent('https://www.youtube.com/watch?v=' + videoId)}&format=json`);
            if (oembed?.title) title = oembed.title;
            if (oembed?.author_name && !rawAuthorName) {
                rawAuthorName = oembed.author_name;
                if (primaryArtist === 'Various Artists') primaryArtist = oembed.author_name;
            }
        } catch (e) {}
    }

    const detectedTitleArtist = matchKnownArtist(title);
    if (detectedTitleArtist) {
        primaryArtist = detectedTitleArtist;
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
            try {
                if (item.lockup) {
                    const lvm = item.lockup;
                    const meta = lvm.metadata?.lockupMetadataViewModel;
                    const pvTitle = cleanImportText(meta?.title?.content || '');
                    const rows = meta?.metadata?.contentMetadataViewModel?.metadataRows || [];
                    const pvArtist = cleanImportText(rows[0]?.metadataParts?.[0]?.text?.content || primaryArtist || 'Various Artists');
                    const sources = lvm.contentImage?.thumbnailViewModel?.image?.sources || [];
                    const pvThumb = sources.length > 0 ? sources[sources.length - 1].url : cover;
                    let pvId = lvm.contentId || '';
                    if (!pvId && pvThumb) {
                        const idM = pvThumb.match(/\/vi\/([a-zA-Z0-9_-]{11})\//);
                        if (idM) pvId = idM[1];
                    }
                    if (!pvTitle || /\[(private|deleted|unavailable)\s*video\]/i.test(pvTitle)) {
                        if (pvTitle) skippedTracks.push({ id: pvId, title: pvTitle, reason: 'Unavailable or private YouTube video' });
                        continue;
                    }
                    const parsedSeg = parseYouTubeTitle(pvTitle, pvArtist);
                    const finalTitle = cleanImportText(parsedSeg.title || cleanTrackName(pvTitle) || pvTitle);
                    const finalArtist = cleanImportText(parsedSeg.artist || pvArtist);
                    if (finalTitle) {
                        tracks.push({
                            id: pvId ? `yt_${pvId}` : `yt_pl_${tracks.length + 1}`,
                            youtubeId: pvId,
                            title: finalTitle,
                            artist: finalArtist,
                            album: cleanImportText(parsedSeg.album || ''),
                            duration: 210,
                            artwork: pvThumb || (pvId ? `https://i.ytimg.com/vi/${pvId}/hqdefault.jpg` : cover) || 'assets/foryou_radar.jpg',
                            quality: 'FLAC / 320kbps Hi-Fi'
                        });
                    }
                } else {
                    const pv = item;
                    const pvTitle = cleanImportText(pv.title?.simpleText || pv.title?.runs?.[0]?.text || '');
                    const pvArtist = cleanImportText(pv.shortBylineText?.runs?.[0]?.text || primaryArtist || 'Various Artists');
                    const pvDur = parseInt(pv.lengthSeconds || '210', 10) || 210;
                    const pvThumb = pv.thumbnail?.thumbnails?.[pv.thumbnail.thumbnails.length - 1]?.url || cover;
                    const pvId = pv.videoId || '';
                    if (!pvTitle || /\[(private|deleted|unavailable)\s*video\]/i.test(pvTitle)) {
                        if (pvTitle) skippedTracks.push({ id: pvId, title: pvTitle, reason: 'Unavailable or private YouTube video' });
                        continue;
                    }
                    const parsedSeg = parseYouTubeTitle(pvTitle, pvArtist);
                    const finalTitle = cleanImportText(parsedSeg.title || cleanTrackName(pvTitle) || pvTitle);
                    const finalArtist = cleanImportText(parsedSeg.artist || pvArtist);
                    if (finalTitle) {
                        tracks.push({
                            id: pvId ? `yt_${pvId}` : `yt_pl_${tracks.length + 1}`,
                            youtubeId: pvId,
                            title: finalTitle,
                            artist: finalArtist,
                            album: cleanImportText(parsedSeg.album || ''),
                            duration: pvDur,
                            artwork: pvThumb || (pvId ? `https://i.ytimg.com/vi/${pvId}/hqdefault.jpg` : cover) || 'assets/foryou_radar.jpg',
                            quality: 'FLAC / 320kbps Hi-Fi'
                        });
                    }
                }
            } catch (itemErr) {
                skippedTracks.push({ reason: itemErr?.message || 'Track parse error' });
            }
        }
    }

    const collectionLang = detectCollectionLanguage(title, descText);
    const collectionEra = detectCollectionEra(title);
    const licensingCards = extractLicensingCards(nextData || ytData);
    const isCompilation = !playlistId && (videoDuration > 420 || isCompilationTitle(title));
    const isCuratorOrChannel = !primaryArtist || isJunkLabel(primaryArtist) || /editz|channel|records|music|vevo|status|mix|playlist|official|audio|video|lyrics|studio|creations|ent|production|media/i.test(primaryArtist) || /[\uD800-\uDFFF]/.test(primaryArtist);

    // Strategy 2: Structured Chapters in nextData / ytData
    const chapterSource = nextData || ytData;
    if (tracks.length === 0 && chapterSource && (playlistId || videoDuration > 420)) {
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
        const markers = findMarkers(chapterSource);
        const seenChapters = new Set();
        const chapterTracks = [];
        for (const m of markers) {
            const cTitle = m.title?.simpleText || m.title?.runs?.[0]?.text;
            if (cTitle && !seenChapters.has(cTitle.toLowerCase().trim())) {
                seenChapters.add(cTitle.toLowerCase().trim());
                const timeStr = m.timeDescription?.simpleText || m.timeDescription?.runs?.[0]?.text || '0:00';
                const sec = m.onTap?.watchEndpoint?.startTimeSeconds ?? parseTimestampToSeconds(timeStr);
                const endMs = parseInt(m.repeatButton?.toggleButtonRenderer?.defaultServiceEndpoint?.repeatChapterCommand?.endTimeMs || '0', 10);
                const dur = endMs > 0 ? Math.round((endMs - sec * 1000) / 1000) : 240;
                const art = m.thumbnail?.thumbnails?.[m.thumbnail.thumbnails.length - 1]?.url || cover;

                const parsed = parseYouTubeTitle(cTitle, primaryArtist);
                const tr = {
                    title: parsed.title || cleanTrackName(cTitle),
                    artist: (parsed.artist && parsed.artist !== primaryArtist) ? parsed.artist : (isCuratorOrChannel ? '' : primaryArtist),
                    album: parsed.album || '',
                    language: collectionLang || '',
                    era: collectionEra || '',
                    duration: dur,
                    artwork: art,
                    startTime: sec,
                    quality: 'FLAC / 320kbps Hi-Fi'
                };
                enrichTrackWithLicensingCards(tr, licensingCards, collectionLang);
                chapterTracks.push(tr);
            }
        }
        if (chapterTracks.length >= 2) {
            tracks.push(...chapterTracks);
        }
    }

    // Strategy 3: Description Timestamp Parsing (e.g. Mixtape Compilations with >= 2 timestamps)
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
                    const parsed = parseYouTubeTitle(name, primaryArtist);
                    const cleanName = parsed.title || cleanTrackName(name);
                    if (cleanName.length >= 2) {
                        const tr = {
                            title: cleanName,
                            artist: (parsed.artist && parsed.artist !== primaryArtist) ? parsed.artist : (isCuratorOrChannel ? '' : primaryArtist),
                            album: parsed.album || '',
                            language: collectionLang || '',
                            era: collectionEra || '',
                            startTime: parseTimestampToSeconds(timeStr),
                            artwork: cover,
                            quality: 'FLAC / 320kbps Hi-Fi'
                        };
                        enrichTrackWithLicensingCards(tr, licensingCards, collectionLang);
                        parsedTs.push(tr);
                    }
                }
            }

            if (parsedTs.length >= 2) {
                for (let i = 0; i < parsedTs.length; i++) {
                    const dur = (i < parsedTs.length - 1) ? Math.max(30, parsedTs[i + 1].startTime - parsedTs[i].startTime) : 240;
                    parsedTs[i].duration = dur;
                    tracks.push(parsedTs[i]);
                }
            }
        }
    }

    // Strategy 3B: Bulleted / Numbered Tracklists without Timestamps in Compilation / Jukebox Videos
    if (tracks.length === 0 && descText && isCompilation) {
        const unescapedDesc = descText.replace(/\\n/g, '\n');
        const lines = unescapedDesc.split(/[\r\n]+/);
        const bulletRegex = /^(?:[•●▪▫‣◦\*✓✔▸▹➤➣➢]+|\-\s+|(?:\d{1,2})\s*[\.\)])\s*(.+)$/;
        const bulletCandidates = [];
        const seenCanon = new Set();
        let inFooterSection = false;

        for (const rawLine of lines) {
            const l = rawLine.trim();
            if (!l) continue;

            if (/^(?:🎧|✨|🔗|📱|🏷️)?\s*(?:perfect\s*for|best\s*for|ideal\s*for|follow\s*us|connect|social|hashtags?|tags?|disclaimer|copyright|about|watch\s*more)\s*:?$/i.test(l) || /^hashtags$/i.test(l)) {
                inFooterSection = true;
                continue;
            }
            if (/^(?:🎶|🎵)?\s*(?:in\s*this|tracklist|song\s*list|songs?\s*list|playlist|songs?\s*included|featured\s*songs?)/i.test(l)) {
                inFooterSection = false;
                continue;
            }
            if (inFooterSection) continue;

            const bm = l.match(bulletRegex);
            if (!bm) continue;

            let itemText = bm[1].trim();
            if (!itemText || itemText.length < 3 || itemText.length > 100) continue;
            if (/http|www\.|@|#|subscribe|like|share|comment|follow|copyright|©|℗|download|moments|listening|vibes|memories|road\s*trips|playlist|and\s+many\s+more/i.test(itemText)) continue;

            // Convert slug hyphens ("Kadhal-Rojave" -> "Kadhal Rojave") when not "Song - Artist"
            if (!/\s[-–—]\s/.test(itemText)) {
                itemText = itemText.replace(/([A-Za-z0-9\u0B80-\u0DFF])-([A-Za-z0-9\u0B80-\u0DFF])/g, '$1 $2')
                                   .replace(/([A-Za-z0-9\u0B80-\u0DFF])-([A-Za-z0-9\u0B80-\u0DFF])/g, '$1 $2');
            }

            const parsed = parseYouTubeTitle(itemText, '');
            const songTitle = cleanTrackName(parsed.title || itemText) || itemText;
            const canonKey = resolveEngine.normalizeCanonicalTitle(songTitle);
            if (!songTitle || songTitle.length < 3 || !canonKey || seenCanon.has(canonKey)) continue;
            seenCanon.add(canonKey);

            const tr = {
                id: `yt_${videoId}_${bulletCandidates.length + 1}`,
                title: songTitle,
                artist: (parsed.artist && parsed.artist !== 'Various Artists' && !isJunkLabel(parsed.artist)) ? parsed.artist : '',
                album: parsed.album || '',
                language: collectionLang || '',
                era: collectionEra || '',
                duration: 240,
                durationEstimated: true,
                artwork: cover,
                quality: 'FLAC / 320kbps Hi-Fi'
            };
            enrichTrackWithLicensingCards(tr, licensingCards, collectionLang);
            bulletCandidates.push(tr);
            if (bulletCandidates.length >= 100) break;
        }

        if (bulletCandidates.length >= 3) {
            const estDur = videoDuration > 60
                ? Math.max(180, Math.min(360, Math.round(videoDuration / bulletCandidates.length)))
                : 240;
            for (const bt of bulletCandidates) {
                bt.duration = estDur;
                tracks.push(bt);
            }
        }
    }

    // Strategy 4: Video Licensing Cards (playlists OR multi-song compilation videos without description tracklist)
    const cardSourceData = nextData || ytData;
    if (tracks.length === 0 && cardSourceData && (playlistId || isCompilation)) {
        const cards = licensingCards.length > 0 ? licensingCards : extractLicensingCards(cardSourceData);
        const cardTracks = [];
        for (const c of cards) {
            const tTitle = c.title || '';
            if (!tTitle || isConflictingCardLanguage(tTitle, collectionLang)) continue;
            const tArtist = c.subtitle || (!isCuratorOrChannel ? primaryArtist : '') || '';
            if (!cardTracks.some(t => t.title.toLowerCase() === tTitle.toLowerCase())) {
                const parsed = parseYouTubeTitle(tTitle, tArtist);
                const film = resolveEngine.extractFilmFromTitle(tTitle);
                cardTracks.push({
                    title: parsed.title || cleanTrackName(tTitle),
                    artist: parsed.artist || tArtist,
                    album: parsed.album || film || '',
                    language: collectionLang || '',
                    era: collectionEra || '',
                    duration: 210,
                    durationEstimated: true,
                    artwork: cover,
                    quality: 'FLAC / 320kbps Hi-Fi'
                });
            }
        }
        if (playlistId ? cardTracks.length >= 1 : cardTracks.length >= 2) {
            tracks.push(...cardTracks);
        }
    }

    // Strategy 5: Single track fallback (using structured description credits + parsed title)
    if (tracks.length === 0) {
        const rawTitleToParse = title || oembed?.title || '';
        if (!rawTitleToParse || rawTitleToParse === 'YouTube Playlist' || rawTitleToParse.toLowerCase() === 'youtube') {
            return { success: false, error: 'Could not extract video details from YouTube. Please verify the link is public.' };
        }

        const credits = extractCreditsFromDescription(descText);
        const authorForParser = rawAuthorName || oembed?.author_name || primaryArtist;
        const parsed = parseYouTubeTitle(rawTitleToParse, authorForParser);

        const resolvedTitle = credits.song || parsed.title || cleanTrackName(rawTitleToParse) || rawTitleToParse;
        const resolvedArtist = credits.artist || (!isJunkLabel(parsed.artist) && !isCrewOrActorCredit(parsed.artist) ? parsed.artist : '') || (!isJunkLabel(primaryArtist) ? primaryArtist : 'Various Artists');
        const resolvedAlbum = credits.album || parsed.album || '';

        const singleTrack = {
            id: videoId ? `yt_${videoId}` : undefined,
            youtubeId: videoId,
            title: resolvedTitle,
            artist: resolvedArtist,
            album: resolvedAlbum,
            language: credits.language || '',
            duration: videoDuration > 0 ? videoDuration : 210,
            artwork: oembed?.thumbnail_url || cover,
            quality: 'FLAC / 320kbps Hi-Fi'
        };
        tracks.push(singleTrack);
        title = singleTrack.title;
    }

    // Pre-resolve high-confidence 320kbps stream URL for single track import using shared strict resolver
    if (tracks.length === 1 && !tracks[0].streamUrl) {
        try {
            const resolved = await resolveEngine.resolveTrackMatch({
                title: tracks[0].title,
                artist: tracks[0].artist,
                album: tracks[0].album,
                lang: tracks[0].language || '',
                duration: tracks[0].duration
            });
            if (resolved && resolved.success && resolved.track && resolved.track.streamUrl) {
                tracks[0].streamUrl = resolved.track.streamUrl;
                if (resolved.track.artwork && !resolved.track.artwork.includes('default_')) {
                    tracks[0].artwork = resolved.track.artwork;
                }
                if (resolved.track.duration) tracks[0].duration = resolved.track.duration;
                if (!tracks[0].album && resolved.track.album) tracks[0].album = resolved.track.album;
            }
        } catch (e) {}
    }

    const playlistDisplayTitle = cleanImportText(
        (!playlistId && tracks.length > 1 && title)
            ? (title.split(/\s*\|\s*/)[0].trim() || title)
            : (title || 'YouTube Playlist')
    ) || 'YouTube Playlist';

    return {
        success: true,
        platform: 'YouTube',
        title: playlistDisplayTitle,
        artwork: tracks[0]?.artwork || cover || 'assets/foryou_radar.jpg',
        count: tracks.length,
        skippedCount: skippedTracks.length,
        skippedTracks,
        tracks
    };
}

async function resolveSpotifyOpenGraphFallback(id) {
    try {
        const html = await fetchText(`https://open.spotify.com/track/${id}`, 3, {
            'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'
        });
        if (!html) return null;
        const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1];
        const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1];
        const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1];
        if (!ogTitle) return null;

        let artist = '';
        let album = '';
        if (ogDesc) {
            // Spotify OG description format: "Artist · Album · Song · Year" or "Listen to X on Spotify. Artist · Song · Year."
            const cleanedDesc = ogDesc.replace(/^Listen to\s+.*?on Spotify\.\s*/i, '').trim();
            const parts = cleanedDesc.split(/\s*[·•]\s*/).map(s => s.trim()).filter(Boolean);
            if (parts.length >= 2) {
                artist = parts[0];
                if (parts.length >= 3 && !/^\d{4}$/.test(parts[1]) && parts[1].toLowerCase() !== 'song') {
                    album = parts[1];
                }
            }
        }
        return {
            title: cleanTrackName(ogTitle) || ogTitle,
            artist: artist || 'Spotify Artist',
            album,
            artwork: ogImage || ''
        };
    } catch (e) {
        return null;
    }
}

function normalizeSpotifyUrl(inputUrl) {
    if (!inputUrl || typeof inputUrl !== 'string') return { url: '', type: null, id: null, valid: false };
    let url = inputUrl.trim();
    const httpMatch = url.match(/https?:\/\/[^\s"'<>]+/i);
    if (httpMatch) {
        url = httpMatch[0].trim();
    }
    if (url.startsWith('spotify:')) {
        const parts = url.split(':').filter(Boolean);
        const typeIdx = parts.findIndex(p => /^(playlist|album|track)$/i.test(p));
        if (typeIdx !== -1 && parts[typeIdx + 1]) {
            const spType = parts[typeIdx].toLowerCase();
            const spId = parts[typeIdx + 1].split(/[?#]/)[0];
            url = `https://open.spotify.com/${spType}/${spId}`;
        }
    }
    if (!/^https?:\/\//i.test(url) && /spotify\.com/i.test(url)) {
        url = 'https://' + url;
    }
    if (/^https?:\/\//i.test(url) && !isSafeExternalHttpUrl(url)) {
        return { url, type: null, id: null, valid: false, ssrfBlocked: true };
    }
    let cleanUrl = url;
    try {
        const parsed = new URL(url);
        cleanUrl = `${parsed.origin}${parsed.pathname}`;
    } catch (e) {}

    let match = cleanUrl.match(/(?:intl-[a-z0-9_-]+\/)?(?:user\/[^/]+\/)?(playlist|album|track)\/([a-zA-Z0-9_-]+)/i)
        || url.match(/(?:intl-[a-z0-9_-]+\/)?(?:user\/[^/]+\/)?(playlist|album|track)\/([a-zA-Z0-9_-]+)/i);

    return {
        url,
        cleanUrl,
        type: match ? match[1].toLowerCase() : null,
        id: match ? match[2] : null,
        valid: Boolean(match)
    };
}

function extractSpotifyTrackImage(t) {
    if (!t || typeof t !== 'object') return '';
    const candidates = [
        t.visualIdentity?.image?.[1]?.url,
        t.visualIdentity?.image?.[0]?.url,
        t.album?.images?.[0]?.url,
        t.album?.images?.[1]?.url,
        t.albumOfTrack?.coverArt?.sources?.[0]?.url,
        t.albumOfTrack?.coverArt?.sources?.[1]?.url,
        t.coverArt?.sources?.[0]?.url,
        t.images?.[0]?.url,
        t.image
    ];
    for (const c of candidates) {
        if (typeof c === 'string' && c.trim().startsWith('http')) {
            return c.trim();
        }
    }
    return '';
}

async function resolveSpotifyTrackArtwork(track, playlistCover = '') {
    if (!track || typeof track !== 'object') {
        return { artwork: playlistCover || 'assets/foryou_radar.jpg', artworkSource: playlistCover ? 'playlist_cover' : 'fallback' };
    }
    const spTrackArt = track._spTrackArt || '';
    const rawTitle = cleanImportText(track.title || '');
    const rawArtist = cleanImportText(track.artist || '');
    const rawAlbum = cleanImportText(track.album || '');

    // Priority 1 & 2: Omonk matching track artwork / Omonk matching album artwork
    try {
        if (rawTitle) {
            const resolved = await resolveEngine.resolveTrackMatch({
                title: rawTitle,
                artist: rawArtist,
                album: rawAlbum,
                duration: track.duration || 0
            });
            if (resolved && resolved.success && resolved.track && resolved.track.artwork && !resolved.track.artwork.includes('default_')) {
                return {
                    artwork: resolved.track.artwork,
                    artworkSource: 'omonk',
                    matchedTrack: resolved.track
                };
            }
        }
    } catch (e) {}

    // Priority 3 & 4: Spotify track artwork / Spotify album artwork embedded in __NEXT_DATA__
    if (spTrackArt) {
        return { artwork: spTrackArt, artworkSource: 'spotify_track' };
    }

    // Priority 3B: Spotify oEmbed lookup for individual track ID
    if (track.spotifyId && /^[a-zA-Z0-9]{10,32}$/.test(String(track.spotifyId))) {
        try {
            const oembed = await fetchJson(`https://open.spotify.com/oembed?url=${encodeURIComponent('https://open.spotify.com/track/' + track.spotifyId)}`, 2);
            if (oembed && typeof oembed.thumbnail_url === 'string' && oembed.thumbnail_url.startsWith('http')) {
                return { artwork: oembed.thumbnail_url, artworkSource: 'spotify_oembed' };
            }
        } catch (e) {}
    }

    // Priority 5 & 6: Spotify playlist artwork fallback -> Omonk fallback
    if (playlistCover) {
        return { artwork: playlistCover, artworkSource: 'playlist_cover' };
    }
    return { artwork: 'assets/foryou_radar.jpg', artworkSource: 'fallback' };
}

async function mapWithConcurrency(items, concurrency, fn) {
    const results = new Array(items.length);
    let cursor = 0;
    const workerCount = Math.max(1, Math.min(concurrency, items.length));
    async function worker() {
        while (cursor < items.length) {
            const idx = cursor++;
            results[idx] = await fn(items[idx], idx);
        }
    }
    await Promise.all(Array.from({ length: workerCount }, () => worker()));
    return results;
}

async function repairTracksArtwork(tracks = [], playlistCover = '', options = {}) {
    if (!Array.isArray(tracks) || tracks.length === 0) return [];
    const safeCover = (playlistCover || '').trim();
    const force = Boolean(options && options.force);
    const artFreq = new Map();
    for (const item of tracks) {
        const a = (item?.artwork || item?.image || '').trim();
        if (a) artFreq.set(a, (artFreq.get(a) || 0) + 1);
    }
    return mapWithConcurrency(tracks, 6, async (t) => {
        if (!t || typeof t !== 'object') return t;
        const curArt = (t.artwork || t.image || '').trim();
        const isRepeated = Boolean(curArt && (artFreq.get(curArt) || 0) > 1);
        const needsRepair = force ||
            !curArt ||
            curArt === safeCover ||
            isRepeated ||
            curArt.includes('/playlist') ||
            curArt.includes('foryou_radar.jpg') ||
            curArt.includes('icon-512.png') ||
            t.artworkSource === 'playlist_cover' ||
            t.artworkSource === 'playlist_fallback' ||
            t.artworkSource === 'fallback';
        if (!needsRepair) return t;

        const artInfo = await resolveSpotifyTrackArtwork(t, safeCover);
        const updated = { ...t };
        if (artInfo.artwork) {
            updated.artwork = artInfo.artwork;
            updated.image = artInfo.artwork;
            updated.artworkSource = artInfo.artworkSource;
        }
        if (artInfo.matchedTrack) {
            if (!updated.album && artInfo.matchedTrack.album) updated.album = artInfo.matchedTrack.album;
            if (!updated.language && artInfo.matchedTrack.language) updated.language = artInfo.matchedTrack.language;
            if (!updated.resolvedId && artInfo.matchedTrack.id) updated.resolvedId = artInfo.matchedTrack.id;
        }
        return updated;
    });
}

async function importSpotify(inputUrl) {
    if (!inputUrl) return { success: false, error: 'URL is required' };

    const norm = normalizeSpotifyUrl(inputUrl);
    if (norm.ssrfBlocked) {
        return { success: false, error: 'Blocked unsafe external URL' };
    }

    let url = norm.url;
    let type = norm.type;
    let id = norm.id;

    if ((!type || !id) && (url.includes('spotify.link') || url.includes('spotify.app.link'))) {
        const redirectHtml = await fetchText(url, 5);
        const canonicalMatch = redirectHtml.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i) || redirectHtml.match(/property=["']og:url["'][^>]+content=["']([^"']+)["']/i);
        const scanTarget = (canonicalMatch ? canonicalMatch[1] + ' ' : '') + redirectHtml;
        const mRedirect = scanTarget.match(/(?:intl-[a-z0-9_-]+\/)?(?:user\/[^/]+\/)?(playlist|album|track)\/([a-zA-Z0-9_-]+)/i);
        if (mRedirect) {
            type = mRedirect[1].toLowerCase();
            id = mRedirect[2];
        }
    }

    if (!type || !id) {
        return { success: false, error: 'Invalid Spotify link. Please paste a valid playlist, album, or track URL.' };
    }

    const embedUrl = `https://open.spotify.com/embed/${type}/${id}`;
    const body = await fetchText(embedUrl, 3);

    if (!body && type === 'track') {
        const ogData = await resolveSpotifyOpenGraphFallback(id);
        if (ogData && ogData.title) {
            const artInfo = await resolveSpotifyTrackArtwork({
                spotifyId: id,
                title: ogData.title,
                artist: ogData.artist,
                album: ogData.album || '',
                _spTrackArt: ogData.artwork || ''
            });
            const singleTrack = {
                id: `sp_${id}`,
                spotifyId: id,
                title: cleanImportText(ogData.title),
                artist: cleanImportText(ogData.artist),
                album: cleanImportText(ogData.album || ''),
                duration: 210,
                artwork: artInfo.artwork,
                artworkSource: artInfo.artworkSource,
                quality: 'FLAC / 320kbps Hi-Fi'
            };
            return {
                success: true,
                platform: 'Spotify',
                type: 'track',
                title: singleTrack.title,
                artwork: singleTrack.artwork,
                count: 1,
                tracks: [singleTrack]
            };
        }
        try {
            const oembed = await fetchJson(`https://open.spotify.com/oembed?url=${encodeURIComponent('https://open.spotify.com/track/' + id)}`);
            if (oembed && oembed.title) {
                const titleClean = cleanImportText(cleanTrackName(oembed.title) || oembed.title);
                const artInfo = await resolveSpotifyTrackArtwork({
                    spotifyId: id,
                    title: titleClean,
                    artist: '',
                    album: '',
                    _spTrackArt: oembed.thumbnail_url || ''
                });
                const singleTrack = {
                    id: `sp_${id}`,
                    spotifyId: id,
                    title: titleClean,
                    artist: 'Spotify Artist',
                    album: '',
                    duration: 210,
                    artwork: artInfo.artwork,
                    artworkSource: artInfo.artworkSource,
                    quality: 'FLAC / 320kbps Hi-Fi'
                };
                return {
                    success: true,
                    platform: 'Spotify',
                    type: 'track',
                    title: singleTrack.title,
                    artwork: singleTrack.artwork,
                    count: 1,
                    tracks: [singleTrack]
                };
            }
        } catch (e) {}
    }

    const parseEntityFromHtml = async () => {
        try {
            const pageHtml = await fetchText(`https://open.spotify.com/${type}/${id}`, 4);
            if (!pageHtml) return null;
            const ogTitle = cleanImportText(pageHtml.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] || '');
            const ogCover = pageHtml.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] || '';
            const trackUrls = Array.from(pageHtml.matchAll(/https:\/\/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/gi)).map(m => m[1]);
            const uniqueIds = Array.from(new Set(trackUrls)).slice(0, 50);
            if (uniqueIds.length === 0) return null;
            const resolvedTracks = await mapWithConcurrency(uniqueIds, 6, async (tid) => {
                try {
                    const ogT = await resolveSpotifyOpenGraphFallback(tid);
                    if (ogT && ogT.title) {
                        const artInfo = await resolveSpotifyTrackArtwork({
                            spotifyId: tid,
                            title: ogT.title,
                            artist: ogT.artist,
                            album: ogT.album || '',
                            _spTrackArt: ogT.artwork || ''
                        }, ogCover);
                        return {
                            id: `sp_${tid}`,
                            spotifyId: tid,
                            title: cleanImportText(ogT.title),
                            artist: cleanImportText(ogT.artist || 'Spotify Artist'),
                            album: cleanImportText(ogT.album || ''),
                            duration: 210,
                            artwork: artInfo.artwork,
                            artworkSource: artInfo.artworkSource,
                            quality: 'FLAC / 320kbps Hi-Fi'
                        };
                    }
                    const oe = await fetchJson(`https://open.spotify.com/oembed?url=${encodeURIComponent('https://open.spotify.com/track/' + tid)}`);
                    if (oe && oe.title) {
                        const tTitle = cleanImportText(cleanTrackName(oe.title) || oe.title);
                        const artInfo = await resolveSpotifyTrackArtwork({ spotifyId: tid, title: tTitle, _spTrackArt: oe.thumbnail_url || '' }, ogCover);
                        return {
                            id: `sp_${tid}`,
                            spotifyId: tid,
                            title: tTitle,
                            artist: 'Spotify Artist',
                            album: '',
                            duration: 210,
                            artwork: artInfo.artwork,
                            artworkSource: artInfo.artworkSource,
                            quality: 'FLAC / 320kbps Hi-Fi'
                        };
                    }
                } catch (e) {}
                return null;
            });
            const validTracks = resolvedTracks.filter(Boolean);
            if (validTracks.length > 0) {
                return {
                    success: true,
                    platform: 'Spotify',
                    type,
                    title: ogTitle || 'Spotify Playlist',
                    artwork: ogCover || validTracks[0].artwork,
                    count: validTracks.length,
                    skippedCount: uniqueIds.length - validTracks.length,
                    tracks: validTracks
                };
            }
        } catch (e) {}
        return null;
    };

    if (!body) {
        const htmlFallback = await parseEntityFromHtml();
        if (htmlFallback) return htmlFallback;
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
            const title = cleanImportText(entity?.title || entity?.name || 'Spotify Playlist') || 'Spotify Playlist';
            const cover = entity?.visualIdentity?.image?.[1]?.url || entity?.visualIdentity?.image?.[0]?.url || '';
            const trackList = entity?.trackList || [];

            // Single track
            if (type === 'track') {
                const artistsList = (entity?.artists || []).map(a => a.name).filter(Boolean);
                let artistName = cleanImportText(artistsList.join(', ') || entity?.subtitle || '');
                let albumName = cleanImportText(entity?.album?.name || '');
                let ogArtwork = '';
                if (!artistName) {
                    const ogData = await resolveSpotifyOpenGraphFallback(id);
                    if (ogData) {
                        artistName = cleanImportText(ogData.artist);
                        if (!albumName && ogData.album) albumName = cleanImportText(ogData.album);
                        if (ogData.artwork) ogArtwork = ogData.artwork;
                    }
                }
                const cleanT = cleanImportText(cleanTrackName(entity?.title || title) || title);
                const artInfo = await resolveSpotifyTrackArtwork({
                    spotifyId: id,
                    title: cleanT,
                    artist: artistName || 'Spotify Artist',
                    album: albumName,
                    duration: Math.round((entity?.duration || 210000) / 1000),
                    _spTrackArt: cover || ogArtwork
                }, cover);

                const singleTrack = {
                    id: `sp_${id}`,
                    spotifyId: id,
                    title: cleanT,
                    artist: artistName || 'Spotify Artist',
                    album: albumName,
                    duration: Math.round((entity?.duration || 210000) / 1000),
                    artwork: artInfo.artwork,
                    artworkSource: artInfo.artworkSource,
                    quality: 'FLAC / 320kbps Hi-Fi'
                };
                return {
                    success: true,
                    platform: 'Spotify',
                    type: 'track',
                    title: singleTrack.title,
                    artwork: singleTrack.artwork || cover,
                    count: 1,
                    tracks: [singleTrack]
                };
            }

            if (!trackList || trackList.length === 0) {
                const htmlFallback = await parseEntityFromHtml();
                if (htmlFallback) return htmlFallback;
                return { success: false, error: 'No playable tracks found in this playlist. Please ensure it is a public Spotify playlist.' };
            }

            const skippedTracks = [];
            const rawMapped = await mapWithConcurrency(trackList, 6, async (t, idx) => {
                try {
                    if (!t || !t.title) {
                        skippedTracks.push({ index: idx, reason: 'Missing track metadata' });
                        return null;
                    }
                    const artistsList = (t.artists || []).map(a => a.name).filter(Boolean);
                    const artistName = cleanImportText(artistsList.join(', ') || t.subtitle || '');
                    const rawTrackAlbum = typeof t.album === 'string' ? t.album : (t.album?.name || '');
                    const albumName = cleanImportText(rawTrackAlbum || (type === 'album' ? title : '') || '');
                    const uriMatch = (t.uri || '').match(/spotify:track:([a-zA-Z0-9]+)/i);
                    const spTrackId = t.id || (uriMatch ? uriMatch[1] : '') || '';
                    const spTrackArt = extractSpotifyTrackImage(t);
                    const cleanTitle = cleanImportText(cleanTrackName(t.title) || t.title);
                    const durSec = Math.round((t.duration || 210000) / 1000);

                    const artInfo = await resolveSpotifyTrackArtwork({
                        spotifyId: spTrackId,
                        title: cleanTitle,
                        artist: artistName,
                        album: albumName,
                        duration: durSec,
                        _spTrackArt: spTrackArt
                    }, cover);

                    const item = {
                        id: `sp_${spTrackId || (id + '_' + idx)}`,
                        spotifyId: spTrackId || id,
                        title: cleanTitle,
                        artist: artistName || 'Spotify Artist',
                        album: (artInfo.matchedTrack?.album && !albumName) ? artInfo.matchedTrack.album : albumName,
                        language: artInfo.matchedTrack?.language || '',
                        duration: durSec,
                        artwork: artInfo.artwork,
                        artworkSource: artInfo.artworkSource,
                        quality: 'FLAC / 320kbps Hi-Fi'
                    };
                    if (artInfo.matchedTrack?.id) item.resolvedId = artInfo.matchedTrack.id;
                    return item;
                } catch (trackErr) {
                    skippedTracks.push({ index: idx, title: t?.title || '', reason: trackErr?.message || 'Import error' });
                    return null;
                }
            });

            const tracks = rawMapped.filter(Boolean);
            if (tracks.length === 0) {
                return { success: false, error: 'No playable tracks found in this playlist. Please ensure it is a public Spotify playlist.' };
            }

            return {
                success: true,
                platform: 'Spotify',
                type,
                title,
                artwork: cover || tracks[0]?.artwork || '',
                count: tracks.length,
                skippedCount: skippedTracks.length,
                skippedTracks,
                tracks
            };
        }
    } catch (e) {
        if (type === 'track') {
            const ogData = await resolveSpotifyOpenGraphFallback(id);
            if (ogData && ogData.title) {
                const artInfo = await resolveSpotifyTrackArtwork({
                    spotifyId: id,
                    title: ogData.title,
                    artist: ogData.artist,
                    album: ogData.album || '',
                    _spTrackArt: ogData.artwork || ''
                });
                const singleTrack = {
                    id: `sp_${id}`,
                    spotifyId: id,
                    title: cleanImportText(ogData.title),
                    artist: cleanImportText(ogData.artist),
                    album: cleanImportText(ogData.album || ''),
                    duration: 210,
                    artwork: artInfo.artwork,
                    artworkSource: artInfo.artworkSource,
                    quality: 'FLAC / 320kbps Hi-Fi'
                };
                return {
                    success: true,
                    platform: 'Spotify',
                    type: 'track',
                    title: singleTrack.title,
                    artwork: singleTrack.artwork,
                    count: 1,
                    tracks: [singleTrack]
                };
            }
        }
        const htmlFallback = await parseEntityFromHtml();
        if (htmlFallback) return htmlFallback;
        return { success: false, error: `Spotify extraction failed: ${e.message}` };
    }

    // OpenGraph meta tag fallback from embed body
    if (type === 'track') {
        const ogTitle = cleanImportText(body.match(/<meta property="og:title" content="([^"]+)"/i)?.[1] || '');
        const ogImage = body.match(/<meta property="og:image" content="([^"]+)"/i)?.[1];
        const ogDesc = cleanImportText(body.match(/<meta property="og:description" content="([^"]+)"/i)?.[1] || '');
        if (ogTitle) {
            const cleanT = cleanImportText(cleanTrackName(ogTitle) || ogTitle);
            const artInfo = await resolveSpotifyTrackArtwork({
                spotifyId: id,
                title: cleanT,
                artist: ogDesc || 'Spotify Artist',
                _spTrackArt: ogImage || ''
            });
            const singleTrack = {
                id: `sp_${id}`,
                spotifyId: id,
                title: cleanT,
                artist: ogDesc || 'Spotify Artist',
                album: '',
                duration: 210,
                artwork: artInfo.artwork,
                artworkSource: artInfo.artworkSource,
                quality: 'FLAC / 320kbps Hi-Fi'
            };
            return {
                success: true,
                platform: 'Spotify',
                type: 'track',
                title: singleTrack.title,
                artwork: singleTrack.artwork,
                count: 1,
                tracks: [singleTrack]
            };
        }
    }

    const htmlFallback = await parseEntityFromHtml();
    if (htmlFallback) return htmlFallback;
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
    parseYouTubeTitle,
    extractCreditsFromDescription,
    cleanTrackName,
    cleanImportText,
    normalizeSpotifyUrl,
    normalizeYouTubeInputUrl,
    resolveSpotifyTrackArtwork,
    repairTracksArtwork,
    extractSpotifyTrackImage,
    isSafeExternalHttpUrl
};
