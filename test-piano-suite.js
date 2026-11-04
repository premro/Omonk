const fs = require("fs");
const assert = require("assert");
const path = require("path");

console.log("====================================================");
console.log("RUNNING COMPREHENSIVE OMONK PIANO ROLL TEST SUITE");
console.log("====================================================\n");

let passed = 0;
let failed = 0;

function it(desc, fn) {
    try {
        fn();
        console.log("  PASS: " + desc);
        passed++;
    } catch (err) {
        console.error("  FAIL: " + desc, err.message);
        failed++;
    }
}

// 1. Backend Engine Tests
console.log("--- Test Group 1: Backend Piano Engine & Transcription ---");
const pianoEngine = require("./functions/music_api/pianoEngine");

it("midiToNoteName maps correctly across multiple octaves", () => {
    assert.strictEqual(pianoEngine.midiToNoteName(60), "C4");
    assert.strictEqual(pianoEngine.midiToNoteName(61), "C#4");
    assert.strictEqual(pianoEngine.midiToNoteName(69), "A4");
    assert.strictEqual(pianoEngine.midiToNoteName(72), "C5");
    assert.strictEqual(pianoEngine.midiToNoteName(21), "A0");
    assert.strictEqual(pianoEngine.midiToNoteName(108), "C8");
});

it("generateHarmonicNotes creates structured, chronologically sorted notes", () => {
    const res = pianoEngine.generateHarmonicNotes("song_abc_123", 120, "Test Track", "Artist");
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.trackId, "song_abc_123");
    assert(res.notes.length > 50, "Should have generated realistic note density");

    for (let i = 1; i < res.notes.length; i++) {
        assert(res.notes[i].start >= res.notes[i - 1].start, "Notes must be sorted");
        assert(res.notes[i].end > res.notes[i].start, "Note end > start");
        assert(res.notes[i].midi >= 21 && res.notes[i].midi <= 108, "Notes in range");
        assert(res.notes[i].velocity > 0 && res.notes[i].velocity <= 1.0, "Velocity normalized");
    }
});

it("generateHarmonicNotes is deterministic for identical seeds", () => {
    const run1 = pianoEngine.generateHarmonicNotes("deterministic_test", 90);
    const run2 = pianoEngine.generateHarmonicNotes("deterministic_test", 90);
    assert.strictEqual(run1.notesCount, run2.notesCount);
    assert.strictEqual(run1.notes[0].midi, run2.notes[0].midi);
    assert.strictEqual(run1.notes[0].start, run2.notes[0].start);
});

it("getPianoNotes leverages in-memory and disk caching", () => {
    const trackId = "cache_test_track_" + Date.now();
    const first = pianoEngine.getPianoNotes(trackId, { duration: 60 });
    const second = pianoEngine.getPianoNotes(trackId, { duration: 60 });
    assert.strictEqual(first, second, "Subsequent call must return cached reference");
});

it("savePianoNotes correctly stores custom basic-pitch predictions", () => {
    const customId = "basic_pitch_uploaded_" + Date.now();
    const customPayload = {
        duration: 45.0,
        notes: [
            { pitch: "C4", midi: 60, start: 1.0, end: 1.8, velocity: 0.8 },
            { pitch: "E4", midi: 64, start: 1.0, end: 1.8, velocity: 0.75 },
            { pitch: "G4", midi: 67, start: 1.0, end: 1.8, velocity: 0.7 }
        ]
    };
    const saved = pianoEngine.savePianoNotes(customId, customPayload);
    assert.strictEqual(saved, true);

    const retrieved = pianoEngine.getPianoNotes(customId);
    assert.strictEqual(retrieved.notesCount, 3);
    assert.strictEqual(retrieved.notes[0].pitch, "C4");
});

// 2. Serverless Function Integration Tests
console.log("\n--- Test Group 2: Serverless Request Simulation ---");
const httpHandler = require("./functions/music_api/index.js");

it("GET /api/piano/notes returns JSON with 200 OK", () => {
    const mockReq = {
        url: "/api/piano/notes?track_id=test_api_song&duration=60&title=TestSong",
        method: "GET",
        headers: {}
    };

    let statusCode = 0;
    let headers = {};
    let body = "";

    const mockRes = {
        setHeader: (k, v) => { headers[k] = v; },
        writeHead: (code, h) => {
            statusCode = code;
            if (h) Object.assign(headers, h);
        },
        end: (data) => {
            body = data;
            assert.strictEqual(statusCode, 200);
            assert.strictEqual(headers["Content-Type"], "application/json");
            const parsed = JSON.parse(body);
            assert.strictEqual(parsed.success, true);
            assert(parsed.notes.length > 0);
        }
    };

    httpHandler(mockReq, mockRes);
});

it("GET /api/transcribe alias responds identically", () => {
    const mockReq = {
        url: "/api/transcribe?track_id=test_transcribe_alias&duration=40",
        method: "GET",
        headers: {}
    };

    let statusCode = 0;
    const mockRes = {
        setHeader: (k, v) => {},
        writeHead: (code) => { statusCode = code; },
        end: (data) => {
            assert.strictEqual(statusCode, 200);
            const parsed = JSON.parse(data);
            assert.strictEqual(parsed.success, true);
        }
    };

    httpHandler(mockReq, mockRes);
});

// 3. Frontend Markup & Integrity Tests
console.log("\n--- Test Group 3: Frontend Client Markup & Styles ---");
const indexHtml = fs.readFileSync("./client/index.html", "utf8");
const stylesCss = fs.readFileSync("./client/styles.css", "utf8");
const pianoRollJs = fs.readFileSync("./client/pianoRoll.js", "utf8");

it("client/index.html contains #openPianoBtn button", () => {
    assert(indexHtml.includes("id=\"openPianoBtn\""), "Player bar must include #openPianoBtn");
});

it("client/index.html loads pianoRoll.js script tag", () => {
    assert(indexHtml.includes("src=\"pianoRoll.js?v=7.9.0\""), "index.html must load pianoRoll.js");
});

it("client/styles.css includes .piano-drawer and .piano-toggle-btn styling", () => {
    assert(stylesCss.includes(".piano-drawer"), "styles.css must style .piano-drawer");
    assert(stylesCss.includes(".piano-toggle-btn"), "styles.css must style .piano-toggle-btn");
    assert(stylesCss.includes("#pianoWaterfallCanvas"), "styles.css must style waterfall canvas");
});

it("client/pianoRoll.js defines PianoRollManager and attaches window.PianoRoll", () => {
    assert(pianoRollJs.includes("class PianoRollManager"), "Must declare PianoRollManager");
    assert(pianoRollJs.includes("window.PianoRoll = new PianoRollManager()"), "Must export singleton");
    assert(pianoRollJs.includes("requestAnimationFrame"), "Must synchronize via requestAnimationFrame");
});

console.log("\n====================================================");
console.log(`TEST RUN COMPLETE: ${passed} PASSED, ${failed} FAILED`);
console.log("====================================================");

if (failed > 0) {
    process.exit(1);
}
