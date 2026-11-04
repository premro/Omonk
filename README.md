# Omonk — Lossless Studio Music Platform

Omonk is a high-fidelity Lossless music streaming web application and PWA powered by **Zoho Catalyst Serverless**.

---

## Architecture

- **Web Client** (`client/`):
  - Progressive Web App (PWA) with Service Worker offline caching (`sw.js`).
  - Web Audio API mastering engine (`player.js`) supporting 24-bit/48kHz FLAC output, Apple ALAC emulation, dynamic bass taming, and vocal clarity.
  - Multi-lingual hits charts across 11 languages (Tamil, Telugu, Hindi, Malayalam, Kannada, Punjabi, English, Spanish, K-Pop, Japanese, French).
  - Background audio keep-alive and iOS lock screen MediaSession integration.

- **Backend Advanced I/O Function** (`functions/music_api/`):
  - Node.js serverless API with Catalyst SDK.
  - Multi-provider search and stream resolver (`searchEngine.js`).
  - Automatic live chart synchronizer and cache manager (`chartsData.json`, `weekly_cache.json`).
  - Lyrics extraction and sync (`lyricsEngine.js`).

---

## Deployment

Deploy directly using the Zoho Catalyst CLI:

```bash
# Ensure Catalyst CLI is installed
npm install -g zcatalyst-cli

# Login to Catalyst (if needed)
catalyst login

# Deploy all components (Web Client & Serverless Functions)
catalyst deploy
```

Live Access URL:
`https://omonk-60079640926.development.catalystserverless.in/app/index.html`
