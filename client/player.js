/**
 * Omonk Audio Player Engine - v8.0.0
 * Apple Music Hi-Res Lossless DSP Studio Master Pipeline
 * Single resilient audio element, 10-Band Hardware Equalizer, Dynamics Compressor,
 * Visualizer, and Fail-Safe iOS MediaSession Lockscreen integration.
 */
function isSameSongOrReprise(candTitle, seedTitle) {
    if (!candTitle || !seedTitle) return false;
    const cleanCand = candTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanSeed = seedTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!cleanCand || !cleanSeed) return false;
    if (cleanCand === cleanSeed) return true;
    if (cleanCand.includes(cleanSeed) || cleanSeed.includes(cleanCand)) return true;
    const stripParen = (s) => s.replace(/\s*[\(\[].*?[\)\]]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const sc = stripParen(candTitle);
    const ss = stripParen(seedTitle);
    if (sc && ss && (sc === ss || sc.includes(ss) || ss.includes(sc))) return true;
    return false;
}

class AudioPlayerEngine {
    constructor() {
        // Single robust audio element - eliminates double playback entirely
        this.audio = new Audio();
        this.audio.preload = "auto";
        this.audio.setAttribute('playsinline', 'true');
        this.audio.setAttribute('webkit-playsinline', 'true');

        this.isMobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

        // iOS Safari AudioSession category setup (iOS 15+)
        if ('audioSession' in navigator) {
            try {
                navigator.audioSession.type = 'playback';
            } catch (e) {}
        }

        this._keepAliveCtx = null;
        this._keepAliveNode = null;
        this._keepAliveGain = null;
        this._keepAliveUnlocked = false;

        // Auto-unlock background carrier on very first user gesture anywhere
        const unlockHandler = () => {
            this.initKeepAliveAudio();
        };
        if (typeof document !== 'undefined') {
            document.addEventListener('touchstart', unlockHandler, { once: true, passive: true });
            document.addEventListener('touchend', unlockHandler, { once: true, passive: true });
            document.addEventListener('click', unlockHandler, { once: true, passive: true });
        }

        this.queue = [];
        this.userQueue = [];
        this.isSequentialContext = false;
        this._isSkipping = false;
        this._skipTimeout = null;
        this.history = [];
        this.currentIndex = -1;
        this.isPlaying = false;
        this.isShuffled = false;
        this.repeatMode = 'none'; // 'none' | 'all' | 'one'
        this.volume = 1.0; // 100% full dynamic headroom for Apple Music master quality

        this.audioCtx = null;
        this.sourceNode = null;
        this.filters = [];
        this.compressor = null;
        this.masterGain = null;
        this.analyser = null;
        this.visualizerCanvas = null;
        this.visualizerCtx = null;
        this.visualizerAnimId = null;
        this.currentPreset = 'flat';
        this.alacEngine = window.AppleLosslessEngine || null;
        const savedGain = parseFloat(localStorage.getItem('alac_master_gain_db'));
        this.masterGainDb = !isNaN(savedGain) ? savedGain : 9.5;
        this.vocalClarityEnabled = localStorage.getItem('alac_vocal_clarity') !== 'false';
        this.antiVibrationEnabled = localStorage.getItem('alac_anti_vibration') !== 'false';

        this.eqFrequencies = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

        // Multi-tab / PWA instance coordinator
        this.instanceId = 'omonk_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
        this.setupInstanceCoordination();

        this.setupAudioListeners();
        this.initMediaSession();

        this.onTrackChange = null;
        this.onPlayStateChange = null;
        this.onTimeUpdate = null;
        this.onQueueChange = null;
        this.onStatusMessage = null;

        this.lastSaveTime = 0;
        this.playStartTime = 0;
        this._hasRecordedFeedback30s = false;
    }

    setupInstanceCoordination() {
        if ('BroadcastChannel' in window) {
            try {
                this.instanceChannel = new BroadcastChannel('omonk_playback_coordination');
                this.instanceChannel.onmessage = (e) => {
                    if (e.data && e.data.type === 'PLAYBACK_STARTED' && e.data.instanceId !== this.instanceId) {
                        if (this.isPlaying) {
                            console.log('[Coordination] Another tab/PWA started playback. Pausing this instance.');
                            this.audio.pause();
                            this.isPlaying = false;
                            if (this.onPlayStateChange) this.onPlayStateChange(false);
                            if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
                        }
                    }
                };
            } catch (e) {}
        }

        window.addEventListener('storage', (e) => {
            if (e.key === 'omonk_active_instance_playback') {
                try {
                    const data = JSON.parse(e.newValue);
                    if (data && data.instanceId !== this.instanceId && (Date.now() - data.timestamp < 3000)) {
                        if (this.isPlaying) {
                            console.log('[Storage Event] Active playback transferred to another window. Pausing.');
                            this.audio.pause();
                            this.isPlaying = false;
                            if (this.onPlayStateChange) this.onPlayStateChange(false);
                            if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
                        }
                    }
                } catch (err) {}
            }
        });
    }

    notifyInstancePlaybackStart() {
        try {
            if (this.instanceChannel) {
                this.instanceChannel.postMessage({
                    type: 'PLAYBACK_STARTED',
                    instanceId: this.instanceId,
                    timestamp: Date.now()
                });
            }
            localStorage.setItem('omonk_active_instance_playback', JSON.stringify({
                instanceId: this.instanceId,
                timestamp: Date.now()
            }));
        } catch (e) {}
    }

