/**
 * Omonk Lossless - Spotify-Parity Desktop Miniplayer Engine (v8.5.8)
 * 
 * Features:
 * 1. Floating Draggable In-Page Spotify Miniplayer (Universal across all browsers)
 * 2. Native OS Always-On-Top Window via Chrome Document Picture-in-Picture API
 * 3. 3 Interactive View Modes:
 *    - Album Artwork Mode (Screenshot 1 parity: Large cover, hover controls, metadata, like button)
 *    - Real-Time Synced Karaoke Lyrics Mode
 *    - Compact Pill Bar Mode (~90px slim floating controller)
 * 4. Bi-directional live sync with AudioPlayer (scrubbing, volume, shuffle, repeat, track changes)
 */

(function(global) {
  'use strict';

  function formatTime(sec) {
    if (!sec || isNaN(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function query(scope, id) {
    if (!scope) return null;
    if (typeof scope.getElementById === 'function') return scope.getElementById(id);
    if (typeof scope.querySelector === 'function') return scope.querySelector('#' + id);
    return (typeof document !== 'undefined') ? document.getElementById(id) : null;
  }

  function getRoot(scope) {
    if (!scope) return null;
    if (scope.body) return scope.body;
    return scope;
  }

  function resolveCurrentTrack(explicitTrack) {
    if (explicitTrack && explicitTrack.title) return explicitTrack;
    if (typeof AudioPlayer !== 'undefined' && typeof AudioPlayer.getCurrentTrack === 'function') {
      const cur = AudioPlayer.getCurrentTrack();
      if (cur && cur.title) return cur;
    }
    // Fallback from DOM elements currently visible in player bar
    const domTitle = document.getElementById('playerTitle')?.textContent?.trim();
    const domArtist = document.getElementById('playerArtist')?.textContent?.trim();
    const domArt = document.getElementById('playerArt')?.src;
    const domBadge = document.getElementById('playerQualityBadge')?.textContent?.trim();

    return {
      id: (explicitTrack && explicitTrack.id) || 'current',
      title: (domTitle && domTitle !== 'Ready to Play') ? domTitle : 'Lossless Hi-Fi',
      artist: (domArtist && domArtist !== 'Select a track to stream in lossless') ? domArtist : 'Omonk Studio',
      artwork: domArt || 'icon-512.png',
      quality: domBadge || 'FLAC • 320kbps'
    };
  }

  const Miniplayer = {
    isOpen: false,
    pipWindow: null,
    floatingEl: null,
    viewMode: 'art', // 'art' | 'lyrics' | 'compact'
    buttonEl: null,
    lastTrack: null,
    isPlaying: false,
    currentTime: 0,
    totalDuration: 0,

    _toggleLock: false,

    init() {
      this.buttonEl = document.getElementById('openMiniplayerBtn');

      // Global click delegation ensures clicking button, SVG icon, or path triggers cleanly without duplicates
      document.addEventListener('click', (e) => {
        const btn = e.target.closest('#openMiniplayerBtn, #sidePanelMiniplayerBtn');
        if (btn) {
          e.preventDefault();
          e.stopPropagation();
          this.toggle();
        }
      });

      // Keyboard shortcut: Shift + M or Alt + M to toggle miniplayer
      window.addEventListener('keydown', (e) => {
        if ((e.altKey || e.shiftKey) && (e.key === 'M' || e.key === 'm')) {
          e.preventDefault();
          this.toggle();
        }
      });

      // Sync with global player events if AudioPlayer exists
      window.addEventListener('player:trackchange', (e) => this.onTrackChange(e.detail));
      window.addEventListener('player:playstate', (e) => this.onPlayStateChange(e.detail));
      window.addEventListener('player:timeupdate', (e) => this.onTimeUpdate(e.detail?.current || 0, e.detail?.total || 0));
    },

    isDocumentPiPSupported() {
      return typeof window !== 'undefined' && 'documentPictureInPicture' in window && typeof window.documentPictureInPicture.requestWindow === 'function';
    },

    toggle() {
      if (this._toggleLock) return;
      this._toggleLock = true;
      setTimeout(() => { this._toggleLock = false; }, 350);

      if (this.isOpen) {
        this.close();
      } else {
        this.open();
      }
    },

    async open() {
      this.lastTrack = resolveCurrentTrack(this.lastTrack);
      this.isPlaying = (typeof AudioPlayer !== 'undefined' && AudioPlayer.audio) 
        ? !AudioPlayer.audio.paused 
        : false;

      // 1. Primary: Native OS Always-On-Top Floating Desktop Window (Spotify Desktop Parity)
      if (this.isDocumentPiPSupported()) {
        try {
          const width = 340;
          const height = (this.viewMode === 'compact') ? 130 : (this.viewMode === 'lyrics' ? 460 : 420);

          const pip = await window.documentPictureInPicture.requestWindow({
            width,
            height
          });

          if (pip) {
            this.pipWindow = pip;
            this.isOpen = true;
            this.buttonEl?.classList.add('active');

            this.setupPipWindow(pip);

            pip.addEventListener('pagehide', () => {
              this.isOpen = false;
              this.pipWindow = null;
              this.buttonEl?.classList.remove('active');
            });

            if (typeof showToast === 'function') {
              showToast('Desktop Miniplayer opened', '🔲');
            }
            return;
          }
        } catch (err) {
          console.warn('[Miniplayer] Document Picture-in-Picture failed, falling back to in-page widget:', err);
        }
      }

      // 2. Browser Fallback: In-Page Floating Widget
      this.openInPageFallback();
      if (typeof showToast === 'function') {
        showToast('Floating Miniplayer active', '🔲');
      }
    },

    close() {
      if (this.pipWindow) {
        try {
          this.pipWindow.close();
        } catch (e) {}
        this.pipWindow = null;
      }
      if (this.floatingEl) {
        if (typeof this.floatingEl.remove === 'function') {
          this.floatingEl.remove();
        } else if (this.floatingEl.parentNode) {
          this.floatingEl.parentNode.removeChild(this.floatingEl);
        }
        this.floatingEl = null;
      }
      this.isOpen = false;
      this.buttonEl?.classList.remove('active');
    },

    async requestDesktopPopOut() {
      if (!this.isDocumentPiPSupported()) {
        if (typeof showToast === 'function') {
          showToast('OS-level Pop-Out requires Chrome 116+', 'ℹ️');
        }
        return;
      }

      try {
        const width = 340;
        const height = (this.viewMode === 'compact') ? 130 : (this.viewMode === 'lyrics' ? 460 : 420);
        const pip = await window.documentPictureInPicture.requestWindow({ width, height });
        if (pip) {
          // Close in-page overlay when native OS window pops out
          if (this.floatingEl) {
            this.floatingEl.remove();
            this.floatingEl = null;
          }
          this.pipWindow = pip;
          this.isOpen = true;
          this.buttonEl?.classList.add('active');

          this.setupPipWindow(pip);

          pip.addEventListener('pagehide', () => {
            this.isOpen = false;
            this.pipWindow = null;
            this.buttonEl?.classList.remove('active');
          });

          if (typeof showToast === 'function') {
            showToast('OS Floating Window active', '🔲');
          }
        }
      } catch (err) {
        console.warn('[Miniplayer] requestDesktopPopOut failed:', err);
        if (typeof showToast === 'function') {
          showToast('Pop-Out failed, using Floating Miniplayer', '🔲');
        }
        this.openInPageFallback();
      }
    },

    getMiniplayerCss() {
      return `
        .miniplayer-root * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          user-select: none;
          -webkit-user-select: none;
        }
        .miniplayer-root {
          background: #121212 !important;
          color: #ffffff !important;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
          overflow: hidden !important;
          width: 100% !important;
          height: 100% !important;
          display: flex !important;
          flex-direction: column !important;
          position: relative !important;
        }
        .mini-bg-blur {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          filter: blur(40px) brightness(0.25);
          opacity: 0.85;
          z-index: 0;
          transform: scale(1.2);
          transition: background-image 0.5s ease;
        }
        .mini-container {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          width: 100%;
          height: 100%;
          padding: 12px;
          justify-content: space-between;
        }

        /* Top Bar */
        .mini-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 8px;
          cursor: grab;
        }
        .mini-top-bar:active {
          cursor: grabbing;
        }
        .mini-brand {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.5px;
          color: rgba(255, 255, 255, 0.7);
          text-transform: uppercase;
        }
        .mini-brand-badge {
          background: rgba(0, 210, 255, 0.15);
          color: #00d2ff;
          border: 1px solid rgba(0, 210, 255, 0.3);
          border-radius: 4px;
          font-size: 9px;
          padding: 1px 4px;
          font-weight: 800;
        }
        .mini-actions {
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .mini-action-btn {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 6px;
          color: #fff;
          font-size: 11.5px;
          padding: 3px 6px;
          cursor: pointer;
          transition: all 0.15s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
        }
        .mini-action-btn:hover {
          background: rgba(255, 255, 255, 0.22);
          transform: scale(1.05);
        }
        .mini-action-btn.active {
          background: #1db954;
          color: #000;
          border-color: #1db954;
          font-weight: 700;
        }
        .mini-close-btn {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 50%;
          color: #fff;
          width: 22px;
          height: 22px;
          font-size: 11px;
          font-weight: bold;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }
        .mini-close-btn:hover {
          background: #ff3b30;
          border-color: #ff3b30;
        }

        /* Main Artwork Area with Hover Controls (Screenshot 1) */
        .mini-art-wrap {
          position: relative;
          width: 100%;
          flex: 1;
          min-height: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 10px;
        }
        .mini-art-img {
          width: 100%;
          height: 100%;
          max-height: 240px;
          object-fit: cover;
          border-radius: 8px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        /* Hover Overlay Controls on Artwork */
        .mini-art-overlay {
          position: absolute;
          inset: 0;
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        .mini-art-wrap:hover .mini-art-overlay {
          opacity: 1;
        }
        .mini-overlay-btn {
          background: rgba(0, 0, 0, 0.75);
          border: 1px solid rgba(255, 255, 255, 0.25);
          border-radius: 50%;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .mini-overlay-btn:hover {
          transform: scale(1.1);
          background: #fff;
          color: #000;
        }
        .mini-overlay-btn.main-play {
          width: 48px;
          height: 48px;
          background: #1db954;
          color: #000;
          border: none;
        }
        .mini-overlay-btn.main-play:hover {
          transform: scale(1.1);
          background: #1ed760;
        }

        /* Synced Lyrics Mode */
        .mini-lyrics-container {
          width: 100%;
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          scrollbar-width: none;
          padding: 8px 4px;
          display: none;
          flex-direction: column;
          gap: 12px;
          text-align: center;
        }
        .mini-lyrics-container::-webkit-scrollbar { display: none; }
        .mini-lyric-line {
          font-size: 13.5px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.35);
          transition: all 0.25s ease;
          line-height: 1.4;
          cursor: pointer;
        }
        .mini-lyric-line.active {
          color: #ffffff;
          font-size: 16px;
          transform: scale(1.05);
          text-shadow: 0 0 12px rgba(29, 185, 84, 0.6);
        }

        /* Track Info & Like Button (Screenshot 1) */
        .mini-info-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 6px;
        }
        .mini-meta {
          flex: 1;
          min-width: 0;
        }
        .mini-title {
          font-size: 15px;
          font-weight: 800;
          color: #fff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .mini-artist {
          font-size: 12px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.6);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-top: 2px;
        }
        .mini-like-btn {
          background: transparent;
          border: none;
          font-size: 18px;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          transition: transform 0.15s ease, color 0.15s ease;
          padding: 4px;
          border-radius: 50%;
        }
        .mini-like-btn:hover {
          transform: scale(1.2);
          color: #fff;
        }
        .mini-like-btn.liked {
          color: #ff3b30;
        }

        /* Interactive Scrubber */
        .mini-scrub-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }
        .mini-time {
          font-size: 10.5px;
          color: rgba(255, 255, 255, 0.5);
          font-variant-numeric: tabular-nums;
          min-width: 28px;
        }
        .mini-progress-bar {
          flex: 1;
          height: 4px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 2px;
          position: relative;
          cursor: pointer;
        }
        .mini-progress-bar:hover {
          height: 6px;
        }
        .mini-progress-fill {
          height: 100%;
          width: 0%;
          background: #1db954;
          border-radius: 2px;
          position: relative;
          transition: width 0.1s linear;
        }
        .mini-progress-thumb {
          position: absolute;
          right: -4px;
          top: 50%;
          transform: translateY(-50%);
          width: 10px;
          height: 10px;
          background: #fff;
          border-radius: 50%;
          display: none;
          box-shadow: 0 0 4px rgba(0,0,0,0.5);
        }
        .mini-progress-bar:hover .mini-progress-thumb {
          display: block;
        }

        /* Bottom Controls Row */
        .mini-ctrl-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 2px;
        }
        .mini-ctrl-btn {
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.75);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
          border-radius: 50%;
          transition: all 0.15s ease;
        }
        .mini-ctrl-btn:hover {
          color: #fff;
          transform: scale(1.15);
        }
        .mini-ctrl-btn.active {
          color: #1db954;
        }
        .mini-ctrl-btn.play-circle {
          background: #ffffff;
          color: #000000;
          width: 34px;
          height: 34px;
        }
        .mini-ctrl-btn.play-circle:hover {
          background: #1db954;
          transform: scale(1.12);
        }

        /* Compact & Minimized Mode Layouts */
        .mini-compact-thumb {
          display: none;
        }
        .mini-compact-controls {
          display: none;
        }

        .miniplayer-root.mode-compact .mini-art-wrap {
          display: none !important;
        }
        .miniplayer-root.mode-compact .mini-lyrics-container {
          display: none !important;
        }
        .miniplayer-root.mode-compact .mini-compact-thumb {
          display: block !important;
          width: 44px !important;
          height: 44px !important;
          border-radius: 6px !important;
          object-fit: cover !important;
          flex-shrink: 0 !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5) !important;
        }
        .miniplayer-root.mode-compact .mini-compact-controls {
          display: flex !important;
          align-items: center !important;
          gap: 4px !important;
          flex-shrink: 0 !important;
        }
        .miniplayer-root.mode-compact #miniFullCtrlRow {
          display: none !important;
        }
        .miniplayer-root.mode-compact .mini-top-bar {
          padding-bottom: 2px !important;
        }
        .miniplayer-root.mode-compact .mini-container {
          padding: 6px 12px 8px !important;
          justify-content: space-between !important;
        }
        .miniplayer-root.mode-compact .mini-info-row {
          padding: 2px 0 !important;
          gap: 10px !important;
        }
        .miniplayer-root.mode-compact .mini-meta {
          flex: 1 1 auto !important;
          min-width: 0 !important;
          overflow: hidden !important;
        }
        .miniplayer-root.mode-compact .mini-title {
          font-size: 13px !important;
          line-height: 1.2 !important;
        }
        .miniplayer-root.mode-compact .mini-artist {
          font-size: 11px !important;
          line-height: 1.2 !important;
        }
        .miniplayer-root.mode-compact .mini-scrub-row {
          margin-top: 2px !important;
          padding: 0 !important;
        }

        /* Lyrics Mode Layout */
        .miniplayer-root.mode-lyrics .mini-art-wrap {
          display: none !important;
        }
        .miniplayer-root.mode-lyrics .mini-lyrics-container {
          display: flex !important;
        }

        /* Responsive adaptation if user shrinks / minimizes window height */
        @media (max-height: 270px) {
          .mini-art-wrap {
            display: none !important;
          }
          .mini-lyrics-container {
            display: none !important;
          }
          .mini-compact-thumb {
            display: block !important;
            width: 44px !important;
            height: 44px !important;
            border-radius: 6px !important;
            object-fit: cover !important;
            flex-shrink: 0 !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5) !important;
          }
          .mini-compact-controls {
            display: flex !important;
            align-items: center !important;
            gap: 4px !important;
            flex-shrink: 0 !important;
          }
          #miniFullCtrlRow {
            display: none !important;
          }
          .mini-top-bar {
            padding-bottom: 2px !important;
          }
          .mini-container {
            padding: 6px 10px 8px !important;
            justify-content: space-between !important;
          }
          .mini-info-row {
            padding: 2px 0 !important;
            gap: 8px !important;
          }
          .mini-meta {
            flex: 1 1 auto !important;
            min-width: 0 !important;
            overflow: hidden !important;
          }
        }
      `;
    },

    renderMiniplayerHtml(track, isPlaying) {
      const safeTrack = resolveCurrentTrack(track);
      const art = safeTrack.artwork || 'icon-512.png';
      const title = safeTrack.title || 'Lossless Hi-Fi';
      const artist = safeTrack.artist || 'Omonk Studio';
      const isLiked = typeof window !== 'undefined' && window.likedTrackIds && safeTrack.id && window.likedTrackIds.has(safeTrack.id);

      return `
        <div class="mini-bg-blur" id="miniBgBlur" style="background-image: url('${art}');"></div>
        <div class="mini-container">
          <!-- Top Bar -->
          <div class="mini-top-bar">
            <div class="mini-brand">
              <span>Omonk</span>
              <span class="mini-brand-badge">${safeTrack.quality ? 'FLAC' : 'Hi-Fi'}</span>
            </div>
            <div class="mini-actions">
              <button class="mini-action-btn" id="miniModeArtBtn" title="Album Artwork">🖼️</button>
              <button class="mini-action-btn" id="miniModeLyricsBtn" title="Synced Lyrics">🎤</button>
              <button class="mini-action-btn" id="miniModeCompactBtn" title="Compact Bar">📏</button>
              <button class="mini-action-btn" id="miniPopOutBtn" title="Pop-Out to Native Desktop Window">↗️</button>
              <button class="mini-close-btn" id="miniCloseBtn" title="Close Miniplayer">✕</button>
            </div>
          </div>

          <!-- Main Artwork Area with Hover Controls (Screenshot 1) -->
          <div class="mini-art-wrap" id="miniArtWrap">
            <img class="mini-art-img" id="miniArtImg" src="${art}" alt="${title}">
            <div class="mini-art-overlay">
              <button class="mini-overlay-btn" id="miniArtPrevBtn" title="Previous Track">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M6 5a1 1 0 0 1 1 1v12a1 1 0 1 1-2 0V6a1 1 0 0 1 1-1zm12.35 1.15a1 1 0 0 0-1.05.09L9 11.45a1 1 0 0 0 0 1.62l8.3 5.21A1 1 0 0 0 19 17.44V6.56a1 1 0 0 0-.65-.41z"/></svg>
              </button>
              <button class="mini-overlay-btn main-play" id="miniArtPlayBtn" title="Play/Pause">
                ${isPlaying ? `
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1.5"/><rect x="14" y="4" width="4" height="16" rx="1.5"/></svg>
                ` : `
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l11.08-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14z"/></svg>
                `}
              </button>
              <button class="mini-overlay-btn" id="miniArtNextBtn" title="Next Track">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M18 5a1 1 0 0 1 1 1v12a1 1 0 1 1-2 0V6a1 1 0 0 1 1-1zM5.65 6.15A1 1 0 0 1 7 6.56v10.88a1 1 0 0 1-1.65.74L15 12.97a1 1 0 0 0 0-1.62L5.35 6.14a1 1 0 0 1-.7-.99z"/></svg>
              </button>
            </div>
          </div>

          <!-- Synced Lyrics View Container -->
          <div class="mini-lyrics-container" id="miniLyricsContainer">
            <div style="color: rgba(255,255,255,0.4); font-size: 13px; margin: auto;">Loading synced lyrics...</div>
          </div>

          <!-- Track Info Row with Compact Artwork and Compact Player Controls -->
          <div class="mini-info-row">
            <img class="mini-compact-thumb" id="miniCompactThumb" src="${art}" alt="${title}">
            <div class="mini-meta">
              <div class="mini-title" id="miniTitle">${title}</div>
              <div class="mini-artist" id="miniArtist">${artist}</div>
            </div>
            <div class="mini-compact-controls">
              <button class="mini-ctrl-btn" id="miniCompactPrevBtn" title="Previous Track">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 5a1 1 0 0 1 1 1v12a1 1 0 1 1-2 0V6a1 1 0 0 1 1-1zm12.35 1.15a1 1 0 0 0-1.05.09L9 11.45a1 1 0 0 0 0 1.62l8.3 5.21A1 1 0 0 0 19 17.44V6.56a1 1 0 0 0-.65-.41z"/></svg>
              </button>
              <button class="mini-ctrl-btn play-circle" id="miniCompactPlayBtn" title="Play/Pause">
                ${isPlaying ? `
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1.5"/><rect x="14" y="4" width="4" height="16" rx="1.5"/></svg>
                ` : `
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l11.08-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14z"/></svg>
                `}
              </button>
              <button class="mini-ctrl-btn" id="miniCompactNextBtn" title="Next Track">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M18 5a1 1 0 0 1 1 1v12a1 1 0 1 1-2 0V6a1 1 0 0 1 1-1zM5.65 6.15A1 1 0 0 1 7 6.56v10.88a1 1 0 0 1-1.65.74L15 12.97a1 1 0 0 0 0-1.62L5.35 6.14a1 1 0 0 1-.7-.99z"/></svg>
              </button>
            </div>
            <button class="mini-like-btn ${isLiked ? 'liked' : ''}" id="miniLikeBtn" title="Save to Liked Songs">
              ${isLiked ? '❤️' : '🤍'}
            </button>
          </div>

          <!-- Progress Scrubber -->
          <div class="mini-scrub-row">
            <span class="mini-time" id="miniCurrentTime">0:00</span>
            <div class="mini-progress-bar" id="miniProgressBar">
              <div class="mini-progress-fill" id="miniProgressFill">
                <div class="mini-progress-thumb"></div>
              </div>
            </div>
            <span class="mini-time" id="miniTotalTime">0:00</span>
          </div>

          <!-- Bottom Control Bar (Shown in Full Art & Lyrics modes) -->
          <div class="mini-ctrl-row" id="miniFullCtrlRow">
            <button class="mini-ctrl-btn" id="miniShuffleBtn" title="Shuffle Mode">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>
            </button>
            <button class="mini-ctrl-btn" id="miniPrevBtn" title="Previous">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 5a1 1 0 0 1 1 1v12a1 1 0 1 1-2 0V6a1 1 0 0 1 1-1zm12.35 1.15a1 1 0 0 0-1.05.09L9 11.45a1 1 0 0 0 0 1.62l8.3 5.21A1 1 0 0 0 19 17.44V6.56a1 1 0 0 0-.65-.41z"/></svg>
            </button>
            <button class="mini-ctrl-btn play-circle" id="miniPlayBtn" title="Play/Pause">
              ${isPlaying ? `
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1.5"/><rect x="14" y="4" width="4" height="16" rx="1.5"/></svg>
              ` : `
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l11.08-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14z"/></svg>
              `}
            </button>
            <button class="mini-ctrl-btn" id="miniNextBtn" title="Next">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M18 5a1 1 0 0 1 1 1v12a1 1 0 1 1-2 0V6a1 1 0 0 1 1-1zM5.65 6.15A1 1 0 0 1 7 6.56v10.88a1 1 0 0 1-1.65.74L15 12.97a1 1 0 0 0 0-1.62L5.35 6.14a1 1 0 0 1-.7-.99z"/></svg>
            </button>
            <button class="mini-ctrl-btn" id="miniRepeatBtn" title="Repeat Mode">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
            </button>
          </div>
        </div>
      `;
    },

    setupPipWindow(pip) {
      try {
        const doc = pip.document;
        doc.title = (this.lastTrack?.title ? this.lastTrack.title + ' • ' : '') + 'Lossless Miniplayer';

        const style = doc.createElement('style');
        style.textContent = this.getMiniplayerCss();
        doc.head.appendChild(style);

        doc.body.className = 'miniplayer-root';
        doc.body.innerHTML = this.renderMiniplayerHtml(this.lastTrack, this.isPlaying);
        
        const popBtn = query(doc, 'miniPopOutBtn');
        if (popBtn) popBtn.style.display = 'none';

        const closeBtn = query(doc, 'miniCloseBtn');
        if (closeBtn) closeBtn.onclick = () => pip.close();

        pip.addEventListener('keydown', (e) => {
          if (e.code === 'Space') {
            e.preventDefault();
            if (typeof AudioPlayer !== 'undefined') AudioPlayer.togglePlay();
          } else if (e.code === 'ArrowRight') {
            e.preventDefault();
            if (typeof AudioPlayer !== 'undefined' && AudioPlayer.audio) {
              AudioPlayer.seek(AudioPlayer.audio.currentTime + 5);
            }
          } else if (e.code === 'ArrowLeft') {
            e.preventDefault();
            if (typeof AudioPlayer !== 'undefined' && AudioPlayer.audio) {
              AudioPlayer.seek(Math.max(0, AudioPlayer.audio.currentTime - 5));
            }
          }
        });

        this.bindEvents(doc);
        this.updateViewMode(this.viewMode, doc);

        this.refreshLyrics(doc);
      } catch (e) {
        console.error('[Miniplayer] setupPipWindow error:', e);
      }
    },

    bindEvents(scope) {
      const root = getRoot(scope);
      if (!root) return;

      const playHandler = (e) => {
        e?.stopPropagation();
        if (typeof AudioPlayer !== 'undefined') AudioPlayer.togglePlay();
      };
      const nextHandler = (e) => {
        e?.stopPropagation();
        if (typeof AudioPlayer !== 'undefined') AudioPlayer.next(true);
      };
      const prevHandler = (e) => {
        e?.stopPropagation();
        if (typeof AudioPlayer !== 'undefined') AudioPlayer.prev();
      };

      query(scope, 'miniPlayBtn')?.addEventListener('click', playHandler);
      query(scope, 'miniArtPlayBtn')?.addEventListener('click', playHandler);
      query(scope, 'miniCompactPlayBtn')?.addEventListener('click', playHandler);
      query(scope, 'miniNextBtn')?.addEventListener('click', nextHandler);
      query(scope, 'miniArtNextBtn')?.addEventListener('click', nextHandler);
      query(scope, 'miniCompactNextBtn')?.addEventListener('click', nextHandler);
      query(scope, 'miniPrevBtn')?.addEventListener('click', prevHandler);
      query(scope, 'miniArtPrevBtn')?.addEventListener('click', prevHandler);
      query(scope, 'miniCompactPrevBtn')?.addEventListener('click', prevHandler);

      query(scope, 'miniShuffleBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof AudioPlayer !== 'undefined') {
          const s = AudioPlayer.toggleShuffle();
          query(scope, 'miniShuffleBtn')?.classList.toggle('active', s);
        }
      });

      query(scope, 'miniRepeatBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof AudioPlayer !== 'undefined') {
          const r = AudioPlayer.toggleRepeat();
          query(scope, 'miniRepeatBtn')?.classList.toggle('active', r !== 'none');
        }
      });

      query(scope, 'miniLikeBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const pBtn = document.getElementById('playerLikeBtn');
        if (pBtn) pBtn.click();
        const liked = typeof window !== 'undefined' && window.likedTrackIds && this.lastTrack?.id && window.likedTrackIds.has(this.lastTrack.id);
        const b = query(scope, 'miniLikeBtn');
        if (b) {
          b.classList.toggle('liked', liked);
          b.textContent = liked ? '❤️' : '🤍';
        }
      });

      // Interactive Scrubber Bar
      const scrubBar = query(scope, 'miniProgressBar');
      if (scrubBar) {
        scrubBar.addEventListener('click', (e) => {
          e.stopPropagation();
          const rect = scrubBar.getBoundingClientRect();
          const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          if (typeof AudioPlayer !== 'undefined' && AudioPlayer.audio && AudioPlayer.audio.duration) {
            AudioPlayer.seek(pct * AudioPlayer.audio.duration);
          }
        });
      }

      // View Mode Buttons
      query(scope, 'miniModeArtBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setViewMode('art', scope);
      });
      query(scope, 'miniModeLyricsBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setViewMode('lyrics', scope);
      });
      query(scope, 'miniModeCompactBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setViewMode('compact', scope);
      });

      // Pop-Out & Close Buttons
      query(scope, 'miniPopOutBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.requestDesktopPopOut();
      });
      query(scope, 'miniCloseBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
    },

    setViewMode(mode, targetScope) {
      this.viewMode = mode;
      const scope = targetScope || this.getActiveScope();
      if (!scope) return;

      this.updateViewMode(mode, scope);

      if (this.pipWindow) {
        try {
          if (mode === 'compact') {
            this.pipWindow.resizeTo(360, 130);
          } else if (mode === 'lyrics') {
            this.pipWindow.resizeTo(340, 460);
          } else {
            this.pipWindow.resizeTo(340, 420);
          }
        } catch (e) {}
      } else if (this.floatingEl) {
        if (mode === 'compact') {
          this.floatingEl.style.height = '130px'; this.floatingEl.style.width = '360px';
        } else if (mode === 'lyrics') {
          this.floatingEl.style.height = '460px';
        } else {
          this.floatingEl.style.height = '420px';
        }
      }
    },

    updateViewMode(mode, scope) {
      const root = getRoot(scope);
      if (!root) return;

      root.classList.remove('mode-art', 'mode-lyrics', 'mode-compact');
      root.classList.add('mode-' + mode);

      query(scope, 'miniModeArtBtn')?.classList.toggle('active', mode === 'art');
      query(scope, 'miniModeLyricsBtn')?.classList.toggle('active', mode === 'lyrics');
      query(scope, 'miniModeCompactBtn')?.classList.toggle('active', mode === 'compact');

      if (mode === 'lyrics') {
        this.refreshLyrics(scope);
      }
    },

    refreshLyrics(scope) {
      const container = query(scope, 'miniLyricsContainer');
      if (!container) return;

      const lyrics = (typeof window !== 'undefined' && window.Lyrics && Array.isArray(window.Lyrics.currentLyrics))
        ? window.Lyrics.currentLyrics
        : [];

      if (lyrics.length === 0) {
        container.innerHTML = '<div style="color: rgba(255,255,255,0.4); font-size: 13px; margin: auto;">No synced lyrics available for this track.</div>';
        return;
      }

      container.innerHTML = lyrics.map((line, idx) => `
        <div class="mini-lyric-line ${idx === window.Lyrics.activeLineIndex ? 'active' : ''}" data-line-idx="${idx}" data-time="${line.time || 0}">
          ${line.text}
        </div>
      `).join('');

      container.querySelectorAll('.mini-lyric-line').forEach(el => {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          const t = parseFloat(el.getAttribute('data-time'));
          if (!isNaN(t) && typeof AudioPlayer !== 'undefined') {
            AudioPlayer.seek(t);
          }
        });
      });
    },

    getActiveScope() {
      if (this.pipWindow && !this.pipWindow.closed) {
        return this.pipWindow.document;
      }
      if (this.floatingEl) {
        return this.floatingEl;
      }
      return null;
    },

    onTrackChange(track) {
      const safeTrack = resolveCurrentTrack(track);
      this.lastTrack = safeTrack;
      const scope = this.getActiveScope();
      if (!scope) return;

      const art = safeTrack.artwork || 'icon-512.png';
      const title = safeTrack.title || 'Lossless Hi-Fi';
      const artist = safeTrack.artist || 'Omonk Studio';
      const isLiked = typeof window !== 'undefined' && window.likedTrackIds && safeTrack.id && window.likedTrackIds.has(safeTrack.id);

      const titleEl = query(scope, 'miniTitle');
      if (titleEl) titleEl.textContent = title;

      const artistEl = query(scope, 'miniArtist');
      if (artistEl) artistEl.textContent = artist;

      const artImg = query(scope, 'miniArtImg');
      if (artImg) artImg.src = art;

      const compactThumb = query(scope, 'miniCompactThumb');
      if (compactThumb) compactThumb.src = art;

      const bgBlur = query(scope, 'miniBgBlur');
      if (bgBlur) bgBlur.style.backgroundImage = 'url(\"' + art + '\")';

      const likeBtn = query(scope, 'miniLikeBtn');
      if (likeBtn) {
        likeBtn.classList.toggle('liked', isLiked);
        likeBtn.textContent = isLiked ? '❤️' : '🤍';
      }

      if (this.viewMode === 'lyrics') {
        this.refreshLyrics(scope);
      }
    },

    onPlayStateChange(isPlaying) {
      this.isPlaying = isPlaying;
      const scope = this.getActiveScope();
      if (!scope) return;

      const playSvg = isPlaying ? `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1.5"/><rect x="14" y="4" width="4" height="16" rx="1.5"/></svg>
      ` : `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l11.08-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14z"/></svg>
      `;

      const artPlaySvg = isPlaying ? `
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1.5"/><rect x="14" y="4" width="4" height="16" rx="1.5"/></svg>
      ` : `
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l11.08-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14z"/></svg>
      `;

      const btn1 = query(scope, 'miniPlayBtn');
      if (btn1) btn1.innerHTML = playSvg;

      const btn2 = query(scope, 'miniArtPlayBtn');
      if (btn2) btn2.innerHTML = artPlaySvg;

      const btn3 = query(scope, 'miniCompactPlayBtn');
      if (btn3) btn3.innerHTML = playSvg;
    },

    onTimeUpdate(current, total) {
      this.currentTime = current;
      this.totalDuration = total;
      const scope = this.getActiveScope();
      if (!scope) return;

      const curEl = query(scope, 'miniCurrentTime');
      if (curEl) curEl.textContent = formatTime(current);

      const totEl = query(scope, 'miniTotalTime');
      if (totEl) totEl.textContent = formatTime(total);

      const fill = query(scope, 'miniProgressFill');
      if (fill && total > 0) {
        fill.style.width = Math.min(100, (current / total) * 100) + '%';
      }

      if (this.viewMode === 'lyrics') {
        const container = query(scope, 'miniLyricsContainer');
        if (container && typeof window !== 'undefined' && window.Lyrics) {
          const lines = container.querySelectorAll('.mini-lyric-line');
          lines.forEach((l, idx) => {
            const isActive = idx === window.Lyrics.activeLineIndex;
            l.classList.toggle('active', isActive);
            if (isActive) {
              l.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          });
        }
      }
    },

    // In-Page Floating Draggable Fallback (Guaranteed to work 100% of the time)
    openInPageFallback() {
      if (this.floatingEl) {
        this.floatingEl.style.display = 'flex';
        this.isOpen = true;
        this.buttonEl?.classList.add('active');
        return;
      }

      const track = resolveCurrentTrack(this.lastTrack);
      this.lastTrack = track;

      const wrapper = document.createElement('div');
      wrapper.id = 'omonkFloatingMiniplayer';
      wrapper.className = 'miniplayer-root omonk-floating-miniplayer';
      wrapper.style.cssText = `
        position: fixed !important;
        bottom: 100px !important;
        right: 390px !important;
        width: 320px !important;
        height: 420px !important;
        background: #121212 !important;
        border-radius: 12px !important;
        border: 1px solid rgba(255,255,255,0.2) !important;
        box-shadow: 0 20px 50px rgba(0,0,0,0.9) !important;
        z-index: 9999999 !important;
        overflow: hidden !important;
        display: flex !important;
        flex-direction: column !important;
        animation: miniplayerPop 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
      `;

      wrapper.innerHTML = `
        <style>
          ${this.getMiniplayerCss()}
          @keyframes miniplayerPop {
            from { transform: scale(0.85) translateY(20px); opacity: 0; }
            to { transform: scale(1) translateY(0); opacity: 1; }
          }
        </style>
        ${this.renderMiniplayerHtml(track, this.isPlaying)}
      `;

      document.body.appendChild(wrapper);
      this.floatingEl = wrapper;
      this.isOpen = true;
      this.buttonEl?.classList.add('active');

      this.bindEvents(wrapper);
      this.updateViewMode(this.viewMode, wrapper);

      // Draggable Header Handle
      let isDragging = false;
      let startX, startY, initLeft, initTop;
      const topBar = wrapper.querySelector('.mini-top-bar');
      if (topBar) {
        topBar.addEventListener('mousedown', (e) => {
          if (e.target.closest('button')) return;
          isDragging = true;
          startX = e.clientX;
          startY = e.clientY;
          const rect = wrapper.getBoundingClientRect();
          initLeft = rect.left;
          initTop = rect.top;
        });
        window.addEventListener('mousemove', (e) => {
          if (!isDragging) return;
          wrapper.style.left = (initLeft + (e.clientX - startX)) + 'px';
          wrapper.style.top = (initTop + (e.clientY - startY)) + 'px';
          wrapper.style.right = 'auto';
          wrapper.style.bottom = 'auto';
        });
        window.addEventListener('mouseup', () => {
          isDragging = false;
        });
      }
    }
  };

  global.Miniplayer = Miniplayer;
  if (typeof window !== 'undefined') {
    window.Miniplayer = Miniplayer;
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => Miniplayer.init());
    } else {
      Miniplayer.init();
    }
  }

})(typeof window !== 'undefined' ? window : this);
