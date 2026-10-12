"""Make missing story pictures with the Codex app's image generation (uses the ChatGPT plan, not Figma credits).

  python tools/codex_images.py wild-3                 all missing pictures for a book, 3 at a time
  python tools/codex_images.py adventure-1 cover p03  just these pictures
  python tools/codex_images.py wild-3 --refs a.png b.png -- p05 p06   override the reference images

Each picture: Codex gets the scene brief from the book JSON plus 1 to 3 reference pictures (for the boys'
faces and the art style), generates one image, and the newest PNG in ~/.codex/generated_images/<session>
is brought in with tools/img_in.py. Raw PNGs are kept in tools/shots/raw/<book>/.
"""
import json
import re
import shutil
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'tools'))
from prompts import OUTFITS  # noqa: E402

CODEX_HOME = Path.home() / '.codex'
GEN = CODEX_HOME / 'generated_images'
RAW = ROOT / 'tools' / 'shots' / 'raw'
WORK = RAW / '_codex'
WORKERS = 3


def find_codex():
    bins = sorted((Path.home() / 'AppData/Local/OpenAI/Codex/bin').glob('*/codex.exe'), key=lambda p: p.stat().st_mtime)
    if not bins:
        sys.exit('codex.exe not found (is the Codex app installed?)')
    return str(bins[-1])


HEADER = ("Use your built-in image generation tool to create exactly ONE new image. Do not run shell commands and do not "
          "write or edit any files; just generate the image.\n\n"
          "The attached images are references only: copy the art style exactly (clean, bold, flat cartoon picture-book "
          "style with thick clean outlines, bright saturated colours and simple soft shading) and copy the two boys' faces "
          "and hair exactly: FINN is six and taller, with short neat strawberry-blond hair, blue-grey eyes and a few "
          "freckles; ZEB is three and shorter, with a blond bowl haircut and big blue eyes. Each boy appears at most once. ")
FOOTER = ("\n\n{shape} The picture fills the whole frame edge to edge: no border, no white bars, no logos, and absolutely "
          "no words, letters or numbers anywhere, including on screens, signs, boats and notes.")


def brief(book, name):
    finn, zeb = book.get('outfits') or OUTFITS[book['theme']]
    outfit = f"Unless the scene says otherwise, Finn is{finn.replace(', wearing', ' wearing', 1)} and Zeb is{zeb.replace(', wearing', ' wearing', 1)}."
    if name == 'cover':
        scene, shape = book['cover_prompt'], 'Landscape 4:3 book cover, the brothers centred.'
    elif name == 'case':
        return (HEADER.split('The attached')[0] + "The attached images are style references only. "
                f"Scene: {book['casefile']['prompt']}" + FOOTER.format(shape='Landscape 4:3.'))
    else:
        page = next(p for p in book['pages'].values() if Path(p.get('img', '')).stem == name)
        scene, shape = page['prompt'], 'Wide landscape image, 16:9.'
    return HEADER + outfit + "\n\nScene: " + scene + FOOTER.format(shape=shape)


def run_one(codex, book, name, refs):
    out_dir = RAW / book['id']
    out_dir.mkdir(parents=True, exist_ok=True)
    WORK.mkdir(parents=True, exist_ok=True)
    prompt = brief(book, name)
    cmd = [codex, 'exec', '--skip-git-repo-check', '-s', 'read-only', '-c', 'model_reasoning_effort="low"']
    for r in refs:
        cmd += ['-i', str(r)]
    for attempt in (1, 2):
        t = time.time()
        p = subprocess.run(cmd, input=prompt, capture_output=True, text=True, encoding='utf-8', errors='replace', cwd=WORK, timeout=900)
        log = (p.stdout or '') + (p.stderr or '')
        m = re.search(r'session id:\s*([0-9a-f-]+)', log)
        pngs = sorted((GEN / m.group(1)).glob('*.png'), key=lambda f: f.stat().st_mtime) if m and (GEN / m.group(1)).exists() else []
        if pngs:
            raw = out_dir / f'{name}.png'
            shutil.copy2(pngs[-1], raw)
            r = subprocess.run([sys.executable, '-I', str(ROOT / 'tools' / 'img_in.py'), book['id'], name, str(raw)], capture_output=True, text=True)
            return f"{book['id']}/{name}: ok in {time.time() - t:.0f}s  {r.stdout.strip()}"
        tail = ' | '.join(l for l in log.strip().splitlines()[-4:])
        if 'usage limit' in log.lower() or 'rate limit' in log.lower():
            return f"{book['id']}/{name}: LIMIT {tail}"
    return f"{book['id']}/{name}: FAILED {tail}"


def main():
    args = sys.argv[1:]
    bid = args.pop(0)
    refs = []
    if '--refs' in args:
        i = args.index('--refs')
        j = args.index('--') if '--' in args else len(args)
        refs = [Path(a) for a in args[i + 1:j]]
        args = args[:i] + args[j + 1:]
    book = json.loads((ROOT / 'content' / 'books' / f'{bid}.json').read_text(encoding='utf-8'))
    have = {p.stem for p in (ROOT / 'assets' / 'img' / 'books' / bid).glob('*.webp')}
    names = []
    if book.get('cover_prompt'):
        names.append('cover')
    names += [Path(p['img']).stem for p in book['pages'].values() if p.get('img')]
    names.append('case')
    names = list(dict.fromkeys(names))
    wanted = args or [n for n in names if n not in have]
    if not refs:
        refs = [RAW / bid / 'cover.png'] if (RAW / bid / 'cover.png').exists() else []
    print(f'{bid}: {len(wanted)} pictures, refs: {[r.name for r in refs]}', flush=True)
    codex = find_codex()
    with ThreadPoolExecutor(WORKERS) as pool:
        for line in pool.map(lambda n: run_one(codex, book, n, refs), wanted):
            print(line, flush=True)


if __name__ == '__main__':
    main()
