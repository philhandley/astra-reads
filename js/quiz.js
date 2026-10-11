// Four comprehension questions (Blank's levels 1 to 4), the debrief and the patch.
import { h, esc } from './core/dom.js';
import { icon } from './core/icons.js';
import { store } from './core/store.js';
import { speak, sentences } from './core/speak.js';
import { speakButton, hush, confetti } from './core/ui.js';
import { patchSVG } from './core/patch.js';

const LEVELS = { 1: 'Find it', 2: 'Tell me', 3: 'Explain it', 4: 'Think about it' };
const YES = ['Yes!', 'That is it!', 'Spot on!', 'You found it!'];
const NO = ['Not that one. Have another look.', 'Hmm, not quite. Try again.', 'Good try! Look back and see.'];

export function runQuiz(book, mount, state, { imgTag, themeCls, step = 'quiz' } = {}) {
  const readAloud = () => store.state.readQuestions;
  const qs = book.quiz || [];
  let n = 0;
  const tries = {};

  function pageImg(id) {
    const p = book.pages[id];
    return p ? imgTag(book, p.img, '') : '';
  }

  function showQuestion() {
    hush();
    if (n >= qs.length) return showDebrief();
    const q = qs[n];
    const pics = q.options.some(o => o.img);
    const letters = ['A', 'B', 'C', 'D'];
    const v = h(`<section class="view stage ${themeCls}"><div class="card" style="flex-direction:column">
      <div class="qhead"><span class="chip theme">Question ${n + 1} of ${qs.length}</span><span class="chip">${esc(LEVELS[q.level] || '')}</span><span class="grow"></span></div>
      <div class="row gap"><div class="qtext grow">${esc(q.q)}</div></div>
      <div class="answers${pics ? ' pics' : ''}">${q.options.map((o, i) => `<button class="ans" type="button" data-i="${i}">${o.img ? `<span class="pic">${pageImg(o.img)}</span><span class="cap">${esc(o.text)}</span>` : `<span class="muted" style="font-family:var(--font);font-size:18px;font-weight:700">${letters[i]}</span><span>${esc(o.text)}</span>`}</button>`).join('')}</div>
      <div class="row gap"><div class="feedback grow"></div><div class="row gap-s" data-actions></div></div>
    </div></section>`);
    const sayAll = () => sentences(q.q, ...q.options.map((o, i) => (pics ? o.text : `${letters[i]}. ${o.text}`)));
    v.querySelector('.qhead').appendChild(speakButton(sayAll, { cls: 'rbtn', label: 'Read the question' }));
    const fb = v.querySelector('.feedback');
    const actions = v.querySelector('[data-actions]');
    const lookBtn = h(`<button class="btn ghost" type="button">${icon('eye')} Look back</button>`);
    lookBtn.addEventListener('click', () => showLook(v, q.hint));
    const nextBtn = h(`<button class="btn primary big" type="button">${n + 1 < qs.length ? 'Next question' : 'Finish'} ${icon('next')}</button>`);
    nextBtn.addEventListener('click', () => { n++; showQuestion(); });
    if (q.hint && book.pages[q.hint]) actions.appendChild(lookBtn);
    v.querySelectorAll('.ans').forEach(b => b.addEventListener('click', () => {
      if (b.classList.contains('no') || v.querySelector('.ans.yes')) return;
      const i = +b.dataset.i;
      tries[n] = (tries[n] || 0) + 1;
      if (i === q.answer) {
        b.classList.add('yes');
        v.querySelectorAll('.ans').forEach(x => { if (x !== b) x.disabled = true; });
        const msg = `${YES[n % YES.length]} ${q.why || ''}`.trim();
        fb.innerHTML = `<span class="ok">${icon('check')}</span><span>${esc(msg)}</span>`;
        lookBtn.remove();
        actions.appendChild(nextBtn);
        speak(msg);
      } else {
        b.classList.add('no');
        const msg = NO[(tries[n] - 1) % NO.length];
        fb.innerHTML = `<span>${esc(msg)}</span>`;
        speak(msg);
      }
    }));
    mount(v);
    if (readAloud()) speak(sayAll());
  }

  function showLook(view, pageId) {
    hush();
    const p = book.pages[pageId];
    const ov = h(`<div class="overlay"><div class="card ${themeCls}">
      <div class="eyebrow">Look back</div>
      <div class="look">${imgTag(book, p.img, '')}</div>
      <div class="text" style="font-size:26px">${esc((p.text || []).join(' '))}</div>
      <div class="row" style="justify-content:flex-end"><button class="btn primary" type="button">Back to the question</button></div></div></div>`);
    ov.querySelector('button').addEventListener('click', () => ov.remove());
    view.appendChild(ov);
  }

  function showDebrief() {
    hush();
    const d = book.debrief || {};
    const q1 = 'What was your favourite part?';
    const v = h(`<section class="view stage ${themeCls}"><div class="card">
      <div class="side"><div class="img">${imgTag(book, book.cover, book.title)}</div></div>
      <div class="main">
        <div class="eyebrow">Debrief</div>
        <h2>Case closed. Dad asks...</h2>
        <div class="fact"><span class="n">1</span><span class="t">${esc(q1)}</span><span class="s" data-i="0"></span></div>
        <div class="fact"><span class="n">2</span><span class="t">${esc(d.question || '')}</span><span class="s" data-i="1"></span></div>
        <p class="muted">There are no wrong answers in a debrief.</p>
        <div class="row gap" style="justify-content:flex-end"><button class="btn primary big" type="button" data-go>${icon('badge')} Get the patch</button></div>
      </div></div></section>`);
    v.querySelector('.s[data-i="0"]').appendChild(speakButton(q1));
    v.querySelector('.s[data-i="1"]').appendChild(speakButton(d.question || ''));
    v.querySelector('[data-go]').addEventListener('click', showPatch);
    mount(v);
    if (readAloud()) speak(sentences('Debrief.', q1, d.question));
  }

  function showPatch() {
    hush();
    const first = store.finishBook(book.id, state.choices);
    const name = (book.patch && book.patch.name) || book.title;
    store.addLog(book.id, first ? `Patch earned: ${name}.` : `Read ${book.title} again.`);
    const v = h(`<section class="view stage ${themeCls}"><div class="card cracked">
      <div class="patch-wrap">${patchSVG(book)}<h2>${esc(name)} patch</h2></div>
      <p class="blurb" style="font-size:22px">${first ? 'Added to your patches and the Crew Log.' : 'You have this patch already. Nice to read it again!'}</p>
      <div class="row gap"><button class="btn ghost big" type="button" data-again>${icon('replay')} Read it again</button><button class="btn primary big" type="button" data-home>${icon('home')} Back to the shelf</button></div>
    </div></section>`);
    v.querySelector('[data-home]').addEventListener('click', () => { location.hash = '#/'; });
    v.querySelector('[data-again]').addEventListener('click', () => { location.hash = `#/book/${book.id}?again=${Date.now()}`; });
    mount(v);
    confetti(v);
    if (readAloud()) speak(sentences(`You earned the ${name} patch!`));
  }

  if (step === 'debrief') showDebrief();
  else if (step === 'patch') showPatch();
  else showQuestion();
}
