/**
 * Synchronized Karaoke & Interactive Lyrics Renderer with Smart Multi-Lingual & Dual Script Engine
 * Supports Romanized/English (Tanglish/Tenglish/Hinglish) + Native Script (Tamil, Telugu, Hindi, etc.)
 * Filters cross-language dubs and provides in-player 1-tap script switching.
 */

class LyricsManager {
    constructor() {
        this.currentLyrics = []; // [{ time: seconds, text: string }]
        this.plainLyrics = "";
        this.activeLineIndex = -1;
        this.container = null;
        this.isAutoScrollEnabled = true;
        this.currentTrack = null;

        // Dual Script State
        this.hasDual = false;
        this.activeScript = "english"; // 'english' | 'native'
        this.englishLyrics = [];
        this.englishPlain = "";
        this.nativeLyrics = [];
        this.nativePlain = "";
        this.nativeLabel = "🌐 Native";

        this.initLrclibUI();
    }

    bindContainer(element) {
        this.container = element;
    }

    initLrclibUI() {
        if (typeof document === 'undefined') return;

        const openBtn = document.getElementById('openLrclibSearchBtn');
        const closeBtn = document.getElementById('closeLrclibSearchBtn');
        const execBtn = document.getElementById('execLrclibSearchBtn');
        const searchInput = document.getElementById('lrclibSearchInput');
        const searchSection = document.getElementById('lrclibSearchSection');

        const engBtn = document.getElementById('lyricsScriptEnglishBtn');
        const natBtn = document.getElementById('lyricsScriptNativeBtn');

        // Script Switchers (English <-> Native)
        engBtn?.addEventListener('click', () => {
            if (this.activeScript === 'english') return;
            this.switchScript('english');
        });

        natBtn?.addEventListener('click', () => {
            if (this.activeScript === 'native') return;
            this.switchScript('native');
        });

        // Search Drawer Toggle
        openBtn?.addEventListener('click', () => {
            if (!searchSection) return;
            const isVisible = searchSection.style.display !== 'none';
            searchSection.style.display = isVisible ? 'none' : 'block';
            if (!isVisible && this.currentTrack && searchInput) {
                searchInput.value = `${this.currentTrack.title} ${this.currentTrack.artist || ''}`.trim();
                searchInput.focus();
            }
        });

        closeBtn?.addEventListener('click', () => {
            if (searchSection) searchSection.style.display = 'none';
        });

        execBtn?.addEventListener('click', () => {
            const q = searchInput?.value.trim();
            if (q) this.executeLrclibSearch(q);
        });

        searchInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const q = searchInput.value.trim();
                if (q) this.executeLrclibSearch(q);
            }
        });
    }

    switchScript(targetScript) {
        this.activeScript = targetScript;
        const engBtn = document.getElementById('lyricsScriptEnglishBtn');
        const natBtn = document.getElementById('lyricsScriptNativeBtn');

        if (engBtn) engBtn.classList.toggle('active', targetScript === 'english');
        if (natBtn) natBtn.classList.toggle('active', targetScript === 'native');

        if (targetScript === 'english') {
            this.currentLyrics = this.englishLyrics;
            this.plainLyrics = this.englishPlain;
        } else {
            this.currentLyrics = this.nativeLyrics;
            this.plainLyrics = this.nativePlain;
        }

        this.render();

        // Immediately sync seek time
        if (window.AudioPlayer?.audio) {
            this.updateTime(window.AudioPlayer.audio.currentTime || 0);
        }

        if (window.showToast) {
            const label = targetScript === 'english' ? '🔤 English / Romanized' : this.nativeLabel;
            window.showToast(`Switched lyrics to ${label}`, '🔤');
        }
    }

    parseLRC(lrcString) {
        if (!lrcString || typeof lrcString !== 'string') return [];
        const lines = lrcString.split('\n');
        const parsed = [];
        const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/;

        for (const line of lines) {
            const match = line.match(timeRegex);
            if (match) {
                const min = parseInt(match[1], 10);
                const sec = parseInt(match[2], 10);
                const ms = match[3] ? parseInt(match[3].padEnd(3, '0').slice(0, 3), 10) : 0;
                const totalSeconds = min * 60 + sec + ms / 1000;
                const text = line.replace(timeRegex, '').trim();
                if (text) {
                    parsed.push({ time: totalSeconds, text });
                }
            }
        }
        return parsed.sort((a, b) => a.time - b.time);
    }

    async loadLyricsForTrack(track) {
        this.currentTrack = track;
        this.currentLyrics = [];
        this.plainLyrics = "";
        this.activeLineIndex = -1;
        this.hasDual = false;
        this.englishLyrics = [];
        this.englishPlain = "";
        this.nativeLyrics = [];
        this.nativePlain = "";
        this.renderLoading();

        const toggleWrap = document.getElementById('lyricsScriptToggleWrap');
        if (toggleWrap) toggleWrap.style.display = 'none';

        // 1. Check local persistent lyrics cache
        const cacheKey = `lyrics_cache_${track.id}`;
        try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                const data = JSON.parse(cached);
                this.applyFetchedData(data);
                return;
            }
        } catch(e) {}

        // 2. Fetch from backend with clean title, language matching & regional dub filtering
        let fetchedData = null;
        try {
            const langParam = encodeURIComponent(track.language || 'tamil');
            const res = await fetch(`${window.API_PREFIX || ""}/api/lyrics?title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(track.artist || '')}&duration=${track.duration || 0}&language=${langParam}`);
            if (res.ok) {
                fetchedData = await res.json();
            }
        } catch (err) {}

        if (fetchedData && (fetchedData.syncedLyrics || fetchedData.plainLyrics || fetchedData.hasDual)) {
            this.applyFetchedData(fetchedData);
            try {
                localStorage.setItem(cacheKey, JSON.stringify(fetchedData));
            } catch(e) {}
            return;
        }

        // 3. ZERO-TOUCH AUTO-APPLY FALLBACK: Search LRCLIB index and auto-apply best synchronized lyrics
        try {
            const cleanTitle = (track.title || '').replace(/\(.*?\)|\[.*?\]/g, '').trim();
            const searchQueries = [
                `${cleanTitle} ${(track.artist || '').split(/[,&]/)[0]}`.trim(),
                cleanTitle,
                cleanTitle.replace(/aa/g, 'a').replace(/ee/g, 'i')
            ];

            for (const sq of searchQueries) {
                const sRes = await fetch(`${window.API_PREFIX || ""}/api/lyrics/search?q=${encodeURIComponent(sq)}&language=${encodeURIComponent(track.language || 'tamil')}`);
                if (!sRes.ok) continue;
                const sData = await sRes.json();
                const candidates = sData.results || [];
                if (candidates.length > 0) {
                    const chosen = candidates.find(c => c.syncedLyrics || c.hasSynced) || candidates[0];
                    if (chosen && (chosen.syncedLyrics || chosen.plainLyrics)) {
                        this.applyLrclibLyrics(chosen);
                        return;
                    }
                }
            }
        } catch(e) {}

        this.renderError("No lyrics found for this song.");
    }

    applyFetchedData(data) {
        if (!data || (!data.syncedLyrics && !data.plainLyrics && !data.hasDual)) {
            this.renderError("No lyrics found for this song.");
            return;
        }

        const toggleWrap = document.getElementById('lyricsScriptToggleWrap');
        const engBtn = document.getElementById('lyricsScriptEnglishBtn');
        const natBtn = document.getElementById('lyricsScriptNativeBtn');

        if (data.hasDual) {
            this.hasDual = true;
            this.englishLyrics = data.english ? this.parseLRC(data.english.syncedLyrics) : [];
            this.englishPlain = data.english?.plainLyrics || "";
            this.nativeLyrics = data.native ? this.parseLRC(data.native.syncedLyrics) : [];
            this.nativePlain = data.native?.plainLyrics || "";
            this.nativeLabel = data.native?.scriptLabel || "🌐 Native";

            if (toggleWrap) toggleWrap.style.display = 'inline-flex';
            if (natBtn) natBtn.textContent = this.nativeLabel.replace(' (Tamil)', '').replace(' (Telugu)', '');

            // Choose default script
            const defaultScript = data.defaultScript || 'english';
            this.activeScript = defaultScript;
            if (engBtn) engBtn.classList.toggle('active', defaultScript === 'english');
            if (natBtn) natBtn.classList.toggle('active', defaultScript === 'native');

            if (defaultScript === 'english') {
                this.currentLyrics = this.englishLyrics;
                this.plainLyrics = this.englishPlain;
            } else {
                this.currentLyrics = this.nativeLyrics;
                this.plainLyrics = this.nativePlain;
            }
        } else {
            this.hasDual = false;
            if (toggleWrap) toggleWrap.style.display = 'none';
            if (data.syncedLyrics) {
                this.currentLyrics = this.parseLRC(data.syncedLyrics);
            }
            this.plainLyrics = data.plainLyrics || "";
        }

        this.render();

        const sideSnippet = document.getElementById('sideLyricsSnippet');
        if (sideSnippet && this.currentLyrics && this.currentLyrics.length > 0) {
            const l1 = this.currentLyrics[0].text;
            const l2 = this.currentLyrics[1]?.text || '';
            sideSnippet.innerHTML = `<span style="color: #fff; font-weight: 800;">${l1}</span>${l2 ? `<br><span style="opacity: 0.65; font-size: 14.5px; font-weight: 500;">${l2}</span>` : ''}`;
        }
    }

    async executeLrclibSearch(query) {
        const resultsEl = document.getElementById('lrclibSearchResults');
        if (!resultsEl) return;

        resultsEl.style.display = 'block';
        resultsEl.innerHTML = '<div style="text-align: center; padding: 12px; color: var(--text-muted); font-size: 13px;"><div class="pulse-loader" style="margin-bottom:6px;"></div>Searching https://lrclib.net/...</div>';

        try {
            const lang = encodeURIComponent(this.currentTrack?.language || '');
            const res = await fetch(`${window.API_PREFIX || ""}/api/lyrics/search?q=${encodeURIComponent(query)}&language=${lang}`);
            const data = await res.json();
            const list = data.results || [];

            if (list.length === 0) {
                resultsEl.innerHTML = '<div style="text-align: center; padding: 12px; color: var(--text-muted); font-size: 13px;">No matching lyrics found on LRCLIB. Try another search term.</div>';
                return;
            }

            let html = '';
            list.forEach((item, idx) => {
                const syncedBadge = item.hasSynced
                    ? '<span class="lrclib-tag synced">⏱️ Synced LRC</span>'
                    : '<span class="lrclib-tag plain">📄 Plain Text</span>';

                const isDub = item.scriptLabel && item.scriptLabel.startsWith('⚠️');
                const scriptBadge = `<span class="lrclib-tag ${isDub ? 'dub-warn' : 'script-tag'}">${item.scriptLabel || 'Text'}</span>`;

                html += `
                    <div class="lrclib-item" data-lrclib-idx="${idx}">
                        <div style="flex: 1; min-width: 0; padding-right: 12px;">
                            <div style="font-weight: 600; font-size: 13px; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                ${item.trackName}
                            </div>
                            <div style="font-size: 12px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                ${item.artistName} ${item.albumName ? '• ' + item.albumName : ''}
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            ${scriptBadge}
                            ${syncedBadge}
                            <button class="btn-chip primary apply-lrclib-btn" data-lrclib-idx="${idx}" style="font-size: 11px; padding: 4px 10px;">Apply</button>
                        </div>
                    </div>
                `;
            });

            resultsEl.innerHTML = html;

            // Bind Apply buttons
            resultsEl.querySelectorAll('.apply-lrclib-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = parseInt(btn.getAttribute('data-lrclib-idx'), 10);
                    const chosen = list[idx];
                    if (!chosen) return;

                    this.applyLrclibLyrics(chosen);
                });
            });
        } catch (e) {
            resultsEl.innerHTML = '<div style="text-align: center; padding: 12px; color: #ef4444; font-size: 13px;">Error contacting LRCLIB service. Please retry.</div>';
        }
    }

    applyLrclibLyrics(item) {
        if (item.syncedLyrics) {
            this.currentLyrics = this.parseLRC(item.syncedLyrics);
            this.plainLyrics = item.plainLyrics || "";
        } else {
            this.currentLyrics = [];
            this.plainLyrics = item.plainLyrics || "";
        }

        if (this.currentTrack) {
            try {
                localStorage.setItem(`lyrics_cache_${this.currentTrack.id}`, JSON.stringify({
                    syncedLyrics: item.syncedLyrics || "",
                    plainLyrics: item.plainLyrics || "",
                    hasDual: false
                }));
            } catch(e) {}
        }

        const toggleWrap = document.getElementById('lyricsScriptToggleWrap');
        if (toggleWrap) toggleWrap.style.display = 'none';

        const searchSection = document.getElementById('lrclibSearchSection');
        if (searchSection) searchSection.style.display = 'none';

        this.render();
        if (window.showToast) {
            window.showToast(`✨ Applied lyrics: ${item.scriptLabel || 'LRCLIB'}`, '🎤');
        }
    }

    updateTime(currentTime) {
        if (!this.currentLyrics || this.currentLyrics.length === 0) return;

        let activeIdx = -1;
        for (let i = 0; i < this.currentLyrics.length; i++) {
            if (currentTime >= this.currentLyrics[i].time) {
                activeIdx = i;
            } else {
                break;
            }
        }

        if (activeIdx !== this.activeLineIndex) {
            this.activeLineIndex = activeIdx;
            this.updateActiveLineDOM();
        }
    }

    renderLoading() {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="lyrics-placeholder">
                <div class="pulse-loader"></div>
                <p>Matching synchronized lyrics and song language...</p>
            </div>
        `;
    }

    renderError(msg) {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="lyrics-placeholder" style="text-align: center; padding: 30px 20px;">
                <div style="font-size: 32px; margin-bottom: 8px;">🎤</div>
                <p class="text-zinc-400" style="margin-bottom: 14px;">${msg}</p>
                <button class="btn-chip primary" id="triggerLrclibEmptyBtn" style="padding: 8px 16px; font-size: 13px;">
                    🌐 Search https://lrclib.net/ for Lyrics
                </button>
            </div>
        `;
        const btn = document.getElementById('triggerLrclibEmptyBtn');
        btn?.addEventListener('click', () => {
            const searchSection = document.getElementById('lrclibSearchSection');
            const searchInput = document.getElementById('lrclibSearchInput');
            if (searchSection) searchSection.style.display = 'block';
            if (searchInput && this.currentTrack) {
                searchInput.value = `${this.currentTrack.title} ${this.currentTrack.artist || ''}`.trim();
                searchInput.focus();
                this.executeLrclibSearch(searchInput.value);
            }
        });
    }

    render() {
        if (!this.container) return;

        if (this.currentLyrics.length > 0) {
            let html = '<div class="synced-lyrics-list">';
            this.currentLyrics.forEach((item, index) => {
                html += `
                    <div class="lyric-line" data-index="${index}" data-time="${item.time}">
                        <span class="lyric-text">${item.text}</span>
                    </div>
                `;
            });
            html += '</div>';
            this.container.innerHTML = html;

            // Click-to-seek jump handlers
            const lines = this.container.querySelectorAll('.lyric-line');
            lines.forEach(el => {
                el.addEventListener('click', () => {
                    const time = parseFloat(el.getAttribute('data-time'));
                    if (window.AudioPlayer) {
                        window.AudioPlayer.seek(time);
                    }
                });
            });
        } else if (this.plainLyrics) {
            this.container.innerHTML = `
                <div class="plain-lyrics-view">
                    <pre>${this.plainLyrics}</pre>
                </div>
            `;
        } else {
            this.renderError("No lyrics found for this song.");
        }
    }

    updateActiveLineDOM() {
        if (this.container) {
            const lines = this.container.querySelectorAll('.lyric-line');
            lines.forEach((el, idx) => {
                if (idx === this.activeLineIndex) {
                    el.classList.add('active');
                    if (this.isAutoScrollEnabled) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                } else {
                    el.classList.remove('active');
                }
            });
        }

        // Live update Spotify-grade Lyrics Preview card in Right Side Panel (Screenshot 3)
        const sideSnippet = document.getElementById('sideLyricsSnippet');
        if (sideSnippet && this.currentLyrics && this.currentLyrics.length > 0) {
            const idx = this.activeLineIndex >= 0 ? this.activeLineIndex : 0;
            const currentLine = this.currentLyrics[idx];
            const nextLine = this.currentLyrics[idx + 1];
            if (currentLine) {
                sideSnippet.innerHTML = `<span style="color: #fff; font-weight: 800;">${currentLine.text}</span>${nextLine ? `<br><span style="opacity: 0.65; font-size: 14.5px; font-weight: 500;">${nextLine.text}</span>` : ''}`;
            }
        }
    }
}

window.Lyrics = new LyricsManager();
