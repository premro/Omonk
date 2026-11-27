/**
 * Universal Playlist Importer Engine
 * Supports importing from Spotify, YouTube, Apple Music, and Plain Text / CSV lists.
 */

class PlaylistImporter {
    constructor() {
        this.loadPlaylists();
    }

    decodeImportText(str) {
        if (!str || typeof str !== 'string') return '';
        let cleaned = str.replace(/@@+/g, ' ');
        if (cleaned.includes('&')) {
            const entities = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&#039;': "'", '&apos;': "'", '&#x27;': "'", '&nbsp;': ' ' };
            cleaned = cleaned.replace(/&(?:amp|lt|gt|quot|apos|nbsp|#0?39|#x27);/gi, m => entities[m.toLowerCase()] || m);
        }
        return cleaned.replace(/\s{2,}/g, ' ').trim();
    }

    getStorageKey() {
        if (window.ProfileManager && window.ProfileManager.getStorageKey) {
            return window.ProfileManager.getStorageKey('playlists');
        }
        return 'user_imported_playlists';
    }

    async loadPlaylists() {
        const key = this.getStorageKey();
        const stored = localStorage.getItem(key);
        if (stored) {
            try {
                this.playlists = JSON.parse(stored);
            } catch (e) {
                this.playlists = [];
            }
        } else {
            const legacy = localStorage.getItem('user_imported_playlists');
            this.playlists = legacy ? JSON.parse(legacy) : [];
        }

        // Synchronize with IndexedDB (LosslessAudioDB)
        if (typeof window !== 'undefined' && window.OfflineEngine && typeof window.OfflineEngine.getPlaylistsFromDB === 'function') {
            try {
                const dbPlaylists = await window.OfflineEngine.getPlaylistsFromDB();
                if (Array.isArray(dbPlaylists) && dbPlaylists.length > 0) {
                    this.playlists = dbPlaylists;
                } else if (this.playlists.length > 0) {
                    window.OfflineEngine.savePlaylistsToDB(this.playlists);
                }
            } catch (e) {}
        }

        // Auto-clean any corrupt/undefined 0-track playlists and sanitize poisoned playlist-name albums
        if (Array.isArray(this.playlists)) {
            const initialLen = this.playlists.length;
            let fixedPoisonedAlbum = false;
            this.playlists = this.playlists.filter(p => {
                if (!p) return false;
                if ((!p.name || p.name === 'undefined') && (!p.tracks || p.tracks.length === 0)) {
                    return false;
                }
                if (p.id && String(p.id).startsWith('pl_sp_') && Array.isArray(p.tracks) && p.tracks.length > 1) {
                    for (const tr of p.tracks) {
                        if (tr && tr.album && tr.album === p.name) {
                            tr.album = '';
                            fixedPoisonedAlbum = true;
                        }
                    }
                }
                return true;
            });
            if (this.playlists.length !== initialLen || fixedPoisonedAlbum) {
                this.savePlaylists();
            }
        } else {
            this.playlists = [];
        }
    }

    savePlaylists() {
        const key = this.getStorageKey();
        // Never persist temporary expiring CDN signed stream URLs
        const sanitized = (this.playlists || []).map(p => ({
            ...p,
            tracks: (p.tracks || []).map(t => {
                const clean = { ...t };
                delete clean.streamUrl;
                return clean;
            })
        }));
        try {
            localStorage.setItem(key, JSON.stringify(sanitized));
        } catch (e) {}

        if (typeof window !== 'undefined' && window.OfflineEngine && typeof window.OfflineEngine.savePlaylistsToDB === 'function') {
            window.OfflineEngine.savePlaylistsToDB(sanitized).catch(() => {});
        }
    }

    getPlaylists() {
        return this.playlists;
    }

    getCustomPlaylists() {
        return this.playlists;
    }

    getPlaylistById(id) {
        return this.playlists.find(p => p.id === id);
    }

    deletePlaylist(id) {
        this.playlists = this.playlists.filter(p => p.id !== id);
        this.savePlaylists();
    }

    createPlaylist(name, description = '', artwork = '') {
        const title = (name && name.trim()) ? name.trim() : `My Playlist #${this.playlists.length + 1}`;
        const newPlaylist = {
            id: `pl_user_${Date.now()}`,
            name: title,
            description: (description || '').trim(),
            source: 'Custom',
            artwork: artwork || '',
            tracks: [],
            createdAt: Date.now()
        };
        this.playlists.unshift(newPlaylist);
        this.savePlaylists();
        return newPlaylist;
    }

    addTrackToPlaylist(playlistId, track) {
        if (!track) return { success: false, reason: 'No track provided' };
        const pl = this.getPlaylistById(playlistId);
        if (!pl) return { success: false, reason: 'Playlist not found' };
        if (!Array.isArray(pl.tracks)) pl.tracks = [];

        // Check if track already exists
        const exists = pl.tracks.some(t => 
            t.id === track.id || 
            (t.title && track.title && t.title.toLowerCase().trim() === track.title.toLowerCase().trim() && 
             t.artist && track.artist && t.artist.toLowerCase().trim() === track.artist.toLowerCase().trim())
        );

        if (exists) {
            return { success: false, alreadyExists: true, playlist: pl };
        }

        const cleanTrack = {
            id: track.id || `tr_${Date.now()}_${Math.floor(Math.random()*1000)}`,
            title: track.title || 'Untitled',
            artist: (track.artist && track.artist !== 'undefined') ? track.artist : (track.primaryArtist || 'Unknown Artist'),
            album: track.album || '',
            artwork: track.artwork || track.image || '',
            image: track.image || track.artwork || '',
            duration: track.duration || 210,
            spotifyId: track.spotifyId || '',
            youtubeId: track.youtubeId || '',
            quality: track.quality || 'FLAC / 320kbps Hi-Fi'
        };

        pl.tracks.push(cleanTrack);
        if (!pl.artwork && cleanTrack.artwork) {
            pl.artwork = cleanTrack.artwork;
        }
        this.savePlaylists();
        return { success: true, playlist: pl };
    }

    removeTrackFromPlaylist(playlistId, trackId) {
        const pl = this.getPlaylistById(playlistId);
        if (!pl || !Array.isArray(pl.tracks)) return false;
        pl.tracks = pl.tracks.filter(t => t.id !== trackId);
        this.savePlaylists();
        return true;
    }

    async importSpotify(url, onProgress = null) {
        if (onProgress) onProgress(20, 'Extracting tracklist...');
        const resp = await fetch(`${window.API_PREFIX || ''}/api/import/spotify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        const data = await resp.json();
        if (!data.success) {
            throw new Error(data.error || 'Failed to import playlist');
        }

        const rawTracks = data.tracks || (data.track ? [data.track] : []);
        if (!rawTracks || rawTracks.length === 0) {
            throw new Error('No tracks found in this playlist. Please ensure the playlist is public.');
        }
        const playlistCover = data.artwork || '';
        const tracks = rawTracks.map((t, idx) => {
            const trackArt = t.artwork || t.image || '';
            const albumArt = t.albumArtwork || '';
            const bestArt = trackArt || albumArt || playlistCover || '';
            const artSource = t.artworkSource || (trackArt ? 'track' : (albumArt ? 'album' : (playlistCover ? 'playlist_fallback' : 'fallback')));
            return {
                id: t.id || `sp_tr_${Date.now()}_${idx}`,
                spotifyId: t.spotifyId || '',
                resolvedId: t.resolvedId || '',
                title: this.decodeImportText(t.title || ''),
                artist: this.decodeImportText(t.artist || ''),
                album: this.decodeImportText(t.album || (data.type === 'album' ? data.title : '') || ''),
                language: t.language || '',
                duration: t.duration || 210,
                artwork: bestArt,
                image: bestArt,
                artworkSource: artSource,
                streamUrl: t.streamUrl || '',
                quality: t.quality || 'FLAC / 320kbps Hi-Fi'
            };
        });

        // If single track import, pre-resolve lossless stream immediately
        if (tracks.length === 1 && !tracks[0].streamUrl) {
            try {
                if (onProgress) onProgress(60, `Resolving lossless stream for "${tracks[0].title}"...`);
                const prefix = window.API_PREFIX || '';
                const resStream = await fetch(`${prefix}/api/resolve?title=${encodeURIComponent(tracks[0].title)}&artist=${encodeURIComponent(tracks[0].artist || '')}&album=${encodeURIComponent(tracks[0].album || '')}&duration=${encodeURIComponent(tracks[0].duration || 0)}&spotifyId=${encodeURIComponent(tracks[0].spotifyId || '')}`);
                if (resStream.ok) {
                    const resJson = await resStream.json();
                    if (resJson.success && resJson.track && resJson.track.streamUrl) {
                        tracks[0].streamUrl = resJson.track.streamUrl;
                        if (resJson.track.duration) tracks[0].duration = resJson.track.duration;
                        if (!tracks[0].album && resJson.track.album) tracks[0].album = this.decodeImportText(resJson.track.album);
                        if (resJson.track.artwork && !resJson.track.artwork.includes('default_') && !resJson.track.artwork.includes('omonk_logo')) {
                            tracks[0].artwork = resJson.track.artwork;
                            tracks[0].image = resJson.track.artwork;
                            tracks[0].artworkSource = 'omonk_track';
                        }
                    }
                }
            } catch (e) {}
        }

        const newPlaylist = {
            id: `pl_sp_${Date.now()}`,
            name: this.decodeImportText(data.title || 'Curated Playlist'),
            source: 'Curated',
            sourceUrl: url,
            artwork: playlistCover || (tracks[0] ? tracks[0].artwork : ''),
            tracks: tracks,
            _importReport: {
                skippedCount: Number(data.skippedCount || 0),
                skippedTracks: Array.isArray(data.skippedTracks) ? data.skippedTracks : [],
                totalAttempted: Number(data.totalAttempted || tracks.length)
            },
            createdAt: Date.now()
        };

        this.playlists.unshift(newPlaylist);
        this.savePlaylists();
        const skippedMsg = newPlaylist._importReport.skippedCount > 0
            ? ` (${newPlaylist._importReport.skippedCount} unavailable skipped)`
            : '';
        if (onProgress) onProgress(100, `Imported ${newPlaylist.tracks.length} tracks!${skippedMsg}`);
        return newPlaylist;
    }

    async repairPlaylistArtwork(playlistId, { force = false, onProgress = null } = {}) {
        const pl = this.getPlaylistById(playlistId);
        if (!pl || !Array.isArray(pl.tracks) || pl.tracks.length === 0) {
            return { updated: 0, total: 0, playlist: pl || null };
        }
        const cover = (pl.artwork || pl.coverArt || pl.image || '').trim();
        const artFreq = new Map();
        pl.tracks.forEach(tr => {
            const a = (tr?.artwork || tr?.image || '').trim();
            if (a) artFreq.set(a, (artFreq.get(a) || 0) + 1);
        });
        const needsRepairIndices = [];
        pl.tracks.forEach((tr, idx) => {
            if (!tr || !tr.title) return;
            const art = (tr.artwork || tr.image || '').trim();
            const isSharedCover = Boolean((cover && art === cover && pl.tracks.length > 1) || (art && (artFreq.get(art) || 0) > 1));
            const isFallback = !art || art.includes('icon-512') || art.includes('default_') || art.includes('omonk_logo') || art.includes('unsplash.com') || art.includes('/playlist');
            if (force || isSharedCover || isFallback || tr.artworkSource === 'playlist_fallback' || tr.artworkSource === 'playlist_cover' || tr.artworkSource === 'fallback') {
                needsRepairIndices.push(idx);
            }
        });

        if (needsRepairIndices.length === 0) {
            if (onProgress) onProgress(100, 'All tracks already have individual artwork.');
            return { updated: 0, total: pl.tracks.length, playlist: pl };
        }

        const prefix = window.API_PREFIX || '';
        let updatedCount = 0;
        const batchSize = 50;
        for (let b = 0; b < needsRepairIndices.length; b += batchSize) {
            const batchIndices = needsRepairIndices.slice(b, b + batchSize);
            const batchTracks = batchIndices.map(idx => {
                const tr = pl.tracks[idx];
                return {
                    id: tr.id,
                    spotifyId: tr.spotifyId || '',
                    youtubeId: tr.youtubeId || '',
                    title: tr.title,
                    artist: tr.artist || '',
                    album: tr.album || '',
                    artwork: tr.artwork || tr.image || ''
                };
            });
            try {
                if (onProgress) {
                    const pct = Math.min(95, Math.round(((b + batchIndices.length) / needsRepairIndices.length) * 90) + 5);
                    onProgress(pct, `Refreshing individual track artwork (${b + 1}-${b + batchIndices.length} of ${needsRepairIndices.length})...`);
                }
                const resp = await fetch(`${prefix}/api/import/repair-artwork`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tracks: batchTracks, playlistCover: cover, force: Boolean(force) })
                });
                if (resp.ok) {
                    const json = await resp.json();
                    const repaired = Array.isArray(json.tracks) ? json.tracks : [];
                    batchIndices.forEach((origIdx, rIdx) => {
                        const existing = pl.tracks[origIdx];
                        const rep = repaired[rIdx];
                        if (!existing || !rep) return;
                        const newArt = (rep.artwork || rep.image || '').trim();
                        if (newArt && newArt !== existing.artwork && (!cover || newArt !== cover || !existing.artwork)) {
                            // Preserve id, likes, user order, custom title/artist edits; update artwork safely
                            existing.artwork = newArt;
                            existing.image = newArt;
                            if (rep.artworkSource) existing.artworkSource = rep.artworkSource;
                            if (!existing.album && rep.album) existing.album = this.decodeImportText(rep.album);
                            if (!existing.language && rep.language) existing.language = rep.language;
                            if (!existing.resolvedId && rep.resolvedId) existing.resolvedId = rep.resolvedId;
                            updatedCount++;
                        }
                    });
                }
            } catch (e) {
                console.warn('[Importer] repairPlaylistArtwork batch failed:', e);
            }
        }

        if (updatedCount > 0) {
            this.savePlaylists();
        }
        if (onProgress) onProgress(100, updatedCount > 0 ? `Updated artwork for ${updatedCount} tracks!` : 'Artwork check complete.');
        return { updated: updatedCount, total: pl.tracks.length, playlist: pl };
    }

    async importYouTube(url, onProgress = null) {
        if (onProgress) onProgress(20, 'Connecting to YouTube lossless resolver...');
        const resp = await fetch(`${window.API_PREFIX || ''}/api/import/youtube`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        const data = await resp.json();
        if (!data.success) {
            throw new Error(data.error || 'Failed to import YouTube audio/playlist');
        }

        const rawTracks = data.tracks || [];
        const ytCover = data.artwork || '';
        const tracks = rawTracks.map((t, idx) => {
            const trackArt = t.artwork || t.image || '';
            const bestArt = trackArt || ytCover || '';
            return {
                id: t.id || `yt_tr_${Date.now()}_${idx}`,
                youtubeId: t.youtubeId || '',
                resolvedId: t.resolvedId || '',
                title: this.decodeImportText(t.title || ''),
                artist: this.decodeImportText(t.artist || ''),
                album: this.decodeImportText(t.album || ''),
                language: t.language || '',
                era: t.era || '',
                duration: t.duration || 210,
                durationEstimated: Boolean(t.durationEstimated),
                artwork: bestArt,
                image: bestArt,
                artworkSource: t.artworkSource || (trackArt ? 'track' : (ytCover ? 'playlist_fallback' : 'fallback')),
                streamUrl: t.streamUrl || '',
                quality: 'FLAC / 320kbps Hi-Fi'
            };
        });

        if (tracks.length === 1 && !tracks[0].streamUrl) {
            try {
                if (onProgress) onProgress(60, `Resolving lossless stream for "${tracks[0].title}"...`);
                const prefix = window.API_PREFIX || '';
                let resolveUrl = `${prefix}/api/resolve?title=${encodeURIComponent(tracks[0].title)}&artist=${encodeURIComponent(tracks[0].artist || '')}&album=${encodeURIComponent(tracks[0].album || '')}&lang=${encodeURIComponent(tracks[0].language || '')}&youtubeId=${encodeURIComponent(tracks[0].youtubeId || '')}`;
                if (!tracks[0].durationEstimated && tracks[0].duration) {
                    resolveUrl += `&duration=${encodeURIComponent(tracks[0].duration)}`;
                }
                const resStream = await fetch(resolveUrl);
                if (resStream.ok) {
                    const resJson = await resStream.json();
                    if (resJson.success && resJson.track && resJson.track.streamUrl) {
                        tracks[0].streamUrl = resJson.track.streamUrl;
                        if (resJson.track.duration) tracks[0].duration = resJson.track.duration;
                        if (resJson.track.artwork && !resJson.track.artwork.includes('default_') && !resJson.track.artwork.includes('omonk_logo')) {
                            tracks[0].artwork = resJson.track.artwork;
                            tracks[0].image = resJson.track.artwork;
                            tracks[0].artworkSource = 'omonk_track';
                        }
                        if (!tracks[0].album && resJson.track.album) tracks[0].album = this.decodeImportText(resJson.track.album);
                    }
                }
            } catch (e) {}
        }

        let plTitle = this.decodeImportText(data.title || '');
        if (!plTitle || plTitle.toLowerCase() === 'undefined' || plTitle.toLowerCase() === 'youtube') {
            plTitle = tracks.length === 1 ? tracks[0].title : 'YouTube Imported Playlist';
        }

        const newPlaylist = {
            id: `pl_yt_${Date.now()}`,
            name: plTitle,
            source: 'YouTube',
            sourceUrl: url,
            artwork: ytCover || (tracks.length > 0 ? tracks[0].artwork : ''),
            tracks: tracks,
            _importReport: {
                skippedCount: Number(data.skippedCount || 0),
                skippedTracks: Array.isArray(data.skippedTracks) ? data.skippedTracks : [],
                totalAttempted: Number(data.totalAttempted || tracks.length)
            },
            createdAt: Date.now()
        };

        this.playlists.unshift(newPlaylist);
        this.savePlaylists();
        const skippedMsg = newPlaylist._importReport.skippedCount > 0
            ? ` (${newPlaylist._importReport.skippedCount} unavailable skipped)`
            : '';
        if (onProgress) onProgress(100, `Imported ${newPlaylist.tracks.length} track${newPlaylist.tracks.length === 1 ? '' : 's'}!${skippedMsg}`);
        return newPlaylist;
    }

    async splitJukeboxPlaylist(playlistId, onProgress = null) {
        const pl = this.getPlaylistById(playlistId);
        if (!pl) throw new Error('Playlist not found');
        if (onProgress) onProgress(20, 'Scanning YouTube for album chapters...');

        let url = pl.sourceUrl;
        if (!url && pl.tracks?.[0]?.youtubeId) {
            url = `https://www.youtube.com/watch?v=${pl.tracks[0].youtubeId}`;
        }
        if (!url && pl.artwork) {
            const vm = pl.artwork.match(/\/vi\/([a-zA-Z0-9_-]{11})\//);
            if (vm) url = `https://www.youtube.com/watch?v=${vm[1]}`;
        }
        if (!url && pl.name.toLowerCase().includes('ilayaraaja')) {
            url = 'https://www.youtube.com/watch?v=UThJRnZvuHM';
        }
        if (!url) {
            url = `https://www.youtube.com/results?search_query=${encodeURIComponent(pl.name)}`;
        }

        const resp = await fetch(`${window.API_PREFIX || ''}/api/import/youtube`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        const data = await resp.json();
        if (data.success && data.tracks && data.tracks.length > 1) {
            pl.tracks = data.tracks.map((t, idx) => ({
                id: t.id || `yt_tr_${Date.now()}_${idx}`,
                youtubeId: t.youtubeId || '',
                title: t.title,
                artist: t.artist,
                album: t.album || '',
                language: t.language || '',
                era: t.era || '',
                duration: t.duration || 210,
                durationEstimated: Boolean(t.durationEstimated),
                artwork: t.artwork || data.artwork || pl.artwork,
                quality: 'FLAC / 320kbps Hi-Fi'
            }));
            pl.sourceUrl = url;
            this.savePlaylists();
            if (onProgress) onProgress(100, `Successfully split into ${pl.tracks.length} songs!`);
            return pl;
        } else {
            throw new Error(data.error || 'No individual chapters found in this video.');
        }
    }

    async importText(text, playlistName = "Imported List", onProgress = null) {
        if (onProgress) onProgress(30, 'Parsing tracklist text...');
        const resp = await fetch(`${window.API_PREFIX || ''}/api/import/text`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
        const data = await resp.json();
        if (!data.success) {
            throw new Error(data.error || 'Failed to parse text playlist');
        }

        const newPlaylist = {
            id: `pl_txt_${Date.now()}`,
            name: this.decodeImportText(playlistName || 'Custom Imported Playlist'),
            source: 'Manual / Text',
            artwork: '',
            tracks: (data.tracks || []).map(t => ({
                ...t,
                title: this.decodeImportText(t.title || ''),
                artist: this.decodeImportText(t.artist || ''),
                album: this.decodeImportText(t.album || '')
            })),
            createdAt: Date.now()
        };

        this.playlists.unshift(newPlaylist);
        this.savePlaylists();
        if (onProgress) onProgress(100, `Imported ${newPlaylist.tracks.length} tracks!`);
        return newPlaylist;
    }

    async batchDownloadPlaylist(playlistId, onProgress = null) {
        const playlist = this.getPlaylistById(playlistId);
        if (!playlist || !playlist.tracks.length) return;

        const total = playlist.tracks.length;
        let completed = 0;

        for (const track of playlist.tracks) {
            try {
                if (onProgress) {
                    const pct = Math.floor((completed / total) * 100);
                    onProgress(pct, `Downloading (${completed + 1}/${total}): ${track.title}`);
                }
                await window.OfflineEngine.downloadTrackToOfflineDB(track);
            } catch (e) {
                console.warn(`Failed downloading ${track.title}:`, e);
            }
            completed++;
        }

        if (onProgress) onProgress(100, `All ${total} tracks downloaded offline!`);
    }
}

window.Importer = new PlaylistImporter();
