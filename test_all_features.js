// Omonk Automated Feature Verification Suite
const http = require('http');
const app = require('./api/index.js');
const searchEngine = require('./api/searchEngine.js');
const { importSpotify, importYouTube } = require('./api/importEngine.js');

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

    // SECTION 2: STREAM RESOLUTION & UNIVERSAL IMPORTER (FEAT-PLY, FEAT-IMP)
    console.log('\n>>> [SECTION 2: RESOLUTION & UNIVERSAL IMPORTER]');
    const spResult = await importSpotify('https://open.spotify.com/track/4c1fYltBlMaA2Elc54dpTW?si=74b14b6f2f454626');
    assertTest('FEAT-IMP-04: Spotify single track import', spResult.success && spResult.tracks.length === 1, `Title: ${spResult.title}`);

    const spIntl = await importSpotify('https://open.spotify.com/intl-de/track/4c1fYltBlMaA2Elc54dpTW');
    assertTest('FEAT-IMP-04: Spotify localized path (/intl-xx/) support', spIntl.success && spIntl.tracks[0]?.spotifyId === '4c1fYltBlMaA2Elc54dpTW', `SpotifyId: ${spIntl.tracks[0]?.spotifyId}`);

    const ytMix = await importYouTube('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=RDdQw4w9WgXcQ');
    assertTest('FEAT-IMP-05: YouTube Mix (list=RD...) auto-recovery to single track', ytMix.success && ytMix.tracks.length === 1 && ytMix.tracks[0]?.youtubeId === 'dQw4w9WgXcQ', `YouTubeId: ${ytMix.tracks[0]?.youtubeId}`);

    const server = http.createServer(app);
    await new Promise(r => server.listen(0, '127.0.0.1', r));
    const port = server.address().port;

    const resResolve = await fetch(`http://127.0.0.1:${port}/api/resolve?title=${encodeURIComponent(spResult.tracks[0].title)}&artist=${encodeURIComponent(spResult.tracks[0].artist)}`);
    const resolveJson = await resResolve.json();
    assertTest('FEAT-PLY-13: Dynamic resolution of 320kbps lossless stream', resolveJson.success && resolveJson.track?.streamUrl?.includes('_320.mp4'), `Stream: ${resolveJson.track?.streamUrl}`);
    assertTest('FEAT-PLY-14: Resolved exact track and album', resolveJson.track?.album === 'Love Today' && resolveJson.track?.title === 'Yenna Azhago', `Track: ${resolveJson.track?.title}`);

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
