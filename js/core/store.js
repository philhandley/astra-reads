// Persistent state in localStorage. Everything degrades gracefully if storage is blocked.
const KEY = 'astrareads.v1';
const DEFAULTS = () => ({
  done: {},            // bookId -> { at, plays, choices: { c1: 'a' } }
  casefiles: [],       // bookIds whose Case File is open
  patches: [],         // bookIds whose patch is earned
  log: [],             // crew log [{ t, book, text }]
  highlight: true,     // Spot the sound underlines
  readQuestions: true, // read questions and choices aloud automatically
  hello: false,        // the welcome card has been seen
});

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS(), ...JSON.parse(raw) };
  } catch (e) { /* ignore */ }
  return DEFAULTS();
}

let state = read();
function write() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.warn('Could not save', e); }
}

export const store = {
  get state() { return state; },
  set(patch) { Object.assign(state, patch); write(); },
  addLog(book, text) {
    state.log.unshift({ t: Date.now(), book: book || '', text: String(text) });
    if (state.log.length > 500) state.log.length = 500;
    write();
  },
  openCase(id) { if (!state.casefiles.includes(id)) { state.casefiles.push(id); write(); return true; } return false; },
  hasCase(id) { return state.casefiles.includes(id); },
  // Returns true the first time a book is finished.
  finishBook(id, choices) {
    const d = state.done[id];
    const first = !d;
    if (!d) state.done[id] = { at: Date.now(), plays: 1, choices: choices || {} };
    else { d.plays = (d.plays || 1) + 1; d.at = Date.now(); d.choices = choices || d.choices; }
    if (!state.patches.includes(id)) state.patches.push(id);
    write();
    return first;
  },
  isDone(id) { return !!state.done[id]; },
  reset() { state = DEFAULTS(); write(); },
};
