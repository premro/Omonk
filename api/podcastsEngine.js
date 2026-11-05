const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

let featuredPodcasts = [];
try {
    const raw = fs.readFileSync(path.join(__dirname, 'verified_podcasts.json'), 'utf-8');
    const parsed = JSON.parse(raw);
    featuredPodcasts = Array.isArray(parsed) ? parsed : Object.values(parsed);
} catch (e) {
    featuredPodcasts = [];
}

const PODCAST_CACHE = {};
for (const p of featuredPodcasts) {
    if (p.id) PODCAST_CACHE[p.id] = p;
}

function fetchWithRedirects(url, maxRedirects = 5, timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
        if (!url || maxRedirects <= 0) {
            return reject(new Error('Invalid URL or too many redirects'));
        }
        const client = url.startsWith('https') ? https : http;
        const req = client.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml,application/rss+xml,*/*'
            }
        }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                let redirectUrl = res.headers.location;
                if (!redirectUrl.startsWith('http')) {
                    const u = new URL(url);
                    redirectUrl = u.origin + redirectUrl;
                }
                return resolve(fetchWithRedirects(redirectUrl, maxRedirects - 1, timeoutMs));
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        });
        req.on('error', reject);
        req.setTimeout(timeoutMs, () => {
            req.destroy();
            reject(new Error('Request timed out'));
        });
    });
}

function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return hash;
}

function parseRss(xml, fallbackShow) {
    const episodes = [];
    const chTitleMatch = xml.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    const chDescMatch = xml.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
    const chAuthorMatch = xml.match(/<itunes:author>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/itunes:author>/i);
    
    let chArt = fallbackShow?.avatar || '';
    const itunesImgMatch = xml.match(/<itunes:image[\s\S]*?href=[\"']([^\"']+)[\"']/i);
    if (itunesImgMatch) chArt = itunesImgMatch[1];

    const channelMeta = {
        title: (chTitleMatch ? chTitleMatch[1].trim() : (fallbackShow?.name || 'Podcast')),
        description: (chDescMatch ? chDescMatch[1].replace(/<[^>]+>/g, '').trim().slice(0, 400) : (fallbackShow?.description || '')),
        author: (chAuthorMatch ? chAuthorMatch[1].trim() : (fallbackShow?.publisher || 'Studio Host')),
        artwork: chArt
    };

    const itemRegex = /<item[\s\S]*?<\/item>/gi;
    let match;
    let idx = 0;
    while ((match = itemRegex.exec(xml)) !== null && idx < 100) {
        const itemXml = match[0];
        const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : `Episode #${idx + 1}`;

        const encMatch = itemXml.match(/<enclosure[\s\S]*?url=[\"']([^\"']+)[\"']/i);
        const streamUrl = encMatch ? encMatch[1] : '';

        const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
        const desc = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim().slice(0, 320) : '';

        const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
        let cleanDate = 'Recent';
        if (pubDateMatch) {
            const rawDate = pubDateMatch[1].trim();
            const dp = rawDate.split(' ');
            if (dp.length >= 4) {
                cleanDate = `${dp[2]} ${dp[1]}, ${dp[3]}`;
            } else {
                cleanDate = rawDate.slice(0, 16);
            }
        }

        let epArt = chArt;
        const epImgMatch = itemXml.match(/<itunes:image[\s\S]*?href=[\"']([^\"']+)[\"']/i);
        if (epImgMatch) epArt = epImgMatch[1];

        const durMatch = itemXml.match(/<itunes:duration>([\s\S]*?)<\/itunes:duration>/i);
        let duration = 1800;
        if (durMatch) {
            const parts = durMatch[1].trim().split(':');
            if (parts.length === 3) duration = parseInt(parts[0], 10)*3600 + parseInt(parts[1], 10)*60 + parseInt(parts[2], 10);
            else if (parts.length === 2) duration = parseInt(parts[0], 10)*60 + parseInt(parts[1], 10);
            else duration = parseInt(durMatch[1], 10) || 1800;
        }

        if (streamUrl) {
            episodes.push({
                id: `pod_ep_${idx}_${Math.abs(hashCode(title)) % 1000000}`,
                title,
                artist: channelMeta.author || channelMeta.title,
                album: channelMeta.title,
                description: desc,
                duration,
                artwork: epArt,
                streamUrl,
                pubDate: cleanDate,
                quality: 'Podcast Audio Stream',
                isPodcast: true
            });
            idx++;
        }
    }

    return { channelMeta, episodes };
}

async function searchPodcasts(query, limit = 16) {
    if (!query || !query.trim()) {
        return featuredPodcasts;
    }

    const cleanQ = query.trim();
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanQ)}&entity=podcast&limit=${limit}`;

    try {
        const body = await fetchWithRedirects(itunesUrl, 3, 5000);
        const data = JSON.parse(body);
        const results = [];

        for (const item of (data.results || [])) {
            const pid = `pod_${item.collectionId}`;
            const podObj = {
                id: pid,
                name: item.collectionName || 'Podcast Show',
                publisher: item.artistName || 'Host',
                avatar: item.artworkUrl600 || item.artworkUrl100 || '',
                badge: item.primaryGenreName || 'Podcast',
                description: `${item.collectionName} by ${item.artistName}`,
                category: item.primaryGenreName || 'Talk Show',
                feedUrl: item.feedUrl || '',
                genres: item.genres || [item.primaryGenreName || 'Podcast']
            };
            PODCAST_CACHE[pid] = podObj;
            results.push(podObj);
        }

        // Also check if any featured match
        const lowerQ = cleanQ.toLowerCase();
        for (const f of featuredPodcasts) {
            if ((f.name && f.name.toLowerCase().includes(lowerQ)) || (f.publisher && f.publisher.toLowerCase().includes(lowerQ))) {
                if (!results.find(r => r.name.toLowerCase() === f.name.toLowerCase())) {
                    results.unshift(f);
                }
            }
        }

        return results;
    } catch (err) {
        console.error('Podcast search error, falling back to featured:', err);
        const lowerQ = cleanQ.toLowerCase();
        return featuredPodcasts.filter(p => (
            (p.name && p.name.toLowerCase().includes(lowerQ)) ||
            (p.publisher && p.publisher.toLowerCase().includes(lowerQ))
        ));
    }
}

const DETAIL_CACHE = new Map();
const DETAIL_CACHE_TTL = 15 * 60 * 1000; // 15 minutes in-memory cache

async function getPodcastDetail(podId, feedUrl) {
    let show = PODCAST_CACHE[podId] || featuredPodcasts.find(p => p.id === podId) || null;

    if (!show && podId && podId.startsWith('pod_')) {
        const colId = podId.replace('pod_', '');
        try {
            const body = await fetchWithRedirects(`https://itunes.apple.com/lookup?id=${encodeURIComponent(colId)}`, 3, 5000);
            const data = JSON.parse(body);
            if (data.results && data.results.length > 0) {
                const item = data.results[0];
                show = {
                    id: podId,
                    name: item.collectionName || 'Podcast Show',
                    publisher: item.artistName || 'Host',
                    avatar: item.artworkUrl600 || item.artworkUrl100 || '',
                    badge: item.primaryGenreName || 'Podcast',
                    description: `${item.collectionName} by ${item.artistName}`,
                    category: item.primaryGenreName || 'Talk Show',
                    feedUrl: item.feedUrl || '',
                    genres: item.genres || [item.primaryGenreName || 'Podcast']
                };
                PODCAST_CACHE[podId] = show;
            }
        } catch (e) {
            console.error('Failed to lookup podcast collection:', e);
        }
    }

    if (show && Array.isArray(show.episodes) && show.episodes.length > 0 && (!feedUrl || !show.feedUrl)) {
        return { podcast: show, episodes: show.episodes };
    }

    const effectiveFeed = feedUrl || show?.feedUrl;
    if (!effectiveFeed) {
        return { podcast: show, episodes: show?.episodes || [] };
    }

    const cacheKey = `${podId || ''}_${effectiveFeed}`;
    if (DETAIL_CACHE.has(cacheKey)) {
        const cached = DETAIL_CACHE.get(cacheKey);
        if (Date.now() - cached.time < DETAIL_CACHE_TTL) {
            return cached.data;
        }
    }

    try {
        const xml = await fetchWithRedirects(effectiveFeed, 5, 8000);
        const { channelMeta, episodes } = parseRss(xml, show);
        const mergedPod = Object.assign({}, show || {}, {
            name: channelMeta.title || show?.name,
            description: channelMeta.description || show?.description,
            publisher: channelMeta.author || show?.publisher,
            avatar: channelMeta.artwork || show?.avatar
        });
        if (podId) PODCAST_CACHE[podId] = mergedPod;
        const result = { podcast: mergedPod, episodes };
        DETAIL_CACHE.set(cacheKey, { time: Date.now(), data: result });
        return result;
    } catch (e) {
        console.error('Failed to parse podcast RSS feed:', e);
        return { podcast: show, episodes: show?.episodes || [] };
    }
}

module.exports = {
    searchPodcasts,
    getPodcastDetail,
    featuredPodcasts
};
