"""The report's montage of the rocky surfaces the site draws -> latex/figures/surfaces.jpg.

Each globe is the site's own map (site/moon, site/surf), seen whole and lit from the left at a
phase angle of about 55 degrees so the terminator crosses the disk. The four bodies with heights
(the Moon, Mercury, Mars and Theia: site/moon/relief.webp, site/relief/<name>.webp) are drawn large
and shaded by their slopes at true scale, as the shader shades them; the rest are drawn small with
their maps alone. The Moon's older faces share its heights; the molten Moon glows by its own light.
Each body is scaled to its own exposure, so the panels do not compare in albedo; the Moon's
faces share the present Moon's.

Usage: python surface_montage.py
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont
Image.MAX_IMAGE_PIXELS = None

ROOT = Path(__file__).resolve().parent.parent
SITE, OUT = ROOT / 'site', ROOT / 'latex' / 'figures' / 'surfaces.jpg'
U = 300                       # one small panel, px
BIG, SMALL = 2 * U, U         # panel sizes
COLS = 8

# name, label, map, left-edge longitude of the map, relief (file, lo km, hi km, radius km) or None,
# centre longitude and latitude shown, self-luminous
MOON_REL = ('moon/relief.webp', -9.2, 10.9, 1737.4)
LARGE = [
    ('Moon', 'moon/now.webp', -180, MOON_REL, 0, 0, False),
    ('Mercury', 'surf/mercury.webp', 0, ('relief/mercury.webp', -5.5, 4.7, 2439.4), 150, 10, False),
    ('Mars', 'surf/mars.webp', 0, ('relief/mars.webp', -8.3, 21.3, 3389.5), 285, 0, False),
    ('Theia (invented)', 'surf/theia.webp', 0, ('relief/theia.webp', -15.0, 7.5, 3400.0), 0, 15, False),
]
SMALLS = [
    ('Moon before Tycho', 'moon/notycho.webp', -180, MOON_REL, 0, 0, False),
    ('Moon, 3.8 Ga', 'moon/ma3800.webp', -180, MOON_REL, 0, 0, False),
    ('Moon, 4.0 Ga', 'moon/ma4000.webp', -180, MOON_REL, 0, 0, False),
    ('Molten Moon, 4.5 Ga', 'moon/molten.webp', -180, None, 0, 0, True),
    ('Io', 'surf/io.webp', 0, None, 0, 0, False),
    ('Europa', 'surf/europa.webp', 0, None, 0, 0, False),
    ('Ganymede', 'surf/ganymede.webp', 0, None, 0, 0, False),
    ('Callisto', 'surf/callisto.webp', 0, None, 0, 0, False),
    ('Mimas', 'surf/mimas.webp', 0, None, 0, 0, False),
    ('Enceladus', 'surf/enceladus.webp', 0, None, 0, 0, False),
    ('Tethys', 'surf/tethys.webp', 0, None, 0, 0, False),
    ('Dione', 'surf/dione.webp', 0, None, 0, 0, False),
    ('Rhea', 'surf/rhea.webp', 0, None, 0, 0, False),
    ('Iapetus', 'surf/iapetus.webp', 0, None, 230, 0, False),
    ('Triton', 'surf/triton.webp', 0, None, 0, -25, False),
]
SUN = np.array([-0.72, 0.28, 0.63]); SUN /= np.linalg.norm(SUN)   # view frame: x right, y up, z out


def lin(c): return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def srgb(c): return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.clip(c, 0, None) ** (1 / 2.4) - 0.055)


def load(rel, width):
    """A map box-shrunk to about four samples per output pixel across the globe."""
    im = Image.open(SITE / rel).convert('RGB')
    if im.width > width: im = im.resize((width, width // 2), Image.BOX)
    return np.asarray(im, np.float64) / 255


def sample(m, lon, lat, lon0):
    """Bilinear lookup in an equirectangular map whose left edge is longitude lon0, east to the right."""
    h, w = m.shape[:2]
    x = ((lon - lon0) / 360 % 1) * w - 0.5
    y = np.clip((90 - lat) / 180 * h - 0.5, 0, h - 1)
    x0 = np.floor(x).astype(int); y0 = np.floor(y).astype(int); fx = x - x0; fy = y - y0
    x1 = (x0 + 1) % w; x0 %= w; y1 = np.minimum(y0 + 1, h - 1)
    if m.ndim == 3: fx, fy = fx[..., None], fy[..., None]
    return (m[y0, x0] * (1 - fx) + m[y0, x1] * fx) * (1 - fy) + (m[y1, x0] * (1 - fx) + m[y1, x1] * fx) * fy


EXPO = {}   # the present Moon's exposure, kept for its older faces so they compare


def globe(spec, size):
    name, mp, lon0, relief, clon, clat, glow = spec
    ss = 2; n = size * ss; r = 0.94
    yy, xx = np.mgrid[0:n, 0:n]
    x = (xx + 0.5) / n * 2 - 1; y = 1 - (yy + 0.5) / n * 2
    x, y = x / r, y / r
    inside = x * x + y * y < 1
    z = np.sqrt(np.clip(1 - x * x - y * y, 0, 1))
    # View frame to body frame: tilt by the centre latitude, then turn by the centre longitude.
    p, l = np.radians(clat), np.radians(clon)
    bx = x; by = y * np.cos(p) + z * np.sin(p); bz = -y * np.sin(p) + z * np.cos(p)
    lat = np.degrees(np.arcsin(np.clip(by, -1, 1)))
    lon = np.degrees(np.arctan2(bx, bz)) + clon
    col = lin(sample(load(mp, 4 * n), lon, lat, lon0))
    nrm = np.stack([x, y, z], -1)
    if relief:
        f, lo, hi, R = relief
        hm = load(f, 4 * n)[..., 0] * (hi - lo) + lo
        h, w = hm.shape
        # Slopes east and north (km per km) on the map's grid.
        dE = (np.roll(hm, -1, 1) - np.roll(hm, 1, 1)) / (2 * 2 * np.pi * R / w)
        dN = np.zeros_like(hm); dN[1:-1] = (hm[:-2] - hm[2:]) / (2 * np.pi * R / h)
        coslat = np.cos(np.radians((np.arange(h) + 0.5) / h * 180 - 90))[::-1, None]
        dE = dE / np.maximum(coslat, 0.05)
        gE, gN = sample(dE, lon, lat, lon0), sample(dN, lon, lat, lon0)
        # The local east and north in the view frame.
        lr, pr = np.radians(lon - clon), np.radians(lat)
        e_b = np.stack([np.cos(lr), np.zeros_like(lr), -np.sin(lr)], -1)
        n_b = np.stack([-np.sin(pr) * np.sin(lr), np.cos(pr), -np.sin(pr) * np.cos(lr)], -1)
        def to_view(v): return np.stack([v[..., 0], v[..., 1] * np.cos(p) - v[..., 2] * np.sin(p), v[..., 1] * np.sin(p) + v[..., 2] * np.cos(p)], -1)
        nrm = nrm - gE[..., None] * to_view(e_b) - gN[..., None] * to_view(n_b)
        nrm /= np.linalg.norm(nrm, axis=-1, keepdims=True)
    mu0 = np.clip(nrm @ SUN, 0, None); mu = np.clip(nrm[..., 2], 1e-3, None)
    # Half Lambert, half Lommel-Seeliger: a dusty surface with some limb darkening.
    shade = 0.5 * mu0 + 0.5 * 2 * mu0 / (mu0 + mu)
    if glow: shade = 0.55 + 0.45 * shade
    img = col * shade[..., None]
    moon = mp.startswith('moon/') and not glow
    if moon and 'moon' in EXPO: k = EXPO['moon']
    else:
        k = 0.92 / max(np.percentile(img[inside & (shade > 0.2)].max(-1), 99.5), 1e-6)
        if moon: EXPO['moon'] = k
    img = img * k
    a = (srgb(np.clip(img, 0, 1)) * 255)
    a[~inside] = 0
    # Antialias the limb by averaging the supersamples.
    a = a.reshape(size, ss, size, ss, 3).mean((1, 3))
    return Image.fromarray(a.astype(np.uint8))


def font(px):
    for f in ('C:/Windows/Fonts/arial.ttf', '/System/Library/Fonts/Helvetica.ttc', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'):
        try: return ImageFont.truetype(f, px)
        except OSError: pass
    return ImageFont.load_default()


def main():
    lab = 34
    rows_small = [SMALLS[:COLS], SMALLS[COLS:]]
    W = COLS * U
    H = (BIG + lab) + len(rows_small) * (SMALL + lab)
    sheet = Image.new('RGB', (W, H), (0, 0, 0)); d = ImageDraw.Draw(sheet)
    fb, fs = font(28), font(21)
    def put(spec, size, x, y, f):
        sheet.paste(globe(spec, size), (x, y))
        tw = d.textlength(spec[0], font=f)
        d.text((x + (size - tw) / 2, y + size + 2), spec[0], fill=(225, 225, 225), font=f)
        print(spec[0])
    for i, s in enumerate(LARGE): put(s, BIG, i * BIG, 0, fb)
    y = BIG + lab
    for row in rows_small:
        x0 = (W - len(row) * U) // 2
        for i, s in enumerate(row): put(s, SMALL, x0 + i * U, y, fs)
        y += SMALL + lab
    sheet.save(OUT, quality=92)
    print(OUT, sheet.size)


if __name__ == '__main__':
    main()
