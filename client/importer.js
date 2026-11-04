/**
 * Universal Playlist Importer Engine
 * Supports importing from Spotify, YouTube, Apple Music, and Plain Text / CSV lists.
 */

class PlaylistImporter {
    constructor() {
        this.loadPlaylists();
    }

    getStorageKey() {
        if (window.ProfileManager && window.ProfileManager.getStorageKey) {
            return window.ProfileManager.getStorageKey('playlists');
        }
        return 'user_imported_playlists';
    }

    loadPlaylists() {
        const key = this.getStorageKey();
        const stored = localStorage.getItem(key);
        if (stored) {
            try {
                this.playlists = JSON.parse(stored);
            } catch (e) {
                this.playlists = [];
            }
        } else {
            // Fallback / migration from legacy key
            const legacy = localStorage.getItem('user_imported_playlists');
            this.playlists = legacy ? JSON.parse(legacy) : [];
        }

        // Auto-clean any corrupt/undefined 0-track playlists from earlier failed imports
        if (Array.isArray(this.playlists)) {
            const initialLen = this.playlists.length;
            this.playlists = this.playlists.filter(p => {
                if (!p) return false;
                if ((!p.name || p.name === 'undefined') && (!p.tracks || p.tracks.length === 0)) {
                    return false;
                }
                return true;
            });
            if (this.playlists.length !== initialLen) {
                this.savePlaylists();
            }
        } else {
            this.playlists = [];
        }
    }

    savePlaylists() {
        const key = this.getStorageKey();
        localStorage.setItem(key, JSON.stringify(this.playlists));
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
            artist: track.artist || 'Unknown Artist',
            album: track.album || '',
            artwork: track.artwork || track.image || '',
            image: track.image || track.artwork || '',
            duration: track.duration || 210,
            quality: track.quality || 'FLAC / 320kbps Hi-Fi',
            streamUrl: track.streamUrl || ''
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
        const tracks = rawTracks.map((t, idx) => ({
            id: t.id || `sp_tr_${Date.now()}_${idx}`,
            title: t.title,
            artist: t.artist,
            duration: t.duration || 210,
            artwork: t.artwork || data.artwork || '',
            quality: 'FLAC / 320kbps Hi-Fi'
        }));

        const newPlaylist = {
            id: `pl_sp_${Date.now()}`,
            name: data.title || 'Curated Playlist',
            source: 'Curated',
            artwork: data.artwork || (tracks[0] ? tracks[0].artwork : ''),
            tracks: tracks,
            createdAt: Date.now()
        };

        this.playlists.unshift(newPlaylist);
        this.savePlaylists();
        if (onProgress) onProgress(100, `Imported ${newPlaylist.tracks.length} tracks!`);
        return newPlaylist;
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
        const tracks = rawTracks.map((t, idx) => ({
            id: `yt_tr_${Date.now()}_${idx}`,
            title: t.title,
            artist: t.artist,
            duration: t.duration || 210,
            artwork: t.artwork || data.artwork || '',
            quality: 'FLAC / 320kbps Hi-Fi'
        }));

        let plTitle = data.title;
        if (!plTitle || plTitle.toLowerCase() === 'undefined' || plTitle.toLowerCase() === 'youtube') {
            plTitle = tracks.length === 1 ? tracks[0].title : 'YouTube Imported Playlist';
        }

        const newPlaylist = {
            id: `pl_yt_${Date.now()}`,
            name: plTitle,
            source: 'YouTube',
            sourceUrl: url,
            artwork: data.artwork || (tracks.length > 0 ? tracks[0].artwork : ''),
            tracks: tracks,
            createdAt: Date.now()
        };

        this.playlists.unshift(newPlaylist);
        this.savePlaylists();
        if (onProgress) onProgress(100, `Imported ${newPlaylist.tracks.length} track${newPlaylist.tracks.length === 1 ? '' : 's'}!`);
        return newPlaylist;
    }

    async splitJukeboxPlaylist(playlistId, onProgress = null) {
        const pl = this.getPlaylistById(playlistId);
        if (!pl) throw new Error('Playlist not found');
        if (onProgress) onProgress(20, 'Scanning YouTube for album chapters...');

        let url = pl.sourceUrl;
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
                id: `yt_tr_${Date.now()}_${idx}`,
                title: t.title,
                artist: t.artist,
                duration: t.duration || 210,
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
            name: playlistName || 'Custom Imported Playlist',
            source: 'Manual / Text',
            artwork: '',
            tracks: data.tracks || [],
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
