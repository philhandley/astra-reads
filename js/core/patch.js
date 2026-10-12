// Chapter patches: a round embroidered-style badge in the theme colour with the theme icon and chapter number.
import { PATHS } from './icons.js';

const COLOURS = { dino: ['#e8792a', '#b8561a', '#fdebdc'], space: ['#5b57d6', '#3d3aa8', '#e8e7fb'], wild: ['#2f9e5b', '#1f7241', '#e1f4e8'], ocean: ['#1b8fd8', '#1267a0', '#e0f0fb'], adventure: ['#d9473f', '#a8302a', '#fde4e1'] };
const ICONS = { dino: 'dino', space: 'rocket', wild: 'leaf', ocean: 'wave', adventure: 'mountain' };

export function patchSVG(book, { cls = 'patch', ghost = false } = {}) {
  const [c, dark, soft] = COLOURS[book.theme] || COLOURS.dino;
  const ic = PATHS[(book.patch && book.patch.icon) || ICONS[book.theme] || 'star'];
  const label = (book.patch && book.patch.name) || book.title;
  const n = book.chapter || 1;
  const id = 'arc' + book.id.replace(/[^a-z0-9]/gi, '');
  return `<svg class="${cls}${ghost ? ' ghost' : ''}" viewBox="0 0 200 200" aria-label="${label} patch">
    <defs><path id="${id}" d="M100 100 m-66 0 a66 66 0 1 1 132 0"/></defs>
    <circle cx="100" cy="100" r="96" fill="${dark}"/>
    <circle cx="100" cy="100" r="88" fill="${c}" stroke="${soft}" stroke-width="3" stroke-dasharray="4 5"/>
    <circle cx="100" cy="104" r="52" fill="${soft}"/>
    <g transform="translate(64 68) scale(3)" fill="none" stroke="${dark}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${ic}</g>
    <text font-family="Lexend, sans-serif" font-size="15" font-weight="800" fill="#fff" letter-spacing="2"><textPath href="#${id}" startOffset="50%" text-anchor="middle">${escapeXml(label.toUpperCase())}</textPath></text>
    <circle cx="100" cy="172" r="16" fill="#fff"/>
    <text x="100" y="178" font-family="Lexend, sans-serif" font-size="18" font-weight="800" fill="${dark}" text-anchor="middle">${n}</text>
  </svg>`;
}

function escapeXml(s) { return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }
