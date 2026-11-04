# 🎵 SpotiLossless • Open-Source Lossless Music Player

An open-source online, offline, and download music streaming app delivering **FLAC Lossless (24-bit / 48kHz)** and **Hi-Fi 320kbps** audio, built with reference to [SpotiFLAC](https://github.com/spotbye/SpotiFLAC.git), Spotify's discovery algorithms, multi-language hits charts, and synchronized karaoke lyrics.

---

## 🌟 Key Features

1. **Lossless Audio Engine (SpotiFLAC Architecture)**:
   - High-fidelity 320kbps AAC/MP4 and FLAC streaming with direct Saavn DES-ECB CDN decrypting and multi-bitrate resolution.
   - Stream proxy with HTTP 206 Partial Content (Range request) support for instant seek/scrub in browsers.
   - Web Audio API DSP pipeline with live Canvas spectrum visualizer and 10-Band studio hardware equalizer.

2. **Daily, Weekly, and Monthly Hits for All Languages**:
   - Onboarding modal at web startup prompts for user's preferred music languages (Tamil, Telugu, Hindi, Malayalam, Kannada, Punjabi, English/Global, Spanish, K-Pop, Japanese, French).
   - Dynamic charts with #1, #2, #3 rank styling, 1-click "Play All", and "Download All".

3. **Spotify 7-Step Recommendation Algorithm**:
   - 5D Acoustic feature derivation (Energy, Danceability, Valence, Acousticness, Tempo BPM).
   - Bayesian user taste vector with real-time feedback weighting (+8 for completion, -5 for quick skip, +15 for like, +20 for download).
   - Auto-generated **Discover Weekly**, **Daily Mix 1 (High Energy)**, **Daily Mix 2 (Soulful Melodies)**, and **Daily Mix 3 (Chill / Late Night)**.
   - Smart Continuous Autoplay: Queue never runs dry.

4. **Offline Mode & Lossless Downloads**:
   - IndexedDB database (`LosslessAudioDB`) caches full audio blobs for true offline playback without internet.
   - 1-Click Track Download button exports pristine `.m4a`/`.flac` files to the local computer with artist and track naming.
   - Dedicated "Offline Downloads" library showing stored file size in MB.

5. **Universal Playlist Importer**:
   - Import playlists and albums from **Spotify URLs** (`open.spotify.com/playlist/...`, `/album/...`, `/track/...`).
   - Import from **YouTube URLs** (`youtube.com/playlist?list=...` or individual videos).
   - Import from **Plain Text / CSV** tracklists ("Artist - Title" per line).

6. **Synced Karaoke Lyrics**:
   - Powered by LRCLIB API with line-by-line synchronization, glowing active text, auto-scrolling, and interactive click-to-seek timestamp jumping.

---

## 🚀 Running the App

To run the server on port `8888`:

```bash
cd ~/Documents/LosslessMusicApp
python3 server.py
```

Then open your browser at:
👉 **[http://localhost:8888](http://localhost:8888)**
