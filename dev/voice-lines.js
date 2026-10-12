// Every line and word the app can read aloud, built exactly the way js/story.js and js/quiz.js
// build what they pass to speak() and speakWord(). If you add or change a speak() call there,
// change it here too, then re-run dev/voice-build.html and tools/voice_pack.py.
import { sentences, splitSentences, sentenceId, wordKey } from '../js/core/speak.js';
import { tokens } from '../js/core/phonics.js';
import { YES, NO, FAVOURITE } from '../js/quiz.js';

const LETTERS = ['A', 'B', 'C', 'D'];

// The strings handed to speak() for one book.
export function bookTexts(book) {
  const out = [];
  const plain = lines => sentences((lines || []).join(' '));
  const sound = book.sound || {};
  out.push(sentences(book.title, book.blurb));
  out.push(sentences(`The sound of the story is ${sound.say || sound.label}`, 'Tap a word to hear it.'));
  out.push('Tricky words to spot. Tap one to hear it.');
  for (const page of Object.values(book.pages || {})) {
    out.push(plain(page.text));
    const c = page.choice;
    if (c) {
      out.push(sentences(plain(page.text), ...c.options.map(o => o.label)));
      c.options.forEach(o => out.push(o.label));
      if (c.reveal && c.reveal.text) out.push(c.reveal.text);
    }
  }
  out.push(sentences('Case cracked!', book.cracked));
  const cf = book.casefile || { facts: [] };
  cf.facts.forEach(f => out.push(f.text));
  out.push(sentences(`Case File: ${cf.title}`));
  (book.quiz || []).forEach((q, n) => {
    const pics = q.options.some(o => o.img);
    out.push(sentences(q.q, ...q.options.map((o, i) => (pics ? o.text : `${LETTERS[i]}. ${o.text}`))));
    out.push(`${YES[n % YES.length]} ${q.why || ''}`.trim());
  });
  NO.forEach(m => out.push(m));
  const d = book.debrief || {};
  out.push(FAVOURITE, d.question || '', sentences('Debrief.', FAVOURITE, d.question));
  const name = (book.patch && book.patch.name) || book.title;
  out.push(sentences(`You earned the ${name} patch!`));
  return out.filter(Boolean);
}

// The words handed to speakWord() for one book: page words, sound-card examples and tricky words.
export function bookWords(book) {
  const out = [];
  for (const page of Object.values(book.pages || {})) {
    for (const line of page.text || []) {
      for (const t of tokens(line)) if (t.word) out.push(t.word.replace(/[’']s$/, "'s"));
    }
  }
  Object.values((book.sound && book.sound.examples) || {}).forEach(w => w && out.push(w));
  (book.tricky || []).forEach(w => out.push(w));
  return out;
}

// All books -> { sentences: [{ id, text, books }], words: [{ id, key, text, books }], collisions }
export async function allLines(base = '../') {
  const shelf = await (await fetch(base + 'content/books.json')).json();
  const ids = shelf.themes.flatMap(t => t.books);
  const books = await Promise.all(ids.map(id => fetch(`${base}content/books/${id}.json`).then(r => r.json())));
  const sents = new Map();
  const words = new Map();
  const collisions = [];
  books.forEach(book => {
    for (const text of bookTexts(book)) {
      for (const s of splitSentences(text)) {
        const id = sentenceId(s);
        const have = sents.get(id);
        if (have && have.text !== s) collisions.push([have.text, s]);
        if (!have) sents.set(id, { id, text: s, books: [book.id] });
        else if (!have.books.includes(book.id)) have.books.push(book.id);
      }
    }
    for (const w of bookWords(book)) {
      const key = wordKey(w);
      const have = words.get(key);
      if (!have) words.set(key, { id: sentenceId('w:' + key), key, text: w, books: [book.id] });
      else if (!have.books.includes(book.id)) have.books.push(book.id);
    }
  });
  return { sentences: [...sents.values()], words: [...words.values()], collisions, books: ids };
}
