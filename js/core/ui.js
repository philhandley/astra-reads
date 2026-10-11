// Small shared UI pieces: toast, modal, speaker buttons, confetti.
import { h, esc } from './dom.js';
import { icon } from './icons.js';
import { speak, stopSpeaking } from './speak.js';

let toastEl = null;
let toastTimer = 0;
export function toast(text, ms = 1800) {
  if (toastEl) toastEl.remove();
  toastEl = h(`<div class="toast">${esc(text)}</div>`);
  document.body.appendChild(toastEl);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl && toastEl.remove(); toastEl = null; }, ms);
}

export function modal(inner, { onClose } = {}) {
  const bg = h(`<div class="modal-bg"><div class="card modal"></div></div>`);
  const card = bg.firstElementChild;
  if (typeof inner === 'string') card.innerHTML = inner; else card.appendChild(inner);
  const close = () => { bg.remove(); onClose && onClose(); };
  bg.addEventListener('click', e => { if (e.target === bg) close(); });
  document.body.appendChild(bg);
  return { close, card };
}

export function confirmBox(text, { yes = 'Yes', no = 'No' } = {}) {
  return new Promise(resolve => {
    const box = h(`<div class="col gap"><p style="font-size:22px">${esc(text)}</p><div class="row gap" style="justify-content:flex-end"><button class="btn ghost" type="button" data-no>${esc(no)}</button><button class="btn accent" type="button" data-yes>${esc(yes)}</button></div></div>`);
    const m = modal(box, { onClose: () => resolve(false) });
    box.querySelector('[data-no]').addEventListener('click', () => { m.close(); });
    box.querySelector('[data-yes]').addEventListener('click', () => { bgResolve(true); });
    const bgResolve = v => { m.card.parentElement.remove(); resolve(v); };
  });
}

// A round speaker button that reads text aloud and pulses while speaking.
export function speakButton(textOrFn, { cls = 'rbtn', label = 'Read to me' } = {}) {
  const b = h(`<button class="${cls}" type="button" aria-label="${esc(label)}" title="${esc(label)}">${icon('speaker')}</button>`);
  b.addEventListener('click', () => {
    if (b.classList.contains('on')) { stopSpeaking(); b.classList.remove('on'); return; }
    const text = typeof textOrFn === 'function' ? textOrFn() : textOrFn;
    document.querySelectorAll('.rbtn.on, .fbtn.on[data-speak]').forEach(x => x.classList.remove('on'));
    b.classList.add('on');
    speak(text, { onend: () => b.classList.remove('on') });
  });
  return b;
}

export function confetti(parent, colours = ['#ff6a2b', '#f5b400', '#1fa062', '#1b8fd8', '#5b57d6', '#e8792a']) {
  const box = h('<div class="confetti"></div>');
  for (let i = 0; i < 70; i++) {
    const p = document.createElement('i');
    p.style.left = Math.random() * 100 + '%';
    p.style.background = colours[i % colours.length];
    p.style.animationDelay = (Math.random() * 1.2) + 's';
    p.style.animationDuration = (2 + Math.random() * 1.5) + 's';
    p.style.transform = `rotate(${Math.random() * 360}deg)`;
    box.appendChild(p);
  }
  parent.appendChild(box);
  setTimeout(() => box.remove(), 4500);
}

export function hush() { stopSpeaking(); document.querySelectorAll('.rbtn.on').forEach(x => x.classList.remove('on')); }
