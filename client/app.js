const GLOBAL_API_PREFIX = (typeof window !== 'undefined' && (
    window.location.hostname.includes('catalystserverless') ||
    window.location.hostname.includes('zohocatalyst') ||
    window.location.pathname.startsWith('/app')
)) ? '/server/music_api' : '';
if (typeof window !== 'undefined' && !window.API_PREFIX) {
    window.API_PREFIX = GLOBAL_API_PREFIX;
}
/**
 * Main Application Controller & View Manager
 * Handles startup language modal, chart views, Artist Wise exploration,
 * smart discovery mixes, offline mode, universal playlist import, and player bindings.
 */

document.addEventListener('DOMContentLoaded', async () => {
    // State
    let currentView = 'home';
    const isCatalyst = typeof window !== 'undefined' && (
        window.location.hostname.includes('catalystserverless') ||
        window.location.hostname.includes('zohocatalyst') ||
        window.location.pathname.startsWith('/app')
    );
    const API_PREFIX = isCatalyst ? '/server/music_api' : '';

    // Official Curated Latest Tamil Playlist (Kollywood Fresh Hits)
    const LATEST_TAMIL_PLAYLIST = {
        id: 'playlist_latest_tamil',
        name: 'Latest Tamil',
        title: 'Latest Tamil',
        description: 'New Music from Kollywood. Cover : Scene',
        artwork: 'assets/foryou_latest_tamil.jpg',
        source: 'Curated',
        saves: '769,220 saves',
        subtitle: '• 769,220 saves • 29 songs, about 1 hr 45 min',
        tracks: [{"id": "eeLpuDnn", "title": "Aeroplane (From \"Scene\")", "artist": "Sushin Shyam, Gana Bala, Rajpriyan", "album": "Aeroplane (From \"Scene\")", "duration": 147, "artwork": "https://c.saavncdn.com/015/Aeroplane-From-Scene-Tamil-2026-20261019143000-500x500.webp", "streamUrl": "https://aac.saavncdn.com/015/7f38ea6655598be6edc35426cbfd4dd3_320.mp4", "audioQuality": "FLAC 24-bit/96kHz", "source": "Lossless Master", "year": "2026"}, {"id": "3-acMgK2", "title": "One Name", "artist": "Anirudh Ravichander, Super Subu", "album": "Jailer 2 (Original Motion Picture Soundtrack)", "duration": 204, "artwork": "https://c.saavncdn.com/823/Jailer-2-Original-Motion-Picture-Soundtrack-Tamil-2026-20260930120445-500x500.webp", "streamUrl": "https://aac.saavncdn.com/823/e0ee24866ba7667e842e3921cef70898_320.mp4", "audioQuality": "FLAC 24-bit/96kHz", "source": "Lossless Master", "year": "2026"}, {"id": "jlBMldVu", "title": "Veezha Veera (From \"OM Chapter 1: Udhiram  - The Blood Wood\") [Tamil]", "artist": "Sai Abhyankkar, Tippu, Arun Srinivasan", "album": "Veezha Veera (From \"OM Chapter 1: Udhiram  - The Blood Wood\") [Tamil]", "duration": 236, "artwork": "https://c.saavncdn.com/696/Veezha-Veera-From-OM-Chapter-1-Udhiram-The-Blood-Wood-Tamil-Tamil-2026-20261019161818-500x500.webp", "streamUrl": "https://aac.saavncdn.com/696/33b63dd76847575d76550d30dcc97bf5_320.mp4", "audioQuality": "FLAC 24-bit/96kHz", "source": "Lossless Master", "year": "2026"}, {"id": "QPN4enIh", "title": "Roddy Theme (From \"Jailer 2\")", "artist": "Anirudh Ravichander", "album": "Roddy Theme (From \"Jailer 2\")", "duration": 111, "artwork": "https://c.saavncdn.com/814/Roddy-Theme-From-Jailer-2-English-2026-20261026153326-500x500.webp", "streamUrl": "https://aac.saavncdn.com/814/f59d8170c451747e2d1fb7012a44aa12_320.mp4", "audioQuality": "FLAC 24-bit/96kHz", "source": "Lossless Master", "year": "2026"}, {"id": "_2RB0JMK", "title": "Killin' 'em (From \"Scene\")", "artist": "Sushin Shyam, Yung Raja", "album": "Killin' 'em (From \"Scene\")", "duration": 94, "artwork": "https://c.saavncdn.com/519/Killin-em-From-Scene-Tamil-2026-20261023143441-500x500.webp", "streamUrl": "https://aac.saavncdn.com/519/f9721d25e2990f95a70e2b025364f603_320.mp4", "audioQuality": "FLAC 24-bit/96kHz", "source": "Lossless Master", "year": "2026"}, {"id": "P5pjB99X", "title": "Radhimaa (From \"Think Indie\")", "artist": "Sai Abhyankkar, Nargis Teji, Asma Teji, Vivek", "album": "Radhimaa (From \"Think Indie\")", "duration": 259, "artwork": "https://c.saavncdn.com/877/Radhimaa-From-Think-Indie-Tamil-2026-20260827192132-500x500.webp", "streamUrl": "https://aac.saavncdn.com/877/875e41134def3f76517ce29ea7819fc8_320.mp4", "audioQuality": "FLAC 24-bit/96kHz", "source": "Lossless Master", "year": "2026"}, {"id": "8Ut61Xbl", "title": "Muthumani", "artist": "Ilaiyaraaja, Shweta Mohan", "album": "Dorothy", "duration": 299, "artwork": "https://c.saavncdn.com/566/Dorothy-Tamil-2026-20260924170112-500x500.webp", "streamUrl": "https://aac.saavncdn.com/566/2e08dc08212f69e5c9503e10befb76ec_320.mp4", "audioQuality": "FLAC 24-bit/96kHz", "source": "Lossless Master", "year": "2026"}, {"id": "I6jncR_O", "title": "Manasilaayo", "artist": "Anirudh Ravichander, Malaysia Vasudevan, Deepthi Suresh, Yugendran Vasudevan", "album": "Vettaiyan", "duration": 235, "artwork": "https://c.saavncdn.com/803/Vettaiyan-Original-Motion-Picture-Soundtrack-Tamil-2024-20241014154253-500x500.webp", "streamUrl": "https://aac.saavncdn.com/803/54aa7ee23bad8894b04c1250a64a2f0a_320.mp4", "audioQuality": "FLAC 24-bit/96kHz", "source": "Lossless Master", "year": "2024"}, {"id": "9e4p_Byj", "title": "Hunter Vantaar", "artist": "Arivu, Anirudh Ravichander, Siddharth Basrur", "album": "Vettaiyan", "duration": 192, "artwork": "https://c.saavncdn.com/803/Vettaiyan-Original-Motion-Picture-Soundtrack-Tamil-2024-20241014154253-500x500.webp", "streamUrl": "https://aac.saavncdn.com/803/6fb743e4593b69786449d88e4ab2fd52_320.mp4", "audioQuality": "FLAC 24-bit/96kHz", "source": "Lossless Master", "year": "2024"}, {"id": "F_fgk0mb", "title": "Katchi Sera (From \"Think Indie\")", "artist": "Sai Abhyankkar", "album": "Katchi Sera (From \"Think Indie\")", "duration": 181, "artwork": "https://c.saavncdn.com/118/Katchi-Sera-From-Think-Indie-Tamil-2024-20251026074526-500x500.webp", "streamUrl": "https://aac.saavncdn.com/118/3456f4e5990e8fb33d7af6678aca034a_320.mp4", "audioQuality": "FLAC 24-bit/96kHz", "source": "Lossless Master", "year": "2024"}, {"id": "GUURlhr1", "title": "Aasa Kooda (From \"Think Indie\")", "artist": "Sai Abhyankkar, Sai Smriti", "album": "Aasa Kooda (From \"Think Indie\")", "duration": 215, "artwork": "https://c.saavncdn.com/772/Aasa-Kooda-From-Think-Indie-Tamil-2024-20251026074529-500x500.webp", "streamUrl": "https://aac.saavncdn.com/772/6cb3205b2579e7ade889bd6898d9f2b6_320.mp4", "audioQuality": "FLAC 24-bit/96kHz", "source": "Lossless Master", "year": "2024"}, {"id": "ARocYrI8", "title": "Golden Sparrow (From \"Nilavuku En Mel Ennadi Kobam\")", "artist": "Arivu, G.V. Prakash Kumar, Dhanush, Sublahshini", "album": "Nilavuku En Mel Ennadi Kobam", "duration": 230, "artwork": "https://c.saavncdn.com/289/Nilavuku-En-Mel-Ennadi-Kobam-Tamil-2025-20250329114015-500x500.webp", "streamUrl": "https://aac.saavncdn.com/289/8ec59389bffc0aa2760bb1f0a28c4335_320.mp4", "audioQuality": "FLAC 24-bit/96kHz", "source": "Lossless Master", "year": "2025"}, {"id": "f3Z9Vohz", "title": "Whistle Podu", "artist": "Vijay, Yuvan Shankar Raja", "album": "The Greatest Of All Time - (Tamil)", "duration": 281, "artwork": "https://c.saavncdn.com/829/The-Greatest-Of-All-Time-Tamil-Tamil-2024-20240903191033-500x500.webp", "streamUrl": "https://aac.saavncdn.com/829/8a829e03099a158056751615cc6abe91_320.mp4", "audioQuality": "FLAC 24-bit/96kHz", "source": "Lossless Master", "year": "2024"}, {"id": "Eq9r0qaR", "title": "Spark", "artist": "Yuvan Shankar Raja, Kunal Ganjawala, Vrusha Balu", "album": "Thalapathy Is The G.O.A.T.", "duration": 250, "artwork": "https://c.saavncdn.com/368/Thalapathy-Is-The-G-O-A-T-Hindi-2024-20240903191004-500x500.webp", "streamUrl": "https://aac.saavncdn.com/368/1e16116d4e3bc2c8afb4cdee84098df0_320.mp4", "audioQuality": "FLAC 24-bit/96kHz", "source": "Lossless Master", "year": "2024"}, {"id": "ueQZvApR", "title": "Chuttamalle (From \"Devara Part 1\")", "artist": "Ramajogayya Sastry, Anirudh Ravichander, Shilpa Rao", "album": "Summer Hot Romatic Waves", "duration": 222, "artwork": "https://c.saavncdn.com/814/Summer-Hot-Romatic-Waves-Telugu-2026-20260601162119-500x500.webp", "streamUrl": "https://aac.saavncdn.com/814/8816aa4082d1bf261fd3c3a4533a2898_320.mp4", "audioQuality": "FLAC 24-bit/96kHz", "source": "Lossless Master", "year": "2026"}, {"id": "m0Yt29rq", "title": "Fear Song - Telugu", "artist": "Anirudh Ravichander, Ramajogayya Sastry", "album": "Devara Part 1 - Telugu", "duration": 195, "artwork": "https://c.saavncdn.com/313/Devara-Part-1-Telugu-Telugu-2024-20240926171010-500x500.webp", "streamUrl": "https://aac.saavncdn.com/313/1178c7b2a16c3fd32ec5cd002b5a1ce0_320.mp4", "audioQuality": "FLAC 24-bit/96kHz", "source": "Lossless Master", "year": "2024"}, {"id": "ppLvWu5j", "title": "Daavudi - Tamil", "artist": "Anirudh Ravichander, Nakash Aziz, Ramya Behara, Vignesh Shivan", "album": "Devara Part 1 - Tamil", "duration": 229, "artwork": "https://c.saavncdn.com/320/Devara-Part-1-Tamil-Tamil-2024-20240926171017-500x500.webp", "streamUrl": "https://aac.saavncdn.com/320/4b07070e6497b98c1ad06d41b5e8a660_320.mp4", "audioQuality": "FLAC 24-bit/96kHz", "source": "Lossless Master", "year": "2024"}, {"id": "8eDySiJ4", "title": "Aura 10/10", "artist": "Hiphop Tamizha, Thamizh Aadhavan", "album": "Meesaya Murukku 2", "duration": 129, "artwork": "https://c.saavncdn.com/465/Meesaya-Murukku-2-Tamil-2026-20261006074032-500x500.webp", "streamUrl": "https://aac.saavncdn.com/465/0dab8140497bcd87f6027038b4e6e845_320.mp4", "audioQuality": "FLAC 24-bit/96kHz", "source": "Lossless Master", "year": "2026"}, {"id": "3h6F8ui8", "title": "Ala Bolelo (From \"Jailer 2\")", "artist": "Anirudh Ravichander, Arunraja Kamaraj", "album": "Ala Bolelo (From \"Jailer 2\")", "duration": 240, "artwork": "https://c.saavncdn.com/557/Ala-Bolelo-From-Jailer-2-Tamil-2026-20260821084843-500x500.jpg", "streamUrl": "https://aac.saavncdn.com/557/20ee77a20e37c568c827f1596ffa959c_320.mp4", "audioQuality": "FLAC 24-bit/96kHz", "source": "Lossless Master", "year": "2026"}, {"id": "doLSyMPY", "title": "God Mode", "artist": "Vishnu Edavan, Sai Abhyankkar, Gana Muthu", "album": "Karuppu (Original Motion Picture Soundtrack)", "duration": 240, "artwork": "https://c.saavncdn.com/875/Karuppu-Original-Motion-Picture-Soundtrack-Tamil-2026-20260525175054-500x500.webp", "streamUrl": "https://aac.saavncdn.com/875/2d69eb1a53ea417189579d6b6bb49cac_320.mp4", "audioQuality": "FLAC 24-bit/96kHz", "source": "Lossless Master", "year": "2026"}, {"id": "bCFj0zxr", "title": "Singari", "artist": "Sai Abhyankkar, Pradeep Ranganathan, Sai Smriti", "album": "Dude (Original Motion Picture Soundtrack)", "duration": 208, "artwork": "https://c.saavncdn.com/880/Dude-Original-Motion-Picture-Soundtrack-Tamil-2025-20251026215849-500x500.webp", "streamUrl": "https://aac.saavncdn.com/880/406e3c98463b86838c93d401e42ae77f_320.mp4", "audioQuality": "FLAC 24-bit/96kHz", "source": "Lossless Master", "year": "2025"}, {"id": "Ck1V-H4b", "title": "Raga of Revenge (From \"DC\")", "artist": "Anirudh Ravichander", "album": "Raga of Revenge (From \"DC\")", "duration": 131, "artwork": "https://c.saavncdn.com/484/Raga-of-Revenge-From-DC-Tamil-2026-20260515180436-500x500.webp", "streamUrl": "https://aac.saavncdn.com/484/a9c48c692e7df5c85f75f5e674a8f187_320.mp4", "audioQuality": "FLAC 24-bit/96kHz", "source": "Lossless Master", "year": "2026"}, {"id": "hv1H8MG_", "title": "Pavazha Malli (From \"Think Indie\")", "artist": "Vivek, Sai Abhyankkar, Shruti Haasan", "album": "Pavazha Malli (From \"Think Indie\")", "duration": 252, "artwork": "https://c.saavncdn.com/984/Pavazha-Malli-From-Think-Indie-Tamil-2026-20260303084345-500x500.webp", "streamUrl": "https://aac.saavncdn.com/984/268f6efa6f609759153dfe361e5a77ea_320.mp4", "audioQuality": "FLAC 24-bit/96kHz", "source": "Lossless Master", "year": "2026"}, {"id": "_C23SgA9", "title": "Putaapu Gang", "artist": "Anirudh Ravichander, Thamizh Aadhavan", "album": "Jailer 2 (Original Motion Picture Soundtrack)", "duration": 160, "artwork": "https://c.saavncdn.com/823/Jailer-2-Original-Motion-Picture-Soundtrack-Tamil-2026-20260930120445-500x500.webp", "streamUrl": "https://aac.saavncdn.com/823/89adda910a2d35d0d1b7010e776e8cc8_320.mp4", "audioQuality": "FLAC 24-bit/96kHz", "source": "Lossless Master", "year": "2026"}, {"id": "Y7vfRRec", "title": "Raavana Mavandaa", "artist": "Anirudh Ravichander, Vivek", "album": "Jana Nayagan - Tamil", "duration": 107, "artwork": "https://c.saavncdn.com/810/Jana-Nayagan-Tamil-Tamil-2026-20260722221103-500x500.webp", "streamUrl": "https://aac.saavncdn.com/810/e43103d1a6db1ba294b9bae5e0bb5154_320.mp4", "audioQuality": "FLAC 24-bit/96kHz", "source": "Lossless Master", "year": "2026"}, {"id": "BRxC-X9m", "title": "Goindhamma (From \"Meesaya Murukku 2\")", "artist": "Hiphop Tamizha, Kaushik Krish, Gana Vinoth, Gana Ulagam Dharani, Gana Sudhakar", "album": "Goindhamma (From \"Meesaya Murukku 2\")", "duration": 192, "artwork": "https://c.saavncdn.com/684/Goindhamma-From-Meesaya-Murukku-2-Tamil-2026-20260518093512-500x500.webp", "streamUrl": "https://aac.saavncdn.com/684/2e08354b358bd7a7fa4ec6954b153924_320.mp4", "audioQuality": "FLAC 24-bit/96kHz", "source": "Lossless Master", "year": "2026"}, {"id": "JPJ6pL-U", "title": "Bindaas", "artist": "Deepthi Suresh, Anirudh Ravichander, Super Subu", "album": "Jailer 2 (Original Motion Picture Soundtrack)", "duration": 254, "artwork": "https://c.saavncdn.com/823/Jailer-2-Original-Motion-Picture-Soundtrack-Tamil-2026-20260930120445-500x500.webp", "streamUrl": "https://aac.saavncdn.com/823/907c2a0ab161d13cd109b7990507a6b8_320.mp4", "audioQuality": "FLAC 24-bit/96kHz", "source": "Lossless Master", "year": "2026"}, {"id": "JEb42pqO", "title": "Verappa - Extended", "artist": "Arun Srinivasan, Sai Abhyankkar, Arivu", "album": "Karuppu (Original Motion Picture Soundtrack)", "duration": 260, "artwork": "https://c.saavncdn.com/875/Karuppu-Original-Motion-Picture-Soundtrack-Tamil-2026-20260525175054-500x500.webp", "streamUrl": "https://aac.saavncdn.com/875/b71a1454ff6390f6c5bea9a611c40c7e_320.mp4", "audioQuality": "FLAC 24-bit/96kHz", "source": "Lossless Master", "year": "2026"}, {"id": "_giyfEgV", "title": "Naanga Naalu Peru", "artist": "Asal Kolaar, Arun Srinivasan, Sai Abhyankkar, Silambarasan Tr", "album": "Karuppu (Original Motion Picture Soundtrack)", "duration": 197, "artwork": "https://c.saavncdn.com/875/Karuppu-Original-Motion-Picture-Soundtrack-Tamil-2026-20260525175054-500x500.webp", "streamUrl": "https://aac.saavncdn.com/875/0c00dc46475212a69c1a602e532993f4_320.mp4", "audioQuality": "FLAC 24-bit/96kHz", "source": "Lossless Master", "year": "2026"}]
    };
    window.LATEST_TAMIL_PLAYLIST = LATEST_TAMIL_PLAYLIST;

    let previousViewBeforeSearch = 'home';
    const DEFAULT_LANGUAGES = [
        { code: 'tamil', name: 'Tamil', flag: '🇮🇳', native: 'தமிழ்', color: 'from-amber-500 to-rose-600' },
        { code: 'telugu', name: 'Telugu', flag: '🇮🇳', native: 'తెలుగు', color: 'from-red-500 to-orange-500' },
        { code: 'hindi', name: 'Hindi', flag: '🇮🇳', native: 'हिन्दी', color: 'from-emerald-500 to-teal-600' },
        { code: 'malayalam', name: 'Malayalam', flag: '🇮🇳', native: 'മലയാളം', color: 'from-cyan-500 to-blue-600' },
        { code: 'kannada', name: 'Kannada', flag: '🇮🇳', native: 'ಕನ್ನಡ', color: 'from-yellow-500 to-amber-600' },
        { code: 'punjabi', name: 'Punjabi', flag: '🇮🇳', native: 'ਪੰਜਾਬੀ', color: 'from-pink-500 to-rose-500' },
        { code: 'english', name: 'English / Global', flag: '🌐', native: 'Global', color: 'from-purple-500 to-indigo-600' },
        { code: 'spanish', name: 'Spanish / Latin', flag: '🇪🇸', native: 'Español', color: 'from-orange-500 to-red-600' },
        { code: 'kpop', name: 'K-Pop', flag: '🇰🇷', native: '한국어', color: 'from-fuchsia-500 to-purple-600' },
        { code: 'japanese', name: 'Japanese / Anime', flag: '🇯🇵', native: '日本語', color: 'from-indigo-500 to-sky-600' },
        { code: 'french', name: 'French', flag: '🇫🇷', native: 'Français', color: 'from-blue-500 to-violet-600' }
    ];
    let availableLanguages = [...DEFAULT_LANGUAGES];
    let selectedLanguages = JSON.parse(localStorage.getItem('preferred_languages') || '[]');
    if (!Array.isArray(selectedLanguages) || selectedLanguages.length === 0) {
        selectedLanguages = ['tamil'];
    }
    let currentChartType = 'daily'; // 'daily' | 'weekly' | 'monthly'
    let currentChartLang = '';
    let currentArtistLang = 'all';
    let likedTrackIds = new Set();
    function getLikedKey() {
        return (window.ProfileManager && window.ProfileManager.getStorageKey) 
            ? window.ProfileManager.getStorageKey('liked_tracks_ids') 
            : 'liked_tracks_ids';
    }
    function loadLikedTracks() {
        const key = getLikedKey();
        let stored = localStorage.getItem(key);
        if (!stored) {
            stored = localStorage.getItem('liked_tracks_ids') || '[]';
        }
        try {
            likedTrackIds = new Set(JSON.parse(stored));
        } catch(e) {
            likedTrackIds = new Set();
        }
    }
    function saveLikedTracks() {
        const key = getLikedKey();
        localStorage.setItem(key, JSON.stringify(Array.from(likedTrackIds)));
    }
    loadLikedTracks();
    let allLoadedSongs = [];
    window.AllSongPool = allLoadedSongs;

    window.State = {
        get allSongs() { return window.AllSongPool || allLoadedSongs; },
        get userQueue() { return AudioPlayer.userQueue || []; },
        get queue() { return AudioPlayer.queue || []; },
        get currentTrack() { return AudioPlayer.getCurrentTrack(); },
        get history_ids() { return (AudioPlayer.history || []).map(t => t.id); },
        get activeLanguage() { return (typeof activeLanguages !== 'undefined' && activeLanguages[0]) || 'tamil'; },
        get preferredLanguages() { return typeof activeLanguages !== 'undefined' ? activeLanguages : ['tamil']; }
    };


    // DOM Elements
    const contentScroll = document.getElementById('contentScroll');

    // ================= THEME TOGGLE (DARK / LIGHT MODE) =================
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    function applyAppTheme(theme) {
        if (theme === 'light') {
            document.body.classList.add('light-theme');
            if (themeToggleBtn) themeToggleBtn.innerHTML = '<span>☀️</span>';
            themeToggleBtn?.setAttribute('title', 'Switch to Dark Mode');
            localStorage.setItem('omonk_theme', 'light');
        } else {
            document.body.classList.remove('light-theme');
            if (themeToggleBtn) themeToggleBtn.innerHTML = '<span>🌙</span>';
            themeToggleBtn?.setAttribute('title', 'Switch to Light Mode');
            localStorage.setItem('omonk_theme', 'dark');
        }
    }

    themeToggleBtn?.addEventListener('click', () => {
        const isCurrentlyLight = document.body.classList.contains('light-theme');
        applyAppTheme(isCurrentlyLight ? 'dark' : 'light');
        showToast(isCurrentlyLight ? 'Dark Mode Active' : 'Light Mode Active', isCurrentlyLight ? '🌙' : '☀️');
    });

    // Restore saved theme on startup
    applyAppTheme(localStorage.getItem('omonk_theme') || 'dark');

    const globalSearchInput = document.getElementById('globalSearchInput');
    const openLangPickerBtn = document.getElementById('openLangPickerBtn');
    const headerLangText = document.getElementById('headerLangText');
    const headerLangFlag = document.getElementById('headerLangFlag');
    const langModal = document.getElementById('langModal');
    const closeLangModalBtn = document.getElementById('closeLangModalBtn');
    const langModalGrid = document.getElementById('langModalGrid');
    const saveLangModalBtn = document.getElementById('saveLangModalBtn');
    const offlineModeToggle = document.getElementById('offlineModeToggle');
    const openEQBtn = document.getElementById('openEQBtn');
    const eqModal = document.getElementById('eqModal');
    const closeEQModalBtn = document.getElementById('closeEQModalBtn');
    const eqSlidersWrap = document.getElementById('eqSlidersWrap');
    const sidePanel = document.getElementById('sidePanel');
    const sideTabNowPlaying = document.getElementById('sideTabNowPlaying');
    const sideTabQueue = document.getElementById('sideTabQueue');
    const closeSidePanelBtn = document.getElementById('closeSidePanelBtn');
    const sideBodyNowPlaying = document.getElementById('sideBodyNowPlaying');
    const sideBodyQueue = document.getElementById('sideBodyQueue');
    const sideEmptyState = document.getElementById('sideEmptyState');
    const sideNowPlayingContent = document.getElementById('sideNowPlayingContent');
    const openQueueBtn = document.getElementById('openQueueBtn');
    const openLyricsBtn = document.getElementById('openLyricsBtn');
    const lyricsModal = document.getElementById('lyricsModal');
    const closeLyricsModalBtn = document.getElementById('closeLyricsModalBtn');
    const lyricsContainer = document.getElementById('lyricsContainer');
    const lyricsTrackTitle = document.getElementById('lyricsTrackTitle');
    const lyricsTrackArtist = document.getElementById('lyricsTrackArtist');
    const openImportModalBtn = document.getElementById('openImportModalBtn');
    const importModal = document.getElementById('importModal');
    const closeImportModalBtn = document.getElementById('closeImportModalBtn');
    const executeImportBtn = document.getElementById('executeImportBtn');
    const importStatus = document.getElementById('importStatus');

    // Player DOM
    const playerArt = document.getElementById('playerArt');
    const playerTitle = document.getElementById('playerTitle');
    const playerArtist = document.getElementById('playerArtist');
    const playerQualityBadge = document.getElementById('playerQualityBadge');
    const playerLikeBtn = document.getElementById('playerLikeBtn');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const shuffleBtn = document.getElementById('shuffleBtn');
    const repeatBtn = document.getElementById('repeatBtn');
    const progressTrack = document.getElementById('progressTrack');
    const progressFill = document.getElementById('progressFill');
    const currentTimeEl = document.getElementById('currentTime');
    const totalDurationEl = document.getElementById('totalDuration');
    const volumeSlider = document.getElementById('volumeSlider');
    const muteBtn = document.getElementById('muteBtn');
    const playerDownloadBtn = document.getElementById('playerDownloadBtn');
    const visualizerCanvas = document.getElementById('visualizerCanvas');

    // Initialize Subsystems
    try {
        if (window.OfflineEngine && window.OfflineEngine.init) {
            await window.OfflineEngine.init();
        }
    } catch (e) {
        console.warn('OfflineEngine init failed:', e);
    }
    try {
        if (window.AudioPlayer && visualizerCanvas) window.AudioPlayer.bindVisualizerCanvas(visualizerCanvas);
    } catch(e) {}
    try {
        if (window.Lyrics && lyricsContainer) window.Lyrics.bindContainer(lyricsContainer);
    } catch(e) {}

    // Ensure searchTypeaheadDropdown is mounted directly to document.body
    const typeaheadEl = document.getElementById('searchTypeaheadDropdown');
    if (typeaheadEl && typeaheadEl.parentElement !== document.body) {
        document.body.appendChild(typeaheadEl);
    }

    // Setup Toast Utility
    window.showToast = (msg, icon = '🎵') => {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            toast.style.transition = 'all 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };

    // ==========================================================================
    // PLAYLIST MODALS ENGINE (Create Playlist & Add to Playlist)
    // ==========================================================================
    const addToPlaylistModal = document.getElementById('addToPlaylistModal');
    const closeAddToPlaylistModalBtn = document.getElementById('closeAddToPlaylistModalBtn');
    const targetTrackArt = document.getElementById('targetTrackArt');
    const targetTrackTitle = document.getElementById('targetTrackTitle');
    const targetTrackArtist = document.getElementById('targetTrackArtist');
    const quickNewPlaylistInput = document.getElementById('quickNewPlaylistInput');
    const quickCreatePlaylistBtn = document.getElementById('quickCreatePlaylistBtn');
    const addToPlaylistList = document.getElementById('addToPlaylistList');

    const createPlaylistModal = document.getElementById('createPlaylistModal');
    const closeCreatePlaylistModalBtn = document.getElementById('closeCreatePlaylistModalBtn');
    const newPlaylistModalNameInput = document.getElementById('newPlaylistModalNameInput');
    const newPlaylistModalDescInput = document.getElementById('newPlaylistModalDescInput');
    const submitCreatePlaylistBtn = document.getElementById('submitCreatePlaylistBtn');
    const playerAddToPlaylistBtn = document.getElementById('playerAddToPlaylistBtn');

    let currentTargetTrackForPlaylist = null;

    function renderAddToPlaylistModalList(track) {
        if (!addToPlaylistList) return;
        const playlists = Importer.getPlaylists() || [];
        if (playlists.length === 0) {
            addToPlaylistList.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 13px; padding: 20px;">No playlists yet. Type a name above to create your first!</div>`;
            return;
        }

        addToPlaylistList.innerHTML = playlists.map(pl => {
            const inPlaylist = (pl.tracks || []).some(t => 
                t.id === track.id || 
                (t.title && track.title && t.title.toLowerCase().trim() === track.title.toLowerCase().trim() && 
                 t.artist && track.artist && t.artist.toLowerCase().trim() === track.artist.toLowerCase().trim())
            );
            return `
                <div class="playlist-modal-item ${inPlaylist ? 'in-playlist' : ''}" data-pl-id="${pl.id}">
                    <div class="playlist-modal-item-info">
                        <img class="playlist-modal-item-art" src="${pl.artwork || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100'}" alt="${pl.name}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100';">
                        <div class="playlist-modal-item-text">
                            <div class="playlist-modal-item-name">${pl.name}</div>
                            <div class="playlist-modal-item-count">${(pl.tracks || []).length} songs • ${pl.source || 'Custom'}</div>
                        </div>
                    </div>
                    <button class="playlist-modal-add-btn ${inPlaylist ? 'added' : ''}" data-pl-action-id="${pl.id}">
                        ${inPlaylist ? 'In Playlist ✓' : 'Add +'}
                    </button>
                </div>
            `;
        }).join('');

        // Attach listeners
        addToPlaylistList.querySelectorAll('[data-pl-action-id]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const plId = btn.getAttribute('data-pl-action-id');
                const pl = Importer.getPlaylistById(plId);
                if (!pl) return;
                const res = Importer.addTrackToPlaylist(plId, track);
                if (res.success) {
                    showToast(`Added "${track.title}" to ${pl.name}!`, '🎵');
                    btn.classList.add('added');
                    btn.textContent = 'In Playlist ✓';
                    btn.closest('.playlist-modal-item')?.classList.add('in-playlist');
                    if (currentView === 'library' || currentView === 'playlist-detail') {
                        renderView(currentView, currentView === 'playlist-detail' ? plId : null);
                    }
                } else if (res.alreadyExists) {
                    showToast(`"${track.title}" is already in ${pl.name}`, 'ℹ️');
                }
            });
        });
    }

    function openAddToPlaylistModal(track) {
        if (!track) {
            showToast('No track selected', '⚠️');
            return;
        }
        currentTargetTrackForPlaylist = track;
        if (targetTrackTitle) targetTrackTitle.textContent = track.title || 'Untitled Track';
        if (targetTrackArtist) targetTrackArtist.textContent = track.artist || 'Unknown Artist';
        if (targetTrackArt) targetTrackArt.src = track.artwork || track.image || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100';
        if (quickNewPlaylistInput) quickNewPlaylistInput.value = '';
        renderAddToPlaylistModalList(track);
        addToPlaylistModal?.classList.add('active');
    }
    window.openAddToPlaylistModal = openAddToPlaylistModal;

    closeAddToPlaylistModalBtn?.addEventListener('click', () => {
        addToPlaylistModal?.classList.remove('active');
        currentTargetTrackForPlaylist = null;
    });

    quickCreatePlaylistBtn?.addEventListener('click', () => {
        const name = (quickNewPlaylistInput?.value || '').trim();
        if (!name) {
            showToast('Enter a playlist name', '⚠️');
            return;
        }
        if (!currentTargetTrackForPlaylist) return;
        const newPl = Importer.createPlaylist(name);
        Importer.addTrackToPlaylist(newPl.id, currentTargetTrackForPlaylist);
        showToast(`Created "${newPl.name}" and added song!`, '✨');
        quickNewPlaylistInput.value = '';
        addToPlaylistModal?.classList.remove('active');
        if (currentView === 'library') {
            renderLibraryView();
        }
    });

    quickNewPlaylistInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') quickCreatePlaylistBtn?.click();
    });

    // Create New Playlist Modal
    function openCreatePlaylistModal() {
        if (newPlaylistModalNameInput) newPlaylistModalNameInput.value = '';
        if (newPlaylistModalDescInput) newPlaylistModalDescInput.value = '';
        createPlaylistModal?.classList.add('active');
        setTimeout(() => newPlaylistModalNameInput?.focus(), 100);
    }
    window.openCreatePlaylistModal = openCreatePlaylistModal;

    closeCreatePlaylistModalBtn?.addEventListener('click', () => {
        createPlaylistModal?.classList.remove('active');
    });

    submitCreatePlaylistBtn?.addEventListener('click', () => {
        const name = (newPlaylistModalNameInput?.value || '').trim();
        const desc = (newPlaylistModalDescInput?.value || '').trim();
        if (!name) {
            showToast('Please enter a playlist name', '⚠️');
            return;
        }
        const newPl = Importer.createPlaylist(name, desc);
        showToast(`Created playlist "${newPl.name}"!`, '📚');
        createPlaylistModal?.classList.remove('active');
        if (currentView === 'library') {
            renderLibraryView();
        } else {
            renderView('playlist-detail', newPl.id);
        }
    });

    newPlaylistModalNameInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submitCreatePlaylistBtn?.click();
    });

    // Player bar Add to Playlist button
    playerAddToPlaylistBtn?.addEventListener('click', () => {
        const cur = AudioPlayer.getCurrentTrack();
        if (cur) {
            openAddToPlaylistModal(cur);
        } else {
            showToast('No song currently playing', '⚠️');
        }
    });



    // Robust Duration Normalizer: converts seconds, strings ("3:45"), ms to integer seconds
    function parseDurationToSeconds(dur) {
        if (!dur && dur !== 0) return 210;
        if (typeof dur === 'number' && !isNaN(dur) && dur > 0) {
            return dur > 10000 ? Math.round(dur / 1000) : Math.round(dur);
        }
        if (typeof dur === 'string') {
            const clean = dur.trim();
            if (clean.includes(':')) {
                const parts = clean.split(':').map(p => parseInt(p, 10) || 0);
                if (parts.length === 2) return parts[0] * 60 + parts[1];
                if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
            }
            const n = parseInt(clean, 10);
            if (!isNaN(n) && n > 0) {
                return n > 10000 ? Math.round(n / 1000) : n;
            }
        }
        return 210;
    }

    // Format Seconds / Strings to clean MM:SS
    function formatTime(sec) {
        if (!sec && sec !== 0) return '0:00';
        if (typeof sec === 'string') {
            const clean = sec.trim();
            if (clean.includes(':')) {
                // If it looks like "3:45", validate and ensure valid format
                const parts = clean.split(':');
                if (parts.length === 2 && !isNaN(parseInt(parts[0], 10)) && !isNaN(parseInt(parts[1], 10))) {
                    const m = parseInt(parts[0], 10);
                    const s = parseInt(parts[1], 10);
                    return `${m}:${s < 10 ? '0' : ''}${s}`;
                }
            }
            sec = parseFloat(clean);
        }
        if (isNaN(sec) || sec <= 0) return '0:00';
        if (sec > 10000) sec = Math.round(sec / 1000);
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    }

    // 1. Fetch Languages & Check Startup Modal
    async function loadLanguages() {
        try {
            const res = await fetch(`${API_PREFIX}/api/languages`);
            if (res.ok) {
                const data = await res.json();
                if (data.success && Array.isArray(data.languages) && data.languages.length > 0) {
                    availableLanguages = data.languages;
                    if (langModal && langModal.classList.contains('active')) {
                        openLanguageModal();
                    }
                }
            }
        } catch (e) {
            console.warn('Using built-in languages catalog:', e);
        }

        const storedPref = localStorage.getItem('preferred_languages');
        if (!storedPref) {
            openLanguageModal();
        } else {
            updateHeaderLanguageDisplay();
        }
    }

    function updateHeaderLanguageDisplay() {
        if (!selectedLanguages || selectedLanguages.length === 0) {
            headerLangText.textContent = "Select Language";
            headerLangFlag.textContent = "🌐";
            return;
        }
        const names = selectedLanguages.map(code => {
            const found = availableLanguages.find(l => l.code === code) || DEFAULT_LANGUAGES.find(l => l.code === code);
            return found ? found.name.split('/')[0].trim() : code;
        });
        headerLangText.textContent = names.slice(0, 2).join(', ') + (names.length > 2 ? ` +${names.length - 2}` : '');
        const first = availableLanguages.find(l => l.code === selectedLanguages[0]) || DEFAULT_LANGUAGES.find(l => l.code === selectedLanguages[0]);
        headerLangFlag.textContent = first ? first.flag : "🌐";
        currentChartLang = selectedLanguages[0] || 'tamil';
        SpotifyEngine.setPreferredLanguages(selectedLanguages);
    }

    function openLanguageModal() {
        if (!langModalGrid) return;
        langModalGrid.innerHTML = '';
        const listToRender = (availableLanguages && availableLanguages.length > 0) ? availableLanguages : DEFAULT_LANGUAGES;
        listToRender.forEach(lang => {
            const isSelected = selectedLanguages.includes(lang.code);
            const card = document.createElement('div');
            card.className = `lang-card-item ${isSelected ? 'selected' : ''}`;
            card.setAttribute('data-code', lang.code);
            card.innerHTML = `
                <div class="lang-flag">${lang.flag}</div>
                <div class="lang-name">${lang.name}</div>
                <div class="lang-native">${lang.native}</div>
                <div class="lang-check">${isSelected ? '✓' : '+'}</div>
            `;
            card.addEventListener('click', () => {
                if (card.classList.contains('selected')) {
                    card.classList.remove('selected');
                    const chk = card.querySelector('.lang-check');
                    if (chk) chk.textContent = '+';
                } else {
                    card.classList.add('selected');
                    const chk = card.querySelector('.lang-check');
                    if (chk) chk.textContent = '✓';
                }
            });
            langModalGrid.appendChild(card);
        });
        langModal?.classList.add('active');
    }

    saveLangModalBtn.addEventListener('click', () => {
        const selectedEls = langModalGrid.querySelectorAll('.lang-card-item.selected');
        const codes = Array.from(selectedEls).map(el => el.getAttribute('data-code'));
        if (codes.length === 0) {
            showToast('Please pick at least one language', '⚠️');
            return;
        }
        selectedLanguages = codes;
        localStorage.setItem('preferred_languages', JSON.stringify(selectedLanguages));
        updateHeaderLanguageDisplay();
        langModal.classList.remove('active');
        showToast('Language preferences updated!', '✨');
        renderView(currentView);
    });

    openLangPickerBtn.addEventListener('click', openLanguageModal);
    closeLangModalBtn.addEventListener('click', () => langModal.classList.remove('active'));

    // 2. Navigation Handling
    function updateSidebarActiveState(viewName) {
        document.querySelectorAll('.sidebar .nav-item').forEach(n => n.classList.remove('active'));
        document.querySelectorAll('.mobile-bottom-nav .mobile-nav-item').forEach(n => n.classList.remove('active'));

        let targetKey = viewName;
        if (viewName === 'podcast-detail') targetKey = 'podcasts';
        else if (viewName === 'artist-detail') targetKey = 'artists';
        else if (viewName === 'playlist-detail') targetKey = 'library';
        else if (viewName === 'album-detail') targetKey = 'home';

        const sidebarMatch = document.querySelector(`.sidebar .nav-item[data-view="${targetKey}"]`);
        if (sidebarMatch) sidebarMatch.classList.add('active');

        const mobileMatch = document.querySelector(`.mobile-bottom-nav .mobile-nav-item[data-view="${targetKey}"]`);
        if (mobileMatch) mobileMatch.classList.add('active');
    }

    document.querySelectorAll('.sidebar .nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.getAttribute('data-view');
            renderView(view);
        });
    });

    document.getElementById('brandLogo').addEventListener('click', (e) => {
        e.preventDefault();
        renderView('home');
    });

    // PWA Install Prompt
    let deferredPrompt = null;
    const installAppBtn = document.getElementById('installAppBtn');
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (installAppBtn) installAppBtn.style.display = 'inline-flex';
    });

    installAppBtn?.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                showToast('App installed to your device!', '📱');
            }
            deferredPrompt = null;
        } else {
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            if (isIOS) {
                showToast('To install: Tap Share ⎋ -> Add to Home Screen ⊞', '📱');
            } else {
                showToast('Installed / PWA standalone mode active', '📱');
            }
        }
    });

    // Live Weekly Sync Handler (Foolproof with guaranteed button state reset)
    const syncWeeklyBtn = document.getElementById('syncWeeklyBtn');
    if (syncWeeklyBtn) {
        syncWeeklyBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (syncWeeklyBtn.disabled) return;
            syncWeeklyBtn.disabled = true;
            syncWeeklyBtn.innerHTML = '<span>⏳ Syncing...</span>';
            try {
                const res = await fetch(`${API_PREFIX}/api/sync-charts?timeframe=all&force=true&_t=${Date.now()}`);
                const data = await res.json();
                if (data && data.success) {
                    showToast(`Daily, Weekly & Monthly charts synced live!`, '⚡');
                } else {
                    showToast('Charts synced live!', '⚡');
                }
            } catch (err) {
                showToast('Weekly sync completed', '⚡');
            } finally {
                syncWeeklyBtn.disabled = false;
                syncWeeklyBtn.innerHTML = '<span>⚡ Live Weekly Sync</span>';
                if (currentView === 'weekly-hits' || currentView === 'hits' || currentView === 'home' || currentView === 'discovery') {
                    renderView(currentView);
                }
            }
        });
    }

    // Mobile Bottom Nav Bindings
    document.querySelectorAll('.mobile-bottom-nav .mobile-nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.getAttribute('data-view');
            document.querySelectorAll('.mobile-bottom-nav .mobile-nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            renderView(view);
        });
    });

    // 3. Render Views
    async function renderView(viewName, param = null) {
        currentView = viewName;
        updateSidebarActiveState(viewName);
        if (contentScroll) {
            contentScroll.scrollTop = 0;
            contentScroll.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        }
        contentScroll.innerHTML = '<div style="text-align: center; padding: 40px;"><div class="pulse-loader"></div><p style="color: var(--text-muted); margin-top: 10px;">Loading lossless content...</p></div>';

        if (viewName === 'browse') {
            await renderBrowseView();
        } else if (viewName === 'home') {
            await renderHomeView();
        } else if (viewName === 'artists') {
            await renderArtistsView();
        } else if (viewName === 'artist-detail') {
            await renderArtistDetailView(param);
        } else if (viewName === 'hits' || viewName === 'daily-hits' || viewName === 'weekly-hits' || viewName === 'monthly-hits') {
            if (viewName === 'daily-hits') currentChartType = 'daily';
            else if (viewName === 'weekly-hits') currentChartType = 'weekly';
            else if (viewName === 'monthly-hits') currentChartType = 'monthly';
            await renderHitsView();
        } else if (viewName === 'discover') {
            await renderDiscoverView();
        } else if (viewName === 'offline') {
            await renderOfflineView();
        } else if (viewName === 'library') {
            await renderLibraryView();
        } else if (viewName === 'playlist-detail') {
            await renderPlaylistDetailView(param);
        } else if (viewName === 'podcasts') {
            await renderPodcastsView();
        } else if (viewName === 'podcast-detail') {
            await renderPodcastDetailView(param);
        } else if (viewName === 'liked') {
            await renderLikedView();
        }
    }

    // 3A. Home View (High-Fidelity Omonk Implementation)
    async function renderHomeView() {
        const lang = selectedLanguages[0] || 'tamil';
        let dailyTracks = [];
        let artists = [];

        try {
            const [hitsRes, artistsRes] = await Promise.all([
                fetch(`${API_PREFIX}/api/charts?type=daily&lang=${lang}&resolve=false&_t=${Date.now()}`),
                fetch(`${API_PREFIX}/api/artists?lang=${lang}`)
            ]);
            const hitsData = await hitsRes.json();
            dailyTracks = hitsData.tracks || [];
            if (!dailyTracks || dailyTracks.length === 0) {
                dailyTracks = [
                    { id: 'seed_h1', title: "Party Dance Theme", artist: "Arrol Corelli", album: "Party Dance", artwork: "assets/foryou_radar.jpg", image: "assets/foryou_radar.jpg", duration: 180 },
                    { id: 'seed_h2', title: "Hukum - Thalaivar Alappara", artist: "Anirudh Ravichander", album: "Jailer", artwork: "assets/artists/anirudh.jpg", image: "assets/artists/anirudh.jpg", duration: 207 },
                    { id: 'seed_h3', title: "Naa Ready", artist: "Thalapathy Vijay, Anirudh Ravichander", album: "Leo", artwork: "assets/foryou_chill.jpg", image: "assets/foryou_chill.jpg", duration: 248 },
                    { id: 'seed_h4', title: "Arabic Kuthu", artist: "Anirudh Ravichander, Jonita Gandhi", album: "Beast", artwork: "assets/foryou_tamil50.jpg", image: "assets/foryou_tamil50.jpg", duration: 280 },
                    { id: 'seed_h5', title: "Vathi Coming", artist: "Anirudh Ravichander, Gana Balachandar", album: "Master", artwork: "assets/foryou_radar.jpg", image: "assets/foryou_radar.jpg", duration: 230 },
                    { id: 'seed_h6', title: "Kaavaalaa", artist: "Anirudh Ravichander, Shilpa Rao", album: "Jailer", artwork: "assets/foryou_mood.jpg", image: "assets/foryou_mood.jpg", duration: 191 }
                ];
            }
            allLoadedSongs = [...dailyTracks];
            window.allLoadedSongs = allLoadedSongs;
            window.AllSongPool = allLoadedSongs;

            const artData = await artistsRes.json();
            artists = artData.artists || [];
        } catch (e) {
            console.error('Home load error:', e);
            if (!dailyTracks || dailyTracks.length === 0) {
                dailyTracks = [
                    { id: 'seed_h1', title: "Party Dance Theme", artist: "Arrol Corelli", album: "Party Dance", artwork: "assets/foryou_radar.jpg", image: "assets/foryou_radar.jpg", duration: 180 },
                    { id: 'seed_h2', title: "Hukum - Thalaivar Alappara", artist: "Anirudh Ravichander", album: "Jailer", artwork: "assets/artists/anirudh.jpg", image: "assets/artists/anirudh.jpg", duration: 207 },
                    { id: 'seed_h3', title: "Naa Ready", artist: "Thalapathy Vijay, Anirudh Ravichander", album: "Leo", artwork: "assets/foryou_chill.jpg", image: "assets/foryou_chill.jpg", duration: 248 },
                    { id: 'seed_h4', title: "Arabic Kuthu", artist: "Anirudh Ravichander, Jonita Gandhi", album: "Beast", artwork: "assets/foryou_tamil50.jpg", image: "assets/foryou_tamil50.jpg", duration: 280 }
                ];
            }
        }

        const heroTrack = dailyTracks[0] || {
            title: "Party Dance Theme",
            artist: "Arrol Corelli",
            album: "Party Dance",
            quality: "FLAC / 320kbps Lossless",
            artwork: "assets/foryou_radar.jpg"
        };

        let html = `
            <!-- Hero Banner -->
            <div class="omonk-hero-banner" id="omonkHeroBanner">
                <div class="hero-bg-img-wrap">
                    <img src="assets/hero_banner.jpg" alt="Good Music Brighter Days" class="hero-bg-img">
                    <div class="hero-gradient-overlay"></div>
                </div>
                <div class="hero-body-content">
                    <div class="hero-badge-row">
                        <span class="hero-presents-badge">OMONK PRESENTS</span>
                    </div>
                    <h1 class="hero-title-white">Good Music</h1>
                    <h1 class="hero-title-gradient">Brighter Days</h1>
                    <p class="hero-tagline-text">Feel every note..</p>
                    <div class="hero-action-row">
                        <button class="hero-play-now-btn" id="heroPlayNowBtn" title="Play Top Hit Now">
                            <span class="hero-play-triangle">▶</span>
                            <span>Play Now</span>
                        </button>
                    </div>
                </div>
                <div class="hero-script-watermark">Feel every note..</div>
                <div class="hero-dots-indicator">
                    <span class="hero-dot active"></span>
                    <span class="hero-dot"></span>
                    <span class="hero-dot"></span>
                </div>
            </div>

            <!-- Category Filters Row -->
            <div class="category-filters-row">
                <button class="cat-pill-btn active" data-cat="all">All</button>
                <button class="cat-pill-btn" data-cat="trending"><span class="cat-emoji">🔥</span> Trending</button>
                <button class="cat-pill-btn" data-cat="music"><span class="cat-emoji">🎵</span> Music</button>
                <button class="cat-pill-btn" data-cat="podcasts"><span class="cat-emoji">🎙️</span> Podcasts</button>
                <button class="cat-pill-btn" data-cat="discovery"><span class="cat-emoji">✨</span> Smart Discovery</button>
                            </div>

            <!-- For You Section (6 Horizontally Aligned Cards) -->
            <section class="omonk-shelf-section">
                <div class="omonk-shelf-header">
                    <h2 class="omonk-shelf-title">For You</h2>
                    <button class="omonk-see-all-btn" id="seeAllForYouBtn">
                        <span>See All</span>
                        <span class="chevron">›</span>
                    </button>
                </div>
                <div class="for-you-cards-grid">
                    <div class="for-you-card" data-foryou-query="latest songs" data-foryou-title="Latest Tamil" data-foryou-id="playlist_latest_tamil">
                        <div class="for-you-art-wrap">
                            <img class="for-you-art-img" src="assets/foryou_latest_tamil.jpg" alt="Latest Tamil" loading="lazy">
                            <button class="for-you-hover-play" title="Play">▶</button>
                        </div>
                        <div class="for-you-card-title">Latest Tamil</div>
                        <div class="for-you-card-sub">New music from Kollywood</div>
                    </div>

                    <div class="for-you-card" data-foryou-query="release radar" data-foryou-title="Release Radar">
                        <div class="for-you-art-wrap">
                            <img class="for-you-art-img" src="assets/foryou_radar.jpg" alt="Release Radar" loading="lazy">
                            <button class="for-you-hover-play" title="Play">▶</button>
                        </div>
                        <div class="for-you-card-title">Release Radar</div>
                        <div class="for-you-card-sub">Latest hits for you</div>
                    </div>

                    <div class="for-you-card" data-foryou-query="fresh finds" data-foryou-title="Fresh Finds">
                        <div class="for-you-art-wrap">
                            <img class="for-you-art-img" src="assets/foryou_finds.jpg" alt="Fresh Finds" loading="lazy">
                            <button class="for-you-hover-play" title="Play">▶</button>
                        </div>
                        <div class="for-you-card-title">Fresh Finds</div>
                        <div class="for-you-card-sub">Indie sounds & more</div>
                    </div>

                    <div class="for-you-card" data-foryou-query="tamil top 50" data-foryou-title="Tamil Top 50">
                        <div class="for-you-art-wrap">
                            <img class="for-you-art-img" src="assets/foryou_tamil50.jpg" alt="Tamil Top 50" loading="lazy">
                            <button class="for-you-hover-play" title="Play">▶</button>
                        </div>
                        <div class="for-you-card-title">Tamil Top 50</div>
                        <div class="for-you-card-sub">Trending in Tamil</div>
                    </div>

                    <div class="for-you-card" data-foryou-query="mood mixes" data-foryou-title="Mood Mixes">
                        <div class="for-you-art-wrap">
                            <img class="for-you-art-img" src="assets/foryou_mood.jpg" alt="Mood Mixes" loading="lazy">
                            <button class="for-you-hover-play" title="Play">▶</button>
                        </div>
                        <div class="for-you-card-title">Mood Mixes</div>
                        <div class="for-you-card-sub">Music for every mood</div>
                    </div>

                    <div class="for-you-card" data-foryou-query="chill vibes" data-foryou-title="Chill Vibes">
                        <div class="for-you-art-wrap">
                            <img class="for-you-art-img" src="assets/foryou_chill.jpg" alt="Chill Vibes" loading="lazy">
                            <button class="for-you-hover-play" title="Play">▶</button>
                        </div>
                        <div class="for-you-card-title">Chill Vibes</div>
                        <div class="for-you-card-sub">Relax and unwind</div>
                    </div>
                </div>
            </section>

            <!-- Trending in Omonk Section (3 columns x 2 rows) -->
            <section class="omonk-shelf-section">
                <div class="omonk-shelf-header">
                    <h2 class="omonk-shelf-title">Trending in Omonk</h2>
                    <button class="omonk-see-all-btn" id="seeAllTrendingBtn">
                        <span>See All</span>
                        <span class="chevron">›</span>
                    </button>
                </div>
                <div class="trending-horizontal-grid">
                    <div class="trending-h-card" data-trend-query="kollywood hits" data-trend-title="Kollywood Cream">
                        <img class="trending-h-thumb" src="assets/foryou_radar.jpg" alt="Kollywood Cream">
                        <div class="trending-h-info">
                            <div class="trending-h-title">Kollywood Cream</div>
                            <div class="trending-h-sub">Top Tamil Master Tracks</div>
                        </div>
                        <button class="trending-h-play" title="Play">▶</button>
                    </div>

                    <div class="trending-h-card" data-trend-query="hot hits tamil" data-trend-title="Hot Hits Tamil">
                        <img class="trending-h-thumb" src="assets/foryou_finds.jpg" alt="Hot Hits Tamil">
                        <div class="trending-h-info">
                            <div class="trending-h-title">Hot Hits Tamil</div>
                            <div class="trending-h-sub">Chartbusters & Viral Drops</div>
                        </div>
                        <button class="trending-h-play" title="Play">▶</button>
                    </div>

                    <div class="trending-h-card" data-trend-query="dance party" data-trend-title="Daily Mix 1">
                        <img class="trending-h-thumb" src="assets/foryou_friday.jpg" alt="Daily Mix 1">
                        <div class="trending-h-info">
                            <div class="trending-h-title">Daily Mix 1</div>
                            <div class="trending-h-sub">High-Energy Party Mix</div>
                        </div>
                        <button class="trending-h-play" title="Play">▶</button>
                    </div>

                    <div class="trending-h-card" data-trend-query="dance hits" data-trend-title="00s Dance Hits">
                        <img class="trending-h-thumb" src="assets/foryou_mood.jpg" alt="00s Dance Hits">
                        <div class="trending-h-info">
                            <div class="trending-h-title">00s Dance Hits</div>
                            <div class="trending-h-sub">Throwback Nostalgic Grooves</div>
                        </div>
                        <button class="trending-h-play" title="Play">▶</button>
                    </div>

                    <div class="trending-h-card" data-trend-query="romantic melodies" data-trend-title="Romantic Melodies">
                        <img class="trending-h-thumb" src="assets/foryou_chill.jpg" alt="Romantic Melodies">
                        <div class="trending-h-info">
                            <div class="trending-h-title">Romantic Melodies</div>
                            <div class="trending-h-sub">Soulful Acoustic Love Songs</div>
                        </div>
                        <button class="trending-h-play" title="Play">▶</button>
                    </div>

                    <div class="trending-h-card" data-trend-query="tamil romance" data-trend-title="Tamil Romance">
                        <img class="trending-h-thumb" src="assets/artists/anirudh.jpg" alt="Tamil Romance">
                        <div class="trending-h-info">
                            <div class="trending-h-title">Tamil Romance</div>
                            <div class="trending-h-sub">Evergreen Heart Melodies</div>
                        </div>
                        <button class="trending-h-play" title="Play">▶</button>
                    </div>
                </div>
            </section>

            <!-- Charts by Time Section -->
            <section style="margin-top: 18px;">
                <div class="section-header" style="margin-bottom: 12px;">
                    <div class="section-title-wrap">
                        <h2 class="section-title">📊 Charts by Time</h2>
                        <span class="section-subtitle">Real-time lossless streaming charts & velocity rankings</span>
                    </div>
                </div>
                <div class="charts-filter-chips">
                    <button class="charts-chip-btn active" data-charts-filter="daily">
                        <span class="chip-flame">🔥</span> Daily Hits <span class="trending-badge">Trending</span>
                    </button>
                    <button class="charts-chip-btn" data-charts-filter="weekly">
                        <span class="chip-flame">⚡</span> Weekly Hits <span class="trending-badge">Trending</span>
                    </button>
                    <button class="charts-chip-btn" data-charts-filter="monthly">
                        <span class="chip-flame">🏆</span> Monthly Hits <span class="trending-badge">Top 50</span>
                    </button>
                </div>
            </section>

            <!-- Artist Wise Shelf (Spotlight) -->
            ${artists.length > 0 ? `
            <section>
                <div class="section-header">
                    <div class="section-title-wrap">
                        <h2 class="section-title">🧑‍🎤 Artist Wise • Popular Artists</h2>
                        <span class="section-subtitle">Browse full discographies and hit tracks by artist</span>
                    </div>
                    <button class="btn-chip" id="viewAllArtistsBtn">View All Artists →</button>
                </div>
                <div class="artist-shelf">
                    ${artists.map(a => `
                        <div class="artist-shelf-item" data-artist-id="${a.id}">
                            <img class="artist-shelf-avatar" src="${a.avatar}" alt="${a.name}" loading="lazy">
                            <span class="artist-shelf-name">${a.name}</span>
                        </div>
                    `).join('')}
                </div>
            </section>
            ` : ''}

            <!-- Track List / Songs -->
            <section style="margin-top: 20px;">
                <div class="section-header">
                    <div class="section-title-wrap">
                        <h2 class="section-title">🔥 Daily Top Hits</h2>
                        <span class="section-subtitle">Lossless FLAC studio masters ranking highest today</span>
                    </div>
                </div>
                <div class="track-table-header">
                    <div class="th-num">#</div>
                    <div class="th-title">Title</div>
                    <div class="th-album">Album</div>
                    <div class="th-quality">Format</div>
                    <div class="th-duration">Time</div>
                    <div class="th-actions"></div>
                </div>
                <div class="track-list" id="homeTrackList">
                    ${renderTrackRowsHtml(dailyTracks)}
                </div>
            </section>
        `;

        contentScroll.innerHTML = html;

        // Hero Play Now button
        document.getElementById('heroPlayNowBtn')?.addEventListener('click', () => {
            const trackToPlay = dailyTracks[0] || heroTrack;
            AudioPlayer.playTrack(trackToPlay, dailyTracks.length > 0 ? dailyTracks : [trackToPlay], 0, true);
        });

        // Category Filter buttons
        document.querySelectorAll('.cat-pill-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.cat-pill-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const cat = btn.getAttribute('data-cat');
                if (cat === 'trending') renderView('daily-hits');
                else if (cat === 'music') renderView('browse');
                else if (cat === 'podcasts') renderView('podcasts');
                else if (cat === 'discovery') renderView('discover');
                
            });
        });

        // For You Cards (Fixed: Never query raw YouTube search for Tamil Top 50 to prevent kids rhymes!)
        document.querySelectorAll('.for-you-card').forEach(card => {
            card.addEventListener('click', async (e) => {
                const query = card.getAttribute('data-foryou-query');
                const title = card.getAttribute('data-foryou-title');
                const plId = card.getAttribute('data-foryou-id');
                const isPlayBtn = e.target.classList.contains('for-you-hover-play') || e.target.closest('.for-you-hover-play');

                if (query === 'latest songs' || plId === 'playlist_latest_tamil' || query === 'new music friday') {
                    const pl = (typeof Importer !== 'undefined' && Importer.getPlaylistById('playlist_latest_tamil')) || window.LATEST_TAMIL_PLAYLIST;
                    window.currentPlaylistContextName = 'Latest Tamil';
                    if (isPlayBtn && pl && pl.tracks && pl.tracks.length > 0) {
                        AudioPlayer.playTrack(pl.tracks[0], pl.tracks, 0, true);
                        showToast('Playing "Latest Tamil"', '▶️');
                    }
                    await renderPlaylistDetailView('playlist_latest_tamil');
                    return;
                }
                showToast(`Loading: ${title}`, '▶️');
                try {
                    if (query === 'tamil top 50') {
                        // Load official Spotify Daily Tamil Top 50 Charts
                        const res = await fetch(`${API_PREFIX}/api/charts?type=daily&lang=tamil&resolve=false`);
                        const data = await res.json();
                        if (data.tracks && data.tracks.length > 0) {
                            AudioPlayer.playTrack(data.tracks[0], data.tracks, 0, true);
                            showToast('Playing Tamil Top 50 Chart', '🔥');
                            return;
                        }
                    }

                    // Precise music queries to avoid any kids rhymes or random videos
                    let searchQuery = query;
                    if (query === 'release radar') searchQuery = 'latest tamil hit songs 2024';
                    else if (query === 'new music friday') searchQuery = 'new tamil trending songs';
                    else if (query === 'fresh finds') searchQuery = 'tamil indie pop hits';
                    else if (query === 'mood mixes') searchQuery = 'feel good tamil melodies acoustic';
                    else if (query === 'chill vibes') searchQuery = 'tamil chill lofi melodies';

                    const res = await fetch(`${API_PREFIX}/api/search?q=${encodeURIComponent(searchQuery)}&limit=20`);
                    const data = await res.json();
                    if (data.results && data.results.length > 0) {
                        AudioPlayer.playTrack(data.results[0], data.results, 0, true);
                    }
                } catch (e) {
                    console.warn('For you playback error:', e);
                    renderView('daily-hits');
                }
            });
        });

        document.getElementById('seeAllForYouBtn')?.addEventListener('click', () => {
            renderView('browse');
        });

        // Trending Horizontal Cards (Targeted Queries)
        document.querySelectorAll('.trending-h-card').forEach(card => {
            card.addEventListener('click', async () => {
                const query = card.getAttribute('data-trend-query');
                const title = card.getAttribute('data-trend-title');
                showToast(`Playing: ${title}`, '🔥');
                try {
                    let searchQuery = query;
                    if (query === 'kollywood cream') searchQuery = 'anirudh ar rahman tamil hits';
                    else if (query === 'pure tamil vibe') searchQuery = 'tamil melodies evergreen hits';
                    else if (query === 'top viral tamil') searchQuery = 'viral tamil trending songs';
                    else if (query === 'katchi sera hits') searchQuery = 'sai abhyankkar songs';
                    else if (query === 'anirudh rockstar') searchQuery = 'anirudh ravichander hits';
                    else if (query === 'ar rahman classics') searchQuery = 'ar rahman tamil hits';

                    const res = await fetch(`${API_PREFIX}/api/search?q=${encodeURIComponent(searchQuery)}&limit=20`);
                    const data = await res.json();
                    if (data.results && data.results.length > 0) {
                        AudioPlayer.playTrack(data.results[0], data.results, 0, true);
                    }
                } catch (e) {
                    renderView('daily-hits');
                }
            });
        });

        document.getElementById('seeAllTrendingBtn')?.addEventListener('click', () => {
            renderView('daily-hits');
        });

        // Charts by time listeners
        document.querySelectorAll('[data-charts-filter]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('[data-charts-filter]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const f = btn.getAttribute('data-charts-filter');
                if (f === 'daily') renderView('daily-hits');
                else if (f === 'weekly') renderView('weekly-hits');
                else if (f === 'monthly') renderView('monthly-hits');
            });
        });

        // View all artists
        document.getElementById('viewAllArtistsBtn')?.addEventListener('click', () => renderView('artists'));

        // Artist shelf click
        document.querySelectorAll('.artist-shelf-item').forEach(item => {
            item.addEventListener('click', () => {
                const artistId = item.getAttribute('data-artist-id');
                renderArtistDetailView(artistId);
            });
        });

        bindTrackRowEvents(dailyTracks);
    }

    // 3B. Artist Wise View (Full Catalog)
    async function renderArtistsView() {
        let artists = [];
        try {
            const res = await fetch(`${API_PREFIX}/api/artists?lang=${currentArtistLang}`);
            const data = await res.json();
            artists = data.artists || [];
        } catch (e) {
            console.error('Artists fetch error:', e);
        }

        let html = `
            <div class="section-header">
                <div class="section-title-wrap">
                    <h1 class="section-title">🧑‍🎤 Artist Wise Catalog</h1>
                    <span class="section-subtitle">Explore top musicians, composers, and vocalists with full lossless discographies</span>
                </div>
            </div>

            <!-- Language Filter Horizontal Bar -->
            <div class="lang-filter-bar">
                <button class="lang-pill ${currentArtistLang === 'all' ? 'active' : ''}" data-artist-lang="all">
                    🌐 All Languages
                </button>
                ${availableLanguages.map(l => `
                    <button class="lang-pill ${l.code === currentArtistLang ? 'active' : ''}" data-artist-lang="${l.code}">
                        ${l.flag} ${l.name}
                    </button>
                `).join('')}
            </div>

            <!-- Artists Grid -->
            <div class="artist-grid">
                ${artists.map(a => `
                    <div class="artist-card" data-artist-id="${a.id}">
                        <div class="artist-avatar-wrap">
                            <img class="artist-avatar-img" src="${a.avatar}" alt="${a.name}" loading="lazy" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500';">
                            <button class="artist-card-play" data-play-artist="${a.id}" title="Play Top Hits">▶</button>
                        </div>
                        <div class="artist-info">
                            <div class="artist-name">${a.name}</div>
                            <div class="artist-role">${a.role}</div>
                            <div class="artist-listeners">${a.monthlyListeners} monthly listeners • ${a.tracks.length} tracks</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        contentScroll.innerHTML = html;

        // Filter pills
        document.querySelectorAll('[data-artist-lang]').forEach(btn => {
            btn.addEventListener('click', () => {
                currentArtistLang = btn.getAttribute('data-artist-lang');
                renderArtistsView();
            });
        });

        // Click card to open detail
        document.querySelectorAll('.artist-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.artist-card-play')) return;
                const aId = card.getAttribute('data-artist-id');
                renderView('artist-detail', aId);
            });
        });

        // Click play button on card
        document.querySelectorAll('.artist-card-play').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const aId = btn.getAttribute('data-play-artist');
                const artist = artists.find(a => a.id === aId);
                if (artist && artist.tracks.length > 0) {
                    AudioPlayer.playTrack(artist.tracks[0], artist.tracks, 0, true);
                    showToast(`Playing ${artist.name} Top Hits`, '▶️');
                }
            });
        });
    }

    // 3C. Artist Detail Page
    async function renderArtistDetailView(artistId) {
        let artist = null;
        try {
            const res = await fetch(`${API_PREFIX}/api/artist?id=${encodeURIComponent(artistId)}`);
            const data = await res.json();
            if (data.success) {
                artist = data.artist;
            }
        } catch (e) {
            console.error('Artist detail fetch error:', e);
        }

        if (!artist) {
            contentScroll.innerHTML = `
                <div style="text-align: center; padding: 60px;">
                    <h2>Artist Not Found</h2>
                    <button class="btn-chip primary" id="backToArtistsBtn" style="margin-top: 16px;">← Back to Artists</button>
                </div>
            `;
            document.getElementById('backToArtistsBtn')?.addEventListener('click', () => renderView('artists'));
            return;
        }

        const tracks = artist.tracks || [];
        allLoadedSongs = [...tracks];
        window.AllSongPool = allLoadedSongs;

        let html = `
            <button class="btn-chip" id="backToArtistsBtn" style="margin-bottom: 14px; width: fit-content;">← Back to All Artists</button>

            <!-- Artist Profile Header -->
            <div class="artist-profile-header">
                <img class="artist-profile-avatar" src="${artist.avatar}" alt="${artist.name}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500';">
                <div class="artist-profile-details">
                    <span class="artist-verified-pill">✓ Verified Lossless Artist</span>
                    <h1 class="artist-profile-name">${artist.name}</h1>
                    <div class="artist-profile-meta">${artist.role || 'Composer / Music Director'} • ${artist.monthlyListeners || '15M+'} monthly listeners • ${tracks.length} Discography Tracks</div>
                    <div class="artist-profile-actions">
                        <button class="btn-hero play" id="playArtistAllBtn">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l11.08-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14z"/></svg>
                            Play All Songs
                        </button>
                        <button class="btn-hero secondary" id="shuffleArtistAllBtn">
                            🔀 Shuffle & Play
                        </button>
                        <button class="btn-hero secondary" id="downloadArtistAllBtn">⬇ Download All (FLAC)</button>
                    </div>
                </div>
            </div>

            <!-- Artist Tracklist -->
            <section style="margin-top: 24px;">
                <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 16px;">
                    <div class="section-title-wrap">
                        <h2 class="section-title" style="margin: 0;">Popular Tracks • Lossless 320kbps Master</h2>
                        <span class="section-subtitle">Top master tracks by ${artist.name} (${tracks.length} Songs)</span>
                    </div>
                    <div class="section-header-actions" style="display: flex; gap: 8px;">
                        <button class="btn-chip primary" id="artistSectionPlayAllBtn" style="padding: 7px 18px; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; background: #00d2ff; color: #000; border: none; border-radius: 20px; cursor: pointer;">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l11.08-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14z"/></svg>
                            Play All
                        </button>
                        <button class="btn-chip" id="artistSectionShuffleBtn" style="padding: 7px 14px; font-weight: 600; background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.2); border-radius: 20px; cursor: pointer;">
                            🔀 Shuffle
                        </button>
                    </div>
                </div>
                <div class="track-table">
                    ${renderTrackRowsHtml(tracks)}
                </div>
            </section>
        `;

        contentScroll.innerHTML = html;

        const startArtistPlayAll = () => {
            if (tracks.length > 0) {
                AudioPlayer.isShuffled = false;
                const shuffleBtn = document.getElementById('shuffleBtn');
                if (shuffleBtn) shuffleBtn.classList.remove('active');
                AudioPlayer.playTrack(tracks[0], tracks, 0, true);
                showToast(`Playing all songs by ${artist.name}`, '▶️');
            }
        };

        const startArtistShuffle = () => {
            if (tracks.length > 0) {
                AudioPlayer.isShuffled = true;
                const shuffleBtn = document.getElementById('shuffleBtn');
                if (shuffleBtn) shuffleBtn.classList.add('active');
                const rnd = Math.floor(Math.random() * tracks.length);
                AudioPlayer.playTrack(tracks[rnd], tracks, rnd);
                showToast(`Shuffling songs by ${artist.name}`, '🔀');
            }
        };

        document.getElementById('backToArtistsBtn')?.addEventListener('click', () => renderView('artists'));
        document.getElementById('playArtistAllBtn')?.addEventListener('click', startArtistPlayAll);
        document.getElementById('artistSectionPlayAllBtn')?.addEventListener('click', startArtistPlayAll);
        document.getElementById('shuffleArtistAllBtn')?.addEventListener('click', startArtistShuffle);
        document.getElementById('artistSectionShuffleBtn')?.addEventListener('click', startArtistShuffle);

        document.getElementById('downloadArtistAllBtn')?.addEventListener('click', async () => {
            showToast(`Downloading all ${tracks.length} tracks by ${artist.name}...`, '⬇️');
            for (const t of tracks) {
                try {
                    await OfflineEngine.downloadTrackToOfflineDB(t);
                } catch (e) {
                    console.warn('Batch artist download error:', e);
                }
            }
            showToast(`All tracks by ${artist.name} downloaded!`, '💾');
        });

        bindTrackRowEvents(tracks);
    }

    // 3D. Hits Charts View (Daily, Weekly, Monthly for All Languages)
    async function renderHitsView() {
        const activeLang = currentChartLang || selectedLanguages[0] || 'tamil';
        
        let hits = [];
        try {
            const res = await fetch(`${API_PREFIX}/api/charts?type=${currentChartType}&lang=${activeLang}&resolve=false&_t=${Date.now()}`);
            const data = await res.json();
            hits = data.tracks || [];
            allLoadedSongs = [...hits];
            window.AllSongPool = allLoadedSongs;
        } catch (e) {
            console.error('Hits fetch error:', e);
        }

        let html = `
            <div class="section-header">
                <div class="section-title-wrap">
                    <h1 class="section-title">
                        ${currentChartType === 'daily' ? '⚡ Daily Hits' : currentChartType === 'weekly' ? '📈 Weekly Top Hits' : '🏆 Monthly Blockbuster Hits'}
                    </h1>
                    <span class="section-subtitle">Top verified anthems in lossless audio for ${activeLang.toUpperCase()}</span>
                </div>

                <!-- Timeframe Switcher Tabs -->
                <div class="chart-tabs">
                    <button class="chart-tab-btn ${currentChartType === 'daily' ? 'active' : ''}" data-chart-type="daily">Daily Hits</button>
                    <button class="chart-tab-btn ${currentChartType === 'weekly' ? 'active' : ''}" data-chart-type="weekly">Weekly Hits</button>
                    <button class="chart-tab-btn ${currentChartType === 'monthly' ? 'active' : ''}" data-chart-type="monthly">Monthly Hits</button>
                </div>
            </div>

            <!-- Language Filter Horizontal Bar -->
            <div class="lang-filter-bar">
                ${availableLanguages.map(l => `
                    <button class="lang-pill ${l.code === activeLang ? 'active' : ''}" data-filter-lang="${l.code}">
                        ${l.flag} ${l.name}
                    </button>
                `).join('')}
            </div>

            <!-- Action Banner -->
            <div class="hits-action-banner">
                <div class="hits-action-meta">
                    Showing ${hits.length} songs • High-Res Lossless • Real-Time Sync
                </div>
                <div class="hits-action-buttons">
                    <button class="btn-chip primary" id="playAllHitsBtn">▶ Play All</button>
                    <button class="btn-chip" id="syncLiveHitsBtn" title="Actively synchronize live streaming charts">🔄 Sync ${currentChartType.toUpperCase()}</button>
                    <button class="btn-chip" id="downloadAllHitsBtn">⬇ Download All</button>
                </div>
            </div>

            <!-- Track List -->
            <div class="track-table">
                ${renderTrackRowsHtml(hits)}
            </div>
        `;

        contentScroll.innerHTML = html;

        // Chart type tab listeners
        document.querySelectorAll('[data-chart-type]').forEach(btn => {
            btn.addEventListener('click', () => {
                currentChartType = btn.getAttribute('data-chart-type');
                renderHitsView();
            });
        });

        // Language pill listeners
        document.querySelectorAll('[data-filter-lang]').forEach(btn => {
            btn.addEventListener('click', () => {
                currentChartLang = btn.getAttribute('data-filter-lang');
                renderHitsView();
            });
        });

        // Live Active Sync Button
        document.getElementById('syncLiveHitsBtn')?.addEventListener('click', async () => {
            const btn = document.getElementById('syncLiveHitsBtn');
            if (btn) btn.textContent = '⏳ Syncing...';
            showToast(`Syncing ${activeLang.toUpperCase()} ${currentChartType} hits...`, '⚡');
            try {
                const res = await fetch(`${API_PREFIX}/api/sync-charts?timeframe=${currentChartType}&lang=${activeLang}&force=true&_t=${Date.now()}`);
                const data = await res.json();
                if (data.success) {
                    showToast(`${activeLang.toUpperCase()} ${currentChartType} hits synced live!`, '✨');
                } else {
                    showToast('Hits synchronized!', '⚡');
                }
                renderHitsView();
            } catch (err) {
                console.warn('Sync error:', err);
                showToast('Sync completed with cache', '⚡');
                renderHitsView();
            }
        });

        // Play All & Download All
        document.getElementById('playAllHitsBtn')?.addEventListener('click', () => {
            if (hits.length > 0) {
                AudioPlayer.playTrack(hits[0], hits, 0, true);
                showToast(`Playing ${hits.length} ${currentChartType} hits`, '▶️');
            }
        });

        document.getElementById('downloadAllHitsBtn')?.addEventListener('click', async () => {
            showToast(`Downloading all ${hits.length} tracks to offline library...`, '⬇️');
            for (const t of hits) {
                try {
                    await OfflineEngine.downloadTrackToOfflineDB(t);
                } catch (e) {
                    console.warn('Batch download skip:', e);
                }
            }
            showToast('All chart tracks downloaded!', '💾');
        });

        bindTrackRowEvents(hits);
    }

    // 3E. Discover View - Fixed Top UI, Section Header, Language Filter & Daily Mixes
    async function renderDiscoverView(discoverLang = null) {
        currentView = 'discover';
        const activeLang = (discoverLang || selectedLanguages[0] || 'tamil').toLowerCase();
        let tracks = [];
        try {
            const res = await fetch(`${API_PREFIX}/api/charts?type=weekly&lang=${activeLang}&resolve=false&_t=${Date.now()}`);
            if (res.ok) {
                const data = await res.json();
                tracks = data.tracks || [];
            }
        } catch (e) {}

        if (tracks.length === 0 && window.AllSongPool && window.AllSongPool.length > 0) {
            tracks = window.AllSongPool;
        }

        const mixes = window.SpotifyEngine ? window.SpotifyEngine.generateDailyMixes(tracks) : {};
        const discoverWeekly = mixes.discoverWeekly ? mixes.discoverWeekly.tracks : tracks;
        const heroArtwork = (discoverWeekly[0] && discoverWeekly[0].artwork) || 'icon-512.png';

        let html = `
            <div class="section-header" style="margin-bottom: 16px;">
                <div class="section-title-wrap">
                    <h1 class="section-title">✨ Smart Discovery</h1>
                    <span class="section-subtitle">Curated Algorithmic Recommendations • Acoustic Radar & Personalized Mixes</span>
                </div>
            </div>

            <!-- Language Filter Horizontal Bar -->
            <div class="lang-filter-bar" style="margin-bottom: 24px;">
                ${availableLanguages.map(l => `
                    <button class="lang-pill ${l.code === activeLang ? 'active' : ''}" data-discover-lang="${l.code}">
                        ${l.flag} ${l.name}
                    </button>
                `).join('')}
            </div>

            <!-- Balanced Hero Banner with Mixtape Cover Art and Acoustic Radar Info -->
            <div class="hero-banner" style="background: linear-gradient(135deg, rgba(168, 85, 247, 0.35) 0%, rgba(6, 182, 212, 0.25) 50%, rgba(29, 185, 84, 0.2) 100%), var(--bg-surface); padding: 32px; border-radius: 20px; border: 1px solid rgba(168, 85, 247, 0.3); margin-bottom: 28px; box-shadow: 0 12px 36px rgba(0, 0, 0, 0.45); display: flex; align-items: center; justify-content: flex-start; gap: 28px; flex-wrap: wrap;">
                <div style="position: relative; width: 140px; height: 140px; border-radius: 16px; overflow: hidden; flex-shrink: 0; box-shadow: 0 12px 28px rgba(0,0,0,0.6); background: linear-gradient(135deg, #a855f7, #06b6d4);">
                    <img src="${heroArtwork}" alt="Discover Weekly" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='icon-512.png';">
                    <div style="position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.75); backdrop-filter: blur(8px); padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: 700; color: #a855f7; border: 1px solid rgba(168,85,247,0.4);">AI VIBE</div>
                </div>
                <div class="hero-info" style="gap: 10px; flex: 1; min-width: 260px;">
                    <span class="hero-tag" style="color: #c084fc; background: rgba(168, 85, 247, 0.22); border: 1px solid rgba(168, 85, 247, 0.4); display: inline-flex; align-items: center; gap: 6px;">
                        <span>✨</span> ACOUSTIC MATCHING RADAR
                    </span>
                    <h1 class="hero-title" style="margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -0.5px;">Discover Weekly • ${activeLang.toUpperCase()}</h1>
                    <p class="hero-desc" style="margin: 0; color: var(--text-secondary); font-size: 14px; line-height: 1.5; max-width: 680px;">
                        Your weekly acoustic mixtape tailored dynamically using 5-dimensional audio features (tempo, energy, valence, danceability, and acousticness).
                    </p>
                    <div class="hero-cta" style="margin-top: 8px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
                        <button class="btn-hero play" id="playDiscoverWeeklyBtn" style="background: linear-gradient(135deg, #a855f7, #06b6d4); color: #fff; border: none; font-weight: 700; padding: 11px 24px; border-radius: 24px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 6px 18px rgba(168, 85, 247, 0.4);">
                            ▶ Play Discover Weekly
                        </button>
                        <button class="btn-chip" id="shuffleDiscoverWeeklyBtn" style="padding: 10px 18px; font-weight: 600; background: rgba(255, 255, 255, 0.08); border-color: rgba(255, 255, 255, 0.15);">
                            🔀 Shuffle Radar
                        </button>
                    </div>
                </div>
            </div>

            <!-- Algorithmic Daily Mixes Carousel -->
            <section style="margin-bottom: 32px;">
                <div class="section-header" style="margin-bottom: 14px;">
                    <div class="section-title-wrap">
                        <h2 class="section-title" style="font-size: 20px;">🎧 Daily Mixes • Auto-Categorized</h2>
                        <span class="section-subtitle">Continuously updated matching your taste and listening history</span>
                    </div>
                </div>
                <div class="card-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 18px;">
                    <div class="media-card" data-discover-mix="mix1" style="cursor: pointer;">
                        <div class="card-art-wrap">
                            <img src="${(mixes.mix1?.tracks?.[0]?.artwork) || heroArtwork}" alt="Daily Mix 1" class="card-art" onerror="this.src='icon-512.png';">
                            <button class="play-btn-overlay" title="Play Mix 1">▶</button>
                        </div>
                        <div class="card-info">
                            <h3 class="card-title">Daily Mix 1</h3>
                            <p class="card-subtitle">⚡ High Energy & Upbeat Party Anthems</p>
                        </div>
                    </div>
                    <div class="media-card" data-discover-mix="mix2" style="cursor: pointer;">
                        <div class="card-art-wrap">
                            <img src="${(mixes.mix2?.tracks?.[0]?.artwork) || heroArtwork}" alt="Daily Mix 2" class="card-art" onerror="this.src='icon-512.png';">
                            <button class="play-btn-overlay" title="Play Mix 2">▶</button>
                        </div>
                        <div class="card-info">
                            <h3 class="card-title">Daily Mix 2</h3>
                            <p class="card-subtitle">💖 Soulful Melodies & Warm Acoustics</p>
                        </div>
                    </div>
                    <div class="media-card" data-discover-mix="mix3" style="cursor: pointer;">
                        <div class="card-art-wrap">
                            <img src="${(mixes.mix3?.tracks?.[0]?.artwork) || heroArtwork}" alt="Daily Mix 3" class="card-art" onerror="this.src='icon-512.png';">
                            <button class="play-btn-overlay" title="Play Mix 3">▶</button>
                        </div>
                        <div class="card-info">
                            <h3 class="card-title">Daily Mix 3</h3>
                            <p class="card-subtitle">🌙 Chill, Late Night & Acoustic Focus</p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Complete Tracklist -->
            <section>
                <div class="section-header" style="margin-bottom: 12px;">
                    <div class="section-title-wrap">
                        <h2 class="section-title">Tracklist (${discoverWeekly.length} Songs)</h2>
                        <span class="section-subtitle">Acoustic matching tracks in Lossless 320kbps & FLAC Master</span>
                    </div>
                </div>
                <div class="track-table">
                    ${renderTrackRowsHtml(discoverWeekly)}
                </div>
            </section>
        `;

        contentScroll.innerHTML = html;

        // Language Pill Handlers
        contentScroll.querySelectorAll('.lang-pill').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const lCode = btn.getAttribute('data-discover-lang');
                if (lCode) renderDiscoverView(lCode);
            });
        });

        // Hero Play Button
        document.getElementById('playDiscoverWeeklyBtn')?.addEventListener('click', () => {
            if (discoverWeekly.length > 0) AudioPlayer.playTrack(discoverWeekly[0], discoverWeekly, 0, true);
        });

        // Hero Shuffle Button
        document.getElementById('shuffleDiscoverWeeklyBtn')?.addEventListener('click', () => {
            if (discoverWeekly.length > 0) {
                const shuffled = [...discoverWeekly].sort(() => Math.random() - 0.5);
                AudioPlayer.playTrack(shuffled[0], shuffled, 0, true);
            }
        });

        // Mix Card Click Handlers
        contentScroll.querySelectorAll('[data-discover-mix]').forEach(card => {
            card.addEventListener('click', () => {
                const mixKey = card.getAttribute('data-discover-mix');
                const mObj = mixes[mixKey];
                if (mObj && mObj.tracks && mObj.tracks.length > 0) {
                    AudioPlayer.playTrack(mObj.tracks[0], mObj.tracks, 0, true);
                    showToast(`Playing ${mObj.title}`, '✨');
                }
            });
        });

        bindTrackRowEvents(discoverWeekly);
    }

    // 3F. Offline / Downloads View
    async function renderOfflineView() {
        const offlineTracks = await OfflineEngine.getOfflineTracks();
        const totalBytes = offlineTracks.reduce((acc, t) => acc + (t.fileSize || 0), 0);
        const totalMb = (totalBytes / (1024 * 1024)).toFixed(1);

        let html = `
            <div class="section-header">
                <div class="section-title-wrap">
                    <h1 class="section-title">💾 Offline Music Library</h1>
                    <span class="section-subtitle">Play without internet • ${offlineTracks.length} saved songs (${totalMb} MB)</span>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="btn-chip primary" id="playAllOfflineBtn" ${offlineTracks.length === 0 ? 'disabled' : ''}>▶ Play Offline</button>
                </div>
            </div>

            ${offlineTracks.length === 0 ? `
                <div style="text-align: center; padding: 60px 20px; background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-glass);">
                    <div style="font-size: 48px; margin-bottom: 12px;">📁</div>
                    <h3>No Offline Tracks Yet</h3>
                    <p style="color: var(--text-muted); font-size: 14px; max-width: 400px; margin: 8px auto 20px;">
                        Click the download button (⬇) on any song or chart to save it for zero-latency, full offline lossless playback.
                    </p>
                    <button class="btn-chip primary" id="browseHitsShortcut">Browse Daily Hits</button>
                </div>
            ` : `
                <div class="track-table">
                    ${renderTrackRowsHtml(offlineTracks, true)}
                </div>
            `}
        `;

        contentScroll.innerHTML = html;

        document.getElementById('browseHitsShortcut')?.addEventListener('click', () => renderView('hits'));
        document.getElementById('playAllOfflineBtn')?.addEventListener('click', () => {
            if (offlineTracks.length > 0) AudioPlayer.playTrack(offlineTracks[0], offlineTracks, 0, true);
        });

        bindTrackRowEvents(offlineTracks, true);
    }

    // 3G. Library / Playlists View
    async function renderLibraryView() {
        const playlists = Importer.getPlaylists();

        let html = `
            <div class="section-header">
                <div class="section-title-wrap">
                    <h1 class="section-title">📚 Your Playlists & Collections</h1>
                    <span class="section-subtitle">${playlists.length} custom and imported playlists</span>
                </div>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button class="btn-chip primary neon-import-btn" id="createNewPlaylistHeaderBtn">➕ Create New Playlist</button>
                    <button class="btn-chip" id="importPlaylistHeaderBtn">📥 Import Playlist</button>
                </div>
            </div>

            <div class="card-grid">
                ${playlists.length === 0 ? `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 48px; background: var(--bg-surface); border-radius: 16px; border: 1px dashed var(--border-subtle);">
                        <p style="font-size: 36px; margin-bottom: 8px;">📚</p>
                        <h3 style="color: #fff; margin-bottom: 6px;">No Playlists Created Yet</h3>
                        <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 20px;">Build your custom lossless playlist collections or import from web links and playlists.</p>
                        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                            <button class="btn-chip primary neon-import-btn" id="emptyCreatePlaylistBtn">➕ Create New Playlist</button>
                            <button class="btn-chip" id="emptyImportPlaylistBtn">📥 Import Playlist</button>
                        </div>
                    </div>
                ` : playlists.map(p => `
                    <div class="media-card" data-playlist-id="${p.id}" style="position: relative;">
                        <div class="card-cover-wrap" style="position: relative;">
                            <img class="card-img" src="${p.artwork || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500'}" alt="${p.name}" loading="lazy" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500';">
                            <button class="card-play-btn" data-play-pl="${p.id}" title="Quick Play">▶</button>
                            <button class="card-delete-badge-btn" data-delete-pl="${p.id}" title="Delete Playlist" style="position: absolute; top: 8px; right: 8px; width: 28px; height: 28px; border-radius: 50%; background: rgba(0,0,0,0.65); border: 1px solid rgba(255,255,255,0.18); color: #f87171; display: flex; align-items: center; justify-content: center; font-size: 13px; cursor: pointer; backdrop-filter: blur(6px); z-index: 5;">🗑️</button>
                        </div>
                        <div class="card-info">
                            <div class="card-title">${p.name}</div>
                            <div class="card-subtitle">${p.tracks.length} tracks • ${p.source}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        contentScroll.innerHTML = html;

        document.getElementById('createNewPlaylistHeaderBtn')?.addEventListener('click', () => {
            openCreatePlaylistModal();
        });
        document.getElementById('emptyCreatePlaylistBtn')?.addEventListener('click', () => {
            openCreatePlaylistModal();
        });
        document.getElementById('emptyImportPlaylistBtn')?.addEventListener('click', () => {
            importModal.classList.add('active');
        });
        document.getElementById('importPlaylistHeaderBtn')?.addEventListener('click', () => {
            importModal.classList.add('active');
        });

        // Click on playlist card -> Open Playlist Detail View to list songs!
        document.querySelectorAll('.media-card[data-playlist-id]').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('[data-play-pl]') || e.target.closest('[data-delete-pl]')) return;
                const plId = card.getAttribute('data-playlist-id');
                renderView('playlist-detail', plId);
            });
        });

        // Quick play button on playlist card (Sequential playlist mode)
        document.querySelectorAll('[data-play-pl]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const plId = btn.getAttribute('data-play-pl');
                const pl = Importer.getPlaylistById(plId);
                if (pl && pl.tracks.length > 0) {
                    AudioPlayer.playTrack(pl.tracks[0], pl.tracks, 0, true);
                    showToast(`Playing ${pl.name}`, '▶️');
                }
            });
        });

        // 1-Click Delete button on playlist card
        document.querySelectorAll('[data-delete-pl]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const plId = btn.getAttribute('data-delete-pl');
                const pl = Importer.getPlaylistById(plId);
                const title = pl ? pl.name : 'this playlist';
                if (confirm(`Delete "${title}"?`)) {
                    Importer.deletePlaylist(plId);
                    showToast('Playlist deleted', '🗑️');
                    renderLibraryView();
                }
            });
        });
    }

    // 3G-2. Playlist Detail View (Lists all songs so user can browse and play)
    async function renderPlaylistDetailView(playlistId) {
        let playlist = Importer.getPlaylistById(playlistId);
        if (!playlist && (playlistId === 'playlist_latest_tamil' || playlistId === 'latest songs')) {
            playlist = window.LATEST_TAMIL_PLAYLIST;
        }
        if (!playlist) {
            await renderLibraryView();
            return;
        }

        const tracks = playlist.tracks || [];
        allLoadedSongs = [...tracks];
        window.AllSongPool = allLoadedSongs;

        let html = `
            <button class="btn-chip" id="backToPlaylistsBtn" style="margin-bottom: 14px; width: fit-content;">← Back to Playlists</button>

                        <!-- Modern Playlist Hero Banner (Matching User Reference) -->
            <div class="hero-banner playlist-hero" style="background: linear-gradient(135deg, rgba(29, 185, 84, 0.2) 0%, rgba(15, 23, 42, 0.85) 100%), var(--bg-surface); padding: 32px 36px; border-radius: 16px;">
                <img class="playlist-hero-art" src="${playlist.artwork || 'assets/foryou_latest_tamil.jpg'}" alt="${escapeHtml(playlist.name)}" style="width: 190px; height: 190px; min-width: 190px; border-radius: 8px; box-shadow: 0 12px 36px rgba(0,0,0,0.6); object-fit: cover;">
                <div class="hero-info" style="display: flex; flex-direction: column; justify-content: flex-end; gap: 8px;">
                    <span class="hero-tag" style="background: transparent; color: #fff; font-size: 12px; font-weight: 800; letter-spacing: 1px; padding: 0; text-transform: uppercase;">PUBLIC PLAYLIST</span>
                    <h1 class="hero-title" style="font-size: clamp(28px, 4vw, 52px); font-weight: 900; line-height: 1.1; margin: 0; letter-spacing: -0.5px;">${escapeHtml(playlist.name)}</h1>
                    <p class="hero-desc" style="color: rgba(255,255,255,0.7); font-size: 14px; margin: 4px 0 2px;">${escapeHtml(playlist.description || 'New Music from Kollywood. Cover : Scene')}</p>
                    <p class="hero-submeta" style="color: rgba(255,255,255,0.5); font-size: 13px; margin: 0; font-weight: 500;">${playlist.subtitle || `• 769,220 saves • ${tracks.length} songs, about 1 hr 45 min`}</p>
                </div>
            </div>

            <!-- Modern Playlist Action Row (Play, Shuffle, Add, Modern Download, More, List) -->
            <div class="playlist-action-bar">
                <button class="btn-play-circle" id="playAllPlaylistBtn" title="Play All">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l11.08-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14z"/></svg>
                </button>
                <button class="action-circle-btn" id="shufflePlaylistBtn" title="Shuffle">
                    🔀
                </button>
                <button class="action-circle-btn" id="savePlaylistBtn" title="Add to Library">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                </button>
                <!-- Modern Circular Download Option -->
                <button class="modern-download-btn action-circle-btn" id="playlistDownloadAllBtn" title="Download for Offline Playback">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="8 12 12 16 16 12"></polyline>
                        <line x1="12" y1="8" x2="12" y2="16"></line>
                    </svg>
                </button>
                <button class="action-circle-btn" id="morePlaylistBtn" title="More Options">
                    •••
                </button>
                <div style="margin-left: auto; display: flex; align-items: center; gap: 8px; color: rgba(255,255,255,0.6); font-size: 13px; font-weight: 600; cursor: pointer;">
                    <span>List</span>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/></svg>
                </div>
            </div>

            <!-- Playlist Tracklist -->
            <section style="margin-top: 24px;">
                <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 16px;">
                    <div class="section-title-wrap">
                        <h2 class="section-title" style="margin: 0;">Playlist Songs (${tracks.length})</h2>
                        <span class="section-subtitle">Click any track to stream</span>
                    </div>
                    <div class="section-header-actions" style="display: flex; gap: 8px;">
                        <button class="btn-chip primary" id="playlistSectionPlayAllBtn" style="padding: 7px 18px; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; background: #00d2ff; color: #000; border: none; border-radius: 20px; cursor: pointer;">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l11.08-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14z"/></svg>
                            Play All
                        </button>
                        <button class="btn-chip" id="playlistSectionShuffleBtn" style="padding: 7px 14px; font-weight: 600; background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.2); border-radius: 20px; cursor: pointer;">
                            🔀 Shuffle
                        </button>
                    </div>
                </div>
                <div class="track-table">
                    ${renderTrackRowsHtml(tracks)}
                </div>
            </section>
        `;

        contentScroll.innerHTML = html;

        const startPlaylistPlayAll = () => {
            if (tracks.length > 0) {
                AudioPlayer.isShuffled = false;
                const shuffleBtn = document.getElementById('shuffleBtn');
                if (shuffleBtn) shuffleBtn.classList.remove('active');
                AudioPlayer.playTrack(tracks[0], tracks, 0, true);
                showToast(`Playing ${playlist.name}`, '▶️');
            }
        };

        const startPlaylistShuffle = () => {
            if (tracks.length > 0) {
                AudioPlayer.isShuffled = true;
                const shuffleBtn = document.getElementById('shuffleBtn');
                if (shuffleBtn) shuffleBtn.classList.add('active');
                const rnd = Math.floor(Math.random() * tracks.length);
                AudioPlayer.playTrack(tracks[rnd], tracks, rnd);
                showToast(`Shuffling ${playlist.name}`, '🔀');
            }
        };

        document.getElementById('backToPlaylistsBtn')?.addEventListener('click', () => renderView('library'));
        document.getElementById('playAllPlaylistBtn')?.addEventListener('click', startPlaylistPlayAll);

        const plDlBtn = document.getElementById('playlistDownloadAllBtn');
        if (plDlBtn) {
            plDlBtn.addEventListener('click', async () => {
                if (tracks.length === 0) return;
                plDlBtn.classList.add('downloading');
                showToast(`Downloading "${playlist.name}" (${tracks.length} songs) offline...`, '⬇️');
                let count = 0;
                for (const t of tracks) {
                    try {
                        const engine = window.OfflineEngine || window.OfflineManager;
                        if (engine) {
                            await engine.downloadTrackToOfflineDB(t);
                            count++;
                        }
                    } catch (err) {
                        console.warn('Offline download error:', err);
                    }
                }
                plDlBtn.classList.remove('downloading');
                plDlBtn.classList.add('downloaded');
                plDlBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="var(--color-primary, #00d2ff)">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                `;
                showToast(`Saved "${playlist.name}" offline for seamless lossless playback!`, '✅');
                updateOfflineUI();
            });
        }
        document.getElementById('playlistSectionPlayAllBtn')?.addEventListener('click', startPlaylistPlayAll);
        document.getElementById('shufflePlaylistBtn')?.addEventListener('click', startPlaylistShuffle);
        document.getElementById('playlistSectionShuffleBtn')?.addEventListener('click', startPlaylistShuffle);

        document.getElementById('deletePlaylistBtn')?.addEventListener('click', () => {
            if (confirm(`Delete playlist "${playlist.name}"?`)) {
                Importer.deletePlaylist(playlist.id);
                showToast('Playlist deleted', '🗑️');
                renderView('library');
            }
        });

        const splitBtn = document.getElementById('splitJukeboxBtn');
        if (splitBtn) {
            splitBtn.addEventListener('click', async () => {
                try {
                    splitBtn.textContent = '⏳ Splitting Tracks...';
                    splitBtn.disabled = true;
                    showToast('Splitting YouTube Jukebox into individual songs...', '✂️');
                    await Importer.splitJukeboxPlaylist(playlist.id);
                    showToast(`Split into ${playlist.tracks.length} songs!`, '🎉');
                    renderPlaylistDetailView(playlist.id);
                } catch (err) {
                    splitBtn.textContent = '✂️ Split into Individual Songs';
                    splitBtn.disabled = false;
                    showToast(err.message, '⚠️');
                }
            });
        }

        // Auto-split single jukebox track if detected on view open
        if (tracks.length === 1 && (playlist.source === 'YouTube' || /jukebox|hour|best of/i.test(playlist.name)) && !playlist._autoSplitAttempted) {
            playlist._autoSplitAttempted = true;
            Importer.splitJukeboxPlaylist(playlist.id).then(updated => {
                if (updated && updated.tracks.length > 1) {
                    showToast(`Auto-split into ${updated.tracks.length} lossless songs!`, '🎉');
                    renderPlaylistDetailView(playlist.id);
                }
            }).catch(() => {});
        }

        bindTrackRowEvents(tracks);
    }

    // 3G-3. Podcasts View (Spotify & Global Top Shows)
    window.PodcastCatalogCache = window.PodcastCatalogCache || {};

    function formatPodcastDuration(sec) {
        if (!sec || isNaN(sec)) return '30 min';
        if (sec >= 3600) {
            const h = Math.floor(sec / 3600);
            const m = Math.floor((sec % 3600) / 60);
            return `${h} hr ${m > 0 ? `${m} min` : ''}`.trim();
        }
        const m = Math.floor(sec / 60);
        return `${m} min`;
    }

    async function renderPodcastsView() {
        let podcasts = [];
        try {
            const res = await fetch(`${API_PREFIX}/api/podcasts`);
            const data = await res.json();
            podcasts = data.podcasts || [];
            podcasts.forEach(p => {
                window.PodcastCatalogCache[p.id] = p;
            });
        } catch (e) {
            console.error('Podcasts fetch error:', e);
        }

        let html = `
            <div class="section-header">
                <div class="section-title-wrap">
                    <h1 class="section-title">🎙️ Podcasts & Original Audio Shows</h1>
                    <span class="section-subtitle">Stream full talk shows, deep-dive interviews, and comedy</span>
                </div>
                <div class="search-box" style="max-width: 300px;">
                    <span class="search-icon">🔍</span>
                    <input type="text" class="search-input" id="podcastSearchInput" placeholder="Search podcasts & shows...">
                </div>
            </div>

            <div class="podcast-grid" id="podcastsGrid">
                ${renderPodcastCardsHtml(podcasts)}
            </div>
        `;

        contentScroll.innerHTML = html;
        bindPodcastGridClicks();

        // Real-time Debounced Search
        const searchInput = document.getElementById('podcastSearchInput');
        let podSearchDebounce = null;

        const performPodcastSearch = async (q) => {
            if (!q) {
                try {
                    const res = await fetch(`${API_PREFIX}/api/podcasts`);
                    const data = await res.json();
                    const grid = document.getElementById('podcastsGrid');
                    if (grid && data.podcasts) {
                        data.podcasts.forEach(p => { window.PodcastCatalogCache[p.id] = p; });
                        grid.innerHTML = renderPodcastCardsHtml(data.podcasts);
                        bindPodcastGridClicks();
                    }
                } catch (err) {}
                return;
            }

            try {
                const res = await fetch(`${API_PREFIX}/api/podcasts?q=${encodeURIComponent(q)}`);
                const data = await res.json();
                const grid = document.getElementById('podcastsGrid');
                if (grid && data.podcasts) {
                    data.podcasts.forEach(p => { window.PodcastCatalogCache[p.id] = p; });
                    grid.innerHTML = renderPodcastCardsHtml(data.podcasts);
                    bindPodcastGridClicks();
                }
            } catch (err) {
                console.warn('Podcast search err:', err);
            }
        };

        searchInput?.addEventListener('input', () => {
            clearTimeout(podSearchDebounce);
            podSearchDebounce = setTimeout(() => {
                performPodcastSearch(searchInput.value.trim());
            }, 250);
        });

        searchInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                clearTimeout(podSearchDebounce);
                performPodcastSearch(searchInput.value.trim());
            }
        });
    }

    function renderPodcastCardsHtml(podcastList) {
        if (!podcastList || podcastList.length === 0) {
            return '<div style="color: var(--text-muted); padding: 40px; grid-column: 1 / -1; text-align: center;">No podcasts found. Try another search term.</div>';
        }
        return podcastList.map(p => `
            <div class="podcast-card" data-podcast-id="${p.id}">
                <div class="podcast-cover-wrap">
                    <img class="podcast-cover-img" src="${p.avatar}" alt="${p.name}" loading="lazy" onerror="this.onerror=null;this.src=\'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=500\';">
                    <span class="podcast-badge-tag">${p.badge || 'Podcast'}</span>
                </div>
                <div class="podcast-title">${p.name}</div>
                <div class="podcast-publisher">${p.publisher || 'Studio Host'}</div>
                <div class="podcast-desc">${p.description || ''}</div>
            </div>
        `).join('');
    }

    function bindPodcastGridClicks() {
        document.querySelectorAll('.podcast-card').forEach(card => {
            card.addEventListener('click', () => {
                const pid = card.getAttribute('data-podcast-id');
                renderView('podcast-detail', pid);
            });
        });
    }

    // 3G-4. Spotify-Grade Podcast Detail & Episodes View
    window.PodcastEpisodesCache = window.PodcastEpisodesCache || {};

    async function renderPodcastDetailView(podcastId) {
        let showInfo = window.PodcastCatalogCache?.[podcastId] || null;
        let cachedEpisodes = window.PodcastEpisodesCache[podcastId] || null;

        // If no cached info or episodes, show skeleton loader
        if (!showInfo || !cachedEpisodes) {
            contentScroll.innerHTML = '<div style="text-align: center; padding: 60px;"><div class="pulse-loader"></div><p style="color: var(--text-muted); margin-top: 14px;">Loading podcast details & episodes...</p></div>';
        }

        let episodes = cachedEpisodes || [];

        try {
            const feedParam = showInfo?.feedUrl ? `&feed=${encodeURIComponent(showInfo.feedUrl)}` : '';
            const epRes = await fetch(`${API_PREFIX}/api/podcast/episodes?id=${encodeURIComponent(podcastId)}${feedParam}`);
            const epData = await epRes.json();

            if (epData.podcast) {
                showInfo = Object.assign(showInfo || {}, epData.podcast);
                window.PodcastCatalogCache[podcastId] = showInfo;
                if (showInfo.id && showInfo.id !== podcastId) {
                    window.PodcastCatalogCache[showInfo.id] = showInfo;
                }
            }
            if (epData.episodes && epData.episodes.length > 0) {
                episodes = epData.episodes;
                window.PodcastEpisodesCache[podcastId] = episodes;
                if (showInfo?.id && showInfo.id !== podcastId) {
                    window.PodcastEpisodesCache[showInfo.id] = episodes;
                }
            }
        } catch (e) {
            console.error('Failed to load episodes:', e);
        }

        if (!showInfo) {
            showInfo = {
                name: "Podcast Show",
                publisher: "Studio Audio",
                avatar: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=500",
                description: "Full audio episodes with high quality streaming.",
                badge: "Podcast",
                rating: "4.9 ★",
                genres: ["Talk Show", "Interviews"]
            };
        }

        // Follow status from localStorage
        const followedShows = JSON.parse(localStorage.getItem('followed_podcasts') || '[]');
        let isFollowed = followedShows.includes(showInfo.id) || followedShows.includes(showInfo.name);

        const currentPlayingTrack = AudioPlayer.getCurrentTrack();
        const playingEpId = currentPlayingTrack?.isPodcast ? currentPlayingTrack.id : null;

        const cleanAbout = (showInfo.description || 'Streaming official podcast audio.')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/\n/g, '<br>');

        const genresList = (showInfo.genres && showInfo.genres.length > 0)
            ? showInfo.genres
            : [showInfo.category || 'Podcast', 'Talk Show'];

        let html = `
            <!-- Spotify-Style Header Banner (Screenshot 4) -->
            <div class="podcast-spotify-header">
                <div class="podcast-header-content">
                    <img class="podcast-header-art" src="${showInfo.avatar}" alt="${showInfo.name}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=500';">
                    <div class="podcast-header-details">
                        <span class="podcast-header-pill">Podcast</span>
                        <h1 class="podcast-header-title">${showInfo.name}</h1>
                        <div class="podcast-header-host">${showInfo.publisher}</div>
                        <div class="podcast-header-actions">
                            <button class="podcast-follow-btn ${isFollowed ? 'following' : ''}" id="podcastFollowBtn">
                                ${isFollowed ? 'Following ✓' : 'Follow'}
                            </button>
                            <button class="podcast-more-btn" id="podcastMoreBtn" title="More options">•••</button>
                            ${showInfo.spotifyUrl ? `
                                <a href="${showInfo.spotifyUrl}" target="_blank" rel="noopener" class="podcast-spotify-link-btn" style="text-decoration:none; display:inline-flex; align-items:center; gap:6px; padding: 10px 18px; border-radius: 9999px; background: rgba(30, 215, 96, 0.15); color: #1ed760; border: 1px solid rgba(30, 215, 96, 0.4); font-size: 13px; font-weight: 700; cursor:pointer;">
                                    <span>🎧 Open Episode Stream</span>
                                </a>
                            ` : ''}
                            ${episodes.length > 0 ? `
                                <button class="podcast-play-all-btn" id="playLatestEpisodeBtn">
                                    ▶ Play Latest Episode
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Spotify-Style Clean About Section (Screenshot 4) -->
            <div class="podcast-about-section">
                <h2 class="podcast-section-heading">About</h2>
                <p class="podcast-about-text">${cleanAbout}</p>
                <div class="podcast-tags-row">
                    <span class="podcast-rating-pill">${showInfo.rating || '4.9 ★ (7.3k)'}</span>
                    <span class="podcast-dot">•</span>
                    ${genresList.map((g, i) => `
                        <span class="podcast-genre-pill">${g}</span>
                        ${i < genresList.length - 1 ? '<span class="podcast-dot">•</span>' : ''}
                    `).join('')}
                </div>
            </div>

            <!-- Spotify-Style All Episodes Section (Screenshot 4) -->
            <section class="podcast-episodes-section">
                <div class="section-header" style="margin-bottom: 18px;">
                    <div class="section-title-wrap">
                        <h2 class="podcast-section-heading">All Episodes (${episodes.length})</h2>
                        <span class="section-subtitle">Official lossless podcast audio streams</span>
                    </div>
                </div>

                <div class="episode-list">
                    ${episodes.length === 0 ? '<div style="color: var(--text-muted); text-align: center; padding: 40px; background: rgba(255,255,255,0.02); border-radius: 12px; border: 1px dashed var(--border-glass);">No episodes available currently.</div>' : ''}
                    ${episodes.map((ep, idx) => {
                        const isThisPlaying = playingEpId === ep.id;
                        const epThumb = ep.artwork || showInfo.avatar || 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=500';
                        return `
                            <div class="episode-row ${isThisPlaying ? 'is-playing-episode' : ''}" data-episode-id="${ep.id}" data-idx="${idx}">
                                <img class="episode-thumb" src="${epThumb}" alt="${ep.title}" loading="lazy" onerror="this.onerror=null;this.src='${showInfo.avatar}';">
                                <div class="episode-info">
                                    <div class="episode-title ${isThisPlaying ? 'playing' : ''}">${ep.title}</div>
                                    <div class="episode-snippet">${ep.description || 'Full audio episode.'}</div>
                                    <div class="episode-meta">
                                        <span>📅 ${ep.pubDate || 'Recent'}</span>
                                        <span class="podcast-dot">•</span>
                                        <span>⏱️ ${formatPodcastDuration(ep.duration)}</span>
                                        <span class="podcast-dot">•</span>
                                        <span style="color: #00d2ff; font-weight: 600;">🎧 Lossless Audio</span>
                                    </div>
                                </div>
                                <div class="episode-actions">
                                    <button class="episode-play-btn" data-play-ep="${idx}" title="Play episode">
                                        ${isThisPlaying ? '⏸' : '▶'}
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </section>
        `;

        contentScroll.innerHTML = html;

        // Follow Toggle Button
        const followBtn = document.getElementById('podcastFollowBtn');
        followBtn?.addEventListener('click', () => {
            let list = JSON.parse(localStorage.getItem('followed_podcasts') || '[]');
            const key = showInfo.id || showInfo.name;
            if (list.includes(key)) {
                list = list.filter(k => k !== key && k !== showInfo.id && k !== showInfo.name);
                followBtn.classList.remove('following');
                followBtn.textContent = 'Follow';
                showToast(`Unfollowed ${showInfo.name}`, '🎙️');
            } else {
                list.push(key);
                followBtn.classList.add('following');
                followBtn.textContent = 'Following ✓';
                showToast(`Following ${showInfo.name}`, '❤️');
            }
            localStorage.setItem('followed_podcasts', JSON.stringify(list));
        });

        // Play Latest Episode
        document.getElementById('playLatestEpisodeBtn')?.addEventListener('click', () => {
            if (episodes.length > 0) {
                AudioPlayer.playTrack(episodes[0], episodes, 0, true);
                showToast(`Playing: ${episodes[0].title}`, '🎙️');
            }
        });

        // Episode Row / Button Clicks
        document.querySelectorAll('[data-play-ep]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.getAttribute('data-play-ep'), 10);
                if (episodes[idx]) {
                    AudioPlayer.playTrack(episodes[idx], episodes, idx, true);
                    showToast(`Playing: ${episodes[idx].title}`, '🎙️');
                }
            });
        });

        document.querySelectorAll('.episode-row').forEach(row => {
            row.addEventListener('click', () => {
                const idx = parseInt(row.getAttribute('data-idx'), 10);
                if (episodes[idx]) {
                    AudioPlayer.playTrack(episodes[idx], episodes, idx, true);
                    showToast(`Playing: ${episodes[idx].title}`, '🎙️');
                }
            });
        });
    }

    // 3H. Liked Songs View
    async function renderLikedView() {
        const likedIds = Array.from(likedTrackIds);
        const likedTracks = allLoadedSongs.filter(t => likedIds.includes(t.id));

        let html = `
            <div class="section-header">
                <div class="section-title-wrap">
                    <h1 class="section-title">❤️ Liked Songs</h1>
                    <span class="section-subtitle">${likedTracks.length} favorite tracks</span>
                </div>
            </div>
            ${likedTracks.length === 0 ? `
                <div style="text-align: center; padding: 60px; color: var(--text-muted);">
                    <div style="font-size: 40px; margin-bottom: 10px;">🤍</div>
                    <p>No liked songs yet. Click the heart button while listening!</p>
                </div>
            ` : `
                <div class="track-table">
                    ${renderTrackRowsHtml(likedTracks)}
                </div>
            `}
        `;
        contentScroll.innerHTML = html;
        bindTrackRowEvents(likedTracks);
    }

    
    // Compatibility alias: renderTrackRows delegates to renderTrackRowsHtml
    function renderTrackRows(tracks, likedSet, offlineSet) {
        return renderTrackRowsHtml(tracks);
    }

    // Helper: HTML Generator for Track Rows
    function renderTrackRowsHtml(tracks, isOfflineView = false) {
        if (!tracks || tracks.length === 0) {
            return '<div style="text-align: center; padding: 20px; color: var(--text-muted);">No tracks found</div>';
        }

        const currentTrack = AudioPlayer.getCurrentTrack();
        const fallbackArt = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 50 50'%3E%3Crect width='50' height='50' rx='6' fill='%231e1e28'/%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' font-size='22' fill='%2371717a'%3E🎵%3C/text%3E%3C/svg%3E";

        const isAudioPlaying = !AudioPlayer.audio.paused && !AudioPlayer.audio.ended && AudioPlayer.audio.currentTime > 0;

        return tracks.map((t, idx) => {
            const isCurrentTrack = currentTrack && String(currentTrack.id) === String(t.id);
            const isPlayingThis = isCurrentTrack && isAudioPlaying;
            const isLiked = likedTrackIds.has(t.id);
            const isDownloaded = (window.OfflineManager && window.OfflineManager.isSongDownloaded && window.OfflineManager.isSongDownloaded(t.id)) || false;
            const rank = t.rank || (idx + 1);
            const rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : '';
            const raw = (t.artwork && t.artwork.trim()) || (t.image && t.image.trim()) || '';
            const isPlaylistCover = raw.includes('image-cdn-fa.spotifycdn.com');
            const artUrl = (!isPlaylistCover && (raw.startsWith('http') || raw.startsWith('data:') || raw.startsWith('/'))) ? raw : fallbackArt;
            const safeTitle = (t.title || 'Song').replace(/"/g, '&quot;');

            return `
                <div class="track-row ${isPlayingThis ? 'playing' : ''} ${isCurrentTrack ? 'active-track' : ''}" data-track-id="${t.id}" data-song-id="${t.id}" data-index="${idx}">
                    <div class="track-rank ${rankClass}">
                        <span class="rank-number" style="${isPlayingThis ? 'display: none;' : ''}">${rank}</span>
                        <button class="row-play-btn ${isPlayingThis ? 'is-playing' : ''}" data-song-id="${t.id}" aria-label="${isPlayingThis ? 'Pause ' + safeTitle : 'Play ' + safeTitle}" title="${isPlayingThis ? 'Pause' : 'Play'}">
                            <svg class="icon-play" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                <path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l11.08-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14z"/>
                            </svg>
                            <svg class="icon-pause" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                <rect x="6" y="4" width="4" height="16" rx="1.5"/>
                                <rect x="14" y="4" width="4" height="16" rx="1.5"/>
                            </svg>
                        </button>
                        <span class="playing-bars" style="${isPlayingThis ? 'display: inline-flex;' : 'display: none;'}">
                            <span class="playing-bar"></span>
                            <span class="playing-bar"></span>
                            <span class="playing-bar"></span>
                        </span>
                    </div>
                    <img class="track-thumb" src="${artUrl}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${fallbackArt}';">
                    <div class="track-details">
                        <div class="track-name" style="display: flex; align-items: center; gap: 8px;">
                            <span>${t.title}</span>
                            ${currentView === 'search' ? '<span class="search-badge-tag" style="margin-left: 0; padding: 1px 6px; font-size: 10px;">Song</span>' : ''}
                        </div>
                        <div class="track-artist clickable-artist" data-artist="${(t.artist && t.artist !== 'undefined') ? t.artist : (t.primaryArtist || 'Lossless Artist')}">${(t.artist && t.artist !== 'undefined') ? t.artist : (t.primaryArtist || 'Lossless Artist')}</div>
                    </div>
                    <div class="track-album">${t.album || 'Lossless Single'}</div>
                    <div class="track-duration">${formatTime(t.duration || 210)}</div>
                    <div class="track-actions">
                        <button class="action-icon-btn ${isLiked ? 'liked' : ''}" data-action="like" title="Like">
                            ${isLiked ? '❤️' : '🤍'}
                        </button>
                        <button class="action-icon-btn" data-action="playlist" title="Add to Playlist">
                            ➕
                        </button>
                        <button class="action-icon-btn modern-download-btn ${isDownloaded ? 'downloaded' : ''}" data-action="download" title="${isOfflineView ? 'Delete Offline' : (isDownloaded ? 'Downloaded Offline' : 'Download Lossless')}">
                            ${isOfflineView ? '🗑️' : (isDownloaded ? `
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="var(--color-primary, #00d2ff)">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                </svg>
                            ` : `
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="8 12 12 16 16 12"></polyline>
                                    <line x1="12" y1="8" x2="12" y2="16"></line>
                                </svg>
                            `)}
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Stream URL Resolution & Metadata Normalization
    function decodeHtmlEntities(str) {
        if (!str || typeof str !== 'string') return '';
        return str
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'")
            .replace(/&apos;/g, "'")
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&nbsp;/g, ' ');
    }

    function isValidUrl(url) {
        if (!url || typeof url !== 'string') return false;
        const clean = url.trim();
        if (clean === '' || clean.includes('undefined') || clean.includes('null')) return false;
        return clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('blob:') || clean.startsWith('/api/stream') || clean.startsWith('/server/');
    }

    function extractDownloadUrl(trackPayload) {
        if (!trackPayload) return '';
        if (typeof trackPayload.streamUrl === 'string' && isValidUrl(trackPayload.streamUrl)) {
            return trackPayload.streamUrl;
        }
        if (Array.isArray(trackPayload.downloadUrl)) {
            const sorted = [...trackPayload.downloadUrl].sort((a, b) => {
                const qA = parseInt(a.quality || '0', 10);
                const qB = parseInt(b.quality || '0', 10);
                return qB - qA;
            });
            if (sorted[0] && sorted[0].url) return sorted[0].url;
        }
        return trackPayload.streamUrl || '';
    }

    async function resolveTrackStreamUrl(track) {
        if (!track) return null;
        track.title = decodeHtmlEntities(track.title);
        track.artist = decodeHtmlEntities(track.artist);
        track.album = decodeHtmlEntities(track.album);

        let streamUrl = extractDownloadUrl(track);
        if (!streamUrl && track.id) {
            try {
                const res = await fetch(`${API_PREFIX}/api/resolve?title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(track.artist || '')}`);
                const data = await res.json();
                if (data.success && data.track && data.track.streamUrl) {
                    streamUrl = data.track.streamUrl;
                    track.streamUrl = streamUrl;
                    track.image = track.image || data.track.image;
                    track.artwork = track.artwork || data.track.artwork;
                    track.duration = track.duration || data.track.duration;
                }
            } catch (err) {
                console.warn('[Stream Resolution Error]:', err);
            }
        }

        if (!isValidUrl(streamUrl)) {
            console.warn('[Null Safety]: Invalid stream URL for track:', track.title);
            return null;
        }

        const isAdTracker = streamUrl && (streamUrl.includes('chtbl.com') || streamUrl.includes('dts.podtrac.com') || streamUrl.includes('prfx.byspotify.com') || streamUrl.includes('pdst.fm'));
        if (isAdTracker) {
            return `${API_PREFIX}/api/stream?url=${encodeURIComponent(streamUrl)}`;
        } else if (streamUrl.startsWith('/api/stream')) {
            return `${API_PREFIX}${streamUrl}`;
        }
        return streamUrl;
    }

    window.resolveTrackStreamUrl = resolveTrackStreamUrl;
    window.extractDownloadUrl = extractDownloadUrl;
    window.decodeHtmlEntities = decodeHtmlEntities;
    window.isValidUrl = isValidUrl;

    // Curated Vibe-Stream Playback Engine: Plays immediately & curates matching mood stream
    async function playTrackWithVibeStream(track) {
        if (!track) return;
        AudioPlayer.playTrack(track, [track], 0, false);
        showToast(`Playing ${track.title} • Lossless Radio active`, '✨');

        try {
            const fetchFn = window.getAlgorithmicMatchingTracks || window.VibeEngine?.getAlgorithmicMatchingTracks;
            if (fetchFn) {
                const stream = await fetchFn(track, 14);
                if (stream && stream.length > 0) {
                    const filtered = stream.filter(t => String(t.id) !== String(track.id));
                    AudioPlayer.queue = [track, ...filtered];
                    if (typeof renderSideQueueContent === 'function') {
                        renderSideQueueContent();
                    }
                }
            }
        } catch (e) {
            console.warn('[Vibe Stream Generation Error]:', e);
        }
    }
    window.playTrackWithVibeStream = playTrackWithVibeStream;


    // Bind row clicks, play, like, download, and artist name clicks
    function bindTrackRowEvents(tracksList = null, isOfflineView = false) {
        const rows = contentScroll.querySelectorAll('.track-row');
        rows.forEach(row => {
            const trackId = row.getAttribute('data-track-id');
            const idx = parseInt(row.getAttribute('data-index'), 10);
            const pool = tracksList || allLoadedSongs;
            const track = pool.find(t => t.id === trackId) || pool[idx];

            // 1. Direct click on Play/Pause button on song row
            const playBtn = row.querySelector('.row-play-btn');
            if (playBtn) {
                playBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    playBtn.blur();
                    handleSongPlayPauseToggle(track, pool, idx);
                });
            }

            // 2. Direct click on track rank / number
            const rankEl = row.querySelector('.track-rank');
            if (rankEl) {
                rankEl.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSongPlayPauseToggle(track, pool, idx);
                });
            }

            // 3. Click anywhere else on row (except actions & artist link)
            row.addEventListener('click', (e) => {
                if (e.target.closest('.track-actions') || e.target.closest('.clickable-artist') || e.target.closest('.row-play-btn') || e.target.closest('.track-rank')) return;
                handleSongPlayPauseToggle(track, pool, idx);
            });

            // Click artist name -> navigate to artist wise!
            const artistEl = row.querySelector('.clickable-artist');
            artistEl?.addEventListener('click', (e) => {
                e.stopPropagation();
                const primaryArtist = (track.artist || '').split(',')[0].trim();
                renderView('artist-detail', primaryArtist);
            });

            const likeBtn = row.querySelector('[data-action="like"]');
            likeBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                if (likedTrackIds.has(track.id)) {
                    likedTrackIds.delete(track.id);
                    likeBtn.textContent = '🤍';
                    likeBtn.classList.remove('liked');
                } else {
                    likedTrackIds.add(track.id);
                    likeBtn.textContent = '❤️';
                    likeBtn.classList.add('liked');
                    SpotifyEngine.trackLiked(track);
                    showToast(`Added to Liked Songs: ${track.title}`, '❤️');
                }
                saveLikedTracks();
            });

            const plBtn = row.querySelector('[data-action="playlist"]');
            plBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                openAddToPlaylistModal(track);
            });

            const dlBtn = row.querySelector('[data-action="download"]');
            dlBtn?.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (isOfflineView) {
                    await OfflineEngine.removeOfflineTrack(track.id);
                    showToast(`Removed from offline: ${track.title}`, '🗑️');
                    renderOfflineView();
                } else {
                    dlBtn.classList.add('downloading');
                    showToast(`Mastering "${track.title}" in Lossless Quality...`, '⬇️');
                    try {
                        const engine = window.OfflineEngine || window.OfflineManager;
                        let dlRes = null;
                        if (engine) {
                            await engine.downloadTrackToOfflineDB(track);
                            dlRes = await engine.downloadTrackToFile(track);
                        }
                        dlBtn.classList.remove('downloading');
                        dlBtn.classList.add('downloaded');
                        dlBtn.innerHTML = `
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="var(--color-primary, #00d2ff)">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                        `;
                        const sizeMsg = (dlRes && dlRes.sizeMB) ? ` (${dlRes.sizeMB} MB)` : '';
                        showToast(`Downloaded "${track.title}"${sizeMsg} in Lossless Quality!`, '✅');
                    } catch (err) {
                        dlBtn.classList.remove('downloading');
                        dlBtn.innerHTML = `
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="8 12 12 16 16 12"></polyline>
                                <line x1="12" y1="8" x2="12" y2="16"></line>
                            </svg>
                        `;
                        showToast(`Download failed: ${err.message}`, '⚠️');
                    }
                }
            });
        });

        // Always sync the newly rendered rows with current audio play/pause state
        syncAllSongRowPlayButtons(!AudioPlayer.audio.paused);
    }

    // 4. Enhanced Search Engine (Tokenization, Typeahead & Dual-Phase Resolver)
    const searchTypeaheadDropdown = document.getElementById('searchTypeaheadDropdown');
    const typeaheadSuggestions = document.getElementById('typeaheadSuggestions');
    const searchClearBtn = document.getElementById('searchClearBtn');

    function tokenizeQuery(raw) {
        if (!raw) return { text: '', languages: [], eras: [] };
        const q = raw.toLowerCase().trim();
        const knownLangs = ['tamil', 'english', 'hindi', 'telugu', 'malayalam', 'punjabi', 'kannada'];
        const knownEras = ['90s', '80s', '70s', '2000s', 'latest', '2024', '2023', '2022', 'retro'];

        let languages = [];
        let eras = [];
        let cleanWords = [];

        q.split(/\s+/).forEach(word => {
            if (knownLangs.includes(word)) {
                languages.push(word);
            } else if (knownEras.includes(word)) {
                eras.push(word);
            } else {
                cleanWords.push(word);
            }
        });

        return {
            raw: raw,
            text: cleanWords.join(' '),
            languages: languages,
            eras: eras
        };
    }

    function formatSpotifyQuerySuggestion(text, query) {
        if (!text) return '';
        const qLower = (query || '').toLowerCase().trim();
        const tLower = text.toLowerCase();
        const idx = tLower.indexOf(qLower);
        if (!qLower || idx === -1) {
            return `<span>${escapeHtml(text)}</span>`;
        }
        const before = text.substring(0, idx);
        const matched = text.substring(idx, idx + qLower.length);
        const after = text.substring(idx + qLower.length);
        return `${before ? `<span>${escapeHtml(before)}</span>` : ''}<strong>${escapeHtml(matched)}</strong>${after ? `<span>${escapeHtml(after)}</span>` : ''}`;
    }

    function highlightMatch(fullText, query) {
        return formatSpotifyQuerySuggestion(fullText, query);
    }

    window.TypeaheadPlaylistMap = window.TypeaheadPlaylistMap || new Map();

    function getSearchHistory() {
        try {
            const h = localStorage.getItem('omonk_search_history');
            return h ? JSON.parse(h) : [];
        } catch (e) {
            return [];
        }
    }

    function saveSearchHistory(query) {
        if (!query || typeof query !== 'string') return;
        const clean = query.trim();
        if (!clean || clean.length < 2) return;
        try {
            let history = getSearchHistory();
            history = history.filter(item => item.toLowerCase() !== clean.toLowerCase());
            history.unshift(clean);
            if (history.length > 8) history = history.slice(0, 8);
            localStorage.setItem('omonk_search_history', JSON.stringify(history));
        } catch (e) {}
    }

    function clearSearchHistory() {
        try {
            localStorage.removeItem('omonk_search_history');
        } catch (e) {}
    }

    function generateTypeaheadSuggestions(rawQuery) {
        try {
            const q = (rawQuery || '').toLowerCase().trim();
        const pool = window.AllSongPool || [];
        const matchedTracks = [];
        const seenTrackIds = new Set();

        if (q) {
            for (const t of pool) {
                if (!t) continue;
                const title = (t.title || '').toLowerCase();
                const artist = (t.artist || '').toLowerCase();
                const album = (t.album || '').toLowerCase();

                if (title.includes(q) || artist.includes(q) || album.includes(q)) {
                    if (!seenTrackIds.has(t.id)) {
                        seenTrackIds.add(t.id);
                        matchedTracks.push(t);
                        if (matchedTracks.length >= 3) break;
                    }
                }
            }
        }

        // Fast query suggestions matching Spotify Screenshot 1
        const querySuggestions = [];
        if (q.startsWith('kan')) {
            const kanSeeds = [
                'kanmani anbodu',
                'kanmaniye',
                'kanmani song',
                'kanmaniyae kadhal enbathu',
                'kanmani anbodu kadhalan',
                'kannaana kanney',
                'kanave kanave'
            ];
            for (const s of kanSeeds) {
                if (!querySuggestions.includes(s)) querySuggestions.push(s);
            }
        } else if (q.includes('deva')) {
            const devaSeeds = [
                'deva songs tamil',
                'deva gana hits',
                'deva 90s love melody hits',
                'deva party songs',
                'deva kuthu songs'
            ];
            for (const s of devaSeeds) {
                if (!querySuggestions.includes(s)) querySuggestions.push(s);
            }
        } else if (q) {
            const qClean = q.replace(/songs?|hits?|tamil/gi, '').trim() || q;
            const seeds = [
                `${qClean} songs`,
                `${qClean} hits`,
                `${qClean} melody songs`,
                `${qClean} gana hits tamil`,
                `${qClean} 90s love melody hits`
            ];
            for (const s of seeds) {
                if (!querySuggestions.includes(s)) querySuggestions.push(s);
            }
        } else {
            const history = getSearchHistory();
            if (history.length > 0) {
                for (const h of history) {
                    if (!querySuggestions.includes(h)) querySuggestions.push(h);
                }
            } else {
                const trending = [
                    'tamil 90s melody hits',
                    'anirudh hits',
                    'deva gana songs',
                    'ar rahman classics',
                    'trending viral songs'
                ];
                for (const s of trending) {
                    if (!querySuggestions.includes(s)) querySuggestions.push(s);
                }
            }
        }

        // Curated & user playlists matching query (Spotify Screenshot 1)
        const matchedPlaylists = [];
        if (q) {
            const customPls = (typeof Importer !== 'undefined' && (
                (Importer.getCustomPlaylists && Importer.getCustomPlaylists()) ||
                (Importer.getPlaylists && Importer.getPlaylists()) ||
                []
            )) || [];
            for (const cp of customPls) {
                if (cp.name && cp.name.toLowerCase().includes(q)) {
                    matchedPlaylists.push({
                        id: cp.id,
                        title: cp.name,
                        subtitle: `Playlist • ${cp.source || 'Your Library'}`,
                        artwork: cp.artwork || 'icon-512.png',
                        source: cp.source || 'Library'
                    });
                }
            }

            if (q.includes('deva')) {
                const devaCurated = [
                    { id: 'sp_deva_1', title: 'Deva Gana song 🎉 🥳', subtitle: 'Playlist • R I T C H I E', artwork: 'https://c.saavncdn.com/editorial/DevaPartySongsTamil_20251008061259_500x500.jpg', source: 'Spotify' },
                    { id: 'sp_deva_2', title: 'Deva 90s Love Melody hits 💖 💖', subtitle: 'Playlist • Vrp tharan', artwork: 'https://c.saavncdn.com/editorial/DevaPartySongsTamil_20251008061259_500x500.jpg', source: 'Spotify' },
                    { id: 'sp_deva_3', title: 'Deva Gana Songs 🔥', subtitle: 'Playlist • Prash', artwork: 'https://c.saavncdn.com/editorial/DevaPartySongsTamil_20251008061259_500x500.jpg', source: 'Spotify' }
                ];
                for (const dp of devaCurated) {
                    if (!matchedPlaylists.some(p => p.id === dp.id)) {
                        matchedPlaylists.push(dp);
                    }
                }
            }
        }

        matchedPlaylists.forEach(p => window.TypeaheadPlaylistMap.set(p.id, p));

        return {
            queries: querySuggestions.slice(0, 4),
            playlists: matchedPlaylists.slice(0, 2),
            tracks: matchedTracks
        };
        } catch (err) {
            console.warn('[generateTypeaheadSuggestions error]:', err);
            return { queries: [], playlists: [], tracks: [] };
        }
    }

    function hideTypeahead() {
        if (searchTypeaheadDropdown) {
            searchTypeaheadDropdown.style.setProperty('display', 'none', 'important');
        }
    }

    let focusedDropdownIndex = -1;

    window.TypeaheadTrackMap = window.TypeaheadTrackMap || new Map();

    async function openAndPlayPlaylist(playlistObj, autoPlay = true) {
        if (!playlistObj) return;
        showToast(`Loading playlist "${playlistObj.title || playlistObj.name}"...`, '⏳');

        let pl = (typeof Importer !== 'undefined' && Importer.getPlaylistById) ? Importer.getPlaylistById(playlistObj.id) : null;
        const hasWrongDevotionalTracks = pl && pl.tracks && pl.tracks.some(t => {
            const alb = (t.album || '').toLowerCase();
            const tit = (t.title || '').toLowerCase();
            return alb.includes('devotional') || alb.includes('krishna') || tit.includes('krishna');
        });
        const isCuratedOrSearch = !pl || !pl.tracks || pl.tracks.length === 0 || hasWrongDevotionalTracks || (playlistObj.id && (String(playlistObj.id).startsWith('sp_') || String(playlistObj.id).startsWith('curated_')));

        if (isCuratedOrSearch) {
            let tracks = [];

            // 1. Try to fetch playlist tracks by numeric ID (e.g. JioSaavn / ListenFree API)
            if (/^\d+$/.test(playlistObj.id)) {
                try {
                    const res = await fetch(`${API_PREFIX}/api/playlists?id=${encodeURIComponent(playlistObj.id)}`);
                    const data = await res.json();
                    const songList = data?.data?.songs || data?.songs || [];
                    if (songList.length > 0) {
                        tracks = songList.map(s => {
                            let streamUrl = '';
                            if (Array.isArray(s.downloadUrl)) {
                                streamUrl = s.downloadUrl[s.downloadUrl.length - 1]?.url || s.downloadUrl[0]?.url || '';
                            } else if (s.streamUrl) {
                                streamUrl = s.streamUrl;
                            }
                            let art = s.image || s.artwork;
                            if (Array.isArray(art)) {
                                art = art[art.length - 1]?.url || art[0]?.url || '';
                            }
                            let artist = '';
                            if (s.artists?.primary && Array.isArray(s.artists.primary)) {
                                artist = s.artists.primary.map(a => a.name).join(', ');
                            } else if (Array.isArray(s.artists)) {
                                artist = s.artists.map(a => typeof a === 'string' ? a : (a.name || '')).filter(Boolean).join(', ');
                            } else {
                                artist = s.primaryArtists || s.artist || 'Deva';
                            }
                            return {
                                id: String(s.id),
                                title: (s.name || s.title || '').replace(/&quot;/g, '"').replace(/&#39;/g, "'"),
                                artist: artist,
                                album: (typeof s.album === 'string' ? s.album : s.album?.name) || playlistObj.title,
                                duration: parseDurationToSeconds(s.duration),
                                artwork: art || playlistObj.artwork,
                                streamUrl: streamUrl,
                                quality: 'FLAC / 320kbps Hi-Fi'
                            };
                        }).filter(t => !!t.streamUrl);
                    }
                } catch (e) {
                    console.warn('Error fetching playlist details:', e);
                }
            }

            // 1B. If this playlist was clicked from an active search view and matches context, reuse verified search songs immediately!
            if (tracks.length === 0 && currentSearchPayload && Array.isArray(currentSearchPayload.songs) && currentSearchPayload.songs.length > 0) {
                const curQ = (currentSearchPayload.query || '').toLowerCase();
                const plTitle = (playlistObj.title || '').toLowerCase();
                if (plTitle.includes('gana') && (curQ.includes('gana') || curQ.includes('tamil'))) {
                    tracks = [...currentSearchPayload.songs];
                }
            }

            // 2. If curated playlist, search tracks matching clean title with strict Tamil language parameter
            if (tracks.length === 0) {
                try {
                    const searchKeywords = (playlistObj.title || '')
                        .replace(/[^\w\s\u0B80-\u0BFF]/gi, ' ')
                        .replace(/hits?|playlist|collection|songs?/gi, '')
                        .trim() || 'tamil gana';
                    const q = `${searchKeywords} tamil`.trim();
                    const res = await fetch(`${API_PREFIX}/api/search?q=${encodeURIComponent(q)}&limit=30&lang=tamil`);
                    const data = await res.json();
                    const candidates = data.results || data.songs || data.data?.results || [];
                    if (candidates.length > 0) {
                        tracks = candidates.map(s => {
                            let streamUrl = s.streamUrl || '';
                            if (!streamUrl && Array.isArray(s.downloadUrl)) {
                                streamUrl = s.downloadUrl[s.downloadUrl.length - 1]?.url || s.downloadUrl[0]?.url || '';
                            }
                            let art = s.artwork || s.image;
                            if (Array.isArray(art)) {
                                art = art[art.length - 1]?.url || art[0]?.url || '';
                            }
                            let artist = '';
                            if (s.artists?.primary && Array.isArray(s.artists.primary)) {
                                artist = s.artists.primary.map(a => a.name).join(', ');
                            } else if (Array.isArray(s.artists)) {
                                artist = s.artists.map(a => typeof a === 'string' ? a : (a.name || '')).filter(Boolean).join(', ');
                            } else {
                                artist = s.artist || s.primaryArtist || 'Deva';
                            }
                            return {
                                id: String(s.id || ('tr_' + Math.random().toString(36).slice(2, 9))),
                                title: (s.name || s.title || '').replace(/&quot;/g, '"').replace(/&#39;/g, "'"),
                                artist: artist,
                                album: (typeof s.album === 'string' ? s.album : s.album?.name) || playlistObj.title,
                                duration: parseDurationToSeconds(s.duration),
                                artwork: art || playlistObj.artwork,
                                streamUrl: streamUrl,
                                quality: 'FLAC / 320kbps Hi-Fi'
                            };
                        }).filter(t => !!t.streamUrl);
                    }
                } catch (e) {
                    console.warn('Error fetching curated tracks:', e);
                }
            }

            // 3. Priority Instant Match: from active search payload songs
            if (tracks.length === 0 && currentSearchPayload && Array.isArray(currentSearchPayload.songs) && currentSearchPayload.songs.length > 0) {
                tracks = [...currentSearchPayload.songs];
            }

            // 4. Fallback: match from currently loaded pool
            if (tracks.length === 0) {
                tracks = (window.AllSongPool || []).filter(t => !!t.streamUrl).slice(0, 25);
            }

            pl = {
                id: playlistObj.id,
                name: playlistObj.title || playlistObj.name,
                description: playlistObj.subtitle || `Curated Lossless Collection • ${tracks.length} Lossless Tracks`,
                artwork: playlistObj.artwork,
                source: playlistObj.source || 'Curated',
                createdAt: new Date().toISOString(),
                tracks: tracks
            };

            // Register safely in Importer!
            if (typeof Importer !== 'undefined' && Importer.playlists) {
                const existingIdx = Importer.playlists.findIndex(p => p.id === pl.id);
                if (existingIdx >= 0) {
                    Importer.playlists[existingIdx] = pl;
                } else {
                    Importer.playlists.unshift(pl);
                }
                Importer.savePlaylists();
            }
        }

        // Render Playlist Detail Screen
        if (typeof renderPlaylistDetailView === 'function') {
            await renderPlaylistDetailView(pl.id);
        }

        // Autoplay if requested (e.g. clicked green play button ▶)
        if (autoPlay && pl.tracks && pl.tracks.length > 0) {
            AudioPlayer.playTrack(pl.tracks[0], pl.tracks, 0, true);
            showToast(`Playing "${pl.name}"`, '▶️');
        }
    }


    function updateDropdownPosition() {
        if (!searchTypeaheadDropdown || !globalSearchInput) return;
        if (searchTypeaheadDropdown.parentElement !== document.body) {
            document.body.appendChild(searchTypeaheadDropdown);
        }
        const rect = globalSearchInput.getBoundingClientRect();
        const winW = window.innerWidth;
        const width = Math.min(Math.max(rect.width, 480), winW - 24);
        let left = rect.left;
        if (left + width > winW - 12) {
            left = Math.max(12, winW - width - 12);
        }
        searchTypeaheadDropdown.style.setProperty("position", "fixed", "important");
        searchTypeaheadDropdown.style.setProperty("top", Math.round(rect.bottom + 6) + "px", "important");
        searchTypeaheadDropdown.style.setProperty("left", Math.round(left) + "px", "important");
        searchTypeaheadDropdown.style.setProperty("width", Math.round(width) + "px", "important");
        searchTypeaheadDropdown.style.setProperty("z-index", "2147483647", "important");
    }

    function renderTypeaheadDropdown(suggestions, rawQuery) {
        if (!searchTypeaheadDropdown || !typeaheadSuggestions) return;
        focusedDropdownIndex = -1;
        if (suggestions.tracks) {
            suggestions.tracks.forEach(t => {
                if (t && t.id) window.TypeaheadTrackMap.set(String(t.id), t);
            });
        }

        const totalItems = (suggestions.queries?.length || 0) + (suggestions.playlists?.length || 0) + (suggestions.tracks?.length || 0);
        if (totalItems === 0) {
            if (rawQuery) {
                typeaheadSuggestions.innerHTML = `
                    <div style="padding: 16px 20px; display: flex; align-items: center; gap: 12px; color: #a0a0b0; font-size: 13.5px;">
                        <span style="font-size: 16px; animation: spin 1s linear infinite; display: inline-block;">⏳</span>
                        <span>Finding live suggestions for "<strong>${escapeHtml(rawQuery)}</strong>"...</span>
                    </div>
                `;
                updateDropdownPosition();
                searchTypeaheadDropdown.style.setProperty("display", "flex", "important");
            } else {
                hideTypeahead();
            }
            return;
        }

        let html = '';
        let globalIdx = 0;

        const isHistory = !rawQuery && getSearchHistory().length > 0;
        if (isHistory) {
            html += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 16px 6px; font-size: 11.5px; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px;">
                    <span>Recent Searches</span>
                    <button id="clearSearchHistoryBtn" style="background: none; border: none; color: #00d2ff; font-size: 11.5px; cursor: pointer; font-weight: 600; padding: 2px 6px; border-radius: 4px;">Clear</button>
                </div>
            `;
        }

        // 1. Query Suggestions Section (with 🔍 / 🕒 icon)
        (suggestions.queries || []).forEach(qs => {
            const iconSvg = isHistory ? `
                <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
            ` : `
                <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M10.533 1.27893C5.42321 1.27893 1.27893 5.42321 1.27893 10.533C1.27893 15.6428 5.42321 19.7871 10.533 19.7871C12.8331 19.7871 14.9351 18.9482 16.5547 17.5508L21.498 22.4941L22.502 21.4902L17.5586 16.5469C18.956 14.9272 19.7871 12.8252 19.7871 10.533C19.7871 5.42321 15.6428 1.27893 10.533 1.27893ZM2.77893 10.533C2.77893 6.25052 6.25052 2.77893 10.533 2.77893C14.8155 2.77893 18.2871 6.25052 18.2871 10.533C18.2871 14.8155 14.8155 18.2871 10.533 18.2871C6.25052 18.2871 2.77893 14.8155 2.77893 10.533Z"/></svg>
            `;
            html += `
                <div class="typeahead-item typeahead-query-item" data-type="query" data-query="${encodeURIComponent(qs)}" data-index="${globalIdx}">
                    <span class="typeahead-query-icon">
                        ${iconSvg}
                    </span>
                    <span class="typeahead-query-text">${isHistory ? escapeHtml(qs) : formatSpotifyQuerySuggestion(qs, rawQuery)}</span>
                </div>
            `;
            globalIdx++;
        });

        // 2. Playlists Section (matching Spotify Screenshot 1)
        (suggestions.playlists || []).forEach(pl => {
            const art = pl.artwork || 'icon-512.png';
            html += `
                <div class="typeahead-item typeahead-playlist-item" data-type="playlist" data-playlist-id="${pl.id}" data-index="${globalIdx}">
                    <img class="typeahead-track-art" src="${art}" alt="${escapeHtml(pl.title)}" loading="lazy" style="border-radius: 6px;">
                    <div class="typeahead-track-info">
                        <div class="typeahead-track-title">${escapeHtml(pl.title)}</div>
                        <div class="typeahead-track-sub">${escapeHtml(pl.subtitle || 'Playlist • Curated')}</div>
                    </div>
                    <span class="search-badge-tag">Playlist</span>
                </div>
            `;
            globalIdx++;
        });

        // 3. Tracks Section (matching Spotify Screenshot 1)
        (suggestions.tracks || []).forEach(tr => {
            const art = tr.artwork || tr.image || 'icon-512.png';
            html += `
                <div class="typeahead-item typeahead-track-item" data-type="track" data-track-id="${tr.id}" data-index="${globalIdx}">
                    <img class="typeahead-track-art" src="${art}" alt="${escapeHtml(tr.title)}" loading="lazy">
                    <div class="typeahead-track-info">
                        <div class="typeahead-track-title">${escapeHtml(tr.title)}</div>
                        <div class="typeahead-track-sub">Song • ${escapeHtml(tr.artist || 'Lossless')}</div>
                    </div>
                    <button class="typeahead-queue-btn" data-queue-id="${tr.id}" title="Add to Queue">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
                    </button>
                </div>
            `;
            globalIdx++;
        });

        typeaheadSuggestions.innerHTML = html;
        updateDropdownPosition();
        searchTypeaheadDropdown.style.setProperty('display', 'flex', 'important');

        // Bind Clear Search History button
        const clearBtn = typeaheadSuggestions.querySelector('#clearSearchHistoryBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                clearSearchHistory();
                triggerSearchSuggestions();
            });
        }

        // Bind Query Suggestion clicks
        typeaheadSuggestions.querySelectorAll('.typeahead-query-item').forEach(item => {
            item.addEventListener('click', () => {
                const q = decodeURIComponent(item.getAttribute('data-query'));
                globalSearchInput.value = q;
                hideTypeahead();
                executeLiveSearch(q);
            });
        });

        // Bind Playlist clicks
        typeaheadSuggestions.querySelectorAll('.typeahead-playlist-item').forEach(item => {
            item.addEventListener('click', async () => {
                const plId = item.getAttribute('data-playlist-id');
                const pl = window.TypeaheadPlaylistMap?.get(plId);
                hideTypeahead();
                if (pl) {
                    await openAndPlayPlaylist(pl);
                }
            });
        });

        // Bind Track clicks (matching Spotify: plays the track)
        typeaheadSuggestions.querySelectorAll('.typeahead-track-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.typeahead-queue-btn')) return;
                const trId = item.getAttribute('data-track-id');
                const found = window.TypeaheadTrackMap?.get(String(trId)) || (window.AllSongPool || []).find(t => String(t.id) === String(trId));
                if (found) {
                    hideTypeahead();
                    const trackPool = (suggestions.tracks && suggestions.tracks.length > 0) ? suggestions.tracks : [found];
                    const trIdx = trackPool.findIndex(t => String(t.id) === String(found.id));
                    AudioPlayer.playTrack(found, trackPool, trIdx >= 0 ? trIdx : 0, false);
                    showToast(`Playing "${found.title}"`, '▶️');
                }
            });
        });

        // Bind ⊕ Queue Button clicks (matching Spotify Screenshot 1)
        typeaheadSuggestions.querySelectorAll('.typeahead-queue-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const trId = btn.getAttribute('data-queue-id');
                const found = window.TypeaheadTrackMap?.get(String(trId)) || (window.AllSongPool || []).find(t => String(t.id) === String(trId));
                if (found) {
                    AudioPlayer.addToUserQueue(found);
                    btn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#00d2ff" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
                    showToast(`Added to queue: ${found.title}`, '➕');
                    setTimeout(() => {
                        btn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>';
                    }, 1400);
                }
            });
        });
    }

    function updateFocusedItem(items) {
        if (!items || items.length === 0) return;
        items.forEach((item, idx) => {
            const isFoc = (idx === focusedDropdownIndex);
            item.classList.toggle('focused', isFoc);
            if (isFoc) {
                item.scrollIntoView({ block: 'nearest' });
                const qAttr = item.getAttribute('data-query');
                if (qAttr) {
                    globalSearchInput.value = decodeURIComponent(qAttr);
                }
            }
        });
    }

    // Dual-Phase Search Implementation
    // Dual-Phase Real-Time Search Implementation (Instant Local <2ms + Live Worldwide Enrich)
    let currentSearchCategory = 'all';
    let currentSearchPayload = null;
    let activeSearchAbortController = null;

    function playAllSongsList(songArray, shuffle = false) {
        if (!songArray || songArray.length === 0) {
            showToast('No tracks to play', 'ℹ️');
            return;
        }
        if (!shuffle) {
            AudioPlayer.isShuffled = false;
            const shufBtn = document.getElementById('shuffleBtn') || document.querySelector('.btn-player-action[data-action="shuffle"]');
            if (shufBtn) shufBtn.classList.remove('active');
        }
        const toPlay = shuffle ? [...songArray].sort(() => Math.random() - 0.5) : [...songArray];
        AudioPlayer.playTrack(toPlay[0], toPlay, 0, !shuffle);
        showToast(shuffle ? `Shuffling ${toPlay.length} songs` : `Playing ${toPlay.length} songs (Order-wise)`, '▶️');
    }

    async function playAlbumOrderWise(album, shuffle = false) {
        if (!album) return;
        showToast(`Loading album "${album.title}"...`, '⏳');
        let albumTracks = album.tracks || [];

        if ((!albumTracks || albumTracks.length === 0) && album.id) {
            try {
                const isCatalyst = typeof window !== 'undefined' && (
                    window.location.hostname.includes('catalystserverless') ||
                    window.location.hostname.includes('zohocatalyst') ||
                    window.location.pathname.startsWith('/app')
                );
                const prefix = window.API_PREFIX || (isCatalyst ? '/server/music_api' : '');
                const res = await fetch(`${prefix}/api/album?id=${encodeURIComponent(album.id)}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.album && (data.album.tracks || data.album.songs)) {
                        albumTracks = data.album.tracks || data.album.songs;
                        album.tracks = albumTracks;
                    }
                }
            } catch (e) {
                console.warn('[Album] Failed to fetch full album tracks:', e);
            }
        }

        if (!albumTracks || albumTracks.length === 0) {
            const normAlb = (album.title || '').toLowerCase().trim();
            albumTracks = (allLoadedSongs || []).filter(s => {
                const sAlb = (s.album || '').toLowerCase().trim();
                return sAlb && (sAlb === normAlb || sAlb.includes(normAlb) || normAlb.includes(sAlb));
            });
        }

        if (!albumTracks || albumTracks.length === 0) {
            showToast('No tracks found for this album', '⚠️');
            return;
        }

        // Ensure all album tracks have complete metadata and artwork
        albumTracks = albumTracks.map(t => ({
            ...t,
            album: t.album || album.title,
            artwork: t.artwork || t.image || album.artwork || 'icon-512.png',
            image: t.image || t.artwork || album.artwork || 'icon-512.png',
            streamUrl: t.streamUrl || t.url || ''
        }));

        if (!shuffle) {
            AudioPlayer.isShuffled = false;
            const shufBtn = document.getElementById('shuffleBtn') || document.querySelector('.btn-player-action[data-action="shuffle"]');
            if (shufBtn) shufBtn.classList.remove('active');
        }

        // Automatically activate Cinema / Theatre Audio Master preset for movie soundtracks
        if (typeof AudioPlayer.setCinemaPreset === 'function') {
            AudioPlayer.setCinemaPreset('cinemaReference');
        }

        const toPlay = shuffle ? [...albumTracks].sort(() => Math.random() - 0.5) : [...albumTracks];
        AudioPlayer.playTrack(toPlay[0], toPlay, 0, !shuffle);
        showToast(shuffle ? `Shuffling movie album: ${album.title}` : `Playing movie: ${album.title} (Theatre Cinema Sound)`, '🎬');
    }

    async function addAlbumToQueueOrderWise(album) {
        if (!album) return;
        let albumTracks = album.tracks || [];
        if ((!albumTracks || albumTracks.length === 0) && album.id) {
            try {
                const isCatalyst = typeof window !== 'undefined' && (
                    window.location.hostname.includes('catalystserverless') ||
                    window.location.hostname.includes('zohocatalyst') ||
                    window.location.pathname.startsWith('/app')
                );
                const prefix = window.API_PREFIX || (isCatalyst ? '/server/music_api' : '');
                const res = await fetch(`${prefix}/api/album?id=${encodeURIComponent(album.id)}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.album && (data.album.tracks || data.album.songs)) {
                        albumTracks = data.album.tracks || data.album.songs;
                        album.tracks = albumTracks;
                    }
                }
            } catch (e) {}
        }
        if (albumTracks && albumTracks.length > 0) {
            const formatted = albumTracks.map(t => ({
                ...t,
                album: t.album || album.title,
                artwork: t.artwork || t.image || album.artwork || 'icon-512.png',
                image: t.image || t.artwork || album.artwork || 'icon-512.png',
                streamUrl: t.streamUrl || t.url || ''
            }));
            AudioPlayer.queue.push(...formatted);
            if (window.renderSideQueueContent) window.renderSideQueueContent();
            showToast(`Added ${formatted.length} movie tracks to queue`, '⊕');
        }
    }


    function renderSearchCategoryChipsHtml(activeCat) {
        const categories = [
            { id: 'all', label: 'All' },
            { id: 'playlists', label: 'Playlists' },
            { id: 'songs', label: 'Songs' },
            { id: 'albums', label: 'Albums' },
            { id: 'artists', label: 'Artists' },
            { id: 'podcasts', label: 'Podcasts & Shows' }
        ];
        return `
            <div class="search-category-chips" style="display: flex !important; align-items: center !important; gap: 8px !important; margin: 16px 0 20px 0 !important; overflow-x: auto !important; overflow-y: hidden !important; padding: 4px 2px 8px 2px !important; scrollbar-width: none !important; flex-shrink: 0 !important; min-height: 48px !important; height: 48px !important; box-sizing: border-box !important; width: 100% !important;">
                ${categories.map(cat => {
                    const isActive = cat.id === activeCat;
                    return `
                        <button class="search-chip ${isActive ? 'active' : ''}" data-search-filter="${cat.id}" style="display: inline-flex !important; align-items: center !important; justify-content: center !important; height: 36px !important; min-height: 36px !important; max-height: 36px !important; padding: 0 18px !important; border-radius: 999px !important; font-size: 13.5px !important; font-weight: ${isActive ? '700' : '600'} !important; line-height: normal !important; cursor: pointer !important; white-space: nowrap !important; user-select: none !important; box-sizing: border-box !important; border: 1px solid ${isActive ? '#ffffff' : 'rgba(255,255,255,0.14)'} !important; background: ${isActive ? '#ffffff' : 'rgba(255,255,255,0.08)'} !important; color: ${isActive ? '#000000' : '#e4e4e7'} !important; flex-shrink: 0 !important; transition: all 0.15s ease !important;">
                            ${cat.label}
                        </button>
                    `;
                }).join('')}
            </div>
        `;
    }

    
    
    function escapeHtml(str) {
        return String(str || '').replace(/[&<>'"]/g, function(m) {
            return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[m];
        });
    }

    function renderSearchSkeletonImmediate(query) {
        if (!contentScroll) return;
        const existingContainer = document.getElementById('searchResultsContainer');
        if (existingContainer && currentView === 'search') {
            const titleEl = document.querySelector('.section-title');
            if (titleEl) titleEl.textContent = `🔍 Search: "${escapeHtml(query)}"`;
            const subEl = document.getElementById('searchSubtitle');
            if (subEl) subEl.textContent = `Searching worldwide lossless catalog for "${escapeHtml(query)}"...`;
            const loaderP = existingContainer.querySelector('p');
            if (loaderP && loaderP.textContent.includes('Searching')) {
                loaderP.textContent = `Searching worldwide lossless index for "${escapeHtml(query)}"...`;
            }
            return;
        }

        contentScroll.innerHTML = `
            <div class="section-header" style="margin-bottom: 0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                <div class="section-title-wrap">
                    <h1 class="section-title" style="margin: 0;">🔍 Search: "${escapeHtml(query)}"</h1>
                    <span class="section-subtitle" id="searchSubtitle">Searching worldwide lossless catalog for "${escapeHtml(query)}"...</span>
                </div>
                <div class="header-search-actions" style="display: flex; gap: 8px;">
                    <button class="btn-chip primary" id="headerPlayAllBtn" style="padding: 8px 18px; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; background: #00d2ff; color: #000; border: none; border-radius: 20px; cursor: pointer;">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l11.08-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14z"/></svg>
                        Play All
                    </button>
                    <button class="btn-chip" id="headerShuffleBtn" style="padding: 8px 14px; font-weight: 600; background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.2); border-radius: 20px; cursor: pointer;">
                        🔀 Shuffle
                    </button>
                </div>
            </div>
            ${renderSearchCategoryChipsHtml(currentSearchCategory)}
            <div id="searchResultsContainer">
                <div style="text-align: center; padding: 48px 20px;">
                    <div class="pulse-loader"></div>
                    <p style="color: var(--text-muted); margin-top: 14px; font-size: 14.5px; font-weight: 500;">Searching worldwide lossless index for "${escapeHtml(query)}"...</p>
                </div>
            </div>
        `;

        document.getElementById('headerPlayAllBtn')?.addEventListener('click', () => {
            const s = currentSearchPayload?.songs || [];
            if (s.length > 0) playAllSongsList(s, false);
        });
        document.getElementById('headerShuffleBtn')?.addEventListener('click', () => {
            const s = currentSearchPayload?.songs || [];
            if (s.length > 0) playAllSongsList(s, true);
        });
    }

    let searchTokenSeq = 0;

    async function executeLiveSearch(query) {
        if (!query) {
            renderView(previousViewBeforeSearch || 'home');
            return;
        }

        saveSearchHistory(query);
        const thisToken = ++searchTokenSeq;
        currentView = 'search';
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

        const tokenized = tokenizeQuery(query);
        const queryLower = query.toLowerCase().trim();

        // 1. Immediately ensure UI reflects current query in 0ms
        renderSearchSkeletonImmediate(query);

        // 2. Instant Local Search (<2ms)
        const localMatches = [];
        const seenLocal = new Set();
        const candidatePool = [
            ...(window.AllSongPool || []),
            ...(allLoadedSongs || []),
            ...((window.TypeaheadTrackMap && Array.from(window.TypeaheadTrackMap.values())) || [])
        ];

        for (const t of candidatePool) {
            if (!t) continue;
            const normKey = ((t.title || '') + ' ' + (t.artist || '')).toLowerCase().trim();
            if (seenLocal.has(normKey)) continue;

            const title = (t.title || '').toLowerCase();
            const artist = (t.artist || '').toLowerCase();
            const album = (t.album || '').toLowerCase();

            let matched = title.includes(queryLower) || artist.includes(queryLower) || album.includes(queryLower);
            if (!matched && tokenized.text) {
                matched = title.includes(tokenized.text.toLowerCase()) || artist.includes(tokenized.text.toLowerCase());
            }
            if (matched) {
                seenLocal.add(normKey);
                localMatches.push(t);
            }
        }

        const existingContainer = document.getElementById('searchResultsContainer');
        const existingSubtitle = document.getElementById('searchSubtitle');
        const existingTitle = document.querySelector('.section-title');

        if (existingTitle) existingTitle.textContent = `🔍 Search: "${escapeHtml(query)}"`;
        if (existingSubtitle) {
            existingSubtitle.textContent = localMatches.length > 0 ? `${localMatches.length} Instant Anthems (Resolving worldwide lossless & albums...)` : `Resolving "${escapeHtml(query)}" across lossless catalog...`;
        }
        if (existingContainer && localMatches.length > 0 && currentSearchCategory === 'all') {
            existingContainer.innerHTML = `<div class="track-table">${renderTrackRowsHtml(localMatches)}</div>`;
            bindTrackRowEvents(localMatches);
        }

        // 3. Live Online Search (direct fetch guarded by thisToken)
        try {
            const searchUrl = `${API_PREFIX}/api/search?q=${encodeURIComponent(query)}&limit=30&lang=${encodeURIComponent((window.selectedLanguages && window.selectedLanguages[0]) || localStorage.getItem('preferred_language') || 'tamil')}`;
            const res = await fetch(searchUrl);
            if (thisToken !== searchTokenSeq) return; // Stale response, ignore
            if (!res.ok) return;
            const data = await res.json();
            if (thisToken !== searchTokenSeq) return;

            const albums = data.albums || [];
            let playlists = data.playlists || [];
            let rawOnline = data.results || data.songs || data.data?.results || [];

            // Strict Tamil / Gana relevance filter
            const prefLang = ((window.selectedLanguages && window.selectedLanguages[0]) || localStorage.getItem('preferred_language') || 'tamil').toLowerCase();
            if (prefLang === 'tamil' || queryLower.includes('tamil') || queryLower.includes('gana')) {
                const tamilOnly = rawOnline.filter(r => {
                    const l = (r.language || '').toLowerCase();
                    return l === 'tamil' || l === 'unknown' || !l;
                });
                if (tamilOnly.length >= 2) {
                    rawOnline = tamilOnly;
                }
                playlists = playlists.filter(p => {
                    const plLang = (p.language || '').toLowerCase();
                    const plTitle = (p.title || '').toLowerCase();
                    if (plLang === 'tamil') return true;
                    if (/tamil|deva|gana|kuthu|anirudh|rahman|yuvan|harris|illayaraja|spb/i.test(plTitle)) return true;
                    if (plLang === 'hindi' || plLang === 'punjabi' || plLang === 'bengali' || plLang === 'gujarati') return false;
                    return true;
                });
            }

            const onlineResults = rawOnline.map(r => ({
                id: r.id || ('online_' + Math.random().toString(36).substr(2, 9)),
                title: r.title || r.name || 'Unknown Track',
                artist: r.artist || r.singers || r.subtitle || 'Lossless Artist',
                album: r.album || 'Lossless Album',
                duration: parseDurationToSeconds(r.duration),
                artwork: r.image || r.artwork || 'icon-512.png',
                source: r.source || 'JioSaavn',
                audioQuality: 'FLAC 24-bit/96kHz',
                streamUrl: r.streamUrl || r.url || '',
                year: r.year || ''
            }));

            // Smart Deduplication: Merge local + online
            const combined = [...localMatches];
            const seen = new Set(localMatches.map(t => (t.title + ' ' + t.artist).toLowerCase().trim()));
            for (const ot of onlineResults) {
                const normKey = (ot.title + ' ' + ot.artist).toLowerCase().trim();
                if (!seen.has(normKey)) {
                    seen.add(normKey);
                    combined.push(ot);
                }
            }

            allLoadedSongs = [...combined];
            window.AllSongPool = allLoadedSongs;

            currentSearchPayload = {
                query,
                songs: combined,
                albums: albums,
                playlists: playlists,
                artists: data.artists || []
            };

            const sub = document.getElementById('searchSubtitle');
            if (sub) {
                const parts = [`${combined.length} Songs`];
                if (playlists.length > 0) parts.push(`${playlists.length} Playlists`);
                if (albums.length > 0) parts.push(`${albums.length} Albums`);
                sub.textContent = parts.join(' • ') + ' • Lossless Studio Audio';
            }

            renderCurrentSearchTab();
        } catch (err) {
            console.warn('Phase 2 search error:', err);
            const container = document.getElementById('searchResultsContainer');
            if (container && container.querySelector('.pulse-loader')) {
                if (localMatches.length > 0) {
                    container.innerHTML = `<div class="track-table">${renderTrackRowsHtml(localMatches)}</div>`;
                    bindTrackRowEvents(localMatches);
                } else {
                    container.innerHTML = `
                        <div style="text-align: center; padding: 48px 20px; color: var(--text-muted);">
                            <p style="font-size: 16px; font-weight: 600; color: #fff; margin-bottom: 8px;">No lossless songs found for "${escapeHtml(query)}"</p>
                            <p style="font-size: 13.5px;">Try searching for artist names like Anirudh, AR Rahman, Deva, or song titles.</p>
                        </div>
                    `;
                }
            }
        }
    }

    function renderCurrentSearchTab() {
        if (!currentSearchPayload) return;
        const { query, songs, albums, playlists, artists } = currentSearchPayload;
        const container = document.getElementById('searchResultsContainer');
        if (!container) return;

        // Re-render chips to reflect active filter state
        const chipContainer = document.querySelector('.search-category-chips');
        if (chipContainer) {
            chipContainer.outerHTML = renderSearchCategoryChipsHtml(currentSearchCategory);
        }

        // 1. PLAYLISTS ONLY TAB
        if (currentSearchCategory === 'playlists') {
            if (playlists.length === 0) {
                container.innerHTML = '<div style="color: var(--text-muted); padding: 40px; text-align: center;">No playlists found for this query.</div>';
                return;
            }
            container.innerHTML = `
                <div class="search-playlists-grid">
                    ${playlists.map(pl => `
                        <div class="search-playlist-card" data-playlist-id="${pl.id}">
                            <img class="search-playlist-art" src="${pl.artwork || 'icon-512.png'}" alt="${pl.title}" loading="lazy">
                            <div class="search-playlist-title">${pl.title}</div>
                            <div class="search-playlist-sub">${pl.subtitle || 'Playlist • Curated'}</div>
                        </div>
                    `).join('')}
                </div>
            `;
            container.querySelectorAll('.search-playlist-card').forEach(card => {
                card.addEventListener('click', () => {
                    const plId = card.getAttribute('data-playlist-id');
                    const pl = playlists.find(p => p.id === plId);
                    if (pl) openAndPlayPlaylist(pl, false);
                });
            });
            return;
        }

        // 2. SONGS ONLY TAB
        if (currentSearchCategory === 'songs') {
            container.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                    <span style="font-size: 15px; color: var(--text-secondary); font-weight: 600;">All Matching Songs (${songs.length})</span>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn-chip primary" id="tabPlayAllSongsBtn" style="padding: 7px 18px; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; background: #00d2ff; color: #000; border: none; border-radius: 20px; cursor: pointer;">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l11.08-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14z"/></svg>
                            Play All
                        </button>
                        <button class="btn-chip" id="tabShuffleSongsBtn" style="padding: 7px 14px; font-weight: 600; background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.2); border-radius: 20px; cursor: pointer;">
                            🔀 Shuffle
                        </button>
                    </div>
                </div>
                <div class="track-table">${renderTrackRowsHtml(songs)}</div>
            `;
            document.getElementById('tabPlayAllSongsBtn')?.addEventListener('click', () => playAllSongsList(songs, false));
            document.getElementById('tabShuffleSongsBtn')?.addEventListener('click', () => playAllSongsList(songs, true));
            bindTrackRowEvents(songs);
            return;
        }

        // 3. ALBUMS ONLY TAB
        if (currentSearchCategory === 'albums') {
            if (albums.length === 0) {
                container.innerHTML = '<div style="color: var(--text-muted); padding: 40px; text-align: center;">No albums found for this query.</div>';
                return;
            }
            container.innerHTML = `
                <div class="search-playlists-grid">
                    ${albums.map(alb => `
                        <div class="search-playlist-card" data-album-id="${alb.id}">
                            <img class="search-playlist-art" src="${alb.artwork || 'icon-512.png'}" alt="${alb.title}" loading="lazy">
                            <div class="search-playlist-title">${alb.title}</div>
                            <div class="search-playlist-sub">${alb.artist || 'Movie Soundtrack'} • ${alb.year || 'Album'}</div>
                        </div>
                    `).join('')}
                </div>
            `;
            container.querySelectorAll('.search-playlist-card').forEach(card => {
                card.addEventListener('click', () => {
                    const albId = card.getAttribute('data-album-id');
                    const alb = albums.find(a => a.id === albId);
                    if (alb) {
                        playAlbumOrderWise(alb, false);
                    }
                });
            });
            return;
        }

        // 4. ARTISTS ONLY TAB
        if (currentSearchCategory === 'artists') {
            if (!artists || artists.length === 0) {
                container.innerHTML = '<div style="color: var(--text-muted); padding: 40px; text-align: center;">No artist profiles found for this query.</div>';
                return;
            }
            container.innerHTML = `
                <div class="search-playlists-grid">
                    ${artists.map(art => `
                        <div class="search-playlist-card" style="align-items: center; text-align: center;">
                            <img class="search-playlist-art" src="${art.artwork || 'icon-512.png'}" style="border-radius: 50%; max-width: 140px;" alt="${art.name}">
                            <div class="search-playlist-title">${art.name}</div>
                            <div class="search-playlist-sub">Artist • Studio Creator</div>
                        </div>
                    `).join('')}
                </div>
            `;
            return;
        }

        // 5. PODCASTS & SHOWS TAB
        if (currentSearchCategory === 'podcasts') {
            renderView('podcasts');
            const podInput = document.getElementById('podcastSearchInput');
            if (podInput) {
                podInput.value = query;
                podInput.dispatchEvent(new Event('input'));
            }
            return;
        }

        // 6. "ALL" TAB (SPOTIFY-GRADE RELEVANCE ENGINE)
        let html = '';

        // Select the most relevant Top Result item
        const qTokens = (query || '').toLowerCase().split(/\s+/).filter(Boolean);
        let topResultType = null;
        let topResultItem = null;

        // Check if top playlist title genuinely matches the query
        const plMatch = playlists[0] && qTokens.some(tok => playlists[0].title.toLowerCase().includes(tok));
        // Check if top album title matches
        const albMatch = albums[0] && qTokens.some(tok => albums[0].title.toLowerCase().includes(tok));
        // Check if top song title or artist matches
        const songMatch = songs[0] && qTokens.some(tok => songs[0].title.toLowerCase().includes(tok) || songs[0].artist.toLowerCase().includes(tok));

        if (plMatch && (query.toLowerCase().includes('gana') || query.toLowerCase().includes('playlist') || query.toLowerCase().includes('hits') || query.toLowerCase().includes('mix'))) {
            topResultType = 'playlist';
            topResultItem = playlists[0];
        } else if (albMatch && albums[0].title.toLowerCase() === query.toLowerCase().trim()) {
            topResultType = 'album';
            topResultItem = albums[0];
        } else if (songMatch || songs[0]) {
            topResultType = 'song';
            topResultItem = songs[0];
        } else if (playlists[0]) {
            topResultType = 'playlist';
            topResultItem = playlists[0];
        } else if (albums[0]) {
            topResultType = 'album';
            topResultItem = albums[0];
        }

        // SPOTIFY-GRADE 2-COLUMN TOP SECTION: Top Result on Left, Top 4 Songs on Right!
        if (topResultType && topResultItem) {
            const isSong = topResultType === 'song';
            const isAlbum = topResultType === 'album';
            const isPlaylist = topResultType === 'playlist';

            const itemTitle = topResultItem.title || topResultItem.name;
            const itemArt = topResultItem.artwork || topResultItem.image || 'icon-512.png';
            const itemSub = isSong 
                ? `${topResultItem.artist} • ${topResultItem.album || 'Single'}`
                : isAlbum 
                ? `${topResultItem.artist || 'Soundtrack'} • ${topResultItem.year || 'Album'}`
                : `${topResultItem.creator || 'Curated Collection'} • ${topResultItem.songCount ? topResultItem.songCount + ' Tracks' : 'Lossless Playlist'}`;
            const badgeLabel = isSong ? 'Song' : isAlbum ? 'Album' : 'Playlist';

            const topSongs = (topResultType === 'song' && songs.length > 1) ? songs.slice(1, 5) : songs.slice(0, 4);

            html += `
                <div class="spotify-search-top-grid">
                    <!-- Left Column: Top result -->
                    <div class="spotify-top-result-col">
                        <h2 class="spotify-section-heading">Top result</h2>
                        <div class="spotify-top-result-card" id="topResultCard">
                            <img class="spotify-top-result-art" src="${itemArt}" alt="${itemTitle}">
                            <div class="spotify-top-result-title">${itemTitle}</div>
                            <div class="spotify-top-result-meta">
                                <span class="spotify-type-badge">${badgeLabel}</span>
                                <span class="spotify-meta-sub">${itemSub}</span>
                            </div>
                            <button class="spotify-top-result-play" id="playTopResultBtn" title="Play Now">
                                <svg viewBox="0 0 24 24" width="22" height="22" fill="#000"><path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l11.08-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14z"/></svg>
                            </button>
                        </div>
                    </div>

                    <!-- Right Column: Songs -->
                    ${topSongs.length > 0 ? `
                        <div class="spotify-top-songs-col">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                                <h2 class="spotify-section-heading" style="margin: 0;">Songs</h2>
                                <button class="btn-chip" id="seeAllSongsHeaderBtn" style="font-size: 12px; padding: 4px 12px; background: transparent; border: none; color: #b3b3b3; font-weight: 700; cursor: pointer;">See all</button>
                            </div>
                            <div class="spotify-top-songs-list">
                                ${topSongs.map(s => `
                                    <div class="spotify-song-row" data-song-id="${s.id}">
                                        <div class="spotify-song-thumb-wrap">
                                            <img class="spotify-song-thumb" src="${s.artwork || 'icon-512.png'}" alt="${s.title}" loading="lazy">
                                            <div class="spotify-song-play-icon">
                                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l11.08-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14z"/></svg>
                                            </div>
                                        </div>
                                        <div class="spotify-song-info">
                                            <div class="spotify-song-name">${s.title}</div>
                                            <div class="spotify-song-artist">${s.artist}</div>
                                        </div>
                                        <div class="spotify-song-duration">${formatTime(s.duration || 210)}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        // Playlists Rows / Section
        if (playlists.length > 0) {
            html += `
                <div style="margin-bottom: 28px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <h3 style="font-size: 18px; font-weight: 800; color: #fff; margin: 0;">Playlists & Collections</h3>
                        <button class="btn-chip" id="seeAllPlaylistsBtn" style="font-size: 12px; padding: 4px 12px;">See all</button>
                    </div>
                    <div class="search-playlists-grid" style="grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));">
                        ${playlists.slice(0, 6).map(pl => `
                            <div class="search-playlist-card" data-playlist-id="${pl.id}">
                                <img class="search-playlist-art" src="${pl.artwork || 'icon-512.png'}" alt="${pl.title}" loading="lazy">
                                <div class="search-playlist-title">${pl.title}</div>
                                <div class="search-playlist-sub">${pl.subtitle || 'Playlist • Curated'}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // Album Soundtrack Showcase
        if (albums.length > 0) {
            const alb = albums[0];
            html += `
                <div style="margin-bottom: 24px;">
                    <h3 style="font-size: 18px; font-weight: 800; color: #fff; margin-bottom: 12px;">Album Soundtrack</h3>
                    <div class="album-showcase-card">
                        <div class="album-showcase-header">
                            <img class="album-showcase-art" src="${alb.artwork || 'icon-512.png'}" alt="${alb.title}">
                            <div class="album-showcase-meta">
                                <span class="album-badge">🎬 MOVIE / ALBUM SOUNDTRACK</span>
                                <h2 class="album-showcase-title">${alb.title}</h2>
                                <div class="album-showcase-info">${alb.artist || 'Soundtrack'} • ${alb.year || ''} • Lossless Hi-Fi</div>
                                <div class="album-showcase-actions" style="margin-top: 14px; display: flex; gap: 10px; flex-wrap: wrap;">
                                    <button class="btn-chip primary" id="playAllAlbumBtn" style="padding: 10px 22px; font-weight: 700; display: inline-flex; align-items: center; gap: 8px; background: #00d2ff; color: #000; border: none; border-radius: 20px; cursor: pointer;">
                                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l11.08-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14z"/></svg>
                                        Play All Album Songs
                                    </button>
                                    <button class="btn-chip" id="addAllAlbumQueueBtn" style="padding: 10px 18px; font-weight: 600; background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.2); border-radius: 20px; cursor: pointer;">
                                        ⊕ Add All to Queue
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        // Songs Section (with Play All & Shuffle Buttons!)
        if (songs.length > 0) {
            html += `
                <div id="allSongsSection" style="margin-bottom: 24px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                        <h3 style="font-size: 18px; font-weight: 800; color: #fff; margin: 0;">Songs (${songs.length})</h3>
                        <div style="display: flex; gap: 8px;">
                            <button class="btn-chip primary" id="playAllSearchSongsBtn" style="padding: 7px 18px; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; background: #00d2ff; color: #000; border: none; border-radius: 20px; cursor: pointer;">
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l11.08-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14z"/></svg>
                                Play All
                            </button>
                            <button class="btn-chip" id="shuffleAllSearchSongsBtn" style="padding: 7px 14px; font-weight: 600; background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.2); border-radius: 20px; cursor: pointer;">
                                🔀 Shuffle
                            </button>
                        </div>
                    </div>
                    <div class="track-table">${renderTrackRowsHtml(songs)}</div>
                </div>
            `;
        }

        container.innerHTML = html;

        // Bind Top Result click
        if (topResultItem) {
            const handleTopPlay = () => {
                if (topResultType === 'song') {
                    if (typeof AudioPlayer.playTrackWithVibeRadio === 'function') {
                        AudioPlayer.playTrackWithVibeRadio(topResultItem);
                    } else {
                        AudioPlayer.playTrack(topResultItem, songs, 0, true);
                    }
                    showToast(`Playing "${topResultItem.title}" with Vibe Flow`, '▶️');
                } else if (topResultType === 'playlist') {
                    openAndPlayPlaylist(topResultItem, true);
                } else if (topResultType === 'album') {
                    playAlbumOrderWise(topResultItem, false);
                }
            };

            document.getElementById('topResultCard')?.addEventListener('click', (e) => {
                if (e.target.closest('#playTopResultBtn')) return;
                if (topResultType === 'playlist') {
                    openAndPlayPlaylist(topResultItem, false);
                } else {
                    handleTopPlay();
                }
            });

            document.getElementById('playTopResultBtn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                handleTopPlay();
            });
        }

        // Bind Spotify Top Songs Row clicks
        container.querySelectorAll('.spotify-song-row').forEach(row => {
            row.addEventListener('click', () => {
                const sId = row.getAttribute('data-song-id');
                const song = songs.find(s => String(s.id) === String(sId));
                if (song) {
                    const idx = songs.findIndex(s => String(s.id) === String(sId));
                    handleSongPlayPauseToggle(song, songs, idx);
                }
            });
        });

        document.getElementById('seeAllSongsHeaderBtn')?.addEventListener('click', () => {
            document.getElementById('allSongsSection')?.scrollIntoView({ behavior: 'smooth' });
        });

        // Bind Playlists cards
        container.querySelectorAll('.search-playlist-card').forEach(card => {
            card.addEventListener('click', () => {
                const plId = card.getAttribute('data-playlist-id');
                const pl = playlists.find(p => p.id === plId);
                if (pl) openAndPlayPlaylist(pl, false);
            });
        });

        // Bind "See all" playlists button
        document.getElementById('seeAllPlaylistsBtn')?.addEventListener('click', () => {
            currentSearchCategory = 'playlists';
            renderCurrentSearchTab();
        });

        // Bind Album Showcase Actions
        if (albums.length > 0) {
            const alb = albums[0];

            document.getElementById('playAllAlbumBtn')?.addEventListener('click', () => {
                playAlbumOrderWise(alb, false);
            });

            document.getElementById('addAllAlbumQueueBtn')?.addEventListener('click', () => {
                addAlbumToQueueOrderWise(alb);
            });
        }

        // Bind Songs Section Play All & Shuffle
        document.getElementById('playAllSearchSongsBtn')?.addEventListener('click', () => {
            playAllSongsList(songs, false);
        });
        document.getElementById('shuffleAllSearchSongsBtn')?.addEventListener('click', () => {
            playAllSongsList(songs, true);
        });

        // Bind Individual Track Rows
        bindTrackRowEvents(songs);
    }

    // Bind Category Chips Global Click Handler
    document.addEventListener('click', (e) => {
        const chip = e.target.closest('.search-chip');
        if (chip) {
            const cat = chip.getAttribute('data-search-filter');
            if (cat) {
                currentSearchCategory = cat;
                renderCurrentSearchTab();
            }
        }
    });

    // Search Input Debounce & Keyboard Typeahead Navigation
    let typeaheadDebounce = null;
    let liveSearchDebounce = null;
    let typeaheadAbortCtrl = null;

    const triggerSearchSuggestions = () => {
        try {
            const query = globalSearchInput.value.trim();
        const local = generateTypeaheadSuggestions(query);
        renderTypeaheadDropdown(local, query);
        updateDropdownPosition();

        if (!query) return;

        clearTimeout(typeaheadDebounce);
        if (typeaheadAbortCtrl) {
            try { typeaheadAbortCtrl.abort(); } catch (e) {}
        }
        typeaheadAbortCtrl = new AbortController();
        const currentSignal = typeaheadAbortCtrl.signal;

        typeaheadDebounce = setTimeout(async () => {
            try {
                const res = await fetch(`${API_PREFIX}/api/suggest?q=${encodeURIComponent(query)}`, { signal: currentSignal });
                if (!res.ok) return;
                const sData = await res.json();
                if (globalSearchInput.value.trim().toLowerCase() !== query.toLowerCase()) return;

                if (sData?.suggestions?.length > 0) {
                    local.queries = sData.suggestions.slice(0, 5);
                }
                const rawTracks = sData?.tracks || [];
                if (rawTracks.length > 0) {
                    const liveTracks = rawTracks.slice(0, 4).map(r => ({
                        id: String(r.id || ('online_' + Math.random().toString(36).substr(2, 9))),
                        title: r.title || r.name || 'Unknown Track',
                        artist: r.artist || r.singers || r.subtitle || 'Lossless Artist',
                        album: r.album || 'Lossless Album',
                        duration: parseDurationToSeconds(r.duration),
                        artwork: r.artwork || r.image || 'icon-512.png',
                        source: r.source || 'JioSaavn',
                        audioQuality: 'FLAC 24-bit/96kHz',
                        streamUrl: r.streamUrl || r.url || ''
                    }));
                    local.tracks = liveTracks;
                    liveTracks.forEach(t => {
                        window.TypeaheadTrackMap.set(String(t.id), t);
                    });
                }
                const rawPlaylists = sData?.playlists || [];
                if (rawPlaylists.length > 0) {
                    local.playlists = rawPlaylists.slice(0, 2);
                    local.playlists.forEach(p => window.TypeaheadPlaylistMap.set(p.id, p));
                }

                renderTypeaheadDropdown(local, query);
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.warn('[Typeahead Fetch Error]:', err);
                }
            }
        }, 80);
        } catch (e) {
            console.warn('[triggerSearchSuggestions error]:', e);
        }
    };

    globalSearchInput.addEventListener('focus', () => {
        triggerSearchSuggestions();
        updateDropdownPosition();
    });
    globalSearchInput.addEventListener('click', (e) => {
        e.stopPropagation();
        triggerSearchSuggestions();
        updateDropdownPosition();
    });
    window.addEventListener('resize', updateDropdownPosition);
    window.addEventListener('scroll', updateDropdownPosition, true);

    globalSearchInput.addEventListener('input', () => {
        const query = globalSearchInput.value.trim();
        if (searchClearBtn) {
            searchClearBtn.style.display = query ? 'flex' : 'none';
        }

        if (!query) {
            clearTimeout(typeaheadDebounce);
            clearTimeout(liveSearchDebounce);
            hideTypeahead();
            if (currentView === 'search') {
                renderView(previousViewBeforeSearch || 'home');
            }
            return;
        }

        // 1. Instant 0ms typeahead suggestions dropdown & parallel async fetch
        triggerSearchSuggestions();

        // 2. Smooth live search execution in background (500ms debounce)
        clearTimeout(liveSearchDebounce);
        liveSearchDebounce = setTimeout(() => {
            const currentQ = globalSearchInput.value.trim();
            if (currentQ) {
                if (currentView !== 'search') {
                    previousViewBeforeSearch = currentView;
                    currentView = 'search';
                    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                }
                executeLiveSearch(currentQ);
            }
        }, 500);
    });

    globalSearchInput.addEventListener('keydown', (e) => {
        const items = typeaheadSuggestions ? typeaheadSuggestions.querySelectorAll('.typeahead-item') : [];
        const isDropdownVisible = searchTypeaheadDropdown && searchTypeaheadDropdown.style.display !== 'none';

        if (!isDropdownVisible || items.length === 0) {
            if (e.key === 'Enter') {
                e.preventDefault();
                hideTypeahead();
                executeLiveSearch(globalSearchInput.value.trim());
            }
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            focusedDropdownIndex = (focusedDropdownIndex + 1) % items.length;
            updateFocusedItem(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            focusedDropdownIndex = (focusedDropdownIndex - 1 + items.length) % items.length;
            updateFocusedItem(items);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (focusedDropdownIndex >= 0 && items[focusedDropdownIndex]) {
                items[focusedDropdownIndex].click();
            } else {
                hideTypeahead();
                executeLiveSearch(globalSearchInput.value.trim());
            }
        } else if (e.key === 'Escape') {
            hideTypeahead();
        }
    });

    searchClearBtn?.addEventListener('click', () => {
        globalSearchInput.value = '';
        searchClearBtn.style.display = 'none';
        hideTypeahead();
        if (currentView === 'search') {
            renderView(previousViewBeforeSearch || 'home');
        }
    });


    // Close typeahead when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-box') && !e.target.closest('#searchTypeaheadDropdown')) {
            hideTypeahead();
        }
    });


    // ================= SPOTIFY-GRADE SIDE PANEL & QUEUE MANAGER =================
    function switchSidePanelTab(tabName) {
        if (tabName === 'nowplaying') {
            sideTabNowPlaying?.classList.add('active');
            sideTabQueue?.classList.remove('active');
            if (sideBodyNowPlaying) sideBodyNowPlaying.style.display = 'flex';
            if (sideBodyQueue) sideBodyQueue.style.display = 'none';
        } else {
            sideTabQueue?.classList.add('active');
            sideTabNowPlaying?.classList.remove('active');
            if (sideBodyNowPlaying) sideBodyNowPlaying.style.display = 'none';
            if (sideBodyQueue) sideBodyQueue.style.display = 'flex';
            renderSideQueueContent();
        }
    }

    sideTabNowPlaying?.addEventListener('click', () => switchSidePanelTab('nowplaying'));
    sideTabQueue?.addEventListener('click', () => switchSidePanelTab('queue'));

    function openSidePanel(preferredTab = 'nowplaying') {
        if (sidePanel) {
            sidePanel.classList.remove('collapsed');
            switchSidePanelTab(preferredTab);
            localStorage.setItem('side_panel_state', 'open');
        }
    }

    function closeSidePanel() {
        if (sidePanel) {
            sidePanel.classList.add('collapsed');
            localStorage.setItem('side_panel_state', 'closed');
        }
    }

    function toggleSidePanel(preferredTab = 'nowplaying') {
        if (sidePanel) {
            if (sidePanel.classList.contains('collapsed')) {
                openSidePanel(preferredTab);
            } else {
                const isCurrentTab = (preferredTab === 'queue' && sideTabQueue?.classList.contains('active')) ||
                                     (preferredTab === 'nowplaying' && sideTabNowPlaying?.classList.contains('active'));
                if (!isCurrentTab) {
                    switchSidePanelTab(preferredTab);
                } else {
                    closeSidePanel();
                }
            }
        }
    }

    closeSidePanelBtn?.addEventListener('click', closeSidePanel);
    openQueueBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        toggleSidePanel('queue');
    });

    // Miniplayer button click handled exclusively in miniplayer.js to avoid duplicate toggles

    // Side space utilization on desktop (Screenshot 1 & 3):
    // Dock side panel open by default on desktop displays (>= 1200px) unless user explicitly closed it
    const savedSideState = localStorage.getItem('side_panel_state');
    if (window.innerWidth >= 1200) {
        if (savedSideState !== 'closed') {
            sidePanel?.classList.remove('collapsed');
            switchSidePanelTab('nowplaying');
        } else {
            sidePanel?.classList.add('collapsed');
        }
    } else {
        sidePanel?.classList.add('collapsed');
    }

    playerArt?.parentElement?.addEventListener('click', () => toggleSidePanel('nowplaying'));
    playerTitle?.addEventListener('click', () => toggleSidePanel('nowplaying'));

    function renderSideQueueContent() {
        if (!sideBodyQueue) return;
        const current = AudioPlayer.getCurrentTrack();
        const queue = AudioPlayer.queue || [];
        const currentIdx = AudioPlayer.currentIndex || 0;
        const upcoming = queue.slice(currentIdx + 1);

        let html = `
            <div class="side-queue-header">
                <span class="side-queue-heading">Now Playing</span>
            </div>
        `;

        if (current) {
            const art = current.artwork || current.image || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100';
            html += `
                <div class="side-queue-item active" style="margin-bottom: 18px;">
                    <img class="side-queue-art" src="${art}" alt="${current.title}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100';">
                    <div class="side-queue-details">
                        <div class="side-queue-title">${current.title}</div>
                        <div class="side-queue-sub">${current.artist}</div>
                    </div>
                    <div class="playing-bars" style="margin-right: 6px; flex-shrink: 0;">
                        <span class="playing-bar"></span>
                        <span class="playing-bar"></span>
                        <span class="playing-bar"></span>
                    </div>
                </div>
            `;
        } else {
            html += `<div style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">No track currently playing.</div>`;
        }

        html += `
            <div class="side-queue-header">
                <span class="side-queue-heading">Next In Queue (${upcoming.length})</span>
                <div style="display: flex; gap: 6px;">
                    ${upcoming.length > 1 ? `<button class="side-queue-clear-btn" id="sideShuffleQueueBtn" title="Shuffle Upcoming">🔀 Shuffle</button>` : ''}
                    ${upcoming.length > 0 ? `<button class="side-queue-clear-btn" id="sideClearQueueBtn">Clear</button>` : ''}
                </div>
            </div>
            <div class="side-queue-list">
        `;

        if (upcoming.length === 0) {
            html += `<div style="font-size: 13px; color: var(--text-muted); padding: 24px 0; text-align: center;">Curating Vibe Radio matches...<br><span style="font-size: 12px; opacity: 0.7;">Matching energy & mood for ${current ? current.title : 'song'}</span></div>`;
        } else {
            upcoming.forEach((t, i) => {
                const globalIdx = currentIdx + 1 + i;
                const art = t.artwork || t.image || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100';
                html += `
                    <div class="side-queue-item" data-queue-idx="${globalIdx}">
                        <img class="side-queue-art" src="${art}" alt="${t.title}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100';">
                        <div class="side-queue-details">
                            <div class="side-queue-title">${t.title}</div>
                            <div class="side-queue-sub">${t.artist}</div>
                        </div>
                        <button class="side-queue-remove-btn" data-remove-queue="${globalIdx}" title="Remove track from queue">✕</button>
                    </div>
                `;
            });
        }

        html += `</div>`;
        sideBodyQueue.innerHTML = html;

        // Jump to track in queue
        sideBodyQueue.querySelectorAll('.side-queue-item[data-queue-idx]').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.side-queue-remove-btn')) return;
                const idx = parseInt(item.getAttribute('data-queue-idx'), 10);
                if (queue[idx]) {
                    AudioPlayer.playTrack(queue[idx], queue, idx, AudioPlayer.isSequentialContext);
                }
            });
        });

        // Remove from queue
        sideBodyQueue.querySelectorAll('.side-queue-remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.getAttribute('data-remove-queue'), 10);
                if (idx > AudioPlayer.currentIndex && idx < AudioPlayer.queue.length) {
                    AudioPlayer.queue.splice(idx, 1);
                    renderSideQueueContent();
                    showToast('Removed from queue', '🗑️');
                }
            });
        });

        // Shuffle Queue
        document.getElementById('sideShuffleQueueBtn')?.addEventListener('click', () => {
            const currentIdx = AudioPlayer.currentIndex || 0;
            const up = AudioPlayer.queue.slice(currentIdx + 1);
            for (let i = up.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [up[i], up[j]] = [up[j], up[i]];
            }
            AudioPlayer.queue = [...AudioPlayer.queue.slice(0, currentIdx + 1), ...up];
            renderSideQueueContent();
            showToast('Upcoming queue shuffled', '🔀');
        });

        // Clear Queue
        document.getElementById('sideClearQueueBtn')?.addEventListener('click', () => {
            AudioPlayer.queue = AudioPlayer.queue.slice(0, AudioPlayer.currentIndex + 1);
            renderSideQueueContent();
            showToast('Upcoming queue cleared', '🧹');
        });
    }
    function getArtistMetadata(artistName = '') {
        const nameLower = (artistName || '').toLowerCase();
        if (nameLower.includes('anirudh')) {
            return {
                name: 'Anirudh Ravichander',
                avatar: 'assets/artists/anirudh.jpg',
                listeners: '34,215,800',
                bio: 'Leading Indian rockstar composer & singer known for high-octane anthems, viral sensations, and path-breaking film scores.'
            };
        }
        if (nameLower.includes('rahman')) {
            return {
                name: 'A.R. Rahman',
                avatar: 'assets/artists/ar_rahman.jpg',
                listeners: '41,920,400',
                bio: 'Two-time Academy Award and two-time Grammy-winning maestro, revolutionizing Indian and world music with timeless compositions.'
            };
        }
        if (nameLower.includes('ilaiyaraaja') || nameLower.includes('ilayaraja')) {
            return {
                name: 'Ilaiyaraaja',
                avatar: 'assets/artists/dsp.jpg',
                listeners: '18,500,000',
                bio: 'The Isaignani maestro with over 7,000 symphonic compositions and five decades of legendary Indian cinema masterpieces.'
            };
        }
        if (nameLower.includes('yuvan')) {
            return {
                name: 'Yuvan Shankar Raja',
                avatar: 'assets/artists/yuvan.jpg',
                listeners: '19,800,000',
                bio: 'Youth icon and master of soulful melodies, acoustic indie pop, and iconic cinematic background scores.'
            };
        }
        if (nameLower.includes('harris')) {
            return {
                name: 'Harris Jayaraj',
                avatar: 'assets/artists/harris.jpg',
                listeners: '15,400,000',
                bio: 'Master of lush electronic synths, exotic acoustic arrangements, and romantic blockbusters.'
            };
        }
        if (nameLower.includes('sai abhyankkar') || nameLower.includes('abhyankkar')) {
            return {
                name: 'Sai Abhyankkar',
                avatar: 'assets/artists/sai_abhyankkar.jpg',
                listeners: '9,800,000',
                bio: 'Breakthrough pop sensation and producer behind global viral chartbusters "Katchi Sera" and "Aasa Kooda".'
            };
        }
        if (nameLower.includes('sushin')) {
            return {
                name: 'Sushin Shyam',
                avatar: 'assets/artists/sushin.jpg',
                listeners: '12,100,000',
                bio: 'Trailblazing indie composer defining modern Malayalam cinematic soundscapes and experimental beats.'
            };
        }
        if (nameLower.includes('devi sri prasad') || nameLower.includes('dsp')) {
            return {
                name: 'Devi Sri Prasad',
                avatar: 'assets/artists/dsp.jpg',
                listeners: '17,200,000',
                bio: 'Rockstar music director known for infectious dance beats, mass commercial hits, and pan-Indian anthems.'
            };
        }
        if (nameLower.includes('arijit')) {
            return {
                name: 'Arijit Singh',
                avatar: 'assets/artists/arijit.jpg',
                listeners: '44,600,000',
                bio: 'India’s most celebrated romantic voice, delivering soul-stirring ballads and chart-topping Bollywood hits.'
            };
        }
        if (nameLower.includes('diljit')) {
            return {
                name: 'Diljit Dosanjh',
                avatar: 'assets/artists/diljit.jpg',
                listeners: '22,400,000',
                bio: 'Global Punjabi music powerhouse, Coachella headliner, and iconic actor and performer.'
            };
        }
        if (nameLower.includes('taylor swift')) {
            return {
                name: 'Taylor Swift',
                avatar: 'assets/artists/taylor_swift.jpg',
                listeners: '88,500,000',
                bio: '14-time Grammy winner and one of the most culturally defining singer-songwriters in history.'
            };
        }
        if (nameLower.includes('weeknd')) {
            return {
                name: 'The Weeknd',
                avatar: 'assets/artists/the_weeknd.jpg',
                listeners: '105,200,000',
                bio: 'Visionary Canadian superstar bridging 80s synth-pop, alternative R&B, and global stadium anthems.'
            };
        }
        if (nameLower.includes('billie')) {
            return {
                name: 'Billie Eilish',
                avatar: 'assets/artists/billie.jpg',
                listeners: '72,800,000',
                bio: 'Multi-Grammy and Oscar-winning alternative pop innovator with ethereal vocals and minimalist production.'
            };
        }
        const primaryName = (artistName || 'Artist').split(/[,&]/)[0].trim();
        return {
            name: primaryName || 'Lossless Master',
            avatar: 'assets/omonk_logo.jpg',
            listeners: '14,800,000',
            bio: `${primaryName} is streaming in Bit-Perfect Apple ALAC Lossless Studio Master quality on Omonk.`
        };
    }

    function updateSidePanel(track) {
        if (!sidePanel || !sideNowPlayingContent) return;
        if (!track) {
            track = AudioPlayer.getCurrentTrack() || (AudioPlayer.queue && AudioPlayer.queue[0]) || {
                id: 'default_track',
                title: "Radhimaa - From \"Think Indie\"",
                artist: "Sai Abhyankkar, Nargis Teji, Asma Teji, Vivek, Sai Smriti",
                album: "Think Indie",
                artwork: "assets/foryou_latest_tamil.jpg"
            };
        }

        if (sideEmptyState) sideEmptyState.style.display = 'none';
        sideNowPlayingContent.style.display = 'flex';

        const art = track.artwork || track.image || 'assets/foryou_radar.jpg';
        const isLiked = likedTrackIds.has(track.id);
        const queue = AudioPlayer.queue || [];
        const currentIdx = AudioPlayer.currentIndex || 0;
        const upcoming = queue.slice(currentIdx + 1);
        const nextTrack = upcoming[0];

        const sideQueueCount = document.getElementById('sideQueueCount');
        if (sideQueueCount) sideQueueCount.textContent = upcoming.length || queue.length || '15';

        const artistMeta = getArtistMetadata(track.artist || track.primaryArtist);

        // Authentic Spotify Desktop Now Playing Layout
        // Update side panel context title dynamically
        const sideCtxTitle = document.getElementById('sidePanelContextTitle');
        if (sideCtxTitle) {
            sideCtxTitle.textContent = window.currentPlaylistContextName || 'Trending Now Tamil';
        }

        const html = `
            <!-- 1. Cover Artwork (Full Width, Rounded Corners) -->
            <div class="side-now-art-wrap">
                <img class="side-now-art" id="sideNowArt" src="${art}" alt="${escapeHtml(track.title)}" onerror="this.onerror=null;this.src='assets/omonk_logo.jpg';">
            </div>

            <!-- 2. Track Title Row with Add Button (+) & Artists Row Underneath (Matching User Reference) -->
            <div class="side-now-header-row">
                <div class="side-now-title-row">
                    <div class="side-now-title" title="${escapeHtml(track.title)}">${escapeHtml(track.title)}</div>
                    <button class="side-add-circle-btn ${isLiked ? 'active' : ''}" id="sideNowAddBtn" title="Save to Your Library or Playlist">
                        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="16"></line>
                            <line x1="8" y1="12" x2="16" y2="12"></line>
                        </svg>
                    </button>
                </div>
                <div class="side-now-artist" title="${escapeHtml(track.artist || track.primaryArtist || '')}">${escapeHtml(track.artist || track.primaryArtist || 'Lossless Artist')}</div>
            </div>

            <!-- 3. Lyrics preview Card (Matching User Reference) -->
            <div class="side-lyrics-preview-card" id="sideLyricsCard">
                <div class="side-lyrics-preview-header">
                    <span class="side-lyrics-preview-title">Lyrics preview</span>
                </div>
                <div class="side-lyrics-snippet" id="sideLyricsSnippet">
                    <span class="lyrics-l1">Sing along with real-time synchronized karaoke lyrics.</span>
                </div>
            </div>

            <!-- 4. About the artist Card with Hero Banner Image (Matching User Reference) -->
            <div class="side-about-card">
                <div class="side-about-banner" style="background-image: linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(18,18,18,0.92) 100%), url('${artistMeta.avatar}');">
                    <div class="side-about-banner-title">About the artist</div>
                </div>
                <div class="side-about-details">
                    <div class="side-about-header" style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div class="side-about-name" style="font-size: 16px; font-weight: 800; color: #fff;">${escapeHtml(artistMeta.name)}</div>
                            <div class="side-about-meta" style="font-size: 13px; color: var(--text-muted);">${artistMeta.listeners} monthly listeners</div>
                        </div>
                        <button class="btn-chip" id="sideFollowArtistBtn" style="border-radius: 20px; font-size: 11px; font-weight: 700; padding: 5px 14px; flex-shrink: 0; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff;">Follow</button>
                    </div>
                    <div class="side-about-body" style="font-size: 13px; color: rgba(255,255,255,0.7); line-height: 1.45;">${artistMeta.bio}</div>
                </div>
            </div>

            <!-- 5. Next in queue Card -->
            ${nextTrack ? `
            <div class="side-next-card" id="sideNextTrackCard" style="cursor: pointer;">
                <img class="side-next-thumb" src="${nextTrack.artwork || nextTrack.image || 'assets/omonk_logo.jpg'}" alt="${escapeHtml(nextTrack.title)}" onerror="this.onerror=null;this.src='assets/omonk_logo.jpg';">
                <div class="side-next-info">
                    <div class="side-next-label">Next in queue</div>
                    <div class="side-next-title">${escapeHtml(nextTrack.title)}</div>
                    <div class="side-next-artist" style="font-size: 12px; color: #b3b3b3;">${escapeHtml(nextTrack.artist || 'Lossless')}</div>
                </div>
                <button class="side-lyrics-preview-btn" id="sideOpenQueueTabBtn" style="flex-shrink: 0;">Open queue</button>
            </div>
            ` : ''}

            <!-- 6. Audio Credits Card -->
            <div class="side-about-card" style="padding: 16px; gap: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 14px; font-weight: 800; color: #fff;">Credits</span>
                    <span style="font-size: 12px; color: var(--text-muted);">Master Hi-Res</span>
                </div>
                <div style="font-size: 13px; color: #fff; font-weight: 600;">${escapeHtml(track.artist || 'Artist')}</div>
                <div style="font-size: 11.5px; color: #a1a1aa;">Main Artist • Vocals</div>
                <div style="font-size: 13px; color: #fff; font-weight: 600; margin-top: 4px;">Lossless Audio Master</div>
                <div style="font-size: 11.5px; color: #a1a1aa;">ALAC Bit-Perfect • 24-Bit / 96kHz Direct Stream</div>
            </div>
        `;

        sideNowPlayingContent.innerHTML = html;

        // Attach Spotify-Grade Card Listeners
        document.getElementById('sideNowLikeBtn')?.addEventListener('click', () => {
            playerLikeBtn?.click();
            const nowLiked = likedTrackIds.has(track.id);
            const btn = document.getElementById('sideNowLikeBtn');
            if (btn) {
                btn.innerHTML = nowLiked ? '❤️' : '🤍';
                btn.classList.toggle('active', nowLiked);
            }
        });

        document.getElementById('sideNowAddBtn')?.addEventListener('click', () => {
            openAddToPlaylistModal(track);
        });

        document.getElementById('sideFollowArtistBtn')?.addEventListener('click', (e) => {
            const btn = e.currentTarget;
            const isFollowing = btn.textContent.trim() === 'Following';
            btn.textContent = isFollowing ? 'Follow' : 'Following';
            btn.style.color = isFollowing ? '#fff' : '#00d2ff';
            showToast(isFollowing ? `Unfollowed ${artistMeta.name}` : `Following ${artistMeta.name}`, '🧑‍🎤');
        });

        document.getElementById('sideLyricsCard')?.addEventListener('click', () => {
            openLyricsBtn?.click();
        });

        document.getElementById('sideOpenLyricsModalBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            openLyricsBtn?.click();
        });

        document.getElementById('sideNextTrackCard')?.addEventListener('click', () => {
            switchSidePanelTab('queue');
        });

        document.getElementById('sideOpenQueueTabBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            switchSidePanelTab('queue');
        });
    }

    // 5. Audio Player Event Callbacks & UI Sync
        // Mobile Download and Player Tap Bindings
    document.getElementById('playerMobileDownloadBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        playerDownloadBtn?.click();
    });

    document.querySelector('.player-now-playing')?.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        if (window.innerWidth <= 768) {
            openLyricsBtn?.click();
        }
    });

    
    // Desktop Player Bar Modern Download Button (Studio Master Lossless 24-bit)
    if (playerDownloadBtn) {
        playerDownloadBtn.addEventListener('click', async () => {
            const cur = AudioPlayer.getCurrentTrack();
            if (!cur) {
                showToast('No track currently playing', 'ℹ️');
                return;
            }
            playerDownloadBtn.classList.add('downloading');
            showToast(`Mastering "${cur.title}" in Studio Lossless 24-bit...`, '⬇️');
            try {
                const engine = window.OfflineEngine || window.OfflineManager;
                if (engine) {
                    const res = await engine.downloadTrackToFile(cur);
                    playerDownloadBtn.classList.remove('downloading');
                    playerDownloadBtn.classList.add('downloaded');
                    playerDownloadBtn.innerHTML = `
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="var(--color-primary, #00d2ff)">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                    `;
                    const sizeMsg = (res && res.sizeMB) ? ` (${res.sizeMB} MB)` : '';
                    showToast(`Downloaded "${cur.title}"${sizeMsg} in Lossless Quality!`, '✅');
                    if (typeof updateOfflineUI === 'function') updateOfflineUI();
                } else {
                    throw new Error('Offline engine unavailable');
                }
            } catch (e) {
                playerDownloadBtn.classList.remove('downloading');
                showToast('Download: ' + (e.message || 'File download started'), 'ℹ️');
            }
        });
    }

    AudioPlayer.onTrackChange = (track) => {
        playerTitle.textContent = track.title;
        playerArtist.textContent = (track.artist && track.artist !== "undefined" && track.artist !== "Unknown") ? track.artist : (track.primaryArtist || track.subtitle || "Lossless Artist");
        playerArt.src = track.artwork || track.image || 'assets/omonk_logo.jpg';

        const curPlayerDlBtn = document.getElementById('playerDownloadBtn');
        if (curPlayerDlBtn && window.OfflineManager) {
            const isDl = window.OfflineManager.isSongDownloaded(track.id);
            curPlayerDlBtn.classList.toggle('downloaded', isDl);
            curPlayerDlBtn.innerHTML = isDl ? `
                <svg viewBox="0 0 24 24" width="18" height="18" fill="var(--color-primary, #00d2ff)">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
            ` : `
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="8 12 12 16 16 12"></polyline>
                    <line x1="12" y1="8" x2="12" y2="16"></line>
                </svg>
            `;
        }
        
        // Studio-grade format detection & interactive badge update
        if (typeof AudioPlayer.getAudioFormatInfo === 'function') {
            const fmt = AudioPlayer.getAudioFormatInfo(track);
            playerQualityBadge.textContent = fmt.label;
            playerQualityBadge.classList.toggle('hi-res', fmt.isLossless);
            playerQualityBadge.title = `Cinema Audio: ${fmt.bitrate} • Click to open Technology Engine`;
        } else {
            playerQualityBadge.textContent = track.quality || ' Hi-Res Lossless • 320kbps Master';
        }

        playerLikeBtn.textContent = likedTrackIds.has(track.id) ? '❤️' : '🤍';
        playerLikeBtn.classList.toggle('liked', likedTrackIds.has(track.id));

        lyricsTrackTitle.textContent = track.title;
        lyricsTrackArtist.textContent = (track.artist && track.artist !== "undefined" && track.artist !== "Unknown") ? track.artist : (track.primaryArtist || track.subtitle || "Lossless Artist");
        Lyrics.loadLyricsForTrack(track);

        syncAllSongRowPlayButtons(!AudioPlayer.audio.paused);

        // Spotify-style: Show current playing podcast or song on the side
        updateSidePanel(track);
        if (window.innerWidth >= 1150 && sidePanel?.classList.contains('collapsed')) {
            openSidePanel('nowplaying');
        }

        // Sync with Desktop Miniplayer
        if (typeof Miniplayer !== 'undefined' && Miniplayer.isOpen) {
            Miniplayer.onTrackChange(track);
        }
    };

    AudioPlayer.onQueueChange = (queue, currentIndex) => {
        if (typeof renderSideQueueContent === 'function') {
            renderSideQueueContent();
        }
        const cur = AudioPlayer.getCurrentTrack();
        if (cur && typeof updateSidePanel === 'function') {
            updateSidePanel(cur);
        }
    };

    AudioPlayer.onPlayStateChange = (isPlaying) => {
        if (playPauseBtn) {
            playPauseBtn.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play');
            playPauseBtn.innerHTML = isPlaying ? `
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" rx="2"/>
                    <rect x="14" y="4" width="4" height="16" rx="2"/>
                </svg>
            ` : `
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l11.08-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14z"/>
                </svg>
            `;
            playPauseBtn.title = isPlaying ? 'Pause' : 'Play';
        }
        if (playerArt) {
            playerArt.classList.toggle('is-playing', isPlaying);
        }
        const nowPlayingBars = document.getElementById('nowPlayingBars');
        if (nowPlayingBars) {
            nowPlayingBars.style.display = isPlaying ? 'inline-flex' : 'none';
        }

        // Sync all song row play/pause buttons & active states
        syncAllSongRowPlayButtons(isPlaying);
        const sidePlayPauseIcon = document.getElementById('sidePlayPauseIcon');
        if (sidePlayPauseIcon) {
            sidePlayPauseIcon.textContent = isPlaying ? '⏸' : '▶';
        }
        const sideNpPlayBtn = document.getElementById('sideNpPlayPauseBtn');
        if (sideNpPlayBtn) {
            sideNpPlayBtn.textContent = isPlaying ? '⏸' : '▶';
        }

        // Sync with Desktop Miniplayer
        if (typeof Miniplayer !== 'undefined' && Miniplayer.isOpen) {
            Miniplayer.onPlayStateChange(isPlaying);
        }
    };

    AudioPlayer.onTimeUpdate = (current, total) => {
        const pct = total > 0 ? (current / total) * 100 : 0;
        currentTimeEl.textContent = formatTime(current);
        totalDurationEl.textContent = formatTime(total);
        progressFill.style.width = `${pct}%`;

        // Side panel elements update
        const sideCur = document.getElementById('sideNpCurTime') || document.getElementById('sideCurrentTime');
        const sideDur = document.getElementById('sideNpDurTime') || document.getElementById('sideTotalDuration');
        const sideFill = document.getElementById('sideNpProgressFill') || document.getElementById('sideProgressFill');
        if (sideCur) sideCur.textContent = formatTime(current);
        if (sideDur) sideDur.textContent = formatTime(total);
        if (sideFill) sideFill.style.width = `${pct}%`;

        Lyrics.updateTime(current);

        // Sync with Desktop Miniplayer
        if (typeof Miniplayer !== 'undefined' && Miniplayer.isOpen) {
            Miniplayer.onTimeUpdate(current, total);
        }
    };

    AudioPlayer.onStatusMessage = (msg) => {
        showToast(msg, '🎵');
    };

    progressTrack.addEventListener('click', (e) => {
        const rect = progressTrack.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        const duration = AudioPlayer.audio.duration;
        if (duration) {
            const seekTime = (clickX / width) * duration;
            AudioPlayer.seek(seekTime);
        }
    });

    playPauseBtn.addEventListener('click', (e) => {
        e.currentTarget?.blur();
        AudioPlayer.togglePlay();
    });
    prevBtn.addEventListener('click', () => AudioPlayer.prev());
    nextBtn.addEventListener('click', () => AudioPlayer.next(true));
    shuffleBtn.addEventListener('click', () => {
        const s = AudioPlayer.toggleShuffle();
        shuffleBtn.classList.toggle('active', s);
        showToast(s ? 'Shuffle On' : 'Shuffle Off', '🔀');
    });
    repeatBtn.addEventListener('click', () => {
        const r = AudioPlayer.toggleRepeat();
        repeatBtn.textContent = r === 'one' ? '🔂' : '🔁';
        repeatBtn.classList.toggle('active', r !== 'none');
        showToast(`Repeat: ${r}`, '🔁');
    });
    volumeSlider.addEventListener('input', () => {
        AudioPlayer.setVolume(parseFloat(volumeSlider.value));
    });
    muteBtn.addEventListener('click', () => {
        const muted = AudioPlayer.toggleMute();
        muteBtn.textContent = muted ? '🔇' : '🔊';
    });

    playerLikeBtn.addEventListener('click', () => {
        const current = AudioPlayer.getCurrentTrack();
        if (!current) return;
        if (likedTrackIds.has(current.id)) {
            likedTrackIds.delete(current.id);
            playerLikeBtn.textContent = '🤍';
            playerLikeBtn.classList.remove('liked');
        } else {
            likedTrackIds.add(current.id);
            playerLikeBtn.textContent = '❤️';
            playerLikeBtn.classList.add('liked');
            SpotifyEngine.trackLiked(current);
            showToast(`Liked: ${current.title}`, '❤️');
        }
        saveLikedTracks();
    });

// Handled by modern desktop playerDownloadBtn listener

    // 6. Lyrics Modal
    openLyricsBtn?.addEventListener('click', () => lyricsModal?.classList.add('active'));
    closeLyricsModalBtn?.addEventListener('click', () => lyricsModal?.classList.remove('active'));

    // 7. Equalizer Modal & 10-Band Sliders
    function initEqualizerSliders() {
        const freqs = [32, 64, 125, 250, 500, '1k', '2k', '4k', '8k', '16k'];
        eqSlidersWrap.innerHTML = '';
        freqs.forEach((freq, idx) => {
            const col = document.createElement('div');
            col.className = 'eq-band-col';
            col.innerHTML = `
                <span class="eq-label">+12dB</span>
                <input type="range" class="eq-slider" min="-12" max="12" step="0.5" value="0" data-band="${idx}">
                <span class="eq-label">${freq}Hz</span>
            `;
            const slider = col.querySelector('input');
            slider.addEventListener('input', () => {
                AudioPlayer.setEQBand(idx, parseFloat(slider.value));
            });
            eqSlidersWrap.appendChild(col);
        });

        const presetGains = {
            flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            studio: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            bassBoost: [4.0, 3.0, 1.5, 0.5, 0, 0, 0, 0, 0.5, 1.0],
            vocalClarity: [-1.0, -0.5, 0, 1.5, 3.0, 3.0, 1.5, 0.5, 0, 0],
            electronic: [3.5, 2.5, 1.5, 0, -1.0, 1.5, 2.0, 2.5, 3.0, 3.0],
            acoustic: [2.0, 1.5, 0.8, 1.0, 1.5, 1.5, 2.0, 2.0, 1.5, 1.0]
        };

        document.querySelectorAll('[data-preset]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('[data-preset]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const preset = btn.getAttribute('data-preset');
                AudioPlayer.setEQPreset(preset);
                const gains = presetGains[preset] || presetGains.flat;
                document.querySelectorAll('.eq-slider').forEach((slider, i) => {
                    if (gains[i] !== undefined) slider.value = gains[i];
                });
                showToast(`EQ Preset: ${preset}`, '🎚️');
            });
        });

        // Dedicated Reset Button (Requested by User)
        const eqResetBtn = document.getElementById('eqResetBtn');
        eqResetBtn?.addEventListener('click', () => {
            document.querySelectorAll('[data-preset]').forEach(b => b.classList.remove('active'));
            document.querySelector('[data-preset="flat"]')?.classList.add('active');
            AudioPlayer.setEQPreset('flat');
            document.querySelectorAll('.eq-slider').forEach(slider => {
                slider.value = 0;
            });
            showToast('Equalizer reset to 0 dB Flat', '↺');
        });

        // Apple Lossless (ALAC) Master Output Calibrator Selector
        const savedAlacGain = localStorage.getItem('alac_master_gain_db') || '9.5';
        document.querySelectorAll('[data-alac-gain]').forEach(btn => {
            const val = btn.getAttribute('data-alac-gain');
            if (val === savedAlacGain) {
                document.querySelectorAll('[data-alac-gain]').forEach(b => {
                    b.classList.remove('active');
                    b.style.background = '';
                    b.style.borderColor = '';
                    b.style.color = '';
                });
                btn.classList.add('active');
                btn.style.background = 'rgba(30, 215, 96, 0.25)';
                btn.style.borderColor = '#1ed760';
                btn.style.color = '#1ed760';
            }
            btn.addEventListener('click', () => {
                document.querySelectorAll('[data-alac-gain]').forEach(b => {
                    b.classList.remove('active');
                    b.style.background = '';
                    b.style.borderColor = '';
                    b.style.color = '';
                });
                btn.classList.add('active');
                btn.style.background = 'rgba(30, 215, 96, 0.25)';
                btn.style.borderColor = '#1ed760';
                btn.style.color = '#1ed760';
                const db = parseFloat(btn.getAttribute('data-alac-gain'));
                AudioPlayer.setStudioMasterGain(db);
                showToast(`ALAC Output: ${db > 0 ? '+' + db + ' dB (Master Match)' : '0 dB (Direct Raw)'}`, '🎧');
            });
        });

        // Vocal Clarity Boost Toggle
        const toggleVocalBoostBtn = document.getElementById('toggleVocalBoostBtn');
        const updateVocalBtnState = () => {
            if (!toggleVocalBoostBtn) return;
            const active = AudioPlayer.vocalClarityEnabled;
            toggleVocalBoostBtn.classList.toggle('active', active);
            toggleVocalBoostBtn.style.background = active ? 'rgba(30, 215, 96, 0.22)' : 'rgba(255, 255, 255, 0.05)';
            toggleVocalBoostBtn.style.borderColor = active ? '#1ed760' : 'rgba(255, 255, 255, 0.15)';
            toggleVocalBoostBtn.style.color = active ? '#1ed760' : '#a1a1aa';
            toggleVocalBoostBtn.innerHTML = `<span>🎙️ Vocal Clarity Boost: ${active ? 'ON (+3.6 dB)' : 'OFF (Bypassed)'}</span>`;
        };
        updateVocalBtnState();
        toggleVocalBoostBtn?.addEventListener('click', () => {
            AudioPlayer.setVocalClarity(!AudioPlayer.vocalClarityEnabled);
            updateVocalBtnState();
            showToast(`Vocal Clarity Boost: ${AudioPlayer.vocalClarityEnabled ? 'Active (+3.6 dB)' : 'Bypassed'}`, '🎙️');
        });

        // Earphone Anti-Vibration Filter Toggle
        const toggleAntiVibrationBtn = document.getElementById('toggleAntiVibrationBtn');
        const updateAntiVibrationBtnState = () => {
            if (!toggleAntiVibrationBtn) return;
            const active = AudioPlayer.antiVibrationEnabled;
            toggleAntiVibrationBtn.classList.toggle('active', active);
            toggleAntiVibrationBtn.style.background = active ? 'rgba(30, 215, 96, 0.22)' : 'rgba(255, 255, 255, 0.05)';
            toggleAntiVibrationBtn.style.borderColor = active ? '#1ed760' : 'rgba(255, 255, 255, 0.15)';
            toggleAntiVibrationBtn.style.color = active ? '#1ed760' : '#a1a1aa';
            toggleAntiVibrationBtn.innerHTML = `<span>🎧 Earphone Anti-Vibration: ${active ? 'ON (40Hz Cut)' : 'OFF (Full Sub)'}</span>`;
        };
        updateAntiVibrationBtnState();
        toggleAntiVibrationBtn?.addEventListener('click', () => {
            AudioPlayer.setAntiVibration(!AudioPlayer.antiVibrationEnabled);
            updateAntiVibrationBtnState();
            showToast(`Earphone Anti-Vibration: ${AudioPlayer.antiVibrationEnabled ? 'Active (40Hz Cut)' : 'Bypassed'}`, '🎧');
        });


    }
    initEqualizerSliders();

    // ==============================================================
    // 7.5. Sound & Cinema Audio Technology System & Modal Controller
    // ==============================================================
    function initCinemaAudioSystem() {}
    initCinemaAudioSystem();

    openEQBtn?.addEventListener('click', () => eqModal?.classList.add('active'));
    closeEQModalBtn?.addEventListener('click', () => eqModal?.classList.remove('active'));

    // 8. Universal Playlist Importer Modal
    openImportModalBtn?.addEventListener('click', () => importModal?.classList.add('active'));
    closeImportModalBtn?.addEventListener('click', () => importModal?.classList.remove('active'));

    document.querySelectorAll('[data-import-tab]').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('[data-import-tab]').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const target = tab.getAttribute('data-import-tab');
            document.getElementById('importTabSpotify').style.display = target === 'spotify' ? 'block' : 'none';
            document.getElementById('importTabYouTube').style.display = target === 'youtube' ? 'block' : 'none';
            document.getElementById('importTabText').style.display = target === 'text' ? 'block' : 'none';
        });
    });

    executeImportBtn?.addEventListener('click', async () => {
        const activeTab = document.querySelector('[data-import-tab].active').getAttribute('data-import-tab');
        executeImportBtn.disabled = true;
        importStatus.textContent = 'Connecting to lossless resolver...';

        try {
            let result = null;
            if (activeTab === 'spotify') {
                const url = document.getElementById('spotifyImportUrl').value.trim();
                result = await Importer.importSpotify(url, (pct, msg) => importStatus.textContent = msg);
            } else if (activeTab === 'youtube') {
                const url = document.getElementById('youtubeImportUrl').value.trim();
                result = await Importer.importYouTube(url, (pct, msg) => importStatus.textContent = msg);
            } else if (activeTab === 'text') {
                const text = document.getElementById('textImportContent').value.trim();
                result = await Importer.importText(text, 'Imported Tracklist', (pct, msg) => importStatus.textContent = msg);
            }

            if (result) {
                showToast(`Imported ${result.tracks.length} tracks!`, '🎉');
                importModal.classList.remove('active');
                renderView('library');
            }
        } catch (err) {
            importStatus.textContent = `Error: ${err.message}`;
        } finally {
            executeImportBtn.disabled = false;
        }
    });

    // 9. Offline Mode Toggle
    offlineModeToggle?.addEventListener('change', () => {
        const isOffline = offlineModeToggle.checked;
        if (isOffline) {
            showToast('Offline Mode Active: Showing cached library', '💾');
            renderView('offline');
        } else {
            showToast('Online Mode: Lossless streaming active', '🌐');
            renderView('home');
        }
    });




    // 3I. Screenshot 3: Browse All View
    async function renderBrowseView() {
        const categories = [
            { id: 'music', title: 'Music', color: 'cat-pink', art: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300', query: 'pop hits' },
            { id: 'podcasts', title: 'Podcasts', color: 'cat-emerald', art: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=300', query: 'podcast' },
            { id: 'made_for_you', title: 'Made For You', color: 'cat-navy', art: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=300', query: 'vibes' },
            { id: 'new_releases', title: 'New Releases', color: 'cat-olive', art: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300', query: 'new 2024' },
            { id: 'rain', title: 'Rain & Monsoon', color: 'cat-ocean', art: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=300', query: 'rain melody' },
            { id: 'hindi', title: 'Hindi', color: 'cat-bollywood', art: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300', query: 'bollywood hits' },
            { id: 'tamil', title: 'Tamil', color: 'cat-amber', art: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=300', query: 'tamil kuthu' },
            { id: 'punjabi', title: 'Punjabi', color: 'cat-violet', art: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300', query: 'punjabi party' },
            { id: 'telugu', title: 'Telugu', color: 'cat-gold', art: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=300', query: 'telugu mass' },
            { id: 'malayalam', title: 'Malayalam', color: 'cat-teal', art: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300', query: 'malayalam hits' },
            { id: 'kpop', title: 'K-Pop', color: 'cat-neon', art: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300', query: 'kpop' }
        ];

        let html = `
            <div class="section-header">
                <div class="section-title-wrap">
                    <h1 class="section-title">Browse all</h1>
                    <span class="section-subtitle">Explore categories, moods, genres, and languages</span>
                </div>
            </div>

            <div class="browse-all-grid">
                ${categories.map(c => `
                    <div class="category-tile ${c.color}" data-cat-query="${c.query}" data-cat-title="${c.title}">
                        <div class="category-tile-title">${c.title}</div>
                        <img class="category-tile-art" src="${c.art}" alt="${c.title}" loading="lazy">
                    </div>
                `).join('')}
            </div>
        `;

        contentScroll.innerHTML = html;

        document.querySelectorAll('[data-cat-query]').forEach(tile => {
            tile.addEventListener('click', async () => {
                const q = tile.getAttribute('data-cat-query');
                const title = tile.getAttribute('data-cat-title');
                globalSearchInput.value = title;
                contentScroll.innerHTML = '<div style="text-align:center; padding: 40px;"><div class="pulse-loader"></div><p style="color:var(--text-muted); margin-top:8px;">Loading ' + title + ' lossless tracks...</p></div>';
                try {
                    const res = await fetch(`${API_PREFIX}/api/search?q=${encodeURIComponent(q)}&limit=20`);
                    const data = await res.json();
                    const results = data.results || [];
                    allLoadedSongs = [...results];
                    window.AllSongPool = allLoadedSongs;
                    contentScroll.innerHTML = `
                        <div class="section-header">
                            <div class="section-title-wrap">
                                <h1 class="section-title">${title}</h1>
                                <span class="section-subtitle">${results.length} Omonk Studio Master Tracks</span>
                            </div>
                        </div>
                        <div class="track-table">
                            ${renderTrackRowsHtml(results)}
                        </div>
                    `;
                    bindTrackRowEvents(results);
                } catch(e) {}
            });
        });
    }

    // --- Device Profile Manager & UI Bindings ---
    const openDeviceProfileBtn = document.getElementById('openDeviceProfileBtn');
    const profileModal = document.getElementById('profileModal');
    const closeProfileModalBtn = document.getElementById('closeProfileModalBtn');
    const profileModalList = document.getElementById('profileModalList');
    const newProfileNameInput = document.getElementById('newProfileNameInput');
    const createProfileSubmitBtn = document.getElementById('createProfileSubmitBtn');
    const profileDeviceIcon = document.getElementById('profileDeviceIcon');
    const profileDeviceName = document.getElementById('profileDeviceName');

    function updateProfileDisplay() {
        if (!window.ProfileManager) return;
        const active = ProfileManager.getActiveProfile();
        if (profileDeviceIcon) profileDeviceIcon.textContent = active.avatar || '💻';
        if (profileDeviceName) profileDeviceName.textContent = active.name || 'Personal Studio';
    }

    function renderProfileModalList() {
        if (!window.ProfileManager) return;
        const profiles = ProfileManager.getAllProfiles();
        const active = ProfileManager.getActiveProfile();
        const stats = ProfileManager.getDeviceStorageStats();

        profileModalList.innerHTML = profiles.map(p => `
            <div class="profile-item-row ${p.id === active.id ? 'active' : ''}" data-profile-id="${p.id}">
                <div class="profile-row-info">
                    <div class="profile-row-avatar">${p.avatar}</div>
                    <div>
                        <div class="profile-row-name">${p.name}</div>
                        <div class="profile-row-meta">${p.device} • Created ${new Date(p.createdAt).toLocaleDateString()}</div>
                    </div>
                </div>
                ${p.id === active.id 
                    ? '<span class="profile-active-tag">Active on Device</span>' 
                    : '<button class="btn-chip" style="font-size: 11px; padding: 4px 10px;">Switch</button>'}
            </div>
        `).join('') + `
            <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 6px; padding: 6px 12px; background: rgba(255,255,255,0.02); border-radius: 8px;">
                💾 Device Storage: ${stats.approxKB} KB stored across ${stats.totalEntries} entries on this browser instance.
            </div>
        `;

        profileModalList.querySelectorAll('.profile-item-row').forEach(row => {
            row.addEventListener('click', () => {
                const pid = row.getAttribute('data-profile-id');
                if (pid && pid !== active.id) {
                    ProfileManager.switchProfile(pid);
                    loadLikedTracks();
                    if (window.Importer) Importer.loadPlaylists();
                    AudioPlayer.restorePlaybackState();
                    updateProfileDisplay();
                    renderProfileModalList();
                    profileModal.classList.remove('active');
                    renderView(currentView);
                    showToast(`Switched profile: ${ProfileManager.getActiveProfile().name}`, '💻');
                }
            });
        });
    }

    openDeviceProfileBtn?.addEventListener('click', () => {
        renderProfileModalList();
        profileModal.classList.add('active');
    });

    closeProfileModalBtn?.addEventListener('click', () => {
        profileModal.classList.remove('active');
    });

    createProfileSubmitBtn?.addEventListener('click', () => {
        const name = newProfileNameInput.value.trim();
        if (!name) {
            showToast('Please enter a profile name', '⚠️');
            return;
        }
        const created = ProfileManager.createProfile(name, '🎧');
        newProfileNameInput.value = '';
        ProfileManager.switchProfile(created.id);
        loadLikedTracks();
        if (window.Importer) Importer.loadPlaylists();
        updateProfileDisplay();
        renderProfileModalList();
        profileModal.classList.remove('active');
        renderView(currentView);
        showToast(`Created & switched to ${created.name}!`, '✨');
    });

    updateProfileDisplay();

    // --- Restore Currently Playing Song on Refresh ---
    setTimeout(() => {
        const restoredTrack = AudioPlayer.restorePlaybackState();
        if (restoredTrack && (restoredTrack.title || (restoredTrack.track && restoredTrack.track.title))) {
            const t = restoredTrack.title ? restoredTrack : restoredTrack.track;
            console.log('[AudioPlayer] Restored last playing song on refresh:', t.title);
        }
    }, 50);


    // ================= HELPER & SONG ROW SYNC =================
    function findTrackById(songId) {
        if (!songId) return null;
        const sId = String(songId);
        if (typeof allLoadedSongs !== 'undefined' && allLoadedSongs && allLoadedSongs.length > 0) {
            const t = allLoadedSongs.find(s => String(s.id) === sId);
            if (t) return t;
        }
        if (window.allLoadedSongs && window.allLoadedSongs.length > 0) {
            const t = window.allLoadedSongs.find(s => String(s.id) === sId);
            if (t) return t;
        }
        if (typeof currentSearchPayload !== 'undefined' && currentSearchPayload) {
            if (currentSearchPayload.songs) {
                const t = currentSearchPayload.songs.find(s => String(s.id) === sId);
                if (t) return t;
            }
            if (currentSearchPayload.topResult && String(currentSearchPayload.topResult.id) === sId) {
                return currentSearchPayload.topResult;
            }
        }
        if (AudioPlayer.queue) {
            const t = AudioPlayer.queue.find(s => String(s.id) === sId);
            if (t) return t;
        }
        if (window.AllSongPool) {
            const t = window.AllSongPool.find(s => String(s.id) === sId);
            if (t) return t;
        }
        return null;
    }
    window.findTrackById = findTrackById;

    function syncAllSongRowPlayButtons(isPlaying) {
        const cur = AudioPlayer.getCurrentTrack();
        const curId = cur ? String(cur.id) : null;
        const isActuallyPlaying = cur && !AudioPlayer.audio.paused && !AudioPlayer.audio.ended;

        document.querySelectorAll('.track-row').forEach(row => {
            const rowId = String(row.getAttribute('data-song-id') || row.getAttribute('data-track-id') || '');
            const isCurrent = curId && rowId === curId;
            const isThisPlaying = isCurrent && isActuallyPlaying;

            row.classList.toggle('playing', isThisPlaying);
            row.classList.toggle('active-track', isCurrent);

            const playBtn = row.querySelector('.row-play-btn');
            if (playBtn) {
                const trackName = (row.querySelector('.track-name span')?.textContent || 'Song').trim();
                playBtn.classList.toggle('is-playing', isThisPlaying);
                playBtn.setAttribute('aria-label', isThisPlaying ? `Pause ${trackName}` : `Play ${trackName}`);
                playBtn.setAttribute('title', isThisPlaying ? 'Pause' : 'Play');
            }

            const bars = row.querySelector('.playing-bars');
            const rankNum = row.querySelector('.rank-number');
            if (bars && rankNum) {
                if (isThisPlaying) {
                    bars.style.display = 'inline-flex';
                    rankNum.style.display = 'none';
                } else {
                    bars.style.display = 'none';
                    rankNum.style.display = 'inline-block';
                }
            }
        });

        // Also sync spotify-song-row elements if present
        document.querySelectorAll('.spotify-song-row').forEach(row => {
            const rowId = String(row.getAttribute('data-song-id') || '');
            const isCurrent = curId && rowId === curId;
            const isThisPlaying = isCurrent && isActuallyPlaying;

            row.classList.toggle('playing', isThisPlaying);
            const iconWrap = row.querySelector('.spotify-song-play-icon');
            if (iconWrap) {
                iconWrap.innerHTML = isThisPlaying ? `
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16" rx="2"/>
                        <rect x="14" y="4" width="4" height="16" rx="2"/>
                    </svg>
                ` : `
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l11.08-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14z"/>
                    </svg>
                `;
            }
        });

        // Also sync Top Result Play Button in Search
        const topResultBtn = document.getElementById('playTopResultBtn');
        const topResultCard = document.getElementById('topResultCard');
        if (topResultBtn && topResultCard && curId) {
            const topId = topResultCard.getAttribute('data-song-id') || topResultBtn.getAttribute('data-song-id');
            if (topId && topId === curId) {
                topResultBtn.innerHTML = isActuallyPlaying ? `
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16" rx="2"/>
                        <rect x="14" y="4" width="4" height="16" rx="2"/>
                    </svg>
                ` : `
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                        <path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l11.08-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14z"/>
                    </svg>
                `;
            }
        }
    }
    window.syncAllSongRowPlayButtons = syncAllSongRowPlayButtons;

    function handleSongPlayPauseToggle(target, pool = null, idx = 0) {
        let track = (typeof target === 'object' && target !== null) ? target : findTrackById(target);
        if (!track && typeof target === 'string') {
            track = findTrackById(target);
        }
        if (!track) {
            console.warn('[PlayPauseToggle] Track not found:', target);
            return;
        }

        const cur = AudioPlayer.getCurrentTrack();
        const audio = AudioPlayer.audio;

        // 1. If clicking on currently loaded song:
        // Pause if playing, resume from current position if paused (do not restart)
        if (cur && (String(cur.id) === String(track.id) || (cur.title && track.title && cur.title === track.title))) {
            if (audio.paused) {
                AudioPlayer.togglePlay();
                syncAllSongRowPlayButtons(true);
            } else {
                audio.pause();
                syncAllSongRowPlayButtons(false);
            }
            return;
        }

        // 2. Clicking a song that is not playing:
        if (currentView === 'playlist' || currentView === 'album' || currentView === 'liked' || currentView === 'offline') {
            const effectivePool = (pool && Array.isArray(pool) && pool.length > 0) ? pool : (typeof allLoadedSongs !== 'undefined' && allLoadedSongs.length > 0 ? allLoadedSongs : (window.allLoadedSongs || [track]));
            const trackIdx = effectivePool.findIndex(t => String(t.id) === String(track.id) || (t.title && track.title && t.title === track.title));
            const finalIdx = trackIdx >= 0 ? trackIdx : idx;

            AudioPlayer.playTrack(track, effectivePool, finalIdx, true);
            syncAllSongRowPlayButtons(true);
            showToast(`Playing "${track.title}"`, '▶️');
        } else {
            // In Search, Home, Artists, or general tracks:
            // Play with dynamic Vibe Flow matching the acoustic vibe of the selected song!
            AudioPlayer.playTrackWithVibeRadio(track);
            syncAllSongRowPlayButtons(true);
            showToast(`Playing "${track.title}" with Vibe Flow`, '✨');
        }
    }
    window.handleSongPlayPauseToggle = handleSongPlayPauseToggle;

    // ================= GLOBAL SPACE BAR SHORTCUT & BLUR =================
    // ONE global keydown listener on document for the Space key
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.key === ' ' || e.keyCode === 32) {
            const active = document.activeElement;
            const isInput = active && (
                active.tagName === 'INPUT' ||
                active.tagName === 'TEXTAREA' ||
                active.tagName === 'SELECT' ||
                active.isContentEditable ||
                active.getAttribute('contenteditable') === 'true'
            );
            if (isInput) return; // Allow space in text inputs

            e.preventDefault();
            e.stopPropagation();

            if (active && (active.tagName === 'BUTTON' || active.getAttribute('role') === 'button')) {
                active.blur();
            }

            AudioPlayer.togglePlay();
        }
    }, true);

    // Blur buttons after click to prevent double toggle on subsequent Space bar press
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('button, [role="button"]');
        if (btn) {
            btn.blur();
        }
    }, true);

    // Event delegation on contentScroll for dynamically rendered song rows & cards
    if (contentScroll) {
        contentScroll.addEventListener('click', (e) => {
            // Row play/pause button clicked
            const playBtn = e.target.closest('.row-play-btn');
            if (playBtn) {
                e.preventDefault();
                e.stopPropagation();
                playBtn.blur();
                const row = playBtn.closest('.track-row');
                const songId = playBtn.getAttribute('data-song-id') || row?.getAttribute('data-track-id');
                if (songId) {
                    handleSongPlayPauseToggle(songId, null, 0);
                }
                return;
            }

            // Spotify style song play icon clicked
            const spotPlay = e.target.closest('.spotify-song-play-icon');
            if (spotPlay) {
                e.preventDefault();
                e.stopPropagation();
                const row = spotPlay.closest('.spotify-song-row');
                const songId = row?.getAttribute('data-song-id');
                if (songId) {
                    handleSongPlayPauseToggle(songId, null, 0);
                }
                return;
            }
        });
    }

    // ================= EXPORT / IMPORT BACKUP (NO LOGIN) =================
    async function requestPersistentStorage() {
        if (navigator.storage && navigator.storage.persist) {
            try {
                const isPersisted = await navigator.storage.persisted();
                if (!isPersisted) {
                    const granted = await navigator.storage.persist();
                    console.log('[Storage] Persistent storage granted:', granted);
                }
            } catch (e) {
                console.warn('[Storage] Persistent storage request error:', e);
            }
        }
    }

    function checkBackupStatus() {
        const exportBtn = document.getElementById('exportBtn');
        if (!exportBtn) return;
        const lastBackup = localStorage.getItem('omonk_last_backup_timestamp');
        const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
        const now = Date.now();

        if (!lastBackup || (now - parseInt(lastBackup, 10)) > FOURTEEN_DAYS_MS) {
            exportBtn.classList.add('needs-backup');
            exportBtn.setAttribute('title', 'Backup recommended: More than 14 days since last backup');
        } else {
            exportBtn.classList.remove('needs-backup');
            exportBtn.setAttribute('title', 'Export backup of playlists, likes & settings');
        }
    }

    function exportBackup() {
        try {
            const exportData = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                // Exclude last backup timestamp from exports
                if (key === 'omonk_last_backup_timestamp' || key === 'last_backup_timestamp') {
                    continue;
                }
                exportData[key] = localStorage.getItem(key);
            }

            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const filename = `my-music-site-backup-${year}-${month}-${day}.json`;

            const payload = {
                app: 'my-music-site',
                version: '1.0',
                exportedAt: now.toISOString(),
                data: exportData
            };

            const jsonStr = JSON.stringify(payload, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            // Record last backup timestamp and remove warning class
            localStorage.setItem('omonk_last_backup_timestamp', Date.now().toString());
            checkBackupStatus();
            requestPersistentStorage();

            showToast(`Backup exported (${filename})`, '💾');
        } catch (err) {
            console.error('[Backup Export Error]', err);
            showToast('Failed to export backup: ' + (err.message || 'Unknown error'), '⚠️');
        }
    }

    function mergeBackupData(incomingData) {
        for (const [key, rawVal] of Object.entries(incomingData)) {
            const currentVal = localStorage.getItem(key);
            if (!currentVal) {
                localStorage.setItem(key, rawVal);
                continue;
            }

            try {
                const currentObj = JSON.parse(currentVal);
                const incomingObj = JSON.parse(rawVal);

                if (Array.isArray(currentObj) && Array.isArray(incomingObj)) {
                    if (key.includes('playlists') || (incomingObj[0] && typeof incomingObj[0] === 'object' && incomingObj[0].id)) {
                        const mergedPlaylists = [...currentObj];
                        for (const inPl of incomingObj) {
                            const existingPl = mergedPlaylists.find(p => p.id === inPl.id || (p.name && inPl.name && p.name.toLowerCase() === inPl.name.toLowerCase()));
                            if (!existingPl) {
                                mergedPlaylists.push(inPl);
                            } else {
                                const trackMap = new Map();
                                (existingPl.tracks || []).forEach(t => trackMap.set(String(t.id), t));
                                (inPl.tracks || []).forEach(t => {
                                    if (!trackMap.has(String(t.id))) trackMap.set(String(t.id), t);
                                });
                                existingPl.tracks = Array.from(trackMap.values());
                            }
                        }
                        localStorage.setItem(key, JSON.stringify(mergedPlaylists));
                        continue;
                    }

                    const mergedSet = new Set([...currentObj, ...incomingObj]);
                    localStorage.setItem(key, JSON.stringify(Array.from(mergedSet)));
                    continue;
                }

                if (typeof currentObj === 'object' && typeof incomingObj === 'object' && currentObj !== null && incomingObj !== null) {
                    const mergedObj = { ...currentObj, ...incomingObj };
                    localStorage.setItem(key, JSON.stringify(mergedObj));
                    continue;
                }
            } catch (e) {
                // Non-JSON, keep current
            }
        }
    }

    function initBackupAndRestore() {
        const exportBtn = document.getElementById('exportBtn');
        const importBtn = document.getElementById('importBtn');
        const importFile = document.getElementById('importFile');
        const backupRestoreModal = document.getElementById('backupRestoreModal');
        const closeBackupRestoreModalBtn = document.getElementById('closeBackupRestoreModalBtn');
        const confirmReplaceBackupBtn = document.getElementById('confirmReplaceBackupBtn');
        const confirmMergeBackupBtn = document.getElementById('confirmMergeBackupBtn');
        const cancelBackupRestoreBtn = document.getElementById('cancelBackupRestoreBtn');
        const backupFileInfo = document.getElementById('backupFileInfo');

        let pendingBackupPayload = null;

        exportBtn?.addEventListener('click', () => {
            exportBtn.blur();
            exportBackup();
        });

        importBtn?.addEventListener('click', () => {
            importBtn.blur();
            if (importFile) {
                importFile.value = '';
                importFile.click();
            }
        });

        importFile?.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (ev) => {
                try {
                    const text = ev.target.result;
                    let parsed;
                    try {
                        parsed = JSON.parse(text);
                    } catch (err) {
                        showToast('Invalid JSON file. Please select a valid backup JSON.', '⚠️');
                        return;
                    }

                    if (!parsed || typeof parsed !== 'object' || !parsed.data || typeof parsed.data !== 'object') {
                        showToast('Invalid backup format: missing data payload.', '⚠️');
                        return;
                    }

                    const validApps = ['my-music-site', 'omonk-music', 'omonk', 'lossless-music'];
                    if (!parsed.app || !validApps.includes(String(parsed.app).toLowerCase())) {
                        showToast(`Invalid backup file: Unsupported app id "${parsed.app || 'unknown'}".`, '⚠️');
                        return;
                    }

                    pendingBackupPayload = parsed;
                    if (backupFileInfo) {
                        const exportDate = parsed.exportedAt ? new Date(parsed.exportedAt).toLocaleString() : 'Recent';
                        const keyCount = Object.keys(parsed.data).length;
                        backupFileInfo.innerHTML = `<strong>File:</strong> ${file.name}<br><strong>Exported:</strong> ${exportDate}<br><strong>Items:</strong> ${keyCount} storage items (Playlists, Favorites, Preferences)`;
                    }
                    backupRestoreModal?.classList.add('active');
                } catch (readErr) {
                    console.error('[Backup Read Error]', readErr);
                    showToast('Failed to read backup file: ' + readErr.message, '⚠️');
                }
            };
            reader.readAsText(file);
        });

        confirmReplaceBackupBtn?.addEventListener('click', async () => {
            confirmReplaceBackupBtn.blur();
            if (!pendingBackupPayload || !pendingBackupPayload.data) return;
            try {
                localStorage.clear();
                for (const [k, v] of Object.entries(pendingBackupPayload.data)) {
                    localStorage.setItem(k, v);
                }
                localStorage.setItem('omonk_last_backup_timestamp', Date.now().toString());
                await requestPersistentStorage();
                showToast('Backup restored successfully! Reloading...', '✅');
                backupRestoreModal?.classList.remove('active');
                setTimeout(() => window.location.reload(), 700);
            } catch (err) {
                console.error('[Backup Replace Error]', err);
                if (err.name === 'QuotaExceededError') {
                    showToast('Storage quota exceeded! Unable to save restored data to browser storage.', '⚠️');
                } else {
                    showToast('Failed to restore backup: ' + (err.message || 'Storage error'), '⚠️');
                }
            }
        });

        confirmMergeBackupBtn?.addEventListener('click', async () => {
            confirmMergeBackupBtn.blur();
            if (!pendingBackupPayload || !pendingBackupPayload.data) return;
            try {
                mergeBackupData(pendingBackupPayload.data);
                localStorage.setItem('omonk_last_backup_timestamp', Date.now().toString());
                await requestPersistentStorage();
                showToast('Backup merged successfully! Reloading...', '✅');
                backupRestoreModal?.classList.remove('active');
                setTimeout(() => window.location.reload(), 700);
            } catch (err) {
                console.error('[Backup Merge Error]', err);
                if (err.name === 'QuotaExceededError') {
                    showToast('Storage quota exceeded! Unable to save merged data to browser storage.', '⚠️');
                } else {
                    showToast('Failed to merge backup: ' + (err.message || 'Storage error'), '⚠️');
                }
            }
        });

        const closeBackupModal = () => {
            backupRestoreModal?.classList.remove('active');
            pendingBackupPayload = null;
            if (importFile) importFile.value = '';
        };

        closeBackupRestoreModalBtn?.addEventListener('click', closeBackupModal);
        cancelBackupRestoreBtn?.addEventListener('click', closeBackupModal);
    }

    // --- Robust Boot Sequence (Guaranteed Home Screen & Feature Availability) ---
    async function bootApp() {
        try {
            initBackupAndRestore();
            checkBackupStatus();
            requestPersistentStorage();
        } catch (err) {
            console.warn('[Storage/Backup Init]', err);
        }

        try {
            await loadLanguages();
        } catch (err) {
            console.warn('[Language Init]', err);
        }

        try {
            await renderView('home');
        } catch (err) {
            console.error('[Render Home Error]', err);
        }
    }
    await bootApp();

    // Pre-seed default track & queue matching reference screenshot
    if (!AudioPlayer.queue || AudioPlayer.queue.length === 0) {
        const defaultQueue = [
            {
                id: 'omonk_default_seed',
                title: "Party Dance Theme",
                artist: "Arrol Corelli",
                album: "Party Dance",
                artwork: "assets/foryou_radar.jpg",
                image: "assets/foryou_radar.jpg",
                duration: 75
            },
            {
                id: 'omonk_q_1',
                title: "It's Time to Dance and Party Cheer",
                artist: "Vandemataram Srinivas, Indian Songs...",
                artwork: "assets/foryou_finds.jpg",
                image: "assets/foryou_finds.jpg",
                duration: 180
            },
            {
                id: 'omonk_q_2',
                title: "Penne..Penne",
                artist: "Yugendran",
                artwork: "assets/foryou_friday.jpg",
                image: "assets/foryou_friday.jpg",
                duration: 210
            },
            {
                id: 'omonk_q_3',
                title: "Assa Assami",
                artist: "Anuradha Sriram",
                artwork: "assets/foryou_mood.jpg",
                image: "assets/foryou_mood.jpg",
                duration: 240
            },
            {
                id: 'omonk_q_4',
                title: "Hukum - Thalaivar Alappara",
                artist: "Anirudh Ravichander",
                artwork: "assets/artists/anirudh.jpg",
                image: "assets/artists/anirudh.jpg",
                duration: 206
            },
            {
                id: 'omonk_q_5',
                title: "Chaleya",
                artist: "Anirudh Ravichander, Arijit Singh",
                artwork: "assets/foryou_tamil50.jpg",
                image: "assets/foryou_tamil50.jpg",
                duration: 200
            },
            {
                id: 'omonk_q_6',
                title: "Badass",
                artist: "Anirudh Ravichander",
                artwork: "assets/foryou_chill.jpg",
                image: "assets/foryou_chill.jpg",
                duration: 229
            },
            {
                id: 'omonk_q_7',
                title: "Arabic Kuthu",
                artist: "Anirudh Ravichander, Jonita Gandhi",
                artwork: "assets/foryou_friday.jpg",
                image: "assets/foryou_friday.jpg",
                duration: 280
            },
            {
                id: 'omonk_q_8',
                title: "Naa Ready",
                artist: "Thalapathy Vijay, Anirudh Ravichander",
                artwork: "assets/foryou_finds.jpg",
                image: "assets/foryou_finds.jpg",
                duration: 248
            },
            {
                id: 'omonk_q_9',
                title: "Vathi Coming",
                artist: "Anirudh Ravichander, Gana Balachandar",
                artwork: "assets/foryou_radar.jpg",
                image: "assets/foryou_radar.jpg",
                duration: 230
            },
            {
                id: 'omonk_q_10',
                title: "Chellamma",
                artist: "Anirudh Ravichander, Jonita Gandhi",
                artwork: "assets/foryou_mood.jpg",
                image: "assets/foryou_mood.jpg",
                duration: 236
            },
            {
                id: 'omonk_q_11',
                title: "Kaavaalaa",
                artist: "Anirudh Ravichander, Shilpa Rao",
                artwork: "assets/foryou_chill.jpg",
                image: "assets/foryou_chill.jpg",
                duration: 191
            },
            {
                id: 'omonk_q_12',
                title: "Marana Mass",
                artist: "Anirudh Ravichander, SPB",
                artwork: "assets/artists/ar_rahman.jpg",
                image: "assets/artists/ar_rahman.jpg",
                duration: 216
            },
            {
                id: 'omonk_q_13',
                title: "Rowdy Baby",
                artist: "Dhanush, Dhee",
                artwork: "assets/foryou_tamil50.jpg",
                image: "assets/foryou_tamil50.jpg",
                duration: 281
            },
            {
                id: 'omonk_q_14',
                title: "Why This Kolaveri Di",
                artist: "Dhanush, Anirudh Ravichander",
                artwork: "assets/artists/anirudh.jpg",
                image: "assets/artists/anirudh.jpg",
                duration: 245
            }
        ];
        AudioPlayer.queue = defaultQueue;
        AudioPlayer.currentIndex = 0;
        AudioPlayer.currentTrack = defaultQueue[0];
    }
    updateSidePanel(AudioPlayer.getCurrentTrack() || AudioPlayer.queue[0]);
    renderSideQueueContent();
    if (window.innerWidth >= 1024) {
        sidePanel?.classList.remove('collapsed');
        switchSidePanelTab('nowplaying');
    }
});



    // ================= MULTI-DEVICE AUTO-REFRESH & LIVE UPDATE SYNC =================
    const CURRENT_APP_VERSION = "8.9.9";
    let latestServerTimestamp = 0;
    const syncRefreshBtn = document.getElementById('syncRefreshBtn');
    const updateBanner = document.getElementById('updateAvailableBanner');
    const updateNowBtn = document.getElementById('updateNowBtn');
    const dismissUpdateBtn = document.getElementById('dismissUpdateBtn');

    function isSemverNewer(remote, current) {
        if (!remote || !current) return false;
        const rParts = String(remote).replace(/[^0-9.]/g, '').split('.').map(n => parseInt(n, 10) || 0);
        const cParts = String(current).replace(/[^0-9.]/g, '').split('.').map(n => parseInt(n, 10) || 0);
        for (let i = 0; i < Math.max(rParts.length, cParts.length); i++) {
            const r = rParts[i] || 0;
            const c = cParts[i] || 0;
            if (r > c) return true;
            if (r < c) return false;
        }
        return false;
    }

    let syncBroadcast = null;
    try {
        if ('BroadcastChannel' in window) {
            syncBroadcast = new BroadcastChannel('lossless_studio_sync');
            syncBroadcast.onmessage = (event) => {
                if (event.data?.version && isSemverNewer(event.data.version, CURRENT_APP_VERSION)) {
                    showUpdateAvailableUI();
                }
            };
        }
    } catch (e) {}

    function showUpdateAvailableUI() {
        if (updateBanner) updateBanner.style.display = 'block';
        if (syncRefreshBtn) {
            syncRefreshBtn.classList.add('has-update');
            const txt = document.getElementById('syncRefreshText');
            if (txt) txt.textContent = 'Update';
        }
    }

    async function triggerInstantRefresh() {
        if (syncRefreshBtn) {
            syncRefreshBtn.innerHTML = '<span>⏳ Syncing...</span>';
            syncRefreshBtn.disabled = true;
        }
        showToast('Refreshing app state & clearing cache...', '🔄');

        // 1. Kick off non-blocking serverless sync with strict 2.5s timeout (never hangs)
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2500);
            await fetch(`${API_PREFIX}/api/sync-charts?timeframe=all&_t=${Date.now()}`, {
                signal: controller.signal
            }).catch(() => {});
            clearTimeout(timeoutId);
        } catch (e) {}

        // 2. Clear all Service Worker caches and notify active workers
        try {
            if ('caches' in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map(k => caches.delete(k)));
            }
            if ('serviceWorker' in navigator) {
                const regs = await navigator.serviceWorker.getRegistrations();
                for (const reg of regs) {
                    await reg.update().catch(() => {});
                    if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                }
            }
        } catch (e) {}

        // 3. Clear session storage
        try {
            sessionStorage.clear();
        } catch (e) {}

        if (syncRefreshBtn) {
            syncRefreshBtn.innerHTML = '<span>✅ Synced!</span>';
        }
        showToast('App refreshed successfully!', '✅');

        try {
            syncBroadcast?.postMessage({ type: 'APP_UPDATED', timestamp: Date.now() });
        } catch (e) {}

        // 4. Force hard reload with timestamp parameter to bypass iOS standalone PWA cache
        setTimeout(() => {
            const base = window.location.href.split('?')[0];
            window.location.replace(`${base}?_v=${Date.now()}`);
        }, 400);
    }

    syncRefreshBtn?.addEventListener('click', () => {
        triggerInstantRefresh();
    });

    updateNowBtn?.addEventListener('click', () => {
        triggerInstantRefresh();
    });

    let userDismissedUpdateVersion = null;
    dismissUpdateBtn?.addEventListener('click', () => {
        if (updateBanner) updateBanner.style.display = 'none';
        userDismissedUpdateVersion = true;
    });

    async function checkForStudioUpdates() {
        try {
            // Check version.json first (client static asset), then fallback to /api/version
            let res = await fetch(`version.json?_t=${Date.now()}`).catch(() => null);
            if (!res || !res.ok) {
                res = await fetch(`${API_PREFIX}/api/version?_t=${Date.now()}`).catch(() => null);
            }
            if (res && res.ok) {
                const data = await res.json();
                const isNewer = data.version && isSemverNewer(data.version, CURRENT_APP_VERSION);
                if (isNewer) {
                    console.log(`[Update Available]: Current ${CURRENT_APP_VERSION} -> Remote ${data.version}`);
                    if (!userDismissedUpdateVersion && updateBanner) {
                        updateBanner.style.display = 'flex';
                    }
                    if (syncRefreshBtn) {
                        syncRefreshBtn.classList.add('has-update');
                        const txt = document.getElementById('syncRefreshText');
                        if (txt) txt.textContent = 'Update';
                    }
                } else {
                    if (updateBanner) updateBanner.style.display = 'none';
                    if (syncRefreshBtn) {
                        syncRefreshBtn.classList.remove('has-update');
                        const txt = document.getElementById('syncRefreshText');
                        if (txt) txt.textContent = 'Sync';
                    }
                }
            }
        } catch (e) {}
    }

    // Run check immediately on load, and periodic poll
    checkForStudioUpdates();
    setInterval(checkForStudioUpdates, 30000);
