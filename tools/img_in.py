"""Bring a generated picture into the app: trim white bars, resize to 1600 px max, save as WebP under 300 KB.

Usage:  python -I tools/img_in.py <book-id> <name> <source.png>
Writes: assets/img/books/<book-id>/<name>.webp
"""
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
MAX_SIDE = 1600
MAX_BYTES = 300 * 1024


def trim_bars(im, thresh=238):
    """Remove near-white (or near-black) bars that run the full width or height."""
    g = im.convert('L')
    w, h = g.size
    px = g.load()

    def row_flat(y):
        vals = [px[x, y] for x in range(0, w, max(1, w // 200))]
        return all(v >= thresh for v in vals) or all(v <= 255 - thresh for v in vals)

    def col_flat(x):
        vals = [px[x, y] for y in range(0, h, max(1, h // 200))]
        return all(v >= thresh for v in vals) or all(v <= 255 - thresh for v in vals)

    top, bottom, left, right = 0, h, 0, w
    while top < h // 3 and row_flat(top): top += 1
    while bottom > h * 2 // 3 and row_flat(bottom - 1): bottom -= 1
    while left < w // 3 and col_flat(left): left += 1
    while right > w * 2 // 3 and col_flat(right - 1): right -= 1
    if (top, bottom, left, right) != (0, h, 0, w):
        im = im.crop((left, top, right, bottom))
    return im


def main():
    book, name, src = sys.argv[1], sys.argv[2], Path(sys.argv[3])
    out_dir = ROOT / 'assets' / 'img' / 'books' / book
    out_dir.mkdir(parents=True, exist_ok=True)
    im = Image.open(src).convert('RGB')
    before = im.size
    im = trim_bars(im)
    w, h = im.size
    scale = min(1.0, MAX_SIDE / max(w, h))
    if scale < 1.0:
        im = im.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
    out = out_dir / f'{name}.webp'
    for q in (84, 80, 76, 72, 68, 62, 56, 50):
        im.save(out, 'WEBP', quality=q, method=6)
        if out.stat().st_size <= MAX_BYTES:
            break
    print(f'{out.relative_to(ROOT).as_posix()}: {before} -> {im.size}, q{q}, {out.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()
