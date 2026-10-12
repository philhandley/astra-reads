// Read-aloud. Recorded clips of the Kokoro "Isabella" voice (assets/audio, made by
// dev/voice-build.html and tools/voice_pack.py) play whenever every sentence of a line has one.
// Anything without a clip falls back to the browser's speech synthesis, preferring a UK voice.
//
// Sentences are recorded one at a time and joined here with a short pause (index.gap).
// Single words are recorded on their own at normal speed.
// splitSentences, sentenceId and wordKey are shared with dev/voice-lines.js: change them together.

const synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
const AC = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null;
const AUDIO = 'assets/audio/';
let voice = null;

function pickVoice() {
  if (!synth) return null;
  const voices = synth.getVoices();
  const tests = [
    v => /en[-_]GB/i.test(v.lang) && /(Google|Natural|Online|Neural|Enhanced|Premium)/i.test(v.name),
    v => /en[-_]GB/i.test(v.lang),
    v => /^en[-_](AU|IE|NZ)/i.test(v.lang),
    v => /^en/i.test(v.lang),
  ];
  for (const t of tests) {
    const v = voices.find(t);
    if (v) return v;
  }
  return null;
}

if (synth) {
  voice = pickVoice();
  synth.addEventListener?.('voiceschanged', () => { voice = pickVoice(); });
}

export const canSpeak = !!synth || !!AC;

/* ---------------- Text keys (shared with dev/voice-lines.js) ---------------- */

