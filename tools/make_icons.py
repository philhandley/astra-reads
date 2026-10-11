from math import cos, sin, pi
from pathlib import Path
from PIL import Image, ImageDraw
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'icons'
OUT.mkdir(parents=True, exist_ok=True)

BG = (255, 246, 230)      # #fff6e6 cream card
INK = (27, 27, 36)        # #1b1b24 sticker outline
ORANGE = (255, 122, 26)   # #ff7a1a book cover edge
TEAL = (20, 184, 166)     # #14b8a6 star
YELLOW = (245, 180, 0)    # #f5b400 sparkle
WHITE = (255, 255, 255)

CARD_LINE = 40   # outline of the rounded card, in 1024 px space
LINE = 26        # outline of the book, star and sparkle
TEXT = 26        # thickness of the text lines on the pages


def bez(p0, p1, p2, n=32):
    """Points along a quadratic Bezier curve from p0 to p2 (both included)."""
    pts = []
    for i in range(n + 1):
        t = i / n
        a, b, k = (1 - t) ** 2, 2 * (1 - t) * t, t * t
        pts.append((a * p0[0] + b * p1[0] + k * p2[0],
                    a * p0[1] + b * p1[1] + k * p2[1]))
    return pts


def mirror(pts):
    """Flip a list of unit-space points left to right."""
    return [(1 - u, v) for u, v in pts]


def star_points(cx, cy, r_out, r_in, n=5):
    """Vertices of an n-point star, first point straight up."""
    pts = []
    for i in range(2 * n):
        r = r_out if i % 2 == 0 else r_in
        a = -pi / 2 + i * pi / n
        pts.append((cx + r * cos(a), cy + r * sin(a)))
    return pts


def shape(d, pts, fill):
    """Filled polygon with the dark sticker outline."""
    d.polygon(pts, fill=fill)
    d.line(pts + [pts[0]], fill=INK, width=LINE, joint='curve')


def draw(size, maskable=False):
    S = 1024
    im = Image.new('RGBA', (S, S), BG + (255,) if maskable else (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    pad = 170 if maskable else 40
    c = S - 2 * pad          # side of the cream card
    R = int(c * 0.21)        # corner radius of the card

    # sticker card: dark outer square with a cream inside
    d.rounded_rectangle([pad, pad, pad + c, pad + c], radius=R, fill=INK)
    d.rounded_rectangle([pad + CARD_LINE, pad + CARD_LINE,
                         pad + c - CARD_LINE, pad + c - CARD_LINE],
                        radius=R - CARD_LINE, fill=BG)

    def p(u, v):
        """Unit card coordinates (0..1) to canvas pixels."""
        return (pad + u * c, pad + v * c)

    # book cover: orange, a little wider and taller than the pages, so it shows as a rim
    cover_left = (bez((0.50, 0.50), (0.335, 0.35), (0.15, 0.40))
                  + bez((0.15, 0.78), (0.335, 0.86), (0.50, 0.905)))
    cover = cover_left + mirror(reversed(cover_left))
    shape(d, [p(u, v) for u, v in cover], ORANGE)

    # two white pages meeting at the spine
    page_left = (bez((0.49, 0.575), (0.34, 0.425), (0.21, 0.475))
                 + bez((0.21, 0.73), (0.34, 0.80), (0.49, 0.835)))
    shape(d, [p(u, v) for u, v in page_left], WHITE)
    shape(d, [p(u, v) for u, v in mirror(page_left)], WHITE)

    # short text lines on each page, with round ends
    def bar(u0, u1, v):
        a, b = p(u0, v), p(u1, v)
        d.line([a, b], fill=INK, width=TEXT)
        for x, y in (a, b):
            d.ellipse([x - TEXT / 2, y - TEXT / 2, x + TEXT / 2, y + TEXT / 2], fill=INK)

    for u0, u1, v in ((0.27, 0.42, 0.61), (0.27, 0.44, 0.665), (0.27, 0.36, 0.72)):
        bar(u0, u1, v)
        bar(1 - u0, 1 - u1, v)

    # teal star rising above the spine, with a small yellow sparkle
    cx, cy = p(0.5, 0.265)
    shape(d, star_points(cx, cy, 0.155 * c, 0.078 * c, 5), TEAL)
    sx, sy = p(0.77, 0.19)
    shape(d, star_points(sx, sy, 0.06 * c, 0.03 * c, 4), YELLOW)

    return im.resize((size, size), Image.LANCZOS)


draw(512).save(OUT / 'icon-512.png')
draw(192).save(OUT / 'icon-192.png')
draw(512, maskable=True).save(OUT / 'icon-maskable-512.png')
ap = Image.new('RGBA', (180, 180), BG + (255,))
ap.alpha_composite(draw(180, maskable=True))
ap.convert('RGB').save(OUT / 'apple-touch-icon-180.png')
draw(32).save(OUT / 'favicon-32.png')
print('icons written to', OUT)
