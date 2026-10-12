// One Kokoro voice in a worker: text (or phonemes) in, a trimmed Ogg Opus clip out.
// Used by dev/voice-build.html, which runs several of these side by side.
import { KokoroTTS } from "https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm";

const VOICE = 'bf_isabella';
let tts = null;

self.onmessage = async ({ data: m }) => {
  try {
    if (m.type === 'init') {
      tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'wasm' });
      self.postMessage({ type: 'ready' });
      return;
    }
    if (m.type === 'job') {
      const t0 = performance.now();
      let audio;
      if (m.phonemes) {
        const { input_ids } = tts.tokenizer(m.phonemes, { truncation: true });
        audio = await tts.generate_from_ids(input_ids, { voice: VOICE, speed: m.speed });
      } else {
        audio = await tts.generate(m.text, { voice: VOICE, speed: m.speed });
      }
      const sr = audio.sampling_rate;
      const pcm = shape(audio.audio, sr);
      const ogg = await encodeOgg(pcm, sr);
      self.postMessage({ type: 'done', job: m, ogg, secs: pcm.length / sr, ms: performance.now() - t0 }, [ogg.buffer]);
    }
  } catch (e) {
    self.postMessage({ type: 'error', job: m, error: String((e && e.stack) || e) });
  }
};

// Cut the quiet lead-in and tail so the pauses between sentences are even, with tiny fades.
function shape(a, sr) {
  const th = 0.01;
  let s = 0, e = a.length - 1;
  while (s < a.length && Math.abs(a[s]) < th) s++;
  while (e > s && Math.abs(a[e]) < th) e--;
  const from = Math.max(0, s - Math.round(sr * 0.03));
  const to = Math.min(a.length, e + Math.round(sr * 0.08));
  const out = new Float32Array(Math.max(1, to - from));
  out.set(a.subarray(from, to));
  const f = Math.min(Math.round(sr * 0.008), out.length >> 2);
  for (let i = 0; i < f; i++) { const g = i / f; out[i] *= g; out[out.length - 1 - i] *= g; }
  return out;
}

async function encodeOgg(pcm, sr) {
  const packets = [];
  let desc = null;
  let failed = null;
  const enc = new AudioEncoder({
    output: (chunk, meta) => {
      const b = new Uint8Array(chunk.byteLength);
      chunk.copyTo(b);
      packets.push({ b, dur: chunk.duration });
      const d = meta && meta.decoderConfig && meta.decoderConfig.description;
      if (d && !desc) desc = d instanceof ArrayBuffer ? new Uint8Array(d.slice(0)) : new Uint8Array(d.buffer.slice(d.byteOffset, d.byteOffset + d.byteLength));
    },
    error: e => { failed = e; },
  });
  enc.configure({ codec: 'opus', sampleRate: sr, numberOfChannels: 1, bitrate: 32000, opus: { frameDuration: 20000, complexity: 10 } });
  enc.encode(new AudioData({ format: 'f32', sampleRate: sr, numberOfFrames: pcm.length, numberOfChannels: 1, timestamp: 0, data: pcm }));
  await enc.flush();
  enc.close();
  if (failed) throw failed;
  if (!packets.length) throw new Error('encoder gave no packets');
  return mux(packets, sr, desc, pcm.length);
}

/* ---- Ogg Opus (RFC 7845) ---- */
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let r = i << 24;
    for (let j = 0; j < 8; j++) r = (r & 0x80000000) ? ((r << 1) ^ 0x04c11db7) : (r << 1);
    t[i] = r >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0;
  for (let i = 0; i < buf.length; i++) c = ((c << 8) ^ CRC[((c >>> 24) ^ buf[i]) & 0xff]) >>> 0;
  return c >>> 0;
}
function page(packets, granule, serial, seq, flags) {
  const lacing = [];
  for (const p of packets) { let n = p.length; while (n >= 255) { lacing.push(255); n -= 255; } lacing.push(n); }
  const body = packets.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(27 + lacing.length + body);
  const dv = new DataView(out.buffer);
  out.set([0x4f, 0x67, 0x67, 0x53], 0);
  out[4] = 0; out[5] = flags;
  dv.setBigUint64(6, BigInt(granule), true);
  dv.setUint32(14, serial, true);
  dv.setUint32(18, seq, true);
  out[26] = lacing.length;
  out.set(lacing, 27);
  let o = 27 + lacing.length;
  for (const p of packets) { out.set(p, o); o += p.length; }
  dv.setUint32(22, crc32(out), true);
  return out;
}
const ascii = s => [...s].map(c => c.charCodeAt(0));
const samples48 = us => (us ? Math.round(us * 48 / 1000) : 960);

function mux(packets, sr, desc, n) {
  let head = desc && desc.length >= 19 && String.fromCharCode(...desc.slice(0, 8)) === 'OpusHead' ? desc.slice(0, 19) : null;
  if (!head) {
    head = new Uint8Array(19);
    head.set(ascii('OpusHead'));
    head[8] = 1; head[9] = 1;
    const dv = new DataView(head.buffer);
    dv.setUint16(10, 312, true);
    dv.setUint32(12, sr, true);
  }
  head[9] = 1;
  const preskip = head[10] | (head[11] << 8);
  const vendor = new TextEncoder().encode('astra-reads');
  const tags = new Uint8Array(8 + 4 + vendor.length + 4);
  tags.set(ascii('OpusTags'));
  new DataView(tags.buffer).setUint32(8, vendor.length, true);
  tags.set(vendor, 12);
  const serial = (Math.random() * 0xffffffff) >>> 0;
  const pages = [page([head], 0, serial, 0, 2), page([tags], 0, serial, 1, 0)];
  const total = packets.reduce((s, p) => s + samples48(p.dur), 0);
  const end = Math.min(total, preskip + Math.round(n * 48000 / sr));
  let gran = 0, seq = 2, batch = [];
  packets.forEach((p, i) => {
    batch.push(p.b);
    gran += samples48(p.dur);
    const left = packets.length - 1 - i;
    if (left === 0) pages.push(page(batch, end, serial, seq++, 4));
    else if (batch.length >= 50 && left > 5) { pages.push(page(batch, Math.min(gran, end), serial, seq++, 0)); batch = []; }
  });
  const size = pages.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(size);
  let o = 0;
  for (const p of pages) { out.set(p, o); o += p.length; }
  return out;
}
