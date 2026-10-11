// The story runner: cover, sound card, tricky words, pages with choices, case cracked, case file,
// then hands over to quiz.js for the questions, debrief and patch.
import { h, esc } from './core/dom.js';
import { icon } from './core/icons.js';
import { store } from './core/store.js';
import { speak, speakWord, stopSpeaking, sentences } from './core/speak.js';
import { markWord, soundButtons, tokens } from './core/phonics.js';
import { speakButton, hush, confetti } from './core/ui.js';
import { runQuiz } from './quiz.js';
import { sceneSVG } from './core/scenes.js';

export const imgSrc = (book, name) => `assets/img/books/${book.id}/${name}`;

// A themed vector backdrop with the picture on top; if the picture is missing the backdrop stays.
export function imgTag(book, name, alt = '') {
  const scene = sceneSVG(book.theme);
  if (!name) return scene;
  return `${scene}<img src="${imgSrc(book, name)}" alt="${esc(alt)}" onerror="this.remove()">`;
}

// Follow the first option at every choice to estimate how many pages a read-through has.
function mainPath(book) {
  const ids = [];
  let id = book.start;
  const seen = new Set();
  while (id && book.pages[id] && !seen.has(id)) {
    seen.add(id); ids.push(id);
    const p = book.pages[id];
    id = p.choice ? p.choice.options[0].next : p.next;
  }
  return ids;
}

