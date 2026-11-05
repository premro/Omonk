# 🎵 Omonk — Lossless Studio High-Fidelity Music Platform

Omonk is a modern, high-fidelity lossless music streaming web application and PWA. It is built to run natively on **Vercel** and **GitHub** with **zero reliance on Zoho Catalyst**.

---

## 🌟 Highlights

- **Pure Cloud & Client Architecture**: Zero dependency on Zoho Catalyst. Deploys seamlessly to Vercel with serverless API routes (`/api/*`).
- **High-Fidelity Audio Mastering**: Web Audio API engine (`client/player.js`) supporting 24-bit/48kHz FLAC output, Apple ALAC emulation, bass boost, vocal clarity, and 3D spatial soundstage.
- **Multi-Lingual Hits**: Live charts and streaming across 11 languages (Tamil, Telugu, Hindi, Malayalam, Kannada, Punjabi, English, Spanish, K-Pop, Japanese, French).
- **Interactive Player Suite**:
  - Live synchronized lyrics viewer (`client/lyrics.js`).
  - Interactive piano roll transcription engine (`client/pianoRoll.js`).
  - Smart playlist importer for Spotify, YouTube, and text lists (`client/importer.js`).
  - Curated podcast streams & episode browser (`client/podcastsEngine.js`).
- **Offline PWA Engine**: Service Worker caching (`client/sw.js`) and IndexedDB storage for offline playback.

---

## 🚀 Quick Start (Local Development)

Run the built-in development server with zero npm dependencies:

```bash
# Start local server (serves web app + runs API proxy on port 3000)
npm start
```

Visit: [http://localhost:3000](http://localhost:3000)

To validate JavaScript syntax:
```bash
npm test
```

---

## 📦 How to Add to GitHub Repository

1. Open your terminal and navigate to the project directory:
   ```bash
   cd /Users/prem-19467/Documents/Omonk
   ```

2. Review git status and stage all files:
   ```bash
   git status
   git add .
   git commit -m "feat: setup standalone Vercel & GitHub architecture with zero Catalyst dependency"
   ```

3. Create a new repository on [GitHub](https://github.com/new) (e.g., named `omonk` or `omonk-music`).

4. Link the remote and push to GitHub:
   ```bash
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/omonk.git
   git branch -M main
   git push -u origin main
   ```

---

## ⚡ How to Publish on Vercel

### Method 1: Via Vercel Web Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com/) and click **"Add New"** → **"Project"**.
2. Select your newly pushed GitHub repository (`omonk`).
3. In the project configuration:
   - **Framework Preset**: Other
   - **Root Directory**: `./` (leave default)
   - **Build Command**: Leave default (or `npm run build`)
   - **Output Directory**: Leave empty
4. Click **Deploy**.
5. Your music platform will be live at `https://<project-name>.vercel.app` in under 30 seconds!

### Method 2: Via Vercel CLI

From the project root:
```bash
npx vercel
```
Follow the prompt instructions, and when ready for production:
```bash
npx vercel --prod
```

---

## 🛠️ Project Structure

```
Omonk/
├── api/                       # Vercel Serverless Functions
│   ├── index.js               # Core API router & proxy (/api/*)
│   ├── searchEngine.js        # Search & stream resolver
│   ├── lyricsEngine.js        # Real-time lyrics parser
│   ├── pianoEngine.js         # Harmonic note transcription engine
│   ├── podcastsEngine.js      # Verified podcast channels
│   ├── importEngine.js        # Spotify/YouTube playlist importer
│   ├── chartsData.json        # Pre-cached regional charts
│   └── weekly_cache.json      # Weekly hits database
├── client/                    # Web Application & PWA Frontend
│   ├── index.html             # Main player interface
│   ├── app.js                 # App controller & catalog manager
│   ├── player.js              # Web Audio lossless playback engine
│   ├── styles.css             # Glassmorphism dark theme styles
│   ├── sw.js                  # PWA service worker
│   ├── lyrics.js              # Lyrics visualizer
│   ├── importer.js            # Playlist importer
│   ├── miniplayer.js          # Picture-in-picture miniplayer
│   └── assets/                # Audio cues, banners & artwork
├── .github/workflows/         # GitHub Actions CI validation
│   └── deploy.yml             # Automated syntax verification
├── index.html                 # Root redirect entry for static hosts
├── server.js                  # Zero-dependency local dev server
├── vercel.json                # Vercel routing, rewrites & security headers
├── package.json               # Scripts & metadata
└── .gitignore                 # Clean repository filter
```

---

## 📄 License

MIT License. Designed & developed by Prem.
