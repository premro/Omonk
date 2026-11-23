================================================================================
               OMONK (LOSSLESS STUDIO) - COMPLETE FEATURES CATALOG
                     Comprehensive Verification & Testing Checklist
================================================================================
Generated: 2026-11-23 | App Version: v8.15.0 | PWA Cache: lossless-studio-v8.15.0

Use this checklist to request testing for any single feature or complete category.
Each item includes a unique Feature ID, description, options, and verification criteria.

--------------------------------------------------------------------------------
SECTION 1: CORE AUDIO & PLAYBACK ENGINE (FEAT-PLY)
--------------------------------------------------------------------------------
[ ] [FEAT-PLY-01] Play / Pause Toggle
    - Description: Toggles playback between playing and paused states.
    - Triggers: Spacebar key, play/pause button (#playPauseBtn), row play button (.row-play-btn).
    - Verification: Audio element plays/pauses smoothly; button icon toggles (▶ / ⏸); playbackState updates.

[ ] [FEAT-PLY-02] Next & Previous Track Navigation
    - Description: Skips to next track or returns to previous track/start of song.
    - Triggers: #nextBtn, #prevBtn, MediaSession next/prev controls, keyboard shortcuts.
    - Verification: If currentTime > 3s, prev restarts song; otherwise moves to previous index; next advances queue.

[ ] [FEAT-PLY-03] Time Scrubber & Seeking
    - Description: Interactive scrub bar showing elapsed time, duration, and click-to-seek.
    - Triggers: Click/drag on #progressTrack, keyboard arrow keys.
    - Verification: Audio currentTime updates instantly; #currentTime and #totalDuration format mm:ss correctly.

[ ] [FEAT-PLY-04] Shuffle Mode
    - Description: Fisher-Yates randomization of upcoming tracks in queue while preserving current track and history.
    - Triggers: #shuffleBtn toggle.
    - Verification: Button highlights active; side queue reflects shuffled order; no duplicate or omitted tracks.

[ ] [FEAT-PLY-05] Repeat Mode
    - Description: Cycles through 3 states: Off -> Repeat All -> Repeat One.
    - Triggers: #repeatBtn toggle.
    - Verification: Repeat One loops current track indefinitely; Repeat All loops queue when end is reached.

[ ] [FEAT-PLY-06] Volume & 1-Tap Mute Control
    - Description: Volume slider and quick-mute toggle with volume level memory.
    - Triggers: #volumeSlider input, #muteBtn click.
    - Verification: Mute sets audio.volume = 0; unmuting restores previous volume level; gain node updates.

[ ] [FEAT-PLY-07] Realtime Frequency Audio Visualizer
    - Description: Live Web Audio API frequency visualizer canvas in the player bar.
    - Triggers: Audio playing with Web Audio API initialized.
    - Verification: Canvas renders animated frequency bars while playing; smooth idle rendering when paused.

[ ] [FEAT-PLY-08] Web Audio 3-Band Parametric Equalizer
    - Description: Low, mid, and high frequency audio tone shaping via BiquadFilterNodes.
    - Triggers: AudioPlayer.setBass(), setMid(), setTreble().
    - Verification: Real-time frequency response adjustments without audio clipping or latency.

[ ] [FEAT-PLY-09] Lock-Screen Background Playback (iOS / Android / macOS)
    - Description: Continuous audio playback when screen is locked or app is minimized.
    - Triggers: Native navigator.audioSession.type = "playback".
    - Verification: Music does not pause or stutter when switching apps or locking device.

[ ] [FEAT-PLY-10] Persistent Lock-Screen Pause Anchor
    - Description: Sub-audible loop keeping iOS web audio session alive when user pauses.
    - Triggers: AudioPlayer.startLockscreenPauseAnchor() on pause.
    - Verification: Lock-screen media controls stay visible on iOS/macOS for up to 30 min while paused.

[ ] [FEAT-PLY-11] MediaSession API Lock-Screen Controls
    - Description: Full metadata, 512x512 artwork, and native action handlers sent to OS lock-screen.
    - Triggers: AudioPlayer.updateMediaSession(track).
    - Verification: Correct song title, artist, album art shown on lock-screen and Bluetooth/car displays.

[ ] [FEAT-PLY-12] 75% Duration Gapless Prebuffering
    - Description: Pre-resolves and prebuffers streams for the next 2 tracks when current track reaches 75%.
    - Triggers: preloadNextTrackStream() during timeupdate.
    - Verification: Immediate zero-latency transition to next track when current track ends.

[ ] [FEAT-PLY-13] Lossless Bitrate Escalation (320kbps / FLAC)
    - Description: Auto-escalates CDN URLs from 128kbps/160kbps to highest 320kbps lossless MP4.
    - Triggers: AudioPlayer URL normalization.
    - Verification: Stream URLs contain "_320.mp4"; badge displays "FLAC / 320kbps Lossless Hi-Fi".

[ ] [FEAT-PLY-14] Stale Stream Invalidation & Stale Audio Prevention
    - Description: Unloads previous audio source immediately if a new track stream fails to resolve.
    - Triggers: AudioPlayer.playTrack() error branch.
    - Verification: Previous song NEVER continues playing if new track cannot be resolved.

--------------------------------------------------------------------------------
SECTION 2: LIKED SONGS & FAVORITES SUBSYSTEM (FEAT-LIB)
--------------------------------------------------------------------------------
[ ] [FEAT-LIB-01] Player Bar Like Toggle
    - Description: Heart button in the bottom player bar to like/unlike the currently playing track.
    - Triggers: #playerLikeBtn click.
    - Verification: Icon toggles between heart (❤️) and empty (🤍); toast notification appears; state saved.

[ ] [FEAT-LIB-02] Track Row Like Button
    - Description: Heart button on every track row across Home, Search, Playlists, Albums, and Artists.
    - Triggers: .track-row [data-action="like"] click.
    - Verification: Song instantly added/removed from Liked Songs without interrupting playback.

[ ] [FEAT-LIB-03] Side Panel Now Playing Like Button
    - Description: Heart button on the right sliding queue card.
    - Triggers: #sideNowLikeBtn click.
    - Verification: Stays in sync with #playerLikeBtn and track row heart buttons.

[ ] [FEAT-LIB-04] Full Metadata Liked Songs Persistence
    - Description: Stores complete track metadata (id, title, artist, album, duration, artwork, streamUrl) in localStorage under liked_tracks_data.
    - Triggers: toggleTrackLiked() in app.js.
    - Verification: Songs liked from Search, Spotify Import, or Radio queue ALWAYS appear in Liked Songs, even if not on Home charts.

[ ] [FEAT-LIB-05] Liked Songs View Rendering (/liked)
    - Description: Dedicated view displaying all liked tracks with play buttons, ranks, duration, and batch actions.
    - Triggers: Sidebar "Liked Songs" item or renderView("liked").
    - Verification: Displays exact count of favorites; clicking any track plays it with full queue context.

[ ] [FEAT-LIB-06] Synchronized Heart Icons
    - Description: All heart buttons for the same track ID across the entire DOM update in sync.
    - Triggers: updateLikeButtonsState(track).
    - Verification: Liking in player bar immediately highlights the row button and side panel button.

--------------------------------------------------------------------------------
SECTION 3: PLAYLISTS & UNIVERSAL IMPORTER (FEAT-IMP)
--------------------------------------------------------------------------------
[ ] [FEAT-IMP-01] Custom Playlist Creation & Deletion
    - Description: Create custom playlists with custom titles, artwork, and descriptions; delete playlists.
    - Triggers: Library view "+ Create Playlist" button, delete modal.
    - Verification: New playlist appears in sidebar and library; survives page reloads.

[ ] [FEAT-IMP-02] Add Track to Playlist & Remove Track
    - Description: Add any track from any view into an existing custom playlist or create a new one on the fly.
    - Triggers: .track-row [data-action="playlist"] click.
    - Verification: Playlist picker modal shows all custom playlists; duplicate detection prevents re-adding.

[ ] [FEAT-IMP-03] Spotify Playlist & Album Import
    - Description: Paste any public Spotify playlist or album URL to import all tracks into Omonk.
    - Triggers: Import modal -> Spotify tab or auto-detected URL paste.
    - Verification: Extracts track titles, artists, album artwork, and generates an Omonk custom playlist.

[ ] [FEAT-IMP-04] Spotify Single Song Import with Instant Playback
    - Description: Paste a single Spotify track URL (e.g. track/4c1fYltBlMaA2Elc54dpTW).
    - Triggers: Import modal -> paste track URL -> Import.
    - Verification: Automatically extracts song, pre-resolves 320kbps lossless stream, and immediately starts playback.

[ ] [FEAT-IMP-05] YouTube Playlist & Video Import
    - Description: Paste a YouTube playlist (list=...) or video (v=...) link.
    - Triggers: Import modal -> YouTube tab or auto-detected URL.
    - Verification: Resolves video metadata and maps tracks into an imported playlist.

[ ] [FEAT-IMP-06] YouTube Jukebox Split (Chapters & Timestamps)
    - Description: Detects and splits 1-hour DJ mixes / jukeboxes into individual songs using description timestamps or YouTube chapters.
    - Triggers: Importer.splitJukeboxPlaylist() / importYouTube().
    - Verification: Generates individual song entries with accurate start times and track lengths.

[ ] [FEAT-IMP-07] Plain Text / CSV Tracklist Import
    - Description: Paste a list of "Song - Artist" or CSV rows.
    - Triggers: Import modal -> Text tab.
    - Verification: Parses lines into clean track rows and adds to library.

[ ] [FEAT-IMP-08] Platform Protocol Auto-Routing
    - Description: Auto-detects URL type regardless of which tab is active in the import modal.
    - Triggers: Pasting Spotify link in YouTube tab or vice versa.
    - Verification: Routes to Importer.importSpotify() or Importer.importYouTube() seamlessly without error.

[ ] [FEAT-IMP-09] Persisting Resolved Stream URLs to Playlists
    - Description: Once a track in an imported playlist resolves its streamUrl during playback, saves it to localStorage.
    - Triggers: AudioPlayer.playTrack() successful resolve.
    - Verification: Subsequent plays of that track start immediately without re-resolving.

--------------------------------------------------------------------------------
SECTION 4: SEARCH & PHONETIC RELEVANCE ENGINE (FEAT-SRC)
--------------------------------------------------------------------------------
[ ] [FEAT-SRC-01] Universal Unified Search
    - Description: Single search input querying Songs, Albums, Artists, and Playlists simultaneously.
    - Triggers: Search bar (#searchInput), /api/search.
    - Verification: Returns structured results with categorized tabs and 10-minute caching.

[ ] [FEAT-SRC-02] Romanized Tamil / Indian Phonetic Transliteration
    - Description: Phonetic normalizer matching spelling variations (e <-> ye, u <-> o, zh <-> l, th <-> t, sh <-> s).
    - Triggers: searchEngine.phonetics(), searchAll().
    - Verification: "Enna Azhagu" finds "Yenna Azhago"; "Shiva" matches "Siva C.".

[ ] [FEAT-SRC-03] Multi-Artist Token Overlap Matching
    - Description: Evaluates candidate matches against all artists in the search query (singers, lyricists, music directors).
    - Triggers: calcItemScore() artist token loop.
    - Verification: Querying "Shiva, Vairamuthu" correctly matches songs with "Kavingar Vairamuthu" and "Siva C.".

[ ] [FEAT-SRC-04] Autosuggest / Typeahead with Artwork
    - Description: Realtime dropdown showing top suggested songs and artists as you type.
    - Triggers: #searchInput input event, /api/suggest.
    - Verification: Dropdown shows thumbnails and titles; clicking an item opens or plays it immediately.

[ ] [FEAT-SRC-05] Top Result Spotlight Card
    - Description: Top-ranked official match spotlighted in a large preview card above regular track rows.
    - Triggers: renderTopResultCard() in search results.
    - Verification: Displays official album art, title, artist, year, and 1-tap play button.

[ ] [FEAT-SRC-06] Anti-Karaoke / Cover / Tribute Penalty Filter
    - Description: Heavily penalizes karaoke, instrumental, tribute, and cover tracks unless explicitly searched for.
    - Triggers: -500 score penalty in calcItemScore().
    - Verification: Original soundtrack versions always rank above generic karaoke/cover versions.

[ ] [FEAT-SRC-07] Language Filtering
    - Description: Filters search results by language (Tamil, Hindi, Telugu, Malayalam, English, Punjabi, etc.).
    - Triggers: Language buttons or query language detection.
    - Verification: Prioritizes target language catalog and deprioritizes unrelated regional results.

[ ] [FEAT-SRC-08] Era Filtering
    - Description: Filters by musical decade (80s, 90s, 2000s, old, latest).
    - Triggers: Era keywords in query or era filters.
    - Verification: Boosts songs released within the target year range.

--------------------------------------------------------------------------------
SECTION 5: VIBE MATCH & TRACK RADIO (FEAT-RAD)
--------------------------------------------------------------------------------
[ ] [FEAT-RAD-01] Dynamic Vibe Queue Auto-Seeding
    - Description: Infinite radio queue automatically enqueuing acoustically matched tracks when current queue nears end.
    - Triggers: /api/radio, seedVibeQueue().
    - Verification: Music never stops; enqueued songs match tempo, genre, and era of seed track.

[ ] [FEAT-RAD-02] Sliding Side Queue Panel
    - Description: Slide-out drawer displaying Now Playing song, Up Next list, and controls.
    - Triggers: #sideQueueBtn / queue icon click.
    - Verification: Displays song thumbnails; drag-to-reorder; swipe/click to remove from queue.

--------------------------------------------------------------------------------
SECTION 6: SYNCHRONIZED LYRICS (FEAT-LYR)
--------------------------------------------------------------------------------
[ ] [FEAT-LYR-01] Time-Synced (.lrc) Lyrics
    - Description: Real-time karaoke-style lyrics scrolling and highlighting active line in sync with playback.
    - Triggers: #openLyricsBtn, /api/lyrics.
    - Verification: Active lyric line is highlighted in bold; auto-scroll keeps current line centered.

[ ] [FEAT-LYR-02] Plain Lyrics Fallback
    - Description: If synced timestamps are unavailable, displays complete text lyrics cleanly formatted.
    - Triggers: Lyrics fetch fallback.
    - Verification: Full lyrics readable without broken UI or missing content.

--------------------------------------------------------------------------------
SECTION 7: OFFLINE ENGINE & PWA (FEAT-OFF)
--------------------------------------------------------------------------------
[ ] [FEAT-OFF-01] 1-Tap Song Download into IndexedDB
    - Description: Downloads lossless audio stream and artwork directly into browser IndexedDB storage.
    - Triggers: [data-action="download"] on track row or player bar.
    - Verification: Progress indicator shows download percentage; icon changes to downloaded checkmark.

[ ] [FEAT-OFF-02] Offline Mode Global Switch
    - Description: Global toggle switching app into offline-only mode.
    - Triggers: #offlineModeToggle switch.
    - Verification: App switches to Offline view showing only stored tracks; network requests bypassed.

[ ] [FEAT-OFF-03] Pure Offline Audio Playback
    - Description: Plays saved tracks directly from IndexedDB using Blob URLs without internet access.
    - Triggers: Playing track while offline.
    - Verification: Audio plays with full player controls, scrubber, and equalizer active.

[ ] [FEAT-OFF-04] Service Worker PWA Caching
    - Description: Progressive Web App capability allowing installation on iOS, Android, and Desktop.
    - Triggers: sw.js registration with cache version v8.15.0.
    - Verification: App loads instantly; works offline; passes PWA installability criteria.

--------------------------------------------------------------------------------
SECTION 8: SHARING & DYNAMIC URL SYNCHRONIZATION (FEAT-SHR)
--------------------------------------------------------------------------------
[ ] [FEAT-SHR-01] Dynamic URL Synchronization (?song=id)
    - Description: URL query parameter updates with the playing track ID without reloading page.
    - Triggers: AudioPlayer.playTrack() URL sync.
    - Verification: Address bar reflects ?song=<id>; bookmarking or refreshing opens that exact song.

[ ] [FEAT-SHR-02] 1-Tap Song Share
    - Description: Share button opens native OS share sheet or copies link to clipboard with confirmation toast.
    - Triggers: #playerShareBtn or track row share button.
    - Verification: Generates clean share link (https://listenfree.in/?song=...); toast feedback shown.

[ ] [FEAT-SHR-03] Direct Deep-Link Song Playback
    - Description: Opening a shared link automatically buffers and starts playback of that specific track.
    - Triggers: Loading URL with ?song=<id> or ?track=<id>.
    - Verification: Directly loads metadata and starts playback on page mount.

--------------------------------------------------------------------------------
SECTION 9: MULTI-PROFILE SYSTEM (FEAT-PRF)
--------------------------------------------------------------------------------
[ ] [FEAT-PRF-01] Profile Switcher Modal
    - Description: Switch between multiple user profiles (Personal, Workout, Chill, Party).
    - Triggers: Profile avatar button in header.
    - Verification: Profile selector displays active profile and switch options.

[ ] [FEAT-PRF-02] Profile-Scoped Storage Isolation
    - Description: Playlists, Liked Songs, and Play History are strictly scoped per profile.
    - Triggers: ProfileManager.getStorageKey().
    - Verification: Switching profile swaps Liked Songs and custom playlists without data bleed.

--------------------------------------------------------------------------------
SECTION 10: USER-FACING VIEWS & NAVIGATION (FEAT-NAV)
--------------------------------------------------------------------------------
[ ] [FEAT-NAV-01] Home View (renderHomeView)
    - Description: Main dashboard with Trending Charts, Quick Picks, Recently Played, and Top Playlists.
    - Triggers: Sidebar "Home" click or renderView("home").
    - Verification: Loads all chart categories; quick pick tiles play songs with 1 tap.

[ ] [FEAT-NAV-02] Browse View (renderBrowseView)
    - Description: Category grid for Genres, Moods, Eras, and Regional Languages.
    - Triggers: Sidebar "Browse" click or renderView("browse").
    - Verification: Category cards open filtered tracklists or playlists.

[ ] [FEAT-NAV-03] Artists Directory & Artist Detail Discography
    - Description: Browse artists grid; artist detail page with Top Tracks, Albums, and Related Artists.
    - Triggers: Sidebar "Artists" or clicking any artist name on a track row.
    - Verification: Opens artist discography; top tracks are playable; albums list tracks.

[ ] [FEAT-NAV-04] Hits View (Daily, Weekly, Monthly Charts)
    - Description: Timeframe-filtered hit tracks with Daily, Weekly, and Monthly tabs.
    - Triggers: Sidebar "Top Hits" / timeframe tabs.
    - Verification: Switches between daily, weekly, and monthly chart rankings with accurate ranks.

[ ] [FEAT-NAV-05] Discover Weekly & Daily Mixes
    - Description: Personalized algorithmic discovery recommendations.
    - Triggers: Sidebar "Discover" or renderView("discover").
    - Verification: Generates fresh mix of tracks based on listening history and vibe preferences.

[ ] [FEAT-NAV-06] Library View (renderLibraryView)
    - Description: Central library showing Liked Songs, Custom Playlists, and Imported Playlists.
    - Triggers: Sidebar "Your Library" or renderView("library").
    - Verification: Displays all user playlists with track counts and artwork; clicking opens tracklist.

[ ] [FEAT-NAV-07] Podcasts View & Episode Playback
    - Description: Curated podcast directory, episode listings, and continuous podcast playback.
    - Triggers: Sidebar "Podcasts" or renderView("podcasts").
    - Verification: Podcast episodes stream with ad-tracker URL bypass and dedicated scrubber.

================================================================================
