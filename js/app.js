// Astra Reads: boot, router, the shelf (home), Case Files, Patches and the Crew Log, settings.
import { h, esc } from './core/dom.js';
import { icon } from './core/icons.js';
import { store } from './core/store.js';
import { speak } from './core/speak.js';
import { toast, modal, confirmBox, hush } from './core/ui.js';
import { patchSVG } from './core/patch.js';
import { startBook, imgTag } from './story.js';

const app = document.getElementById('app');
const DATA = { themes: [], books: {} };

/* ---------------- Data ---------------- */
async function loadAll() {
  const idx = await fetch('content/books.json').then(r => r.json());
  DATA.themes = idx.themes;
  const ids = DATA.themes.flatMap(t => t.books);
  await Promise.all(ids.map(id => fetch(`content/books/${id}.json`).then(r => (r.ok ? r.json() : null)).then(b => { if (b) DATA.books[id] = b; }).catch(e => console.warn('book failed', id, e))));
  for (const t of DATA.themes) for (const id of t.books) if (DATA.books[id]) { DATA.books[id].series = t.series; DATA.books[id].theme = DATA.books[id].theme || t.id; }
}

function mount(view) { hush(); app.replaceChildren(view); }

function logoSVG() {
  return `<svg class="mark" viewBox="0 0 48 48" aria-hidden="true"><rect x="3" y="3" width="42" height="42" rx="12" fill="#fff6e6" stroke="#1d1c22" stroke-width="3"/><path d="M12 32V15c4 0 8 1 12 4 4-3 8-4 12-4v17c-4 0-8 1-12 4-4-3-8-4-12-4z" fill="#fff" stroke="#1d1c22" stroke-width="2.5" stroke-linejoin="round"/><path d="M24 19v17" stroke="#ff6a2b" stroke-width="2.5"/><path d="M24 7l1.6 3.4 3.6.5-2.6 2.5.6 3.6L24 15.3 20.8 17l.6-3.6-2.6-2.5 3.6-.5z" fill="#14b8a6"/></svg>`;
}

function topbar({ title = '', back = true } = {}) {
  const bar = h(`<header class="topbar">${back ? `<a class="btn round" href="#/" aria-label="Back to the shelf">${icon('back')}</a>` : `<div class="logo">${logoSVG()}<div class="word">Astra <span>Reads</span></div></div>`}<div class="title">${esc(title)}</div><div class="spacer"></div></header>`);
  return bar;
}

/* ---------------- Home: the shelf ---------------- */
const shelfPick = {}; // theme id -> book id chosen with the chapter buttons (this visit only)

