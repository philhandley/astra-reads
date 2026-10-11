// Phonics helpers: split a word into Little Wandle style graphemes (sound buttons), and mark the
// graphemes that spell a story's focus sound. Greedy longest-match over Phase 2 to 5 graphemes,
// split digraphs (a-e, i-e...) found first, and a small list of words that follow their own rules.
//
// A segment is { g, text, split?, v?, mid?, sound? }:
//   g      the grapheme key ('ai', 'a_e', 'y' ...)
//   text   the letters it covers in the word ('ai', 'ake' ...)
//   split  true for a split digraph; v = the vowel letter, mid = the consonant(s) inside, text ends with 'e'
//   sound  the sound a two-way grapheme makes here ('ee' | 'igh' | 'ai' | 'e' | 'oa' | 'ow'), when known

const FOUR = ['eigh', 'aigh', 'augh', 'ough', 'ture'];
const THREE = ['igh', 'tch', 'dge', 'air', 'ear', 'eer', 'ere', 'are', 'ire', 'ure', 'oor', 'oar', 'our', 'aur', 'ore', 'ssi'];
const TWO = ['ai', 'ay', 'ee', 'ea', 'ie', 'oa', 'ow', 'oo', 'oi', 'oy', 'ou', 'ue', 'ew', 'ui', 'oe', 'au', 'aw',
  'ar', 'or', 'ur', 'er', 'ir', 'ch', 'sh', 'th', 'ng', 'nk', 'qu', 'ck', 'ff', 'll', 'ss', 'zz', 'ph'];
const START_ONLY = ['kn', 'gn', 'wr', 'wh'];
const END_ONLY = ['ve', 'se', 'ce', 'ze', 'ge', 'le', 'el', 'al', 'il', 'mb', 'ey'];
const END_REST = /^(s|d|ed|es|ing)?$/;

