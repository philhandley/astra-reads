"""Print the picture briefs for a book, so missing pictures can be generated to the same style.

  python tools/prompts.py dino-1            every picture
  python tools/prompts.py dino-1 --missing  only pictures not yet in assets/img/books/dino-1/

Each brief = STYLE + the theme's character block + the page's own scene. Pages are 16:9 (1600 x 900),
covers and Case File portraits 4:3 (1200 x 900). After generating, run:
  python -I tools/img_in.py <book> <name-without-extension> <downloaded.png>
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

STYLE = ("Children's picture-book illustration in a clean, bold, flat cartoon style like a modern animated kids' "
         "detective show: thick clean outlines, bright saturated colours, simple soft shading, friendly rounded "
         "shapes, expressive faces. The picture fills the whole frame edge to edge: no border, no white bars, "
         "no logos. Absolutely no words, letters or numbers anywhere, including on screens, signs, labels and notes. ")

BROTHERS = ("The two brothers always look the same: FINN is six, taller, with short neat strawberry-blond hair, "
            "blue-grey eyes, a few freckles and a big friendly smile{finn}. ZEB is three, shorter, with a blond bowl "
            "haircut, big blue eyes and a cheeky grin{zeb}. ")

OUTFITS = {
    'dino': (', wearing a khaki explorer shirt and shorts with an orange neckerchief',
             ', wearing the same khaki explorer outfit with a teal neckerchief'),
    'space': (', wearing a white and orange spacesuit (clear bubble helmet when outside on Mars)',
              ', wearing a matching small white and orange spacesuit (clear bubble helmet when outside on Mars)'),
    'wild': (', wearing a khaki explorer shirt and shorts, a green safari hat and a folded map in his pocket',
             ', wearing the same khaki explorer outfit and green safari hat, with a camera on a strap round his neck'),
    'ocean': (', wearing a blue wetsuit, usually inside a small round yellow submarine pod with a big glass front',
              ', wearing a yellow wetsuit with a dive mask, snorkel, small air tank and a torch'),
}

TAIL_WIDE = 'Wide landscape composition.'
TAIL_COVER = 'Portrait-leaning composition with the brothers centred, book cover style.'


def briefs(book):
    finn, zeb = OUTFITS[book['theme']]
    head = STYLE + BROTHERS.format(finn=finn, zeb=zeb)
    out = []
    if book.get('cover_prompt'):
        out.append(('cover', 1200, 900, head + 'Scene: ' + book['cover_prompt'] + ' ' + TAIL_COVER))
    for pid, p in book['pages'].items():
        if p.get('img') and p.get('prompt'):
            out.append((Path(p['img']).stem, 1600, 900, head + 'Scene: ' + p['prompt'] + ' ' + TAIL_WIDE))
    cf = book['casefile']
    if cf.get('img') and cf.get('prompt'):
        out.append((Path(cf['img']).stem, 1200, 900, STYLE + 'Scene: ' + cf['prompt']))
    return out


def main():
    bid = sys.argv[1]
    only_missing = '--missing' in sys.argv
    book = json.loads((ROOT / 'content' / 'books' / f'{bid}.json').read_text(encoding='utf-8'))
    img_dir = ROOT / 'assets' / 'img' / 'books' / bid
    seen = set()
    for name, w, h, text in briefs(book):
        if name in seen:
            continue
        seen.add(name)
        if only_missing and (img_dir / f'{name}.webp').exists():
            continue
        print(f'### {bid}/{name}  ({w}x{h})\n{text}\n')


if __name__ == '__main__':
    main()
