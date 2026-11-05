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


  
  /**
   * High-Precision 6-Category Vibe Classifier
   * Categorizes any track into: 'sad', 'romantic', 'dance', 'mass', 'chill', 'devotional', or 'melodic'
   */
  function detectVibeCategory(track) {
    if (!track) return 'melodic';
    const raw = `${track.title || ''} ${track.artist || ''} ${track.album || ''} ${track.mood || ''} ${track.vibe || ''}`.toLowerCase();

    // 1. Sad / Pathos / Heartbreak / Emotional Ballad
    if (/\b(sad|pathos|heartbreak|valikudhu|valiye|pirinthathu|pirivu|thanimai|azhugai|kanave|uyirin|kanmani|cheemayi|thenpaandi|thenpandi|thendral vandhu|amma endru|aarariraro|kanne kalaimane|poove sempoove|channa mereya|agar tum saath ho|tujhe bhula diya|kabira|bekhayali|judai|luka chuppi|ae dil hai|kal ho na|someone like you|fix you|the night we met|all too well|lovely|arcade|tears|cry|pain|grief|alone|soga|sogam)\b/i.test(raw)) {
      return 'sad';
    }

    // 2. Energetic / Dance / Party / Kuthu
    if (/\b(kuthu|dance|party|club|edm|remix|bass|beat|dappan|item|dj|disco|thara local|jala jala|arabic kuthu|jimikki|dhol|nacho|fast|gym|power|alappara|bottle|machi|tasmac|sarakku|vethalaiya|vethala|potendi|billa|mankatha|baila|bailaa|thiruvizha|dappankuthu|aaluma|doluma|marana mass|vaathi coming|naa ready|jalabulanjangu|sodakku|otha sollaala|chinna machan|appadi podu|nakka mukka|jithu jilladi|danga maari|donu donu|why this kolaveri)\b/i.test(raw)) {
      return 'dance';
    }

    // 3. Mass / Anthem / Hero BGM
    if (/\b(mass|anthem|brass|hero|intro|whistle|thala|badass|hukum|naa ready|tiger|jailer|master|leo|beast|vikram|roar|bgm|theme)\b/i.test(raw)) {
      return 'mass';
    }

    // 4. Chill / Lo-Fi / Relaxing
    if (/\b(chill|lofi|lo-fi|relax|peace|calm|coffee|night|breeze|ambient|aesthetic|slowed|reverb)\b/i.test(raw)) {
      return 'chill';
    }

    // 5. Devotional / Classical
    if (/\b(devotional|bhajan|carnatic|classical|raga|temple|flute|violin|nadaswaram|sloka|stotram|om|shiva|krishna|murugan|ayyappa)\b/i.test(raw)) {
      return 'devotional';
    }

    // 6. Romantic / Melody
    if (/\b(kadhal|love|romance|melody|anbe|unplugged|acoustic|nee|nenjam|kanne|penne|vizhi|heart|soft|sweet|duet|priya|prema|ishq|pyaar|mohabbat|tum hi ho|kesariya|perfect|golden hour)\b/i.test(raw)) {
      return 'romantic';
    }

    // Acoustic feature fallbacks
    const bpm = track.bpm || 100;
    const energy = track.energy !== undefined ? track.energy : 0.5;
    if (energy < 0.42 && bpm < 88) return 'sad';
    if (energy > 0.75 && bpm > 118) return 'dance';
    if (energy < 0.52) return 'romantic';
    return 'melodic';
  }

  function detectLanguage(track) {
    if (!track) return 'tamil';
    let lang = (track.language || '').toLowerCase().trim();
    if (lang && lang !== 'unknown') return lang;

    const text = `${track.title || ''} ${track.artist || ''} ${track.album || ''}`.toLowerCase();
    if (/[஀-௿]/.test(text)) return 'tamil';
    if (/[ऀ-ॿ]/.test(text)) return 'hindi';
    if (/[ఀ-౿]/.test(text)) return 'telugu';
    if (/[ഀ-ൿ]/.test(text)) return 'malayalam';

    const hindiArtists = ['arijit singh', 'neha kakkar', 'badshah', 'diljit', 'kumar sanu', 'lata mangeshkar', 'pritam', 'shreya ghoshal', 'atif aslam', 'vishal mishra', 'kk', 'sonu nigam'];
    if (hindiArtists.some(ha => text.includes(ha))) return 'hindi';

    const englishArtists = ['taylor swift', 'the weeknd', 'ed sheeran', 'dua lipa', 'drake', 'post malone', 'billie eilish', 'justin bieber', 'coldplay', 'bruno mars', 'eminem'];
    if (englishArtists.some(ea => text.includes(ea))) return 'english';

    const tamilArtists = ['anirudh', 'rahman', 'harris jayaraj', 'yuvan', 'ilaiyaraaja', 'ilayaraja', 'sid sriram', 'pradeep kumar', 'santhosh narayanan', 'gv prakash', 'hiphop tamizha', 'dharan', 'd. imman', 'sean roldan'];
    if (tamilArtists.some(ta => text.includes(ta))) return 'tamil';

    return 'tamil';
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
      return { bpm: 105, energy: 0.60, mood: 'melodic', tempo: 'medium', genre: 'pop', language: 'tamil' };
    }

    let bpm = track.bpm || track.audioFeatures?.tempo || track.tempo;
    let energy = track.energy !== undefined ? track.energy : track.audioFeatures?.energy;
    let mood = (track.mood || track.vibe || '').toLowerCase().trim();
    let tempo = (typeof track.tempo === 'string' ? track.tempo : '').toLowerCase().trim();
    let genre = (track.genre || track.category || '').toLowerCase().trim();
    let language = detectLanguage(track);

    const hasNumericBpm = (typeof bpm === 'number' && !isNaN(bpm) && bpm > 30 && bpm < 250);
    const hasNumericEnergy = (typeof energy === 'number' && !isNaN(energy) && energy >= 0 && energy <= 1.0);

    // If already fully populated with numeric values, return directly
    if (hasNumericBpm && hasNumericEnergy && mood) {
      return { bpm, energy, mood, tempo: tempo || (bpm > 115 ? 'fast' : bpm < 90 ? 'slow' : 'medium'), genre: genre || 'pop', language };
    }

    // Infer from track title, artist, album, and keywords
    const haystack = `${track.title || ''} ${track.artist || ''} ${track.album || ''} ${Array.isArray(track.keywords) ? track.keywords.join(' ') : ''}`.toLowerCase();

    let inferredBpm = hasNumericBpm ? bpm : 105;
    let inferredEnergy = hasNumericEnergy ? energy : 0.60;
    let inferredMood = mood || 'melodic';
    let inferredTempo = tempo || 'medium';

    // 1. Energetic / Dance / Fast / Bass Beat
    if (/\b(kuthu|dance|party|edm|remix|bass|mass|fast|beat|rap|drill|hip hop|gym|rock|teaser|theme|item|club|power|whistle|thala|dappan|hukum|badass|bottle|machi|tasmac|sarakku|vethalaiya|vethala|potendi|billa|mankatha|baila|bailaa|thiruvizha|dappankuthu|aaluma|doluma|marana mass|vaathi coming|naa ready|jalabulanjangu|sodakku|otha sollaala|chinna machan|appadi podu|nakka mukka|jithu jilladi|danga maari|donu donu|why this kolaveri)\b/i.test(haystack)) {
      inferredBpm = hasNumericBpm ? bpm : 136;
      inferredEnergy = hasNumericEnergy ? energy : 0.92;
      inferredMood = 'energetic';
      inferredTempo = 'fast';
      genre = genre || 'dance';
    }
    // 2. Slow / Melody / Romance / Soulful
    else if (/\b(melody|love|kadhal|unplugged|acoustic|slow|romantic|soul|sad|rain|thendral|nee|nenjam|kanne|penne|vizhi|heart|soft|valikudhu|pirivu|kanave|uyire)\b/i.test(haystack)) {
      inferredBpm = hasNumericBpm ? bpm : 82;
      inferredEnergy = hasNumericEnergy ? energy : 0.36;
      inferredMood = 'romantic';
      inferredTempo = 'slow';
      genre = genre || 'melody';
    }
    // 3. Chill / Lo-Fi / Ambient
    else if (/\b(chill|lofi|lo-fi|relax|peace|calm|coffee|night|breeze|ambient|aesthetic)\b/i.test(haystack)) {
      inferredBpm = hasNumericBpm ? bpm : 76;
      inferredEnergy = hasNumericEnergy ? energy : 0.28;
      inferredMood = 'chill';
      inferredTempo = 'slow';
      genre = genre || 'lo-fi';
    }
    // 4. Classical / Devotional / Traditional
    else if (/\b(classical|carnatic|raga|bhajan|devotional|folk|flute|violin|nadaswaram|sloka|stotram|temple)\b/i.test(haystack)) {
      inferredBpm = hasNumericBpm ? bpm : 94;
      inferredEnergy = hasNumericEnergy ? energy : 0.48;
      inferredMood = 'devotional';
      inferredTempo = 'medium';
      genre = genre || 'classical';
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
   * Compares 5 acoustic and synergy dimensions. Never returns NaN.
   */
  function calculateVibeDistance(currentTrack, candidateTrack, taste = null) {
    if (!currentTrack || !candidateTrack) return 1.0;
    if (currentTrack.id === candidateTrack.id) return 9999.0;

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

    // Feature A: BPM Distance (Weight 0.30)
    const bpmDiff = Math.abs(curAc.bpm - candAc.bpm) / 160.0;
    const bpmScore = Math.min(1.0, bpmDiff) * 0.30;

    // Feature B: Energy Distance (Weight 0.35)
    const energyDiff = Math.abs(curAc.energy - candAc.energy);
    const energyScore = Math.min(1.0, energyDiff) * 0.35;

    // Feature C: Strict Vibe Consistency & Mood Alignment
    const curVibe = detectVibeCategory(currentTrack);
    const candVibe = detectVibeCategory(candidateTrack);

    // Hard vibe boundaries: never mix sad with party/dance or vice versa!
    if (curVibe === 'sad') {
      if (candVibe === 'dance' || candVibe === 'mass') return 9999.0;
      if (candVibe !== 'sad' && candVibe !== 'chill' && candVibe !== 'romantic' && candVibe !== 'melodic') return 500.0;
    } else if (curVibe === 'dance' || curVibe === 'mass') {
      if (candVibe === 'sad') return 9999.0;
      if (candVibe !== 'dance' && candVibe !== 'mass' && candVibe !== 'energetic') return 200.0;
    }

    let moodScore = 0.0;
    if (curVibe === candVibe) {
      moodScore = 0.0;
    } else if ((curVibe === 'romantic' && candVibe === 'chill') || (curVibe === 'chill' && candVibe === 'romantic')) {
      moodScore = 0.04;
    } else if (curVibe === 'sad' && candVibe === 'romantic') {
      moodScore = 0.10;
    } else {
      moodScore = 0.35;
    }

    // Feature D: Tempo match (Weight 0.15)
    const tempoScore = (curAc.tempo === candAc.tempo) ? 0.0 : 0.15;

    let normalizedDist = bpmScore + energyScore + moodScore + tempoScore;

    // Feature E: Metadata Synergy (Soundtrack / Artist / Music Director)
    let synergyModifier = 0.0;
    const curArtist = (currentTrack.artist || '').toLowerCase().trim();
    const candArtist = (candidateTrack.artist || '').toLowerCase().trim();
    const curAlbum = (currentTrack.album || currentTrack.category || '').toLowerCase().trim();
    const candAlbum = (candidateTrack.album || candidateTrack.category || '').toLowerCase().trim();

    // 1. Same Movie / Album soundtrack affinity bonus
    if (curAlbum && candAlbum && curAlbum.length >= 3 && (curAlbum === candAlbum || curAlbum.includes(candAlbum) || candAlbum.includes(curAlbum))) {
      synergyModifier -= 0.30;
    }

    // 2. Same Composer / Artist affinity bonus
    if (curArtist && candArtist) {
      const curPrimary = curArtist.split(/[,&]/)[0].trim();
      const candPrimary = candArtist.split(/[,&]/)[0].trim();
      if (curPrimary && candPrimary && (curPrimary === candPrimary || curArtist.includes(candPrimary) || candArtist.includes(curPrimary))) {
        synergyModifier -= 0.20;
      }
    }

    // 3. User favorite artists affinity bonus
    if (taste && Array.isArray(taste.favoriteArtists)) {
      if (taste.favoriteArtists.some(fa => candArtist.includes(fa.toLowerCase()))) {
        synergyModifier -= 0.15;
      }
    }

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

  /**
   * Helper: Asynchronously fetches related online tracks by artist or album.
   * Results are cached for 30 minutes.
   */
  async function fetchRelatedOnlineTracks(track) {
    if (!track) return [];
    const queries = [];
    const alb = (track.album || "").replace(/\(From.*?\)/i, "").trim();
    const art = (track.artist?.split(/[,&]/)[0] || "").trim();
    const acoustics = inferAcoustics(track);
    const lang = detectLanguage(track) || 'tamil';

    if (art && art.length >= 3) {
      queries.push(art);
      if (acoustics.mood === 'melodic' || acoustics.mood === 'romantic') {
        queries.push(`${art} melody hits`);
      } else if (acoustics.energy > 0.7) {
        queries.push(`${art} dance hits`);
      } else {
        queries.push(`${art} hits`);
      }
    }
    if (alb && alb.length >= 3 && !alb.toLowerCase().includes("single") && !alb.toLowerCase().includes("hits")) {
      queries.push(alb);
    }
    if (queries.length < 2) {
      queries.push(acoustics.mood === 'melodic' ? `${lang} melody hits` : `${lang} hits`);
    }

    const fetchedTracks = [];

    for (const query of queries) {
      const cacheKey = query.toLowerCase().trim();
      if (relatedTracksCache.has(cacheKey)) {
        fetchedTracks.push(...relatedTracksCache.get(cacheKey));
        continue;
      }

      try {
        const endpoint = `/api/search?q=${encodeURIComponent(query)}&limit=15`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const res = await fetch(endpoint, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const json = await res.json();
          const rawSongs = json?.results || json?.tracks || json?.data || [];
          const formatted = rawSongs.map(item => {
            const formattedTrack = {
              id: item.id || `rel_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
              title: item.title,
              artist: item.artist,
              album: item.album || '',
              duration: item.duration || 210,
              artwork: item.artwork || item.image || '',
              streamUrl: item.streamUrl || '',
              quality: item.quality || 'FLAC / 320kbps Lossless',
              language: item.language || lang
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

  /**
   * Main Standalone Vibe Recommendation Function:
   * Selects the next song to play based on dynamic Vibe-Matching against the currently playing track.
   */
  function getNextVibeTrack(currentTrack, catalog, history = [], targetLanguage = null) {
    if (!currentTrack && (!catalog || catalog.length === 0)) return null;

    const taste = (typeof window !== 'undefined' && window.ProfileManager) ? window.ProfileManager.getUserTaste() : null;
    const appState = (typeof window !== 'undefined' && window.State) ? window.State : null;

    // 1. Language Enforcement: Strictly preserve current track's language
    let enforcedLang = detectLanguage(currentTrack) || targetLanguage;
    if (!enforcedLang && taste && Array.isArray(taste.languages) && taste.languages.length > 0) {
      enforcedLang = taste.languages[0];
    } else if (!enforcedLang && appState) {
      enforcedLang = (appState.preferredLanguages && appState.preferredLanguages[0]) || appState.activeLanguage;
    }
    enforcedLang = (enforcedLang || "tamil").toLowerCase().trim();

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
      if (t && t.id && !mergedMap.has(t.id)) {
        mergedMap.set(t.id, t);
      }
    }
    let allCandidates = Array.from(mergedMap.values());

    // 3. Exclude last 25 history tracks + current track
    const excludeIds = new Set();
    if (currentTrack?.id) excludeIds.add(currentTrack.id);

    const historySlice = (Array.isArray(history) ? history : []).slice(-25);
    for (const h of historySlice) {
      const id = (typeof h === 'string') ? h : h?.id;
      if (id) excludeIds.add(id);
    }

    // 4. Avoid same artist more than 2 times in a row
    const recentHistory = (Array.isArray(history) ? history : []).slice(-2);
    let consecutiveArtist = null;
    if (recentHistory.length >= 2) {
      const a1 = (recentHistory[0]?.artist || '').split(/[,&]/)[0].toLowerCase().trim();
      const a2 = (recentHistory[1]?.artist || '').split(/[,&]/)[0].toLowerCase().trim();
      if (a1 && a1 === a2) {
        consecutiveArtist = a1;
      }
    }

    // 5. Filter candidates
    let candidatePool = allCandidates.filter(t => {
      if (!t || !t.id || excludeIds.has(t.id)) return false;
      if (t.duration && t.duration <= 45) return false;

      // Blocked artist filter
      if (taste && Array.isArray(taste.blockedArtists)) {
        const candArt = (t.artist || '').toLowerCase();
        if (taste.blockedArtists.some(ba => candArt.includes(ba.toLowerCase()))) return false;
      }

      // Blocked tracks filter
      if (taste && Array.isArray(taste.blockedTracks) && taste.blockedTracks.includes(t.id)) {
        return false;
      }

      // Avoid 3rd consecutive play of same artist
      if (consecutiveArtist) {
        const candArt = (t.artist || '').split(/[,&]/)[0].toLowerCase().trim();
        if (candArt === consecutiveArtist) return false;
      }

      // Strict language match
      const trackLang = detectLanguage(t);
      if (enforcedLang === 'tamil') {
        return trackLang === 'tamil';
      } else {
        return trackLang === enforcedLang;
      }
    });

    // Relax exclusions if pool is too small
    if (candidatePool.length < 3) {
      candidatePool = allCandidates.filter(t => {
        if (!t || !t.id || (currentTrack && t.id === currentTrack.id)) return false;
        const trackLang = detectLanguage(t);
        if (enforcedLang === 'tamil') return trackLang === 'tamil';
        return trackLang === enforcedLang;
      });
    }

    if (candidatePool.length === 0) {
      candidatePool = allCandidates.filter(t => t && t.id && (!currentTrack || t.id !== currentTrack.id));
    }

    if (candidatePool.length === 0) {
      return null;
    }

    // 6. Score all candidates using calculateVibeDistance
    const curAcoustics = inferAcoustics(currentTrack);

    const scored = candidatePool.map(cand => {
      const dist = calculateVibeDistance(currentTrack, cand, taste);
      return { track: cand, distance: dist };
    });

    // Sort by lowest distance (closest vibe match)
    scored.sort((a, b) => a.distance - b.distance);

    // 7. Weighted-Random selection from TOP 5 candidates
    const top5 = scored.slice(0, Math.min(5, scored.length));
    if (top5.length === 0) return candidatePool[0] || null;

    const weights = top5.map(item => 1.0 / (item.distance + 0.05));
    const totalWeight = weights.reduce((acc, w) => acc + w, 0);
    let rand = Math.random() * totalWeight;
    let chosenIndex = 0;

    for (let i = 0; i < weights.length; i++) {
      rand -= weights[i];
      if (rand <= 0) {
        chosenIndex = i;
        break;
      }
    }

    const chosenItem = top5[chosenIndex] || top5[0];
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
  async function resolveNextVibeTrackAsync(currentTrack, candidates = [], history = [], targetLanguage = null) {
    if (!currentTrack) return null;

    const lang = targetLanguage || currentTrack.language || detectLanguage(currentTrack) || 'tamil';

    // Proactively fetch and populate related tracks for current song
    try {
      await fetchRelatedOnlineTracks(currentTrack);
    } catch (e) {}

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
   * Fetches the next best acoustic/vibe match when the current song completes.
   */
  async function getContinuousRadioTrack(currentTrack, history = []) {
    if (!currentTrack) return null;
    const isCatalyst = typeof window !== 'undefined' && (
      window.location.hostname.includes('catalystserverless') ||
      window.location.hostname.includes('zohocatalyst') 
    );
    const prefix = (typeof window !== 'undefined' && window.API_PREFIX) ? window.API_PREFIX : (isCatalyst ? '/server/music_api' : '');

    const historyIds = new Set((Array.isArray(history) ? history : []).map(h => typeof h === 'string' ? h : h?.id).filter(Boolean));
    if (currentTrack.id) historyIds.add(String(currentTrack.id));
    const historyTitles = new Set((Array.isArray(history) ? history : []).map(h => typeof h === 'string' ? '' : (h?.title || '').toLowerCase().trim()).filter(Boolean));
    if (currentTrack.title) historyTitles.add((currentTrack.title || '').toLowerCase().trim());

    // Step 1: Upstream Vibe Radio candidates
    try {
      const qParams = new URLSearchParams({
        id: currentTrack.id || '',
        title: currentTrack.title || '',
        artist: currentTrack.artist || '',
        album: currentTrack.album || '',
        lang: currentTrack.language || 'tamil'
      });
      const res = await fetch(`${prefix}/api/radio?${qParams.toString()}`);
      if (res.ok) {
        const json = await res.json();
        const candidateTracks = json.tracks || [];
        for (const cand of candidateTracks) {
          const titleKey = (cand.title || '').toLowerCase().trim();
          if (isSameSongOrReprise(cand.title, currentTrack.title)) continue;
          if (cand && cand.id && !historyIds.has(String(cand.id)) && !historyTitles.has(titleKey) && cand.streamUrl) {
            return cand;
          }
        }
      }
    } catch (e) {
      console.warn('[VibeEngine] getContinuousRadioTrack fetch failed:', e);
    }

    // Step 2: Query search for fresh hits by artist
    try {
      const artist = (currentTrack.artist || '').split(/[,&]/)[0].trim();
      if (artist) {
        const sRes = await fetch(`${prefix}/api/search?q=${encodeURIComponent(artist + ' hits')}&limit=10`);
        if (sRes.ok) {
          const sJson = await sRes.json();
          const sTracks = sJson.results || sJson.songs || [];
          for (const cand of sTracks) {
            const titleKey = (cand.title || '').toLowerCase().trim();
            if (isSameSongOrReprise(cand.title, currentTrack.title)) continue;
            if (cand && cand.id && !historyIds.has(String(cand.id)) && !historyTitles.has(titleKey) && cand.streamUrl) {
              return cand;
            }
          }
        }
      }
    } catch (e) {}

    // Fallback: local pool
    const pool = (typeof window !== 'undefined' && window.AllSongPool && window.AllSongPool.length > 0)
      ? window.AllSongPool
      : [];
    return getNextVibeTrack(currentTrack, pool, history);
  }

  /**
   * Builds an instant Spotify Autoplay / Track Radio Queue seeded by a track.
   * e.g., For "Machi Open the Bottle", immediately queues "Vethalaiya Potendi",
   * "Vaada Bin Laada", "Aaluma Doluma", "Naa Ready", etc.
   */
  async function getVibeRadioQueue(seedTrack, count = 20) {
    if (!seedTrack) return [];
    const isCatalyst = typeof window !== 'undefined' && (
      window.location.hostname.includes('catalystserverless') ||
      window.location.hostname.includes('zohocatalyst') 
    );
    const prefix = isCatalyst ? '/server/music_api' : '';

    const queue = [seedTrack];
    const seen = new Set();
    if (seedTrack.id) seen.add(String(seedTrack.id));
    if (seedTrack.title) seen.add(seedTrack.title.toLowerCase().trim());

    try {
      const qParams = new URLSearchParams({
        id: seedTrack.id || '',
        title: seedTrack.title || '',
        artist: seedTrack.artist || '',
        album: seedTrack.album || '',
        lang: seedTrack.language || 'tamil'
      });
      const res = await fetch(`${prefix}/api/radio?${qParams.toString()}`);
      if (res.ok) {
        const json = await res.json();
        const tracks = json.tracks || [];
        function cleanAlbumKey(alb) {
          if (!alb) return '';
          return alb.replace(/\(.*?\)/g, '')
                    .replace(/original motion picture soundtrack|soundtrack|single|ost|ep|theme/gi, '')
                    .trim().toLowerCase();
        }
        const albumSeen = new Set();
        const seedAlbKey = cleanAlbumKey(seedTrack.album);
        if (seedAlbKey && seedAlbKey.length > 2) albumSeen.add(seedAlbKey);

        for (const t of tracks) {
          const titleKey = (t.title || '').toLowerCase().trim();
          const tAlb = cleanAlbumKey(t.album);
          if (tAlb && tAlb.length > 2 && albumSeen.has(tAlb)) continue; // Spotify Rule: Max 1 per album

          if (t && t.streamUrl && !seen.has(String(t.id)) && !seen.has(titleKey)) {
            seen.add(String(t.id));
            seen.add(titleKey);
            if (tAlb && tAlb.length > 2) albumSeen.add(tAlb);
            queue.push(t);
            if (queue.length >= count) break;
          }
        }
      }
    } catch (e) {
      console.warn('[VibeEngine] getVibeRadioQueue error:', e);
    }

    return queue;
  }

    /**
   * Curates a contiguous playlist queue of tracks matching the exact vibe of the source track.
   * e.g., If source is sad ("Thenpaandi Cheemayi"), builds an unbroken queue of matching sad songs!
   */
  /**
   * High-Precision Spotify & YouTube Recommendation Algorithmic Matcher
   * Fetches upstream suggestions, artist vibe streams, and ranks using 5D acoustic vectors.
   */
  async function getAlgorithmicMatchingTracks(seedTrack, count = 15) {
    if (!seedTrack) return [];
    const isCatalyst = typeof window !== 'undefined' && (
      window.location.hostname.includes('catalystserverless') ||
      window.location.hostname.includes('zohocatalyst') 
    );
    const prefix = isCatalyst ? '/server/music_api' : '';

    const candidates = [];
    const seen = new Set();
    if (seedTrack.id) seen.add(String(seedTrack.id));
    if (seedTrack.title) {
      seen.add((seedTrack.title + ' ' + (seedTrack.artist || '')).toLowerCase().trim());
    }

    function cleanAlbKey(alb) {
      if (!alb) return '';
      return alb.replace(/\(.*?\)/g, '')
                .replace(/original motion picture soundtrack|soundtrack|single|ost|ep|theme/gi, '')
                .trim().toLowerCase();
    }
    function cleanArtKey(art) {
      if (!art) return '';
      return art.split(/[,&]/)[0].replace(/[.\-_]/g, ' ').trim().toLowerCase();
    }

    const albumCount = new Map();
    const artistCount = new Map();
    const seedAlbKey = cleanAlbKey(seedTrack.album);
    if (seedAlbKey && seedAlbKey.length > 2) albumCount.set(seedAlbKey, 1);
    const seedArtKey = cleanArtKey(seedTrack.artist);
    if (seedArtKey) artistCount.set(seedArtKey, 1);

    function addCandidate(raw) {
      if (!raw) return;
      const title = raw.title || raw.name || '';
      if (!title) return;
      if (isSameSongOrReprise(title, seedTrack.title)) return;
      const key = (title + ' ' + (raw.artist || (raw.artists?.primary?.[0]?.name) || '')).toLowerCase().trim();
      if (seen.has(key)) return;
      const id = String(raw.id || ('cand_' + Math.random().toString(36).slice(2, 9)));
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
      if (album && /romantic melody/i.test(album) && (!seedTrack.album || !seedTrack.album.toLowerCase().includes('romantic melody'))) {
        return; // Exclude legacy static Romantic Melody compilation album
      }

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
        language: raw.language || seedTrack.language || 'tamil'
      };

      seen.add(key);
      seen.add(id);
      // Spotify Cluster Diversity Rules:
      const candAlbKey = cleanAlbKey(album);
      if (candAlbKey && candAlbKey.length > 2) {
        if ((albumCount.get(candAlbKey) || 0) >= 1) return; // Max 1 per album
      }
      const candArtKey = cleanArtKey(artist);
      if (candArtKey) {
        if ((artistCount.get(candArtKey) || 0) >= 2) return; // Max 2 per artist
      }

      if (candAlbKey && candAlbKey.length > 2) albumCount.set(candAlbKey, (albumCount.get(candAlbKey) || 0) + 1);
      if (candArtKey) artistCount.set(candArtKey, (artistCount.get(candArtKey) || 0) + 1);
      candidates.push(cand);
    }

    const fetchFast = async (url, ms = 2200) => {
      try {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), ms);
        const res = await fetch(url, { signal: ctrl.signal });
        clearTimeout(tid);
        return res;
      } catch(e) {
        return null;
      }
    };

    // Step 1: Query Search API for Primary Artist / Composer hits (Never query raw song title!)
    const primaryArt = (seedTrack.artist || '').split(/[,&]/)[0].replace(/[.\-_]/g, ' ').trim();
    const seedLang = detectLanguage(seedTrack);
    if (primaryArt && primaryArt.length > 2 && !/unknown|soundtrack|va|various/i.test(primaryArt)) {
      const q = `${primaryArt} ${seedLang} hits`;
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

    // Step 2: Query companion vibe tracks in the same language
    if (candidates.length < count) {
      try {
        const seedVibe = detectVibeCategory(seedTrack);
        const vibeKeyword = seedVibe === 'sad' ? 'sad pathos melody' :
                            seedVibe === 'dance' ? 'dance kuthu party' :
                            seedVibe === 'mass' ? 'mass bgm theme' :
                            seedVibe === 'romantic' ? 'latest love hits' :
                            seedVibe === 'chill' ? 'chill lofi relax' : 'melody hits';
        const searchQ = `${seedLang} ${vibeKeyword} hits`;

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

    // Step 3: In-Memory / Window Catalog Pool Fallback
    if (candidates.length < count) {
      const pool = (typeof window !== 'undefined' && window.AllSongPool && window.AllSongPool.length > 0)
        ? window.AllSongPool
        : [];
      for (const p of pool) {
        addCandidate(p);
        if (candidates.length >= count) break;
      }
    }

    // Step 4: 5D Acoustic Vector Ranking via SpotifyEngine
    if (typeof window !== 'undefined' && window.SpotifyEngine && candidates.length > 0) {
      try {
        const seedFeat = window.SpotifyEngine.deriveAcousticFeatures(seedTrack);
        candidates.sort((a, b) => {
          const featA = window.SpotifyEngine.deriveAcousticFeatures(a);
          const featB = window.SpotifyEngine.deriveAcousticFeatures(b);
          const distA = Math.hypot(
            featA.energy - seedFeat.energy,
            featA.danceability - seedFeat.danceability,
            featA.valence - seedFeat.valence,
            featA.acousticness - seedFeat.acousticness
          );
          const distB = Math.hypot(
            featB.energy - seedFeat.energy,
            featB.danceability - seedFeat.danceability,
            featB.valence - seedFeat.valence,
            featB.acousticness - seedFeat.acousticness
          );
          return distA - distB;
        });
      } catch (e) {}
    }

    return candidates.slice(0, count);
  }

  async function curateMatchingVibeStream(sourceTrack, pool = [], count = 12) {
    if (!sourceTrack) return [];
    const sourceVibe = detectVibeCategory(sourceTrack);
    const sourceLang = detectLanguage(sourceTrack);

    const candidates = Array.isArray(pool) ? [...pool] : [];
    const matched = [];
    const seen = new Set([sourceTrack.id || sourceTrack.title]);

    // 1. Gather all pool candidates matching this vibe and language
    for (const c of candidates) {
      if (!c || seen.has(c.id || c.title)) continue;
      const cVibe = detectVibeCategory(c);
      const cLang = detectLanguage(c);

      // Same language and compatible vibe
      if (cVibe === sourceVibe && (cLang === sourceLang || sourceLang === 'unknown')) {
        seen.add(c.id || c.title);
        matched.push(c);
      }
    }

    // Sort matched by vibe distance to sourceTrack
    matched.sort((a, b) => calculateVibeDistance(sourceTrack, a) - calculateVibeDistance(sourceTrack, b));

    // 2. If pool has fewer than 6 matching tracks, fetch more online asynchronously!
    if (matched.length < count && typeof fetch !== 'undefined') {
      try {
        let vibeKeyword = sourceVibe === 'sad' ? 'sad pathos melody' :
                          sourceVibe === 'dance' ? 'dance kuthu party' :
                          sourceVibe === 'mass' ? 'mass bgm theme' :
                          sourceVibe === 'romantic' ? 'latest love hits' :
                          sourceVibe === 'chill' ? 'chill lofi relax' : 'hit songs';

        const primaryArt = (sourceTrack.artist || '').split(/[,&]/)[0].trim();
        const searchQ = `${primaryArt} ${vibeKeyword}`.trim();
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQ)}&limit=15`);
        if (res.ok) {
          const data = await res.json();
          const onlineResults = data.results || [];
          for (const ot of onlineResults) {
            if (!seen.has(ot.id || ot.title)) {
              const otVibe = detectVibeCategory(ot);
              if (otVibe === sourceVibe || sourceVibe === 'melodic' || otVibe === 'romantic') {
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
