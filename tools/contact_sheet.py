"""Tile a book's pictures into one labelled contact sheet for a quick visual check.
Usage: python -I tools/contact_sheet.py <book> [out.jpg]"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
book = sys.argv[1]
out = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / 'tools' / 'shots' / f'sheet-{book}.jpg'
files = sorted((ROOT / 'assets' / 'img' / 'books' / book).glob('*.webp'))
W, H, COLS = 400, 225, 4
rows = (len(files) + COLS - 1) // COLS
sheet = Image.new('RGB', (COLS * W, rows * (H + 22)), 'white')
d = ImageDraw.Draw(sheet)
for i, f in enumerate(files):
    im = Image.open(f).convert('RGB')
    im.thumbnail((W, H))
    x, y = (i % COLS) * W, (i // COLS) * (H + 22)
    sheet.paste(im, (x + (W - im.width) // 2, y))
    d.text((x + 6, y + H + 4), f.stem, fill='black')
sheet.save(out, quality=82)
print(out, len(files))
