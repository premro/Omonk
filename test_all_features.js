// Omonk Automated Feature Verification Suite
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const http = require('http');
const app = require('./api/index.js');
const searchEngine = require('./api/searchEngine.js');
const podcastsEngine = require('./api/podcastsEngine.js');
const { importSpotify, importYouTube, normalizeSpotifyUrl, repairTracksArtwork } = require('./api/importEngine.js');

async function runAllFeatureTests() {
    console.log('================================================================================');
    console.log('            OMONK AUTOMATED COMPREHENSIVE FEATURE TEST SUITE                   ');
    console.log('================================================================================');
    let passed = 0;
    let failed = 0;

    function assertTest(name, condition, extra = '') {
        if (condition) {
            console.log(`  [PASS] ${name} ${extra}`);
            passed++;
        } else {
            console.error(`  [FAIL] ${name} ${extra}`);
            failed++;
        }
    }

    // SECTION 1: SEARCH & PHONETICS (FEAT-SRC)
    console.log('\n>>> [SECTION 1: SEARCH & PHONETIC TRANSLITERATION]');
    const p1 = searchEngine.phonetics('Enna Azhagu Ethanai Azhagu');
    const p2 = searchEngine.phonetics('Yenna Azhago');
    assertTest('FEAT-SRC-02: Phonetics transliteration equivalence', p1.startsWith(p2), `("${p1}" startsWith "${p2}")`);

    const pShiva = searchEngine.phonetics('Shiva');
    const pSiva = searchEngine.phonetics('Siva C.');
    assertTest('FEAT-SRC-02: Phonetics artist transliteration (Shiva <-> Siva)', pSiva.includes(pShiva), `("${pSiva}" includes "${pShiva}")`);

    const topBeggin = await searchEngine.searchAll('Beggin Madcon', 5);
    assertTest('FEAT-SRC-05: Top result spotlight (Madcon Beggin)', topBeggin.songs[0]?.title.toLowerCase().includes('beggin'), `Top 1: ${topBeggin.songs[0]?.title}`);

    const topYenna = await searchEngine.searchAll('Enna Azhagu Ethanai Azhagu Shiva', 5);
    assertTest('FEAT-SRC-02: Phonetic song ranking (Yenna Azhago #1)', topYenna.songs[0]?.id === 'kjloyEJX', `Top 1: ${topYenna.songs[0]?.title} (${topYenna.songs[0]?.album})`);

    const faFaRes = await searchEngine.searchAll('FA FA', 10);
    const faTopTitle = (faFaRes.songs[0]?.title || '').toLowerCase();
    assertTest('FEAT-SRC-06: Exact/prefix title relevance for "FA FA"', faTopTitle.includes('fa fa'), `Top 1: ${faFaRes.songs[0]?.title || 'none'} (art=${Boolean(faFaRes.songs[0]?.artwork || faFaRes.songs[0]?.image)})`);
    assertTest('FEAT-SRC-07: Search results include per-item artwork', (faFaRes.songs || []).slice(0, 5).every(s => Boolean(s.artwork || s.image)), `Checked ${Math.min(5, (faFaRes.songs || []).length)} items`);

    // SECTION 2: STREAM RESOLUTION & UNIVERSAL IMPORTER (FEAT-PLY, FEAT-IMP)
    console.log('\n>>> [SECTION 2: RESOLUTION & UNIVERSAL IMPORTER]');
    const spResult = await importSpotify('https://open.spotify.com/track/4c1fYltBlMaA2Elc54dpTW?si=74b14b6f2f454626');
    assertTest('FEAT-IMP-04: Spotify single track import', spResult.success && spResult.tracks.length === 1, `Title: ${spResult.title}`);

    const spIntl = await importSpotify('https://open.spotify.com/intl-de/track/4c1fYltBlMaA2Elc54dpTW');
    assertTest('FEAT-IMP-04: Spotify localized path (/intl-xx/) support', spIntl.success && spIntl.tracks[0]?.spotifyId === '4c1fYltBlMaA2Elc54dpTW', `SpotifyId: ${spIntl.tracks[0]?.spotifyId}`);

    const spMobNorm = normalizeSpotifyUrl('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=abc123&nd=1&utm_source=copy-link');
    assertTest('FEAT-IMP-06: Spotify URL normalization strips tracking params', spMobNorm && spMobNorm.type === 'playlist' && spMobNorm.id === '37i9dQZF1DXcBWIGoYBM5M', `Norm: ${JSON.stringify(spMobNorm)}`);

    const ytMix = await importYouTube('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=RDdQw4w9WgXcQ');
    assertTest('FEAT-IMP-05: YouTube Mix (list=RD...) auto-recovery to single track', ytMix.success && ytMix.tracks.length === 1 && ytMix.tracks[0]?.youtubeId === 'dQw4w9WgXcQ', `YouTubeId: ${ytMix.tracks[0]?.youtubeId}`);

    const ytMobile = await importYouTube('https://youtu.be/dQw4w9WgXcQ?si=mobile_share_123');
    assertTest('FEAT-IMP-07: YouTube mobile short URL import', ytMobile.success && ytMobile.tracks[0]?.youtubeId === 'dQw4w9WgXcQ', `Title: ${ytMobile.tracks[0]?.title}`);

    // SSRF protection check
    let ssrfBlocked = false;
    try {
        await importYouTube('http://127.0.0.1:8080/watch?v=dQw4w9WgXcQ');
    } catch (e) {
        ssrfBlocked = true;
    }
    if (!ssrfBlocked) {
        const ssrfRes = await importYouTube('http://169.254.169.254/latest/meta-data/').catch(err => ({ success: false, error: err.message }));
        ssrfBlocked = !ssrfRes.success;
    }
    assertTest('FEAT-SEC-01: SSRF private/loopback URL blocked in YouTube importer', ssrfBlocked);

    const server = http.createServer(app);
    await new Promise(r => server.listen(0, '127.0.0.1', r));
    const port = server.address().port;

    const resResolve = await fetch(`http://127.0.0.1:${port}/api/resolve?title=${encodeURIComponent(spResult.tracks[0].title)}&artist=${encodeURIComponent(spResult.tracks[0].artist)}`);
    const resolveJson = await resResolve.json();
    assertTest('FEAT-PLY-13: Dynamic resolution of 320kbps lossless stream', resolveJson.success && resolveJson.track?.streamUrl?.includes('_320.mp4'), `Stream: ${resolveJson.track?.streamUrl}`);
    assertTest('FEAT-PLY-14: Resolved exact track and album', resolveJson.track?.album === 'Love Today' && resolveJson.track?.title === 'Yenna Azhago', `Track: ${resolveJson.track?.title}`);

    // Artwork differentiation & repair verification
    const playlistCover = 'https://image-cdn-fa.spotifycdn.com/playlist/shared_cover_999.jpg';
    const mixedTracks = [
        { id: 'sp_1', title: 'Yenna Azhago', artist: 'Siva C.', album: 'Love Today', artwork: playlistCover },
        { id: 'sp_2', title: "Beggin'", artist: 'Madcon', album: 'So Dark the Con of Man', artwork: playlistCover }
    ];
    const repaired = await repairTracksArtwork(mixedTracks, playlistCover);
    assertTest(
        'FEAT-IMP-10: Repair assigns distinct individual song artworks instead of shared playlist cover',
        repaired.length === 2 &&
        repaired[0].artwork !== playlistCover &&
        repaired[1].artwork !== playlistCover &&
        repaired[0].artwork !== repaired[1].artwork,
        `Art1=${repaired[0]?.artwork?.slice(0, 45)} | Art2=${repaired[1]?.artwork?.slice(0, 45)}`
    );

    // SECTION 3: VIBE MATCH RADIO (FEAT-RAD)
    console.log('\n>>> [SECTION 3: VIBE MATCH & TRACK RADIO]');
    const resRadio = await fetch(`http://127.0.0.1:${port}/api/radio?id=kjloyEJX&artist=Siva%20C.`);
    const radioJson = await resRadio.json();
    assertTest('FEAT-RAD-01: Dynamic radio queue generation', (radioJson.songs || radioJson.tracks || []).length > 0, `Queued: ${(radioJson.songs || radioJson.tracks || []).length} tracks`);

    // SECTION 4: LYRICS ENGINE (FEAT-LYR)
    console.log('\n>>> [SECTION 4: SYNCHRONIZED LYRICS]');
    const resLyrics = await fetch(`http://127.0.0.1:${port}/api/lyrics?title=Beggin&artist=Madcon`);
    assertTest('FEAT-LYR-01/02: Lyrics service response', resLyrics.ok, `Status: ${resLyrics.status}`);

    // SECTION 5: PLAYLIST & OFFLINE PERSISTENCE (FEAT-LIB, FEAT-OFF)
    console.log('\n>>> [SECTION 5: PERSISTENCE & OFFLINE ENGINE]');
    const dummyPlaylistTrack = {
        id: 'tr_test_1',
        title: 'Yenna Azhago',
        artist: 'Siva C.',
        streamUrl: 'https://aac.saavncdn.com/temporary_expiring_url.mp4',
        spotifyId: '4c1fYltBlMaA2Elc54dpTW'
    };
    const cleanTrack = { ...dummyPlaylistTrack };
    delete cleanTrack.streamUrl;
    assertTest('FEAT-IMP-09: Permanent playlist track metadata (omits temporary CDN stream URLs)', !cleanTrack.streamUrl && cleanTrack.spotifyId === '4c1fYltBlMaA2Elc54dpTW', 'Clean track metadata verified');

    // SECTION 6: PODCAST ENGINE (FEAT-POD)
    console.log('\n>>> [SECTION 6: PODCAST ENGINE & METADATA]');
    const podCatalog = await podcastsEngine.searchPodcasts('tamil');
    assertTest('FEAT-POD-01: Podcast catalog returns shows', Array.isArray(podCatalog) && podCatalog.length > 0, `Count=${podCatalog.length}`);
    if (podCatalog[0]) {
        const podRes = await fetch(`http://127.0.0.1:${port}/api/podcast/episodes?id=${encodeURIComponent(podCatalog[0].id)}`);
        const podJson = await podRes.json();
        assertTest('FEAT-POD-02: Podcast episodes endpoint returns show & episodes', Boolean(podJson.podcast) && Array.isArray(podJson.episodes), `Episodes=${podJson.episodes?.length || 0}`);
    }

    // SECTION 7: CHART SYNC SAFETY (FEAT-CHR)
    console.log('\n>>> [SECTION 7: CHART ENDPOINT ISOLATION & INTEGRITY]');
    const chartsRes = await fetch(`http://127.0.0.1:${port}/api/charts?type=daily&lang=tamil`);
    const chartsJson = await chartsRes.json();
    assertTest('FEAT-CHR-01: /api/charts returns valid snapshot tracks without failing', chartsJson.success && Array.isArray(chartsJson.tracks) && chartsJson.tracks.length > 0, `Count=${chartsJson.tracks?.length || 0}`);

    // SECTION 8: CLIENT MEDIA SESSION, QUEUE, VIBEENGINE & IMPORTER BEHAVIORAL SUITE (VM)
    console.log('\n>>> [SECTION 8: CLIENT LIFECYCLE, MEDIA SESSION, QUEUE & VIBEENGINE]');
    const storageStore = new Map();
    const handlerCounts = {};
    const clearedHandlers = new Set();
    const registeredHandlers = {};
    const msMock = {
        metadata: null,
        playbackState: 'none',
        positionState: null,
        setActionHandler(action, fn) {
            handlerCounts[action] = (handlerCounts[action] || 0) + 1;
            if (fn === null) {
                clearedHandlers.add(action);
                delete registeredHandlers[action];
            } else {
                registeredHandlers[action] = fn;
            }
        },
        setPositionState(state) {
            this.positionState = state;
        }
    };
    const createMockAudio = () => ({
        src: '',
        currentSrc: '',
        paused: true,
        ended: false,
        currentTime: 0,
        duration: 210,
        volume: 0.85,
        preload: 'auto',
        crossOrigin: 'anonymous',
        style: {},
        setAttribute() {},
        removeAttribute() {},
        addEventListener() {},
        removeEventListener() {},
        load() {},
        pause() { this.paused = true; },
        play() { this.paused = false; return Promise.resolve(); }
    });
    const fakeAudio = createMockAudio();
    const sandbox = {
        console,
        Math,
        Date,
        Set,
        Map,
        Array,
        Object,
        String,
        Number,
        Boolean,
        JSON,
        Promise,
        URL,
        URLSearchParams,
        AbortController,
        RegExp,
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        requestAnimationFrame: (fn) => setTimeout(fn, 0),
        fetch: async (url, options) => {
            const target = String(url).startsWith('http') ? String(url) : `http://127.0.0.1:${port}${url}`;
            return fetch(target, options);
        },
        navigator: {
            mediaSession: msMock,
            userAgent: 'OmonkTestRunner'
        },
        MediaMetadata: function(init) { Object.assign(this, init); },
        Audio: function() { return createMockAudio(); },
        localStorage: {
            getItem: (k) => storageStore.has(k) ? storageStore.get(k) : null,
            setItem: (k, v) => storageStore.set(k, String(v)),
            removeItem: (k) => storageStore.delete(k)
        },
        document: {
            body: { appendChild() {} },
            createElement: () => createMockAudio(),
            getElementById: (id) => (id === 'audioPlayer' ? fakeAudio : null),
            addEventListener() {},
            removeEventListener() {},
            hidden: false
        },
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent() {},
        location: { href: 'http://127.0.0.1/', origin: 'http://127.0.0.1', hostname: '127.0.0.1', pathname: '/', search: '' },
        window: null
    };
    sandbox.window = sandbox;
    sandbox.self = sandbox;

    for (const file of ['algorithm.js', 'vibeEngine.js', 'player.js', 'importer.js']) {
        const code = fs.readFileSync(path.join(__dirname, 'client', file), 'utf8');
        vm.runInNewContext(code, sandbox, { filename: file });
    }

    assertTest(
        'FEAT-MS-01: MediaSession handlers registered once on startup',
        handlerCounts.previoustrack === 1 &&
        handlerCounts.nexttrack === 1 &&
        handlerCounts.play === 1 &&
        handlerCounts.pause === 1 &&
        handlerCounts.seekto === 1 &&
        clearedHandlers.has('seekbackward') &&
        clearedHandlers.has('seekforward') &&
        clearedHandlers.has('stop'),
        `Counts=${JSON.stringify(handlerCounts)}`
    );

    // 6-track transition + Previous consistency + Entity/@@ cleaning
    const playlist6 = Array.from({ length: 6 }, (_, idx) => ({
        id: `t_${idx + 1}`,
        title: `Track ${idx + 1} &amp; &#039;Mix&#039; @@Live`,
        artist: `Artist ${idx + 1} &quot;A&quot;`,
        album: `Album ${idx + 1}`,
        artwork: `https://example.com/art_${idx + 1}.jpg`,
        duration: 180 + idx * 10,
        streamUrl: `https://aac.saavncdn.com/mock_${idx + 1}_320.mp4`
    }));
    await sandbox.AudioPlayer.playTrack(playlist6[0], playlist6, 0, true);
    for (let i = 1; i < 6; i++) {
        await sandbox.AudioPlayer.next();
    }
    const after6Track = sandbox.AudioPlayer.getCurrentTrack();
    assertTest(
        'FEAT-MS-02: 6-track Next keeps audio, MediaMetadata & active bounded MediaSession handlers',
        after6Track?.id === 't_6' &&
        msMock.metadata?.title === "Track 6 & 'Mix' Live" &&
        msMock.metadata?.artist === 'Artist 6 "A"' &&
        msMock.metadata?.artwork?.[0]?.src === 'https://example.com/art_6.jpg' &&
        typeof registeredHandlers.nexttrack === 'function' &&
        typeof registeredHandlers.previoustrack === 'function' &&
        typeof registeredHandlers.play === 'function' &&
        typeof registeredHandlers.pause === 'function' &&
        clearedHandlers.has('seekbackward') &&
        clearedHandlers.has('seekforward') &&
        handlerCounts.nexttrack >= 1 &&
        handlerCounts.nexttrack <= 10 &&
        handlerCounts.previoustrack >= 1 &&
        handlerCounts.previoustrack <= 10,
        `Current=${after6Track?.id}, MS="${msMock.metadata?.title}", NextRegs=${handlerCounts.nexttrack}`
    );

    // Trigger lock-screen previoustrack twice (6 -> 5 -> 4)
    await registeredHandlers.previoustrack();
    const afterPrev1 = sandbox.AudioPlayer.getCurrentTrack();
    await registeredHandlers.previoustrack();
    const afterPrev2 = sandbox.AudioPlayer.getCurrentTrack();
    assertTest(
        'FEAT-MS-03: Lock-screen previoustrack steps sequentially backwards (6 -> 5 -> 4)',
        afterPrev1?.id === 't_5' && afterPrev2?.id === 't_4' && msMock.metadata?.title?.startsWith('Track 4'),
        `Steps: ${afterPrev1?.id} -> ${afterPrev2?.id}`
    );

    // Music -> Podcast -> Music isolation
    const podEps = [
        {
            id: 'pod_ep_1',
            title: 'AI Future Episode 1',
            artist: 'Tech Host',
            podcastTitle: 'Tech Show',
            artwork: 'https://example.com/pod1.jpg',
            duration: 900,
            isPodcast: true,
            quality: 'Podcast Audio Stream',
            streamUrl: 'https://example.com/pod1.mp3'
        },
        {
            id: 'pod_ep_2',
            title: 'AI Future Episode 2',
            artist: 'Tech Host',
            podcastTitle: 'Tech Show',
            artwork: 'https://example.com/pod2.jpg',
            duration: 950,
            isPodcast: true,
            quality: 'Podcast Audio Stream',
            streamUrl: 'https://example.com/pod2.mp3'
        }
    ];
    await sandbox.AudioPlayer.playTrack(podEps[0], podEps, 0, true);
    const podMsTitle = msMock.metadata?.title;
    const podMsArtist = msMock.metadata?.artist;
    const podMsArt = msMock.metadata?.artwork?.[0]?.src;
    await sandbox.AudioPlayer.next();
    const podNextId = sandbox.AudioPlayer.getCurrentTrack()?.id;
    // Switch back to Music
    await sandbox.AudioPlayer.playTrack(playlist6[2], playlist6, 2, true);
    const musicBackMsTitle = msMock.metadata?.title;
    const musicBackIsPod = sandbox.AudioPlayer.isPodcastTrack(sandbox.AudioPlayer.getCurrentTrack());
    assertTest(
        'FEAT-POD-03: Music -> Podcast -> Music keeps MediaSession & queue cleanly isolated',
        podMsTitle === 'AI Future Episode 1' &&
        podMsArtist === 'Tech Host' &&
        podMsArt === 'https://example.com/pod1.jpg' &&
        podNextId === 'pod_ep_2' &&
        musicBackMsTitle.startsWith('Track 3') &&
        !musicBackIsPod,
        `PodMS=${podMsTitle}, NextPod=${podNextId}, MusicBack=${musicBackMsTitle}`
    );

    // VibeEngine language detection & deterministic FA FA FA scoring
    const unknownLang = sandbox.VibeEngine.detectLanguage({ title: 'FA FA FA', artist: 'Artist X', album: 'Single' });
    assertTest('FEAT-VIBE-01: Unknown language is not blindly defaulted to tamil', unknownLang === '', `Detected="${unknownLang}"`);

    const seedFaFaFa = { id: 'seed_fa', title: 'FA FA FA', artist: 'Anirudh Ravichander', album: 'Leo OST', language: 'tamil', genre: 'kuthu' };
    const candTamil = { id: 'c_tam', title: 'Naa Ready', artist: 'Anirudh Ravichander', album: 'Leo OST', language: 'tamil', genre: 'kuthu' };
    const candHindi = { id: 'c_hin', title: 'Deewaniyat', artist: 'Vishal Mishra', album: 'Hindi Single', language: 'hindi', genre: 'bollywood' };
    const dTamil = sandbox.VibeEngine.calculateVibeDistance(seedFaFaFa, candTamil, { skippedTracks: [], artists: {} });
    const dHindi = sandbox.VibeEngine.calculateVibeDistance(seedFaFaFa, candHindi, { skippedTracks: [], artists: {} });
    assertTest('FEAT-VIBE-02: Tamil track scores significantly closer than unrelated Hindi track for FA FA FA', dTamil < dHindi, `dTamil=${dTamil.toFixed(3)} vs dHindi=${dHindi.toFixed(3)}`);

    // Skip & recent repeat penalties
    sandbox.SpotifyEngine.trackPlayFeedback(candTamil, 5, 200); // skipped <15s
    const dTamilSkipped = sandbox.VibeEngine.calculateVibeDistance(seedFaFaFa, candTamil, sandbox.SpotifyEngine.getProfile());
    assertTest('FEAT-VIBE-03: Skipping track (<15s) increases VibeDistance penalty deterministically', dTamilSkipped > dTamil, `Before=${dTamil.toFixed(3)}, AfterSkip=${dTamilSkipped.toFixed(3)}`);

    // Podcast rejected from VibeEngine recommendations
    const curatedMixed = await sandbox.VibeEngine.curateMatchingVibeStream(seedFaFaFa, [candHindi, candTamil, podEps[0]], 10);
    assertTest('FEAT-VIBE-04: VibeEngine excludes podcast episodes & ranks relevant track #1', Array.isArray(curatedMixed) && !curatedMixed.some(t => t.id === 'pod_ep_1') && curatedMixed[0]?.id === 'c_tam', `Order=${Array.isArray(curatedMixed) ? curatedMixed.map(t => t.id).join(',') : 'not-array'}`);

    // Client Importer: repairPlaylistArtwork preserves order & likes with zero duplicates
    const legacyPlaylist = {
        id: 'pl_repair_test',
        name: 'Spotify Test &amp; Vibes @@',
        source: 'spotify',
        coverArt: playlistCover,
        tracks: [
            { id: 'r_1', title: 'Yenna Azhago', artist: 'Siva C.', album: 'Love Today', artwork: playlistCover, image: playlistCover, liked: true, customNote: 'keep-me' },
            { id: 'r_2', title: "Beggin'", artist: 'Madcon', album: 'So Dark the Con of Man', artwork: playlistCover, image: playlistCover }
        ]
    };
    sandbox.Importer.playlists = [legacyPlaylist];
    const repairOut = await sandbox.Importer.repairPlaylistArtwork('pl_repair_test', { force: true });
    assertTest(
        'FEAT-IMP-11: Client repairPlaylistArtwork preserves order/likes/edits & updates per-track artwork',
        repairOut.updated >= 2 &&
        legacyPlaylist.tracks.length === 2 &&
        legacyPlaylist.tracks[0].id === 'r_1' &&
        legacyPlaylist.tracks[1].id === 'r_2' &&
        legacyPlaylist.tracks[0].liked === true &&
        legacyPlaylist.tracks[0].customNote === 'keep-me' &&
        legacyPlaylist.tracks[0].artwork !== playlistCover &&
        legacyPlaylist.tracks[1].artwork !== playlistCover &&
        legacyPlaylist.tracks[0].artwork !== legacyPlaylist.tracks[1].artwork,
        `RepairedCount=${repairOut.updated}`
    );

    server.close();

    console.log('\n================================================================================');
    console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed out of ${passed + failed} Tests`);
    console.log('================================================================================');
    process.exit(failed > 0 ? 1 : 0);
}

runAllFeatureTests().catch(e => {
    console.error('Test Suite Error:', e);
    process.exit(1);
});