// Words that break the rules (tricky words and odd spellings). '|' separates sound buttons; a_e marks a split digraph.
const OVERRIDES = {
  the: 'th|e', a: 'a', i: 'i', to: 't|o', into: 'i|n|t|o', no: 'n|o', go: 'g|o', so: 's|o', of: 'o|f', is: 'i|s', his: 'h|i|s', as: 'a|s', has: 'h|a|s',
  was: 'w|a|s', you: 'y|ou', they: 'th|ey', all: 'a|ll', are: 'are', my: 'm|y', by: 'b|y', be: 'b|e', he: 'h|e', she: 'sh|e', we: 'w|e', me: 'm|e',
  said: 's|ai|d', have: 'h|a|ve', give: 'g|i|ve', live: 'l|i|ve', love: 'l|o|ve', above: 'a|b|o|ve', glove: 'g|l|o|ve',
  come: 'c|o|me', some: 's|o|me', done: 'd|o|ne', none: 'n|o|ne', gone: 'g|o|ne', one: 'o|ne', once: 'o|n|ce',
  were: 'w|ere', there: 'th|ere', where: 'wh|ere', here: 'h|ere', little: 'l|i|tt|le', says: 's|ay|s', do: 'd|o', like: 'l|i_e|k',
  what: 'wh|a|t', when: 'wh|e|n', out: 'ou|t', today: 't|o|d|ay', their: 'th|eir', people: 'p|eo|p|le', oh: 'oh', your: 'y|our',
  mr: 'mr', mrs: 'mrs', ask: 'a|s|k', could: 'c|oul|d', would: 'w|oul|d', should: 'sh|oul|d', our: 'our', house: 'h|ou|se', mouse: 'm|ou|se',
  water: 'w|a|t|er', want: 'w|a|n|t', any: 'a|n|y', many: 'm|a|n|y', again: 'a|g|ai|n', who: 'wh|o', whole: 'wh|o|le', where_: '',
  two: 't|wo', school: 's|ch|oo|l', call: 'c|a|ll', different: 'd|i|ff|er|e|n|t', thought: 'th|ough|t', through: 'th|r|ough',
  friend: 'f|r|ie|n|d', work: 'w|or|k', laugh: 'l|augh', because: 'b|e|c|au|se', eye: 'eye', eyes: 'eye|s', busy: 'b|u|s|y',
  beautiful: 'b|eau|t|i|f|u|l', pretty: 'p|r|e|tt|y', hour: 'h|our', move: 'm|o|ve', prove: 'p|r|o|ve', lose: 'l|o|se', whose: 'wh|o|se',
  improve: 'i|m|p|r|o|ve', parents: 'p|a|r|e|n|t|s', shoe: 'sh|oe', does: 'd|oe|s', great: 'g|r|ea|t', break: 'b|r|ea|k',
  forest: 'f|o|r|e|s|t', every: 'e|v|er|y', very: 'v|er|y', always: 'al|w|ay|s', walk: 'w|al|k', talk: 't|al|k', area: 'a|r|e|a',
  guess: 'g|ue|ss', science: 's|c|ie|n|ce', whistle: 'wh|i|st|le', listen: 'l|i|st|e|n', climb: 'c|l|i|mb', climbs: 'c|l|i|mb|s',
  camera: 'c|a|m|er|a', gorilla: 'g|o|r|i|ll|a', gorillas: 'g|o|r|i|ll|a|s', dinosaur: 'd|i|n|o|s|aur', dinosaurs: 'd|i|n|o|s|aur|s',
  nobody: 'n|o|b|o|d|y', okay: 'o|k|ay', ok: 'o|k', wow: 'w|ow', hooray: 'h|oo|r|ay', yes: 'y|e|s', zeb: 'z|e|b', finn: 'f|i|nn',
  maiasaura: 'm|ai|a|s|aur|a', phobos: 'ph|o|b|o|s', deimos: 'd|ei|m|o|s', robot: 'r|o|b|o|t', potato: 'p|o|t|a|t|o', tiny: 't|i|n|y',
  minute: 'm|i|n|u|te', octopus: 'o|c|t|o|p|u|s', jellyfish: 'j|e|ll|y|f|i|sh', volcano: 'v|o|l|c|a|n|o', silverback: 's|i|l|v|er|b|a|ck',
  giant: 'g|i|a|n|t', control: 'c|o|n|t|r|o|l', planet: 'p|l|a|n|e|t', monkey: 'm|o|n|k|ey', monkeys: 'm|o|n|k|ey|s', baby: 'b|a|b|y',
  babies: 'b|a|b|ie|s', only: 'o|n|l|y', open: 'o|p|e|n', over: 'o|v|er', cold: 'c|o|l|d', old: 'o|l|d', hold: 'h|o|l|d', both: 'b|o|th',
  most: 'm|o|s|t', gold: 'g|o|l|d', told: 't|o|l|d', paper: 'p|a|p|er', even: 'e|v|e|n', hello: 'h|e|ll|o', zero: 'z|er|o',
  seven: 's|e|v|e|n', eleven: 'e|l|e|v|e|n', metres: 'm|e|t|r|e|s', metre: 'm|e|t|r|e', ranger: 'r|a|n|g|er', dragon: 'd|r|a|g|o|n',
  buses: 'b|u|s|e|s', bus: 'b|u|s', around: 'a|r|ou|n|d', parrot: 'p|a|rr|o|t', falcon: 'f|a|l|c|o|n', carrot: 'c|a|rr|o|t',
  sometimes: 's|o|me|t|i_e|m|s', someone: 's|o|me|o|ne', everyone: 'e|v|er|y|o|ne', nothing: 'n|o|th|i|ng', away: 'a|w|ay',
};
delete OVERRIDES.where_;

const VOWELS = 'aeiou';
const EA_SHORT = new Set(['head', 'bread', 'ready', 'heavy', 'weather', 'feather', 'instead', 'breath', 'dead', 'meant', 'sweat', 'sweater', 'thread', 'spread', 'dread', 'steady', 'leather', 'heaven', 'breakfast', 'already', 'deaf', 'death', 'health', 'wealth', 'treasure', 'measure', 'pleasure', 'meadow', 'heavier', 'headed', 'ahead', 'lead', 'leapt', 'dealt', 'threat', 'sweating', 'weapon']);
const EA_AI = new Set(['great', 'break', 'steak', 'greater', 'breaks', 'breaking']);
const OW_COW = new Set(['cow', 'now', 'how', 'down', 'town', 'brown', 'owl', 'crowd', 'flower', 'shower', 'tower', 'power', 'growl', 'howl', 'clown', 'frown', 'crown', 'gown', 'wow', 'allow', 'vowel', 'towel', 'bow', 'row', 'crowded', 'downstairs', 'flowers', 'owls', 'powerful', 'drown', 'prowl', 'scowl', 'fowl', 'vow', 'sow', 'plow', 'chow', 'pow', 'meow', 'somehow', 'anyhow', 'cows', 'towns', 'crowds', 'showers', 'towers', 'growls', 'howls', 'clowns']);
const EY_AI = new Set(['they', 'grey', 'obey', 'prey', 'hey', 'survey', 'whey', 'greys']);
// 'ou' that is not /ow/ (you, could, soup, shoulder...).
const OU_NOT_OW = new Set(['you', 'your', 'yours', 'could', 'would', 'should', 'four', 'pour', 'tour', 'soup', 'group', 'groups', 'through', 'thought', 'touch', 'young', 'country', 'cousin', 'double', 'trouble', 'shoulder', 'shoulders', 'boulder', 'boulders', 'mould', 'youth', 'route', 'courage', 'enough', 'tough', 'rough', 'cough', 'though', 'dough', 'famous', 'nervous', 'enormous', 'dangerous']);
// 'ear' that says /ur/ (learn, earth). Others say /ear/ (hear) or /air/ (bear).
const EAR_UR = new Set(['learn', 'learns', 'learned', 'learnt', 'learning', 'early', 'earlier', 'earth', 'earn', 'earns', 'heard', 'search', 'searches', 'searched', 'pearl', 'pearls', 'yearn', 'rehearse']);
const EAR_AIR = new Set(['bear', 'bears', 'pear', 'pears', 'wear', 'wears', 'tear', 'swear']);
// 'or' that says /ur/ after w (work, word).
const OR_UR = new Set(['work', 'works', 'worked', 'word', 'words', 'world', 'worlds', 'worm', 'worms', 'worse', 'worst', 'worth']);