function renderHome() {
  const v = h(`<section class="view"><div class="scroll" style="flex:1"><div class="home"></div></div></section>`);
  const bar = topbar({ back: false });
  const cases = h(`<a class="btn" href="#/cases">${icon('folder')} Case Files</a>`);
  const patches = h(`<a class="btn" href="#/patches">${icon('badge')} Patches</a>`);
  const gear = h(`<button class="btn round ghost" type="button" aria-label="Settings">${icon('gear')}</button>`);
  gear.addEventListener('click', showSettings);
  bar.append(cases, patches, gear);
  v.prepend(bar);
  const home = v.querySelector('.home');
  for (const t of DATA.themes) {
    const ids = t.books.filter(id => DATA.books[id]);
    if (!ids.length) continue;
    // Show the chosen chapter, else the first one not yet read, else the newest.
    let pick = shelfPick[t.id] && ids.includes(shelfPick[t.id]) ? shelfPick[t.id] : (ids.find(id => !store.isDone(id)) || ids[ids.length - 1]);
    const card = h(`<article class="shelf theme-${t.id}" role="button" tabindex="0"></article>`);
    const draw = () => {
      const b = DATA.books[pick];
      const done = store.isDone(pick);
      const total = ids.length;
      card.innerHTML = `
      <div class="cover">${imgTag(b, b.cover, b.title)}${done ? `<span class="done">${icon('check')}</span>` : ''}</div>
      <div class="body">
        <div class="series">${icon(t.icon)} ${esc(t.series)} <span class="chapno">Chapter ${b.chapter}</span></div>
        <h2>${esc(b.title)}</h2>
        <p class="blurb">${esc(b.blurb)}</p>
        <div class="foot"><span class="sound-badge"><span class="ph">${esc(b.sound.label)}</span><span class="sp">${b.sound.spellings.map(s => `<b>${esc(s)}</b>`).join(' ')}</span></span>
          <span class="chapters" aria-label="Chapters">${Array.from({ length: total }, (_, i) => {
            const id = ids[i];
            if (!id) return `<i class="soon" title="Coming soon"></i>`;
            const cls = [id === pick ? 'sel' : '', store.isDone(id) ? 'done' : ''].join(' ');
            return `<button type="button" class="ch ${cls}" data-id="${esc(id)}" aria-label="Chapter ${i + 1}${store.isDone(id) ? ', read' : ''}">${store.isDone(id) && id !== pick ? icon('check') : i + 1}</button>`;
          }).join('')}</span></div>
      </div>`;
      card.querySelectorAll('.ch').forEach(btn => btn.addEventListener('click', e => {
        e.stopPropagation();
        pick = btn.dataset.id; shelfPick[t.id] = pick; draw();
      }));
    };
    draw();
    card.addEventListener('click', () => { location.hash = `#/book/${pick}`; });
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); location.hash = `#/book/${pick}`; } });
    home.appendChild(card);
  }
  mount(v);
  if (!store.state.hello) showHello();
}

function showHello() {
  const box = h(`<div class="col gap"><div class="eyebrow" style="color:var(--accent)">Welcome</div><h2>Hello, Finn and Zeb!</h2>
    <p style="font-size:21px">Four series of Explorer Cases are on the shelf. Tap a number to pick a chapter. Finn reads the pages. Everyone talks about the choices. The Commander taps.</p>
    <p class="muted">Tap any word to hear it and see its sound buttons. The speaker button reads a page out after you have had a go.</p>
    <div class="row" style="justify-content:flex-end"><button class="btn accent big" type="button">Let's go</button></div></div>`);
  const m = modal(box, { onClose: () => store.set({ hello: true }) });
  box.querySelector('button').addEventListener('click', () => { store.set({ hello: true }); m.close(); });
}

function showSettings() {
  const s = store.state;
  const box = h(`<div class="col"><h2 style="margin-bottom:10px">Settings</h2>
    <div class="setting"><div class="lab">Spot the sound<small>Underline the story sound in every word</small></div><button class="switch${s.highlight ? ' on' : ''}" type="button" data-k="highlight" aria-pressed="${s.highlight}"></button></div>
    <div class="setting"><div class="lab">Read questions aloud<small>Choices, questions and Case Files are read out. Story pages never are, until you press the speaker.</small></div><button class="switch${s.readQuestions ? ' on' : ''}" type="button" data-k="readQuestions" aria-pressed="${s.readQuestions}"></button></div>
    <div class="setting"><div class="lab">Start again<small>Clears patches, Case Files and the Crew Log</small></div><button class="btn small ghost" type="button" data-reset>Reset</button></div>
    <div class="row" style="justify-content:flex-end;margin-top:10px"><button class="btn accent" type="button" data-close>Done</button></div></div>`);
  const m = modal(box);
  box.querySelectorAll('.switch').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.k; store.set({ [k]: !store.state[k] }); b.classList.toggle('on', store.state[k]); b.setAttribute('aria-pressed', store.state[k]);
  }));
  box.querySelector('[data-reset]').addEventListener('click', async () => {
    m.close();
    if (await confirmBox('Clear all patches, Case Files and the Crew Log?', { yes: 'Yes, start again', no: 'Keep them' })) { store.reset(); store.set({ hello: true }); toast('All clear'); route(); }
  });
  box.querySelector('[data-close]').addEventListener('click', () => m.close());
}