export function startBook(book, mount, { step = 'cover', page = null } = {}) {
  const tricky = new Set((book.tricky || []).map(w => w.toLowerCase()));
  const overrides = book.words || {};
  const sound = book.sound;
  const spellings = sound.spellings;
  const state = { visited: [], choices: {}, choiceText: {} };
  const trunk = mainPath(book);
  const themeCls = `theme-${book.theme}`;

  const readAloud = () => store.state.readQuestions;
  const wordHtml = w => `<span class="w" data-w="${esc(w)}">${markWord(w, sound.phoneme, spellings, overrides, tricky)}</span>`;
  const lineHtml = line => tokens(line).map(t => t.word ? wordHtml(t.word) : esc(t.sep)).join('');
  const linesHtml = lines => lines.map(l => `<span class="line">${lineHtml(l)}</span>`).join('');
  const plain = lines => sentences(...lines);

  function exitButton() {
    const b = h(`<button class="fbtn" type="button" aria-label="Back to the shelf">${icon('home')}</button>`);
    b.addEventListener('click', () => { hush(); location.hash = '#/'; });
    return b;
  }

  function soundBadge() {
    const b = h(`<button class="sound-badge" type="button" title="Spot the sound: tap to switch the underlines on or off"><span class="ph">${esc(sound.label)}</span><span class="sp">${spellings.map(s => `<b>${esc(s)}</b>`).join(' ')}</span></button>`);
    b.addEventListener('click', () => {
      store.set({ highlight: !store.state.highlight });
      document.querySelectorAll('.page').forEach(p => p.classList.toggle('hl-off', !store.state.highlight));
    });
    return b;
  }

  // Tap a word: say it and show its sound buttons.
  let popover = null;
  function hidePop() { if (popover) { popover.remove(); popover = null; } }
  function wireWords(root, band) {
    root.querySelectorAll('.w').forEach(w => {
      w.addEventListener('click', e => {
        e.stopPropagation();
        const word = w.dataset.w;
        hidePop();
        root.querySelectorAll('.w.hit').forEach(x => x.classList.remove('hit'));
        w.classList.add('hit');
        speakWord(word.replace(/[’']s$/, "'s"));
        const clean = word.toLowerCase().replace(/[^a-z]/g, '');
        if (!clean) return;
        popover = h(`<div class="sb">${soundButtons(clean, sound.phoneme, spellings, overrides)}</div>`);
        band.appendChild(popover);
        const wr = w.getBoundingClientRect(), br = band.getBoundingClientRect();
        const cx = wr.left + wr.width / 2 - br.left;
        popover.style.left = Math.max(120, Math.min(br.width - 120, cx)) + 'px';
        popover.style.bottom = (br.bottom - wr.top + 10) + 'px';
        const pw = popover.getBoundingClientRect().width;
        popover.style.left = Math.max(pw / 2 + 8, Math.min(br.width - pw / 2 - 8, cx)) + 'px';
        setTimeout(() => { if (popover) { hidePop(); w.classList.remove('hit'); } }, 3200);
      });
    });
    root.addEventListener('click', () => { hidePop(); root.querySelectorAll('.w.hit').forEach(x => x.classList.remove('hit')); });
  }

  /* ---------------- Intro cards ---------------- */
  function showCover() {
    const v = h(`<section class="view intro ${themeCls}"><div class="card">
      <div class="cover">${imgTag(book, book.cover, book.title)}</div>
      <div class="body">
        <div class="eyebrow">${esc(book.series)} · Chapter ${book.chapter}</div>
        <h1>${esc(book.title)}</h1>
        <p class="blurb">${esc(book.blurb)}</p>
        <div class="row gap-s wrap"><span class="chip theme">${icon('ear')} Sound of the story: <b>${esc(sound.label)}</b></span><span class="chip">${trunk.length} pages</span></div>
        <div class="actions"><button class="btn primary big" type="button" data-go>${icon('book')} Open the case</button><button class="btn ghost" type="button" data-home>Back</button></div>
      </div></div></section>`);
    v.querySelector('[data-go]').addEventListener('click', showSound);
    v.querySelector('[data-home]').addEventListener('click', () => { location.hash = '#/'; });
    mount(v);
    if (readAloud()) speak(sentences(book.title, book.blurb));
  }

  function showSound() {
    hush();
    const ex = sound.examples || {};
    const v = h(`<section class="view intro ${themeCls}"><div class="card">
      <div class="body">
        <div class="eyebrow">Sound of the story</div>
        <div class="row gap-l wrap"><div class="phoneme">${esc(sound.label)}</div>
          <p class="blurb">${esc(sound.intro || `Listen for the ${sound.label} sound. In this story it is spelt ${spellings.length} ways. Tap a word to hear it.`)}</p></div>
        <div class="spellings">${spellings.map(s => `<button class="spell" type="button" data-w="${esc(ex[s] || '')}"><span class="g">${esc(s)}</span><span class="w">${markWord(ex[s] || '', sound.phoneme, spellings, overrides)}</span></button>`).join('')}</div>
        <p class="muted">Spot the sound: words with ${esc(sound.label)} have a coloured line under the spelling.</p>
        <div class="actions"><button class="btn primary big" type="button" data-go>Next ${icon('next')}</button></div>
      </div></div></section>`);
    v.querySelectorAll('.spell').forEach(b => b.addEventListener('click', () => speakWord(b.dataset.w)));
    v.querySelector('[data-go]').addEventListener('click', showTricky);
    mount(v);
    if (readAloud()) speak(sentences(`The sound of the story is ${sound.say || sound.label}`, 'Tap a word to hear it.'));
  }

  function showTricky() {
    hush();
    const list = book.tricky || [];
    if (!list.length) return showPage(book.start);
    const v = h(`<section class="view intro ${themeCls}"><div class="card">
      <div class="body">
        <div class="eyebrow">Tricky words to spot</div>
        <h2>These words do not play by the rules.</h2>
        <p class="blurb">Tap one to hear it. Then start the story!</p>
        <div class="tricky-list">${list.map(w => `<button class="tricky" type="button" data-w="${esc(w)}">${esc(w)}</button>`).join('')}</div>
        <div class="actions"><button class="btn primary big" type="button" data-go>${icon('book')} Start the story</button></div>
      </div></div></section>`);
    v.querySelectorAll('.tricky').forEach(b => b.addEventListener('click', () => speakWord(b.dataset.w)));
    v.querySelector('[data-go]').addEventListener('click', () => showPage(book.start));
    mount(v);
    if (readAloud()) speak('Tricky words to spot. Tap one to hear it.');
  }

  /* ---------------- Pages ---------------- */
  function dotsHtml() {
    const i = Math.min(state.visited.length - 1, trunk.length - 1);
    return `<div class="dots">${trunk.map((_, k) => `<i class="${k < i ? 'past' : k === i ? 'on' : ''}"></i>`).join('')}</div>`;
  }

  function showPage(id) {
    hush(); hidePop();
    const page = book.pages[id];
    if (!page) { console.warn('No page', id); return showCracked(); }
    if (state.visited[state.visited.length - 1] !== id) state.visited.push(id);
    const v = h(`<section class="view page ${themeCls}${store.state.highlight ? '' : ' hl-off'}">
      <div class="pic">${imgTag(book, page.img, page.alt || '')}
        <div class="float tl"></div><div class="float tc">${dotsHtml()}</div><div class="float tr"></div>
      </div>
      <div class="band${page.choice ? ' choice' : ''}"></div></section>`);
    v.querySelector('.float.tl').appendChild(exitButton());
    v.querySelector('.float.tr').appendChild(soundBadge());
    const band = v.querySelector('.band');
    if (page.choice) buildChoice(page, band, v); else buildText(page, band, v);
    mount(v);
    wireWords(v.querySelector('.band'), band);
  }

  function buildText(page, band, v) {
    band.innerHTML = `<div class="text">${linesHtml(page.text)}</div><div class="controls"></div>`;
    const controls = band.querySelector('.controls');
    controls.appendChild(speakButton(() => plain(page.text)));
    const next = h(`<button class="nbtn" type="button" aria-label="Next page">${icon('arrow')}</button>`);
    next.addEventListener('click', () => advance(page));
    controls.appendChild(next);
  }

  function advance(page) {
    const go = () => (page.next ? showPage(page.next) : showCracked());
    if (page.reveal && book.pages[page.reveal] && book.pages[page.reveal].choice?.reveal) showReveal(book.pages[page.reveal].choice.reveal, go);
    else go();
  }

  function buildChoice(page, band, v) {
    const c = page.choice;
    const big = c.kind === 'big';
    band.innerHTML = `<div class="prompt">${big ? `<span class="bigq">${icon('star')} Big question</span>` : ''}<div class="text">${linesHtml(page.text)}</div></div>
      <div class="options">${c.options.map((o, i) => `<button class="opt" type="button" data-i="${i}"><span class="ic">${icon(o.icon || 'right')}</span><span class="lab">${esc(o.label)}</span><span class="go">${icon('arrow')}</span></button>`).join('')}</div>
      ${big ? `<p class="muted small">Talk about it together. There is no wrong answer. Then the Commander taps to choose.</p>` : ''}`;
    band.querySelector('.prompt').appendChild(speakButton(() => sentences(plain(page.text), ...c.options.map(o => o.label))));
    band.querySelectorAll('.opt').forEach(b => {
      b.addEventListener('click', e => {
        e.stopPropagation();
        const i = +b.dataset.i;
        const o = c.options[i];
        if (!b.classList.contains('sel')) {
          band.querySelectorAll('.opt.sel').forEach(x => x.classList.remove('sel'));
          b.classList.add('sel');
          speak(o.label);
          return;
        }
        state.choices[page.id || c.id || 'c'] = i;
        state.choiceText[page.id] = o.label;
        store.addLog(book.id, `${big ? 'Big question' : 'Which way'}: ${plain(page.text)} Finn chose: ${o.label}.`);
        showPage(o.next);
      });
    });
    if (readAloud()) speak(sentences(plain(page.text), ...c.options.map(o => o.label)));
  }

  function showReveal(reveal, next) {
    hush();
    const view = document.querySelector('#app .view');
    const ov = h(`<div class="overlay"><div class="card ${themeCls}">
      <div class="eyebrow">What real explorers say</div>
      <div class="text">${esc(reveal.text)}</div>
      ${reveal.source ? `<div class="src">Source: <a href="${esc(reveal.source)}" target="_blank" rel="noopener">${esc(shortUrl(reveal.source))}</a></div>` : ''}
      <div class="row gap" style="justify-content:flex-end"></div></div></div>`);
    const row = ov.querySelector('.row');
    row.appendChild(speakButton(reveal.text));
    const go = h(`<button class="btn primary big" type="button">Carry on ${icon('next')}</button>`);
    go.addEventListener('click', () => { ov.remove(); next(); });
    row.appendChild(go);
    view.appendChild(ov);
    if (readAloud()) speak(reveal.text);
  }

  /* ---------------- Case cracked and Case File ---------------- */
  function showCracked() {
    hush();
    const first = store.openCase(book.id);
    const v = h(`<section class="view stage ${themeCls}"><div class="card cracked">
      <div class="stamp">${icon('check')}</div>
      <h1>Case cracked!</h1>
      <p class="blurb" style="font-size:24px;max-width:760px">${esc(book.cracked || '')}</p>
      <div class="row gap"><button class="btn primary big" type="button" data-go>${icon('folder')} Open the Case File</button></div>
    </div></section>`);
    v.querySelector('[data-go]').addEventListener('click', showCaseFile);
    mount(v);
    confetti(v);
    if (readAloud()) speak(sentences('Case cracked!', book.cracked));
    if (first) store.addLog(book.id, `Case cracked: ${book.title}. The ${book.casefile.title} Case File is open.`);
  }

  function showCaseFile() {
    hush();
    const cf = book.casefile;
    const v = h(`<section class="view stage ${themeCls}"><div class="card">
      <div class="side"><div class="img">${imgTag(book, cf.img, cf.title)}</div>
        <div class="rating">${(cf.chips || []).map(c => `<span class="chip theme">${esc(c)}</span>`).join('')}</div></div>
      <div class="main">
        <div class="eyebrow">${icon('folder')} Case File</div>
        <h2>${esc(cf.title)}</h2>
        ${cf.subtitle ? `<p class="muted">${esc(cf.subtitle)}</p>` : ''}
        <div class="facts">${cf.facts.map((f, i) => `<div class="fact"><span class="n">${i + 1}</span><span class="t">${esc(f.text)}</span><span class="s" data-i="${i}"></span></div>`).join('')}</div>
        <p class="small faint">Sources: ${cf.facts.map((f, i) => f.source ? `<a href="${esc(f.source)}" target="_blank" rel="noopener">${i + 1}</a>` : '').join(' ')}</p>
        <div class="row gap" style="justify-content:flex-end"><button class="btn primary big" type="button" data-go>${icon('question')} Questions</button></div>
      </div></div></section>`);
    cf.facts.forEach((f, i) => v.querySelector(`.s[data-i="${i}"]`).appendChild(speakButton(f.text, { cls: 'rbtn', label: 'Read this fact' })));
    v.querySelector('[data-go]').addEventListener('click', () => runQuiz(book, mount, state, { imgTag, themeCls }));
    mount(v);
    if (readAloud()) speak(sentences(`Case File: ${cf.title}`));
  }

  // Dev entry points
  if (step === 'page' && page && book.pages[page]) showPage(page);
  else if (step === 'cracked') showCracked();
  else if (step === 'casefile') showCaseFile();
  else if (step === 'quiz' || step === 'debrief' || step === 'patch') runQuiz(book, mount, state, { imgTag, themeCls, step });
  else if (step === 'sound') showSound();
  else showCover();
}

function shortUrl(u) {
  try { const x = new URL(u); return x.hostname.replace(/^www\./, '') + (x.pathname.length > 1 ? x.pathname.slice(0, 28) + (x.pathname.length > 28 ? '…' : '') : ''); } catch (e) { return u; }
}