function splitDigraph(w) {
  // Finds a split digraph at the end of the word (allowing a trailing s or d). Returns { vowel, mid, suffix } or null.
  for (const suffix of ['', 's', 'd']) {
    const core = suffix ? (w.endsWith(suffix) ? w.slice(0, -1) : null) : w;
    if (!core || core.length < 3) continue;
    const m = core.match(/(^|[^aeiou])([aeiou])(th|st|[bcdfgjklmnpstvz])e$/);
    if (m) return { vowel: m[2], mid: m[3], suffix, start: core.length - (m[2].length + m[3].length + 1) };
  }
  return null;
}

function soundOf(g, w, atEnd) {
  const lower = w.toLowerCase();
  if (g === 'y') {
    if (!atEnd) return null;
    const stem = lower.slice(0, -1);
    return /[aeiou]/.test(stem) ? 'ee' : 'igh';
  }
  if (g === 'ie') {
    const i = lower.lastIndexOf('ie');
    const rest = lower.slice(i + 2);
    const stem = lower.slice(0, i);
    if (rest === '' || rest === 's' || rest === 'd') return /[aeiou]/.test(stem) ? 'ee' : 'igh';
    return 'ee';
  }
  if (g === 'ea') return EA_SHORT.has(lower) ? 'e' : EA_AI.has(lower) ? 'ai' : 'ee';
  if (g === 'ow') return OW_COW.has(lower) ? 'ow' : 'oa';
  if (g === 'ey') return EY_AI.has(lower) ? 'ai' : 'ee';
  if (g === 'ou') return OU_NOT_OW.has(lower) ? 'other' : 'ow';
  if (g === 'ear') return EAR_UR.has(lower) ? 'ur' : EAR_AIR.has(lower) ? 'air' : 'ear';
  if (g === 'or') return OR_UR.has(lower) ? 'ur' : 'or';
  if (g === 'ir' || g === 'ur') return 'ur';
  if (g === 'aw' || g === 'ore' || g === 'au' || g === 'aur' || g === 'oar' || g === 'oor') return 'or';
  if (g === 'ue' || g === 'ew' || g === 'u_e') return 'oo';
  if (g === 'ai' || g === 'ay' || g === 'a_e' || g === 'eigh' || g === 'aigh') return 'ai';
  if (g === 'ee' || g === 'e_e') return 'ee';
  if (g === 'igh' || g === 'i_e') return 'igh';
  if (g === 'oa' || g === 'o_e' || g === 'oe') return 'oa';
  return null;
}

function fromOverride(spec, w) {
  const segs = [];
  for (const part of spec.split('|')) {
    if (/^[aeiou]_e$/.test(part)) {
      segs.push({ g: part, text: '', split: true, v: part[0], mid: '', pending: true });
    } else segs.push({ g: part, text: part });
  }
  // Fill split digraph text from the word: the vowel, the next segment's letters, then e.
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    if (!s.pending) continue;
    const mid = segs[i + 1];
    s.mid = mid ? mid.text : '';
    s.text = s.v + s.mid + 'e';
    delete s.pending;
    if (mid) segs.splice(i + 1, 1);
  }
  return segs;
}