/* ---------------- Case Files ---------------- */
function renderCases() {
  const v = h(`<section class="view"><div class="scroll" style="flex:1"><div class="grid"></div></div></section>`);
  v.prepend(topbar({ title: 'Case Files' }));
  const grid = v.querySelector('.grid');
  let any = false;
  for (const t of DATA.themes) for (const id of t.books) {
    const b = DATA.books[id]; if (!b) continue;
    const open = store.hasCase(id);
    any = any || open;
    const cf = b.casefile;
    const tile = h(`<div class="tile theme-${t.id}${open ? '' : ' locked'}">
      <div class="img">${open ? imgTag(b, cf.img, cf.title) : imgTag(b, b.cover, b.title)}</div>
      <div class="eyebrow">${esc(t.series)}</div>
      <h3>${open ? esc(cf.title) : 'Locked'}</h3>
      <p class="muted small">${open ? esc(cf.facts[0].text) : `Read ${esc(b.title)} to open this Case File.`}</p>
      ${open ? `<button class="btn small primary" type="button">${icon('folder')} Open</button>` : ''}
    </div>`);
    if (open) tile.querySelector('button').addEventListener('click', () => { location.hash = `#/book/${id}?step=casefile`; });
    grid.appendChild(tile);
  }
  if (!any) grid.insertAdjacentHTML('beforebegin', `<p class="empty">No Case Files yet. Crack a case to open one!</p>`);
  mount(v);
}

/* ---------------- Patches and the Crew Log ---------------- */
function renderPatches() {
  const v = h(`<section class="view"><div class="scroll" style="flex:1"><div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))"></div><h3 style="padding:0 24px 12px">Crew Log</h3><div class="log"></div></div></section>`);
  v.prepend(topbar({ title: 'Patches and the Crew Log' }));
  const grid = v.querySelector('.grid');
  for (const t of DATA.themes) for (const id of t.books) {
    const b = DATA.books[id]; if (!b) continue;
    const got = store.state.patches.includes(id);
    grid.appendChild(h(`<div class="tile" style="align-items:center;text-align:center">${patchSVG(b, { cls: 'patch small', ghost: !got })}<h3 style="font-size:18px">${esc((b.patch && b.patch.name) || b.title)}</h3><p class="faint small">${got ? 'Earned' : 'Not yet'}</p></div>`));
  }
  const log = v.querySelector('.log');
  const entries = store.state.log;
  if (!entries.length) log.innerHTML = `<p class="empty">The Crew Log is empty. Choices and patches are written here.</p>`;
  for (const e of entries.slice(0, 60)) {
    const d = new Date(e.t);
    log.appendChild(h(`<div class="entry"><span class="when">${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span><span>${esc(e.text)}</span></div>`));
  }
  mount(v);
}

/* ---------------- Router ---------------- */
function parseHash() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, qs] = raw.split('?');
  const q = new URLSearchParams(qs || '');
  return { path, q };
}

function route() {
  const { path, q } = parseHash();
  const m = path.match(/^\/book\/([\w-]+)$/);
  if (m) {
    const b = DATA.books[m[1]];
    if (!b) { location.hash = '#/'; return; }
    document.title = `${b.title} · Astra Reads`;
    startBook(b, mount, { step: q.get('step') || (q.get('page') ? 'page' : 'cover'), page: q.get('page') });
    return;
  }
  document.title = 'Astra Reads';
  if (path === '/cases') return renderCases();
  if (path === '/patches') return renderPatches();
  renderHome();
}

window.addEventListener('hashchange', route);

(async function boot() {
  try {
    await loadAll();
  } catch (e) {
    app.innerHTML = `<p class="empty">Could not load the stories. ${esc(String(e))}</p>`;
    return;
  }
  route();
  if ('serviceWorker' in navigator && /^https?:/.test(location.protocol) && !/[?&]nosw/.test(location.search)) {
    navigator.serviceWorker.register('sw.js').catch(e => console.warn('sw', e));
  }
})();