    /**
     * Audiophile Web Audio DSP Pipeline - Apple Music Hi-Res Lossless Engine
     */
    initWebAudio() {
        const isIOS = typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream);
        const isMobile = typeof navigator !== 'undefined' && (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));

        // Mobile browsers (specifically iOS WebKit and Android background processes) suspend AudioContext
        // whenever the screen locks, completely muting playback and preventing background track transitions.
        // On mobile devices, the <audio> element plays directly to system hardware for reliable lock-screen playback.
        if (isIOS || isMobile) {
            return;
        }

        if (this.audioCtx) {
            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume().catch(() => {});
            }
            return;
        }

        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) return;

            this.audioCtx = new AudioContextClass();
            if ('audioSession' in navigator) {
                try { navigator.audioSession.type = 'playback'; } catch (e) {}
            }

            // iOS Web Audio auto-recovery
            this.audioCtx.onstatechange = () => {
                if (this.audioCtx && this.audioCtx.state === 'suspended' && this.isPlaying) {
                    this.audioCtx.resume().catch(() => {});
                }
            };

            this.sourceNode = this.audioCtx.createMediaElementSource(this.audio);

            // 1. Dual-Stage Subsonic Anti-Vibration Filter (40 Hz 24 dB/octave Linkwitz-Riley Highpass)
            // Completely cuts out sub-audible DC and violent subsonic cone excursion (<40 Hz) that forces earphone/speaker drivers into mechanical over-excursion and vibration rattle
            this.subsonicFilter1 = this.audioCtx.createBiquadFilter();
            this.subsonicFilter1.type = 'highpass';
            this.subsonicFilter1.frequency.setValueAtTime(this.antiVibrationEnabled ? 40 : 10, this.audioCtx.currentTime);
            this.subsonicFilter1.Q.setValueAtTime(0.707, this.audioCtx.currentTime);

            this.subsonicFilter2 = this.audioCtx.createBiquadFilter();
            this.subsonicFilter2.type = 'highpass';
            this.subsonicFilter2.frequency.setValueAtTime(this.antiVibrationEnabled ? 40 : 10, this.audioCtx.currentTime);
            this.subsonicFilter2.Q.setValueAtTime(0.707, this.audioCtx.currentTime);

            // 1.1 Bass Excursion Tamer (Low-shelf 110 Hz)
            // Protects earphone transducers and prevents sub-bass spikes from squashing the vocal headroom
            this.bassTamerFilter = this.audioCtx.createBiquadFilter();
            this.bassTamerFilter.type = 'lowshelf';
            this.bassTamerFilter.frequency.setValueAtTime(110, this.audioCtx.currentTime);
            this.bassTamerFilter.gain.setValueAtTime(this.antiVibrationEnabled ? -1.5 : 0, this.audioCtx.currentTime);

            // 1.2 Anti-Mud De-Boxiness Filter (240 Hz Peaking)
            // Carves out chesty boxiness that psychoacoustically masks the vocal range
            this.deMudFilter = this.audioCtx.createBiquadFilter();
            this.deMudFilter.type = 'peaking';
            this.deMudFilter.frequency.setValueAtTime(240, this.audioCtx.currentTime);
            this.deMudFilter.gain.setValueAtTime(this.vocalClarityEnabled ? -1.8 : 0, this.audioCtx.currentTime);
            this.deMudFilter.Q.setValueAtTime(1.2, this.audioCtx.currentTime);

            // 1.3 Vocal Body & Natural Warmth (1.2 kHz Human Voice Core)
            this.vocalBodyFilter = this.audioCtx.createBiquadFilter();
            this.vocalBodyFilter.type = 'peaking';
            this.vocalBodyFilter.frequency.setValueAtTime(1200, this.audioCtx.currentTime);
            this.vocalBodyFilter.gain.setValueAtTime(this.vocalClarityEnabled ? 1.5 : 0, this.audioCtx.currentTime);
            this.vocalBodyFilter.Q.setValueAtTime(1.0, this.audioCtx.currentTime);

            // 1.4 Studio Vocal Presence & Diction Filter (3.2 kHz Intelligibility Sweet Spot)
            // Lifts vocal articulation, singer lyrics, and speech clarity directly into the forefront
            this.vocalClarityFilter = this.audioCtx.createBiquadFilter();
            this.vocalClarityFilter.type = 'peaking';
            this.vocalClarityFilter.frequency.setValueAtTime(3200, this.audioCtx.currentTime);
            this.vocalClarityFilter.gain.setValueAtTime(this.vocalClarityEnabled ? 3.6 : 0, this.audioCtx.currentTime);
            this.vocalClarityFilter.Q.setValueAtTime(1.1, this.audioCtx.currentTime);

            // 1.5 Vocal Consonant Crispness & Sibilance Definition (5.4 kHz)
            this.vocalCrispFilter = this.audioCtx.createBiquadFilter();
            this.vocalCrispFilter.type = 'peaking';
            this.vocalCrispFilter.frequency.setValueAtTime(5400, this.audioCtx.currentTime);
            this.vocalCrispFilter.gain.setValueAtTime(this.vocalClarityEnabled ? 2.0 : 0, this.audioCtx.currentTime);
            this.vocalCrispFilter.Q.setValueAtTime(1.2, this.audioCtx.currentTime);

            // 1.6 Vocal Air & High-End Sheen (10.5 kHz High-Shelf)
            this.vocalAirFilter = this.audioCtx.createBiquadFilter();
            this.vocalAirFilter.type = 'highshelf';
            this.vocalAirFilter.frequency.setValueAtTime(10500, this.audioCtx.currentTime);
            this.vocalAirFilter.gain.setValueAtTime(this.vocalClarityEnabled ? 1.8 : 0, this.audioCtx.currentTime);

            // 1.7 Setup 10-Band Precision Mastering Equalizer
            this.filters = this.eqFrequencies.map((freq, idx) => {
                const filter = this.audioCtx.createBiquadFilter();
                if (idx === 0) filter.type = 'lowshelf';
                else if (idx === this.eqFrequencies.length - 1) filter.type = 'highshelf';
                else filter.type = 'peaking';
                filter.frequency.value = freq;
                filter.gain.value = 0;
                filter.Q.value = 1.1;
                return filter;
            });

            // 2. Studio Master Gain Stage (Apple ALAC / 100 dB+ Calibrated Output)
            this.studioGain = this.audioCtx.createGain();
            const gainMult = Math.pow(10, this.masterGainDb / 20);
            this.studioGain.gain.setValueAtTime(gainMult, this.audioCtx.currentTime);

            // 2.5 True Mastering Peak Safety Limiter (Fast 45ms Release, Zero Pumping on Vocals, Zero Clipping)
            this.limiter = this.audioCtx.createDynamicsCompressor();
            this.limiter.threshold.setValueAtTime(-0.6, this.audioCtx.currentTime);
            this.limiter.knee.setValueAtTime(2.0, this.audioCtx.currentTime);
            this.limiter.ratio.setValueAtTime(20.0, this.audioCtx.currentTime);
            this.limiter.attack.setValueAtTime(0.001, this.audioCtx.currentTime);
            this.limiter.release.setValueAtTime(0.045, this.audioCtx.currentTime);

            // 3. Master Gain Node (Bit-Perfect Pure PCM Volume Control)
            this.masterGain = this.audioCtx.createGain();
            this.masterGain.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);

            // 4. Analyser node for Live Spectrum Visualizer
            this.analyser = this.audioCtx.createAnalyser();
            this.analyser.fftSize = 128;
            this.analyser.smoothingTimeConstant = 0.8;

            // Connect Apple ALAC routing by default
            this.applyRoutingForPreset(this.currentPreset || 'flat');
            this.startVisualizer();
            console.log('[Apple ALAC] Subsonic Anti-Vibration & Vocal Clarity Pipeline active (100 dB+ Master)');
        } catch (e) {
            console.warn('[WebAudio] Initialized in direct audio mode:', e);
        }
    }

    applyRoutingForPreset(preset) {
        if (!this.audioCtx || !this.sourceNode) return;
        try {
            this.sourceNode.disconnect();
            const nodesToDisconnect = [
                this.subsonicFilter1,
                this.subsonicFilter2,
                this.bassTamerFilter,
                this.deMudFilter,
                this.vocalBodyFilter,
                this.vocalClarityFilter,
                this.vocalCrispFilter,
                this.vocalAirFilter,
                this.studioGain,
                this.limiter,
                this.masterGain,
                this.analyser
            ];
            nodesToDisconnect.forEach(n => {
                if (n) { try { n.disconnect(); } catch (e) {} }
            });
            if (this.filters) {
                this.filters.forEach(f => { try { f.disconnect(); } catch (e) {} });
            }

            // Core Audio Chain:
            // source -> subsonic1 (40Hz HP) -> subsonic2 (40Hz HP) -> bassTamer -> deMud (240Hz)
            // -> vocalBody (1.2kHz) -> vocalClarity (3.2kHz) -> vocalCrisp (5.4kHz) -> vocalAir (10.5kHz)
            this.sourceNode.connect(this.subsonicFilter1);
            this.subsonicFilter1.connect(this.subsonicFilter2);
            this.subsonicFilter2.connect(this.bassTamerFilter);
            this.bassTamerFilter.connect(this.deMudFilter);
            this.deMudFilter.connect(this.vocalBodyFilter);
            this.vocalBodyFilter.connect(this.vocalClarityFilter);
            this.vocalClarityFilter.connect(this.vocalCrispFilter);
            this.vocalCrispFilter.connect(this.vocalAirFilter);

            let intermediateNode = this.vocalAirFilter;

            if (preset !== 'flat') {
                this.filters.forEach(filter => {
                    intermediateNode.connect(filter);
                    intermediateNode = filter;
                });
            }

            intermediateNode.connect(this.studioGain);
            this.studioGain.connect(this.limiter);
            this.limiter.connect(this.masterGain);
            this.masterGain.connect(this.analyser);
            this.analyser.connect(this.audioCtx.destination);
        } catch (err) {
            console.warn('[Audio Routing Error]:', err);
        }
    }

    setStudioMasterGain(db) {
        this.masterGainDb = typeof db === 'number' ? db : 9.5;
        const mult = Math.pow(10, this.masterGainDb / 20);
        if (this.studioGain && this.audioCtx) {
            try {
                this.studioGain.gain.setValueAtTime(mult, this.audioCtx.currentTime);
                console.log('[Apple ALAC] Master output calibrated to ' + this.masterGainDb + ' dB (' + mult.toFixed(2) + 'x)');
            } catch (e) {}
        }
        localStorage.setItem('alac_master_gain_db', this.masterGainDb);
    }

    setVocalClarity(enabled) {
        this.vocalClarityEnabled = !!enabled;
        localStorage.setItem('alac_vocal_clarity', this.vocalClarityEnabled ? 'true' : 'false');
        if (this.audioCtx) {
            try {
                if (this.deMudFilter) this.deMudFilter.gain.setValueAtTime(this.vocalClarityEnabled ? -1.8 : 0, this.audioCtx.currentTime);
                if (this.vocalBodyFilter) this.vocalBodyFilter.gain.setValueAtTime(this.vocalClarityEnabled ? 1.5 : 0, this.audioCtx.currentTime);
                if (this.vocalClarityFilter) this.vocalClarityFilter.gain.setValueAtTime(this.vocalClarityEnabled ? 3.6 : 0, this.audioCtx.currentTime);
                if (this.vocalCrispFilter) this.vocalCrispFilter.gain.setValueAtTime(this.vocalClarityEnabled ? 2.0 : 0, this.audioCtx.currentTime);
                if (this.vocalAirFilter) this.vocalAirFilter.gain.setValueAtTime(this.vocalClarityEnabled ? 1.8 : 0, this.audioCtx.currentTime);
            } catch (e) {}
        }
    }

    setAntiVibration(enabled) {
        this.antiVibrationEnabled = !!enabled;
        localStorage.setItem('alac_anti_vibration', this.antiVibrationEnabled ? 'true' : 'false');
        if (this.audioCtx) {
            try {
                const hpFreq = this.antiVibrationEnabled ? 40 : 10;
                if (this.subsonicFilter1) this.subsonicFilter1.frequency.setValueAtTime(hpFreq, this.audioCtx.currentTime);
                if (this.subsonicFilter2) this.subsonicFilter2.frequency.setValueAtTime(hpFreq, this.audioCtx.currentTime);
                if (this.bassTamerFilter) this.bassTamerFilter.gain.setValueAtTime(this.antiVibrationEnabled ? -1.5 : 0, this.audioCtx.currentTime);
            } catch (e) {}
        }
    }

    setEQPreset(presetName) {
        this.currentPreset = presetName || 'flat';
        const presets = {
            flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // Pure Bit-Perfect Studio Reference (Spotify / Apple Music match)
            appleMusicMaster: [0.8, 0.6, 0.2, 0.0, 0.0, 0.0, 0.4, 0.8, 1.0, 1.2], // Audiophile High-Res air polish
            bassBoost: [4.5, 3.5, 2.0, 0.5, 0, 0, 0, 0, 0.5, 1.0],
            vocalClarity: [-1.0, -0.5, 0, 1.5, 3.0, 3.0, 1.5, 0.5, 0, 0],
            electronic: [4.0, 3.0, 1.5, 0, -1.0, 1.5, 2.5, 3.0, 3.5, 3.5],
            acoustic: [2.0, 1.5, 0.8, 1.0, 1.5, 1.5, 2.0, 2.0, 1.5, 1.0],
            studioMaster: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        };
        const gains = presets[presetName] || presets.appleMusicMaster;
        this.filters.forEach((filter, idx) => {
            if (filter && typeof gains[idx] === 'number') {
                filter.gain.value = gains[idx];
            }
        });
        this.applyRoutingForPreset(this.currentPreset);
    }

    setEQBand(bandIndex, gainValue) {
        if (this.filters[bandIndex]) {
            this.filters[bandIndex].gain.value = gainValue;
            const anyActive = this.filters.some(f => Math.abs(f.gain.value) > 0.1);
            this.applyRoutingForPreset(anyActive ? 'custom' : 'flat');
        }
    }

    bindVisualizerCanvas(canvasElement) {
        this.visualizerCanvas = canvasElement;
        if (canvasElement && typeof canvasElement.getContext === 'function') {
            this.visualizerCtx = canvasElement.getContext('2d');
            this.startVisualizer();
        }
    }

    startVisualizer() {
        if (!this.analyser || !this.visualizerCanvas || !this.visualizerCtx) return;
        if (this.visualizerAnimId) cancelAnimationFrame(this.visualizerAnimId);

        const canvas = this.visualizerCanvas;
        const ctx = this.visualizerCtx;
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        let idlePhase = 0;
        const render = () => {
            this.visualizerAnimId = requestAnimationFrame(render);
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const midY = canvas.height / 2;
            const barCount = 48;
            const barWidth = 2;
            const gap = Math.max(1, (canvas.width - (barCount * barWidth)) / (barCount - 1));

            if (this.isPlaying) {
                this.analyser.getByteFrequencyData(dataArray);
                for (let i = 0; i < barCount; i++) {
                    const dataIdx = Math.floor(i * (bufferLength / barCount));
                    const val = dataArray[dataIdx] || 0;
                    const barH = Math.max(3, (val / 255) * canvas.height * 0.9);
                    const x = i * (barWidth + gap);
                    const y = midY - barH / 2;

                    const grad = ctx.createLinearGradient(0, y, 0, y + barH);
                    grad.addColorStop(0, '#ff375f');
                    grad.addColorStop(0.5, '#fa586a');
                    grad.addColorStop(1, '#ff2d55');
                    ctx.fillStyle = grad;

                    if (typeof ctx.roundRect === 'function') {
                        ctx.beginPath();
                        ctx.roundRect(x, y, barWidth, barH, [1]);
                    } else {
                        ctx.rect(x, y, barWidth, barH);
                    }
                    ctx.fill();
                }
            } else {
                idlePhase += 0.05;
                for (let i = 0; i < barCount; i++) {
                    const barH = Math.sin(idlePhase + i * 0.15) * 2 + 3;
                    const x = i * (barWidth + gap);
                    const y = midY - barH / 2;

                    ctx.fillStyle = 'rgba(255, 55, 95, 0.3)';
                    if (typeof ctx.roundRect === 'function') {
                        ctx.beginPath();
                        ctx.roundRect(x, y, barWidth, barH, [1]);
                    } else {
                        ctx.rect(x, y, barWidth, barH);
                    }
                    ctx.fill();
                }
            }
        };
        render();
    }

    setupAudioListeners() {
        const el = this.audio;

        el.addEventListener('play', () => {
            this.isPlaying = true;
            this.playStartTime = el.currentTime;
            if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = 'playing';
            }
            const cur = this.getCurrentTrack();
            if (cur) this.updateMediaSession(cur);
            if (this.audioCtx && this.audioCtx.state === 'suspended') {
                this.audioCtx.resume().catch(() => {});
            }
            if (this.onPlayStateChange) this.onPlayStateChange(true);
            this.savePlaybackState();
        });

        el.addEventListener('playing', () => {
            this.isPlaying = true;
            if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = 'playing';
            }
            const cur = this.getCurrentTrack();
            if (cur) this.updateMediaSession(cur);
            this.updatePositionState();
            if (this.onPlayStateChange) this.onPlayStateChange(true);
        });

        el.addEventListener('pause', () => {
            this.isPlaying = false;
            if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = 'paused';
            }
            this.updatePositionState();
            if (this.onPlayStateChange) this.onPlayStateChange(false);
            this.savePlaybackState();
        });

        el.addEventListener('loadedmetadata', () => {
            const cur = this.getCurrentTrack();
            if (cur && el.duration && isFinite(el.duration)) {
                cur.duration = Math.round(el.duration);
            }
            if (cur) this.updateMediaSession(cur);
            this.updatePositionState();
        });

        el.addEventListener('seeked', () => {
            this.updatePositionState();
        });

        el.addEventListener('timeupdate', () => {
            if (this.onTimeUpdate) {
                this.onTimeUpdate(el.currentTime, el.duration || 0);
            }

            if (!this._hasRecordedFeedback30s && (el.currentTime >= 30 || (el.duration > 0 && el.duration <= 30 && el.currentTime >= el.duration * 0.8))) {
                this._hasRecordedFeedback30s = true;
                const currentTrack = this.getCurrentTrack();
                if (currentTrack && window.SpotifyEngine) {
                    window.SpotifyEngine.trackPlayFeedback(currentTrack, 30, el.duration || 30);
                }
            }

            // Preload next track early (at 50% duration or 20s remaining) for zero-latency lockscreen continuous playback
            if (!this._preloadedForCurrentTrack && ((el.duration > 20 && el.currentTime >= el.duration - 20) || (el.currentTime >= 20))) {
                this._preloadedForCurrentTrack = true;
                this.preloadNextTrackStream();
            }

            const now = Date.now();
            if (now - this.lastSaveTime > 1500) {
                this.lastSaveTime = now;
                this.savePlaybackState();
            }
        });

        el.addEventListener('ended', () => {
            console.log('[Audio Ended]: Track finished, advancing to next...');
            const hasNext = (this.userQueue && this.userQueue.length > 0) || 
                            (this.currentIndex + 1 < this.queue.length) || 
                            (this.repeatMode !== 'none');
            if (hasNext) {
                // Maintain active media session for mobile lock-screen continuity
                this.isPlaying = true;
                if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
            } else {
                this.isPlaying = false;
                if (this.onPlayStateChange) this.onPlayStateChange(false);
            }
            const currentTrack = this.getCurrentTrack();
            if (currentTrack && window.SpotifyEngine) {
                window.SpotifyEngine.trackPlayFeedback(currentTrack, el.duration || 180, el.duration || 180);
            }
            if (this.repeatMode === 'one') {
                el.currentTime = 0;
                el.play().catch(e => console.warn('Repeat play error:', e));
            } else {
                this.next(true);
            }
        });

        el.addEventListener('waiting', () => {
            console.log('[Audio Stream]: Buffering chunk...');
            if (this._waitingTimeout) clearTimeout(this._waitingTimeout);
            this._waitingTimeout = setTimeout(() => {
                if (this.isPlaying && !el.paused && el.readyState < 3) {
                    console.log('[Audio Stream]: Buffer recovery pulse...');
                    el.play().catch(() => {});
                }
            }, 1500);
        });

        el.addEventListener('stalled', () => {
            console.warn('[Audio Stream]: Network stalled. Attempting seamless reconnection...');
            if (this._stallTimeout) clearTimeout(this._stallTimeout);
            this._stallTimeout = setTimeout(() => {
                if (this.isPlaying && !el.paused) {
                    const curTime = el.currentTime;
                    el.currentTime = curTime + 0.05;
                    el.play().catch(() => {});
                }
            }, 1200);
        });

        // Continuous playback heartbeat watchdog (prevents 0:44 / mid-track freeze)
        if (this._playbackWatchdog) clearInterval(this._playbackWatchdog);
        this._playbackWatchdog = setInterval(() => {
            if (this.isPlaying && !el.paused && !el.ended) {
                const cur = el.currentTime;
                if (this._lastWatchdogPos !== undefined && Math.abs(cur - this._lastWatchdogPos) < 0.02) {
                    this._stuckCounter = (this._stuckCounter || 0) + 1;
                    if (this._stuckCounter >= 4) { // Frozen for 2 seconds
                        console.warn('[Audio Watchdog]: Playback stalled at', cur, 's. Auto-recovering...');
                        this._stuckCounter = 0;
                        el.currentTime = cur + 0.1;
                        el.play().catch(() => {});
                    }
                } else {
                    this._stuckCounter = 0;
                    this._lastWatchdogPos = cur;
                }
            } else {
                this._stuckCounter = 0;
            }
        }, 500);

        el.addEventListener('playing', () => {
            this._consecutiveErrors = 0;
            this._retriedWithProxy = false;
        });

        el.addEventListener('error', (e) => {
            const cur = this.getCurrentTrack();
            console.error('[Audio Error]: Playback error event:', e, el.error);
            this.isPlaying = false;
            if (this.onPlayStateChange) this.onPlayStateChange(false);

            const isPodcast = cur && (cur.isPodcast || cur.quality === 'Podcast Audio Stream' || (typeof cur.id === 'string' && cur.id.startsWith('pod_')));

            // If podcast direct stream failed and hasn't been proxied yet, retry with /api/stream proxy
            if (isPodcast && cur && cur.streamUrl && !cur.streamUrl.includes('/api/stream') && !this._retriedWithProxy) {
                this._retriedWithProxy = true;
                const proxyUrl = `${window.API_PREFIX || ''}/api/stream?url=${encodeURIComponent(cur.streamUrl)}`;
                console.log('[Audio Player] Retrying podcast playback via CORS proxy:', proxyUrl);
                this.audio.src = proxyUrl;
                this.audio.play().catch(() => {});
                return;
            }
            this._retriedWithProxy = false;

            this._consecutiveErrors = (this._consecutiveErrors || 0) + 1;
            if (this._consecutiveErrors >= 2) {
                console.warn('[Audio Player] Stopping auto-skip due to repeated playback errors.');
                this._consecutiveErrors = 0;
                if (this.onStatusMessage) this.onStatusMessage(`Audio playback paused due to stream error.`);
                return;
            }

            if (this.onStatusMessage && cur) {
                this.onStatusMessage(`Stream unavailable for "${cur.title}".`);
            }
            if (this._errorRetryTimeout) clearTimeout(this._errorRetryTimeout);
            this._errorRetryTimeout = setTimeout(() => {
                this.next(true); // ADVANCE AND PLAY AUTOMATICALLY!
            }, 1000);
        });
    }

    setVolume(val) {
        this.volume = Math.max(0, Math.min(1, val));
        if (this.masterGain && this.audioCtx) {
            // WebAudio active: keep HTMLMediaElement at unity gain 1.0 to preserve 24-bit headroom, control volume cleanly at masterGain
            this.audio.volume = 1.0;
            try {
                this.masterGain.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
            } catch (e) {}
        } else {
            this.audio.volume = this.volume;
        }
    }

    getVolume() {
        return this.volume;
    }

    async setQueue(tracks, startIndex = 0) {
        if (!Array.isArray(tracks) || tracks.length === 0) return;
        this.queue = [...tracks];
        this.currentIndex = Math.max(0, Math.min(startIndex, tracks.length - 1));
        if (this.onQueueChange) this.onQueueChange(this.queue, this.currentIndex);
        await this.playTrack(this.queue[this.currentIndex], this.queue, this.currentIndex);
    }

    addToQueue(track) {
        if (!track) return;
        this.userQueue.push(track);
        const insertIdx = this.currentIndex + this.userQueue.length;
        this.queue.splice(insertIdx, 0, track);
        if (this.onQueueChange) this.onQueueChange(this.queue, this.currentIndex);
        if (window.renderSideQueueContent) window.renderSideQueueContent();
    }

    removeFromQueue(index) {
        if (index < 0 || index >= this.queue.length) return;
        this.queue.splice(index, 1);
        if (index < this.currentIndex) {
            this.currentIndex--;
        } else if (index === this.currentIndex) {
            if (this.currentIndex < this.queue.length) {
                this.playTrack(this.queue[this.currentIndex], this.queue, this.currentIndex);
            } else {
                this.audio.pause();
                this.isPlaying = false;
            }
        }
        if (this.onQueueChange) this.onQueueChange(this.queue, this.currentIndex);
    }

    moveInQueue(fromIdx, toIdx) {
        if (fromIdx < 0 || fromIdx >= this.queue.length || toIdx < 0 || toIdx >= this.queue.length) return;
        const [moved] = this.queue.splice(fromIdx, 1);
        this.queue.splice(toIdx, 0, moved);
        if (this.currentIndex === fromIdx) {
            this.currentIndex = toIdx;
        } else if (fromIdx < this.currentIndex && toIdx >= this.currentIndex) {
            this.currentIndex--;
        } else if (fromIdx > this.currentIndex && toIdx <= this.currentIndex) {
            this.currentIndex++;
        }
        if (this.onQueueChange) this.onQueueChange(this.queue, this.currentIndex);
    }

    preloadNextTrackStream() {
        try {
            for (let offset = 1; offset <= 2; offset++) {
                const nextIdx = this.currentIndex + offset;
                if (nextIdx < this.queue.length) {
                    const nxt = this.queue[nextIdx];
                    if (nxt && !nxt.streamUrl) {
                        fetch(`${window.API_PREFIX || ''}/api/resolve?title=${encodeURIComponent(nxt.title)}&artist=${encodeURIComponent(nxt.artist || '')}`)
                            .then(r => r.json())
                            .then(d => {
                                if (d.success && d.track && d.track.streamUrl) {
                                    let su = d.track.streamUrl;
                                    if (su.includes('.saavncdn.com')) su = su.replace(/_(12|48|96|160).mp4/i, '_320.mp4');
                                    nxt.streamUrl = su;
                                    nxt.image = nxt.image || d.track.image;
                                    nxt.artwork = nxt.artwork || d.track.artwork;
                                    nxt.duration = nxt.duration || d.track.duration;
                                    if (offset === 1 && su) {
                                        try {
                                            if (!this._audioPreloader) { this._audioPreloader = new Audio(); this._audioPreloader.volume = 0; }
                                            this._audioPreloader.src = su;
                                            this._audioPreloader.load();
                                        } catch (e) {}
                                    }
                                }
                            }).catch(() => {});
                    } else if (nxt && nxt.streamUrl && offset === 1) {
                        try {
                            if (!this._audioPreloader) { this._audioPreloader = new Audio(); this._audioPreloader.volume = 0; }
                            if (this._audioPreloader.src !== nxt.streamUrl) {
                                this._audioPreloader.src = nxt.streamUrl;
                                this._audioPreloader.load();
                            }
                        } catch (e) {}
                    }
                }
            }
            if (this.repeatMode !== 'all' && window.VibeEngine && typeof window.VibeEngine.getContinuousRadioTrack === 'function') {
                const cur = this.getCurrentTrack();
                if (cur && !this._isPreloadingContinuousRadio) {
                    this._isPreloadingContinuousRadio = true;
                    window.VibeEngine.getContinuousRadioTrack(cur, this.history).then(newSong => {
                        this._isPreloadingContinuousRadio = false;
                        if (newSong && newSong.streamUrl && !this.queue.some(q => String(q.id) === String(newSong.id))) {
                            this.queue.push(newSong);
                            if (this.onQueueChange) this.onQueueChange(this.queue, this.currentIndex);
                            if (window.renderSideQueueContent) window.renderSideQueueContent();
                        }
                    }).catch(() => { this._isPreloadingContinuousRadio = false; });
                }
            }
        } catch (e) {}
    }

    async playTrackWithVibeRadio(track) {
        if (!track) return;
        this.userQueue = []; // Clear manual queue so vibe radio plays directly next
        this.isSequentialContext = false;
        this._isSkipping = false;
        this._skipTimeout = null;
        // Start playback immediately with isolated track and trigger seedVibeQueue
        await this.playTrack(track, [track], 0, false);
        this.seedVibeQueue(track);
    }

    async seedVibeQueue(track) {
        if (!track) return;
        try {
            let radioTracks = null;
            if (window.VibeEngine && typeof window.VibeEngine.getVibeRadioQueue === 'function') {
                radioTracks = await window.VibeEngine.getVibeRadioQueue(track, 20);
            }
            if (!radioTracks || radioTracks.length <= 1) {
                const isCatalyst = typeof window !== 'undefined' && (
                    window.location.hostname.includes('catalystserverless') ||
                    window.location.hostname.includes('zohocatalyst') 
                );
                const prefix = window.API_PREFIX || (isCatalyst ? '/server/music_api' : '');
                const qParams = new URLSearchParams({
                    id: track.id || '',
                    title: track.title || '',
                    artist: track.artist || '',
                    album: track.album || '',
                    lang: track.language || 'tamil'
                });
                const res = await fetch(`${prefix}/api/radio?${qParams.toString()}`);
                if (res.ok) {
                    const json = await res.json();
                    radioTracks = [track, ...(json.tracks || [])];
                }
            }

            if (!radioTracks || radioTracks.length <= 1) {
                try {
                    const isCatalyst = typeof window !== 'undefined' && (
                        window.location.hostname.includes('catalystserverless') ||
                        window.location.hostname.includes('zohocatalyst') 
                    );
                    const prefix = window.API_PREFIX || (isCatalyst ? '/server/music_api' : '');
                    const artistQuery = (track.artist || '').split(/[,&]/)[0].trim();
                    const sQuery = artistQuery ? `${artistQuery} hits` : `${track.language || 'tamil'} hits`;
                    const sRes = await fetch(`${prefix}/api/search?q=${encodeURIComponent(sQuery)}&limit=15`);
                    if (sRes.ok) {
                        const sJson = await sRes.json();
                        const resList = sJson.results || sJson.songs || [];
                        if (resList.length > 0) {
                            radioTracks = [track, ...resList];
                        }
                    }
                } catch (e2) {}
            }

            if (radioTracks && radioTracks.length > 1) {
                const cur = this.getCurrentTrack();
                if (cur && (cur.id === track.id || (cur.title || '').toLowerCase().trim() === (track.title || '').toLowerCase().trim())) {
                    const historyIds = new Set((this.history || []).map(h => String(h.id)));
                    const historyTitles = new Set((this.history || []).map(h => (h.title || '').toLowerCase().trim()));
                    function cleanAlbumKey(alb) {
                        if (!alb) return '';
                        return alb.replace(/\(.*?\)/g, '')
                                  .replace(/original motion picture soundtrack|soundtrack|single|ost|ep|theme/gi, '')
                                  .trim().toLowerCase();
                    }
                    const albumSeen = new Set();
                    const curAlbKey = cleanAlbumKey(cur.album);
                    if (curAlbKey && curAlbKey.length > 2) {
                        albumSeen.add(curAlbKey); // Spotify Rule: Seed track's album is excluded from queue
                    }

                    const remaining = [];
                    for (const t of radioTracks) {
                        if (!t || !t.id || t.id === cur.id) continue;
                        if (isSameSongOrReprise(t.title, cur.title)) continue;
                        if (historyIds.has(String(t.id))) continue;
                        const tTitle = (t.title || '').toLowerCase().trim();
                        if (historyTitles.has(tTitle)) continue;

                        // Spotify Rule: Max 1 track per album across queue
                        const tAlb = cleanAlbumKey(t.album);
                        if (tAlb && tAlb.length > 2) {
                            if (albumSeen.has(tAlb)) continue;
                            albumSeen.add(tAlb);
                        }

                        remaining.push(t);
                    }
                    this.queue = [cur, ...remaining];
                    this.currentIndex = 0;
                    if (this.onQueueChange) this.onQueueChange(this.queue, this.currentIndex);
                    if (typeof window !== 'undefined' && typeof window.renderSideQueueContent === 'function') {
                        window.renderSideQueueContent();
                    }
                    this.preloadNextTrackStream();
                    console.log(`[VibeEngine] Autoplay Radio Queue seeded for "${cur.title}". Next up: "${remaining[0]?.title}" by ${remaining[0]?.artist}`);
                }
            }
        } catch (e) {
            console.warn('[VibeEngine] seedVibeQueue error:', e);
        }
    }

    async playTrack(track, queue = null, index = -1, isSequential = null) {
        if (!track) return;
        this.initKeepAliveAudio();

        if (typeof isSequential === 'boolean') {
            this.isSequentialContext = isSequential;
        }

        if (queue && Array.isArray(queue) && queue.length > 0) {
            if (this.queue !== queue) {
                this.queue = [...queue];
            }
            if (typeof index === 'number' && index >= 0 && index < this.queue.length) {
                this.currentIndex = index;
            } else {
                const foundIdx = this.queue.findIndex(t => String(t.id) === String(track.id) || (t.title && t.title === track.title));
                this.currentIndex = foundIdx >= 0 ? foundIdx : 0;
            }
            if (isSequential === null && queue.length > 1) {
                this.isSequentialContext = true;
            }
            if (!this.isSequentialContext) {
                this.seedVibeQueue(track);
            }
        } else if (!this.queue || this.queue.length === 0) {
            this.queue = [track];
            this.currentIndex = 0;
            this.isSequentialContext = false;
        this._isSkipping = false;
        this._skipTimeout = null;
            this.seedVibeQueue(track);
        } else {
            const existingIdx = this.queue.findIndex(t => String(t.id) === String(track.id) || (t.title && t.title === track.title));
            if (existingIdx >= 0) {
                this.currentIndex = existingIdx;
            } else {
                this.queue = [track];
                this.currentIndex = 0;
                this.isSequentialContext = false;
        this._isSkipping = false;
        this._skipTimeout = null;
                this.seedVibeQueue(track);
            }
        }

        if (track && (track.id || track.title)) {
            const trackId = String(track.id || track.title);
            if (!this.history.some(h => String(h.id || h.title) === trackId)) {
                this.history.push(track);
                if (this.history.length > 50) this.history.shift();
            }
        }

        if (this.onQueueChange) this.onQueueChange(this.queue, this.currentIndex);
        if (window.renderSideQueueContent) window.renderSideQueueContent();

        this._hasRecordedFeedback30s = false;

        function isValidUrl(s) {
            if (!s || typeof s !== 'string') return false;
            return s.startsWith('http://') || s.startsWith('https://') || s.startsWith('blob:') || s.startsWith('data:');
        }

        let finalUrl = track.streamUrl || track.url;
        const isBlobSource = typeof finalUrl === 'string' && finalUrl.startsWith('blob:');

        // Resolve streamUrl if missing or invalid
        if (!isBlobSource && !isValidUrl(finalUrl)) {
            // Keep mobile lockscreen audio context continuous while resolving
            const SILENT_KEEP_ALIVE = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
            try {
                this.audio.src = SILENT_KEEP_ALIVE;
                this.audio.play().catch(() => {});
            } catch (e) {}

            if (this.onStatusMessage) this.onStatusMessage(`Resolving Hi-Res stream for "${track.title}"...`);
            try {
                const res = await fetch(`${window.API_PREFIX || ''}/api/resolve?title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(track.artist || '')}`);
                const data = await res.json();
                if (data.success && data.track && data.track.streamUrl) {
                    finalUrl = data.track.streamUrl;
                    track.streamUrl = data.track.streamUrl;
                    track.image = track.image || data.track.image;
                    track.artwork = track.artwork || data.track.artwork;
                    track.duration = track.duration || data.track.duration;
                }
            } catch (err) {
                console.error('Track stream resolution failed:', err);
            }
        }

        const isAdTracker = finalUrl && (finalUrl.includes('chtbl.com') || finalUrl.includes('dts.podtrac.com') || finalUrl.includes('prfx.byspotify.com') || finalUrl.includes('pdst.fm'));
        if (isAdTracker) {
            finalUrl = `${window.API_PREFIX || ''}/api/stream?url=${encodeURIComponent(finalUrl)}`;
        } else if (finalUrl && finalUrl.startsWith('/api/stream')) {
            finalUrl = `${window.API_PREFIX || ''}${finalUrl}`;
        }

        // Automatic 320kbps upgrade for Saavn CDN streams
        if (finalUrl && finalUrl.includes('.saavncdn.com')) {
            finalUrl = finalUrl.replace(/_(12|48|96|160).mp4/i, '_320.mp4');
            track.streamUrl = finalUrl;
        }

        this.preloadNextTrackStream();

        if (!isValidUrl(finalUrl)) {
            if (this.onStatusMessage) this.onStatusMessage(`Stream unavailable for "${track.title}". Skipping to next track...`);
            setTimeout(() => this.next(true), 600);
            return;
        }

        this.notifyInstancePlaybackStart();

        const isIOS = typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream);
        const isMobile = typeof navigator !== 'undefined' && (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
        const isPodcast = track && (track.isPodcast || track.quality === 'Podcast Audio Stream' || (typeof track.id === 'string' && track.id.startsWith('pod_')));

        // Initialize WebAudio DSP chain (Apple Music Hi-Res Lossless) - Desktop lossless only
        if (!isIOS && !isMobile && !isPodcast) {
            this.initWebAudio();
        }

        // Only ensure crossOrigin is anonymous on desktop lossless where WebAudio DSP is active.
        // Never use on mobile or podcasts to avoid CORS blocking and lock-screen suspension!
        if (!isBlobSource && !isIOS && !isMobile && !isPodcast) {
            this.audio.crossOrigin = 'anonymous';
        } else {
            this.audio.removeAttribute('crossOrigin');
        }

        if (this.masterGain && this.audioCtx) {
            this.audio.volume = 1.0;
            try {
                this.masterGain.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
            } catch (e) {}
        } else {
            this.audio.volume = this.volume;
        }
        this.audio.src = finalUrl;

        // Apply metadata and update document title immediately
        this.updateMediaSession(track);
        if (this.onTrackChange) this.onTrackChange(track);
        this.savePlaybackState();

        try {
            if (this.audioCtx && this.audioCtx.state === 'suspended') {
                this.audioCtx.resume().catch(() => {});
            }
            this._preloadedForCurrentTrack = false;
            await this.audio.play();
            // Re-apply metadata and lock screen action handlers post-play to prevent WebKit overwrite
            this.updateMediaSession(track);
            this.attachMediaSessionActionHandlers();
            setTimeout(() => { this.updateMediaSession(track); this.attachMediaSessionActionHandlers(); }, 350);
            setTimeout(() => { this.updateMediaSession(track); this.attachMediaSessionActionHandlers(); }, 1000);
        } catch (playErr) {
            console.warn('[Audio Player] Playback start notification:', playErr);
            // Smart auto-retry for mobile lock screen transitions (up to 2 retries)
            if (!this._playRetryCount) this._playRetryCount = 0;
            if (this._playRetryCount < 2) {
                this._playRetryCount++;
                setTimeout(async () => {
                    try {
                        await this.audio.play();
                        this._playRetryCount = 0;
                        this.isPlaying = true;
                        if (this.onPlayStateChange) this.onPlayStateChange(true);
                        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
                    } catch (retryErr) {
                        console.warn('[Audio Player] Lock screen auto-retry failed:', retryErr);
                    }
                }, 350);
            } else {
                this._playRetryCount = 0;
                this.isPlaying = false;
                if (this.onPlayStateChange) this.onPlayStateChange(false);
                if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
            }
        }
    }

    getCurrentTrack() {
        if (this.currentIndex >= 0 && this.currentIndex < this.queue.length) {
            return this.queue[this.currentIndex];
        }
        return null;
    }

    async togglePlay() {
        let cur = this.getCurrentTrack();
        const active = this.audio;

        // If nothing is loaded yet, start the last played track or the first available track
        if (!active.src && !cur) {
            const restored = this.restorePlaybackState();
            if (restored) {
                cur = this.getCurrentTrack();
            }
            if (!cur && window.allLoadedSongs && window.allLoadedSongs.length > 0) {
                await this.playTrack(window.allLoadedSongs[0], window.allLoadedSongs, 0);
                return;
            } else if (!cur && window.AllSongPool && window.AllSongPool.length > 0) {
                await this.playTrack(window.AllSongPool[0], window.AllSongPool, 0);
                return;
            }
        }

        if (!active.src && cur) {
            await this.playTrack(cur, this.queue, this.currentIndex);
            return;
        }

        if (active.paused) {
            this.stopSilentKeepAlive();
            this.notifyInstancePlaybackStart();
            if (cur) this.updateMediaSession(cur);
            if (this.audioCtx && this.audioCtx.state === 'suspended') {
                this.audioCtx.resume().catch(() => {});
            }
            try {
                await active.play();
                this.isPlaying = true;
                if (this.onPlayStateChange) this.onPlayStateChange(true);
                if (cur) this.updateMediaSession(cur);
                if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
            } catch(e) {
                console.warn('Playback resume blocked:', e);
            }
        } else {
            active.pause();
            this.isPlaying = false;
            if (this.onPlayStateChange) this.onPlayStateChange(false);
            if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
            this.startSilentKeepAlive();
        }
        this.savePlaybackState();
    }

    pause() {
        this.audio.pause();
        this.isPlaying = false;
        if (this.onPlayStateChange) this.onPlayStateChange(false);
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
        this.startSilentKeepAlive();
        this.savePlaybackState();
    }

    resume() {
        const cur = this.getCurrentTrack();
        if (cur) this.updateMediaSession(cur);
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume().catch(() => {});
        }
        this.audio.play().catch(e => console.warn('Resume error:', e));
        this.savePlaybackState();
    }

    seek(seconds) {
        if (!isNaN(seconds) && isFinite(seconds) && seconds >= 0) {
            this.audio.currentTime = seconds;
            this.updatePositionState();
        }
    }

    seekPercent(pct) {
        if (this.audio.duration) {
            const sec = (pct / 100) * this.audio.duration;
            this.seek(sec);
        }
    }

    async next(autoPlay = true) {
        if (this._isSkipping) return;
        this._isSkipping = true;

        try {
            if (this.queue.length === 0) return;

            // Priority 1: User-queued songs (FIFO)
            if (this.userQueue.length > 0) {
                this.userQueue.shift();
                this.currentIndex++;
                const nextTrack = this.queue[this.currentIndex];
                if (this.onQueueChange) this.onQueueChange(this.queue, this.currentIndex);
                if (window.renderSideQueueContent) window.renderSideQueueContent();
                if (autoPlay) await this.playTrack(nextTrack, this.queue, this.currentIndex, this.isSequentialContext);
                return;
            }

            if (this.repeatMode === 'one' && !autoPlay) {
                this.seek(0);
                if (autoPlay) this.audio.play().catch(() => {});
                return;
            }

            let nextIdx = this.currentIndex + 1;

            if (this.isShuffled && this.queue.length > 1) {
                let randomIdx;
                let attempts = 0;
                do {
                    randomIdx = Math.floor(Math.random() * this.queue.length);
                    attempts++;
                } while (randomIdx === this.currentIndex && attempts < 10);
                nextIdx = randomIdx;
            }

            if (nextIdx < this.queue.length) {
                this.currentIndex = nextIdx;
                const track = this.queue[this.currentIndex];
                if (this.onQueueChange) this.onQueueChange(this.queue, this.currentIndex);
                if (window.renderSideQueueContent) window.renderSideQueueContent();
                if (autoPlay) await this.playTrack(track, this.queue, this.currentIndex, this.isSequentialContext);
                return;
            }

            // End of queue reached!
            if (this.repeatMode === 'all') {
                this.currentIndex = 0;
                const track = this.queue[0];
                if (this.onQueueChange) this.onQueueChange(this.queue, this.currentIndex);
                if (window.renderSideQueueContent) window.renderSideQueueContent();
                if (autoPlay) await this.playTrack(track, this.queue, 0, this.isSequentialContext);
                return;
            }

            // Continuous Vibe flow when queue finishes
            const cur = this.getCurrentTrack();
            if (cur && window.VibeEngine && typeof window.VibeEngine.getContinuousRadioTrack === 'function') {
                if (this.onStatusMessage) this.onStatusMessage('Curating Vibe Suggestions...');
                try {
                    const newSong = await window.VibeEngine.getContinuousRadioTrack(cur, this.history);
                    if (newSong && newSong.streamUrl) {
                        this.queue.push(newSong);
                        this.currentIndex = this.queue.length - 1;
                        if (this.onQueueChange) this.onQueueChange(this.queue, this.currentIndex);
                        if (window.renderSideQueueContent) window.renderSideQueueContent();
                        if (autoPlay) await this.playTrack(newSong, this.queue, this.currentIndex, false);
                        return;
                    }
                } catch (err) {
                    console.warn('[VibeEngine] continuous radio flow error:', err);
                }
            }

            console.log('[AudioPlayer] Reached end of queue.');
            this.pause();
        } finally {
            this._isSkipping = false;
        }
    }

    async prev() {
        if (this._isSkipping) return;
        this._isSkipping = true;

        try {
            if (this.queue.length === 0) return;

            if (this.audio.currentTime > 3) {
                this.seek(0);
                return;
            }

            let prevIdx = this.currentIndex - 1;
            if (prevIdx >= 0) {
                this.currentIndex = prevIdx;
                const track = this.queue[this.currentIndex];
                if (this.onQueueChange) this.onQueueChange(this.queue, this.currentIndex);
                if (window.renderSideQueueContent) window.renderSideQueueContent();
                await this.playTrack(track, this.queue, this.currentIndex, this.isSequentialContext);
            } else if (this.history && this.history.length > 1) {
                // If at start of queue, navigate backwards into play history
                const prevTrack = this.history[this.history.length - 2];
                if (prevTrack) {
                    await this.playTrack(prevTrack, this.queue, 0, this.isSequentialContext);
                } else {
                    this.seek(0);
                }
            } else if (this.repeatMode === 'all' && this.queue.length > 1) {
                this.currentIndex = this.queue.length - 1;
                const track = this.queue[this.currentIndex];
                if (this.onQueueChange) this.onQueueChange(this.queue, this.currentIndex);
                if (window.renderSideQueueContent) window.renderSideQueueContent();
                await this.playTrack(track, this.queue, this.currentIndex, this.isSequentialContext);
            } else {
                this.seek(0);
            }
        } finally {
            this._isSkipping = false;
        }
    }

    toggleShuffle() {
        this.isShuffled = !this.isShuffled;
        return this.isShuffled;
    }

    toggleRepeat() {
        if (this.repeatMode === 'none') this.repeatMode = 'all';
        else if (this.repeatMode === 'all') this.repeatMode = 'one';
        else this.repeatMode = 'none';
        return this.repeatMode;
    }

        /**
     * Audiophile Persistent Background Audio Session Carrier
     * Keeps iOS AVAudioSessionCategoryPlayback alive continuously through WebAudio
     * without interfering with HTML5 <audio> or MediaSession metadata.
     */
    initKeepAliveAudio() {
        if (this._keepAliveUnlocked) return;
        if ('audioSession' in navigator) {
            try { navigator.audioSession.type = 'playback'; } catch (e) {}
        }
        try {
            const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtxClass) return;
            if (!this._keepAliveCtx) {
                this._keepAliveCtx = new AudioCtxClass();
            }
            if (this._keepAliveCtx.state === 'suspended') {
                this._keepAliveCtx.resume().catch(() => {});
            }
            if (!this._keepAliveNode) {
                // Microscopic 1-second inaudible buffer that loops continuously
                const buffer = this._keepAliveCtx.createBuffer(1, 44100, 44100);
                const source = this._keepAliveCtx.createBufferSource();
                source.buffer = buffer;
                source.loop = true;

                const gain = this._keepAliveCtx.createGain();
                // 0.00001 gain ensures audio frames are continuously sent to CoreAudio destination
                gain.gain.setValueAtTime(0.00001, this._keepAliveCtx.currentTime);
                source.connect(gain);
                gain.connect(this._keepAliveCtx.destination);
                source.start(0);

                this._keepAliveNode = source;
                this._keepAliveGain = gain;
            }
            this._keepAliveUnlocked = true;
            console.log('[AudioEngine] Persistent iOS WebAudio keep-alive carrier unlocked');
        } catch (e) {
            console.warn('[AudioEngine] Keep-alive setup warning:', e);
        }
    }

    startSilentKeepAlive() {
        this.initKeepAliveAudio();
        if (this._keepAliveCtx && this._keepAliveCtx.state === 'suspended') {
            this._keepAliveCtx.resume().catch(() => {});
        }
    }

    stopSilentKeepAlive() {
        // Keep carrier active continuously in background so session never terminates
    }

    /**
     * iOS Safari Lock Screen Resume Handler
     * Resumes playback synchronously directly within the remote command event
     */
    resumeFromLockScreen() {
        this.isPlaying = true;
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'playing';
        }
        if (this._keepAliveCtx && this._keepAliveCtx.state === 'suspended') {
            this._keepAliveCtx.resume().catch(() => {});
        }
        const cur = this.getCurrentTrack();
        const active = this.audio;

        this.notifyInstancePlaybackStart();

        // Direct native play call SYNCHRONOUSLY without preceding await to retain iOS activation
        try {
            const p = active.play();
            if (p !== undefined) {
                p.then(() => {
                    this.isPlaying = true;
                    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
                    if (cur) this.updateMediaSession(cur);
                    this.updatePositionState();
                    if (this.onPlayStateChange) this.onPlayStateChange(true);
                }).catch((err) => {
                    console.warn('[LockScreen Resume]: Direct play catch, attempting reload...', err);
                    try {
                        const curTime = active.currentTime || 0;
                        const streamUrl = cur?.streamUrl || active.src;
                        if (streamUrl) {
                            active.src = streamUrl;
                            if (curTime > 0) {
                                active.addEventListener('loadedmetadata', () => {
                                    try { active.currentTime = curTime; } catch(e){}
                                }, { once: true });
                            }
                            active.load();
                            active.play().then(() => {
                                this.isPlaying = true;
                                if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
                                if (cur) this.updateMediaSession(cur);
                                this.updatePositionState();
                                if (this.onPlayStateChange) this.onPlayStateChange(true);
                            }).catch(() => {});
                        }
                    } catch (e) {}
                });
                return;
            }
        } catch (err) {
            console.warn('[LockScreen Resume]: Direct synchronous play call threw:', err);
        }
    }

    initMediaSession() {
        if (!('mediaSession' in navigator)) return;
        this.attachMediaSessionActionHandlers();
    }

    attachMediaSessionActionHandlers() {
        if (!('mediaSession' in navigator)) return;

        // 1. CRITICAL FOR MOBILE LOCK SCREEN:
        // Explicitly clear seekbackward and seekforward to null first!
        // When seekbackward/seekforward are registered, iOS Safari lock screen hides the Next and Previous song buttons!
        try { navigator.mediaSession.setActionHandler('seekbackward', null); } catch (e) {}
        try { navigator.mediaSession.setActionHandler('seekforward', null); } catch (e) {}

        // 2. CRITICAL: Next Track & Previous Track buttons for iPhone Lock Screen, Dynamic Island, Apple Watch & Android
        try {
            navigator.mediaSession.setActionHandler('previoustrack', () => {
                this.prev();
            });
        } catch (e) {}

        try {
            navigator.mediaSession.setActionHandler('nexttrack', () => {
                this.next(true);
            });
        } catch (e) {}

        // 3. Play & Pause
        try {
            navigator.mediaSession.setActionHandler('play', () => {
                this.stopSilentKeepAlive();
                this.isPlaying = true;
                if ('mediaSession' in navigator) {
                    navigator.mediaSession.playbackState = 'playing';
                }
                this.resumeFromLockScreen();
            });
        } catch (e) {}

        try {
            navigator.mediaSession.setActionHandler('pause', () => {
                this.isPlaying = false;
                this.audio.pause();
                if ('mediaSession' in navigator) {
                    navigator.mediaSession.playbackState = 'paused';
                }
                this.updatePositionState();
                if (this.onPlayStateChange) this.onPlayStateChange(false);
                this.startSilentKeepAlive();
                this.savePlaybackState();
            });
        } catch (e) {}

        // 4. Smooth progress scrubber on lock screen
        try {
            navigator.mediaSession.setActionHandler('seekto', (details) => {
                if (details.seekTime !== undefined && isFinite(details.seekTime)) {
                    if (details.fastSeek && 'fastSeek' in this.audio) {
                        this.audio.fastSeek(details.seekTime);
                    } else {
                        this.audio.currentTime = details.seekTime;
                    }
                    this.updatePositionState();
                }
            });
        } catch (e) {}

        // 5. Stop
        try {
            navigator.mediaSession.setActionHandler('stop', () => {
                this.pause();
            });
        } catch (e) {}
    }

    updatePositionState() {
        if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
            try {
                const d = this.audio.duration;
                const t = this.audio.currentTime;
                if (typeof d === 'number' && !isNaN(d) && isFinite(d) && d > 0 && typeof t === 'number' && !isNaN(t) && isFinite(t)) {
                    navigator.mediaSession.setPositionState({
                        duration: Math.max(d, 1),
                        playbackRate: this.audio.playbackRate || 1,
                        position: Math.min(Math.max(t, 0), d)
                    });
                }
            } catch (e) {}
        }
    }

    /**
     * Bulletproof Lock Screen Metadata & Title Synchronizer
     * Updates document.title, Apple Touch Icon, and MediaSession metadata.
     */
    updateMediaSession(track) {
        if (!track) track = this.getCurrentTrack();
        if (!track) return;

        // 1. Clean Title, Artist, Album
        const sTitle = (track.title || 'Studio Lossless').trim();
        const sArtist = ((track.artist && track.artist !== 'undefined' && track.artist !== 'Unknown') 
            ? track.artist 
            : (track.primaryArtist || track.subtitle || 'Omonk Lossless Artist')).trim();
        const sAlbum = (track.album || 'Hi-Res Lossless Master').trim();

        // 2. CRITICAL: Dynamically update document.title
        // Ensures iOS native fallback displays the Song Title and Artist instead of website title
        document.title = sArtist ? `${sTitle} • ${sArtist}` : sTitle;

        // 3. Extract High-Res Artwork
        let artUrl = '';
        if (typeof track.artwork === 'string' && track.artwork.trim()) {
            artUrl = track.artwork.trim();
        } else if (typeof track.image === 'string' && track.image.trim()) {
            artUrl = track.image.trim();
        } else if (Array.isArray(track.image) && track.image.length > 0) {
            artUrl = track.image[track.image.length - 1]?.url || track.image[0]?.url || '';
        } else if (Array.isArray(track.artwork) && track.artwork.length > 0) {
            artUrl = track.artwork[track.artwork.length - 1]?.url || track.artwork[0]?.url || '';
        }

        if (!artUrl || !artUrl.startsWith('http')) {
            artUrl = new URL('apple-touch-icon.png', window.location.href).href;
        } else if (artUrl.startsWith('http://')) {
            artUrl = artUrl.replace('http://', 'https://');
        }

        // 4. Retain static Apple Touch Icon so installed PWA icon is never overwritten by song artwork

        // 5. Update MediaSession API with multi-resolution artwork
        if ('mediaSession' in navigator) {
            try {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: sTitle,
                    artist: sArtist,
                    album: sAlbum,
                    artwork: [
                        { src: artUrl, sizes: '512x512' },
                        { src: artUrl, sizes: '384x384' },
                        { src: artUrl, sizes: '256x256' },
                        { src: artUrl, sizes: '192x192' },
                        { src: artUrl, sizes: '128x128' },
                        { src: artUrl, sizes: '96x96' }
                    ]
                });
            } catch (metaErr) {
                try {
                    navigator.mediaSession.metadata = new MediaMetadata({
                        title: sTitle,
                        artist: sArtist,
                        album: sAlbum
                    });
                } catch (e2) {}
            }

            this.attachMediaSessionActionHandlers();
            const isCurrentlyPlaying = this.audio ? !this.audio.paused : this.isPlaying;
            navigator.mediaSession.playbackState = isCurrentlyPlaying ? 'playing' : 'paused';
            this.updatePositionState();
        }
    }

    savePlaybackState() {
        const track = this.getCurrentTrack();
        if (!track) return;
        const profId = (window.ProfileManager && window.ProfileManager.getActiveProfileId) 
            ? window.ProfileManager.getActiveProfileId() 
            : 'primary';
        const key = `lossless_prof_${profId}_playback_state`;
        try {
            const payload = {
                track: track,
                queue: this.queue,
                currentIndex: this.currentIndex,
                currentTime: this.audio.currentTime || 0,
                duration: this.audio.duration || track.duration || 0,
                volume: this.audio.volume,
                isShuffled: this.isShuffled,
                repeatMode: this.repeatMode,
                timestamp: Date.now()
            };
            localStorage.setItem(key, JSON.stringify(payload));
        } catch (e) {
            console.warn('[Player Save Error]:', e);
        }
    }

    restorePlaybackState() {
        const profId = (window.ProfileManager && window.ProfileManager.getActiveProfileId) 
            ? window.ProfileManager.getActiveProfileId() 
            : 'primary';
        const key = `lossless_prof_${profId}_playback_state`;
        const raw = localStorage.getItem(key);
        if (!raw) return null;

        try {
            const state = JSON.parse(raw);
            if (!state || !state.track) return null;

            this.queue = Array.isArray(state.queue) && state.queue.length > 0 ? state.queue : [state.track];
            this.currentIndex = state.currentIndex >= 0 && state.currentIndex < this.queue.length ? state.currentIndex : 0;
            this.isShuffled = !!state.isShuffled;
            this.repeatMode = state.repeatMode || 'none';
            if (typeof state.volume === 'number') {
                this.setVolume(state.volume);
            }

            let finalUrl = state.track.streamUrl;
            if (finalUrl) {
                if (finalUrl.includes('.saavncdn.com')) {
                    finalUrl = finalUrl.replace(/_(12|48|96|160).mp4/i, '_320.mp4');
                }
                this.audio.src = finalUrl;
                if (state.currentTime > 0) {
                    this.audio.currentTime = state.currentTime;
                }
            }

            if (this.onTrackChange) this.onTrackChange(state.track);
            if (this.onTimeUpdate) this.onTimeUpdate(state.currentTime || 0, state.duration || state.track.duration || 0);

            // Synchronize metadata immediately upon state restore
            this.updateMediaSession(state.track);

            this.isPlaying = false;
            if (this.onPlayStateChange) this.onPlayStateChange(false);

            return state.track;
        } catch (e) {
            console.warn('[Player Restore Error]:', e);
            return null;
        }
    }
}

// Global Singleton
window.AudioPlayer = new AudioPlayerEngine();