export function splitWord(word, overrides = {}) {
  const w = String(word).toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return [];
  const spec = overrides[w] || OVERRIDES[w];
  if (spec) return fromOverride(spec, w).map(s => ({ ...s, sound: s.sound || soundOf(s.g, w, true) }));

  const sd = splitDigraph(w);
  let end = w.length;
  let tail = [];
  if (sd) {
    end = sd.start;
    tail = [{ g: sd.vowel + '_e', text: sd.vowel + sd.mid + 'e', split: true, v: sd.vowel, mid: sd.mid }];
    if (sd.suffix) tail.push({ g: sd.suffix, text: sd.suffix });
  }
  const segs = [];
  let i = 0;
  while (i < end) {
    let hit = null;
    const rest = w.slice(i);
    const tryList = (list, n) => { for (const g of list) if (rest.startsWith(g) && i + g.length <= end) return g; return null; };
    hit = tryList(FOUR) || tryList(THREE);
    if (!hit && i === 0) hit = tryList(START_ONLY);
    if (!hit && i > 0) {
      for (const g of END_ONLY) {
        if (rest.startsWith(g) && i + g.length <= end && END_REST.test(w.slice(i + g.length))) { hit = g; break; }
      }
    }
    if (!hit) hit = tryList(TWO);
    if (!hit) hit = w[i];
    segs.push({ g: hit, text: hit });
    i += hit.length;
  }
  const all = segs.concat(tail);
  return all.map((s, k) => ({ ...s, sound: soundOf(s.g, w, k === all.length - 1 || (k === all.length - 2 && /^(s|d)$/.test(all[all.length - 1].g))) }));
}

// Which of a story's spellings does this segment match? spellings use 'a-e' for split digraphs.
export function isFocus(seg, sound, spellings) {
  const key = seg.g.replace('_', '-');
  if (!spellings.includes(key)) return false;
  if (seg.sound && sound && seg.sound !== sound) return false;
  return true;
}

// Inline HTML for a word with its focus graphemes underlined. Returns the markup for the inside of a .w span.
export function markWord(word, sound, spellings, overrides, tricky) {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!clean || (tricky && tricky.has(clean))) return escapeHtml(word);
  const segs = splitWord(clean, overrides);
  // Map segments back onto the original word (it may have capitals or an apostrophe).
  let out = '';
  let pos = 0;
  const letters = word.split('');
  const takeLetters = n => {
    let s = '';
    while (n > 0 && pos < letters.length) { const ch = letters[pos++]; s += ch; if (/[a-z]/i.test(ch)) n--; }
    return s;
  };
  // leading non-letters
  while (pos < letters.length && !/[a-z]/i.test(letters[pos])) out += escapeHtml(letters[pos++]);
  for (const seg of segs) {
    const focus = isFocus(seg, sound, spellings);
    if (seg.split) {
      const v = takeLetters(1), mid = takeLetters(seg.mid.length), e = takeLetters(1);
      out += focus ? `<u class="f">${escapeHtml(v)}</u><u class="f dot">${escapeHtml(mid)}</u><u class="f">${escapeHtml(e)}</u>` : escapeHtml(v + mid + e);
    } else {
      const t = takeLetters(seg.text.length);
      out += focus ? `<u class="f">${escapeHtml(t)}</u>` : escapeHtml(t);
    }
  }
  while (pos < letters.length) out += escapeHtml(letters[pos++]);
  return out;
}

// Markup for the sound-buttons popover.
export function soundButtons(word, sound, spellings, overrides) {
  const segs = splitWord(word, overrides);
  return segs.map(seg => {
    const focus = isFocus(seg, sound, spellings) ? ' focus' : '';
    if (seg.split) {
      return `<span class="split${focus}"><span class="seg"><span class="g">${seg.v}</span><span class="b"></span></span>` +
        `<span class="seg mid"><span class="g">${seg.mid}</span><span class="b"></span></span>` +
        `<span class="seg"><span class="g">e</span><span class="b"></span></span></span>`;
    }
    return `<span class="seg${focus}"><span class="g">${escapeHtml(seg.text)}</span><span class="b"></span></span>`;
  }).join('');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Tokenise a line into words and the spaces/punctuation around them.
export function tokens(line) {
  const out = [];
  const re = /([A-Za-z][A-Za-z'’-]*[A-Za-z]|[A-Za-z])|([^A-Za-z]+)/g;
  let m;
  while ((m = re.exec(line))) {
    if (m[1]) out.push({ word: m[1] });
    else out.push({ sep: m[2] });
  }
  return out;
}
