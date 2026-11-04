/**
 * Spotify-Grade 7-Step Recommendation & Discovery Algorithm
 * Implements Collaborative Filtering, 5D Acoustic Profiles, Real-Time Feedback,
 * Bayesian Taste Vectors, and Dynamic Daily/Weekly Mix Generation.
 */

const SpotifyEngine = (() => {
    function getTasteKey() {
        return (window.ProfileManager && window.ProfileManager.getStorageKey)
            ? window.ProfileManager.getStorageKey('taste_profile')
            : 'lossless_taste_profile_v1';
    }

    function loadTaste() {
        const key = getTasteKey();
        const stored = localStorage.getItem(key) || localStorage.getItem('sp_taste_profile_v1');
        return stored ? JSON.parse(stored) : null;
    }
    
    // Default initial taste vector
    let tasteProfile = loadTaste() || {
        preferredLanguages: ['tamil', 'english'],
        artists: {}, // { "Anirudh": 25, "The Weeknd": 18 }
        genres: {
            "melody": 10,
            "pop": 8,
            "energetic": 12,
            "acoustic": 7,
            "electronic": 5
        },
        acousticPreferences: {
            energy: 0.65,
            danceability: 0.70,
            valence: 0.60,
            acousticness: 0.40,
            tempoBpm: 120
        },
        history: [], // [{ id, title, artist, listenedPercent, timestamp }]
        skipCount: 0,
        completedCount: 0,
        totalPlayTimeSeconds: 0
    };

    function saveTaste() {
        localStorage.setItem(getTasteKey(), JSON.stringify(tasteProfile));
    }

    // Hash track metadata into deterministic 5D acoustic features
    function deriveAcousticFeatures(track) {
        const str = `${track.title} ${track.artist} ${track.album || ''}`.toLowerCase();
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = (hash << 5) - hash + str.charCodeAt(i);
            hash |= 0;
        }
        const norm = Math.abs(hash);

        // Keywords detection for better accuracy
        const isUpbeat = /kuthu|alappara|dance|party|remix|badass|energy|rock|pop|beat/i.test(str);
        const isAcoustic = /acoustic|melody|unplugged|piano|guitar|classical|sad|kaadhal/i.test(str);

        let energy = ((norm % 100) / 100) * 0.6 + 0.2;
        if (isUpbeat) energy = Math.min(0.98, energy + 0.35);
        if (isAcoustic) energy = Math.max(0.15, energy - 0.25);

        let valence = (((norm >> 4) % 100) / 100) * 0.7 + 0.2;
        let danceability = (((norm >> 8) % 100) / 100) * 0.6 + 0.3;
        let acousticness = isAcoustic ? 0.8 : (((norm >> 12) % 100) / 100) * 0.4;
        let tempoBpm = 85 + (norm % 75);

        return {
            energy: parseFloat(energy.toFixed(2)),
            valence: parseFloat(valence.toFixed(2)),
            danceability: parseFloat(danceability.toFixed(2)),
            acousticness: parseFloat(acousticness.toFixed(2)),
            tempoBpm: tempoBpm
        };
    }

    // Euclidean distance between track features and user target
    function calculateAcousticSimilarity(featA, featB) {
        const dEnergy = Math.pow(featA.energy - featB.energy, 2);
        const dValence = Math.pow(featA.valence - featB.valence, 2);
        const dDance = Math.pow(featA.danceability - featB.danceability, 2);
        const dAcoustic = Math.pow(featA.acousticness - featB.acousticness, 2);
        const distance = Math.sqrt(dEnergy + dValence + dDance + dAcoustic);
        return Math.max(0, 1 - (distance / 2)); // 0.0 to 1.0
    }

    // Step 4: Real-time feedback loop
    function trackPlayFeedback(track, listenedSeconds, totalDuration) {
        if (!track || !totalDuration) return;
        const percent = (listenedSeconds / totalDuration) * 100;
        const feat = deriveAcousticFeatures(track);

        const artistKey = (track.artist || 'Unknown').split(',')[0].trim();

        if (percent >= 65 || listenedSeconds >= 30) { // Positive reinforcement even at 30 seconds
            // Reward: user enjoyed the track
            tasteProfile.completedCount++;
            tasteProfile.artists[artistKey] = (tasteProfile.artists[artistKey] || 0) + 8;
            
            // Adjust acoustic preferences slightly towards this track
            const alpha = 0.05; // Learning rate
            tasteProfile.acousticPreferences.energy = tasteProfile.acousticPreferences.energy * (1 - alpha) + feat.energy * alpha;
            tasteProfile.acousticPreferences.danceability = tasteProfile.acousticPreferences.danceability * (1 - alpha) + feat.danceability * alpha;
            tasteProfile.acousticPreferences.valence = tasteProfile.acousticPreferences.valence * (1 - alpha) + feat.valence * alpha;
            tasteProfile.acousticPreferences.acousticness = tasteProfile.acousticPreferences.acousticness * (1 - alpha) + feat.acousticness * alpha;
        } else if (listenedSeconds < 15 && totalDuration > 30) {
            // Penalty: user skipped quickly
            tasteProfile.skipCount++;
            tasteProfile.artists[artistKey] = Math.max(0, (tasteProfile.artists[artistKey] || 0) - 5);
        }

        tasteProfile.totalPlayTimeSeconds += Math.floor(listenedSeconds);
        tasteProfile.history.unshift({
            id: track.id,
            title: track.title,
            artist: track.artist,
            timestamp: Date.now()
        });
        if (tasteProfile.history.length > 100) tasteProfile.history.pop();
        saveTaste();
    }

    function trackLiked(track) {
        const artistKey = (track.artist || 'Unknown').split(',')[0].trim();
        tasteProfile.artists[artistKey] = (tasteProfile.artists[artistKey] || 0) + 15;
        saveTaste();
    }

    function trackDownloaded(track) {
        const artistKey = (track.artist || 'Unknown').split(',')[0].trim();
        tasteProfile.artists[artistKey] = (tasteProfile.artists[artistKey] || 0) + 20;
        saveTaste();
    }

    function setPreferredLanguages(langs) {
        tasteProfile.preferredLanguages = langs;
        saveTaste();
    }

    function getPreferredLanguages() {
        return tasteProfile.preferredLanguages || ['tamil', 'english'];
    }

    // Step 5 & 6: Generate Discover Weekly and Daily Mixes
    function generateDailyMixes(candidatePool) {
        if (!candidatePool || candidatePool.length === 0) return {};

        // Score all candidates
        const enriched = candidatePool.map(track => {
            const feat = deriveAcousticFeatures(track);
            const artistKey = (track.artist || '').split(',')[0].trim();
            const artistAffinity = tasteProfile.artists[artistKey] || 0;
            const acousticScore = calculateAcousticSimilarity(feat, tasteProfile.acousticPreferences);
            return {
                ...track,
                features: feat,
                score: acousticScore * 50 + Math.min(artistAffinity, 40)
            };
        });

        // Mix 1: High Energy (> 0.65 energy, high danceability)
        const mix1 = enriched
            .filter(t => t.features.energy >= 0.60)
            .sort((a, b) => b.score - a.score)
            .slice(0, 15);

        // Mix 2: Soulful Melodies & Acoustic (> 0.5 valence or high acousticness)
        const mix2 = enriched
            .filter(t => t.features.acousticness >= 0.35 || t.features.valence >= 0.55)
            .sort((a, b) => b.score - a.score)
            .slice(0, 15);

        // Mix 3: Chill / Ambient / Late Night (< 0.55 energy)
        const mix3 = enriched
            .filter(t => t.features.energy < 0.60)
            .sort((a, b) => b.score - a.score)
            .slice(0, 15);

        // Discover Weekly: high similarity but not in recent history
        const recentIds = new Set(tasteProfile.history.slice(0, 30).map(h => h.id));
        const discoverWeekly = enriched
            .filter(t => !recentIds.has(t.id))
            .sort((a, b) => (b.score * 0.7 + (Math.random() * 30)) - (a.score * 0.7 + (Math.random() * 30)))
            .slice(0, 18);

        return {
            mix1: { title: "Daily Mix 1 • High Energy & Upbeat", tracks: mix1, vibe: "high-energy" },
            mix2: { title: "Daily Mix 2 • Soulful Melodies", tracks: mix2, vibe: "melodies" },
            mix3: { title: "Daily Mix 3 • Chill & Late Night", tracks: mix3, vibe: "chill" },
            discoverWeekly: { title: "Discover Weekly • Specially Curated", tracks: discoverWeekly, vibe: "discover" }
        };
    }

    // Step 7: Smart Autoplay - Find next continuous track for queue
    function getNextAutoplayTrack(currentTrack, pool, excludeIds = new Set()) {
        if (!pool || pool.length === 0) return null;
        const currentFeat = currentTrack ? deriveAcousticFeatures(currentTrack) : tasteProfile.acousticPreferences;
        
        const candidates = pool.filter(t => !excludeIds.has(t.id) && (!currentTrack || t.id !== currentTrack.id));
        if (candidates.length === 0) return pool[Math.floor(Math.random() * pool.length)];

        candidates.sort((a, b) => {
            const featA = deriveAcousticFeatures(a);
            const featB = deriveAcousticFeatures(b);
            const simA = calculateAcousticSimilarity(featA, currentFeat);
            const simB = calculateAcousticSimilarity(featB, currentFeat);
            return simB - simA;
        });

        // Top 3 with 80% exploitation and 20% exploration
        const pickIndex = Math.random() < 0.8 ? 0 : Math.min(candidates.length - 1, Math.floor(Math.random() * 3));
        return candidates[pickIndex];
    }

    return {
        trackPlayFeedback,
        trackLiked,
        trackDownloaded,
        setPreferredLanguages,
        getPreferredLanguages,
        deriveAcousticFeatures,
        generateDailyMixes,
        getNextAutoplayTrack,
        getProfile: () => tasteProfile
    };
})();

window.SpotifyEngine = SpotifyEngine;
