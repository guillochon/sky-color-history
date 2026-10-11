"""Mars's and Mercury's heights for the walk-around view's relief -> site/relief/<name>.webp.

Sources, public domain:
  Mars     MGS MOLA Mission Experiment Gridded Data Record, megt90n000eb.img (PDS Geosciences,
           mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg016): heights over the areoid, 16 pixels a degree,
           5760 x 2880, big-endian 16-bit metres, longitude 0 at the left edge, east to the right.
  Mercury  USGS MESSENGER global DEM 665 m v2 (Becker et al. 2016; planetarymaps.usgs.gov/mosaic/
           Mercury_Messenger_USGS_DEM_Global_665m_v2.tif): heights over a sphere of 2439.4 km,
           64 pixels a degree, 23040 x 11520, 16-bit half-metres, uncompressed, longitude 0 at the
           left edge (its central meridian 180), east to the right; no-data pixels filled from round
           about.
Each is box-averaged to 4096 x 2048, the grid of its colour map (surfaces.py), and written as one
byte from RELIEF[name][0] to [1] km, dithered so that slopes on the plains under a low Sun do not
band into contours (as the Moon's, moon_maps.py), lossless.

Usage: python relief_maps.py <megt90n000eb.img> <Mercury_Messenger_USGS_DEM_Global_665m_v2.tif>
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image
Image.MAX_IMAGE_PIXELS = None

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / 'site' / 'relief'
W, H = 4096, 2048
# km, as surfaces.js SURF_RELIEF
RELIEF = {'mars': (-8.3, 21.3), 'mercury': (-5.5, 4.7)}


def shrink(h):
    """Box average to W x H (the source's rows and columns are whole multiples of a degree)."""
    return np.asarray(Image.fromarray(h.astype(np.float32)).resize((W, H), Image.BOX), np.float32)


def fill(h, bad):
    """No-data pixels from round about: averages over ever wider boxes, wrapping in longitude."""
    from scipy import ndimage
    h = np.where(bad, 0, h).astype(np.float64); w = (~bad).astype(np.float64)
    out = h.copy(); todo = bad.copy(); r = 1
    while todo.any() and r < 512:
        s = ndimage.uniform_filter(h*w, 2*r+1, mode=('nearest', 'wrap')); n = ndimage.uniform_filter(w, 2*r+1, mode=('nearest', 'wrap'))
        ok = todo & (n > 1e-6)
        out[ok] = s[ok]/n[ok]; todo &= ~ok; r *= 2
    return out


def save(name, h):
    lo, hi = RELIEF[name]
    rng = np.random.default_rng(1)
    q = np.clip(np.round((h-lo)/(hi-lo)*255+rng.uniform(-0.5, 0.5, h.shape)), 0, 255).astype(np.uint8)
    OUT.mkdir(exist_ok=True)
    Image.fromarray(q).save(OUT / f'{name}.webp', lossless=True, method=6)
    print(f'{name}: {h.min():.2f} to {h.max():.2f} km, {(OUT / f"{name}.webp").stat().st_size/1e6:.2f} MB')


def mars(path):
    h = np.fromfile(path, '>i2').reshape(2880, 5760).astype(np.float32)/1000
    save('mars', shrink(h))


def mercury(path):
    im = Image.open(path)
    w, ht = im.size
    off = im.tag_v2[273][0]
    assert im.tag_v2[259] == 1 and all(b == w*2 for b in im.tag_v2[279])
    a = np.memmap(path, '<i2', 'r', off, (ht, w))
    # Four by four first (64 to 16 pixels a degree), the no-data pixels left out, in bands of rows.
    s = np.zeros((ht//4, w//4), np.float64); n = np.zeros_like(s)
    for j in range(0, ht, 512):
        b = np.asarray(a[j:j+512], np.float64); ok = b > -32768
        s[j//4:(j+512)//4] = np.where(ok, b, 0).reshape(-1, 4, w//4, 4).sum((1, 3))
        n[j//4:(j+512)//4] = ok.reshape(-1, 4, w//4, 4).sum((1, 3))
    bad = n == 0
    print(f'mercury: {bad.mean()*100:.3f}% of 16 ppd cells with no data')
    h = np.where(bad, 0, s/np.maximum(n, 1))*0.5/1000
    if bad.any(): h = fill(h, bad)
    save('mercury', shrink(h))


if __name__ == '__main__':
    mars(sys.argv[1])
    mercury(sys.argv[2])
