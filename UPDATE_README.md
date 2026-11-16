# LosslessMusicApp Update Package (v8.2.0)

## Included Updated Files
1. `player.js` — Adds Silent Audio Keep-Alive loop (prevents 2-minute lockscreen pause freeze), dual `<audio>` next-track preloader, and canonical title history deduplication.
2. `vibeEngine.js` — Fixes repetitive song loops (e.g., alternate versions of *Ennavale Adi Ennavale*) and enforces strict composer/language/mood matching.
3. `spotiflac.py` — Multi-stage fuzzy track resolver for Spotify, iTunes, and JioSaavn tracks so imported playlists never drop songs due to `(From "...")` or `- Remastered` suffixes.
4. `weekly_sync.py` & `server.py` — Updates chart/playlist refresh intervals from 7–30 days to 30 minutes so new songs appear automatically.

## How to Apply in Xcode / Antigravity
1. Unzip `LosslessMusicApp_Update_v8.2.zip`.
2. Drag and replace `player.js`, `vibeEngine.js`, `spotiflac.py`, `weekly_sync.py`, and `server.py` into your `LosslessMusicApp` folder.
3. Restart `server.py` and hard-refresh the web app (`Cmd + Shift + R` or re-open the Home Screen PWA).