export function normText(s) {
  return String(s ?? '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
}

// "It is hot. Zeb waves!" -> ["It is hot.", "Zeb waves!"]; a part without an end mark gets a full stop.
export function splitSentences(text) {
  const t = normText(text);
  if (!t) return [];
  return t.split(/(?<=[.!?]["']?)\s+/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => (/[.!?]["']?$/.test(s) ? s : s + '.'));
}

// FNV-1a, 8 hex digits: the file name of a sentence clip.
export function sentenceId(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function wordKey(w) {
  return normText(w).toLowerCase();
}

// Join parts into speakable text, adding full stops where needed.
export function sentences(...parts) {
  return parts
    .filter(Boolean)
    .map(p => String(p).trim())
    .map(p => (/[.!?:]$/.test(p) ? p : p + '.'))
    .join(' ');
}

/* ---------------- Recorded clips ---------------- */

let index = null;
let indexP = null;
function loadIndex() {
  if (!indexP) {
    indexP = fetch(AUDIO + 'index.json')
      .then(r => (r.ok ? r.json() : null))
      .then(j => { index = j && j.s && j.w ? j : null; return index; })
      .catch(() => null);
  }
  return indexP;
}

const packs = new Map();
function pack(i) {
  const name = index.packs[i];
  if (!packs.has(name)) {
    const p = fetch(AUDIO + name + '.bin').then(r => {
      if (!r.ok) throw new Error('voice pack ' + name + ' ' + r.status);
      return r.arrayBuffer();
    });
    p.catch(() => packs.delete(name));
    packs.set(name, p);
  }
  return packs.get(name);
}

let ctx = null;
function audioCtx() {
  if (!AC) return null;
  if (!ctx) { try { ctx = new AC(); } catch (e) { return null; } }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

const decoded = new Map(); // cache key -> AudioBuffer, most recent last
async function clip(key, entry) {
  if (decoded.has(key)) {
    const b = decoded.get(key);
    decoded.delete(key); decoded.set(key, b);
    return b;
  }
  const [p, off, len] = entry;
  const data = await pack(p);
  const buf = await ctx.decodeAudioData(data.slice(off, off + len));
  decoded.set(key, buf);
  if (decoded.size > 80) decoded.delete(decoded.keys().next().value);
  return buf;
}

if (typeof window !== 'undefined' && typeof fetch === 'function') {
  loadIndex();
  // Wake the audio on the first touch, so lines read out later on their own can play.
  const unlock = () => { audioCtx(); window.removeEventListener('pointerdown', unlock, true); };
  window.addEventListener('pointerdown', unlock, true);
}

/* ---------------- Playback ---------------- */

let seq = 0;        // bumps on every speak and stop, so stale async work can tell it is out of date
let current = null; // { sources, onend, done }

function finish(p) {
  if (!p || p.done) return;
  p.done = true;
  if (current === p) current = null;
  p.onend && p.onend();
}

export function stopSpeaking() {
  seq++;
  if (current) {
    const p = current;
    p.sources.forEach(s => { try { s.onended = null; s.stop(); } catch (e) { /* ignore */ } });
    finish(p);
  }
  if (synth) { try { synth.cancel(); } catch (e) { /* ignore */ } }
}

function synthSay(text, { onend, rate = 0.9, pitch = 1.02 } = {}) {
  if (!synth || !text) { onend && onend(); return; }
  try {
    const u = new SpeechSynthesisUtterance(String(text));
    if (voice) u.voice = voice;
    u.lang = voice ? voice.lang : 'en-GB';
    u.rate = rate;
    u.pitch = pitch;
    let ended = false;
    const done = () => { if (ended) return; ended = true; onend && onend(); };
    u.onend = done;
    u.onerror = done;
    synth.speak(u);
  } catch (e) {
    onend && onend();
  }
}

function report(mode, info) {
  if (typeof window !== 'undefined') window.__voice = { mode, ...info };
}

// items: [{ key, entry }] in order. Falls back to synthesis if anything goes wrong before sound starts.
async function playClips(items, gap, onend, fallback) {
  const my = seq;
  const c = audioCtx();
  if (!c) return fallback();
  const p = { sources: [], onend, done: false };
  current = p;
  let bufs;
  try {
    bufs = await Promise.all(items.map(it => clip(it.key, it.entry)));
  } catch (e) {
    if (my !== seq || p.done) return;
    current = null;
    console.warn('[voice]', e);
    return fallback();
  }
  if (my !== seq || p.done) return;
  let t = c.currentTime + 0.05;
  bufs.forEach((b, i) => {
    const s = c.createBufferSource();
    s.buffer = b;
    s.connect(c.destination);
    s.start(t);
    p.sources.push(s);
    t += b.duration + (i < bufs.length - 1 ? gap : 0);
  });
  p.sources[p.sources.length - 1].onended = () => finish(p);
}

function whenIndexed(run) {
  if (index || !indexP) { run(); return; }
  const my = seq;
  indexP.then(() => { if (my === seq) run(); });
}

export function speak(text, { onend, rate = 0.9, pitch = 1.02 } = {}) {
  stopSpeaking();
  if (!text) { onend && onend(); return; }
  audioCtx();
  whenIndexed(() => {
    const parts = splitSentences(text);
    const items = index ? parts.map(s => { const id = sentenceId(s); return { key: 's' + id, entry: index.s[id] }; }) : [];
    const missing = index ? parts.filter((s, i) => !items[i].entry) : parts;
    if (items.length && !missing.length) {
      report('clips', { text });
      playClips(items, index.gap ?? 0.35, onend, () => { report('synth', { text, missing: ['(clip failed)'] }); synthSay(text, { onend, rate, pitch }); });
    } else {
      report('synth', { text, missing });
      synthSay(text, { onend, rate, pitch });
    }
  });
}

// A single word, on its own.
export function speakWord(word, opts = {}) {
  stopSpeaking();
  if (!word) { opts.onend && opts.onend(); return; }
  audioCtx();
  whenIndexed(() => {
    const k = wordKey(word);
    const entry = index && index.w[k];
    const fallback = () => { report('synth', { text: word, missing: [k] }); synthSay(word, { rate: 0.8, ...opts }); };
    if (entry) { report('clips', { text: word }); playClips([{ key: 'w' + k, entry }], 0, opts.onend, fallback); }
    else fallback();
  });
}
