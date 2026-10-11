"""Check every story against the reading rules in PLAN.md section 2.

  python tools/check_phonics.py            all books
  python tools/check_phonics.py dino-1     one book, with every unique word and its sound buttons

Checks: at most two lines a page, lines at most MAX_CHARS, every page reachable, every link points somewhere,
quiz answers in range, at least one focus-sound word on most pages, pictures present, and lists the unique
words (longest first) so a grown-up can eyeball anything that is not Phase 2 to 5 decodable or a tricky word.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MAX_CHARS = 44

FOUR = ['eigh', 'aigh', 'augh', 'ough', 'ture']
THREE = ['igh', 'tch', 'dge', 'air', 'ear', 'eer', 'ere', 'are', 'ire', 'ure', 'oor', 'oar', 'our', 'aur', 'ore', 'ssi']
TWO = ['ai', 'ay', 'ee', 'ea', 'ie', 'oa', 'ow', 'oo', 'oi', 'oy', 'ou', 'ue', 'ew', 'ui', 'oe', 'au', 'aw',
       'ar', 'or', 'ur', 'er', 'ir', 'ch', 'sh', 'th', 'ng', 'nk', 'qu', 'ck', 'ff', 'll', 'ss', 'zz', 'ph']
START_ONLY = ['kn', 'gn', 'wr', 'wh']
END_ONLY = ['ve', 'se', 'ce', 'ze', 'ge', 'le', 'el', 'al', 'il', 'mb', 'ey']
END_REST = re.compile(r'^(s|d|ed|es|ing)?$')
EA_SHORT = {'head', 'bread', 'ready', 'heavy', 'weather', 'feather', 'instead', 'breath', 'dead', 'meant', 'sweat', 'sweater', 'thread', 'spread', 'dread', 'steady', 'leather', 'heaven', 'breakfast', 'already', 'deaf', 'death', 'health', 'wealth', 'treasure', 'measure', 'pleasure', 'meadow', 'ahead', 'lead', 'leapt', 'dealt', 'threat'}
EA_AI = {'great', 'break', 'steak', 'greater', 'breaks', 'breaking'}
OW_COW = {'cow', 'now', 'how', 'down', 'town', 'brown', 'owl', 'crowd', 'flower', 'shower', 'tower', 'power', 'growl', 'howl', 'clown', 'frown', 'crown', 'gown', 'wow', 'allow', 'vowel', 'towel', 'bow', 'row', 'crowded', 'downstairs', 'flowers', 'owls', 'powerful', 'drown', 'prowl', 'scowl', 'fowl', 'vow', 'sow', 'somehow', 'cows', 'towns', 'crowds', 'showers', 'towers', 'growls', 'howls', 'clowns'}
EY_AI = {'they', 'grey', 'obey', 'prey', 'hey', 'survey', 'whey', 'greys'}
OU_NOT_OW = {'you', 'your', 'yours', 'could', 'would', 'should', 'four', 'pour', 'tour', 'soup', 'group', 'groups', 'through', 'thought', 'touch', 'young', 'country', 'cousin', 'double', 'trouble', 'shoulder', 'shoulders', 'boulder', 'boulders', 'mould', 'youth', 'route', 'courage', 'enough', 'tough', 'rough', 'cough', 'though', 'dough', 'famous', 'nervous', 'enormous', 'dangerous'}
EAR_UR = {'learn', 'learns', 'learned', 'learnt', 'learning', 'early', 'earlier', 'earth', 'earn', 'earns', 'heard', 'search', 'searches', 'searched', 'pearl', 'pearls', 'yearn', 'rehearse'}
EAR_AIR = {'bear', 'bears', 'pear', 'pears', 'wear', 'wears', 'tear', 'swear'}
OR_UR = {'work', 'works', 'worked', 'word', 'words', 'world', 'worlds', 'worm', 'worms', 'worse', 'worst', 'worth'}

# Mirrors OVERRIDES in js/core/phonics.js (keep the two in step).
OVERRIDES = {}
_js = (ROOT / 'js' / 'core' / 'phonics.js').read_text(encoding='utf-8')
_block = _js.split('const OVERRIDES = {', 1)[1].split('\n};', 1)[0]
for m in re.finditer(r"(\w+):\s*'([^']*)'", _block):
    OVERRIDES[m.group(1)] = m.group(2)


def split_digraph(w):
    for suffix in ('', 's', 'd'):
        core = (w[:-1] if w.endswith(suffix) else None) if suffix else w
        if not core or len(core) < 3:
            continue
        m = re.search(r'(^|[^aeiou])([aeiou])(th|st|[bcdfgjklmnpstvz])e$', core)
        if m:
            return m.group(2), m.group(3), suffix, len(core) - (len(m.group(2)) + len(m.group(3)) + 1)
    return None


def sound_of(g, w, at_end):
    if g == 'y':
        if not at_end:
            return None
        return 'ee' if re.search(r'[aeiou]', w[:-1]) else 'igh'
    if g == 'ie':
        i = w.rfind('ie')
        rest, stem = w[i + 2:], w[:i]
        if rest in ('', 's', 'd'):
            return 'ee' if re.search(r'[aeiou]', stem) else 'igh'
        return 'ee'
    if g == 'ea':
        return 'e' if w in EA_SHORT else 'ai' if w in EA_AI else 'ee'
    if g == 'ow':
        return 'ow' if w in OW_COW else 'oa'
    if g == 'ey':
        return 'ai' if w in EY_AI else 'ee'
    if g == 'ou':
        return 'other' if w in OU_NOT_OW else 'ow'
    if g == 'ear':
        return 'ur' if w in EAR_UR else 'air' if w in EAR_AIR else 'ear'
    if g == 'or':
        return 'ur' if w in OR_UR else 'or'
    if g in ('ir', 'ur'):
        return 'ur'
    if g in ('aw', 'ore', 'au', 'aur', 'oar', 'oor'):
        return 'or'
    if g in ('ue', 'ew', 'u_e'):
        return 'oo'
    if g in ('ai', 'ay', 'a_e', 'eigh', 'aigh'):
        return 'ai'
    if g in ('ee', 'e_e'):
        return 'ee'
    if g in ('igh', 'i_e'):
        return 'igh'
    if g in ('oa', 'o_e', 'oe'):
        return 'oa'
    return None


def split_word(word, overrides):
    w = re.sub(r'[^a-z]', '', word.lower())
    if not w:
        return []
    spec = overrides.get(w) or OVERRIDES.get(w)
    if spec:
        parts = spec.split('|')
        segs = []
        i = 0
        while i < len(parts):
            p = parts[i]
            if re.fullmatch(r'[aeiou]_e', p):
                mid = parts[i + 1] if i + 1 < len(parts) else ''
                segs.append((p, p[0] + mid + 'e'))
                i += 2
            else:
                segs.append((p, p))
                i += 1
        return [(g, t, sound_of(g, w, True)) for g, t in segs]
    sd = split_digraph(w)
    end = len(w)
    tail = []
    if sd:
        v, mid, suffix, start = sd
        end = start
        tail = [(v + '_e', v + mid + 'e')]
        if suffix:
            tail.append((suffix, suffix))
    segs = []
    i = 0
    while i < end:
        rest = w[i:]
        hit = None
        for lst in (FOUR, THREE):
            for g in lst:
                if rest.startswith(g) and i + len(g) <= end:
                    hit = g
                    break
            if hit:
                break
        if not hit and i == 0:
            for g in START_ONLY:
                if rest.startswith(g):
                    hit = g
                    break
        if not hit and i > 0:
            for g in END_ONLY:
                if rest.startswith(g) and i + len(g) <= end and END_REST.match(w[i + len(g):]):
                    hit = g
                    break
        if not hit:
            for g in TWO:
                if rest.startswith(g) and i + len(g) <= end:
                    hit = g
                    break
        if not hit:
            hit = w[i]
        segs.append((hit, hit))
        i += len(hit)
    allsegs = segs + tail
    out = []
    for k, (g, t) in enumerate(allsegs):
        at_end = k == len(allsegs) - 1 or (k == len(allsegs) - 2 and allsegs[-1][0] in ('s', 'd'))
        out.append((g, t, sound_of(g, w, at_end)))
    return out


def is_focus(seg, sound, spellings):
    g, _, s = seg
    key = g.replace('_', '-')
    if key not in spellings:
        return False
    if s and sound and s != sound:
        return False
    return True


def words_in(line):
    return re.findall(r"[A-Za-z][A-Za-z'’-]*[A-Za-z]|[A-Za-z]", line)


def check(book, verbose=False):
    probs = []
    sound, spellings = book['sound']['phoneme'], book['sound']['spellings']
    tricky = set(w.lower() for w in book.get('tricky', []))
    overrides = book.get('words', {})
    pages = book['pages']
    img_dir = ROOT / 'assets' / 'img' / 'books' / book['id']
    missing_imgs = []
    words = {}
    reachable = set()
    todo = [book['start']]
    while todo:
        pid = todo.pop()
        if pid in reachable or pid not in pages:
            if pid not in pages:
                probs.append(f'link to missing page {pid}')
            continue
        reachable.add(pid)
        p = pages[pid]
        if p.get('choice'):
            todo += [o['next'] for o in p['choice']['options']]
        elif p.get('next'):
            todo.append(p['next'])
    for pid, p in pages.items():
        if pid not in reachable:
            probs.append(f'{pid}: not reachable')
        if p.get('reveal') and p['reveal'] not in pages:
            probs.append(f'{pid}: reveal points at missing page {p["reveal"]}')
        lines = p.get('text', [])
        if len(lines) > 2:
            probs.append(f'{pid}: {len(lines)} lines')
        focus = 0
        for ln in lines:
            if len(ln) > MAX_CHARS:
                probs.append(f'{pid}: line is {len(ln)} chars: "{ln}"')
            for w in words_in(ln):
                lw = re.sub(r"[^a-z]", '', w.lower())
                segs = split_word(lw, overrides)
                words[lw] = segs
                if lw not in tricky and any(is_focus(s, sound, spellings) for s in segs):
                    focus += 1
        if focus == 0 and not p.get('choice'):
            probs.append(f'{pid}: no focus-sound word (warn)')
        if p.get('img') and not (img_dir / p['img']).exists():
            missing_imgs.append(p['img'])
    for name in (book.get('cover'), book['casefile'].get('img')):
        if name and not (img_dir / name).exists():
            missing_imgs.append(name)
    for i, q in enumerate(book.get('quiz', [])):
        if not (0 <= q['answer'] < len(q['options'])):
            probs.append(f'quiz {i + 1}: answer out of range')
        for o in q['options']:
            if o.get('img') and o['img'] not in pages:
                probs.append(f'quiz {i + 1}: option picture {o["img"]} is not a page')
        if q.get('hint') and q['hint'] not in pages:
            probs.append(f'quiz {i + 1}: hint {q["hint"]} is not a page')
    total = sum(len(words_in(ln)) for p in pages.values() for ln in p.get('text', []))
    print(f'== {book["id"]}: {book["title"]}  ({len(pages)} pages, {total} words, {len(words)} unique, {len(missing_imgs)} pictures missing)')
    for pr in probs:
        print('   ' + pr)
    if missing_imgs:
        print('   missing pictures: ' + ' '.join(missing_imgs))
    if verbose:
        for w in sorted(words, key=lambda x: (-len(x), x)):
            segs = words[w]
            mark = ' *' if w in tricky else ''
            fx = ' <-- focus' if any(is_focus(s, sound, spellings) for s in segs) and w not in tricky else ''
            print(f'   {w:14s} {"|".join(t for _, t, _ in segs)}{mark}{fx}')
    return not [p for p in probs if '(warn)' not in p]


def main():
    want = sys.argv[1:]
    idx = json.loads((ROOT / 'content' / 'books.json').read_text(encoding='utf-8'))
    ok = True
    for t in idx['themes']:
        for bid in t['books']:
            if want and bid not in want:
                continue
            book = json.loads((ROOT / 'content' / 'books' / f'{bid}.json').read_text(encoding='utf-8'))
            ok = check(book, verbose=bool(want)) and ok
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
