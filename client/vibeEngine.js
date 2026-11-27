/**
 * vibeEngine.js - Dynamic Acoustic Vibe-Matching Recommendation Engine v5.3.0
 * 
 * Selects the next song based on dynamic acoustic and metadata proximity:
 * - Decoupled entirely from static dashboard feeds.
 * - Acoustic Feature Inference: Derives BPM, energy, mood, and tempo from title/artist/genre keywords when raw tags are missing.
 * - Proactive Candidate Expansion: Dynamically fetches related online tracks by composer/soundtrack.
 * - Language Preservation: Preserves current playing language (Tamil, Hindi, English, etc.) without unexpected jumps.
 * - Anti-Loop Guard: Excludes last 25 history tracks; caps artist repetitions to max 2 in a row.
 * - Weighted-random selection from top 5 acoustic candidates.
 */

(function(global) {
  'use strict';

  // Online artist/album related tracks cache (TTL 30 minutes)
  const relatedTracksCache = new Map();

  function getVibeApiPrefix() {
    if (typeof window !== 'undefined' && window.API_PREFIX) return window.API_PREFIX;
    const isCat = typeof window !== 'undefined' && (window.location.hostname.includes('catalyst') || window.location.hostname.includes('zohoweb'));
    return isCat ? '/server/music_api' : '';
  }

  function normalizeCanonicalTitle(title) {
    if (!title) return '';
    return title
      .toLowerCase()
      .replace(/\(from\s+["']?.*?["']?\)/gi, '')
      .replace(/[\(\[].*?[\)\]]/g, '')
      .replace(/\b(remastered|re-mastered|original motion picture soundtrack|full video|lyrical|lyrics|audio|video song|version|reprise|male|female|duet)\b/gi, '')
      .replace(/[^a-z0-9\u0B80-\u0BFF\u0900-\u097F\u0C00-\u0C7F\u0D00-\u0D7F]/g, '')
      .trim();
  }

  function isSameSongOrReprise(candTitle, seedTitle) {
    if (!candTitle || !seedTitle) return false;
    const sc = normalizeCanonicalTitle(candTitle);
    const ss = normalizeCanonicalTitle(seedTitle);
    if (!sc || !ss) return false;
    if (sc === ss) return true;
    if (sc.length >= 6 && ss.length >= 6 && (sc.includes(ss) || ss.includes(sc))) return true;
    return false;
  }

  const KNOWN_COMPOSERS = [
    'yuvan shankar raja', 'a.r. rahman', 'ar rahman', 'anirudh ravichander', 'anirudh',
    'harris jayaraj', 'ilaiyaraaja', 'ilayaraja', 'santhosh narayanan', 'g.v. prakash',
    'gv prakash', 'vidyasagar', 'deva', 'd. imman', 'imman', 'hiphop tamizha',
    'sai abhyankkar', 'sean roldan', 'sam c.s.', 'thaman', 'devi sri prasad',
    'pritam', 'vishal-shekhar', 'amit trivedi', 'shankar-ehsaan-loy', 'sushin shyam',
    'm.m. keeravani', 'mani sharma'
  ];

  function pickComposerOrPrimaryArtist(artStr) {
    if (!artStr) return '';
    const parts = artStr.split(/[,&]/).map(p => p.replace(/[.\-_]/g, ' ').trim()).filter(Boolean);
    for (const p of parts) {
      const low = p.toLowerCase();
      if (KNOWN_COMPOSERS.some(c => low.includes(c.replace(/\./g, '')) || c.replace(/\./g, '').includes(low))) {
        return p;
      }
    }
    return parts[0] || '';
  }

  function cleanArtistPrimaryKey(artStr) {
    if (!artStr) return '';
    const picked = pickComposerOrPrimaryArtist(artStr);
    return (picked || artStr.split(/[,&]/)[0]).replace(/[.\-_]/g, ' ').trim().toLowerCase();
  }

  const SAD_VIBE_RE = /\b(sad|pathos|heartbreak|valikudhu|valiye|pirinthathu|pirivu|thanimai|azhugai|kanave|uyirin|kanmani|cheemayi|thenpaandi|thenpandi|thendral vandhu|amma endru|aarariraro|kanne kalaimane|poove sempoove|pogadhe|oru kal|yaen ennai|channa mereya|agar tum saath ho|tujhe bhula diya|kabira|bekhayali|judai|luka chuppi|ae dil hai|kal ho na|someone like you|fix you|the night we met|all too well|lovely|arcade|tears|cry|pain|grief|alone|soga|sogam)\b/i;
  const DANCE_VIBE_RE = /\b(kuthu|dance|party|club|edm|remix|bass|beat|dappan|item|dj|disco|thara local|jala jala|arabic kuthu|jimikki|dhol|nacho|fast|gym|power|alappara|bottle|machi|tasmac|sarakku|vethalaiya|vethala|potendi|billa|mankatha|baila|bailaa|thiruvizha|dappankuthu|aaluma|doluma|marana mass|vaathi coming|naa ready|jalabulanjangu|jalabulajangu|sodakku|otha sollaala|chinna machan|appadi podu|podu|o podu|nakka mukka|jithu jilladi|danga maari|donu donu|why this kolaveri|saroja|saman|nikolo|chennai 600028|jalsa|pannungada|manmadha raasa|taxi taxi|urvasi|mukkala|pettai|chikku bukku|rowdy baby|selfie pulla|vaadi pulla|no money|top tucker|kaavaalaa|kaavaala|chill bro|verithanam|pathala|guleba|kutti story|dandanakka|gana|gaana|whistle podu|manasilaayo|golden sparrow|matta|peppy|upbeat|funk|bhangra|lungi dance|badtameez|kar gayi chull|kala chashma|vaada bin laada|rap|drill|hip hop|rock)\b/i;
  const MASS_VIBE_RE = /\b(mass|anthem|brass|hero|intro|whistle|thala|badass|hukum|tiger|jailer|master|leo|beast|vikram|roar|bgm|theme|veera|veezha veera|hunter|raavana|god mode|powerhouse|bloody sweet|kaththi|mersal|theri|kabali|neruppu da|aalaporan|petta|teaser)\b/i;
  const CHILL_VIBE_RE = /\b(chill|lofi|lo-fi|relax|peace|calm|coffee|night|breeze|ambient|aesthetic|slowed|reverb|unplugged|lullaby)\b/i;
  const DEVOTIONAL_VIBE_RE = /\b(devotional|bhajan|carnatic|classical|raga|temple|flute|violin|nadaswaram|sloka|stotram|om|shiva|krishna|murugan|ayyappa|bakthi|bhakti|suprabhatam)\b/i;
  const ROMANTIC_VIBE_RE = /\b(kadhal|kaadhal|love|romance|romantic|melody|anbe|acoustic|nee|nenjam|kanne|penne|vizhi|heart|soft|sweet|duet|priya|prema|ishq|pyaar|mohabbat|tum hi ho|kesariya|perfect|golden hour|ennavale|munbe vaa|vaseegara|poongatrile|uyire|suttrum vizhi|new york nagaram|moongil thottam|thalli pogathey|pookkale|nenjukkul|ennodu nee|hosanna|vinnaithaandi|venmathiye)\b/i;

  function isVibeCompatible(seedVibe, candVibe, strict = true) {
    if (!seedVibe || !candVibe || candVibe === seedVibe) return true;
    if (seedVibe === 'dance' || seedVibe === 'mass') {
      if (candVibe === 'dance' || candVibe === 'mass') return true;
      return !strict && candVibe === 'melodic';
    }
    if (seedVibe === 'sad') {
      if (candVibe === 'sad' || candVibe === 'chill') return true;
      return candVibe === 'romantic' || (!strict && candVibe === 'melodic');
    }
    if (seedVibe === 'romantic') {
      return candVibe === 'romantic' || candVibe === 'chill' || candVibe === 'melodic';
    }
    if (seedVibe === 'chill') {
      return candVibe === 'chill' || candVibe === 'romantic' || candVibe === 'melodic';
    }
    if (seedVibe === 'devotional') {
      return candVibe === 'devotional' || candVibe === 'chill';
    }
    // melodic: compatible with melodic/romantic/chill, never dance/mass/sad
    return candVibe === 'melodic' || candVibe === 'romantic' || candVibe === 'chill';
  }

  function getVibeSearchKeyword(vibe) {
    if (vibe === 'sad') return 'sad pathos melody';
    if (vibe === 'dance') return 'dance kuthu party';
    if (vibe === 'mass') return 'mass bgm theme';
    if (vibe === 'romantic') return 'romantic melody kadhal';
    if (vibe === 'chill') return 'chill lofi relax';
    if (vibe === 'devotional') return 'devotional classical';
    return 'melody';
  }


  /**
   * High-Precision 6-Category Vibe Classifier
   * Categorizes any track into: 'sad', 'romantic', 'dance', 'mass', 'chill', 'devotional', or 'melodic'
   */
  function detectVibeCategory(track) {
    if (!track) return 'melodic';
    const raw = `${track.title || ''} ${track.artist || ''} ${track.album || ''} ${track.mood || ''} ${track.vibe || ''}`.toLowerCase();

    // 1. Sad / Pathos / Heartbreak / Emotional Ballad
    if (SAD_VIBE_RE.test(raw)) {
      return 'sad';
    }

    // 2. Energetic / Dance / Party / Kuthu
    if (DANCE_VIBE_RE.test(raw)) {
      return 'dance';
    }

    // 3. Mass / Anthem / Hero BGM
    if (MASS_VIBE_RE.test(raw)) {
      return 'mass';
    }

    // 4. Chill / Lo-Fi / Relaxing
    if (CHILL_VIBE_RE.test(raw)) {
      return 'chill';
    }

    // 5. Devotional / Classical
    if (DEVOTIONAL_VIBE_RE.test(raw)) {
      return 'devotional';
    }

    // 6. Romantic / Melody
    if (ROMANTIC_VIBE_RE.test(raw)) {
      return 'romantic';
    }

    // Acoustic feature fallbacks (only apply when explicit numeric energy/bpm exist)
    const hasBpm = typeof track.bpm === 'number' && !isNaN(track.bpm);
    const hasEnergy = typeof track.energy === 'number' && !isNaN(track.energy);
    const bpm = hasBpm ? track.bpm : 100;
    const energy = hasEnergy ? track.energy : 0.60;
    if (hasEnergy && energy < 0.42 && bpm < 88) return 'sad';
    if (hasEnergy && energy > 0.75 && bpm > 118) return 'dance';
    if (hasEnergy && energy < 0.50) return 'romantic';
    return 'melodic';
  }

  const NON_SONG_RE = /\b(karaoke|instrumental|minus\s*one|party\s*tyme|prosource|ameritz|serene\s*songs|made\s*pop|backing\s*version|tribute|thirukkural|thirupathigam|namasivaya|kolaru|sloka|stotram|mantra|discourse|audiobook|speech|dialogue)\b/i;

  const CLASSIC_ARTIST_RE = /\b(t\.?\s*m\.?\s*soundararajan|l\.?\s*r\.?\s*eswari|p\.?\s*susheela|m\.?\s*s\.?\s*viswanathan|k\.?\s*v\.?\s*mahadevan|a\.?\s*m\.?\s*rajah|ghantasala|p\.?\s*b\.?\s*srinivas|malaysia\s*vasudevan|lata\s*mangeshkar|kishore\s*kumar|mohammed\s*rafi|asha\s*bhosle|mukesh|manna\s*dey)\b/i;
  const MODERN_ARTIST_RE = /\b(anirudh|sai\s*abhyankkar|hiphop\s*tamizha|g\.?\s*v\.?\s*prakash|sam\s*c\.?\s*s\.?|leon\s*james|sean\s*roldan|asal\s*kolaar|paal\s*dabba)\b/i;

  function extractTrackYear(t) {
    if (!t) return 0;
    const y = parseInt(t.year || t.releaseYear || 0, 10);
    if (y >= 1940 && y <= 2030) return y;
    const m = String(t.album || t.title || '').match(/\b(19[4-9]\d|20[0-2]\d)\b/);
    return m ? parseInt(m[1], 10) : 0;
  }

  function isEraCompatible(seedYear, candYear, seedTrack = null, candTrack = null) {
    const isClassicSeed = (seedYear > 0 && seedYear <= 1995) || (seedTrack && CLASSIC_ARTIST_RE.test(seedTrack.artist || ''));
    const effSeedYear = isClassicSeed ? (seedYear > 0 && seedYear <= 1995 ? seedYear : 1978) : seedYear;
    const effCandYear = candYear || (candTrack && String(candTrack.id || '').startsWith('sp_') ? 2025 : 0);
    if (isClassicSeed && !effCandYear && candTrack && MODERN_ARTIST_RE.test(candTrack.artist || '')) return false;
    if (!effSeedYear || !effCandYear) return true;
    if (effSeedYear >= 2000 && effCandYear < 1995) return false;
    if (effSeedYear <= 1995 && effCandYear >= 2015) return false;
    return true;
  }

  function isPodcastTrack(track) {
    if (!track) return false;
    return Boolean(
      track.isPodcast ||
      track.quality === 'Podcast Audio Stream' ||
      track.type === 'podcast' ||
      String(track.id || '').startsWith('pod_')
    );
  }

  function detectLanguage(track) {
    if (!track) return '';
    let lang = (track.language || '').toLowerCase().trim();
    if (lang && lang !== 'unknown' && lang !== 'all' && lang !== 'mixed') return lang;

    const text = `${track.title || ''} ${track.artist || ''} ${track.album || ''}`.toLowerCase();
    if (/[\u0b80-\u0bff]/.test(text)) return 'tamil';
    if (/[\u0900-\u097f]/.test(text)) return 'hindi';
    if (/[\u0c00-\u0c7f]/.test(text)) return 'telugu';
    if (/[\u0d00-\u0d7f]/.test(text)) return 'malayalam';
    if (/[\u0c80-\u0cff]/.test(text)) return 'kannada';
    if (/[\u0a00-\u0a7f]/.test(text)) return 'punjabi';

    const punjabiArtists = ['karan aujla', 'diljit dosanjh', 'ap dhillon', 'sidhu moose wala', 'guru randhawa', 'shubh', 'ammy virk', 'punjabi'];
    if (punjabiArtists.some(pa => text.includes(pa))) return 'punjabi';

    const hindiArtists = ['arijit singh', 'neha kakkar', 'badshah', 'diljit', 'kumar sanu', 'lata mangeshkar', 'pritam', 'shreya ghoshal', 'atif aslam', 'vishal mishra', 'kk', 'sonu nigam', 'tanishk bagchi', 'mithoon', 'jubin nautiyal', 'mohit chauhan', 'sachin-jigar', 'bollywood', 'hindi'];
    if (hindiArtists.some(ha => text.includes(ha))) return 'hindi';

    const teluguArtists = ['devi sri prasad', 'thaman', 'm.m. keeravani', 'keeravani', 'mani sharma', 'tollywood', 'telugu'];
    if (teluguArtists.some(ta => text.includes(ta))) return 'telugu';

    const malayalamArtists = ['sushin shyam', 'hesham abdul wahab', 'vineeth sreenivasan', 'shaan rahman', 'mollywood', 'malayalam'];
    if (malayalamArtists.some(ma => text.includes(ma))) return 'malayalam';

    const englishArtists = ['taylor swift', 'the weeknd', 'ed sheeran', 'dua lipa', 'drake', 'post malone', 'billie eilish', 'justin bieber', 'coldplay', 'bruno mars', 'eminem', 'sabrina carpenter', 'madcon', 'ariana grande', 'charlie puth', 'imagine dragons'];
    if (englishArtists.some(ea => text.includes(ea))) return 'english';

    if (text.includes('blackpink') || text.includes('jungkook') || text.includes('bts')) return 'korean';
    if (text.includes('yoasobi')) return 'japanese';
    if (text.includes('bad bunny')) return 'spanish';

    const tamilArtists = ['anirudh', 'a.r. rahman', 'ar rahman', 'rahman', 'harris jayaraj', 'yuvan', 'ilaiyaraaja', 'ilayaraja', 'sid sriram', 'pradeep kumar', 'santhosh narayanan', 'g.v. prakash', 'gv prakash', 'hiphop tamizha', 'dharan', 'd. imman', 'sean roldan', 'sai abhyankkar', 'vidyasagar', 'kollywood', 'tamil'];
    if (tamilArtists.some(ta => text.includes(ta))) return 'tamil';

    return '';
  }

  function isTamilTrack(track) {
    return detectLanguage(track) === 'tamil';
  }

  /**
   * Intelligently infers acoustic coordinates (BPM, Energy, Mood, Tempo)
   * if raw tags are missing from track metadata.
   */
  function inferAcoustics(track) {
    if (!track) {
      return { bpm: 105, energy: 0.60, mood: 'melodic', tempo: 'medium', genre: 'pop', language: '' };
    }

    let bpm = track.bpm || track.audioFeatures?.tempo || track.tempo;
    let energy = track.energy !== undefined ? track.energy : track.audioFeatures?.energy;
    let mood = (track.mood || track.vibe || '').toLowerCase().trim();
    let tempo = (typeof track.tempo === 'string' ? track.tempo : '').toLowerCase().trim();
    let genre = (track.genre || track.category || '').toLowerCase().trim();
    let language = detectLanguage(track);

    const hasNumericBpm = (typeof bpm === 'number' && !isNaN(bpm) && bpm > 30 && bpm < 250);
    const hasNumericEnergy = (typeof energy === 'number' && !isNaN(energy) && energy >= 0 && energy <= 1.0);

    const isGenericDefault = (bpm === 105 && energy === 0.60 && (!mood || mood === 'melodic'));

    // If already explicitly populated with non-generic numeric values, return directly
    if (!isGenericDefault && hasNumericBpm && hasNumericEnergy && mood) {
      return { bpm, energy, mood, tempo: tempo || (bpm > 115 ? 'fast' : bpm < 90 ? 'slow' : 'medium'), genre: genre || 'pop', language };
    }

    // Infer from track title, artist, album, and keywords
    const haystack = `${track.title || ''} ${track.artist || ''} ${track.album || ''} ${Array.isArray(track.keywords) ? track.keywords.join(' ') : ''}`.toLowerCase();

    let inferredBpm = hasNumericBpm ? bpm : 105;
    let inferredEnergy = hasNumericEnergy ? energy : 0.60;
    let inferredMood = mood || 'melodic';
    let inferredTempo = tempo || 'medium';

    // 1. Sad / Pathos / Heartbreak
    if (SAD_VIBE_RE.test(haystack)) {
      inferredBpm = (hasNumericBpm && !isGenericDefault) ? bpm : 78;
      inferredEnergy = (hasNumericEnergy && !isGenericDefault) ? energy : 0.34;
      inferredMood = 'sad';
      inferredTempo = 'slow';
      genre = genre || 'sad';
    }
    // 2. Energetic / Dance / Fast / Bass Beat
    else if (DANCE_VIBE_RE.test(haystack)) {
      inferredBpm = (hasNumericBpm && !isGenericDefault) ? bpm : 136;
      inferredEnergy = (hasNumericEnergy && !isGenericDefault) ? energy : 0.92;
      inferredMood = 'energetic';
      inferredTempo = 'fast';
      genre = genre || 'dance';
    }
    // 3. Mass / Anthem / Hero BGM
    else if (MASS_VIBE_RE.test(haystack)) {
      inferredBpm = (hasNumericBpm && !isGenericDefault) ? bpm : 128;
      inferredEnergy = (hasNumericEnergy && !isGenericDefault) ? energy : 0.88;
      inferredMood = 'energetic';
      inferredTempo = 'fast';
      genre = genre || 'mass';
    }
    // 4. Chill / Lo-Fi / Ambient
    else if (CHILL_VIBE_RE.test(haystack)) {
      inferredBpm = (hasNumericBpm && !isGenericDefault) ? bpm : 76;
      inferredEnergy = (hasNumericEnergy && !isGenericDefault) ? energy : 0.28;
      inferredMood = 'chill';
      inferredTempo = 'slow';
      genre = genre || 'lo-fi';
    }
    // 5. Classical / Devotional / Traditional
    else if (DEVOTIONAL_VIBE_RE.test(haystack)) {
      inferredBpm = (hasNumericBpm && !isGenericDefault) ? bpm : 94;
      inferredEnergy = (hasNumericEnergy && !isGenericDefault) ? energy : 0.48;
      inferredMood = 'devotional';
      inferredTempo = 'medium';
      genre = genre || 'classical';
    }
    // 6. Slow / Melody / Romance / Soulful
    else if (ROMANTIC_VIBE_RE.test(haystack)) {
      inferredBpm = (hasNumericBpm && !isGenericDefault) ? bpm : 84;
      inferredEnergy = (hasNumericEnergy && !isGenericDefault) ? energy : 0.38;
      inferredMood = 'romantic';
      inferredTempo = 'slow';
      genre = genre || 'melody';
    }
    // 5. Artist DNA Fallback
    else {
      const art = (track.artist || '').toLowerCase();
      if (art.includes('anirudh') || art.includes('bad bunny') || art.includes('diljit') || art.includes('karan aujla')) {
        inferredBpm = hasNumericBpm ? bpm : 124;
        inferredEnergy = hasNumericEnergy ? energy : 0.82;
        inferredMood = 'energetic';
        inferredTempo = 'fast';
      } else if (art.includes('sid sriram') || art.includes('pradeep kumar') || art.includes('arijit singh') || art.includes('shreya ghoshal') || art.includes('chinmayi')) {
        inferredBpm = hasNumericBpm ? bpm : 84;
        inferredEnergy = hasNumericEnergy ? energy : 0.38;
        inferredMood = 'romantic';
        inferredTempo = 'slow';
      } else if (art.includes('harris jayaraj') || art.includes('harris')) {
        inferredBpm = hasNumericBpm ? bpm : 106;
        inferredEnergy = hasNumericEnergy ? energy : 0.68;
        inferredMood = 'romantic';
        inferredTempo = 'medium';
      } else if (art.includes('yuvan') || art.includes('santhosh narayanan')) {
        inferredBpm = hasNumericBpm ? bpm : 98;
        inferredEnergy = hasNumericEnergy ? energy : 0.62;
        inferredMood = 'melodic';
        inferredTempo = 'medium';
      } else if (art.includes('ilaiyaraaja') || art.includes('ilayaraja')) {
        inferredBpm = hasNumericBpm ? bpm : 88;
        inferredEnergy = hasNumericEnergy ? energy : 0.50;
        inferredMood = 'melodic';
        inferredTempo = 'medium';
      } else if (art.includes('rahman')) {
        inferredBpm = hasNumericBpm ? bpm : 96;
        inferredEnergy = hasNumericEnergy ? energy : 0.58;
        inferredMood = 'melodic';
        inferredTempo = 'medium';
      }
    }

    return {
      bpm: inferredBpm,
      energy: inferredEnergy,
      mood: inferredMood,
      tempo: inferredTempo,
      genre: genre || 'pop',
      language
    };
  }

  function extractAcoustics(track) {
    return inferAcoustics(track);
  }

  /**
   * Resilient Vibe Distance Calculation.
   * Compares acoustic, language, genre, era, repeat/skip penalties, and user likes. Never returns NaN.
   */
  function calculateVibeDistance(currentTrack, candidateTrack, taste = null) {
    if (!currentTrack || !candidateTrack) return 1.0;
    if (String(currentTrack.id) === String(candidateTrack.id)) return 9999.0;
    if (isPodcastTrack(candidateTrack)) return 9999.0;

    // 1. Blocked Filters check (Taste)
    if (taste) {
      if (Array.isArray(taste.blockedArtists)) {
        const candArtist = (candidateTrack.artist || '').toLowerCase();
        if (taste.blockedArtists.some(ba => candArtist.includes(ba.toLowerCase()))) {
          return 9999.0; // Blocked
        }
      }
      if (Array.isArray(taste.blockedTracks)) {
        if (taste.blockedTracks.includes(candidateTrack.id)) return 9999.0;
      }
    }

    const curAc = inferAcoustics(currentTrack);
    const candAc = inferAcoustics(candidateTrack);

    // Feature A: BPM Distance (Weight 0.25)
    const bpmDiff = Math.abs(curAc.bpm - candAc.bpm) / 160.0;
    const bpmScore = Math.min(1.0, bpmDiff) * 0.25;

    // Feature B: Energy Distance (Weight 0.30)
    const energyDiff = Math.abs(curAc.energy - candAc.energy);
    const energyScore = Math.min(1.0, energyDiff) * 0.30;

    // Feature C: Strict Vibe Consistency & Mood Alignment
    const curVibe = detectVibeCategory(currentTrack);
    const candVibe = detectVibeCategory(candidateTrack);

    // Bidirectional hard vibe boundaries: never mix dance/mass with romantic/melodic/sad/chill/devotional or sad with dance/mass
    if (!isVibeCompatible(curVibe, candVibe, true)) {
      return 9999.0;
    }

    let moodScore = 0.0;
    if (curVibe === candVibe) {
      moodScore = 0.0;
    } else if ((curVibe === 'dance' && candVibe === 'mass') || (curVibe === 'mass' && candVibe === 'dance')) {
      moodScore = 0.08;
    } else if ((curVibe === 'romantic' && candVibe === 'chill') || (curVibe === 'chill' && candVibe === 'romantic')) {
      moodScore = 0.04;
    } else if ((curVibe === 'romantic' && candVibe === 'melodic') || (curVibe === 'melodic' && candVibe === 'romantic') ||
               (curVibe === 'chill' && candVibe === 'melodic') || (curVibe === 'melodic' && candVibe === 'chill')) {
      moodScore = 0.06;
    } else if (curVibe === 'sad' && (candVibe === 'romantic' || candVibe === 'chill')) {
      moodScore = 0.10;
    } else {
      moodScore = 0.32;
    }

    // Feature D: Tempo & Genre Alignment
    const tempoScore = (curAc.tempo === candAc.tempo) ? 0.0 : 0.12;
    const genreBonus = (curAc.genre && candAc.genre && curAc.genre !== 'pop' && curAc.genre === candAc.genre) ? -0.04 : 0.0;

    let normalizedDist = bpmScore + energyScore + moodScore + tempoScore + genreBonus;

    // Feature E: Metadata, Language, Era & User Behavior Signals
    let synergyModifier = 0.0;
    const curArtist = (currentTrack.artist || '').toLowerCase().trim();
    const candArtist = (candidateTrack.artist || '').toLowerCase().trim();
    const curAlbum = (currentTrack.album || currentTrack.category || '').toLowerCase().trim();
    const candAlbum = (candidateTrack.album || candidateTrack.category || '').toLowerCase().trim();
    const isGenericAlbum = (alb) => !alb || /\b(best of|hits of|top hits|romantic|melody|chill|single|collection|playlist|evergreen|greatest)\b/i.test(alb);

    const sameSoundtrack = Boolean(
      curAlbum && candAlbum && curAlbum.length >= 3 && !isGenericAlbum(curAlbum) && !isGenericAlbum(candAlbum) &&
      (curAlbum === candAlbum || curAlbum.includes(candAlbum) || candAlbum.includes(curAlbum))
    );
    const curPrimary = cleanArtistPrimaryKey(curArtist);
    const candPrimary = cleanArtistPrimaryKey(candArtist);
    const sameArtist = Boolean(curPrimary && candPrimary && curPrimary === candPrimary);
    const isFavArtist = Boolean(taste && Array.isArray(taste.favoriteArtists) && taste.favoriteArtists.some(fa => candArtist.includes(fa.toLowerCase())));

    // 1. Language relevance (strong signal, while allowing cross-language when same artist/album/favorite)
    const curLang = curAc.language || detectLanguage(currentTrack);
    const candLang = candAc.language || detectLanguage(candidateTrack);
    if (curLang && candLang) {
      if (curLang === candLang) {
        synergyModifier -= 0.10;
      } else if (!sameArtist && !sameSoundtrack && !isFavArtist) {
        synergyModifier += 0.50;
      } else {
        synergyModifier += 0.15;
      }
    } else if (curLang && !candLang) {
      synergyModifier += 0.12;
    }

    // 2. Era proximity
    const seedYear = extractTrackYear(currentTrack);
    const candYear = extractTrackYear(candidateTrack);
    if (seedYear && candYear) {
      const yearGap = Math.abs(seedYear - candYear);
      if (yearGap <= 5) synergyModifier -= 0.04;
      else if (yearGap >= 20) synergyModifier += 0.16;
    }

    // 3. Same-movie soundtrack & artist affinity
    if (sameSoundtrack) synergyModifier -= 0.08;
    if (sameArtist) synergyModifier -= 0.03;
    if (isFavArtist) synergyModifier -= 0.08;

    // 4. Liked track preference
    try {
      if (typeof window !== 'undefined' && window.likedTrackIds && window.likedTrackIds.has(String(candidateTrack.id))) {
        synergyModifier -= 0.06;
      }
    } catch (e) {}

    // 5. Recent repeat & skipped track penalties (non-permanent, decayable)
    try {
      const recentHist = (typeof window !== 'undefined' && window.AudioPlayer && Array.isArray(window.AudioPlayer.history))
        ? window.AudioPlayer.history.slice(-20)
        : [];
      if (recentHist.some(h => h && String(h.id) === String(candidateTrack.id))) {
        synergyModifier += 0.45;
      }
      const spProfile = (typeof window !== 'undefined' && window.SpotifyEngine && typeof window.SpotifyEngine.getProfile === 'function')
        ? window.SpotifyEngine.getProfile()
        : null;
      const skippedList = Array.isArray(taste?.skippedTracks) ? taste.skippedTracks : (spProfile?.skippedTracks || []);
      const skipEntry = skippedList.find(s => s && String(s.id) === String(candidateTrack.id));
      if (skipEntry) {
        const ageHours = Math.max(0, (Date.now() - (skipEntry.skippedAt || 0)) / (1000 * 60 * 60));
        if (ageHours < 24) {
          synergyModifier += Math.max(0.15, 0.50 * (1 - ageHours / 24));
        }
      }
    } catch (e) {}

    return Math.max(0.01, normalizedDist + synergyModifier);
  }

  function addRelatedTracks(key, tracks) {
    if (!key || !Array.isArray(tracks) || tracks.length === 0) return;
    const cacheKey = key.toLowerCase().trim();
    const existing = relatedTracksCache.get(cacheKey) || [];
    const merged = [...existing];
    const seen = new Set(existing.map(t => t.id));
    for (const t of tracks) {
      if (t && t.id && !seen.has(t.id)) {
        seen.add(t.id);
        merged.push(t);
      }
    }
    relatedTracksCache.set(cacheKey, merged);
  }

  function getAllRelatedTracks() {
    const all = [];
    const seen = new Set();
    for (const arr of relatedTracksCache.values()) {
      for (const t of arr) {
        if (t && t.id && !seen.has(t.id)) {
          seen.add(t.id);
          all.push(t);
        }
      }
    }
    return all;
  }

  /**
   * Helper: Asynchronously fetches related online tracks by artist or album.
   * Results are cached for 30 minutes.
   */
  async function fetchRelatedOnlineTracks(track, externalSignal = null) {
    if (!track || isPodcastTrack(track) || externalSignal?.aborted) return [];
    const queries = [];
    const alb = (track.album || "").replace(/\(From.*?\)/i, "").trim();
    const art = pickComposerOrPrimaryArtist(track.artist || "");
    const seedVibe = detectVibeCategory(track);
    const vibeKeyword = getVibeSearchKeyword(seedVibe);
    const lang = detectLanguage(track);

    if (art && art.length >= 3 && !/unknown|various/i.test(art)) {
      queries.push(`${art} ${vibeKeyword}`.trim());
    }
    if (lang) {
      queries.push(`${lang} ${vibeKeyword} songs`.trim());
    } else if (track.title) {
      queries.push(`${track.title} ${vibeKeyword}`.trim());
    }
    if (alb && alb.length >= 3 && !/\b(single|hits|best of|collection|romantic|melody|unknown)\b/i.test(alb)) {
      queries.push(alb);
    }

    const fetchedTracks = [];

    for (const query of queries) {
      if (externalSignal?.aborted) break;
      const cacheKey = query.toLowerCase().trim();
      if (relatedTracksCache.has(cacheKey)) {
        fetchedTracks.push(...relatedTracksCache.get(cacheKey));
        continue;
      }

      try {
        const endpoint = `${getVibeApiPrefix()}/api/search?q=${encodeURIComponent(query)}&limit=15`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const onExtAbort = () => controller.abort();
        if (externalSignal) externalSignal.addEventListener('abort', onExtAbort, { once: true });

        const res = await fetch(endpoint, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (externalSignal) externalSignal.removeEventListener('abort', onExtAbort);

        if (res.ok) {
          const json = await res.json();
          const rawSongs = json?.songs || json?.results || json?.tracks || json?.data || [];
          const formatted = rawSongs.map((item, idx) => {
            const formattedTrack = {
              id: item.id || `rel_${Date.now()}_${idx}`,
              title: item.title,
              artist: item.artist,
              album: item.album || '',
              duration: item.duration || 210,
              artwork: item.artwork || item.image || '',
              streamUrl: item.streamUrl || '',
              quality: item.quality || 'FLAC / 320kbps Lossless',
              language: item.language || lang || ''
            };
            const ac = inferAcoustics(formattedTrack);
            formattedTrack.bpm = item.bpm || ac.bpm;
            formattedTrack.energy = item.energy || ac.energy;
            formattedTrack.mood = item.mood || ac.mood;
            formattedTrack.tempo = item.tempo || ac.tempo;
            formattedTrack.genre = item.genre || ac.genre;
            return formattedTrack;
          });

          addRelatedTracks(cacheKey, formatted);
          fetchedTracks.push(...formatted);
          setTimeout(() => relatedTracksCache.delete(cacheKey), 30 * 60 * 1000);
        }
      } catch (e) {}
    }

    return fetchedTracks;
  }

  function getSafeUserTaste() {
    try {
      if (typeof window !== 'undefined' && window.ProfileManager && typeof window.ProfileManager.getUserTaste === 'function') {
        return window.ProfileManager.getUserTaste();
      }
      if (typeof window !== 'undefined' && window.SpotifyEngine && typeof window.SpotifyEngine.getProfile === 'function') {
        const p = window.SpotifyEngine.getProfile() || {};
        return {
          languages: Array.isArray(p.preferredLanguages) ? p.preferredLanguages : [],
          favoriteArtists: Object.keys(p.artists || {}).filter(k => (p.artists[k] || 0) >= 15),
          blockedArtists: [],
          blockedTracks: [],
          skippedTracks: Array.isArray(p.skippedTracks) ? p.skippedTracks : [],
          acousticPreferences: p.acousticPreferences || null
        };
      }
    } catch (e) {}
    return null;
  }

  /**
   * Main Standalone Vibe Recommendation Function:
   * Selects the next song deterministically using multi-signal Vibe-Matching against the currently playing track.
   */
  function getNextVibeTrack(currentTrack, catalog, history = [], targetLanguage = null) {
    if ((!currentTrack && (!catalog || catalog.length === 0)) || isPodcastTrack(currentTrack)) return null;

    const taste = getSafeUserTaste();
    const appState = (typeof window !== 'undefined' && window.State) ? window.State : null;

    // 1. Language signal from current track (or explicit targetLanguage)
    let enforcedLang = detectLanguage(currentTrack) || targetLanguage || '';
    enforcedLang = String(enforcedLang || '').toLowerCase().trim();
    if (enforcedLang === 'unknown') enforcedLang = '';

    // 2. Build Multi-Source Candidate Pool:
    const searchPool = (appState && Array.isArray(appState.lastSearchResults)) ? appState.lastSearchResults : [];

    const relatedPool = [];
    if (currentTrack) {
      const albKey = (currentTrack.album || "").toLowerCase().trim();
      const artKey = (currentTrack.artist?.split(/[,&]/)[0] || "").toLowerCase().trim();
      if (relatedTracksCache.has(albKey)) relatedPool.push(...relatedTracksCache.get(albKey));
      if (relatedTracksCache.has(artKey)) relatedPool.push(...relatedTracksCache.get(artKey));
    }

    const catalogPool = Array.isArray(catalog) ? catalog : (appState?.allSongs || []);

    // Merge and deduplicate candidates by ID
    const mergedMap = new Map();
    for (const t of [...relatedPool, ...searchPool, ...catalogPool]) {
      if (t && t.id && !isPodcastTrack(t) && !mergedMap.has(t.id)) {
        mergedMap.set(t.id, t);
      }
    }
    let allCandidates = Array.from(mergedMap.values());

    // 3. Exclude last 25 history tracks + current track
    const excludeIds = new Set();
    if (currentTrack?.id) excludeIds.add(String(currentTrack.id));

    const historySlice = (Array.isArray(history) ? history : []).slice(-25);
    for (const h of historySlice) {
      const id = (typeof h === 'string') ? h : h?.id;
      if (id) excludeIds.add(String(id));
    }

    // 4. Avoid same artist more than 2 times in a row
    const recentHistory = (Array.isArray(history) ? history : []).slice(-2);
    let consecutiveArtist = null;
    if (recentHistory.length >= 2) {
      const a1 = cleanArtistPrimaryKey(recentHistory[0]?.artist || '');
      const a2 = cleanArtistPrimaryKey(recentHistory[1]?.artist || '');
      if (a1 && a1 === a2) {
        consecutiveArtist = a1;
      }
    }

    const seedVibe = detectVibeCategory(currentTrack);
    const seedArtKey = cleanArtistPrimaryKey(currentTrack?.artist || '');

    const passesLanguage = (cand) => {
      if (!enforcedLang) return true;
      const trackLang = detectLanguage(cand);
      if (!trackLang) return true;
      if (trackLang === enforcedLang) return true;
      const candArtKey = cleanArtistPrimaryKey(cand.artist || '');
      return Boolean(seedArtKey && candArtKey && seedArtKey === candArtKey);
    };

    // 5. Filter candidates (language + strict bidirectional vibe + anti-repeat)
    let candidatePool = allCandidates.filter(t => {
      if (!t || !t.id || excludeIds.has(String(t.id)) || isPodcastTrack(t)) return false;
      if (t.duration && t.duration <= 45) return false;
      if (currentTrack && isSameSongOrReprise(t.title, currentTrack.title)) return false;

      if (taste && Array.isArray(taste.blockedArtists)) {
        const candArt = (t.artist || '').toLowerCase();
        if (taste.blockedArtists.some(ba => candArt.includes(ba.toLowerCase()))) return false;
      }
      if (taste && Array.isArray(taste.blockedTracks) && taste.blockedTracks.includes(t.id)) {
        return false;
      }

      if (consecutiveArtist) {
        const candArt = cleanArtistPrimaryKey(t.artist || '');
        if (candArt && candArt === consecutiveArtist) return false;
      }

      if (!passesLanguage(t)) return false;
      return isVibeCompatible(seedVibe, detectVibeCategory(t), true);
    });

    // Relax only vibe strictness (keep language & anti-clash)
    if (candidatePool.length === 0) {
      candidatePool = allCandidates.filter(t => {
        if (!t || !t.id || excludeIds.has(String(t.id)) || isPodcastTrack(t)) return false;
        if (currentTrack && isSameSongOrReprise(t.title, currentTrack.title)) return false;
        if (!passesLanguage(t)) return false;
        return isVibeCompatible(seedVibe, detectVibeCategory(t), false);
      });
    }

    // Relax exclusions only when strict pool is completely empty
    if (candidatePool.length === 0) {
      candidatePool = allCandidates.filter(t => {
        if (!t || !t.id || isPodcastTrack(t) || (currentTrack && String(t.id) === String(currentTrack.id))) return false;
        return passesLanguage(t) && isVibeCompatible(seedVibe, detectVibeCategory(t), false);
      });
    }

    // Cross-language / relaxed vibe fallback only when same-language strict candidates are exhausted
    if (candidatePool.length === 0) {
      candidatePool = allCandidates.filter(t => {
        if (!t || !t.id || isPodcastTrack(t) || (currentTrack && String(t.id) === String(currentTrack.id))) return false;
        return passesLanguage(t);
      });
    }

    if (candidatePool.length === 0) {
      candidatePool = allCandidates.filter(t => t && t.id && !isPodcastTrack(t) && (!currentTrack || String(t.id) !== String(currentTrack.id)));
    }

    if (candidatePool.length === 0) {
      return null;
    }

    // 6. Score all candidates deterministically using calculateVibeDistance
    const scored = candidatePool.map((cand, idx) => {
      const dist = calculateVibeDistance(currentTrack, cand, taste);
      return { track: cand, distance: dist + (idx * 0.0001) };
    });

    scored.sort((a, b) => a.distance - b.distance);
    const chosenItem = scored[0];
    const chosenTrack = chosenItem.track;

    // Construct "Why this song?" hint
    let whyHint = "Vibe match";
    if (currentTrack && chosenTrack) {
      const curAc = inferAcoustics(currentTrack);
      const chosenAc = inferAcoustics(chosenTrack);
      if (currentTrack.album && chosenTrack.album && currentTrack.album.toLowerCase() === chosenTrack.album.toLowerCase()) {
        whyHint = `From the same soundtrack: "${chosenTrack.album}"`;
      } else if (taste && Array.isArray(taste.favoriteArtists) && taste.favoriteArtists.some(fa => (chosenTrack.artist || '').toLowerCase().includes(fa.toLowerCase()))) {
        whyHint = `Picked for your favorite artist: ${chosenTrack.artist?.split(/[,&]/)[0]}`;
      } else if (currentTrack.artist && chosenTrack.artist && currentTrack.artist.split(/[,&]/)[0] === chosenTrack.artist.split(/[,&]/)[0]) {
        whyHint = `More by ${chosenTrack.artist.split(/[,&]/)[0]}`;
      } else if (curAc.mood === chosenAc.mood) {
        whyHint = `Continuing your ${curAc.mood} vibe`;
      } else {
        whyHint = `Acoustic match (${Math.round(Math.max(0.6, 1 - chosenItem.distance) * 100)}% vibe fit)`;
      }
    }
    chosenTrack._vibeWhy = whyHint;

    // Asynchronously fetch related tracks for next iteration
    fetchRelatedOnlineTracks(chosenTrack).catch(() => {});

    return chosenTrack;
  }

  /**
   * Async variant that proactively queries online related tracks if the candidate pool is sparse.
   */
  async function resolveNextVibeTrackAsync(currentTrack, candidates = [], history = [], targetLanguage = null, options = {}) {
    if (!currentTrack || isPodcastTrack(currentTrack) || options?.signal?.aborted) return null;

    const lang = targetLanguage || detectLanguage(currentTrack) || '';

    // Proactively fetch and populate related tracks for current song
    try {
      await fetchRelatedOnlineTracks(currentTrack, options?.signal || null);
    } catch (e) {}

    if (options?.signal?.aborted) return null;

    const pool = (typeof window !== 'undefined' && window.AllSongPool && window.AllSongPool.length > 0)
      ? window.AllSongPool
      : [];
    const related = getAllRelatedTracks();

    const mergedCandidates = [
      ...(Array.isArray(candidates) ? candidates : []),
      ...related,
      ...pool
    ];

    return getNextVibeTrack(currentTrack, mergedCandidates, history, lang);
  }


  /**
   * Spotify-Grade Continuous Radio Track Fetcher
   * Fetches the next best acoustic/vibe match deterministically when the current song completes.
   */
  async function getContinuousRadioTrack(currentTrack, history = [], options = {}) {
    if (!currentTrack || isPodcastTrack(currentTrack) || options?.signal?.aborted) return null;
    const prefix = getVibeApiPrefix();
    const taste = getSafeUserTaste();
    const signal = options?.signal || null;

    const recentHistory = (Array.isArray(history) ? history : []).slice(-35);
    const historyIds = new Set(recentHistory.map(h => typeof h === 'string' ? h : String(h?.id)).filter(Boolean));
    if (currentTrack.id) historyIds.add(String(currentTrack.id));
    const historyTitles = new Set(recentHistory.map(h => typeof h === 'string' ? '' : (h?.title || '').toLowerCase().trim()).filter(Boolean));
    if (currentTrack.title) historyTitles.add((currentTrack.title || '').toLowerCase().trim());
    const historyCanon = new Set(recentHistory.map(h => typeof h === 'string' ? '' : normalizeCanonicalTitle(h?.title)).filter(Boolean));
    const curCanon = normalizeCanonicalTitle(currentTrack.title);
    if (curCanon) historyCanon.add(curCanon);

    let consecutiveArtist = null;
    if (recentHistory.length >= 2) {
      const a1 = cleanArtistPrimaryKey(recentHistory[recentHistory.length - 1]?.artist || '');
      const a2 = cleanArtistPrimaryKey(recentHistory[recentHistory.length - 2]?.artist || '');
      if (a1 && a1 === a2) consecutiveArtist = a1;
    }

    const queueTracks = (typeof window !== 'undefined' && window.AudioPlayer && Array.isArray(window.AudioPlayer.queue))
      ? window.AudioPlayer.queue
      : [];
    const queueIds = new Set(queueTracks.map(q => String(q?.id)).filter(Boolean));
    const queueTitles = new Set(queueTracks.map(q => (q?.title || '').toLowerCase().trim()).filter(Boolean));
    const queueCanon = new Set(queueTracks.map(q => normalizeCanonicalTitle(q?.title)).filter(Boolean));

    const seedLang = detectLanguage(currentTrack);
    const seedVibe = detectVibeCategory(currentTrack);
    const seedArtistKey = cleanArtistPrimaryKey(currentTrack.artist || '');
    const seedAlbumKey = (currentTrack.album || '').toLowerCase().trim();
    const seedYear = extractTrackYear(currentTrack);

    const isValidCandidate = (cand, strictVibe = true, fromLocal = false) => {
      if (!cand || !cand.id || !cand.title || isPodcastTrack(cand)) return false;
      const candStr = `${cand.title} ${cand.artist || ''} ${cand.album || ''}`;
      if (NON_SONG_RE.test(candStr)) return false;
      if (fromLocal && !isEraCompatible(seedYear, extractTrackYear(cand), currentTrack, cand)) return false;
      const titleKey = cand.title.toLowerCase().trim();
      const canonKey = normalizeCanonicalTitle(cand.title);
      if (isSameSongOrReprise(cand.title, currentTrack.title)) return false;
      if (historyIds.has(String(cand.id)) || queueIds.has(String(cand.id))) return false;
      if (historyTitles.has(titleKey) || queueTitles.has(titleKey)) return false;
      if (canonKey && (historyCanon.has(canonKey) || queueCanon.has(canonKey))) return false;

      if (taste && Array.isArray(taste.blockedArtists)) {
        const candArt = (cand.artist || '').toLowerCase();
        if (taste.blockedArtists.some(ba => candArt.includes(ba.toLowerCase()))) return false;
      }
      if (taste && Array.isArray(taste.blockedTracks) && taste.blockedTracks.includes(cand.id)) return false;

      const candArtKey = cleanArtistPrimaryKey(cand.artist || '');
      if (consecutiveArtist && candArtKey && candArtKey === consecutiveArtist) return false;

      // Language relevance check: prevent unrelated cross-language hits unless strong artist/album/favorite synergy
      const candLang = detectLanguage(cand);
      const isFavArtist = Boolean(taste && Array.isArray(taste.favoriteArtists) && taste.favoriteArtists.some(fa => (cand.artist || '').toLowerCase().includes(fa.toLowerCase())));
      const sameArt = Boolean(seedArtistKey && candArtKey && seedArtistKey === candArtKey);
      const candAlb = (cand.album || '').toLowerCase().trim();
      const sameAlb = Boolean(seedAlbumKey && candAlb && seedAlbumKey === candAlb);
      if (seedLang && candLang && candLang !== seedLang && !sameArt && !sameAlb && !isFavArtist) {
        return false;
      }
      if (fromLocal && seedLang && !candLang) return false;

      const candVibe = detectVibeCategory(cand);
      return isVibeCompatible(seedVibe, candVibe, strictVibe);
    };

    const collected = [];
    const collectedIds = new Set();
    const pushIfValid = (cand, fromLocal = false) => {
      if (!cand || !cand.id || collectedIds.has(String(cand.id))) return;
      if (cand.streamUrl && isValidCandidate(cand, true, fromLocal)) {
        collectedIds.add(String(cand.id));
        collected.push(fromLocal ? { ...cand, _fromLocal: true } : cand);
      }
    };

    // Step 1: Upstream Vibe Radio candidates
    try {
      const qParams = new URLSearchParams({
        id: currentTrack.id || '',
        title: currentTrack.title || '',
        artist: currentTrack.artist || '',
        album: currentTrack.album || '',
        year: seedYear ? String(seedYear) : '',
        lang: currentTrack.language || seedLang || ''
      });
      const res = await fetch(`${prefix}/api/radio?${qParams.toString()}`, signal ? { signal } : undefined);
      if (signal?.aborted) return null;
      if (res.ok) {
        const json = await res.json();
        const candidateTracks = json.tracks || [];
        candidateTracks.forEach(c => pushIfValid(c, false));
      }
    } catch (e) {
      if (e?.name === 'AbortError') return null;
      console.warn('[VibeEngine] getContinuousRadioTrack fetch failed:', e);
    }

    // Step 2: Supplement with vibe-matched search if sparse
    if (collected.length < 5 && !signal?.aborted) {
      try {
        const vibeKeyword = getVibeSearchKeyword(seedVibe);
        const composer = pickComposerOrPrimaryArtist(currentTrack.artist || '');
        const searchQueries = [];
        if (seedLang) searchQueries.push(`${seedLang} ${vibeKeyword} hits`);
        if (composer && !/unknown|various/i.test(composer)) searchQueries.push(`${composer} ${vibeKeyword}`);
        if (searchQueries.length === 0 && currentTrack.title) searchQueries.push(`${currentTrack.title} ${vibeKeyword}`);

        for (const sq of searchQueries) {
          if (collected.length >= 10 || signal?.aborted) break;
          const sRes = await fetch(`${prefix}/api/search?q=${encodeURIComponent(sq)}&limit=12`, signal ? { signal } : undefined);
          if (sRes.ok) {
            const sJson = await sRes.json();
            const sTracks = sJson.results || sJson.songs || [];
            sTracks.forEach(c => pushIfValid(c, false));
          }
        }
      } catch (e) {
        if (e?.name === 'AbortError') return null;
      }
    }

    if (signal?.aborted) return null;

    // Step 3: Supplement from local catalog / related pool only when remote recommendations are sparse
    const pool = (typeof window !== 'undefined' && window.AllSongPool && window.AllSongPool.length > 0)
      ? window.AllSongPool
      : [];
    if (collected.length < 5) {
      [...getAllRelatedTracks(), ...pool].forEach(c => pushIfValid(c, true));
    }

    if (collected.length > 0) {
      const scored = collected.map((cand, idx) => {
        let dist = calculateVibeDistance(currentTrack, cand, taste);
        if (cand._fromLocal) dist += 0.45;
        const candArtKey = cleanArtistPrimaryKey(cand.artist || '');
        if (seedArtistKey && candArtKey && candArtKey === seedArtistKey && collected.length >= 4) {
          dist += 0.03;
        }
        return { track: cand, distance: dist + (idx * 0.0001) };
      });
      scored.sort((a, b) => a.distance - b.distance);
      return scored[0].track;
    }

    // Fallback: local pool with full vibe scoring
    return getNextVibeTrack(currentTrack, pool, history, seedLang);
  }

  /**
   * Builds an instant Spotify Autoplay / Track Radio Queue seeded by a track.
   * Respects language relevance, multi-signal scoring, AbortSignal race guards, and strict podcast isolation.
   */
  async function getVibeRadioQueue(seedTrack, count = 20, history = null, options = {}) {
    if (!seedTrack || isPodcastTrack(seedTrack)) return seedTrack ? [seedTrack] : [];
    const signal = options?.signal || null;
    if (signal?.aborted) return [];
    const prefix = getVibeApiPrefix();
    const taste = getSafeUserTaste();

    const effectiveHistory = Array.isArray(history)
      ? history
      : ((typeof window !== 'undefined' && window.AudioPlayer && Array.isArray(window.AudioPlayer.history)) ? window.AudioPlayer.history : []);
    const recentHistory = effectiveHistory.slice(-30);
    const historyIds = new Set(recentHistory.map(h => typeof h === 'string' ? h : String(h?.id)).filter(Boolean));
    const historyTitles = new Set(recentHistory.map(h => typeof h === 'string' ? '' : (h?.title || '').toLowerCase().trim()).filter(Boolean));
    const historyCanon = new Set(recentHistory.map(h => typeof h === 'string' ? '' : normalizeCanonicalTitle(h?.title)).filter(Boolean));

    const queue = [seedTrack];
    const seen = new Set();
    if (seedTrack.id) seen.add(String(seedTrack.id));
    if (seedTrack.title) seen.add(seedTrack.title.toLowerCase().trim());
    const seedCanon = normalizeCanonicalTitle(seedTrack.title || '');
    if (seedCanon) seen.add('canon_' + seedCanon);

    const seedLang = detectLanguage(seedTrack);
    const seedVibe = detectVibeCategory(seedTrack);
    const seedYear = extractTrackYear(seedTrack);
    const seedArtKey = cleanArtistPrimaryKey(seedTrack.artist || '');
    const seedAlbRaw = (seedTrack.album || '').toLowerCase().trim();

    const rawCandidates = [];
    const rawSeenIds = new Set();

    const collectRaw = (t, fromRadio = false) => {
      if (!t || !t.title || isPodcastTrack(t)) return;
      const candStr = `${t.title} ${t.artist || ''} ${t.album || ''}`;
      if (NON_SONG_RE.test(candStr)) return;
      if (!t._fromUpstream && !isEraCompatible(seedYear, extractTrackYear(t), seedTrack, t)) return;
      const tid = String(t.id || '');
      if (tid && rawSeenIds.has(tid)) return;
      const titleKey = t.title.toLowerCase().trim();
      const canonKey = normalizeCanonicalTitle(t.title);
      if (isSameSongOrReprise(t.title, seedTrack.title)) return;
      if (tid && (seen.has(tid) || historyIds.has(tid))) return;
      if (seen.has(titleKey) || historyTitles.has(titleKey)) return;
      if (canonKey && (seen.has('canon_' + canonKey) || historyCanon.has(canonKey))) return;

      if (taste && Array.isArray(taste.blockedArtists)) {
        const candArt = (t.artist || '').toLowerCase();
        if (taste.blockedArtists.some(ba => candArt.includes(ba.toLowerCase()))) return;
      }
      if (taste && Array.isArray(taste.blockedTracks) && tid && taste.blockedTracks.includes(t.id)) return;

      // Strong language relevance check (prevents unrelated tracks like Hindi charts infiltrating Tamil radio or vice versa)
      const tLang = detectLanguage(t);
      const tArtKey = cleanArtistPrimaryKey(t.artist || '');
      const tAlbRaw = (t.album || '').toLowerCase().trim();
      const isFavArt = Boolean(taste && Array.isArray(taste.favoriteArtists) && taste.favoriteArtists.some(fa => (t.artist || '').toLowerCase().includes(fa.toLowerCase())));
      const sameArt = Boolean(seedArtKey && tArtKey && seedArtKey === tArtKey);
      const sameAlb = Boolean(seedAlbRaw && tAlbRaw && seedAlbRaw === tAlbRaw);
      if (seedLang && tLang && tLang !== seedLang && !sameArt && !sameAlb && !isFavArt) return;
      if (!fromRadio && seedLang && !tLang && !sameArt && !sameAlb) return;

      if (tid) rawSeenIds.add(tid);
      rawCandidates.push({ ...t, _fromRadio: fromRadio });
    };

    try {
      const qParams = new URLSearchParams({
        id: seedTrack.id || '',
        title: seedTrack.title || '',
        artist: seedTrack.artist || '',
        album: seedTrack.album || '',
        year: seedYear ? String(seedYear) : '',
        lang: seedTrack.language || seedLang || ''
      });
      const res = await fetch(`${prefix}/api/radio?${qParams.toString()}`, signal ? { signal } : undefined);
      if (signal?.aborted) return [];
      if (res.ok) {
        const json = await res.json();
        const tracks = json.tracks || [];
        tracks.forEach(t => collectRaw(t, true));
      }
    } catch (e) {
      if (e?.name === 'AbortError') return [];
      console.warn('[VibeEngine] getVibeRadioQueue error:', e);
    }

    if (signal?.aborted) return [];

    // Supplement with related/local pool only when upstream /api/radio returned fewer than count tracks
    if (rawCandidates.length < count) {
      const localPool = (typeof window !== 'undefined' && window.AllSongPool && window.AllSongPool.length > 0)
        ? window.AllSongPool
        : [];
      [...getAllRelatedTracks(), ...localPool].forEach(t => collectRaw(t, false));
    }

    // Filter by strict bidirectional vibe compatibility first; relax only if < 5 matches
    let vibeMatched = rawCandidates.filter(t => isVibeCompatible(seedVibe, detectVibeCategory(t), true));
    if (vibeMatched.length < 5) {
      vibeMatched = rawCandidates.filter(t => isVibeCompatible(seedVibe, detectVibeCategory(t), false));
    }
    if (vibeMatched.length === 0) {
      vibeMatched = rawCandidates;
    }

    // Deterministic multi-signal scoring preserving upstream priority over local fallback
    const scored = vibeMatched.map((t, idx) => ({
      track: t,
      distance: calculateVibeDistance(seedTrack, t, taste) + (t._fromUpstream ? (idx * 0.003) : (t._fromRadio ? 0.16 + (idx * 0.004) : 0.55 + (idx * 0.002)))
    }));
    scored.sort((a, b) => a.distance - b.distance);

    const artistCounts = new Map();
    const albumCounts = new Map();
    const seedAlbKey = (seedTrack.album || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/soundtrack|theme|single|ost|ep/gi, '').trim();

    for (const item of scored) {
      const t = item.track;
      const tid = String(t.id || '');
      const titleKey = (t.title || '').toLowerCase().trim();
      const canonKey = normalizeCanonicalTitle(t.title || '');
      if ((tid && seen.has(tid)) || seen.has(titleKey) || (canonKey && seen.has('canon_' + canonKey))) continue;

      const artKey = cleanArtistPrimaryKey(t.artist || '');
      if (artKey && (artistCounts.get(artKey) || 0) >= 2) continue;

      const albKey = (t.album || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/soundtrack|theme|single|ost|ep/gi, '').trim();
      if (albKey && albKey.length > 2 && !/\b(best of|hits of|top hits|romantic|melody|collection)\b/i.test(albKey)) {
        if ((albumCounts.get(albKey) || 0) >= 1) continue;
      }

      if (tid) seen.add(tid);
      seen.add(titleKey);
      if (canonKey) seen.add('canon_' + canonKey);
      if (artKey) artistCounts.set(artKey, (artistCounts.get(artKey) || 0) + 1);
      if (albKey && albKey.length > 2) albumCounts.set(albKey, (albumCounts.get(albKey) || 0) + 1);

      queue.push(t);
      if (queue.length >= count) break;
    }

    return queue;
  }

    /**
   * Curates a contiguous playlist queue of tracks matching the exact vibe of the source track.
   * e.g., If source is sad ("Thenpaandi Cheemayi"), builds an unbroken queue of matching sad songs!
   */
  /**
   * High-Precision Spotify & YouTube Recommendation Algorithmic Matcher
   * Fetches upstream suggestions, artist vibe streams, and ranks using multi-signal acoustic & language vectors.
   */
  async function getAlgorithmicMatchingTracks(seedTrack, count = 15, options = {}) {
    if (!seedTrack || isPodcastTrack(seedTrack) || options?.signal?.aborted) return [];
    const prefix = getVibeApiPrefix();
    const signal = options?.signal || null;

    const candidates = [];
    const seen = new Set();
    const seenCanon = new Set();
    const albumCount = new Map();
    const artistCount = new Map();

    if (seedTrack.id) seen.add(String(seedTrack.id));
    if (seedTrack.title) {
      seen.add((seedTrack.title + ' ' + (seedTrack.artist || '')).toLowerCase().trim());
      const sCanon = normalizeCanonicalTitle(seedTrack.title);
      if (sCanon) seenCanon.add(sCanon);
    }

    const seedVibe = detectVibeCategory(seedTrack);
    const seedLang = detectLanguage(seedTrack);
    const seedArtKey = cleanArtistPrimaryKey(seedTrack.artist || '');
    const taste = getSafeUserTaste();

    function addCandidate(raw) {
      if (!raw || isPodcastTrack(raw)) return;
      const title = raw.title || raw.name || '';
      if (!title) return;
      if (isSameSongOrReprise(title, seedTrack.title)) return;
      const canon = normalizeCanonicalTitle(title);
      if (canon && seenCanon.has(canon)) return;

      const candFull = `${title} ${raw.artist || ''} ${raw.album || ''}`.toLowerCase();
      if (/karaoke|instrumental|minus\s*one|party\s*tyme|prosource|ameritz|serene\s*songs|made\s*pop|backing\s*version|tribute/i.test(candFull)) {
        return;
      }

      const rawArt = (typeof raw.artist === 'string' ? raw.artist : (raw.artists?.primary?.[0]?.name || ''));
      const rawAlb = (typeof raw.album === 'string' ? raw.album : raw.album?.name) || '';
      const candVibe = detectVibeCategory({ title, artist: rawArt, album: rawAlb, mood: raw.mood, vibe: raw.vibe });
      if (!isVibeCompatible(seedVibe, candVibe, true)) return;

      const candLang = detectLanguage({ title, artist: rawArt, album: rawAlb, language: raw.language });
      const artKey = cleanArtistPrimaryKey(rawArt);
      if (seedLang && candLang && candLang !== seedLang && (!seedArtKey || artKey !== seedArtKey)) return;

      // Diversity Rule 1: Strict Album Diversity (max 1 track per movie/album across queue)
      const albKey = rawAlb.toLowerCase().replace(/\(.*?\)/g, '').replace(/soundtrack|theme|single|ost|ep/gi, '').trim();
      if (albKey && albKey.length > 2) {
        const aCnt = albumCount.get(albKey) || 0;
        if (aCnt >= 1) return;
      }

      // Diversity Rule 2: Artist Diversity (max 2 tracks per artist)
      if (artKey) {
        const artCnt = artistCount.get(artKey) || 0;
        if (artCnt >= 2) return;
      }

      const key = (title + ' ' + rawArt).toLowerCase().trim();
      if (seen.has(key)) return;
      const id = String(raw.id || ('cand_' + candidates.length + '_' + title.slice(0, 6).replace(/[^a-z0-9]/gi, '')));
      if (seen.has(id)) return;

      let artist = '';
      if (typeof raw.artist === 'string' && raw.artist) {
        artist = raw.artist;
      } else if (raw.artists?.primary && Array.isArray(raw.artists.primary)) {
        artist = raw.artists.primary.map(a => a.name).join(', ');
      } else if (Array.isArray(raw.artists)) {
        artist = raw.artists.map(a => typeof a === 'string' ? a : (a.name || '')).filter(Boolean).join(', ');
      } else {
        artist = 'Unknown Artist';
      }

      const album = (typeof raw.album === 'string' ? raw.album : raw.album?.name) || 'Studio Single';

      let artwork = raw.artwork || raw.image;
      if (Array.isArray(artwork)) {
        artwork = artwork[artwork.length - 1]?.url || artwork[0]?.url || '';
      } else if (typeof artwork === 'object' && artwork?.url) {
        artwork = artwork.url;
      }

      let streamUrl = raw.streamUrl || raw.url || '';
      if (!streamUrl && Array.isArray(raw.downloadUrl)) {
        streamUrl = raw.downloadUrl[raw.downloadUrl.length - 1]?.url || raw.downloadUrl[0]?.url || '';
      }

      const duration = parseInt(raw.duration || 0, 10) || 0;

      const cand = {
        id,
        title,
        artist,
        album,
        duration,
        artwork: artwork || 'icon-512.png',
        streamUrl,
        quality: raw.quality || 'FLAC / 320kbps Lossless',
        language: raw.language || candLang || seedLang || ''
      };

      seen.add(key);
      seen.add(id);
      if (canon) seenCanon.add(canon);
      if (albKey && albKey.length > 2) albumCount.set(albKey, (albumCount.get(albKey) || 0) + 1);
      if (artKey) artistCount.set(artKey, (artistCount.get(artKey) || 0) + 1);
      candidates.push(cand);
    }

    const fetchFast = async (url, ms = 2200) => {
      if (signal?.aborted) return null;
      try {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), ms);
        const onExtAbort = () => ctrl.abort();
        if (signal) signal.addEventListener('abort', onExtAbort, { once: true });
        const res = await fetch(url, { signal: ctrl.signal });
        clearTimeout(tid);
        if (signal) signal.removeEventListener('abort', onExtAbort);
        return res;
      } catch(e) {
        return null;
      }
    };

    // Step 1: Query Search API for Composer / Primary Artist vibe hits
    const primaryArt = pickComposerOrPrimaryArtist(seedTrack.artist || '');
    const vibeKeyword = getVibeSearchKeyword(seedVibe);
    if (primaryArt && primaryArt.length > 2 && !/unknown|soundtrack|va|various/i.test(primaryArt)) {
      const q = `${primaryArt} ${vibeKeyword}`;
      const res = await fetchFast(prefix + '/api/search?q=' + encodeURIComponent(q) + '&limit=12');
      if (res && res.ok) {
        try {
          const data = await res.json();
          const list = data.results || data.songs || data.tracks || [];
          if (Array.isArray(list) && list.length > 0) {
            list.forEach(addCandidate);
          }
        } catch (e) {}
      }
    }

    // Step 2: Query companion vibe tracks in the same language (only when language is known or artist empty)
    if (candidates.length < count && !signal?.aborted) {
      try {
        const searchQ = seedLang ? `${seedLang} ${vibeKeyword} hits` : `${seedTrack.title || ''} ${vibeKeyword}`.trim();
        const res = await fetchFast(prefix + '/api/search?q=' + encodeURIComponent(searchQ) + '&limit=15');
        if (res && res.ok) {
          try {
            const data = await res.json();
            const list = data.results || data.songs || data.tracks || data.data?.results || [];
            if (Array.isArray(list)) {
              list.forEach(addCandidate);
            }
          } catch (e) {}
        }
      } catch (e) {}
    }

    if (signal?.aborted) return [];

    // Step 3: In-Memory Catalog Pool Fallback
    if (candidates.length < count) {
      const pool = (typeof window !== 'undefined' && window.AllSongPool && window.AllSongPool.length > 0)
        ? window.AllSongPool
        : [];
      const maxPoolCandidates = Math.max(count * 3, 45);
      for (const p of pool) {
        addCandidate(p);
        if (candidates.length >= maxPoolCandidates) break;
      }
    }

    // Step 4: Multi-signal deterministic ranking
    if (candidates.length > 0) {
      candidates.sort((a, b) => calculateVibeDistance(seedTrack, a, taste) - calculateVibeDistance(seedTrack, b, taste));
    }

    return candidates.slice(0, count);
  }

  async function curateMatchingVibeStream(sourceTrack, pool = [], count = 12) {
    if (!sourceTrack || isPodcastTrack(sourceTrack)) return [];
    const sourceVibe = detectVibeCategory(sourceTrack);
    const sourceLang = detectLanguage(sourceTrack);

    const candidates = Array.isArray(pool) ? [...pool] : [];
    const matched = [];
    const seen = new Set([sourceTrack.id || sourceTrack.title]);

    // 1. Gather all pool candidates matching this vibe and language
    for (const c of candidates) {
      if (!c || isPodcastTrack(c) || seen.has(c.id || c.title)) continue;
      const cVibe = detectVibeCategory(c);
      const cLang = detectLanguage(c);

      if (isVibeCompatible(sourceVibe, cVibe, true) && (!sourceLang || !cLang || cLang === sourceLang)) {
        seen.add(c.id || c.title);
        matched.push(c);
      }
    }

    matched.sort((a, b) => calculateVibeDistance(sourceTrack, a) - calculateVibeDistance(sourceTrack, b));

    if (matched.length < count && typeof fetch !== 'undefined') {
      try {
        const vibeKeyword = getVibeSearchKeyword(sourceVibe);
        const searchQ = sourceLang ? `${sourceLang} ${vibeKeyword} hits` : `${sourceTrack.title || ''} ${vibeKeyword}`.trim();
        const res = await fetch(`${getVibeApiPrefix()}/api/search?q=${encodeURIComponent(searchQ)}&limit=15`);
        if (res.ok) {
          const data = await res.json();
          const onlineResults = data.songs || data.results || data.tracks || [];
          for (const ot of onlineResults) {
            if (isPodcastTrack(ot)) continue;
            if (!seen.has(ot.id || ot.title)) {
              const otVibe = detectVibeCategory(ot);
              const otLang = detectLanguage(ot);
              if (isVibeCompatible(sourceVibe, otVibe, true) && (!sourceLang || !otLang || otLang === sourceLang)) {
                seen.add(ot.id || ot.title);
                matched.push(ot);
                if (matched.length >= count) break;
              }
            }
          }
        }
      } catch (e) {}
    }

    return matched.slice(0, count);
  }

  const VibeEngine = {
    getAlgorithmicMatchingTracks,
    detectVibeCategory,
    isVibeCompatible,
    getVibeSearchKeyword,
    pickComposerOrPrimaryArtist,
    curateMatchingVibeStream,
    getNextVibeTrack,
    resolveNextVibeTrackAsync,
    getContinuousRadioTrack,
    getVibeRadioQueue,
    calculateVibeDistance,
    extractAcoustics,
    inferAcoustics,
    detectLanguage,
    isTamilTrack,
    fetchRelatedOnlineTracks,
    expandVibePoolForTrack: fetchRelatedOnlineTracks,
    addRelatedTracks
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = VibeEngine;
  }
  global.VibeEngine = VibeEngine;
  global.getContinuousRadioTrack = getContinuousRadioTrack;
  global.getVibeRadioQueue = getVibeRadioQueue;
  global.getAlgorithmicMatchingTracks = getAlgorithmicMatchingTracks;
  global.getNextVibeTrack = getNextVibeTrack;
  global.calculateVibeDistance = calculateVibeDistance;
  global.expandVibePoolForTrack = fetchRelatedOnlineTracks;

})(typeof window !== 'undefined' ? window : globalThis);
